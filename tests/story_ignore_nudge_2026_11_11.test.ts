// Слово владельца 11.11.2026: «а если юзер игнорирует истории и не просматривает их 2 дня (заходя при этом 2 дня в приложение)…» → выбрал «Волны».
// Правило считает ДНИ ЗАХОДА, а не часы: два дня без запуска приложения — не игнор. Хранятся факты, показ вычисляется.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

let mockDisk: Record<string, string> = {};
let mockFailWrites = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => (key in mockDisk ? mockDisk[key] : null),
    setItem: async (key: string, value: string) => { if (mockFailWrites) throw new Error('disk unavailable'); mockDisk[key] = value; },
    removeItem: async (key: string) => { delete mockDisk[key]; },
  },
}));
const mockWarn = jest.fn();
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: (...args: unknown[]) => mockWarn(...args) } }));

import {
  STORY_IGNORE_EMPTY,
  STORY_IGNORE_NUDGE_DAYS,
  recordStoryViewed,
  recordStoryVisit,
  shouldShowStoryIgnoreNudge,
  storyIgnoreDayKey,
  storyIgnoreFactsFromJson,
  storyIgnoredStreak,
  type StoryIgnoreFacts,
} from '../modules/story_events/story_ignore_nudge';
import {
  noteStoryViewed,
  noteStoryVisit,
  peekStoryIgnoreFacts,
  resetStoryIgnoreMemoryForTests,
  storyIgnoreKey,
} from '../modules/story_events/story_ignore_nudge_store';

const visit = (facts: StoryIgnoreFacts, today: string, hasUnseen = true): StoryIgnoreFacts => recordStoryVisit(facts, { today, hasUnseen });
const nudge = (facts: StoryIgnoreFacts, today: string, hasUnseen = true): boolean => shouldShowStoryIgnoreNudge(facts, { today, hasUnseen });
const at = (day: number, hour = 12): number => new Date(2026, 10, day, hour, 0).getTime();

describe('правило: волны, если истории игнорируют два дня захода', () => {
  it('порог — два дня', () => {
    expect(STORY_IGNORE_NUDGE_DAYS).toBe(2);
  });

  it('два дня заходил и не открыл историю → на следующем заходе сигнал есть', () => {
    let facts = visit(STORY_IGNORE_EMPTY, '2026-11-11');
    expect(nudge(facts, '2026-11-11')).toBe(false);
    facts = visit(facts, '2026-11-12');
    expect(nudge(facts, '2026-11-12')).toBe(false); // второй день ещё идёт — человек может открыть историю сегодня
    facts = visit(facts, '2026-11-13');
    expect(storyIgnoredStreak(facts, '2026-11-13')).toBe(2);
    expect(nudge(facts, '2026-11-13')).toBe(true);
  });

  it('просмотрел историю → сигнала нет, счёт начинается заново', () => {
    let facts = visit(visit(visit(STORY_IGNORE_EMPTY, '2026-11-11'), '2026-11-12'), '2026-11-13');
    facts = recordStoryViewed(facts, '2026-11-13');
    expect(nudge(facts, '2026-11-13')).toBe(false);
    facts = visit(facts, '2026-11-14');
    expect(nudge(facts, '2026-11-14')).toBe(false);
    facts = visit(visit(facts, '2026-11-15'), '2026-11-16');
    expect(nudge(facts, '2026-11-16')).toBe(true); // 14-е и 15-е снова проигнорированы
  });

  it('непросмотренных историй не осталось → сигнала нет сразу, даже при накопленных днях', () => {
    const facts = visit(visit(visit(STORY_IGNORE_EMPTY, '2026-11-11'), '2026-11-12'), '2026-11-13');
    expect(nudge(facts, '2026-11-13', false)).toBe(false);
  });

  it('два дня БЕЗ захода — не игнор: считаются только дни, когда приложение открывали', () => {
    const back = visit(visit(STORY_IGNORE_EMPTY, '2026-11-11'), '2026-11-14');
    expect(storyIgnoredStreak(back, '2026-11-14')).toBe(1);
    expect(nudge(back, '2026-11-14')).toBe(false);
  });

  it('день захода без кольца прерывает счёт; давние дни (старше недели) не считаются', () => {
    let facts = visit(visit(STORY_IGNORE_EMPTY, '2026-11-01'), '2026-11-02');
    facts = visit(facts, '2026-11-03', false); // заходил, историй не было
    facts = visit(facts, '2026-11-04');
    expect(nudge(visit(facts, '2026-11-05'), '2026-11-05')).toBe(false); // подряд только 4-е
    const old = visit(visit(visit(STORY_IGNORE_EMPTY, '2026-11-01'), '2026-11-02'), '2026-11-20');
    expect(nudge(old, '2026-11-20')).toBe(false); // новая история через три недели не наследует старый игнор
  });

  it('пометка «кольцо было» липкая в пределах дня: поздний пустой снимок историй её не стирает', () => {
    let facts = visit(STORY_IGNORE_EMPTY, '2026-11-11', false); // истории ещё не догрузились
    facts = visit(facts, '2026-11-11', true);
    facts = visit(facts, '2026-11-11', false);
    expect(facts.days).toEqual([{ day: '2026-11-11', ring: true }]);
    for (let i = 0; i < 5; i += 1) facts = visit(facts, '2026-11-11');
    expect(facts.days).toHaveLength(1);
  });

  it('факты не растут без конца, исходный объект не меняется, мусор не ломает правило', () => {
    let facts = STORY_IGNORE_EMPTY;
    for (let day = 1; day <= 20; day += 1) facts = visit(facts, `2026-12-${String(day).padStart(2, '0')}`);
    expect(facts.days.length).toBeLessThanOrEqual(8);
    expect(facts.days[facts.days.length - 1].day).toBe('2026-12-20');
    expect(STORY_IGNORE_EMPTY).toEqual({ days: [], lastViewedDay: null });
    expect(visit(STORY_IGNORE_EMPTY, 'вчера')).toBe(STORY_IGNORE_EMPTY);
    expect(recordStoryViewed(STORY_IGNORE_EMPTY, '')).toBe(STORY_IGNORE_EMPTY);
    expect(storyIgnoreFactsFromJson({ v: 2, days: [] })).toBe(STORY_IGNORE_EMPTY);
    expect(storyIgnoreFactsFromJson('x')).toBe(STORY_IGNORE_EMPTY);
    expect(storyIgnoreFactsFromJson({ v: 1, days: [{ day: 'x', ring: true }, { day: '2026-11-11', ring: 1 }, { day: '2026-11-12', ring: true }], lastViewedDay: 7 }))
      .toEqual({ days: [{ day: '2026-11-12', ring: true }], lastViewedDay: null });
  });

  it('часы перевели назад: «будущие» дни не считаются; день берётся по местному календарю', () => {
    const facts = visit(visit(STORY_IGNORE_EMPTY, '2026-11-20'), '2026-11-21');
    expect(nudge(facts, '2026-11-12')).toBe(false);
    expect(storyIgnoreDayKey(new Date(2026, 10, 11, 0, 5).getTime())).toBe('2026-11-11');
    expect(storyIgnoreDayKey(new Date(2026, 10, 11, 23, 55).getTime())).toBe('2026-11-11');
  });
});

