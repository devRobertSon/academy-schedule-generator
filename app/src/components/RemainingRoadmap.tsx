import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  Course,
  GRADES,
  Milestone,
  Subject,
  Track,
  TrackPlan,
  courseColor,
  endPos,
  gmIndex,
  gradeOfIndex,
  monthOfIndex,
  monthToSeason,
  startPos,
  ymLabel,
} from '../data/roadmap';
import { gyoLaneLayout, remainingCourses } from '../lib/logic';
import { ConsultInfo } from './ConsultForm';
import CourseEditPopup from './CourseEditPopup';

const COL_W = 30;
const HALF_W = COL_W / 2; // 0.5월
const LABEL_W = 132;
const PHASE_H = 30; // 단계(국면) 띠
const MS_H = 26; // 시험 마일스톤 줄(◆만 표시, 이름은 마우스 오버 툴팁)
const GRADE_H = 26;
const MONTH_H = 20;
const AXIS_Y = PHASE_H + MS_H;
const HEADER_H = AXIS_Y + GRADE_H + MONTH_H;
const PHASE_COLORS = ['#5FB8EE', '#2F8FD9', '#1F4DAF', '#1D2260', '#141848'];
const BAR_H = 34;
const ROW_H = 42;
const PAD = 10;
const EDGE = 7; // 좌우 가장자리(기간 조절) 폭(px)

const SEASON_TINT: Record<string, string> = {
  봄: '#EEF6FD',
  여름: '#F6FAFE',
  가을: '#EDF2FA',
  겨울: '#E8EFF9',
};
/** 글자 폭 대략 추정(한글 = fs, 영문·기호 = 0.6fs) */
const estTextWidth = (s: string, fs: number) => s.split('').reduce((acc, ch) => acc + (/[ -~]/.test(ch) ? 0.6 : 1) * fs, 0);
interface FitLabel {
  lines: string[];
  fontSize: number;
  /** 이름을 다 못 보여줘서 줄임말만 표시 → 마우스 오버 툴팁으로 전체 이름 */
  abbreviated: boolean;
}
/**
 * 블록 안에 과목 이름 맞추기:
 * 1) 한 줄(13→10px) → 2) 두 줄로 나눠서(12→8px) → 3) 마지막 단어만(면접·면담 등, 11→8px)
 */
export function fitLabel(name: string, w: number, h: number): FitLabel {
  const avail = w - 8;
  for (let fs = 13; fs >= 10; fs -= 0.5) {
    if (estTextWidth(name, fs) <= avail) return { lines: [name], fontSize: fs, abbreviated: false };
  }
  // 두 줄: 공백 위치 중 두 줄 폭이 가장 고른 곳에서 나눔(공백이 없으면 가운데)
  const splits: [string, string][] = [];
  for (let i = 1; i < name.length; i++) {
    if (name[i] === ' ') splits.push([name.slice(0, i), name.slice(i + 1)]);
  }
  if (splits.length === 0 && name.length >= 4) {
    const mid = Math.ceil(name.length / 2);
    splits.push([name.slice(0, mid), name.slice(mid)]);
  }
  if (splits.length > 0) {
    const best = splits.reduce((a, b) =>
      Math.max(estTextWidth(b[0], 10), estTextWidth(b[1], 10)) < Math.max(estTextWidth(a[0], 10), estTextWidth(a[1], 10)) ? b : a
    );
    for (let fs = 12; fs >= 8; fs -= 0.5) {
      if (fs * 1.15 * 2 <= h - 4 && estTextWidth(best[0], fs) <= avail && estTextWidth(best[1], fs) <= avail) {
        return { lines: best, fontSize: fs, abbreviated: false };
      }
    }
  }
  // 줄임말: 마지막 단어(예: '과학고 파이널 면접' → '면접')
  const words = name.trim().split(/\s+/);
  const short = words.length > 1 ? words[words.length - 1] : name;
  for (let fs = 11; fs >= 8; fs -= 0.5) {
    if (estTextWidth(short, fs) <= avail) return { lines: [short], fontSize: fs, abbreviated: true };
  }
  return { lines: [], fontSize: 8, abbreviated: true };
}

