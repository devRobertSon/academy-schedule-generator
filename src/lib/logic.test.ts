// src/lib/logic.test.ts — SPEC 10장 테스트 케이스(월 해상도)
import { describe, expect, it } from 'vitest';
import { gmIndex, TRACK_COURSES } from '../data/roadmap';
import {
  buildAllRoadmaps,
  buildTimetable,
  courseStatus,
  detectConflicts,
  nowIndex,
  projectGyo,
} from './logic';

const byId = (id: string) => TRACK_COURSES.find((c) => c.id === id)!;

describe('월 인덱스', () => {
  it('중2 9월 → 42', () => {
    expect(nowIndex('중2', 9)).toBe(42);
    expect(gmIndex('중2', 9)).toBe(42);
  });
  it('초5 3월 = 0, 중3 2월 = 59', () => {
    expect(gmIndex('초5', 3)).toBe(0);
    expect(gmIndex('중3', 2)).toBe(59);
  });
  it('주요 과정 인덱스', () => {
    expect(gmIndex('중1', 6)).toBe(27); // 창의수학 1단계 시작
    expect(gmIndex('중1', 2)).toBe(35); // 창의수학 1단계 끝
    expect(gmIndex('중2', 3)).toBe(36); // KMO 시작
    expect(gmIndex('중3', 8)).toBe(53); // KMO 끝
    expect(gmIndex('중2', 6)).toBe(39); // 천체·유전 특강 시작
    expect(gmIndex('중2', 11)).toBe(44); // 천체·유전 특강 끝
    expect(gmIndex('중2', 12)).toBe(45); // 영재 파이널 수학 시작 / 중등심화과학 시작
    expect(gmIndex('중2', 2)).toBe(47); // 중등심화과학 끝
  });
});

describe('SPEC 10장: 중2 9월(idx 42)', () => {
  const atIdx = nowIndex('중2', 9);

  it('5개 학교 로드맵이 모두 출력된다', () => {
    const all = buildAllRoadmaps(atIdx);
    expect(Object.keys(all)).toEqual(['영재학교', '과학고', '국제고', '외고', '전사고']);
    expect(all['영재학교'].length).toBeGreaterThan(0);
  });

  it('영재학교 상태: KMO·천체유전=진행중, 파이널수학·중등심화=예정, 창의1=완료', () => {
    expect(courseStatus(byId('yj_kmo'), atIdx)).toBe('진행중');
    expect(courseStatus(byId('yj_astro_genetics'), atIdx)).toBe('진행중');
    expect(courseStatus(byId('yj_final_math'), atIdx)).toBe('예정');
    expect(courseStatus(byId('yj_mid_adv_sci'), atIdx)).toBe('예정');
    expect(courseStatus(byId('yj_chang1'), atIdx)).toBe('완료');
  });

  it('영재학교 시간표: KMO(화)·천체유전(수) 고정 + 교과 2블록', () => {
    const tt = buildTimetable('영재학교', atIdx, {
      math: [{ day: '수', start: '16:00', end: '18:00' }],
      sci: [{ day: '금', start: '16:00', end: '18:00' }],
    });
    const fixed = tt.blocks.filter((b) => b.fixed).map((b) => b.label);
    expect(fixed).toContain('KMO');
    expect(fixed).toContain('천체·유전 특강');
    const gyo = tt.blocks.filter((b) => !b.fixed).map((b) => b.label);
    expect(gyo).toContain('수학 교과');
    expect(gyo).toContain('과학 교과');
  });

  it('교과 블록을 옮기면 시간표가 즉시 바뀐다(재생성)', () => {
    const before = buildTimetable('영재학교', atIdx, {
      math: [{ day: '수', start: '16:00', end: '18:00' }],
      sci: [{ day: '금', start: '16:00', end: '18:00' }],
    });
    const after = buildTimetable('영재학교', atIdx, {
      math: [{ day: '월', start: '16:00', end: '18:00' }],
      sci: [{ day: '금', start: '16:00', end: '18:00' }],
    });
    const beforeMath = before.blocks.find((b) => b.label === '수학 교과')!;
    const afterMath = after.blocks.find((b) => b.label === '수학 교과')!;
    expect(beforeMath.slot.day).toBe('수');
    expect(afterMath.slot.day).toBe('월');
  });
});

describe('충돌 감지', () => {
  it('같은 요일·시간 겹침을 잡는다', () => {
    const conflicts = detectConflicts([
      { label: 'A', subject: '수학', fixed: true, slot: { day: '수', start: '17:00', end: '19:00' } },
      { label: 'B', subject: '과학', fixed: false, slot: { day: '수', start: '18:00', end: '20:00' } },
    ]);
    expect(conflicts.length).toBe(1);
  });
  it('붙어있는(끝=시작) 시간은 충돌이 아니다', () => {
    const conflicts = detectConflicts([
      { label: 'A', subject: '수학', fixed: true, slot: { day: '수', start: '16:00', end: '18:00' } },
      { label: 'B', subject: '과학', fixed: false, slot: { day: '수', start: '18:00', end: '20:00' } },
    ]);
    expect(conflicts.length).toBe(0);
  });
  it('다른 요일은 충돌이 아니다', () => {
    const conflicts = detectConflicts([
      { label: 'A', subject: '수학', fixed: true, slot: { day: '수', start: '17:00', end: '19:00' } },
      { label: 'B', subject: '과학', fixed: false, slot: { day: '목', start: '17:00', end: '19:00' } },
    ]);
    expect(conflicts.length).toBe(0);
  });
});

describe('교과 투영', () => {
  it('현재/완료/예정 플래그와 위치', () => {
    const seq = ['a', 'b', 'c', 'd'];
    const proj = projectGyo(seq, 1, 42, 3);
    expect(proj[0]).toMatchObject({ name: 'a', done: true, current: false, startIdx: 39 });
    expect(proj[1]).toMatchObject({ name: 'b', done: false, current: true, startIdx: 42 });
    expect(proj[2]).toMatchObject({ name: 'c', done: false, current: false, startIdx: 45 });
  });
});
