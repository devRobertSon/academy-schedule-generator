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
  TimeSlot,
  TRACKS,
  Track,
  Weekday,
} from '../data/roadmap';
import { buildTimetable } from '../lib/logic';

export interface GyoBlocks {
  math: TimeSlot[];
  sci: TimeSlot[];
}

interface Props {
  atIdx: number;
  activeTrack: Track;
  onTrackChange: (t: Track) => void;
  gyoBlocks: GyoBlocks;
  onGyoBlocksChange: (next: GyoBlocks) => void;
}

const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];
const START_HOUR = 9;
const END_HOUR = 22;
const SLOT_MIN = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN; // 26

const TIME_COL_W = 52;
const DAY_W = 90;
const SLOT_H = 22;
const HEAD_H = 26;

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function slotToMin(slot: number): number {
  return START_HOUR * 60 + slot * SLOT_MIN;
}
function minToSlot(min: number): number {
  return Math.round((min - START_HOUR * 60) / SLOT_MIN);
}

// ── 드래그 가능한 교과 블록 ───────────────────────────────
function DraggableBlock({
  id,
  label,
  subject,
  slot,
  conflict,
}: {
  id: string;
  label: string;
  subject: '수학' | '과학';
  slot: TimeSlot;
  conflict: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const dayIdx = DAYS.indexOf(slot.day);
  const top = HEAD_H + minToSlot(toMin(slot.start)) * SLOT_H;
  const height = ((toMin(slot.end) - toMin(slot.start)) / SLOT_MIN) * SLOT_H;
  const left = TIME_COL_W + dayIdx * DAY_W;
  const c = COLORS[subject];
  const style: React.CSSProperties = {
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
    padding: '2px 4px',
    fontSize: 11,
    cursor: 'grab',
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.85 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} title={`${label} (드래그 이동)`}>
      <strong>{label}</strong>
      <div style={{ fontSize: 10 }}>
        {slot.start}~{slot.end}
      </div>
    </div>
  );
}

// ── 고정(특화) 블록 ───────────────────────────────────────
function FixedBlock({
  label,
  subject,
  slot,
  conflict,
}: {
  label: string;
  subject: '수학' | '과학' | '면접';
  slot: TimeSlot;
  conflict: boolean;
}) {
  const dayIdx = DAYS.indexOf(slot.day);
  const top = HEAD_H + minToSlot(toMin(slot.start)) * SLOT_H;
  const height = ((toMin(slot.end) - toMin(slot.start)) / SLOT_MIN) * SLOT_H;
  const left = TIME_COL_W + dayIdx * DAY_W;
  const c = COLORS[subject];
  return (
    <div
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
        padding: '2px 4px',
        fontSize: 11,
        opacity: 0.92,
        zIndex: 5,
      }}
      title={`${label} (고정)`}
    >
      <span style={{ float: 'right' }}>🔒</span>
      <strong>{label}</strong>
      <div style={{ fontSize: 10 }}>
        {slot.start}~{slot.end}
      </div>
    </div>
  );
}

