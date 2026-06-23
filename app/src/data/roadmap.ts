// src/data/roadmap.ts
export type Grade = '초5' | '초6' | '중1' | '중2' | '중3';
export type Track = '영재학교' | '과학고' | '국제고' | '외고' | '전사고';
export type Subject = '수학' | '과학' | '면접';
export type CourseType =
  | '영재학교입시'
  | '과학고입시'
  | '외고입시'
  | '국제고입시'
  | '고등내신'
  | '과학고내신'
  | '중등선행'
  | '고등선행';
export const COURSE_TYPES: CourseType[] = [
  '영재학교입시',
  '과학고입시',
  '외고입시',
  '국제고입시',
  '고등내신',
  '과학고내신',
  '중등선행',
  '고등선행',
];
export type Weekday = '월' | '화' | '수' | '목' | '금' | '토' | '일';
export type Season = '봄' | '여름' | '가을' | '겨울';

export const GRADES: Grade[] = ['초5', '초6', '중1', '중2', '중3'];
export const TRACKS: Track[] = ['영재학교', '과학고', '국제고', '외고', '전사고'];
export const ACADEMIC_MONTHS: number[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]; // 학사연도 월 순서

export const COLORS = {
  수학: { fill: '#85B7EB', text: '#042C53' },
  과학: { fill: '#F0997B', text: '#4A1B0C' },
  면접: { fill: '#AFA9EC', text: '#26215C' },
  교과: { fill: '#D3D1C7', text: '#2C2C2A' },
};

