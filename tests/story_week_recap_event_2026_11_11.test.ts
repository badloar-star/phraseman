// story_week_recap_event_2026_11_11.test.ts — событие истории «Твоя неделя» с монетами Пика.
// зачем (владелец 11.11: «заводи события недели и диалога», о монетах — «Монеты Пика»): сторож держит неделю (понедельник–воскресенье
// по UTC, как у Пика), честность чисел (только из активности и итога Пика), отказ на пустой неделе и одну историю на неделю.
import fs from 'node:fs';
import path from 'node:path';
import { addStoryEvent, storyEventKey } from '../modules/story_events/story_events_core';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/account_generation', () => ({ isCurrentAccountGeneration: (token: { current?: boolean }) => token.current !== false }));
const mockRecordStoryEvent = jest.fn(async () => ({ recorded: true }));
jest.mock('../modules/story_events/story_events_store', () => ({ recordStoryEvent: (...args: unknown[]) => mockRecordStoryEvent(...(args as [])) }));

// eslint-disable-next-line import/first -- подмены выше обязаны стоять до импорта модуля
import {
  __resetWeekRecapStoryForTests, recordWeekRecapStory, weekRecapDayKeys, weekRecapPayload, weekRecapStartDayKey, type WeekRecapDay,
} from '../modules/story_events/week_recap_story';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
// среда 11.11.2026, 12:00 UTC: текущая неделя Пика началась в понедельник 09.11, прошлая — 02.11
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const day = (date: string, minutes: number, lessons = 0): WeekRecapDay => ({ date, minutes, metrics: { lessons } });
const WEEK: readonly WeekRecapDay[] = [
  day('2026-11-01', 999, 9), // воскресенье ДО недели — не считается
  day('2026-11-02', 42, 1), day('2026-11-03', 70, 1), day('2026-11-04', 55), day('2026-11-05', 90, 2),
  day('2026-11-06', 30), day('2026-11-07', 80, 1), day('2026-11-08', 100),
  day('2026-11-09', 777, 7), // понедельник ПОСЛЕ недели — не считается
];
const token = (over: Record<string, unknown> = {}) => ({ stableId: 'user-a', generation: 1, ...over }) as never;

beforeEach(() => { __resetWeekRecapStoryForTests(); mockRecordStoryEvent.mockClear(); });

