// src/lib/logic.test.ts
import { describe, expect, it } from 'vitest';
import { Course, gmIndex, posToEndYM, posToStartYM } from '../data/roadmap';
import { defaultStore } from './store';
import {
  buildMonthlyTimetable,
  courseStatus,
  detectConflicts,
  gyoLaneLayout,
  journeySummary,
  nowIndex,
  projectGyo,
  remainingCourses,
  sessionKey,
  shiftedRange,
} from './logic';

const { courses, plans } = defaultStore();
const byId = (id: string) => courses.find((c) => c.id === id)!;
// 중2 9월 · 수학 중3-2학기 완료(현재=공통수학1, idx 6) · 과학 중2-2학기 완료(현재=중3-1학기, idx 4)
const PROGRESS = { mathCurrent: 6, sciCurrent: 4 };

describe('월 인덱스', () => {
  it('중2 9월 → 42, 중1 6월 → 27', () => {
    expect(nowIndex('중2', 9)).toBe(42);
    expect(nowIndex('중1', 6)).toBe(27);
  });
  it('초5 3월 = 0, 중3 2월 = 59', () => {
    expect(gmIndex('초5', 3)).toBe(0);
    expect(gmIndex('중3', 2)).toBe(59);
  });
});

describe('0.5월 단위 구간', () => {
  const half: Course = {
    ...byId('yj_kmo_algebra'),
    id: 'tmp',
    start: { grade: '중2', month: 9, half: true }, // 중2 9월 중순부터
    end: { grade: '중2', month: 11 }, // 중2 11월 말까지
  };
  it('중순 시작은 x.5, 월말 종료는 (다음 위치)-0.5', () => {
    const r = shiftedRange(half);
    expect(r.startIdx).toBe(42.5);
    expect(r.endIdx).toBe(44.5); // 종료 위치 45(배타) → 마지막 반달 44.5
  });
  it('그 달과 조금이라도 겹치면 진행중', () => {
    expect(courseStatus(half, 42)).toBe('진행중'); // 9월 중순 시작 → 9월 진행중
    expect(courseStatus(half, 41)).toBe('예정');
    expect(courseStatus(half, 45)).toBe('완료');
  });
  it('위치 ↔ YM 변환이 왕복한다', () => {
    expect(posToStartYM(42.5)).toMatchObject({ grade: '중2', month: 9, half: true });
    expect(posToStartYM(42)).toMatchObject({ grade: '중2', month: 9, half: false });
    expect(posToEndYM(45)).toMatchObject({ grade: '중2', month: 11, half: false }); // 11월 말
    expect(posToEndYM(44.5)).toMatchObject({ grade: '중2', month: 11, half: true }); // 11월 중순
  });
});

describe('남은 과목(remainingCourses) — 중2 9월 영재학교', () => {
  const atIdx = nowIndex('중2', 9);
  const rem = remainingCourses(courses, '영재학교', atIdx);
  const names = rem.map((e) => e.course.name);

  it('완료된 창의수학 1단계·천체 특강은 제외되고, 예정인 유전 특강은 남는다', () => {
    expect(courseStatus(byId('yj_chang1'), atIdx)).toBe('완료');
    expect(names).not.toContain('창의수학 1단계');
    expect(names).not.toContain('천체 특강'); // 중2 7~8월 → 완료
    expect(courseStatus(byId('yj_genetics'), atIdx)).toBe('예정'); // 중2 10~11월
    expect(names).toContain('유전 특강');
  });
  it('KMO 4과목이 모두 남는다', () => {
    expect(names).toEqual(expect.arrayContaining(['KMO 대수', 'KMO 기하', 'KMO 정수', 'KMO 조합']));
  });
  it('공통(교과) 과정은 특화 남은 과목에 포함되지 않는다', () => {
    expect(names).not.toContain('공통수학1');
    expect(names).not.toContain('물리');
  });
});

describe('남은 과목 — 중1 6월 영재학교(전 과정 남음)', () => {
  it('영재학교 12개 과정(KMO 4분할·천체/유전 분리 포함)이 모두 남는다', () => {
    const atIdx = nowIndex('중1', 6);
    expect(remainingCourses(courses, '영재학교', atIdx).length).toBe(12);
  });
});

