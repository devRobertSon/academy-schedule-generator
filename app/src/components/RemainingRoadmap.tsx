import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  Course,
  GRADES,
  GYO_BLOCK_DEFAULT_MONTHS,
  MATH_GYO_SEQUENCE,
  SCI_GYO_ADVANCED,
  SCI_GYO_MID_SEQUENCE,
  Track,
  gradeOfIndex,
  monthOfIndex,
  monthToSeason,
} from '../data/roadmap';
import { GyoConfig } from '../lib/store';
import { remainingCourses } from '../lib/logic';
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
  gyo: GyoConfig;
  form: ConsultInfo;
  track: Track;
  atIdx: number;
  shifts: Record<string, number>;
  onShiftChange: (courseId: string, shift: number) => void;
  /** 교과 블록별 시작월 override (키 = `${subject}:${name}`) */
  gyoBlockStarts: Record<string, number>;
  onGyoBlockMove: (key: string, startIdx: number) => void;
}

interface DragState {
  id: string;
  startX: number;
  origShift: number;
  baseStart: number;
  baseEnd: number;
}

interface BlockDragState {
  key: string;
  startX: number;
  origStart: number;
  dur: number;
}

interface GyoBlock {
  key: string;
  name: string;
  start: number;
  dur: number;
  done: boolean;
  current: boolean;
}

