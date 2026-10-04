import { useEffect, useMemo, useRef, useState } from 'react';
import CourseEditPopup from './CourseEditPopup';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  COLORS,
  Course,
  TimeSlot,
  Track,
  Weekday,
  courseColor,
  gradeOfIndex,
  monthOfIndex,
} from '../data/roadmap';
import { GyoProgress, TimetableBlock, buildMonthlyTimetable } from '../lib/logic';

/** 블록 색: 교과 수학은 레인(교과/기본심화/심화)별 색, 교과 과학은 교과 과학 색, 그 외는 과목 색 */
const colorOf = (b: TimetableBlock) =>
  b.gyo === 'math'
    ? courseColor({ track: '공통', subject: '수학', lane: b.lane })
    : b.gyo === 'sci'
      ? COLORS.교과과학
      : COLORS[b.subject];

interface Props {
  courses: Course[];
  track: Track;
  /** 상담 월(= 오늘) 인덱스 — 시간표는 이 달 한 장만 만든다 */
  atIdx: number;
  shifts: Record<string, number>;
  slotOverrides: Record<string, TimeSlot>;
  onSlotOverrideChange: (sessionKey: string, slot: TimeSlot) => void;
  /** 블록을 선택한 뒤 위/아래 가장자리를 끌어 시간을 늘리고 줄임 → 과정의 수업 시간에 반영 */
  onSessionResize: (sessionKey: string, courseId: string, sessionIdx: number, slot: TimeSlot) => void;
  /** 선택된 블록을 다시 클릭하면 뜨는 편집 팝업(요일·시간·선생님)의 저장 → 과정 데이터에 반영 */
  onCourseChange: (course: Course) => void;
  /** 팝업의 '제거' → 이 학생 로드맵·시간표에서 과정 숨김 */
  onHideCourse: (courseId: string) => void;
  /** 세션을 따로 움직이기로 한(분리된) 교과 수학 과정 id — 학생별. 기본은 함께 움직임 */
  unlinked: string[];
  onUnlinkedChange: (courseId: string, unlinked: boolean) => void;
  progress: GyoProgress;
}

/** 월·수 / 화·목 세션을 함께 움직이는 대상: 교과 수학(교과·기본심화·심화)만 */
const isLinkable = (b: TimetableBlock) => b.gyo === 'math' && b.courseId !== undefined;

/** 시간 조절 중인 블록의 임시 시각 */
interface ResizeState {
  key: string;
  edge: 'top' | 'bottom';
  startY: number;
  origStart: number; // 분
  origEnd: number;
  start: number;
  end: number;
}

const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];
const START_HOUR = 9;
const END_HOUR = 22;
const SLOT_MIN = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN;
const TIME_COL_W = 50;
const DAY_W = 96;
const SLOT_H = 22;
const HEAD_H = 28;

const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const slotToMin = (slot: number) => START_HOUR * 60 + slot * SLOT_MIN;
const minToSlot = (min: number) => Math.round((min - START_HOUR * 60) / SLOT_MIN);

function Block({
  block,
  conflict,
  selected: selectedProp,
  preview,
  onSelect,
  onResizeStart,
  linkedHighlight,
  unlinkedBadge,
}: {
  block: TimetableBlock;
  conflict: boolean;
  selected: boolean;
  /** 시간 조절 중이면 임시 시각(분) */
  preview?: { start: number; end: number };
  onSelect: () => void;
  onResizeStart: (edge: 'top' | 'bottom', ev: React.PointerEvent) => void;
  /** 짝 세션이 드래그 중 → 같이 움직인다는 뜻으로 선택 표시 */
  linkedHighlight?: boolean;
  /** 세션을 따로 움직이기로 한 과정 → 분리 표시 */
  unlinkedBadge?: boolean;
}) {
  const selected = selectedProp || !!linkedHighlight;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.key });
  const dayIdx = DAYS.indexOf(block.slot.day);
  const startMin = preview ? preview.start : toMin(block.slot.start);
  const endMin = preview ? preview.end : toMin(block.slot.end);
  const top = HEAD_H + minToSlot(startMin) * SLOT_H;
  const height = ((endMin - startMin) / SLOT_MIN) * SLOT_H;
  const left = dayIdx * DAY_W; // 요일 영역(.tt-days) 기준
  const c = colorOf(block);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-block="1"
      title={`${block.label} — 드래그: 요일/시간 이동 · 클릭 후 위/아래 가장자리: 시간 늘리기/줄이기`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'absolute',
        left: left + 1,
        top: top + 1,
        width: DAY_W - 3,
        height: height - 3,
        background: c.fill,
        color: c.text,
        // 드래그 중에도 로드맵처럼 선택 표시(붉은 테두리)
        border: selected || isDragging ? '2px solid #E2574C' : conflict ? '2px solid #E2574C' : '1px solid rgba(0,0,0,0.12)',
        outline: selected || isDragging ? '2px solid rgba(226,87,76,0.25)' : 'none',
        borderRadius: 7,
        boxSizing: 'border-box',
        padding: '3px 6px',
        fontSize: 11,
        lineHeight: 1.25,
        cursor: 'grab',
        overflow: 'hidden',
        zIndex: isDragging ? 50 : selected ? 20 : 10,
        opacity: isDragging ? 0.85 : 1,
        boxShadow: isDragging ? '0 6px 16px rgba(29,34,96,0.25)' : 'none',
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        touchAction: 'none',
      }}
    >
      <strong>{block.label}</strong>
      <div style={{ fontSize: 10 }}>
        {toHHMM(startMin)}~{toHHMM(endMin)}
      </div>
      {unlinkedBadge && (
        <span className="tt-unlinked" title="세션을 따로 움직이는 중 (팝업에서 '세션 함께 움직이기'로 다시 묶기)">
          분리
        </span>
      )}
      {selectedProp && (
        <>
          <div
            className="tt-resize top"
            title="위로 끌어 시작 시각 조절"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              onResizeStart('top', ev);
            }}
          />
          <div
            className="tt-resize bottom"
            title="아래로 끌어 종료 시각 조절"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              onResizeStart('bottom', ev);
            }}
          />
        </>
      )}
    </div>
  );
}

