import {
  buildMistakeRewardsSnapshot,
  nextTitleFor,
  titleFor,
} from '../modules/mistake-practice/rewards_model';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';

const DAY = 86_400_000;
// Среда, чтобы неделя не начиналась и не кончалась ровно на границе теста.
const WED = new Date(2026, 8, 9, 12, 0, 0).getTime();

const rewarded = (id: string, atMs: number, cycle = '1'): MistakeEvent => ({
  eventId: `rw:${id}:${cycle}:${atMs}`,
  mistakeId: id,
  cycleId: `${id}:mistake-cycle:${cycle}`,
  type: 'correction_rewarded',
  occurredAtMs: atMs,
  studyTarget: 'en',
  payload: { rewardKey: `k-${id}-${cycle}` },
});

const capturedVoice = (id: string, atMs: number, cycle = '1'): MistakeEvent => ({
  eventId: `cap:${id}:${cycle}:${atMs}`,
  mistakeId: id,
  cycleId: `${id}:mistake-cycle:${cycle}`,
  type: 'captured',
  occurredAtMs: atMs,
  studyTarget: 'en',
  payload: { facet: 'pronunciation', sourceKind: 'lesson_phrase', sourceId: id, canonicalTarget: id },
});

// зачем (владелец 2026-09-14, финал А и полка А): серия, цель недели и звания
// считаются ИЗ ЖУРНАЛА, а не из отдельного счётчика — иначе разойдутся с фактом.
describe('mistake rewards model', () => {
  test('titles follow the approved 5 / 15 / 40 / 100 ladder', () => {
    expect(titleFor(0)).toBeNull();
    expect(titleFor(4)).toBeNull();
    expect(titleFor(5)?.id).toBe('attentive');
    expect(titleFor(27)?.id).toBe('proofreader');
    expect(titleFor(40)?.id).toBe('editor');
    expect(titleFor(500)?.id).toBe('master');
    expect(nextTitleFor(27)).toEqual({ title: { id: 'editor', threshold: 40 }, remaining: 13 });
    expect(nextTitleFor(120)).toBeNull();
  });

  test('counts a mistake once even when its cycle is rewarded twice', () => {
    const snapshot = buildMistakeRewardsSnapshot([
      rewarded('a', WED),
      rewarded('a', WED + 1000),
    ], WED + DAY);
    expect(snapshot.corrected).toBe(1);
  });

  test('streak survives a fix made yesterday but breaks after a full missed day', () => {
    const live = buildMistakeRewardsSnapshot([
      rewarded('a', WED - 2 * DAY),
      rewarded('b', WED - DAY),
    ], WED);
    expect(live.streakDays).toBe(2);

    const broken = buildMistakeRewardsSnapshot([
      rewarded('a', WED - 3 * DAY),
      rewarded('b', WED - 2 * DAY),
    ], WED);
    expect(broken.streakDays).toBe(0);
  });

  // зачем (владелец 2026-09-15): цель недели удалена из раздела целиком —
  // она считала «исправлено навсегда» и не двигалась после обычного ответа.
  test('the weekly goal is gone from the snapshot for good', () => {
    const snapshot = buildMistakeRewardsSnapshot([
      rewarded('old', WED - 9 * DAY),
      rewarded('a', WED),
    ], WED);
    expect(snapshot).not.toHaveProperty('correctedThisWeek');
    expect(snapshot).not.toHaveProperty('weekGoalReached');
    expect(snapshot).not.toHaveProperty('weekKey');
    expect(snapshot.corrected).toBe(2);
  });

  test('voice fixes are counted only when that cycle really was a pronunciation one', () => {
    const snapshot = buildMistakeRewardsSnapshot([
      capturedVoice('v', WED - DAY),
      rewarded('v', WED),
      rewarded('t', WED),
    ], WED);
    expect(snapshot.voiceCorrected).toBe(1);
    expect(snapshot.corrected).toBe(2);
  });

  test('an empty journal is a calm zero, never a crash', () => {
    const snapshot = buildMistakeRewardsSnapshot([], WED);
    expect(snapshot).toMatchObject({ corrected: 0, streakDays: 0, title: null });
    expect(snapshot.nextTitle?.title.id).toBe('attentive');
  });
});
