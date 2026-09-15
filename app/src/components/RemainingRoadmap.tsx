import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  Course,
  GRADES,
  GYO_BLOCK_MONTHS,
  MATH_GYO_ADVANCED,
  MATH_GYO_ADV_START,
  MATH_GYO_MID,
  SCI_GYO_ADVANCED,
  SCI_GYO_MID_SEQUENCE,
  Track,
  gradeOfIndex,
  monthOfIndex,
  monthToSeason,
} from '../data/roadmap';
import { GyoConfig } from '../lib/store';
import { GyoProjection, projectGyo, remainingCourses } from '../lib/logic';
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
  gyoShift: { math: number; sci: number };
  onGyoShiftChange: (subject: 'math' | 'sci', shift: number) => void;
  gyoBlockStarts: Record<string, number>;
  onGyoBlockMove: (name: string, startIdx: number) => void;
}

interface DragState {
  id: string;
  startX: number;
  origShift: number;
  baseStart: number;
  baseEnd: number;
}

interface GyoDragState {
  subject: 'math' | 'sci';
  startX: number;
  origShift: number;
}

interface AdvDragState {
  name: string;
  startX: number;
  origStart: number;
}

export default function RemainingRoadmap({
  courses,
  gyo,
  form,
  track,
  atIdx,
  shifts,
  onShiftChange,
  gyoShift,
  onGyoShiftChange,
  gyoBlockStarts,
  onGyoBlockMove,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const [gyoDrag, setGyoDrag] = useState<GyoDragState | null>(null);
  const gyoDragRef = useRef<GyoDragState | null>(null);
  gyoDragRef.current = gyoDrag;
  const [advDrag, setAdvDrag] = useState<AdvDragState | null>(null);
  const advDragRef = useRef<AdvDragState | null>(null);
  advDragRef.current = advDrag;

  const axisStart = Math.min(atIdx, 59);
  const axisEnd = 59;
  const cols = Math.max(1, axisEnd - axisStart + 1);
  const plotW = cols * COL_W;
  const chartW = LABEL_W + plotW;
  const xOf = (idx: number) => LABEL_W + (idx - axisStart) * COL_W;
  // 개별 교과 블록 시작월 클램프(오늘 이후 ~ 6개월 블록이 중3 2월 안에 들어오도록)
  const clampStart = (v: number) => Math.max(atIdx, Math.min(60 - GYO_BLOCK_MONTHS, v));

  const rem = remainingCourses(courses, track, atIdx, shifts);

  // 레벨 쌓기(겹치면 아래로)
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

  // 교과 투영 (form.mathIdx = '완료한 단계' → 다음 단계가 현재 수강)
  const mathNow = atIdx + gyoShift.math;
  const sciNow = atIdx + gyoShift.sci;
  const mathMidCurrent = Math.min(form.mathIdx + 1, MATH_GYO_MID.length);
  const mathMidProj = projectGyo(MATH_GYO_MID, mathMidCurrent, mathNow, gyo.mathMonthsPerItem);
  const sciMidCurrent =
    form.sciMode === 'mid' ? Math.min(form.sciIdx + 1, SCI_GYO_MID_SEQUENCE.length) : SCI_GYO_MID_SEQUENCE.length;
  const sciMidProj = projectGyo(SCI_GYO_MID_SEQUENCE, sciMidCurrent, sciNow, gyo.sciMonthsPerItem);

  // 개별 6개월 교과 블록 기본 위치
  const mathAdvBase = clampStart(mathNow + Math.max(0, MATH_GYO_ADV_START - (form.mathIdx + 1)) * gyo.mathMonthsPerItem);
  const sciAdvBase = clampStart(sciNow + Math.max(0, SCI_GYO_MID_SEQUENCE.length - sciMidCurrent) * gyo.sciMonthsPerItem);
  const advStart = (name: string, def: number) => clampStart(gyoBlockStarts[name] ?? def);

  // 레이아웃 Y
  let cursor = gyoSectionTop + 30;
  const mathMidRowY = cursor;
  cursor += ROW_H;
  const mathAdvTop = cursor;
  cursor += MATH_GYO_ADVANCED.length * ROW_H + 8;
  const sciMidRowY = cursor;
  cursor += ROW_H;
  const sciAdvTop = cursor;
  cursor += SCI_GYO_ADVANCED.length * ROW_H;
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

  // 드래그 2) 교과(중등) 진도 전체 이동
  useEffect(() => {
    if (!gyoDrag) return;
    const onMove = (e: PointerEvent) => {
      const d = gyoDragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      let newShift = d.origShift + deltaCols;
      if (newShift < 0) newShift = 0;
      if (newShift > 59 - atIdx) newShift = 59 - atIdx;
      onGyoShiftChange(d.subject, newShift);
    };
    const onUp = () => setGyoDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gyoDrag, atIdx, onGyoShiftChange]);

  // 드래그 3) 개별 교과 블록(6개월) 이동
  useEffect(() => {
    if (!advDrag) return;
    const onMove = (e: PointerEvent) => {
      const d = advDragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      onGyoBlockMove(d.name, clampStart(d.origStart + deltaCols));
    };
    const onUp = () => setAdvDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advDrag, atIdx, onGyoBlockMove]);

  // 중등 교과 투영 막대(과목 전체 드래그)
  const renderMidItem = (p: GyoProjection, y: number, key: string, paceMonths: number, subject: 'math' | 'sci') => {
    const vStart = Math.max(axisStart, p.startIdx);
    const vEnd = Math.min(axisEnd + 1, p.startIdx + paceMonths);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const dragging = gyoDrag?.subject === subject;
    return (
      <g
        key={key}
        opacity={p.done ? 0.4 : 1}
        style={{ cursor: 'grab' }}
        onPointerDown={(ev) => {
          ev.preventDefault();
          setGyoDrag({ subject, startX: ev.clientX, origShift: gyoShift[subject] });
        }}
      >
        <rect x={x} y={y} width={w} height={BAR_H} rx={4} fill={COLORS.교과.fill}
          stroke={dragging || p.current ? '#D6443B' : '#B4B2A9'} strokeWidth={dragging || p.current ? 2 : 0.8} />
        {w >= 30 && (
          <text x={x + w / 2} y={y + BAR_H / 2 + 3.5} fontSize={9} fill={COLORS.교과.text} textAnchor="middle">
            {p.name}
          </text>
        )}
      </g>
    );
  };

  // 개별 6개월 교과 블록(각각 따로 드래그, 겹침 허용)
  const renderAdvBlock = (name: string, startIdx: number, y: number) => {
    const vStart = Math.max(axisStart, startIdx);
    const vEnd = Math.min(axisEnd + 1, startIdx + GYO_BLOCK_MONTHS);
    if (vEnd <= vStart) return null;
    const x = xOf(vStart);
    const w = (vEnd - vStart) * COL_W;
    const dragging = advDrag?.name === name;
    return (
      <g
        key={`adv-${name}`}
        style={{ cursor: 'grab' }}
        onPointerDown={(ev) => {
          ev.preventDefault();
          setAdvDrag({ name, startX: ev.clientX, origStart: startIdx });
        }}
      >
        <rect x={x} y={y} width={w} height={BAR_H} rx={5} fill={COLORS.교과.fill}
          stroke={dragging ? '#D6443B' : '#8C8A80'} strokeWidth={dragging ? 2.5 : 1} />
        <text x={x + w / 2} y={y + BAR_H / 2 + 3.5} fontSize={9.5} fill={COLORS.교과.text} textAnchor="middle" fontWeight={600}>
          {name}
        </text>
      </g>
    );
  };

  const rowLabel = (text: string, y: number, muted = false) => (
    <text x={12} y={y + BAR_H / 2 + 3} fontSize={muted ? 10 : 11} fontWeight={muted ? 400 : 500} fill={muted ? '#6B6A64' : '#2C2C2A'}>
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

      {/* 교과 섹션 */}
      <line x1={0} y1={gyoSectionTop} x2={chartW} y2={gyoSectionTop} stroke="#C9C7BD" strokeWidth={1} />
      <text x={8} y={gyoSectionTop + 15} fontSize={11} fontWeight={600} fill="#2C2C2A">
        교과 과정 (막대를 드래그해 시기 배치 · 고등 과목은 개별 이동/겹침 가능)
      </text>

      {/* 수학 교과: 중등(순차) + 고등(개별 6개월) */}
      {rowLabel('수학 교과(중등)', mathMidRowY)}
      {mathMidProj.map((p, i) => renderMidItem(p, mathMidRowY, `mmid-${i}`, gyo.mathMonthsPerItem, 'math'))}
      {MATH_GYO_ADVANCED.map((name, j) => {
        const y = mathAdvTop + j * ROW_H;
        return (
          <g key={`mathadv-${name}`}>
            {rowLabel(name, y, true)}
            {renderAdvBlock(name, advStart(name, mathAdvBase + j * GYO_BLOCK_MONTHS), y)}
          </g>
        );
      })}

      {/* 과학 교과: 중등(순차) + 고등(물리·화학 개별 6개월) */}
      {rowLabel('과학 교과(중등)', sciMidRowY)}
      {sciMidProj.map((p, i) => renderMidItem(p, sciMidRowY, `smid-${i}`, gyo.sciMonthsPerItem, 'sci'))}
      {SCI_GYO_ADVANCED.map((name, j) => {
        const y = sciAdvTop + j * ROW_H;
        return (
          <g key={`sciadv-${name}`}>
            {rowLabel(name, y, true)}
            {renderAdvBlock(name, advStart(name, sciAdvBase), y)}
          </g>
        );
      })}

      {/* 현재 월 세로선 */}
      <line x1={xOf(atIdx)} y1={HEADER_H} x2={xOf(atIdx)} y2={chartH} stroke="#D6443B" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={xOf(atIdx) + 4} y={HEADER_H + 12} fontSize={9} fontWeight={700} fill="#D6443B">
        오늘 {gradeOfIndex(atIdx)} {monthOfIndex(atIdx)}월
      </text>
    </svg>
  );
}
