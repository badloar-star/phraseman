/**
 * Хранилище навыков: очки видны сразу, переживают перезапуск, не теряются при сбое записи,
 * не достаются другому владельцу (перенос макетов Elevate, этап 2).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __skillStoreTestHooks as hooks, parseSkillsState, peekSkills, recordSkillAction, refreshSkills, skillWeekGains, subscribeSkills, takeSkillSessionBase,
} from '../modules/skills/skill_store';

const NOON = new Date(2026, 10, 11, 12, 0, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
let owner = 'owner-a';
let now = NOON;

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  owner = 'owner-a';
  now = NOON;
  hooks.setDeps({ now: () => now, ownerStableId: async () => owner });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('очки видны в памяти сразу и лежат на диске', async () => {
  const seen: number[] = [];
  subscribeSkills((s) => { if (s) seen.push(s.totals.grammar); });
  const r = await recordSkillAction({ action: 'lesson_phrase_first_try', itemKey: 'p1' });
  expect(r).toMatchObject({ skill: 'grammar', points: 3, saved: true, levelUps: [] });
  expect(peekSkills()?.totals.grammar).toBe(3);
  expect(seen[seen.length - 1]).toBe(3);
  const raw = await AsyncStorage.getItem('skills_v1:owner-a');
  expect(JSON.parse(raw as string).totals.grammar).toBe(3);
});

it('переживает перезапуск вместе с дневным правилом повтора', async () => {
  await recordSkillAction({ action: 'recall_written', itemKey: 'w1' });
  hooks.reset();
  hooks.setDeps({ now: () => now, ownerStableId: async () => owner });
  expect(peekSkills()).toBeNull();
  const second = await recordSkillAction({ action: 'recall_written', itemKey: 'w1' });
  expect(second.points).toBe(1);
  expect(peekSkills()?.totals.vocab).toBe(3);
});

it('на следующий день та же фраза снова даёт полные очки', async () => {
  await recordSkillAction({ action: 'recall_written', itemKey: 'w1' });
  now = NOON + DAY_MS;
  const r = await recordSkillAction({ action: 'recall_written', itemKey: 'w1' });
  expect(r.points).toBe(2);
});

it('два события подряд не затирают друг друга', async () => {
  await Promise.all([
    recordSkillAction({ action: 'blitz_correct', itemKey: 'w1' }),
    recordSkillAction({ action: 'blitz_correct', itemKey: 'w2' }),
    recordSkillAction({ action: 'blitz_fast', itemKey: 'w2', answerMs: 900 }),
  ]);
  expect(peekSkills()?.totals).toMatchObject({ vocab: 2, speed: 1 });
});

it('сообщает о новом уровне по факту этого события', async () => {
  await AsyncStorage.setItem('skills_v1:owner-a', JSON.stringify({ v: 1, totals: { grammar: 58 }, ledger: {} }));
  const r = await recordSkillAction({ action: 'exam_correct', itemKey: 'q1' });
  expect(r.levelUps).toEqual([{ skill: 'grammar', from: 0, to: 1 }]);
  const again = await recordSkillAction({ action: 'exam_correct', itemKey: 'q2' });
  expect(again.levelUps).toEqual([]);
});

it('сбой записи не теряет очки: видны сразу и дописываются при следующем событии', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  // зачем: не spyOn — восстановление шпиона на готовой подмене хранилища стирает её реализацию, и запись перестаёт работать
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  const first = await recordSkillAction({ action: 'theory_task', itemKey: 't1' });
  expect(first).toMatchObject({ points: 2, saved: false });
  expect(peekSkills()?.totals.grammar).toBe(2);
  expect(warn).toHaveBeenCalled();
  await refreshSkills();
  const raw = await AsyncStorage.getItem('skills_v1:owner-a');
  expect(JSON.parse(raw as string).totals.grammar).toBe(2);
});

it('другой владелец не видит чужие очки', async () => {
  await recordSkillAction({ action: 'theory_task', itemKey: 't1' });
  owner = 'owner-b';
  const state = await refreshSkills();
  expect(state.ownerKey).toBe('owner-b');
  expect(state.totals.grammar).toBe(0);
});

it('отклонённое действие ничего не пишет', async () => {
  const setItem = AsyncStorage.setItem as jest.Mock;
  setItem.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const r = await recordSkillAction({ action: 'flow_correct', itemKey: 'p1', answerMs: 5000 });
  expect(r).toMatchObject({ points: 0, skipped: 'too_slow' });
  expect(setItem).not.toHaveBeenCalled();
});

it('прирост за неделю считается с понедельника и обнуляется на новой неделе', async () => {
  await AsyncStorage.setItem('skills_v1:owner-a', JSON.stringify({ v: 1, totals: { vocab: 40 }, ledger: {}, week: { key: '2026-11-02', base: { vocab: 10 } } }));
  // 11.11.2026 — среда, неделя началась 09.11: запись прошлой недели прирост не даёт
  const first = await refreshSkills();
  expect(first.week.key).toBe('2026-11-09');
  expect(skillWeekGains(first).vocab).toBe(0);
  await recordSkillAction({ action: 'recall_written', itemKey: 'w1' });
  const mid = peekSkills();
  expect(mid ? skillWeekGains(mid).vocab : -1).toBe(2);
  now = NOON + 5 * DAY_MS; // понедельник 16.11
  const rolled = await refreshSkills();
  expect(rolled.week.key).toBe('2026-11-16');
  expect(skillWeekGains(rolled).vocab).toBe(0);
  expect(rolled.totals.vocab).toBe(42);
});

it('итог занятия: снимок «до» берётся перед первым начислением, отдаётся один раз и устаревает', async () => {
  expect(takeSkillSessionBase()).toBeNull();
  await recordSkillAction({ action: 'theory_task', itemKey: 't1' });
  await recordSkillAction({ action: 'theory_task', itemKey: 't2' });
  expect(takeSkillSessionBase()?.grammar).toBe(0);
  expect(takeSkillSessionBase()).toBeNull();
  await recordSkillAction({ action: 'theory_task', itemKey: 't3' });
  expect(takeSkillSessionBase()?.grammar).toBe(4);
  await recordSkillAction({ action: 'theory_task', itemKey: 't4' });
  now = NOON + 21 * 60 * 1000;
  expect(takeSkillSessionBase()).toBeNull();
});

it('мусор на диске не ломает чтение', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  expect(parseSkillsState('{oops', 'o', '2026-11-11', '2026-11-09').totals.vocab).toBe(0);
  const dirty = JSON.stringify({ totals: { vocab: -5, speed: 'x', grammar: 12 }, ledger: { day: '2026-11-10', itemHits: { a: 2 } } });
  const state = parseSkillsState(dirty, 'o', '2026-11-11', '2026-11-09');
  expect(state.totals).toMatchObject({ vocab: 0, speed: 0, grammar: 12 });
  expect(state.ledger).toEqual({ day: '2026-11-11', itemHits: {}, actionHits: {} });
});
