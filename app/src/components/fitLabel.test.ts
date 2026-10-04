// src/components/fitLabel.test.ts — 블록 안 과목 이름 맞추기(한 줄 → 두 줄 → 줄임말)
import { describe, expect, it } from 'vitest';
import { fitLabel } from './RemainingRoadmap';
import { defaultStore, mergePlans } from '../lib/store';
import { defaultHiddenIds } from '../data/roadmap';

describe('defaultHiddenIds — 수학 교과는 공통수학2까지만 기본 표시, 기본심화·심화 벌은 전부 접힘', () => {
  it('교과 레인에서는 대수·미적분Ⅰ·확률과 통계·미적분Ⅱ·기하가 접힌다', () => {
    const cs = defaultStore().courses;
    const hidden = defaultHiddenIds(cs).map((id) => cs.find((c) => c.id === id)!);
    const gyoNames = hidden.filter((c) => (c.lane ?? '교과') === '교과').map((c) => c.name);
    expect(gyoNames).toEqual(['대수', '미적분Ⅰ', '확률과 통계', '미적분Ⅱ', '기하']);
  });
  it('기본심화·심화 레인의 13과목은 모두 접혀 있다(+로 레인을 열고 끌어다 넣음)', () => {
    const cs = defaultStore().courses;
    const hidden = new Set(defaultHiddenIds(cs));
    const basic = cs.filter((c) => c.lane === '기본심화');
    const deep = cs.filter((c) => c.lane === '심화');
    expect(basic.length).toBe(13);
    expect(deep.length).toBe(13);
    expect([...basic, ...deep].every((c) => hidden.has(c.id))).toBe(true);
  });
  it('기본 수업 시간: 수학 1시간 30분 × 주 2회, 과학 2시간 30분 × 주 1회(토)', () => {
    const cs = defaultStore().courses;
    const m = cs.find((c) => c.id === 'gyo_math_6')!;
    expect(m.schedule.map((s) => s.day)).toEqual(['월', '수']);
    expect(m.schedule[0]).toMatchObject({ start: '16:00', end: '17:30' });
    const s = cs.find((c) => c.id === 'gyo_sci_6')!;
    expect(s.schedule).toEqual([{ day: '토', start: '17:00', end: '19:30' }]);
  });
});

const COL_W = 30; // 1달 폭
const BAR_H = 34;

describe('fitLabel', () => {
  it('넉넉하면 한 줄 13px', () => {
    const r = fitLabel('KMO 대수', 6 * COL_W, BAR_H);
    expect(r).toEqual({ lines: ['KMO 대수'], fontSize: 13, abbreviated: false });
  });
  it('한 줄에 안 들어가면 공백에서 두 줄로 나눈다 (고등수학 및 정보 총정리 · 3달)', () => {
    const r = fitLabel('고등수학 및 정보 총정리', 3 * COL_W, BAR_H);
    expect(r.abbreviated).toBe(false);
    expect(r.lines).toHaveLength(2);
    expect(r.lines.join(' ')).toBe('고등수학 및 정보 총정리');
    expect(r.fontSize).toBeGreaterThanOrEqual(8);
  });
  it('두 줄로도 안 들어가면 마지막 단어만 남기고 줄임말 표시 (1달 블록)', () => {
    expect(fitLabel('영재학교 파이널 면접', COL_W, BAR_H)).toMatchObject({ lines: ['면접'], abbreviated: true });
    expect(fitLabel('과학고 파이널 면담', 1.5 * COL_W, BAR_H)).toMatchObject({ lines: ['면담'], abbreviated: true });
  });
  it('공백 없는 긴 이름은 가운데에서 두 줄로 나눈다', () => {
    const r = fitLabel('중등심화과학', 2 * COL_W, BAR_H);
    expect(r.lines).toEqual(['중등심', '화과학']);
    expect(r.abbreviated).toBe(false);
  });
});

describe('mergePlans — 로드맵 표시 종료', () => {
  it('영재학교 기본값은 중3 11월까지', () => {
    expect(mergePlans(undefined).영재학교.roadmapEnd).toEqual({ grade: '중3', month: 11, half: false });
  });
  it('이전 버전 저장본(roadmapEnd 없음)에는 기본값을 채운다', () => {
    const old = mergePlans(undefined);
    const saved = { ...old, 영재학교: { phases: old.영재학교.phases, milestones: old.영재학교.milestones } };
    expect(mergePlans(saved).영재학교.roadmapEnd).toEqual({ grade: '중3', month: 11, half: false });
    expect(mergePlans(saved).과학고.roadmapEnd).toBeUndefined();
  });
});
