// src/lib/logic.ts — 상담 도구 로직(목표 학교의 남은 과목 + 월별 시간표)
// 위치/구간은 0.5월 단위: startIdx = 시작 위치, endIdx = 마지막 반달(포함) → 종료 위치 = endIdx + 0.5
import {
  Course,
  Grade,
  MATH_GYO_SEQUENCE,
  Phase,
  SCI_GYO_SEQUENCE,
  Subject,
  TimeSlot,
  Track,
  TrackPlan,
  endPos,
  gmIndex,
  startPos,
} from '../data/roadmap';

export type Status = '완료' | '진행중' | '예정';

/** 과정의 한 세션(주 N회)을 가리키는 슬롯 override 키 */
export function sessionKey(courseId: string, sessionIdx: number): string {
  return `${courseId}#${sessionIdx}`;
}

/** 현재 월 인덱스(0..59) */
export function nowIndex(grade: Grade, month: number): number {
  return gmIndex(grade, month);
}

/** 학생 맞춤 이동(shift, 0.5 단위)을 반영한 과정 구간 */
export function shiftedRange(course: Course, shift = 0): { startIdx: number; endIdx: number } {
  const s = startPos(course.start) + shift;
  const e = endPos(course.end) + shift;
  return { startIdx: s, endIdx: e - 0.5 };
}

/** atIdx(정수 월) 기준 상태. 그 달과 조금이라도 겹치면 진행중 */
export function statusFromIdx(startIdx: number, endIdx: number, atIdx: number): Status {
  if (endIdx < atIdx) return '완료';
  if (startIdx > atIdx + 0.5) return '예정';
  return '진행중';
}

export function courseStatus(course: Course, atIdx: number, shift = 0): Status {
  const { startIdx, endIdx } = shiftedRange(course, shift);
  return statusFromIdx(startIdx, endIdx, atIdx);
}

export interface RoadmapEntry {
  course: Course;
  status: Status;
  startIdx: number;
  endIdx: number;
  shift: number;
}

/** 목표 학교의 "남은 과목"(완료되지 않은 과정)을 시작 순으로 반환 */
export function remainingCourses(
  courses: Course[],
  track: Track,
  atIdx: number,
  shifts: Record<string, number> = {}
): RoadmapEntry[] {
  return courses
    .filter((c) => c.track === track)
    .map((c) => {
      const shift = shifts[c.id] ?? 0;
      const { startIdx, endIdx } = shiftedRange(c, shift);
      return { course: c, status: statusFromIdx(startIdx, endIdx, atIdx), startIdx, endIdx, shift };
    })
    .filter((e) => e.status !== '완료')
    .sort((a, b) => a.startIdx - b.startIdx || a.course.name.localeCompare(b.course.name));
}

export interface GyoProjection {
  name: string;
  startIdx: number;
  done: boolean;
  current: boolean;
}

/** 교과 월 투영(완료/진행중/예정) */
export function projectGyo(seq: string[], currentIdx: number, nowIdx: number, monthsPerItem: number): GyoProjection[] {
  return seq.map((name, i) => ({
    name,
    startIdx: nowIdx + (i - currentIdx) * monthsPerItem,
    done: i < currentIdx,
    current: i === currentIdx,
  }));
}

export interface TimetableBlock {
  key: string;
  courseId?: string;
  sessionIdx?: number;
  gyo?: 'math' | 'sci';
  label: string;
  subject: Subject;
  teacher?: string;
  slot: TimeSlot;
  movable: boolean;
}

export interface ConflictPair {
  a: TimetableBlock;
  b: TimetableBlock;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 같은 요일·시간 겹치는 쌍 목록 */
export function detectConflicts(blocks: TimetableBlock[]): ConflictPair[] {
  const conflicts: ConflictPair[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.slot.day !== b.slot.day) continue;
      const aS = toMinutes(a.slot.start);
      const aE = toMinutes(a.slot.end);
      const bS = toMinutes(b.slot.start);
      const bE = toMinutes(b.slot.end);
      if (aS < bE && bS < aE) conflicts.push({ a, b });
    }
  }
  return conflicts;
}

export interface MonthlyTimetable {
  blocks: TimetableBlock[];
  conflicts: ConflictPair[];
}

/** 교과(공통) 과정의 진도 순서 인덱스(이름 기준). 목록에 없으면 -1 */
export function gyoSeqIndex(c: Course): number {
  if (c.track !== '공통') return -1;
  if (c.subject === '수학') return MATH_GYO_SEQUENCE.indexOf(c.name);
  if (c.subject === '과학') {
    // 물리·화학 블록은 진도 목록의 '물리학/화학' 한 칸에 함께 대응
    if (c.name === '물리' || c.name === '화학' || c.name === '물리학' || c.name === '물리학/화학') {
      return SCI_GYO_SEQUENCE.indexOf('물리학/화학');
    }
    return SCI_GYO_SEQUENCE.indexOf(c.name);
  }
  return -1;
}

/** 학생 진도: 과목별 '현재(첫 미완료) 블록' 인덱스 */
export interface GyoProgress {
  mathCurrent: number;
  sciCurrent: number;
}

export interface LaneEntry {
  course: Course;
  startIdx: number;
  endIdx: number;
  shift: number;
  current: boolean;
}

/**
 * 교과(공통) 과정 배치: 완료한 블록(순서 < 현재)은 제외하고, 순서대로 오늘부터 일렬로 두되
 * 과정의 시작~종료 길이를 블록 개월수로 사용한다. shifts(드래그)로 개별 이동, 겹침 허용.
 */