describe('수강 월 이동(shift)', () => {
  it('shift가 시작/종료를 함께 민다(0.5 단위 가능)', () => {
    const c = byId('yj_kmo_algebra');
    const base = shiftedRange(c, 0);
    const moved = shiftedRange(c, 2.5);
    expect(moved.startIdx).toBe(base.startIdx + 2.5);
    expect(moved.endIdx).toBe(base.endIdx + 2.5);
  });
  it('shift로 상태가 예정으로 바뀔 수 있다', () => {
    const atIdx = nowIndex('중2', 9);
    const c = byId('yj_kmo_algebra'); // 36~53 → 진행중
    expect(courseStatus(c, atIdx, 0)).toBe('진행중');
    expect(courseStatus(c, atIdx, 12)).toBe('예정');
  });
});

describe('교과 블록 배치(gyoLaneLayout) — 중2 9월', () => {
  const atIdx = nowIndex('중2', 9); // 42

  it('완료한 블록은 빠지고 현재 블록부터 오늘에서 순서대로 일렬', () => {
    const lane = gyoLaneLayout(courses, '수학', PROGRESS.mathCurrent, atIdx, {});
    expect(lane.map((e) => e.course.name).slice(0, 3)).toEqual(['공통수학1', '공통수학2', '대수']);
    expect(lane[0].startIdx).toBe(42);
    expect(lane[0].endIdx).toBe(47.5); // 6개월 = 42 ~ 48(배타)
    expect(lane[1].startIdx).toBe(48); // 바로 뒤에 붙음(일렬)
    expect(lane[0].current).toBe(true);
    expect(lane.map((e) => e.course.name)).not.toContain('중3-2학기');
  });
  it('과정의 시작~종료 길이가 블록 개월수가 된다', () => {
    const lane = gyoLaneLayout(courses, '과학', PROGRESS.sciCurrent, atIdx, {});
    const first = lane[0];
    expect(first.course.name).toBe('중3-1학기');
    expect(first.endIdx + 0.5 - first.startIdx).toBe(3); // 중등 기본 3개월
  });
  it('shift로 블록을 따로 옮기면 겹칠 수 있다', () => {
    const lane = gyoLaneLayout(courses, '수학', PROGRESS.mathCurrent, atIdx, { gyo_math_7: -6 });
    const a = lane.find((e) => e.course.name === '공통수학1')!;
    const b = lane.find((e) => e.course.name === '공통수학2')!;
    expect(b.startIdx).toBe(a.startIdx);
  });
  it('오늘보다 앞으로는 못 간다', () => {
    const lane = gyoLaneLayout(courses, '수학', PROGRESS.mathCurrent, atIdx, { gyo_math_6: -100 });
    expect(lane.find((e) => e.course.name === '공통수학1')!.startIdx).toBe(42);
  });
});