describe('неделя истории — та же, что у Пика', () => {
  it('прошлая неделя: понедельник–воскресенье по UTC', () => {
    expect(weekRecapStartDayKey(NOW)).toBe('2026-11-02');
    // в сам понедельник новая неделя уже началась — прошлая та же
    expect(weekRecapStartDayKey(Date.UTC(2026, 10, 9, 0, 0, 1))).toBe('2026-11-02');
    expect(weekRecapDayKeys('2026-11-02')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
    expect(weekRecapDayKeys('мусор')).toEqual([]);
  });
});

describe('данные события', () => {
  it('минуты по дням, уроки и минуты — только за семь дней недели; монеты — из итога Пика', () => {
    expect(weekRecapPayload({ startDayKey: '2026-11-02', days: WEEK, coins: 1240, streak: 7 })).toEqual({
      startDayKey: '2026-11-02', dailyMinutes: '42,70,55,90,30,80,100', lessons: 5, coins: 1240, minutes: 467, streak: 7,
    });
  });

  it('день без записи — ноль, а не пропуск столбика', () => {
    const payload = weekRecapPayload({ startDayKey: '2026-11-02', days: [day('2026-11-04', 15, 1)], coins: 0, streak: 1 });
    expect(payload?.dailyMinutes).toBe('0,0,15,0,0,0,0');
    expect(payload).toMatchObject({ lessons: 1, minutes: 15, coins: 0 });
  });

  it('пустая неделя и битый ключ истории не дают', () => {
    expect(weekRecapPayload({ startDayKey: '2026-11-02', days: [], coins: 500, streak: 0 })).toBeNull();
    expect(weekRecapPayload({ startDayKey: 'мусор', days: WEEK, coins: 500, streak: 3 })).toBeNull();
  });

  it('мусор в числах не превращается в выдуманные значения', () => {
    const payload = weekRecapPayload({
      startDayKey: '2026-11-02', days: [day('2026-11-02', Number.NaN, 2), day('2026-11-03', -40), day('2026-11-04', 12.9)], coins: Number.NaN, streak: -5,
    });
    expect(payload).toEqual({ startDayKey: '2026-11-02', dailyMinutes: '0,0,12,0,0,0,0', lessons: 2, coins: 0, minutes: 12, streak: 0 });
  });
});

describe('запись события', () => {
  const load = async () => ({ days: WEEK, currentStreak: 7 });

  it('итог Пика пришёл → одна история на неделю, сколько бы раз он ни приходил', async () => {
    await recordWeekRecapStory({ weekCoins: 1240 }, token(), NOW, load);
    await recordWeekRecapStory({ weekCoins: 1240 }, token(), NOW, load);
    expect(mockRecordStoryEvent).toHaveBeenCalledTimes(1);
    expect(mockRecordStoryEvent).toHaveBeenCalledWith('week_recap', expect.objectContaining({ startDayKey: '2026-11-02', coins: 1240, lessons: 5 }), NOW, expect.anything());
  });

  it('пустая неделя и сменившийся аккаунт истории не дают', async () => {
    await recordWeekRecapStory({ weekCoins: 100 }, token(), NOW, async () => ({ days: [], currentStreak: 0 }));
    expect(mockRecordStoryEvent).not.toHaveBeenCalled();
    __resetWeekRecapStoryForTests();
    expect(await recordWeekRecapStory({ weekCoins: 100 }, token({ current: false }), NOW, load)).toEqual({ recorded: false, reason: 'account_changed' });
    expect(mockRecordStoryEvent).not.toHaveBeenCalled();
  });

  it('сбой чтения активности не бросает и разрешает следующую попытку', async () => {
    await expect(recordWeekRecapStory({ weekCoins: 1 }, token(), NOW, async () => { throw new Error('диск'); })).resolves.toBeUndefined();
    await recordWeekRecapStory({ weekCoins: 1 }, token(), NOW, load);
    expect(mockRecordStoryEvent).toHaveBeenCalledTimes(1);
  });
});

describe('журнал историй и место записи', () => {
  const payload = { startDayKey: '2026-11-02', dailyMinutes: '42,70,55,90,30,80,100', lessons: 5, coins: 1240, minutes: 467, streak: 7 };

  it('ключ — понедельник недели; повтор той же недели второй истории не даёт', () => {
    expect(storyEventKey('week_recap', payload)).toBe('week_recap:2026-11-02');
    expect(storyEventKey('week_recap', { ...payload, startDayKey: '' })).toBe('');
    const first = addStoryEvent([], { type: 'week_recap', payload, atMs: NOW }, NOW);
    expect(first.added).toBe(true);
    expect(addStoryEvent(first.list, { type: 'week_recap', payload: { ...payload, coins: 9 }, atMs: NOW + 1 }, NOW + 1)).toMatchObject({ added: false, reason: 'duplicate' });
  });

  it('новых мест вызова нет: история недели пишется там же, где итог недели Пика, и идёт фоном', () => {
    const sources = read('modules/story_events/story_event_sources.ts');
    const spire = sources.slice(sources.indexOf('export function recordSpireWeekStory('), sources.indexOf('export function markSpireWeekStoryShown('));
    expect(spire).toContain('void recordWeekRecapStory(result, accountToken);');
    expect(spire.indexOf('isCurrentAccountGeneration(accountToken)')).toBeLessThan(spire.indexOf('recordWeekRecapStory('));
    // «показано в своём окне» историю недели не создаёт — иначе их было бы две
    const shown = sources.slice(sources.indexOf('export function markSpireWeekStoryShown('), sources.indexOf('export function recordStreakMilestoneStory('));
    expect(shown).not.toContain('recordWeekRecapStory');
  });

  it('активность читается лениво и только с телефона — без чтений Firestore', () => {
    const own = read('modules/story_events/week_recap_story.ts');
    expect(own).toContain("(await import('../../app/activity_365_analytics')).loadActivity365Analytics()");
    expect(own).not.toMatch(/firestore|getDoc|getDocs|onSnapshot/u);
  });
});