// ── 드롭 가능한 셀 ────────────────────────────────────────
function DroppableCell({ dayIdx, slot }: { dayIdx: number; slot: number }) {
  const id = `cell-${dayIdx}-${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id });
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

export default function TimetableBuilder({
  atIdx,
  activeTrack,
  onTrackChange,
  gyoBlocks,
  onGyoBlocksChange,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const timetable = useMemo(
    () => buildTimetable(activeTrack, atIdx, gyoBlocks),
    [activeTrack, atIdx, gyoBlocks]
  );

  const conflictKeys = useMemo(() => {
    const s = new Set<string>();
    for (const { a, b } of timetable.conflicts) {
      if (a.key) s.add(a.key);
      if (b.key) s.add(b.key);
    }
    return s;
  }, [timetable]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const m = overId.match(/^cell-(\d+)-(\d+)$/);
    if (!m) return;
    const dayIdx = Number(m[1]);
    const slotIdx = Number(m[2]);
    const day = DAYS[dayIdx];
    const startMin = slotToMin(slotIdx);

    const aid = String(active.id);
    const am = aid.match(/^(math|sci)-(\d+)$/);
    if (!am) return;
    const which = am[1] as 'math' | 'sci';
    const i = Number(am[2]);
    const arr = [...gyoBlocks[which]];
    const cur = arr[i];
    const dur = toMin(cur.end) - toMin(cur.start);
    let newStart = startMin;
    // 시간 범위를 벗어나지 않도록 클램프
    const maxStart = END_HOUR * 60 - dur;
    if (newStart > maxStart) newStart = maxStart;
    if (newStart < START_HOUR * 60) newStart = START_HOUR * 60;
    arr[i] = { day, start: toHHMM(newStart), end: toHHMM(newStart + dur) };
    onGyoBlocksChange({ ...gyoBlocks, [which]: arr });
  };

  const addSession = (which: 'math' | 'sci') => {
    const arr = [...gyoBlocks[which]];
    const base = arr[arr.length - 1] ?? { day: '수', start: '16:00', end: '18:00' };
    // 다음 요일로 복제
    const nextDayIdx = (DAYS.indexOf(base.day) + 1) % DAYS.length;
    arr.push({ day: DAYS[nextDayIdx], start: base.start, end: base.end });
    onGyoBlocksChange({ ...gyoBlocks, [which]: arr });
  };

  const removeSession = (which: 'math' | 'sci') => {
    if (gyoBlocks[which].length <= 1) return;
    const arr = gyoBlocks[which].slice(0, -1);
    onGyoBlocksChange({ ...gyoBlocks, [which]: arr });
  };

  const gridW = TIME_COL_W + DAYS.length * DAY_W;
  const gridH = HEAD_H + SLOT_COUNT * SLOT_H;

  // 수업 목록(요일·시간 순 정렬)
  const lessonList = [...timetable.blocks].sort((a, b) => {
    const d = DAYS.indexOf(a.slot.day) - DAYS.indexOf(b.slot.day);
    return d !== 0 ? d : toMin(a.slot.start) - toMin(b.slot.start);
  });

  return (
    <div className="timetable-builder">
      {/* 학교 탭 */}
      <div className="track-tabs" role="tablist">
        {TRACKS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === activeTrack}
            className={`track-tab ${t === activeTrack ? 'active' : ''}`}
            onClick={() => onTrackChange(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="tt-toolbar">
        <span>
          <span className="swatch" style={{ background: COLORS.수학.fill }} /> 수학 교과
          <button className="mini" onClick={() => addSession('math')}>
            + 세션
          </button>
          <button className="mini ghost" onClick={() => removeSession('math')}>
            − 세션
          </button>
        </span>
        <span>
          <span className="swatch" style={{ background: COLORS.과학.fill }} /> 과학 교과
          <button className="mini" onClick={() => addSession('sci')}>
            + 세션
          </button>
          <button className="mini ghost" onClick={() => removeSession('sci')}>
            − 세션
          </button>
        </span>
        <span className="hint">🔒 = 특화(고정) · 색 블록을 드래그해 교과 시간을 옮기세요</span>
      </div>

      <div className="tt-scroll">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="tt-grid" style={{ position: 'relative', width: gridW, height: gridH }}>
            {/* 요일 헤더 */}
            {DAYS.map((d, i) => (
              <div
                key={d}
                className="tt-day-head"
                style={{
                  position: 'absolute',
                  left: TIME_COL_W + i * DAY_W,
                  top: 0,
                  width: DAY_W,
                  height: HEAD_H,
                }}
              >
                {d}
              </div>
            ))}
            {/* 시간 라벨 */}
            {Array.from({ length: SLOT_COUNT }).map((_, s) =>
              s % 2 === 0 ? (
                <div
                  key={`tl-${s}`}
                  className="tt-time-label"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: HEAD_H + s * SLOT_H - 1,
                    width: TIME_COL_W,
                    height: SLOT_H,
                  }}
                >
                  {toHHMM(slotToMin(s))}
                </div>
              ) : null
            )}
            {/* 드롭 셀 */}
            {DAYS.map((_, dayIdx) =>
              Array.from({ length: SLOT_COUNT }).map((_, s) => (
                <DroppableCell key={`c-${dayIdx}-${s}`} dayIdx={dayIdx} slot={s} />
              ))
            )}
            {/* 고정 블록 */}
            {timetable.blocks
              .filter((b) => b.fixed)
              .map((b) => (
                <FixedBlock
                  key={b.key}
                  label={b.label}
                  subject={b.subject}
                  slot={b.slot}
                  conflict={!!b.key && conflictKeys.has(b.key)}
                />
              ))}
            {/* 교과 드래그 블록 */}
            {gyoBlocks.math.map((slot, i) => (
              <DraggableBlock
                key={`math-${i}`}
                id={`math-${i}`}
                label="수학 교과"
                subject="수학"
                slot={slot}
                conflict={conflictKeys.has(`gyo-math-${i}`)}
              />
            ))}
            {gyoBlocks.sci.map((slot, i) => (
              <DraggableBlock
                key={`sci-${i}`}
                id={`sci-${i}`}
                label="과학 교과"
                subject="과학"
                slot={slot}
                conflict={conflictKeys.has(`gyo-sci-${i}`)}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {/* 충돌 경고 */}
      {timetable.conflicts.length > 0 && (
        <div className="conflict-box">
          <strong>⚠ 시간 충돌 {timetable.conflicts.length}건</strong>
          <ul>
            {timetable.conflicts.map(({ a, b }, i) => (
              <li key={i}>
                {a.slot.day} {a.slot.start}~{a.slot.end} · 「{a.label}」 ↔ 「{b.label}」 — 교과
                블록을 옮겨 해결하세요.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 이번 주 수업 목록 */}
      <div className="lesson-list">
        <strong>이번 주 수업 목록</strong>
        <ul>
          {lessonList.map((b) => (
            <li key={b.key}>
              <span className="dot" style={{ background: COLORS[b.subject].fill }} />
              {b.slot.day} {b.slot.start}~{b.slot.end} · {b.label}
              {b.fixed ? ' (고정)' : ' (교과)'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