describe('월별 시간표(buildMonthlyTimetable) — 영재학교 중2 9월', () => {
  const atIdx = nowIndex('중2', 9);
  const tt = buildMonthlyTimetable(courses, '영재학교', atIdx, atIdx, {}, {}, PROGRESS);

  it('그 달 진행 중인 과정 + 그 달에 배치된 교과 블록이 들어간다', () => {
    const labels = tt.blocks.map((b) => b.label);
    expect(labels).toContain('KMO 대수');
    expect(labels).not.toContain('천체 특강'); // 7~8월 → 끝남
    expect(labels).not.toContain('유전 특강'); // 10~11월 → 아직
    expect(labels).toContain('공통수학1');
    expect(labels).toContain('중3-1학기');
    expect(labels).not.toContain('공통수학2');
  });
  it('유전 특강은 중2 10월·11월 시간표에만 올라간다', () => {
    const oct = buildMonthlyTimetable(courses, '영재학교', nowIndex('중2', 10), atIdx, {}, {}, PROGRESS);
    const dec = buildMonthlyTimetable(courses, '영재학교', nowIndex('중2', 12), atIdx, {}, {}, PROGRESS);
    expect(oct.blocks.map((b) => b.label)).toContain('유전 특강');
    expect(dec.blocks.map((b) => b.label)).not.toContain('유전 특강');
  });
  it('담당 선생님이 블록에 포함된다', () => {
    expect(tt.blocks.find((b) => b.label === 'KMO 대수')!.teacher).toBe('이정훈');
    expect(tt.blocks.find((b) => b.label === '공통수학1')!.teacher).toBe('박서연');
  });
  it('주 2회 과정(공통수학1)은 세션마다 블록이 생긴다', () => {
    const blocks = tt.blocks.filter((b) => b.courseId === 'gyo_math_6');
    expect(blocks.length).toBe(2);
    expect(blocks.map((b) => b.slot.day).sort()).toEqual(['수', '토']);
  });
  it('드래그(slotOverride)는 해당 세션만 바꾼다', () => {
    const moved = buildMonthlyTimetable(courses, '영재학교', atIdx, atIdx, {}, {
      [sessionKey('gyo_math_6', 0)]: { day: '월', start: '19:00', end: '21:00' },
    }, PROGRESS);
    expect(moved.blocks.find((b) => b.key === sessionKey('gyo_math_6', 0))!.slot.day).toBe('월');
    expect(moved.blocks.find((b) => b.key === sessionKey('gyo_math_6', 1))!.slot.day).toBe('토');
  });
  it('다음 달로 넘어가면 교과 블록 배치에 따라 바뀐다', () => {
    const later = buildMonthlyTimetable(courses, '영재학교', atIdx + 6, atIdx, {}, {}, PROGRESS);
    const labels = later.blocks.map((b) => b.label);
    expect(labels).toContain('공통수학2');
    expect(labels).not.toContain('공통수학1');
  });
});

describe('충돌 감지', () => {
  it('같은 요일·겹치는 시간을 잡는다', () => {
    const c = detectConflicts([
      { key: 'a', label: 'A', subject: '수학', movable: true, slot: { day: '수', start: '17:00', end: '19:00' } },
      { key: 'b', label: 'B', subject: '과학', movable: true, slot: { day: '수', start: '18:00', end: '20:00' } },
    ]);
    expect(c.length).toBe(1);
  });
  it('끝=시작(붙은 시간)은 충돌이 아니다', () => {
    const c = detectConflicts([
      { key: 'a', label: 'A', subject: '수학', movable: true, slot: { day: '수', start: '16:00', end: '18:00' } },
      { key: 'b', label: 'B', subject: '과학', movable: true, slot: { day: '수', start: '18:00', end: '20:00' } },
    ]);
    expect(c.length).toBe(0);
  });
});

describe('교과 투영(projectGyo)', () => {
  it('현재/완료/예정과 위치', () => {
    const proj = projectGyo(['a', 'b', 'c', 'd'], 1, 42, 3);
    expect(proj[0]).toMatchObject({ done: true, current: false, startIdx: 39 });
    expect(proj[1]).toMatchObject({ done: false, current: true, startIdx: 42 });
    expect(proj[2]).toMatchObject({ startIdx: 45 });
  });
});

describe('입시 여정 요약(journeySummary) — 영재학교 중2 9월', () => {
  const atIdx = nowIndex('중2', 9); // 42
  const j = journeySummary(courses, plans['영재학교'], '영재학교', atIdx, {}, PROGRESS);

  it('지금 단계는 ② 심화·KMO, 다음 단계는 ③ 파이널(중2 12월~)', () => {
    expect(j.currentPhase?.name).toBe('② 심화·KMO');
    expect(j.nextPhase?.name).toBe('③ 파이널');
    expect(j.nextPhaseStartIdx).toBe(gmIndex('중2', 12));
  });
  it('지금 진행 중인 과정에 KMO와 현재 교과 블록이 들어간다', () => {
    expect(j.nowCourses).toEqual(expect.arrayContaining(['KMO 대수', '공통수학1', '중3-1학기']));
  });
  it('다음 단계에 시작하는 과정을 보여준다', () => {
    expect(j.nextCourses).toContain('영재 파이널 수학');
  });
  it('시험 마일스톤과 남은 개월을 계산한다', () => {
    expect(j.milestones[0].name).toBe('영재학교 1차(지필)');
    expect(j.milestones[0].monthsLeft).toBe(gmIndex('중3', 5) - atIdx); // 8
  });
});
