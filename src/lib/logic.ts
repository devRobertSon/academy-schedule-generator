// src/lib/logic.ts
import {
  Course,
  Grade,
  Subject,
  TimeSlot,
  Track,
  TRACKS,
  TRACK_COURSES,
  gmIndex,
} from '../data/roadmap';

export type Status = '완료' | '진행중' | '예정';

/** 현재 월 인덱스(0..59) */
export function nowIndex(grade: Grade, month: number): number {
  return gmIndex(grade, month);
}

/** gmIndex(start)..gmIndex(end) 기준 완료/진행중/예정 */
export function courseStatus(course: Course, atIdx: number): Status {
  const startIdx = gmIndex(course.start.grade, course.start.month);
  const endIdx = gmIndex(course.end.grade, course.end.month);
  if (atIdx < startIdx) return '예정';
  if (atIdx > endIdx) return '완료';
  return '진행중';
}

export interface RoadmapEntry {
  course: Course;
  status: Status;
}

/** 5개 학교 전부의 로드맵 데이터 (입력에 학교 없음) */
export function buildAllRoadmaps(atIdx: number): Record<Track, RoadmapEntry[]> {
  const result = {} as Record<Track, RoadmapEntry[]>;
  for (const t of TRACKS) {
    result[t] = TRACK_COURSES.filter((c) => c.track === t).map((c) => ({
      course: c,
      status: courseStatus(c, atIdx),
    }));
  }
  return result;
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
  label: string;
  subject: Subject;
  slot: TimeSlot;
  fixed: boolean;
  /** 같은 과목 내 식별용(드래그 블록 등) */
  key?: string;
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
      const aStart = toMinutes(a.slot.start);
      const aEnd = toMinutes(a.slot.end);
      const bStart = toMinutes(b.slot.start);
      const bEnd = toMinutes(b.slot.end);
      // 시간 겹침: a.start < b.end && b.start < a.end
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({ a, b });
      }
    }
  }
  return conflicts;
}

export interface Timetable {
  blocks: TimetableBlock[];
  conflicts: ConflictPair[];
}

/** 시간표 재생성: 특정 학교 특화(고정) + 드래그된 교과 블록 */
export function buildTimetable(
  track: Track,
  atIdx: number,
  gyoBlocks: { math: TimeSlot[]; sci: TimeSlot[] }
): Timetable {
  const fixed: TimetableBlock[] = TRACK_COURSES.filter(
    (c) => c.track === track && courseStatus(c, atIdx) === '진행중'
  ).flatMap((c) =>
    c.schedule.map((s, i) => ({
      label: c.name,
      subject: c.subject,
      slot: s,
      fixed: true,
      key: `${c.id}-${i}`,
    }))
  );
  const gyo: TimetableBlock[] = [
    ...gyoBlocks.math.map((s, i) => ({
      label: '수학 교과',
      subject: '수학' as Subject,
      slot: s,
      fixed: false,
      key: `gyo-math-${i}`,
    })),
    ...gyoBlocks.sci.map((s, i) => ({
      label: '과학 교과',
      subject: '과학' as Subject,
      slot: s,
      fixed: false,
      key: `gyo-sci-${i}`,
    })),
  ];
  const blocks = [...fixed, ...gyo];
  return { blocks, conflicts: detectConflicts(blocks) };
}
