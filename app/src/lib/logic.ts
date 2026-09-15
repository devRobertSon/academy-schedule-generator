// src/lib/logic.ts — 상담 도구 로직(목표 학교의 남은 과목 + 월별 시간표)
import {
  Course,
  Grade,
  MATH_GYO_SEQUENCE,
  SCI_GYO_ALL,
  Subject,
  TimeSlot,
  Track,
  gmIndex,
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

/** 학생 맞춤 이동(shift)을 반영한 과정 구간(월 인덱스) */
export function shiftedRange(course: Course, shift = 0): { startIdx: number; endIdx: number } {
  return {
    startIdx: gmIndex(course.start.grade, course.start.month) + shift,
    endIdx: gmIndex(course.end.grade, course.end.month) + shift,
  };
}

export function statusFromIdx(startIdx: number, endIdx: number, atIdx: number): Status {
  if (atIdx < startIdx) return '예정';
  if (atIdx > endIdx) return '완료';
  return '진행중';
}

/** gmIndex(start)..gmIndex(end)(+shift) 기준 완료/진행중/예정 */
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

/**
 * 목표 학교의 "남은 과목"(완료되지 않은 과정)을 시작 월 순으로 반환.
 * shifts: 과정 id별 학생 맞춤 이동(개월 수)
 */
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
export function projectGyo(
  seq: string[],
  currentIdx: number,
  nowIdx: number,
  monthsPerItem: number
): GyoProjection[] {
  return seq.map((name, i) => ({
    name,
    startIdx: nowIdx + (i - currentIdx) * monthsPerItem,
    done: i < currentIdx,
    current: i === currentIdx,
  }));
}

export interface TimetableBlock {
  key: string;
  courseId?: string; // 특화 과정(드래그 시 슬롯 override 대상)
  sessionIdx?: number; // 과정 내 세션(주 N회) 인덱스
  gyo?: 'math' | 'sci'; // 교과 식별
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

/** 교과(공통) 과정의 교육과정 순서 인덱스(이름 기준). 목록에 없으면 -1 */
export function gyoSeqIndex(c: Course): number {
  if (c.track !== '공통') return -1;
  if (c.subject === '수학') return MATH_GYO_SEQUENCE.indexOf(c.name);
  if (c.subject === '과학') return SCI_GYO_ALL.indexOf(c.name);
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
    const dur = Math.max(1, gmIndex(c.end.grade, c.end.month) - gmIndex(c.start.grade, c.start.month) + 1);
    const base = acc;
    acc += dur;
    const wanted = base + (shifts[c.id] ?? 0);
    const startIdx = Math.max(atIdx, Math.min(60 - dur, wanted));
    return { course: c, startIdx, endIdx: startIdx + dur - 1, shift: startIdx - base, current: seq === currentIdx };
  });
}

/**
 * 특정 월(viewIdx)의 주간 시간표:
 *  - 목표 학교(track)에서 그 달에 진행 중인 과정
 *  - 교과(공통) 과정 중 학생 진도 기준으로 그 달에 배치된 블록
 * 한 과정이 주 N회면 세션마다 블록이 생긴다.
 * slotOverrides: 시간표에서 드래그로 바꾼 세션별 요일/시간(키 = courseId#sessionIdx)
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
    if (c.track === '공통') range = gyoRange.get(c.id); // 완료 블록은 배치에 없음 → 제외
    else if (c.track === track) range = shiftedRange(c, shifts[c.id] ?? 0);
    if (!range) continue;
    if (viewIdx < range.startIdx || viewIdx > range.endIdx) continue; // 이 달에 진행 안 함
    c.schedule.forEach((base, i) => {
      const key = sessionKey(c.id, i);
      const slot = slotOverrides[key] ?? base;
      if (!slot) return;
      blocks.push({
        key,
        courseId: c.id,
        sessionIdx: i,
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
