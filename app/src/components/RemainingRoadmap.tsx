import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  Course,
  GRADES,
  SCI_GYO_MID_SEQUENCE,
  Track,
  gradeOfIndex,
  monthOfIndex,
  monthToSeason,
} from '../data/roadmap';
import { gyoLaneLayout, remainingCourses } from '../lib/logic';
import { ConsultInfo } from './ConsultForm';

const COL_W = 26;
const LABEL_W = 132;
const GRADE_H = 24;
const MONTH_H = 20;
const HEADER_H = GRADE_H + MONTH_H;
const BAR_H = 22;
const ROW_H = 28;
const PAD = 10;

const SEASON_TINT: Record<string, string> = {
  봄: '#EEF4EC',
  여름: '#FBF1E9',
  가을: '#F4F0E7',
  겨울: '#ECF0F6',
};

interface Props {
  courses: Course[];
  form: ConsultInfo;
  track: Track;
  atIdx: number;
  shifts: Record<string, number>;
  onShiftChange: (courseId: string, shift: number) => void;
}

interface DragState {
  id: string;
  startX: number;
  origShift: number;
  baseStart: number;
  baseEnd: number;
}

interface Ranged {
  startIdx: number;
  endIdx: number;
}

/** 한 레인 안에서: 안 겹치면 한 줄, 겹치면 아래로 쌓기 */
function stack<T extends Ranged>(items: T[]) {
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

export default function RemainingRoadmap({ courses, form, track, atIdx, shifts, onShiftChange }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const axisStart = Math.min(atIdx, 59);
  const axisEnd = 59;
  const cols = Math.max(1, axisEnd - axisStart + 1);
  const chartW = LABEL_W + cols * COL_W;
  const xOf = (idx: number) => LABEL_W + (idx - axisStart) * COL_W;

  // 특화 과정(목표 학교) — 남은 것만
  const courseLane = stack(remainingCourses(courses, track, atIdx, shifts));

  // 교과(공통) 블록 — 학생 진도 기준 오늘부터 순서대로, 개별 드래그·겹침 허용
  const mathCurrent = form.mathIdx + 1;
  const sciCurrent = form.sciMode === 'mid' ? form.sciIdx + 1 : SCI_GYO_MID_SEQUENCE.length;
  const mathLane = stack(gyoLaneLayout(courses, '수학', mathCurrent, atIdx, shifts));
  const sciLane = stack(gyoLaneLayout(courses, '과학', sciCurrent, atIdx, shifts));

  // 레이아웃 Y
  const courseTop = HEADER_H + PAD;
  const gyoSectionTop = courseTop + courseLane.levels * ROW_H + 18;
  const mathLaneTop = gyoSectionTop + 30;
  const sciLaneTop = mathLaneTop + mathLane.levels * ROW_H + 8;
  const gyoBottom = sciLaneTop + sciLane.levels * ROW_H + PAD;
  const chartH = gyoBottom + 8;

  // 드래그(수강 월 이동) — 특화 과정과 교과 블록 공통
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      let newShift = d.origShift + deltaCols;
      const minShift = atIdx - d.baseStart; // 과거로는 못 감
      const maxShift = 59 - d.baseEnd; // 중3 2월 이내
      if (newShift < minShift) newShift = minShift;
      if (newShift > maxShift) newShift = maxShift;
      onShiftChange(d.id, newShift);
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, atIdx, onShiftChange]);

  const startDrag = (ev: React.PointerEvent, id: string, startIdx: number, endIdx: number, shift: number) => {
    ev.preventDefault();
    setDrag({ id, startX: ev.clientX, origShift: shift, baseStart: startIdx - shift, baseEnd: endIdx - shift });
  };

  const renderBar = (opts: {
    id: string;
    name: string;
    teacher?: string;
    startIdx: number;
    endIdx: number;
    shift: number;
    y: number;
    fill: string;
    text: string;
    emphasize: boolean;
    faded?: boolean;
  }) => {
    const vStart = Math.max(axisStart, opts.startIdx);
    const vEnd = Math.min(axisEnd + 1, opts.endIdx + 1);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const dragging = drag?.id === opts.id;
    return (
      <g
        key={opts.id}
        opacity={opts.faded ? 0.4 : 1}
        style={{ cursor: 'grab' }}
        onPointerDown={(ev) => startDrag(ev, opts.id, opts.startIdx, opts.endIdx, opts.shift)}
      >
        <rect x={x} y={opts.y} width={w} height={BAR_H} rx={5} fill={opts.fill}
          stroke={dragging ? '#D6443B' : opts.emphasize ? '#2C2C2A' : 'rgba(0,0,0,0.2)'}
          strokeWidth={dragging ? 2.5 : opts.emphasize ? 1.5 : 0.8} />
        {w >= 30 && (
          <text x={x + w / 2} y={opts.y + BAR_H / 2 + (opts.teacher && w >= 56 ? -1 : 3.5)} fontSize={9.5} fill={opts.text} textAnchor="middle" fontWeight={600}>
            {opts.name}
          </text>
        )}
        {w >= 56 && opts.teacher && (
          <text x={x + w / 2} y={opts.y + BAR_H / 2 + 9} fontSize={8} fill={opts.text} textAnchor="middle" opacity={0.8}>
            {opts.teacher} 쌤
          </text>
        )}
      </g>
    );
  };

  const rowLabel = (text: string, y: number) => (
    <text x={12} y={y + BAR_H / 2 + 3} fontSize={11} fontWeight={500} fill="#2C2C2A">
      {text}
    </text>
  );

  if (atIdx >= 59) {
    return <p className="muted">중3 2월 이후로는 남은 과정이 없습니다.</p>;
  }

  return (
    <svg
      className="roadmap-svg"
      width={chartW}
      height={chartH}
      viewBox={`0 0 ${chartW} ${chartH}`}
      role="img"
      aria-label={`${track} 남은 과정 로드맵`}
    >
      <text x={8} y={16} fontSize={13} fontWeight={700} fill="#2C2C2A">
        {track} · 남은 특화 과정
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
            <rect x={x} y={0} width={w} height={GRADE_H} fill="#F6F5F0" stroke="#C9C7BD" strokeWidth={0.5} />
            <text x={x + w / 2} y={GRADE_H / 2 + 4} fontSize={12} fontWeight={600} fill="#2C2C2A" textAnchor="middle">
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
            <rect x={xOf(idx)} y={GRADE_H} width={COL_W} height={MONTH_H} fill={SEASON_TINT[season]} />
            <text x={xOf(idx) + COL_W / 2} y={GRADE_H + MONTH_H / 2 + 3} fontSize={8} fill="#6B6A64" textAnchor="middle">
              {monthOfIndex(idx)}
            </text>
          </g>
        );
      })}

      {/* 남은 특화 과정 */}
      {courseLane.placed.map((e) =>
        renderBar({
          id: e.course.id,
          name: e.course.name,
          teacher: e.course.teacher,
          startIdx: e.startIdx,
          endIdx: e.endIdx,
          shift: e.shift,
          y: courseTop + e.level * ROW_H,
          fill: COLORS[e.course.subject].fill,
          text: COLORS[e.course.subject].text,
          emphasize: e.status === '진행중',
        })
      )}

      {/* 교과 섹션 */}
      <line x1={0} y1={gyoSectionTop} x2={chartW} y2={gyoSectionTop} stroke="#C9C7BD" strokeWidth={1} />
      <text x={8} y={gyoSectionTop + 15} fontSize={11} fontWeight={600} fill="#2C2C2A">
        교과 과정 (블록을 각각 드래그해 배치 · 겹치면 아래로 쌓임 · 블록 편집은 관리 탭 '공통' 과정)
      </text>

      {rowLabel('수학 교과', mathLaneTop)}
      {mathLane.placed.map((e) =>
        renderBar({
          id: e.course.id,
          name: e.course.name,
          teacher: e.course.teacher,
          startIdx: e.startIdx,
          endIdx: e.endIdx,
          shift: e.shift,
          y: mathLaneTop + e.level * ROW_H,
          fill: COLORS.교과.fill,
          text: COLORS.교과.text,
          emphasize: e.current,
        })
      )}

      {rowLabel('과학 교과', sciLaneTop)}
      {sciLane.placed.map((e) =>
        renderBar({
          id: e.course.id,
          name: e.course.name,
          teacher: e.course.teacher,
          startIdx: e.startIdx,
          endIdx: e.endIdx,
          shift: e.shift,
          y: sciLaneTop + e.level * ROW_H,
          fill: COLORS.교과.fill,
          text: COLORS.교과.text,
          emphasize: e.current,
        })
      )}

      {/* 현재 월 세로선 */}
      <line x1={xOf(atIdx)} y1={HEADER_H} x2={xOf(atIdx)} y2={chartH} stroke="#D6443B" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={xOf(atIdx) + 4} y={HEADER_H + 12} fontSize={9} fontWeight={700} fill="#D6443B">
        오늘 {gradeOfIndex(atIdx)} {monthOfIndex(atIdx)}월
      </text>
    </svg>
  );
}