const INK = '#1A2340';
const MUTED = '#5B6B85';
const LINE = '#D9E3F0';
const BRAND = '#1F4DAF';
const NAVY = '#1D2260';
const ACCENT = '#E2574C';

interface Props {
  courses: Course[];
  form: ConsultInfo;
  track: Track;
  /** 학교별 여정 단계·시험 마일스톤 */
  plan: TrackPlan;
  atIdx: number;
  shifts: Record<string, number>;
  onShiftChange: (courseId: string, shift: number) => void;
  /** 가장자리 드래그로 바뀐 과정의 시작/종료 위치(0.5월 단위) → 관리 탭 데이터에 반영 */
  onCourseRange: (courseId: string, range: { startPos: number; endPos: number }) => void;
  /** 팝업에서 저장한 과정(세션·담당쌤) → 관리 탭 데이터에 반영 */
  onCourseChange: (course: Course) => void;
  /** 이 학생 로드맵에서 블록 제거 */
  onHide: (courseId: string) => void;
}

interface Bar {
  id: string;
  course: Course;
  startIdx: number;
  endIdx: number; // 마지막 반달(포함)
  shift: number;
  isGyo: boolean;
  emphasize: boolean;
  fill: string;
  text: string;
}

interface MoveState {
  id: string;
  startX: number;
  origShift: number;
  baseStart: number;
  baseEnd: number;
}

interface ResizeState {
  id: string;
  edge: 'L' | 'R';
  startX: number;
  isGyo: boolean;
  shift: number;
  origStartPos: number; // 과정 데이터의 시작 위치
  origEndPos: number; // 과정 데이터의 종료 위치(배타적)
  visStart: number; // 화면상 시작
  visEnd: number; // 화면상 종료(배타적)
}

/** 한 레인 안에서: 안 겹치면 한 줄, 겹치면 아래로 쌓기 */
function stack<T extends { startIdx: number; endIdx: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.startIdx - b.startIdx);
  const ends: number[] = [];
  const placed = sorted.map((it) => {
    let lvl = ends.findIndex((e) => e < it.startIdx);
    if (lvl === -1) {
      lvl = ends.length;
      ends.push(it.endIdx);
    } else {
      ends[lvl] = it.endIdx;
    }
    return { ...it, level: lvl };
  });
  return { placed, levels: Math.max(1, ends.length) };
}

const snap = (dx: number) => Math.round(dx / HALF_W) * 0.5;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SPEC_SUBJECTS: Subject[] = ['수학', '과학', '면접'];

