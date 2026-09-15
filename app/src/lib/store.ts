// src/lib/store.ts — 과정 데이터 영속화(localStorage) + JSON 백업
import { Course, GYO_COURSES, TRACK_COURSES } from '../data/roadmap';

export interface StoreData {
  courses: Course[];
}

// 교과 블록이 일반 과정 행으로 바뀌어 저장 구조가 달라짐 → 키 갱신
const KEY = 'asg.store.v3';

function cloneCourse(c: Course): Course {
  return { ...c, schedule: c.schedule.map((s) => ({ ...s })), start: { ...c.start }, end: { ...c.end } };
}

export function defaultStore(): StoreData {
  return { courses: [...TRACK_COURSES, ...GYO_COURSES].map(cloneCourse) };
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return { courses: Array.isArray(parsed.courses) ? (parsed.courses as Course[]) : defaultStore().courses };
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
  if (!Array.isArray(parsed.courses)) throw new Error('courses 배열이 없습니다');
  return { courses: parsed.courses as Course[] };
}

let _id = 0;
export function newCourseId(): string {
  _id += 1;
  return `c_${Date.now().toString(36)}_${_id}`;
}
