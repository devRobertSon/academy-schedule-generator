import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  Course,
  GRADES,
  MATH_GYO_SEQUENCE,
  SCI_GYO_HS_PARALLEL,
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
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const [gyoDrag, setGyoDrag] = useState<GyoDragState | null>(null);
  const gyoDragRef = useRef<GyoDragState | null>(null);
  gyoDragRef.current = gyoDrag;

  const axisStart = Math.min(atIdx, 59);
  const axisEnd = 59;
  const cols = Math.max(1, axisEnd - axisStart + 1);
  const plotW = cols * COL_W;
  const chartW = LABEL_W + plotW;
  const xOf = (idx: number) => LABEL_W + (idx - axisStart) * COL_W;

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
  // gyoShift: 드래그로 교과 시작 시기를 통째로 앞/뒤로 이동
  const mathNow = atIdx + gyoShift.math;
  const sciNow = atIdx + gyoShift.sci;
  const mathProj = projectGyo(MATH_GYO_SEQUENCE, form.mathIdx + 1, mathNow, gyo.mathMonthsPerItem);
  const sciMidCurrent = form.sciMode === 'mid' ? form.sciIdx + 1 : SCI_GYO_MID_SEQUENCE.length;
  const sciMidProj = projectGyo(SCI_GYO_MID_SEQUENCE, sciMidCurrent, sciNow, gyo.sciMonthsPerItem);
  const hsStartIdx = sciNow + (SCI_GYO_MID_SEQUENCE.length - sciMidCurrent) * gyo.sciMonthsPerItem;

  const mathRowY = gyoSectionTop + 22;
  const sciLabelY = mathRowY + ROW_H;
  const hsRowsTop = sciLabelY + ROW_H;
  const gyoBottom = (form.sciMode === 'hs' ? hsRowsTop + 4 * ROW_H : sciLabelY + ROW_H) + PAD;
  const chartH = gyoBottom + 8;

  // 드래그(수강 월 이동)
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      let newShift = d.origShift + deltaCols;
      // 과거로는 못 가게(시작 >= 현재 월), 끝은 중3 2월(59) 이내
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

  // 드래그(교과 시기 이동) — 과목 전체 진도를 통째로 이동
  useEffect(() => {
    if (!gyoDrag) return;
    const onMove = (e: PointerEvent) => {
      const d = gyoDragRef.current;
      if (!d) return;
      const deltaCols = Math.round((e.clientX - d.startX) / COL_W);
      let newShift = d.origShift + deltaCols;
      // 현재 단원이 오늘보다 앞서지 않도록(>=0), 끝(59) 이내
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

  const renderGyoItem = (
    p: GyoProjection,
    y: number,
    key: string,
    paceMonths: number,
    subject: 'math' | 'sci'
  ) => {
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
        <rect
          x={x}
          y={y}
          width={w}
          height={BAR_H}
          rx={4}
          fill={COLORS.교과.fill}
          stroke={dragging || p.current ? '#D6443B' : '#B4B2A9'}
          strokeWidth={dragging || p.current ? 2 : 0.8}
        />
        {w >= 34 && (
          <text x={x + w / 2} y={y + BAR_H / 2 + 3.5} fontSize={9} fill={COLORS.교과.text} textAnchor="middle">
            {p.name}
          </text>
        )}
      </g>
    );
  };

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
      {/* 좌상단 섹션명 */}
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
            <rect
              x={x}
              y={y}
              width={w}
              height={BAR_H}
              rx={5}
              fill={c.fill}
              stroke={isDragging ? '#D6443B' : e.status === '진행중' ? '#2C2C2A' : 'rgba(0,0,0,0.12)'}
              strokeWidth={isDragging ? 2.5 : e.status === '진행중' ? 1.5 : 0.8}
            />
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
        교과 과정 (드래그로 시기 이동)
      </text>

      <text x={12} y={mathRowY + BAR_H / 2 + 3} fontSize={11} fontWeight={500} fill="#2C2C2A">
        수학 교과
      </text>
      {mathProj.map((p, i) => renderGyoItem(p, mathRowY, `math-${i}`, gyo.mathMonthsPerItem, 'math'))}

      <text x={12} y={sciLabelY + BAR_H / 2 + 3} fontSize={11} fontWeight={500} fill="#2C2C2A">
        과학 교과
      </text>
      {form.sciMode === 'mid'
        ? sciMidProj.map((p, i) => renderGyoItem(p, sciLabelY, `scimid-${i}`, gyo.sciMonthsPerItem, 'sci'))
        : SCI_GYO_HS_PARALLEL.map((name, i) => {
            const proj: GyoProjection = {
              name,
              startIdx: hsStartIdx,
              done: i < form.sciIdx,
              current: i === form.sciIdx,
            };
            return renderGyoItem(proj, hsRowsTop + i * ROW_H, `scihs-${i}`, gyo.sciMonthsPerItem, 'sci');
          })}

      {/* 현재 월 세로선(맨 왼쪽) */}
      <line x1={xOf(atIdx)} y1={HEADER_H} x2={xOf(atIdx)} y2={chartH} stroke="#D6443B" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={xOf(atIdx) + 4} y={HEADER_H + 12} fontSize={9} fontWeight={700} fill="#D6443B">
        오늘 {gradeOfIndex(atIdx)} {monthOfIndex(atIdx)}월
      </text>
    </svg>
  );
}