export default function RemainingRoadmap({
  courses,
  form,
  track,
  plan,
  atIdx,
  shifts,
  onShiftChange,
  onCourseRange,
  onCourseChange,
  onHide,
}: Props) {
  const [move, setMove] = useState<MoveState | null>(null);
  const moveRef = useRef<MoveState | null>(null);
  moveRef.current = move;
  const [resize, setResize] = useState<ResizeState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  resizeRef.current = resize;
  const movedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [hoverMs, setHoverMs] = useState<number | null>(null); // 마우스를 올린 시험 ◆
  const [hoverBar, setHoverBar] = useState<string | null>(null); // 마우스를 올린(줄임말) 블록 → 전체 이름 툴팁

  // 가로축 끝: 학교별 '로드맵 표시 종료'(예: 영재학교 중3 11월) 없으면 중3 2월
  const axisEnd = plan.roadmapEnd ? Math.min(59, gmIndex(plan.roadmapEnd.grade, plan.roadmapEnd.month)) : 59;
  const axisStart = Math.min(atIdx, axisEnd);
  const cols = Math.max(1, axisEnd - axisStart + 1);
  const chartW = LABEL_W + cols * COL_W;
  const xOf = (pos: number) => LABEL_W + (pos - axisStart) * COL_W;
  const visibleMilestones = plan.milestones
    .map((m) => ({ m, pos: startPos(m.at) }))
    .filter(({ pos }) => pos >= axisStart && pos <= axisEnd + 1)
    .sort((a, b) => a.pos - b.pos);
  const msLabel = (m: Milestone, pos: number) => `${m.name} · ${monthOfIndex(Math.floor(pos))}월 ${m.at.half ? '중순' : '초'}`;
  // SVG가 카드 폭에 맞춰 확대되므로, 마우스 픽셀 이동량을 SVG 좌표로 환산
  const scaleOf = () => (svgRef.current ? svgRef.current.getBoundingClientRect().width / chartW : 1);

  // 특화 과정(목표 학교) — 과목별 레인
  const rem = remainingCourses(courses, track, atIdx, shifts);
  const specLanes = SPEC_SUBJECTS.map((subject) => ({
    subject,
    lane: stack(
      rem
        .filter((e) => e.course.subject === subject)
        .map<Bar>((e) => ({
          id: e.course.id,
          course: e.course,
          startIdx: e.startIdx,
          endIdx: e.endIdx,
          shift: e.shift,
          isGyo: false,
          emphasize: e.status === '진행중',
          fill: COLORS[subject].fill,
          text: COLORS[subject].text,
        }))
    ),
  })).filter((l) => l.lane.placed.length > 0);

  // 교과(공통) — 학생 진도 기준 오늘부터 순서대로
  const mathCurrent = form.mathIdx + 1;
  const sciCurrent = form.sciIdx + 1;
  const toGyoBar = (e: ReturnType<typeof gyoLaneLayout>[number]): Bar => ({
    id: e.course.id,
    course: e.course,
    startIdx: e.startIdx,
    endIdx: e.endIdx,
    shift: e.shift,
    isGyo: true,
    emphasize: e.current,
    fill: courseColor(e.course).fill,
    text: courseColor(e.course).text,
  });
  const mathLane = stack(gyoLaneLayout(courses, '수학', mathCurrent, atIdx, shifts).map(toGyoBar));
  const sciLane = stack(gyoLaneLayout(courses, '과학', sciCurrent, atIdx, shifts).map(toGyoBar));

  // 레이아웃 Y
  let y = HEADER_H + PAD;
  const specLayout = specLanes.map((l) => {
    const top = y;
    y += l.lane.levels * ROW_H + 6;
    return { ...l, top };
  });
  if (specLayout.length === 0) y += ROW_H;
  const gyoSectionTop = y + 12;
  const mathLaneTop = gyoSectionTop + 30;
  const sciLaneTop = mathLaneTop + mathLane.levels * ROW_H + 8;
  const chartH = sciLaneTop + sciLane.levels * ROW_H + PAD + 8;
  const allPlaced = [
    ...specLayout.flatMap((l) => l.lane.placed.map((b) => ({ b, top: l.top }))),
    ...mathLane.placed.map((b) => ({ b, top: mathLaneTop })),
    ...sciLane.placed.map((b) => ({ b, top: sciLaneTop })),
  ];

  // 드래그 1) 몸통: 수강 시기 이동(0.5월 단위, 학생별)
  useEffect(() => {
    if (!move) return;
    const onMove = (e: PointerEvent) => {
      const d = moveRef.current;
      if (!d) return;
      const delta = snap((e.clientX - d.startX) / scaleOf());
      if (delta !== 0) movedRef.current = true;
      const minShift = atIdx - d.baseStart; // 과거로는 못 감
      const maxShift = axisEnd + 1 - (d.baseEnd + 0.5); // 로드맵 끝(기본 중3 2월) 이내
      onShiftChange(d.id, clamp(d.origShift + delta, minShift, maxShift));
    };
    const onUp = () => {
      const d = moveRef.current;
      setMove(null);
      if (d && !movedRef.current) {
        // 클릭(이동 없음) → 선택 + 팝업
        setSelected(d.id);
        setPopupId(d.id);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [move, atIdx, onShiftChange]);

  // 드래그 2) 좌/우 가장자리: 기간 늘리기/줄이기(0.5월 단위) → 관리 탭의 시기·기간 수정
  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const d = resizeRef.current;
      if (!d) return;
      const delta = snap((e.clientX - d.startX) / scaleOf());
      if (d.edge === 'R') {
        const maxEnd = d.origEndPos + (axisEnd + 1 - d.visEnd);
        const newEnd = clamp(d.origEndPos + delta, d.origStartPos + 0.5, maxEnd);
        onCourseRange(d.id, { startPos: d.origStartPos, endPos: newEnd });
      } else if (!d.isGyo) {
        const minStart = d.origStartPos + (atIdx - d.visStart);
        const newStart = clamp(d.origStartPos + delta, minStart, d.origEndPos - 0.5);
        onCourseRange(d.id, { startPos: newStart, endPos: d.origEndPos });
      } else {
        // 교과 블록: 위치는 학생별(shift), 길이는 과정 데이터(종료) → 왼쪽을 당기면 시작이 움직이고 길이가 줄어듦
        const dd = clamp(delta, atIdx - d.visStart, d.origEndPos - d.origStartPos - 0.5);
        onShiftChange(d.id, d.shift + dd);
        onCourseRange(d.id, { startPos: d.origStartPos, endPos: d.origEndPos - dd });
      }
    };
    const onUp = () => setResize(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resize, atIdx, onShiftChange, onCourseRange]);

  const startMove = (ev: React.PointerEvent, b: Bar) => {
    ev.preventDefault();
    movedRef.current = false;
    setMove({ id: b.id, startX: ev.clientX, origShift: b.shift, baseStart: b.startIdx - b.shift, baseEnd: b.endIdx - b.shift });
  };
  const startResize = (ev: React.PointerEvent, b: Bar, edge: 'L' | 'R') => {
    ev.preventDefault();
    ev.stopPropagation();
    setResize({
      id: b.id,
      edge,
      startX: ev.clientX,
      isGyo: b.isGyo,
      shift: b.shift,
      origStartPos: startPos(b.course.start),
      origEndPos: endPos(b.course.end),
      visStart: b.startIdx,
      visEnd: b.endIdx + 0.5,
    });
  };

  const renderBar = (b: Bar & { level: number }, laneTop: number) => {
    const vStart = Math.max(axisStart, b.startIdx);
    const vEnd = Math.min(axisEnd + 1, b.endIdx + 0.5);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const yTop = laneTop + b.level * ROW_H;
    const sel = selected === b.id;
    const active = move?.id === b.id || resize?.id === b.id;
    const label = fitLabel(b.course.name, w, BAR_H);
    return (
      <g key={b.id}>
        <rect
          x={x}
          y={yTop}
          width={w}
          height={BAR_H}
          rx={6}
          fill={b.fill}
          stroke={sel || active ? ACCENT : b.emphasize ? NAVY : 'rgba(0,0,0,0.18)'}
          strokeWidth={sel || active ? 2.5 : b.emphasize ? 1.5 : 0.8}
          style={{ cursor: 'grab' }}
          onPointerDown={(ev) => startMove(ev, b)}
          onMouseEnter={() => label.abbreviated && setHoverBar(b.id)}
          onMouseLeave={() => setHoverBar((h) => (h === b.id ? null : h))}
        />
        {/* 좌우 가장자리: 기간 조절 */}
        <rect x={x} y={yTop} width={EDGE} height={BAR_H} fill="transparent" style={{ cursor: 'ew-resize' }} onPointerDown={(ev) => startResize(ev, b, 'L')} />
        <rect x={x + w - EDGE} y={yTop} width={EDGE} height={BAR_H} fill="transparent" style={{ cursor: 'ew-resize' }} onPointerDown={(ev) => startResize(ev, b, 'R')} />
      </g>
    );
  };

  /** 블록 위 글자 레이어 — 모든 블록보다 위에 그려서 이웃 블록에 가려지지 않게 */
  const renderLabel = (b: Bar & { level: number }, laneTop: number) => {
    const vStart = Math.max(axisStart, b.startIdx);
    const vEnd = Math.min(axisEnd + 1, b.endIdx + 0.5);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const yTop = laneTop + b.level * ROW_H;
    const sel = selected === b.id;
    const { lines, fontSize } = fitLabel(b.course.name, w, BAR_H);
    const lineH = fontSize * 1.15;
    const firstY = yTop + BAR_H / 2 - ((lines.length - 1) * lineH) / 2 + fontSize * 0.35;
    return (
      <g key={`lb-${b.id}`} style={{ pointerEvents: 'none' }}>
        {lines.map((ln, i) => (
          <text key={i} x={x + w / 2} y={firstY + i * lineH} fontSize={fontSize} fill={b.text} textAnchor="middle" fontWeight={700}>
            {ln}
          </text>
        ))}
        {/* 선택 시 오른쪽 위 ✕ (이 학생 로드맵에서 제거) */}
        {sel && (
          <g
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            onPointerDown={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              onHide(b.id);
              setSelected(null);
              setPopupId(null);
            }}
          >
            <circle cx={x + w - 9} cy={yTop + 9} r={7.5} fill={ACCENT} stroke="#fff" strokeWidth={1.5} />
            <text x={x + w - 9} y={yTop + 12.5} fontSize={10} fill="#fff" textAnchor="middle" fontWeight={700} style={{ pointerEvents: 'none' }}>
              ✕
            </text>
          </g>
        )}
      </g>
    );
  };

  const rowLabel = (text: string, top: number) => (
    <text x={12} y={top + BAR_H / 2 + 5} fontSize={14} fontWeight={700} fill={INK}>
      {text}
    </text>
  );

  if (atIdx > axisEnd) {
    return <p className="muted">{ymLabel(axisEnd)} 이후로는 표시할 로드맵이 없습니다. (관리 탭 → 로드맵 표시 종료)</p>;
  }

  const popupCourse = popupId ? courses.find((c) => c.id === popupId) : undefined;

  return (
    <>
      <svg
        ref={svgRef}
        className="roadmap-svg"
        width="100%"
        viewBox={`0 0 ${chartW} ${chartH}`}
        style={{ minWidth: chartW, height: 'auto', display: 'block' }}
        role="img"
        aria-label={`${track} 남은 과정 로드맵`}
      >
        {/* 왼쪽 위: 오늘 기준 표시 */}
        <text x={10} y={AXIS_Y + GRADE_H / 2 + 5} fontSize={11} fontWeight={700} fill={BRAND}>
          오늘 {gradeOfIndex(atIdx)} {monthOfIndex(atIdx)}월 →
        </text>

        {/* 단계(국면) 띠 */}
        <text x={10} y={PHASE_H / 2 + 4} fontSize={10} fontWeight={700} fill={MUTED}>
          단계
        </text>
        {[...plan.phases]
          .sort((a, b) => startPos(a.start) - startPos(b.start))
          .map((p, i) => {
            const ps = Math.max(axisStart, startPos(p.start));
            const pe = Math.min(axisEnd + 1, endPos(p.end));
            if (pe <= ps) return null;
            const x = xOf(ps);
            const w = (pe - ps) * COL_W;
            return (
              <g key={`ph-${i}`}>
                <rect x={x} y={0} width={w} height={PHASE_H} fill={PHASE_COLORS[i % PHASE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                {/* 좁은 단계(1달 등)는 번호만 보이고 이름은 마우스 오버 툴팁 */}
                <text x={x + w / 2} y={PHASE_H / 2 + 4} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle">
                  {estTextWidth(p.name, 11) <= w - 6 ? p.name : p.name.slice(0, 1)}
                </text>
                <title>{p.name}</title>
              </g>
            );
          })}

        {/* 시험 마일스톤 줄 */}
        <text x={10} y={PHASE_H + MS_H / 2 + 4} fontSize={10} fontWeight={700} fill={MUTED}>
          시험
        </text>
        <rect x={LABEL_W} y={PHASE_H} width={cols * COL_W} height={MS_H} fill="#FAFCFE" stroke={LINE} strokeWidth={0.5} />
        {/* 오늘 배지 */}
        <rect x={xOf(atIdx)} y={PHASE_H + MS_H / 2 - 8} width={34} height={16} rx={8} fill={BRAND} />
        <text x={xOf(atIdx) + 17} y={PHASE_H + MS_H / 2 + 3.5} fontSize={9.5} fontWeight={700} fill="#fff" textAnchor="middle">
          오늘
        </text>

        {/* 월 배경 틴트 */}
        {Array.from({ length: cols }).map((_, k) => {
          const idx = axisStart + k;
          const season = monthToSeason(monthOfIndex(idx));
          return (
            <rect key={`tint-${k}`} x={xOf(idx)} y={HEADER_H} width={COL_W} height={chartH - HEADER_H} fill={SEASON_TINT[season]} opacity={0.5} />
          );
        })}

        {/* 학년 헤더 */}
        {GRADES.map((g, gi) => {
          const gStart = Math.max(axisStart, gi * 12);
          const gEnd = Math.min(axisEnd + 1, gi * 12 + 12);
          if (gEnd <= gStart) return null;
          const x = xOf(gStart);
          const w = (gEnd - gStart) * COL_W;
          return (
            <g key={`grade-${g}`}>
              <rect x={x} y={AXIS_Y} width={w} height={GRADE_H} fill="#E9F3FC" stroke={LINE} strokeWidth={0.5} />
              <text x={x + w / 2} y={AXIS_Y + GRADE_H / 2 + 4} fontSize={12} fontWeight={700} fill="#0B4E9F" textAnchor="middle">
                {g}
              </text>
            </g>
          );
        })}

        {/* 월 숫자 헤더 */}
        {Array.from({ length: cols }).map((_, k) => {
          const idx = axisStart + k;
          const season = monthToSeason(monthOfIndex(idx));
          return (
            <g key={`m-${k}`}>
              <rect x={xOf(idx)} y={AXIS_Y + GRADE_H} width={COL_W} height={MONTH_H} fill={SEASON_TINT[season]} />
              <text x={xOf(idx) + COL_W / 2} y={AXIS_Y + GRADE_H + MONTH_H / 2 + 3} fontSize={8} fill={MUTED} textAnchor="middle">
                {monthOfIndex(idx)}
              </text>
            </g>
          );
        })}

        {/* 특화 과정 — 과목별 레인 */}
        {specLayout.map((l) => (
          <g key={`spec-${l.subject}`}>
            {rowLabel(`특화 ${l.subject}`, l.top)}
            {l.lane.placed.map((b) => renderBar(b, l.top))}
          </g>
        ))}
        {specLayout.map((l) => (
          <g key={`spec-lb-${l.subject}`}>{l.lane.placed.map((b) => renderLabel(b, l.top))}</g>
        ))}
        {specLayout.length === 0 && (
          <text x={LABEL_W + 8} y={HEADER_H + PAD + BAR_H / 2 + 4} fontSize={11} fill={MUTED}>
            남은 특화 과정이 없습니다.
          </text>
        )}

        {/* 교과 섹션 */}
        <line x1={0} y1={gyoSectionTop} x2={chartW} y2={gyoSectionTop} stroke={LINE} strokeWidth={1} />
        <text x={8} y={gyoSectionTop + 15} fontSize={11} fontWeight={600} fill={INK}>
          교과 과정 · 학생 진도 기준으로 오늘부터 배치 (완료한 블록은 표시하지 않음)
        </text>
        {rowLabel('수학 교과', mathLaneTop)}
        {mathLane.placed.map((b) => renderBar(b, mathLaneTop))}
        {rowLabel('과학 교과', sciLaneTop)}
        {sciLane.placed.map((b) => renderBar(b, sciLaneTop))}
        {/* 글자 레이어(블록보다 위) */}
        {mathLane.placed.map((b) => renderLabel(b, mathLaneTop))}
        {sciLane.placed.map((b) => renderLabel(b, sciLaneTop))}

        {/* 현재 월 세로선 */}
        <line x1={xOf(atIdx)} y1={HEADER_H} x2={xOf(atIdx)} y2={chartH} stroke={BRAND} strokeWidth={1.5} strokeDasharray="4 3" />

        {/* 시험 ◆ + 아래로 내려가는 점선 (이름은 마우스 오버 시 툴팁) */}
        {visibleMilestones.map(({ m, pos }, i) => {
          const x = xOf(pos); // 중순이면 달 가운데, 아니면 달 시작 경계
          const cy = PHASE_H + MS_H / 2;
          const hot = hoverMs === i;
          return (
            <g
              key={`ms-${i}`}
              style={{ cursor: 'help' }}
              onMouseEnter={() => setHoverMs(i)}
              onMouseLeave={() => setHoverMs((h) => (h === i ? null : h))}
            >
              <line x1={x} y1={cy + 6} x2={x} y2={chartH} stroke={NAVY} strokeWidth={1.5} strokeDasharray="4 3" opacity={hot ? 0.95 : 0.6} />
              {/* 마우스 감지용 넓은 투명 영역 */}
              <rect x={x - 9} y={cy - 9} width={18} height={18} fill="transparent" />
              <rect
                x={x - 6}
                y={cy - 6}
                width={12}
                height={12}
                transform={`rotate(45 ${x} ${cy})`}
                fill={hot ? NAVY : '#fff'}
                stroke={NAVY}
                strokeWidth={2}
              />
              <title>{msLabel(m, pos)}</title>
            </g>
          );
        })}
        {hoverMs !== null && visibleMilestones[hoverMs] && (() => {
          const { m, pos } = visibleMilestones[hoverMs];
          const label = msLabel(m, pos);
          const fs = 11;
          const w = Math.ceil(estTextWidth(label, fs)) + 18;
          const h = 24;
          const cy = PHASE_H + MS_H / 2;
          // 오른쪽으로 펼치되 차트를 벗어나면 왼쪽으로
          const x0 = xOf(pos) + 12 + w <= chartW ? xOf(pos) + 12 : xOf(pos) - 12 - w;
          const y0 = cy - h / 2;
          return (
            <g pointerEvents="none">
              <rect x={x0} y={y0} width={w} height={h} rx={6} fill={NAVY} opacity={0.96} />
              <text x={x0 + w / 2} y={y0 + h / 2 + 4} fontSize={fs} fontWeight={700} fill="#fff" textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })()}
        {/* 줄임말 블록 툴팁: 전체 과목 이름 */}
        {hoverBar !== null && (() => {
          const hit = allPlaced.find((p) => p.b.id === hoverBar);
          if (!hit) return null;
          const vStart = Math.max(axisStart, hit.b.startIdx);
          const vEnd = Math.min(axisEnd + 1, hit.b.endIdx + 0.5);
          const bx = xOf(vStart);
          const bw = (vEnd - vStart) * COL_W;
          const yTop = hit.top + hit.b.level * ROW_H;
          const label = hit.b.course.name;
          const fs = 11;
          const w = Math.ceil(estTextWidth(label, fs)) + 18;
          const h = 24;
          let x0 = bx + bw / 2 - w / 2;
          x0 = clamp(x0, LABEL_W, chartW - w);
          const y0 = yTop - h - 4 >= HEADER_H ? yTop - h - 4 : yTop + BAR_H + 4;
          return (
            <g pointerEvents="none">
              <rect x={x0} y={y0} width={w} height={h} rx={6} fill={NAVY} opacity={0.96} />
              <text x={x0 + w / 2} y={y0 + h / 2 + 4} fontSize={fs} fontWeight={700} fill="#fff" textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })()}
      </svg>

      {popupCourse && (
        <CourseEditPopup
          course={popupCourse}
          onSave={(c) => {
            onCourseChange(c);
            setPopupId(null);
          }}
          onClose={() => {
            setPopupId(null);
            setSelected(null);
          }}
          onRemove={() => {
            onHide(popupCourse.id);
            setPopupId(null);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
