// зачем (владелец 22.10, вариант 2 scenes-compact.html — карточка «Неделя · N из 6 дней»; координатор: вариант А — итог дня на телефоне,
// 7 последних дней в отдельном ключе, без сети): сторож истории недели «Сегодня». Чистые правила (итог дня как у колец, склейка
// и обрезка до 7, разбор битой записи, окно шести дней через границу месяца, «N из 6 дней» на 9 языках), настоящий store на
// AsyncStorage-моке (при смене дня вчерашний итог уходит в ключ владельца) и проводка сцены (карточка вместо «Истории», цвета RC).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { createHash } from 'node:crypto';

import type { Lang } from '../constants/i18n';
import { todayLocalDayKey, type TodayTaskState, type TodayTasksDayState } from '../modules/today-tasks/today_tasks_core';
import {
  __todayTasksStoreTestHooks as hooks,
  peekTodayTasksOwnerKey,
  recordTodayTaskActivity,
  refreshTodayTasks,
} from '../modules/today-tasks/today_tasks_store';
import {
  TODAY_WEEK_DAYS_KEPT,
  TODAY_WEEK_KEY_PREFIX,
  mergeTodayWeek,
  parseTodayWeek,
  readTodayWeek,
  todayWeekActiveDays,
  todayWeekDayOf,
  todayWeekShiftDayKey,
  todayWeekWindow,
  type TodayWeekDay,
} from '../modules/today-tasks/today_tasks_week';
import { todayWeekActiveLabel, todayWeekTitle } from '../components/home/v2/today_activity_history_copy';
import { TODAY_WEEK_PREVIEW_DAYS } from '../components/home/v2/today_scene/today_scene_preview_fixtures';
import { useTodayWeek } from '../components/home/v2/today_scene/use_today_week';
import { readSource } from './helpers/read_source';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const task = (kind: TodayTaskState['kind'], units: number, done = false): TodayTaskState => ({
  kind, units, unitKeys: [], done, doneAtMs: done ? 1 : null, rewardCoins: 50, rewardStatus: 'none',
});
const dayState = (dayKey: string, tasks: TodayTaskState[]): TodayTasksDayState => ({ schemaVersion: 1, ownerKey: 'o', dayKey, tasks });
const wd = (dayKey: string, progress: [number, number, number]): TodayWeekDay => ({ dayKey, progress, targets: [1, 1, 10] });

describe('итог дня — те же числа, что у колец', () => {
  it('урок 1/1, диалог 0/1, карточки 6/10; видео — минуты из 10', () => {
    expect(todayWeekDayOf(dayState('2026-10-20', [task('lesson', 1, true), task('dialog', 0), task('cards', 6)]))).toEqual({ dayKey: '2026-10-20', progress: [1, 0, 6], targets: [1, 1, 10] });
    expect(todayWeekDayOf(dayState('2026-10-20', [task('video', 300), task('cards', 12), task('spire_steps', 2)]))).toEqual({ dayKey: '2026-10-20', progress: [5, 10, 2], targets: [10, 10, 3] });
  });
  it('нет заданий или ключ дня не похож на день — итога нет', () => {
    expect(todayWeekDayOf(dayState('2026-10-20', []))).toBeNull();
    expect(todayWeekDayOf(dayState('вчера', [task('lesson', 1, true)]))).toBeNull();
  });
});