describe('хранение: факты лежат на устройстве по аккаунту и переживают перезапуск', () => {
  const today = (day: number): string => storyIgnoreDayKey(at(day));
  const show = (owner: string, day: number): boolean => {
    const facts = peekStoryIgnoreFacts(owner);
    return facts !== null && shouldShowStoryIgnoreNudge(facts, { today: today(day), hasUnseen: true });
  };

  beforeEach(() => {
    mockDisk = {};
    mockFailWrites = false;
    mockWarn.mockClear();
    resetStoryIgnoreMemoryForTests();
  });

  it('до чтения диска фактов нет; три дня захода с перезапусками → сигнал на третий день', async () => {
    expect(peekStoryIgnoreFacts('u1')).toBeNull();
    await noteStoryVisit('u1', true, at(11));
    resetStoryIgnoreMemoryForTests(); // перезапуск приложения
    await noteStoryVisit('u1', true, at(12));
    expect(show('u1', 12)).toBe(false);
    resetStoryIgnoreMemoryForTests();
    await noteStoryVisit('u1', true, at(13));
    expect(show('u1', 13)).toBe(true);
    expect(Object.keys(mockDisk)).toEqual([storyIgnoreKey('u1')]);
    expect(storyIgnoreKey('u1').startsWith('story_events_v1:')).toBe(true); // стираемое семейство: уходит при выходе и удалении аккаунта
  });

  it('просмотр гасит сигнал сразу и сохраняется на диск; у другого аккаунта свой счёт', async () => {
    await noteStoryVisit('u1', true, at(11));
    await noteStoryVisit('u1', true, at(12));
    await noteStoryVisit('u1', true, at(13));
    expect(show('u1', 13)).toBe(true);
    const pending = noteStoryViewed('u1', at(13));
    expect(show('u1', 13)).toBe(false); // в тот же момент, до записи на диск
    await pending;
    resetStoryIgnoreMemoryForTests();
    await noteStoryVisit('u1', true, at(13));
    expect(show('u1', 13)).toBe(false);
    await noteStoryVisit('u2', true, at(13));
    expect(show('u2', 13)).toBe(false);
    expect(peekStoryIgnoreFacts('u2')?.days).toEqual([{ day: today(13), ring: true }]);
  });

  it('без аккаунта ничего не пишется; битая запись и сбой диска не роняют и оставляют причину в логе', async () => {
    await noteStoryVisit(null, true, at(11));
    await noteStoryViewed(null, at(11));
    expect(mockDisk).toEqual({});
    mockDisk[storyIgnoreKey('u1')] = '{не json';
    await noteStoryVisit('u1', true, at(11));
    expect(peekStoryIgnoreFacts('u1')?.days).toEqual([{ day: today(11), ring: true }]);
    expect(mockWarn).toHaveBeenCalled();
    mockWarn.mockClear();
    mockFailWrites = true;
    await expect(noteStoryVisit('u1', true, at(12))).resolves.toBeUndefined();
    expect(peekStoryIgnoreFacts('u1')?.days).toHaveLength(2);
    expect(mockWarn).toHaveBeenCalled();
  });
});
