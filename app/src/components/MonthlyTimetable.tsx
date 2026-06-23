import { useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
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
  Subject,
  TimeSlot,
  Track,
  Weekday,
  gradeOfIndex,
  monthOfIndex,
} from '../data/roadmap';
import { TimetableBlock, buildMonthlyTimetable } from '../lib/logic';

interface Props {
  courses: Course[];
  track: Track;
  atIdx: number;
  viewIdx: number;
  onViewIdxChange: (idx: number) => void;
  shifts: Record<string, number>;
  slotOverrides: Record<string, TimeSlot>;
  onSlotOverrideChange: (sessionKey: string, slot: TimeSlot) => void;
}

const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];
const START_HOUR = 9;
const END_HOUR = 22;
const SLOT_MIN = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN;
const TIME_COL_W = 50;
const DAY_W = 92;
const SLOT_H = 22;
const HEAD_H = 26;

const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const slotToMin = (slot: number) => START_HOUR * 60 + slot * SLOT_MIN;
const minToSlot = (min: number) => Math.round((min - START_HOUR * 60) / SLOT_MIN);

function Block({ block, conflict }: { block: TimetableBlock; conflict: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.key });
  const dayIdx = DAYS.indexOf(block.slot.day);
  const top = HEAD_H + minToSlot(toMin(block.slot.start)) * SLOT_H;
  const height = ((toMin(block.slot.end) - toMin(block.slot.start)) / SLOT_MIN) * SLOT_H;
  const left = TIME_COL_W + dayIdx * DAY_W;
  const c = COLORS[block.subject];
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={`${block.label} — 드래그로 요일/시간 이동`}
      style={{
        position: 'absolute',
        left,
        top,
        width: DAY_W - 2,
        height: height - 2,
        background: c.fill,
        color: c.text,
        border: conflict ? '2px solid #D6443B' : '1px solid rgba(0,0,0,0.15)',
        borderRadius: 5,
        boxSizing: 'border-box',
        padding: '2px 5px',
        fontSize: 11,
        lineHeight: 1.25,
        cursor: 'grab',
        overflow: 'hidden',
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.85 : 1,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        touchAction: 'none',
      }}
    >
      <strong>{block.label}</strong>
      <div style={{ fontSize: 10 }}>
        {block.slot.start}~{block.slot.end}
      </div>
      {block.teacher && <div style={{ fontSize: 10, opacity: 0.85 }}>{block.teacher} 쌤</div>}
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
        left: TIME_COL_W + dayIdx * DAY_W,
        top: HEAD_H + slot * SLOT_H,
        width: DAY_W,
        height: SLOT_H,
        boxSizing: 'border-box',
        borderRight: '1px solid #ECEAE2',
        borderBottom: slot % 2 === 1 ? '1px solid #E2E0D8' : '1px dashed #EFEDE6',
        background: isOver ? 'rgba(214,68,59,0.10)' : 'transparent',
      }}
    />
  );
}

export default function MonthlyTimetable({
  courses,
  track,
  atIdx,
  viewIdx,
  onViewIdxChange,
  shifts,
  slotOverrides,
  onSlotOverrideChange,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const tt = useMemo(
    () => buildMonthlyTimetable(courses, track, viewIdx, shifts, slotOverrides),
    [courses, track, viewIdx, shifts, slotOverrides]
  );

  const conflictKeys = useMemo(() => {
    const s = new Set<string>();
    for (const { a, b } of tt.conflicts) {
      s.add(a.key);
      s.add(b.key);
    }
    return s;
  }, [tt]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const m = String(over.id).match(/^cell-(\d+)-(\d+)$/);
    if (!m) return;
    const day = DAYS[Number(m[1])];
    const slotIdx = Number(m[2]);
    const block = tt.blocks.find((b) => b.key === String(active.id));
    if (!block) return;
    const dur = toMin(block.slot.end) - toMin(block.slot.start);
    let startMin = slotToMin(slotIdx);
    const maxStart = END_HOUR * 60 - dur;
    if (startMin > maxStart) startMin = maxStart;
    if (startMin < START_HOUR * 60) startMin = START_HOUR * 60;
    onSlotOverrideChange(block.key, { day, start: toHHMM(startMin), end: toHHMM(startMin + dur) });
  };

  const gridW = TIME_COL_W + DAYS.length * DAY_W;
  const gridH = HEAD_H + SLOT_COUNT * SLOT_H;

  const lessons = [...tt.blocks].sort((a, b) => {
    const d = DAYS.indexOf(a.slot.day) - DAYS.indexOf(b.slot.day);
    return d !== 0 ? d : toMin(a.slot.start) - toMin(b.slot.start);
  });

  return (
    <div className="timetable-builder">
      <div className="month-nav">
        <button onClick={() => onViewIdxChange(Math.max(atIdx, viewIdx - 1))} disabled={viewIdx <= atIdx}>
          ◀ 이전 달
        </button>
        <span className="month-label">
          {gradeOfIndex(viewIdx)} {monthOfIndex(viewIdx)}월 시간표
        </span>
        <button onClick={() => onViewIdxChange(Math.min(59, viewIdx + 1))} disabled={viewIdx >= 59}>
          다음 달 ▶
        </button>
      </div>

      <div className="tt-toolbar no-print">
        <span>
          <span className="swatch" style={{ background: COLORS.수학.fill }} /> 수학
        </span>
        <span>
          <span className="swatch" style={{ background: COLORS.과학.fill }} /> 과학
        </span>
        <span>
          <span className="swatch" style={{ background: COLORS.면접.fill }} /> 면접
        </span>
        <span className="hint">블록을 드래그해 요일·시간을 옮기세요 · 수업 추가는 [관리] 탭</span>
      </div>

      <div className="tt-scroll">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="tt-grid" style={{ position: 'relative', width: gridW, height: gridH }}>
            {DAYS.map((d, i) => (
              <div
                key={d}
                className="tt-day-head"
                style={{ position: 'absolute', left: TIME_COL_W + i * DAY_W, top: 0, width: DAY_W, height: HEAD_H }}
              >
                {d}
              </div>
            ))}
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
            {DAYS.map((_, dayIdx) =>
              Array.from({ length: SLOT_COUNT }).map((_, s) => <Cell key={`c-${dayIdx}-${s}`} dayIdx={dayIdx} slot={s} />)
            )}
            {tt.blocks.map((b) => (
              <Block key={b.key} block={b} conflict={conflictKeys.has(b.key)} />
            ))}
          </div>
        </DndContext>
      </div>

      {tt.conflicts.length > 0 && (
        <div className="conflict-box">
          <strong>⚠ 시간 충돌 {tt.conflicts.length}건</strong>
          <ul>
            {tt.conflicts.map(({ a, b }, i) => (
              <li key={i}>
                {a.slot.day} {a.slot.start}~{a.slot.end} · 「{a.label}」 ↔ 「{b.label}」 — 블록을 옮겨 해결하세요.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lesson-list">
        <strong>
          {gradeOfIndex(viewIdx)} {monthOfIndex(viewIdx)}월 수업 목록
        </strong>
        {lessons.length === 0 ? (
          <p className="muted">이 달에 배정된 수업이 없습니다.</p>
        ) : (
          <ul>
            {lessons.map((b) => (
              <li key={b.key}>
                <span className="dot" style={{ background: COLORS[b.subject as Subject].fill }} />
                {b.slot.day} {b.slot.start}~{b.slot.end} · {b.label}
                {b.teacher ? ` · ${b.teacher} 쌤` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
