// src/lib/store.ts — 과목/교과 설정 영속화(localStorage) + JSON 백업
import {
  Course,
  GYO_DEFAULT_BLOCKS,
  GYO_PACE,
  TimeSlot,
  TRACK_COURSES,
} from '../data/roadmap';

export interface GyoConfig {
  mathSlots: TimeSlot[];
  mathTeacher?: string;
  sciSlots: TimeSlot[];
  sciTeacher?: string;
  mathMonthsPerItem: number;
  sciMonthsPerItem: number;
}

export interface StoreData {
  courses: Course[];
  gyo: GyoConfig;
}

const KEY = 'asg.store.v1';

export function defaultStore(): StoreData {
  return {
    courses: TRACK_COURSES.map((c) => ({
      ...c,
      schedule: c.schedule.map((s) => ({ ...s })),
      start: { ...c.start },
      end: { ...c.end },
    })),
    gyo: {
      mathSlots: GYO_DEFAULT_BLOCKS.math.map((s) => ({ ...s })),
      sciSlots: GYO_DEFAULT_BLOCKS.sci.map((s) => ({ ...s })),
      mathTeacher: '박서연',
      sciTeacher: '한지민',
      mathMonthsPerItem: GYO_PACE.mathMonthsPerItem,
      sciMonthsPerItem: GYO_PACE.sciMonthsPerItem,
    },
  };
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const def = defaultStore();
    return {
      courses: Array.isArray(parsed.courses) ? (parsed.courses as Course[]) : def.courses,
      gyo: { ...def.gyo, ...(parsed.gyo ?? {}) },
    };
  } catch {
    return defaultStore();
  }
}

export function saveStore(data: StoreData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 저장 실패는 무시(시크릿 모드 등) */
  }
}

export function exportStoreJson(data: StoreData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `알파학원_과목설정_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseStoreJson(text: string): StoreData {
  const parsed = JSON.parse(text) as Partial<StoreData>;
  const def = defaultStore();
  if (!Array.isArray(parsed.courses)) throw new Error('courses 배열이 없습니다');
  return {
    courses: parsed.courses as Course[],
    gyo: { ...def.gyo, ...(parsed.gyo ?? {}) },
  };
}

let _id = 0;
export function newCourseId(): string {
  _id += 1;
  return `c_${Date.now().toString(36)}_${_id}`;
}
