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
  수학: { fill: '#8CC4F2', text: '#0B3D7A' }, // 특화 수학
  과학: { fill: '#F7B267', text: '#5A2E00' }, // 특화 과학
  면접: { fill: '#B4ACF0', text: '#2B2470' },
  교과: { fill: '#CFD9E8', text: '#1F2F4D' }, // (예비) 교과 공통
  교과수학: { fill: '#BFC9F6', text: '#1E2B70' }, // 교과 수학(연보라)
  교과과학: { fill: '#B9E6C4', text: '#16502B' }, // 교과 과학(민트)
};

/** 과정의 표시 색: 교과(공통)는 과목별 교과 색, 그 외는 과목 색 */
export function courseColor(c: { track: Track | '공통'; subject: Subject }) {
  if (c.track === '공통') return c.subject === '수학' ? COLORS.교과수학 : c.subject === '과학' ? COLORS.교과과학 : COLORS.교과;
  return COLORS[c.subject];
}

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

// ── 0.5월 단위 위치 ──────────────────────────────────────
/** 시작 위치(월 인덱스, 0.5 단위). half=true면 그 달 중순부터 */
export function startPos(ym: YM): number {
  return gmIndex(ym.grade, ym.month) + (ym.half ? 0.5 : 0);
}
/** 종료 위치(배타적, 0.5 단위). half=true면 그 달 중순까지, 아니면 그 달 말까지 */
export function endPos(ym: YM): number {
  return gmIndex(ym.grade, ym.month) + (ym.half ? 0.5 : 1);
}
/** 시작 위치 → YM */
export function posToStartYM(pos: number): YM {
  const i = Math.max(0, Math.min(59, Math.floor(pos)));
  return { grade: gradeOfIndex(i), month: monthOfIndex(i), half: pos - Math.floor(pos) >= 0.5 };
}
/** 종료 위치(배타적) → YM(포함) */
export function posToEndYM(pos: number): YM {
  const frac = pos - Math.floor(pos);
  const i = Math.max(0, Math.min(59, frac >= 0.5 ? Math.floor(pos) : Math.floor(pos) - 1));
  return { grade: gradeOfIndex(i), month: monthOfIndex(i), half: frac >= 0.5 };
}

export interface TimeSlot {
  day: Weekday;
  start: string;
  end: string;
} // 'HH:MM'
export interface YM {
  grade: Grade;
  month: number;
  /** true면 시작은 '그 달 중순부터', 종료는 '그 달 중순까지' (0.5월 단위) */
  half?: boolean;
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
  // 천체·유전 특강은 각 2달로 분리
  { id: 'yj_astro', name: '천체 특강', track: '영재학교', subject: '과학', type: '영재학교입시',
    start: { grade: '중2', month: 7 }, end: { grade: '중2', month: 8 }, schedule: [{ day: '수', start: '18:00', end: '20:00' }], teacher: '정우성' },
  { id: 'yj_genetics', name: '유전 특강', track: '영재학교', subject: '과학', type: '영재학교입시',
    start: { grade: '중2', month: 10 }, end: { grade: '중2', month: 11 }, schedule: [{ day: '수', start: '18:00', end: '20:00' }], teacher: '정우성' },
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
  // 교과(공통) 블록은 아래 GYO_COURSES 에서 생성(트랙 '공통', 과정 표에서 관리)
];

/** 교과(공통) — 교육과정 "순서" 배열. 학생 진도 = 인덱스. 앱에서 현재 월에 투영. */
export const MATH_GYO_SEQUENCE = ['중1-1학기', '중1-2학기', '중2-1학기', '중2-2학기', '중3-1학기', '중3-2학기', '공통수학1', '공통수학2', '대수', '미적분Ⅰ', '확률과 통계', '미적분Ⅱ', '기하'];
export const SCI_GYO_MID_SEQUENCE = ['중1-1학기', '중1-2학기', '중2-1학기', '중2-2학기', '중3-1학기', '중3-2학기'];
export const SCI_GYO_HS_PARALLEL = ['물리학', '화학', '생명과학', '지구과학'];
/** 과학 진도(완료 단계) 선택 목록: 중등 학기 → 통합과학 → 물리학/화학 */
export const SCI_GYO_SEQUENCE = [...SCI_GYO_MID_SEQUENCE, '통합과학', '물리학/화학'];

/** 고등 교과: 각각 6개월 단위의 개별 블록으로 로드맵에서 따로 드래그·겹침 가능 */
export const MATH_GYO_ADV_START = 6; // MATH_GYO_SEQUENCE에서 '공통수학1' 인덱스
export const MATH_GYO_MID = MATH_GYO_SEQUENCE.slice(0, MATH_GYO_ADV_START); // 중등 수학(순차)
export const MATH_GYO_ADVANCED = MATH_GYO_SEQUENCE.slice(MATH_GYO_ADV_START); // 공통수학1~기하
export const SCI_GYO_ADVANCED = ['통합과학', '물리', '화학']; // 개별 6개월 블록(물리·화학은 진도의 '물리학/화학'에 함께 대응)
export const GYO_BLOCK_MONTHS = 6; // 개별 교과 블록 길이(개월)

export const GYO_PACE = { mathMonthsPerItem: 3, sciMonthsPerItem: 3 }; // 교과 진도 투영 속도(월/항목)

/** 과학 교과 전체 순서(중등 학기 + 고등) */
export const SCI_GYO_ALL = [...SCI_GYO_MID_SEQUENCE, ...SCI_GYO_ADVANCED];

