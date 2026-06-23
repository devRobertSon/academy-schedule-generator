// src/lib/logic.test.ts
import { describe, expect, it } from 'vitest';
import { gmIndex } from '../data/roadmap';
import { defaultStore } from './store';
import {
  buildMonthlyTimetable,
  courseStatus,
  detectConflicts,
  nowIndex,
  projectGyo,
  remainingCourses,
  sessionKey,
  shiftedRange,
} from './logic';

const courses = defaultStore().courses;
const byId = (id: string) => courses.find((c) => c.id === id)!;

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

describe('남은 과목(remainingCourses) — 중2 9월 영재학교', () => {
  const atIdx = nowIndex('중2', 9);
  const rem = remainingCourses(courses, '영재학교', atIdx);
  const names = rem.map((e) => e.course.name);

  it('완료된 창의수학 1단계는 제외된다', () => {
    expect(courseStatus(byId('yj_chang1'), atIdx)).toBe('완료');
    expect(names).not.toContain('창의수학 1단계');
  });
  it('KMO 4과목이 모두 남는다', () => {
    expect(names).toEqual(expect.arrayContaining(['KMO 대수', 'KMO 기하', 'KMO 정수', 'KMO 조합']));
  });
  it('공통(교과) 과정은 로드맵 남은 과목에 포함되지 않는다', () => {
    expect(names).not.toContain('수학 교과');
    expect(names).not.toContain('과학 교과');
  });
  it('시작 월 순으로 정렬된다', () => {
    const starts = rem.map((e) => e.startIdx);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});

describe('남은 과목 — 중1 6월 영재학교(전 과정 남음)', () => {
  it('영재학교 11개 과정(KMO 4분할 포함)이 모두 남는다', () => {
    const atIdx = nowIndex('중1', 6);
    const rem = remainingCourses(courses, '영재학교', atIdx);
    expect(rem.length).toBe(11);
  });
});

describe('수강 월 이동(shift)', () => {
  it('shift가 시작/종료 인덱스를 함께 민다', () => {
    const c = byId('yj_kmo_algebra');
    const base = shiftedRange(c, 0);
    const moved = shiftedRange(c, 3);
    expect(moved.startIdx).toBe(base.startIdx + 3);
    expect(moved.endIdx).toBe(base.endIdx + 3);
  });
  it('shift로 상태가 예정으로 바뀔 수 있다', () => {
    const atIdx = nowIndex('중2', 9); // 42
    const c = byId('yj_kmo_algebra'); // 36~53 → 진행중
    expect(courseStatus(c, atIdx, 0)).toBe('진행중');
    expect(courseStatus(c, atIdx, 12)).toBe('예정');
  });
});

describe('월별 시간표(buildMonthlyTimetable) — 영재학교 중2 9월', () => {
  const atIdx = nowIndex('중2', 9);
  const tt = buildMonthlyTimetable(courses, '영재학교', atIdx, {}, {});

  it('그 달 진행 중인 과정 + 공통 교과가 들어간다', () => {
    const labels = tt.blocks.map((b) => b.label);
    expect(labels).toContain('KMO 대수');
    expect(labels).toContain('천체·유전 특강');
    expect(labels).toContain('수학 교과'); // 공통 교과 과정
    expect(labels).toContain('과학 교과');
  });
  it('담당 선생님이 블록에 포함된다', () => {
    const kmo = tt.blocks.find((b) => b.label === 'KMO 대수')!;
    expect(kmo.teacher).toBe('이정훈');
    const sci = tt.blocks.find((b) => b.label === '과학 교과')!;
    expect(sci.teacher).toBe('한지민');
  });
  it('주 2회 과정(수학 교과)은 세션마다 블록이 생긴다', () => {
    const mathBlocks = tt.blocks.filter((b) => b.courseId === 'gyo_math');
    expect(mathBlocks.length).toBe(2); // 수 + 토
    expect(mathBlocks.map((b) => b.slot.day).sort()).toEqual(['수', '토']);
  });
  it('드래그(slotOverride)는 해당 세션만 바꾼다', () => {
    const moved = buildMonthlyTimetable(courses, '영재학교', atIdx, {}, {
      [sessionKey('gyo_math', 0)]: { day: '월', start: '19:00', end: '21:00' },
    });
    const s0 = moved.blocks.find((b) => b.key === sessionKey('gyo_math', 0))!;
    const s1 = moved.blocks.find((b) => b.key === sessionKey('gyo_math', 1))!;
    expect(s0.slot.day).toBe('월');
    expect(s1.slot.day).toBe('토'); // 다른 세션은 그대로
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

describe('교과 투영', () => {
  it('현재/완료/예정과 위치', () => {
    const proj = projectGyo(['a', 'b', 'c', 'd'], 1, 42, 3);
    expect(proj[0]).toMatchObject({ done: true, current: false, startIdx: 39 });
    expect(proj[1]).toMatchObject({ done: false, current: true, startIdx: 42 });
    expect(proj[2]).toMatchObject({ startIdx: 45 });
  });
});