export function academicMonthIndex(month: number): number {
  return (month + 9) % 12;
} // 3월=0…2월=11
export function gmIndex(grade: Grade, month: number): number {
  // 0..59
  return GRADES.indexOf(grade) * 12 + academicMonthIndex(month);
}
export function monthToSeason(month: number): Season {
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

// 월 인덱스(0..59) → 학년/월/라벨
export function gradeOfIndex(idx: number): Grade {
  return GRADES[Math.max(0, Math.min(GRADES.length - 1, Math.floor(idx / 12)))];
}
export function monthOfIndex(idx: number): number {
  return ACADEMIC_MONTHS[((idx % 12) + 12) % 12];
}
export function ymLabel(idx: number): string {
  return `${gradeOfIndex(idx)} ${monthOfIndex(idx)}월`;
}

export interface TimeSlot {
  day: Weekday;
  start: string;
  end: string;
} // 'HH:MM'
export interface YM {
  grade: Grade;
  month: number;
}

export interface Course {
  id: string;
  name: string;
  track: Track | '공통'; // '공통' = 교과
  subject: Subject;
  type: CourseType;
  start: YM;
  end: YM; // 포함 구간(월)
  schedule: TimeSlot[]; // 수업 요일/시각
  teacher?: string; // 담당 선생님
}

/** 트랙별 특화/면접/통합과학 과정 (월 단위, 일정 고정) */
export const TRACK_COURSES: Course[] = [
  // 영재학교 · 수학
  { id: 'yj_chang1', name: '창의수학 1단계', track: '영재학교', subject: '수학', type: '영재학교입시',
    start: { grade: '중1', month: 6 }, end: { grade: '중1', month: 2 }, schedule: [{ day: '월', start: '18:00', end: '20:00' }], teacher: '김민수' },
  // KMO는 대수·기하·정수·조합 4과목으로 구성
  { id: 'yj_kmo_algebra', name: 'KMO 대수', track: '영재학교', subject: '수학', type: '영재학교입시',
    start: { grade: '중2', month: 3 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '화', start: '18:00', end: '20:00' }], teacher: '이정훈' },
  { id: 'yj_kmo_geometry', name: 'KMO 기하', track: '영재학교', subject: '수학', type: '영재학교입시',
    start: { grade: '중2', month: 3 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '화', start: '20:00', end: '22:00' }], teacher: '이정훈' },
  { id: 'yj_kmo_number', name: 'KMO 정수', track: '영재학교', subject: '수학', type: '영재학교입시',
    start: { grade: '중2', month: 3 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '토', start: '10:00', end: '12:00' }], teacher: '김민수' },
  { id: 'yj_kmo_combi', name: 'KMO 조합', track: '영재학교', subject: '수학', type: '영재학교입시',
    start: { grade: '중2', month: 3 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '토', start: '13:00', end: '15:00' }], teacher: '김민수' },
  { id: 'yj_final_math', name: '영재 파이널 수학', track: '영재학교', subject: '수학', type: '영재학교입시',
    start: { grade: '중2', month: 12 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '목', start: '18:00', end: '21:00' }], teacher: '이정훈' },
  { id: 'yj_hs_math_review', name: '고등수학 총정리', track: '영재학교', subject: '수학', type: '고등선행',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 11 }, schedule: [{ day: '토', start: '10:00', end: '13:00' }], teacher: '김민수' },
  // 영재학교 · 과학
  { id: 'yj_astro_genetics', name: '천체·유전 특강', track: '영재학교', subject: '과학', type: '영재학교입시',
    start: { grade: '중2', month: 6 }, end: { grade: '중2', month: 11 }, schedule: [{ day: '수', start: '18:00', end: '20:00' }], teacher: '정우성' },
  { id: 'yj_mid_adv_sci', name: '중등심화과학', track: '영재학교', subject: '과학', type: '영재학교입시',
    start: { grade: '중2', month: 12 }, end: { grade: '중2', month: 2 }, schedule: [{ day: '금', start: '18:00', end: '20:00' }], teacher: '한지민' },
  { id: 'yj_final_sci', name: '영재 파이널 과학', track: '영재학교', subject: '과학', type: '영재학교입시',
    start: { grade: '중3', month: 3 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '토', start: '14:00', end: '17:00' }], teacher: '정우성' },
  { id: 'yj_phys_chem_review', name: '물리학/화학 총정리', track: '영재학교', subject: '과학', type: '고등선행',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 11 }, schedule: [{ day: '일', start: '10:00', end: '13:00' }], teacher: '한지민' },
  // 과학고 · 수학
  { id: 'sg_chang1', name: '창의수학 1단계', track: '과학고', subject: '수학', type: '과학고입시',
    start: { grade: '중2', month: 6 }, end: { grade: '중2', month: 2 }, schedule: [{ day: '월', start: '17:00', end: '19:00' }] },
  { id: 'sg_chang2', name: '창의수학 2단계', track: '과학고', subject: '수학', type: '과학고입시',
    start: { grade: '중3', month: 3 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '목', start: '17:00', end: '20:00' }] },
  { id: 'sg_interview_math', name: '과학고 면접 대비(수학)', track: '과학고', subject: '수학', type: '과학고입시',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 11 }, schedule: [{ day: '토', start: '13:00', end: '15:00' }] },
  { id: 'sg_hs_math_info_review', name: '고등수학 및 정보 총정리', track: '과학고', subject: '수학', type: '과학고내신',
    start: { grade: '중3', month: 12 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '토', start: '15:00', end: '18:00' }] },
  // 과학고 · 과학
  { id: 'sg_mid_adv_sci', name: '중등심화과학', track: '과학고', subject: '과학', type: '과학고입시',
    start: { grade: '중3', month: 6 }, end: { grade: '중3', month: 8 }, schedule: [{ day: '수', start: '17:00', end: '19:00' }] },
  { id: 'sg_interview_sci', name: '과학고 면접 대비(과학)', track: '과학고', subject: '과학', type: '과학고입시',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 11 }, schedule: [{ day: '토', start: '15:00', end: '17:00' }] },
  { id: 'sg_hs_sci_review', name: '고등과학 총정리', track: '과학고', subject: '과학', type: '과학고내신',
    start: { grade: '중3', month: 12 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '일', start: '13:00', end: '16:00' }] },
  // 국제고
  { id: 'ig_interview', name: '면접 대비', track: '국제고', subject: '면접', type: '국제고입시',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 11 }, schedule: [{ day: '금', start: '19:00', end: '21:00' }] },
  { id: 'ig_int_sci1', name: '통합과학1', track: '국제고', subject: '과학', type: '고등선행',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '화', start: '17:00', end: '19:00' }] },
  // 외고
  { id: 'fl_interview', name: '면접 대비', track: '외고', subject: '면접', type: '외고입시',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 11 }, schedule: [{ day: '금', start: '19:00', end: '21:00' }] },
  { id: 'fl_int_sci1', name: '통합과학1', track: '외고', subject: '과학', type: '고등선행',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '화', start: '17:00', end: '19:00' }] },
  // 전사고
  { id: 'js_int_sci1', name: '통합과학1', track: '전사고', subject: '과학', type: '고등선행',
    start: { grade: '중3', month: 9 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '목', start: '17:00', end: '19:00' }] },
  // 교과(공통) — 모든 목표 학교 학생이 공통으로 수강. 과목별 수업으로 분리.
  { id: 'gyo_math', name: '수학 교과', track: '공통', subject: '수학', type: '중등선행',
    start: { grade: '초5', month: 3 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '수', start: '16:00', end: '18:00' }, { day: '토', start: '14:00', end: '16:00' }], teacher: '박서연' },
  { id: 'gyo_sci', name: '과학 교과', track: '공통', subject: '과학', type: '중등선행',
    start: { grade: '초5', month: 3 }, end: { grade: '중3', month: 2 }, schedule: [{ day: '금', start: '16:00', end: '18:00' }], teacher: '한지민' },
];

/** 교과(공통) — 교육과정 "순서" 배열. 학생 진도 = 인덱스. 앱에서 현재 월에 투영. */
export const MATH_GYO_SEQUENCE = ['중1-1학기', '중1-2학기', '중2-1학기', '중2-2학기', '중3-1학기', '중3-2학기', '공통수학1', '공통수학2', '대수', '미적분Ⅰ', '확률과 통계', '미적분Ⅱ', '기하'];
export const SCI_GYO_MID_SEQUENCE = ['중1-1학기', '중1-2학기', '중2-1학기', '중2-2학기', '중3-1학기', '중3-2학기'];
export const SCI_GYO_HS_PARALLEL = ['물리학', '화학', '생명과학', '지구과학'];

export const GYO_PACE = { mathMonthsPerItem: 3, sciMonthsPerItem: 3 }; // 교과 진도 투영 속도(월/항목)

/** 교과(공통) 과정 id */
export const GYO_MATH_ID = 'gyo_math';
export const GYO_SCI_ID = 'gyo_sci';