function ymOf(idx: number): YM {
  return { grade: gradeOfIndex(idx), month: monthOfIndex(idx) };
}

/**
 * 교과(공통) 블록을 일반 과정으로 생성 — 과정 표에서 시작/종료(=개월수)·세션·담당쌤을 편집.
 * 시작/종료는 블록 길이(개월)로만 쓰이고, 실제 위치는 학생 진도 기준 오늘부터 순서대로 배치된다.
 */
function makeGyoCourses(
  prefix: string,
  subject: Subject,
  names: string[],
  durs: number[],
  types: CourseType[],
  sessions: TimeSlot[],
  teacher: string
): Course[] {
  let acc = 0;
  return names.map((name, i) => {
    const start = Math.min(59, acc);
    const end = Math.min(59, acc + durs[i] - 1);
    acc += durs[i];
    return {
      id: `${prefix}_${i}`,
      name,
      track: '공통',
      subject,
      type: types[i],
      start: ymOf(start),
      end: ymOf(end),
      schedule: sessions.map((s) => ({ ...s })),
      teacher,
    };
  });
}

export const GYO_COURSES: Course[] = [
  ...makeGyoCourses(
    'gyo_math',
    '수학',
    MATH_GYO_SEQUENCE,
    MATH_GYO_SEQUENCE.map((_, i) => (i < MATH_GYO_ADV_START ? GYO_PACE.mathMonthsPerItem : GYO_BLOCK_MONTHS)),
    MATH_GYO_SEQUENCE.map((_, i) => (i < MATH_GYO_ADV_START ? '중등선행' : '고등선행')),
    [{ day: '수', start: '16:00', end: '18:00' }, { day: '토', start: '14:00', end: '16:00' }],
    '박서연'
  ),
  ...makeGyoCourses(
    'gyo_sci',
    '과학',
    SCI_GYO_ALL,
    SCI_GYO_ALL.map((_, i) => (i < SCI_GYO_MID_SEQUENCE.length ? GYO_PACE.sciMonthsPerItem : GYO_BLOCK_MONTHS)),
    SCI_GYO_ALL.map((_, i) => (i < SCI_GYO_MID_SEQUENCE.length ? '중등선행' : '고등선행')),
    [{ day: '금', start: '16:00', end: '18:00' }],
    '한지민'
  ),
];

// ── 입시 여정 단계(국면)·시험 마일스톤 — 학교별, 관리 탭에서 편집 ──
export interface Phase {
  name: string;
  start: YM;
  end: YM;
}
export interface Milestone {
  name: string;
  at: YM;
}
export interface TrackPlan {
  phases: Phase[];
  milestones: Milestone[];
}
const ym = (grade: Grade, month: number, half = false): YM => ({ grade, month, half });
export const TRACK_PLANS: Record<Track, TrackPlan> = {
  영재학교: {
    phases: [
      { name: '① 기초·선행', start: ym('초5', 3), end: ym('중1', 2) },
      { name: '② 심화·KMO', start: ym('중2', 3), end: ym('중2', 11) },
      { name: '③ 파이널', start: ym('중2', 12), end: ym('중3', 8) },
      { name: '④ 총정리·면접', start: ym('중3', 9), end: ym('중3', 2) },
    ],
    milestones: [
      { name: '영재학교 2차 평가(지필)', at: ym('중3', 7, true) }, // 7월 중순
      { name: '영재학교 3차 평가(면접)', at: ym('중3', 8) }, // 7월과 8월 사이
    ],
  },
  과학고: {
    phases: [
      { name: '① 기초·선행', start: ym('초5', 3), end: ym('중2', 5) },
      { name: '② 창의수학·심화', start: ym('중2', 6), end: ym('중3', 8) },
      { name: '③ 면접 대비', start: ym('중3', 9), end: ym('중3', 11) },
      { name: '④ 입학 준비', start: ym('중3', 12), end: ym('중3', 2) },
    ],
    milestones: [
      { name: '과학고 면담 평가(인성)', at: ym('중3', 10, true) }, // 10월 중순
      { name: '과학고 면접 평가(수과학)', at: ym('중3', 11, true) }, // 11월 중순
    ],
  },
  국제고: {
    phases: [
      { name: '① 기초·내신', start: ym('초5', 3), end: ym('중3', 8) },
      { name: '② 자소서·면접', start: ym('중3', 9), end: ym('중3', 11) },
      { name: '③ 입학 준비', start: ym('중3', 12), end: ym('중3', 2) },
    ],
    milestones: [{ name: '국제고 면접 평가', at: ym('중3', 12, true) }], // 12월 중순
  },
  외고: {
    phases: [
      { name: '① 기초·내신', start: ym('초5', 3), end: ym('중3', 8) },
      { name: '② 자소서·면접', start: ym('중3', 9), end: ym('중3', 11) },
      { name: '③ 입학 준비', start: ym('중3', 12), end: ym('중3', 2) },
    ],
    milestones: [{ name: '외고 면접', at: ym('중3', 12) }],
  },
  전사고: {
    phases: [
      { name: '① 기초·내신', start: ym('초5', 3), end: ym('중3', 8) },
      { name: '② 통합과학·면접', start: ym('중3', 9), end: ym('중3', 11) },
      { name: '③ 입학 준비', start: ym('중3', 12), end: ym('중3', 2) },
    ],
    milestones: [{ name: '전사고 면접', at: ym('중3', 12) }],
  },
};
