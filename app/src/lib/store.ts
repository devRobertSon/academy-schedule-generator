// src/lib/store.ts — 과정·여정(단계/시험) 데이터 영속화(localStorage) + JSON 백업
import { Course, GYO_COURSES, TRACK_COURSES, TRACK_PLANS, TRACKS, Track, TrackPlan } from '../data/roadmap';

export interface StoreData {
  courses: Course[];
  /** 학교별 입시 여정 단계·시험 마일스톤 */
  plans: Record<Track, TrackPlan>;
}

const KEY = 'asg.store.v5'; // v5: 파이널 수학/과학 중3 6월까지, 파이널 면접·과학고 파이널 면담/면접(특화 면접) 추가

function cloneCourse(c: Course): Course {
  return { ...c, schedule: c.schedule.map((s) => ({ ...s })), start: { ...c.start }, end: { ...c.end } };
}
function clonePlans(): Record<Track, TrackPlan> {
  return JSON.parse(JSON.stringify(TRACK_PLANS)) as Record<Track, TrackPlan>;
}

/** 저장된 plans가 없거나 일부 학교가 빠져 있으면 기본값으로 채움 */
export function mergePlans(p?: Partial<Record<Track, TrackPlan>> | null): Record<Track, TrackPlan> {
  const def = clonePlans();
  const out = {} as Record<Track, TrackPlan>;
  for (const t of TRACKS) {
    const v = p?.[t];
    out[t] = v && Array.isArray(v.phases) && Array.isArray(v.milestones) ? v : def[t];
  }
  return out;
}

export function defaultStore(): StoreData {
  return { courses: [...TRACK_COURSES, ...GYO_COURSES].map(cloneCourse), plans: clonePlans() };
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      courses: Array.isArray(parsed.courses) ? (parsed.courses as Course[]) : defaultStore().courses,
      plans: mergePlans(parsed.plans),
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
  if (!Array.isArray(parsed.courses)) throw new Error('courses 배열이 없습니다');
  return { courses: parsed.courses as Course[], plans: mergePlans(parsed.plans) };
}

let _id = 0;
export function newCourseId(): string {
  _id += 1;
  return `c_${Date.now().toString(36)}_${_id}`;
}
