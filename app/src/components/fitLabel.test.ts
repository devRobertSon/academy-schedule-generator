// src/components/fitLabel.test.ts — 블록 안 과목 이름 맞추기(한 줄 → 두 줄 → 줄임말)
import { describe, expect, it } from 'vitest';
import { fitLabel } from './RemainingRoadmap';
import { mergePlans } from '../lib/store';

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