function Cell({ dayIdx, slot }: { dayIdx: number; slot: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${dayIdx}-${slot}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: dayIdx * DAY_W, // 요일 영역(.tt-days) 기준
        top: HEAD_H + slot * SLOT_H,
        width: DAY_W,
        height: SLOT_H,
        boxSizing: 'border-box',
        borderRight: '1px solid #E6EDF6',
        borderBottom: slot % 2 === 1 ? '1px solid #D9E3F0' : '1px dashed #EEF3F9',
        background: isOver ? 'rgba(47,159,227,0.15)' : 'transparent',
      }}
    />
  );
}

export default function MonthlyTimetable({
  courses,
  track,
  atIdx,
  shifts,
  slotOverrides,
  onSlotOverrideChange,
  onSessionResize,
  onCourseChange,
  onHideCourse,
  unlinked,
  onUnlinkedChange,
  progress,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // 드래그 중인 블록(짝 세션에도 선택 표시를 주기 위해)
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const isLinked = (b: TimetableBlock) => isLinkable(b) && !unlinked.includes(b.courseId!);
  // 선택된 블록을 한 번 더 클릭 → 과정 편집 팝업(로드맵과 동일)
  const [popupCourseId, setPopupCourseId] = useState<string | null>(null);
  const popupCourse = popupCourseId ? courses.find((c) => c.id === popupCourseId) : undefined;

  // 블록 선택(클릭) → 위/아래 가장자리 끌어서 시간 조절(30분 단위, 최소 30분)
  const [selected, setSelected] = useState<string | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  resizeRef.current = resize;
  const blocksRef = useRef<TimetableBlock[]>([]);
  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dSlots = Math.round((e.clientY - r.startY) / SLOT_H);
      let start = r.origStart;
      let end = r.origEnd;
      if (r.edge === 'top') start = Math.min(r.origEnd - SLOT_MIN, Math.max(START_HOUR * 60, r.origStart + dSlots * SLOT_MIN));
      else end = Math.max(r.origStart + SLOT_MIN, Math.min(END_HOUR * 60, r.origEnd + dSlots * SLOT_MIN));
      if (start !== r.start || end !== r.end) setResize({ ...r, start, end });
    };
    const onUp = () => {
      const r = resizeRef.current;
      setResize(null);
      if (!r) return;
      const b = blocksRef.current.find((x) => x.key === r.key);
      if (!b || b.courseId === undefined || b.sessionIdx === undefined) return;
      if (r.start === r.origStart && r.end === r.origEnd) return;
      onSessionResize(r.key, b.courseId, b.sessionIdx, { day: b.slot.day, start: toHHMM(r.start), end: toHHMM(r.end) });
      // 함께 움직이는 교과 수학이면 짝 세션의 시간도 같은 만큼 늘리고 줄인다
      if (isLinkable(b) && !unlinked.includes(b.courseId)) {
        const dS = r.start - r.origStart;
        const dE = r.end - r.origEnd;
        for (const sib of blocksRef.current) {
          if (sib.courseId !== b.courseId || sib.key === b.key || sib.sessionIdx === undefined) continue;
          const s = Math.max(START_HOUR * 60, toMin(sib.slot.start) + dS);
          const en = Math.min(END_HOUR * 60, toMin(sib.slot.end) + dE);
          if (en - s < SLOT_MIN) continue;
          onSessionResize(sib.key, sib.courseId!, sib.sessionIdx, { day: sib.slot.day, start: toHHMM(s), end: toHHMM(en) });
        }
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resize !== null]);
  const startResize = (b: TimetableBlock, edge: 'top' | 'bottom', ev: React.PointerEvent) => {
    const s = toMin(b.slot.start);
    const e = toMin(b.slot.end);
    setResize({ key: b.key, edge, startY: ev.clientY, origStart: s, origEnd: e, start: s, end: e });
  };

  // 이번 달(상담 월) 한 장만 — 미래 월 시간표는 만들지 않음
  const viewIdx = atIdx;
  const tt = useMemo(
    () => buildMonthlyTimetable(courses, track, viewIdx, atIdx, shifts, slotOverrides, progress),
    [courses, track, viewIdx, atIdx, shifts, slotOverrides, progress]
  );

  blocksRef.current = tt.blocks;

  const conflictKeys = useMemo(() => {
    const s = new Set<string>();
    for (const { a, b } of tt.conflicts) {
      s.add(a.key);
      s.add(b.key);
    }
    return s;
  }, [tt]);

  /** 블록을 (dayIdx, startMin)으로 옮긴 결과 슬롯. 시간표 범위 안으로 맞춘다 */
  const movedSlot = (b: TimetableBlock, dayIdx: number, startMin: number): TimeSlot => {
    const dur = toMin(b.slot.end) - toMin(b.slot.start);
    const d = Math.max(0, Math.min(DAYS.length - 1, dayIdx));
    const s = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - dur, startMin));
    return { day: DAYS[d], start: toHHMM(s), end: toHHMM(s + dur) };
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingKey(null);
    const { active, over } = e;
    if (!over) return;
    const m = String(over.id).match(/^cell-(\d+)-(\d+)$/);
    if (!m) return;
    const newDayIdx = Number(m[1]);
    const newStart = slotToMin(Number(m[2]));
    const block = tt.blocks.find((b) => b.key === String(active.id));
    if (!block) return;
    const moved = movedSlot(block, newDayIdx, newStart);
    onSlotOverrideChange(block.key, moved);

    // 교과 수학: Shift 없이 옮기면 짝 세션(월·수 / 화·목)도 같은 만큼 같이 이동.
    // Shift+드래그면 이 블록만 옮기고, 그 과정은 '분리됨'으로 표시한다.
    if (!isLinkable(block)) return;
    const shiftKey = !!(e.activatorEvent as MouseEvent | null)?.shiftKey;
    if (shiftKey) {
      if (isLinked(block)) onUnlinkedChange(block.courseId!, true);
      return;
    }
    if (!isLinked(block)) return;
    const dDay = DAYS.indexOf(moved.day) - DAYS.indexOf(block.slot.day);
    const dMin = toMin(moved.start) - toMin(block.slot.start);
    for (const sib of tt.blocks) {
      if (sib.courseId !== block.courseId || sib.key === block.key) continue;
      onSlotOverrideChange(sib.key, movedSlot(sib, DAYS.indexOf(sib.slot.day) + dDay, toMin(sib.slot.start) + dMin));
    }
  };

  const gridW = TIME_COL_W + DAYS.length * DAY_W;
  const gridH = HEAD_H + SLOT_COUNT * SLOT_H;
  const label = `${gradeOfIndex(viewIdx)} ${monthOfIndex(viewIdx)}월`;

  const lessons = [...tt.blocks].sort((a, b) => {
    const d = DAYS.indexOf(a.slot.day) - DAYS.indexOf(b.slot.day);
    return d !== 0 ? d : toMin(a.slot.start) - toMin(b.slot.start);
  });

  return (
    <div className="tt-layout">
      <div className="tt-main">
        <div className="month-nav">
          <span className="month-label">이번 달 시간표 · {label}</span>
        </div>

        <div className="tt-toolbar no-print">
          <span>
            <span className="swatch" style={{ background: COLORS.수학.fill }} /> 특화 수학
          </span>
          <span>
            <span className="swatch" style={{ background: COLORS.과학.fill }} /> 특화 과학
          </span>
          <span>
            <span className="swatch" style={{ background: COLORS.면접.fill }} /> 면접
          </span>
          <span>
            <span className="swatch" style={{ background: COLORS.교과수학기본심화.fill }} /> 수학 기본심화
          </span>
          <span>
            <span className="swatch" style={{ background: COLORS.교과수학심화.fill }} /> 수학 심화
          </span>
          <span>
            <span className="swatch" style={{ background: COLORS.교과수학.fill }} /> 교과 수학
          </span>
          <span>
            <span className="swatch" style={{ background: COLORS.교과과학.fill }} /> 교과 과학
          </span>
          <span className="hint">블록을 드래그해 요일·시간을 옮기세요</span>
        </div>

        <div className="tt-scroll">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e: DragStartEvent) => {
              setSelected(String(e.active.id));
              setDraggingKey(String(e.active.id));
            }}
            onDragCancel={() => setDraggingKey(null)}
            onDragEnd={handleDragEnd}
          >
            <div className="tt-grid" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', width: gridW, height: gridH }}>
              {/* 왼쪽 시간 열: 가로 스크롤 시에도 항상 보이도록 sticky */}
              <div className="tt-timecol" style={{ position: 'sticky', left: 0, flex: `0 0 ${TIME_COL_W}px`, width: TIME_COL_W, height: gridH }}>
                {Array.from({ length: SLOT_COUNT }).map((_, s) =>
                  s % 2 === 0 ? (
                    <div
                      key={`tl-${s}`}
                      className="tt-time-label"
                      style={{ position: 'absolute', left: 0, top: HEAD_H + s * SLOT_H - 1, width: TIME_COL_W, height: SLOT_H }}
                    >
                      {toHHMM(slotToMin(s))}
                    </div>
                  ) : null
                )}
              </div>
              {/* 요일 영역: 헤더·칸·블록은 이 영역 기준 좌표 */}
              <div
                className="tt-days"
                style={{ position: 'relative', width: DAYS.length * DAY_W, height: gridH }}
                onClick={(e) => {
                  // 블록 밖(빈 칸)을 클릭하면 선택 해제
                  if (!(e.target as Element).closest('[data-block]')) setSelected(null);
                }}
              >
                {DAYS.map((d, i) => (
                  <div
                    key={d}
                    className="tt-day-head"
                    style={{ position: 'absolute', left: i * DAY_W, top: 0, width: DAY_W, height: HEAD_H }}
                  >
                    {d}
                  </div>
                ))}
                {DAYS.map((_, dayIdx) =>
                  Array.from({ length: SLOT_COUNT }).map((_, s) => <Cell key={`c-${dayIdx}-${s}`} dayIdx={dayIdx} slot={s} />)
                )}
                {tt.blocks.map((b) => (
                  <Block
                    key={b.key}
                    block={b}
                    conflict={conflictKeys.has(b.key)}
                    selected={selected === b.key}
                    preview={resize?.key === b.key ? { start: resize.start, end: resize.end } : undefined}
                    onSelect={() => {
                      // 처음 클릭 → 선택, 선택된 블록을 다시 클릭 → 편집 팝업
                      if (selected === b.key) {
                        if (b.courseId) setPopupCourseId(b.courseId);
                      } else {
                        setSelected(b.key);
                      }
                    }}
                    onResizeStart={(edge, ev) => startResize(b, edge, ev)}
                    linkedHighlight={
                      !!draggingKey &&
                      draggingKey !== b.key &&
                      isLinked(b) &&
                      tt.blocks.find((x) => x.key === draggingKey)?.courseId === b.courseId
                    }
                    unlinkedBadge={isLinkable(b) && unlinked.includes(b.courseId!)}
                  />
                ))}
              </div>
            </div>
          </DndContext>
        </div>
        {popupCourse && (
          <CourseEditPopup
            course={popupCourse}
            onSave={(c) => {
              onCourseChange(c);
              setPopupCourseId(null);
            }}
            onClose={() => setPopupCourseId(null)}
            onRemove={() => {
              onHideCourse(popupCourse.id);
              setPopupCourseId(null);
              setSelected(null);
            }}
            {...(popupCourse.track === '공통' && popupCourse.subject === '수학'
              ? {
                  linked: !unlinked.includes(popupCourse.id),
                  onLinkedChange: (v: boolean) => onUnlinkedChange(popupCourse.id, !v),
                }
              : {})}
          />
        )}
      </div>

      <aside className="tt-side">
        {tt.conflicts.length > 0 && (
          <div className="conflict-box">
            <strong>⚠ 시간 충돌 {tt.conflicts.length}건</strong>
            <ul>
              {tt.conflicts.map(({ a, b }, i) => (
                <li key={i}>
                  {a.slot.day} {a.slot.start}~{a.slot.end} · 「{a.label}」 ↔ 「{b.label}」
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="side-box lesson-list">
          <strong>{label} 수업 목록</strong>
          {lessons.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              이 달에 배정된 수업이 없습니다.
            </p>
          ) : (
            <ul>
              {lessons.map((b) => (
                <li key={b.key}>
                  <span className="dot" style={{ background: colorOf(b).fill }} />
                  <span>
                    <b>{b.slot.day}</b> {b.slot.start}~{b.slot.end} · {b.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {tt.conflicts.length === 0 && <p className="muted" style={{ margin: '8px 0 0' }}>✓ 시간 충돌 없음</p>}
        </div>
      </aside>
    </div>
  );
}