export function gyoLaneLayout(
  courses: Course[],
  subject: Subject,
  currentIdx: number,
  atIdx: number,
  shifts: Record<string, number>
): LaneEntry[] {
  const list = courses
    .filter((c) => c.track === '공통' && c.subject === subject)
    .map((c) => ({ c, seq: gyoSeqIndex(c) }))
    .filter((x) => x.seq === -1 || x.seq >= currentIdx)
    .sort((a, b) => (a.seq === -1 ? 1e9 : a.seq) - (b.seq === -1 ? 1e9 : b.seq) || a.c.name.localeCompare(b.c.name));
  let acc = atIdx;
  return list.map(({ c, seq }) => {
    const dur = Math.max(0.5, endPos(c.end) - startPos(c.start));
    const base = acc;
    acc += dur;
    const wanted = base + (shifts[c.id] ?? 0);
    const startIdx = Math.max(atIdx, Math.min(60 - dur, wanted));
    return { course: c, startIdx, endIdx: startIdx + dur - 0.5, shift: startIdx - base, current: seq === currentIdx };
  });
}

/**
 * 특정 월(viewIdx)의 주간 시간표:
 *  - 목표 학교(track)에서 그 달에 진행 중인 과정
 *  - 교과(공통) 과정 중 학생 진도 기준으로 그 달에 배치된 블록
 * 한 과정이 주 N회면 세션마다 블록이 생긴다.
 */
export function buildMonthlyTimetable(
  courses: Course[],
  track: Track,
  viewIdx: number,
  atIdx: number,
  shifts: Record<string, number>,
  slotOverrides: Record<string, TimeSlot>,
  progress: GyoProgress
): MonthlyTimetable {
  const gyoRange = new Map<string, { startIdx: number; endIdx: number }>();
  for (const e of gyoLaneLayout(courses, '수학', progress.mathCurrent, atIdx, shifts)) gyoRange.set(e.course.id, e);
  for (const e of gyoLaneLayout(courses, '과학', progress.sciCurrent, atIdx, shifts)) gyoRange.set(e.course.id, e);

  const blocks: TimetableBlock[] = [];
  for (const c of courses) {
    let range: { startIdx: number; endIdx: number } | undefined;
    if (c.track === '공통') range = gyoRange.get(c.id);
    else if (c.track === track) range = shiftedRange(c, shifts[c.id] ?? 0);
    if (!range) continue;
    if (range.startIdx > viewIdx + 0.5 || range.endIdx < viewIdx) continue; // 이 달과 안 겹침
    c.schedule.forEach((base, i) => {
      const key = sessionKey(c.id, i);
      const slot = slotOverrides[key] ?? base;
      if (!slot) return;
      blocks.push({
        key,
        courseId: c.id,
        sessionIdx: i,
        gyo: c.track === '공통' ? (c.subject === '수학' ? 'math' : 'sci') : undefined,
        label: c.name,
        subject: c.subject,
        teacher: c.teacher,
        slot,
        movable: true,
      });
    });
  }
  return { blocks, conflicts: detectConflicts(blocks) };
}

// ── 입시 여정 요약(지금 단계 / 다음 단계 / 시험) ─────────────
export interface JourneySummary {
  currentPhase?: Phase;
  nowCourses: string[];
  nextPhase?: Phase;
  nextPhaseStartIdx?: number;
  nextCourses: string[];
  milestones: { name: string; pos: number; half: boolean; monthsLeft: number }[];
}

export function journeySummary(
  courses: Course[],
  plan: TrackPlan,
  track: Track,
  atIdx: number,
  shifts: Record<string, number>,
  progress: GyoProgress
): JourneySummary {
  const phases = [...plan.phases].sort((a, b) => startPos(a.start) - startPos(b.start));
  const currentPhase = phases.find((p) => startPos(p.start) <= atIdx + 0.5 && endPos(p.end) - 0.5 >= atIdx);
  const nextPhase = phases.find((p) => startPos(p.start) > atIdx + 0.5);

  const rem = remainingCourses(courses, track, atIdx, shifts);
  const nowSpec = rem.filter((e) => e.status === '진행중').map((e) => e.course.name);
  const gyoNow = [
    ...gyoLaneLayout(courses, '수학', progress.mathCurrent, atIdx, shifts),
    ...gyoLaneLayout(courses, '과학', progress.sciCurrent, atIdx, shifts),
  ]
    .filter((e) => e.current)
    .map((e) => e.course.name);
  const nowCourses = Array.from(new Set([...nowSpec, ...gyoNow]));

  let nextCourses: string[] = [];
  if (nextPhase) {
    const s = startPos(nextPhase.start);
    const e = endPos(nextPhase.end) - 0.5;
    nextCourses = Array.from(new Set(rem.filter((x) => x.startIdx >= s && x.startIdx <= e).map((x) => x.course.name)));
  }

  const milestones = plan.milestones
    .map((m) => {
      const pos = startPos(m.at); // 중순이면 x.5
      return { name: m.name, pos, half: !!m.at.half, monthsLeft: pos - atIdx };
    })
    .filter((m) => m.monthsLeft >= 0)
    .sort((a, b) => a.pos - b.pos);

  return {
    currentPhase,
    nowCourses,
    nextPhase,
    nextPhaseStartIdx: nextPhase ? startPos(nextPhase.start) : undefined,
    nextCourses,
    milestones,
  };
}