describe('склейка, разбор и окно недели', () => {
  it('тот же день заменяется, дни по порядку, хранится не больше 7', () => {
    let days: readonly TodayWeekDay[] = [];
    for (let d = 10; d <= 20; d += 1) days = mergeTodayWeek(days, wd(`2026-10-${d}`, [1, 0, 0]));
    days = mergeTodayWeek(days, wd('2026-10-15', [1, 1, 10]));
    expect(days).toHaveLength(TODAY_WEEK_DAYS_KEPT);
    expect(days.map((d) => d.dayKey)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']);
    expect(days[1]?.progress).toEqual([1, 1, 10]);
  });
  it('битая или чужая запись — пустая неделя, лишнее отбрасывается', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseTodayWeek(null)).toEqual([]);
    expect(parseTodayWeek('{не json')).toEqual([]);
    expect(parseTodayWeek(JSON.stringify({ days: [{ dayKey: 'x' }, wd('2026-10-20', [1, 0, 0]), { dayKey: '2026-10-19', progress: 'a', targets: [] }] }))).toEqual([wd('2026-10-20', [1, 0, 0])]);
  });
  it('шесть дней до сегодняшнего, через границу месяца и года', () => {
    expect(todayWeekShiftDayKey('2026-11-02', 3)).toBe('2026-10-30');
    expect(todayWeekShiftDayKey('2026-01-01', 1)).toBe('2025-12-31');
    const cells = todayWeekWindow([wd('2026-10-31', [1, 0, 0])], '2026-11-03');
    expect(cells.map((c) => c.dayKey)).toEqual(['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(cells.filter((c) => c.day !== null)).toHaveLength(1);
  });
  it('данные эталона: 15–20 окт., 19-го без занятий — «5 из 6 дней»', () => {
    const cells = todayWeekWindow(TODAY_WEEK_PREVIEW_DAYS, '2026-10-21');
    expect(cells.map((c) => c.dayKey)).toEqual(['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']);
    expect(todayWeekActiveDays(cells)).toBe(5);
    expect(todayWeekActiveLabel('ru', 5)).toBe('5 из 6 дней');
  });
});

describe('«Неделя» и «N из 6 дней» на 9 языках', () => {
  it.each(LANGS)('%s: заголовок и счётчик не пустые, число на месте', (lang) => {
    expect(todayWeekTitle(lang).trim().length).toBeGreaterThan(0);
    expect(todayWeekActiveLabel(lang, 3)).toMatch(/3\D+6|3\/6/);
  });
  it('родительный после «из»: ru/uk/pl', () => {
    expect(todayWeekActiveLabel('uk', 5)).toBe('5 з 6 днів');
    expect(todayWeekActiveLabel('pl', 5)).toBe('5 z 6 dni');
    expect(todayWeekActiveLabel('ru', 1, 1)).toBe('1 из 1 дня');
    expect(todayWeekActiveLabel('en', 5)).toBe('5 of 6 days');
  });
});

describe('настоящее хранилище заданий: смена дня пишет вчерашний итог в неделю владельца', () => {
  const OWNER = 'owner-week-1';
  const DAY1 = new Date(2026, 9, 1, 12, 0, 0).getTime();
  const DAY2 = new Date(2026, 9, 2, 12, 0, 0).getTime();
  let nowMs = DAY1;
  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    hooks.reset();
    await AsyncStorage.clear();
    nowMs = DAY1;
    hooks.setDeps({
      now: () => nowMs,
      ownerStableId: async () => OWNER,
      grant: async () => undefined,
      sha256Hex: async (input) => createHash('sha256').update(input, 'utf8').digest('hex'),
    });
  });
  afterEach(() => { hooks.reset(); });

  it('урок 1/1 вчера → в ключе недели вчерашний день; сегодня в неделю не попадает', async () => {
    await refreshTodayTasks(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'lesson-1', source: 'test' });
    expect(peekTodayTasksOwnerKey()).toBe(OWNER);
    nowMs = DAY2;
    await refreshTodayTasks(['lesson', 'dialog', 'cards']);
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
    const days = parseTodayWeek(await AsyncStorage.getItem(`${TODAY_WEEK_KEY_PREFIX}${OWNER}`));
    expect(days.map((d) => d.dayKey)).toEqual([todayLocalDayKey(DAY1)]);
    expect(days[0]?.progress.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await readTodayWeek(OWNER)).toEqual(days);
  });

  it('хук недели: карточка смонтирована раньше, чем загрузился день, — дождалась владельца и прочитала неделю', async () => {
    nowMs = DAY2;
    await AsyncStorage.setItem(`${TODAY_WEEK_KEY_PREFIX}${OWNER}`, JSON.stringify({ schemaVersion: 1, days: [wd(todayLocalDayKey(DAY1), [1, 0, 0])] }));
    const { result } = await renderHook(() => useTodayWeek(todayLocalDayKey(DAY2)));
    expect(result.current.ready).toBe(false);
    await act(async () => { await refreshTodayTasks(['lesson', 'dialog', 'cards']); });
    for (let i = 0; i < 5; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.ready).toBe(true);
    expect(result.current.active).toBe(1);
    expect(result.current.cells[5]?.dayKey).toBe(todayLocalDayKey(DAY1));
  });
});

describe('проводка сцены «Сегодня»', () => {
  it('под «Заданиями дня» — «Неделя» с кольцами в оттенках темы; «История» осталась только у прежнего экрана', () => {
    const scene = readSource('components/home/v2/today_scene/TodayScene.tsx');
    expect(scene).toContain('history={<TodayWeekCard dayKey={dayKey} />}');
    expect(scene).not.toContain('TodayActivityHistory');
    const card = readSource('components/home/v2/today_scene/TodayWeekCard.tsx');
    expect(card).toContain('{colors.map((color, i) => {');
    expect(card).toContain('todayRingsOnCard(homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance).todayRing, p)');
    expect(card).toContain('const MINI = Object.freeze({ size: 34, r0: 15, step: 5, stroke: 3.5, track: 0.2 });');
    expect(card).toContain('{x > 0 ? <Circle');
    expect(card).toContain('{week.ready ? <Text testID="today-week-count"');
    expect(readSource('app/today_tasks.tsx')).toContain('<TodayActivityHistory dayKey={todayTasks.dayKey} tasks={tasks} />');
  });
  it('хранилище пишет итог прошедшего дня, не задерживая новый день; память недели сбрасывается со сменой аккаунта', () => {
    const store = readSource('modules/today-tasks/today_tasks_store.ts');
    expect(store).toContain('if (previous) void recordTodayWeekDay(ownerKey, previous);');
    const week = readSource('modules/today-tasks/today_tasks_week.ts');
    expect(week).toContain("onAccountOwnerChanged('today_tasks_week', () => {");
    expect(week).toContain("export const TODAY_WEEK_KEY_PREFIX = 'today_tasks_week_v1:';");
    expect(week).not.toMatch(/from '[^']*(firebase|firestore)/i); // только устройство: ни одного импорта базы
  });
});