/** 한 레인 안에서: 안 겹치면 한 줄, 겹치면 아래로 쌓기 */
function stackBlocks(items: GyoBlock[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const ends: number[] = [];
  const placed = sorted.map((it) => {
    const end = it.start + it.dur - 1;
    let lvl = ends.findIndex((e) => e < it.start);
    if (lvl === -1) {
      lvl = ends.length;
      ends.push(end);
    } else {
      ends[lvl] = end;
    }
    return { ...it, level: lvl };
  });
  return { placed, levels: Math.max(1, ends.length) };
}

export default function RemainingRoadmap({
  courses,
  gyo,
  form,
  track,
  atIdx,
  shifts,
  onShiftChange,
  gyoBlockStarts,
  onGyoBlockMove,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const [blockDrag, setBlockDrag] = useState<BlockDragState | null>(null);
  const blockDragRef = useRef<BlockDragState | null>(null);
  blockDragRef.current = blockDrag;

  const axisStart = Math.min(atIdx, 59);
  const axisEnd = 59;
  const cols = Math.max(1, axisEnd - axisStart + 1);
  const plotW = cols * COL_W;
  const chartW = LABEL_W + plotW;
  const xOf = (idx: number) => LABEL_W + (idx - axisStart) * COL_W;
  // 블록 시작월 클램프: 오늘 이후 ~ 블록이 중3 2월 안에 들어오도록
  const clampStart = (v: number, dur: number) => Math.max(atIdx, Math.min(60 - dur, v));

  const rem = remainingCourses(courses, track, atIdx, shifts);

  // 특화 과정 레벨 쌓기
  const levelEnds: number[] = [];
  const placed = rem.map((e) => {
    let lvl = levelEnds.findIndex((end) => end < e.startIdx);
    if (lvl === -1) {
      lvl = levelEnds.length;
      levelEnds.push(e.endIdx);
    } else {
      levelEnds[lvl] = e.endIdx;
    }
    return { ...e, level: lvl };
  });
  const courseLevels = Math.max(1, levelEnds.length);
  const courseTop = HEADER_H + PAD;
  const gyoSectionTop = courseTop + courseLevels * ROW_H + 18;

  /**
   * 교과 레인 구성: 모든 블록(학기·고등)이 개별 드래그 대상.
   * 기본 위치 = 현재(첫 미완료) 블록을 오늘에 두고 앞뒤로 일렬 배치.
   * 이미 완료한 블록은 과거(축 밖)라 보이지 않음.
   */
  const buildLane = (subject: 'math' | 'sci', names: string[], durs: number[], currentIdx: number): GyoBlock[] => {
    const n = names.length;
    const raw: number[] = new Array(n).fill(atIdx);
    let acc = atIdx;
    for (let i = currentIdx; i < n; i++) {
      raw[i] = acc;
      acc += durs[i];
    }
    acc = atIdx;
    for (let i = currentIdx - 1; i >= 0; i--) {
      acc -= durs[i];
      raw[i] = acc;
    }
    return names
      .map((name, i) => {
        const key = `${subject}:${name}`;
        const ov = gyoBlockStarts[key];
        const start =
          ov !== undefined ? clampStart(ov, durs[i]) : i >= currentIdx ? clampStart(raw[i], durs[i]) : raw[i];
        return { key, name, start, dur: durs[i], done: i < currentIdx, current: i === currentIdx };
      })
      .filter((b) => b.start + b.dur - 1 >= axisStart);
  };

  const monthsOf = (key: string) => gyo.blockMonths[key] ?? GYO_BLOCK_DEFAULT_MONTHS[key] ?? 3;

  const mathCurrent = Math.min(form.mathIdx + 1, MATH_GYO_SEQUENCE.length);
  const mathDurs = MATH_GYO_SEQUENCE.map((name) => monthsOf(`math:${name}`));
  const mathLane = stackBlocks(buildLane('math', MATH_GYO_SEQUENCE, mathDurs, mathCurrent));

  const sciNames = [...SCI_GYO_MID_SEQUENCE, ...SCI_GYO_ADVANCED];
  const sciDurs = sciNames.map((name) => monthsOf(`sci:${name}`));
  const sciCurrent =
    form.sciMode === 'mid' ? Math.min(form.sciIdx + 1, SCI_GYO_MID_SEQUENCE.length) : SCI_GYO_MID_SEQUENCE.length;
  const sciLane = stackBlocks(buildLane('sci', sciNames, sciDurs, sciCurrent));

  // 레이아웃 Y
  let cursor = gyoSectionTop + 30;
  const mathLaneTop = cursor;
  cursor += mathLane.levels * ROW_H + 8;
  const sciLaneTop = cursor;
  cursor += sciLane.levels * ROW_H;
  const gyoBottom = cursor + PAD;
  const chartH = gyoBottom + 8;

  // 드래그 1) 특화 과정 수강 월 이동
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      let newShift = d.origShift + deltaCols;
      const minShift = atIdx - d.baseStart;
      const maxShift = 59 - d.baseEnd;
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

  // 드래그 2) 교과 블록 개별 이동(겹침 허용)
  useEffect(() => {
    if (!blockDrag) return;
    const onMove = (e: PointerEvent) => {
      const d = blockDragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      const next = Math.max(atIdx, Math.min(60 - d.dur, d.origStart + deltaCols));
      onGyoBlockMove(d.key, next);
    };
    const onUp = () => setBlockDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [blockDrag, atIdx, onGyoBlockMove]);

  const renderBlock = (b: GyoBlock & { level: number }, laneTop: number) => {
    const vStart = Math.max(axisStart, b.start);
    const vEnd = Math.min(axisEnd + 1, b.start + b.dur);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const y = laneTop + b.level * ROW_H;
    const dragging = blockDrag?.key === b.key;
    return (
      <g
        key={b.key}
        opacity={b.done ? 0.4 : 1}
        style={{ cursor: 'grab' }}
        onPointerDown={(ev) => {
          ev.preventDefault();
          setBlockDrag({ key: b.key, startX: ev.clientX, origStart: b.start, dur: b.dur });
        }}
      >
        <rect x={x} y={y} width={w} height={BAR_H} rx={5} fill={COLORS.교과.fill}
          stroke={dragging || b.current ? '#D6443B' : '#8C8A80'} strokeWidth={dragging ? 2.5 : b.current ? 2 : 1} />
        {w >= 30 && (
          <text x={x + w / 2} y={y + BAR_H / 2 + 3.5} fontSize={9.5} fill={COLORS.교과.text} textAnchor="middle" fontWeight={600}>
            {b.name}
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

      {/* 남은 특화 과정 막대(드래그로 수강 월 이동) */}
      {placed.map((e) => {
        const x = xOf(e.startIdx);
        const w = (e.endIdx - e.startIdx + 1) * COL_W;
        const y = courseTop + e.level * ROW_H;
        const c = COLORS[e.course.subject];
        const isDragging = drag?.id === e.course.id;
        return (
          <g
            key={e.course.id}
            style={{ cursor: 'grab' }}
            onPointerDown={(ev) => {
              ev.preventDefault();
              setDrag({
                id: e.course.id,
                startX: ev.clientX,
                origShift: e.shift,
                baseStart: e.startIdx - e.shift,
                baseEnd: e.endIdx - e.shift,
              });
            }}
          >
            <rect x={x} y={y} width={w} height={BAR_H} rx={5} fill={c.fill}
              stroke={isDragging ? '#D6443B' : e.status === '진행중' ? '#2C2C2A' : 'rgba(0,0,0,0.12)'}
              strokeWidth={isDragging ? 2.5 : e.status === '진행중' ? 1.5 : 0.8} />
            {w >= 30 && (
              <text x={x + w / 2} y={y + BAR_H / 2 - 1} fontSize={9.5} fill={c.text} textAnchor="middle" fontWeight={600}>
                {e.course.name}
              </text>
            )}
            {w >= 56 && e.course.teacher && (
              <text x={x + w / 2} y={y + BAR_H / 2 + 9} fontSize={8} fill={c.text} textAnchor="middle" opacity={0.8}>
                {e.course.teacher} 쌤
              </text>
            )}
          </g>
        );
      })}

      {/* 교과 섹션: 과목별 한 레인, 모든 블록 개별 드래그·겹침 허용(겹치면 쌓임) */}
      <line x1={0} y1={gyoSectionTop} x2={chartW} y2={gyoSectionTop} stroke="#C9C7BD" strokeWidth={1} />
      <text x={8} y={gyoSectionTop + 15} fontSize={11} fontWeight={600} fill="#2C2C2A">
        교과 과정 (블록을 각각 드래그해 배치 · 겹치면 아래로 쌓임 · 개월수는 관리 탭)
      </text>

      {rowLabel('수학 교과', mathLaneTop)}
      {mathLane.placed.map((b) => renderBlock(b, mathLaneTop))}

      {rowLabel('과학 교과', sciLaneTop)}
      {sciLane.placed.map((b) => renderBlock(b, sciLaneTop))}

      {/* 현재 월 세로선 */}
      <line x1={xOf(atIdx)} y1={HEADER_H} x2={xOf(atIdx)} y2={chartH} stroke="#D6443B" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={xOf(atIdx) + 4} y={HEADER_H + 12} fontSize={9} fontWeight={700} fill="#D6443B">
        오늘 {gradeOfIndex(atIdx)} {monthOfIndex(atIdx)}월
      </text>
    </svg>
  );
}
