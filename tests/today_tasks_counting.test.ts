/**
 * «Сегодня» (D49, PM-259): засчитывание каждого типа задания, одна выплата
 * монет на задачу в день, новый набор после локальной полуночи.
 * Проверяется настоящий store (AsyncStorage-мок), настоящие точки входа
 * (карта практики, итог диалога V2, шина плеера) и совместимость ключа выплаты
 * с серверным белым списком functions/src/coin_wallet_policy.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  TODAY_TASK_POOL,
  createTodayTasksDay,
  selectTodayTaskKinds,
  todayLocalDayKey,
  type TodayTaskKindCore,
} from '../modules/today-tasks/today_tasks_core';
import {
  __todayTasksStoreTestHooks as hooks,
  peekTodayTasks,
  recordTodayTaskActivity,
  refreshTodayTasks,
  type TodayTaskGrantRequest,
} from '../modules/today-tasks/today_tasks_store';
import { todayTaskKindForPracticeActivity } from '../modules/today-tasks/today_tasks_practice_map';
import { __resetTodayVideoTicks } from '../modules/today-tasks/today_tasks_video_ticks';
import { todayTaskViewCounter } from '../modules/today-tasks/today_tasks_view';
import { rememberDialogueV2SessionOutcome } from '../app/dialogue_v2_session_outcome_store';
import { publishYoutubePosition } from '../app/youtube_player_seek_bus';
import {
  assertCoinWalletOperationShape,
  classifyCoinWalletSource,
} from '../functions/src/coin_wallet_policy';

const OWNER = 'owner-stable-1';
// 2026-10-01 12:00 по локальным часам машины теста.
const DAY1_NOON = new Date(2026, 9, 1, 12, 0, 0).getTime();
const DAY2_NOON = new Date(2026, 9, 2, 12, 0, 0).getTime();

let nowMs = DAY1_NOON;
let grants: TodayTaskGrantRequest[] = [];
let failGrant = false;

function setup(owner: string | null = OWNER): void {
  hooks.setDeps({
    now: () => nowMs,
    ownerStableId: async () => owner,
    grant: async (request) => {
      if (failGrant) throw new Error('wallet_offline');
      grants.push(request);
    },
    sha256Hex: async (input) => {
      const { createHash } = await import('node:crypto');
      return createHash('sha256').update(input, 'utf8').digest('hex');
    },
  });
}

async function flush(): Promise<void> {
  // Цепочка store сериализована — даём ей отработать до конца.
  await refreshTodayTasks(currentKinds);
}

let currentKinds: readonly TodayTaskKindCore[] = TODAY_TASK_POOL;

async function startDayWith(kinds: readonly TodayTaskKindCore[]): Promise<void> {
  currentKinds = kinds;
  await refreshTodayTasks(kinds);
}

function task(kind: TodayTaskKindCore) {
  const found = peekTodayTasks()?.tasks.find((t) => t.kind === kind);
  if (!found) throw new Error(`task ${kind} not in today set`);
  return found;
}

beforeEach(async () => {
  hooks.reset();
  __resetTodayVideoTicks();
  await AsyncStorage.clear();
  nowMs = DAY1_NOON;
  grants = [];
  failGrant = false;
  currentKinds = TODAY_TASK_POOL;
  setup();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('набор дня', () => {
  it('3 задачи, только из доступных типов, детерминированно', () => {
    const a = selectTodayTaskKinds(OWNER, '2026-10-01', TODAY_TASK_POOL);
    const b = selectTodayTaskKinds(OWNER, '2026-10-01', TODAY_TASK_POOL);
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
    const onlyTwo = selectTodayTaskKinds(OWNER, '2026-10-01', ['dialog', 'cards']);
    expect(onlyTwo).toEqual(['dialog', 'cards']);
    expect(selectTodayTaskKinds(OWNER, '2026-10-01', ['dialog', 'cards', 'video', 'spire_steps']))
      .not.toContain('lesson');
  });

  it('набор меняется от дня к дню (на неделе встречаются разные наборы)', () => {
    const sets = new Set<string>();
    for (let d = 1; d <= 7; d += 1) {
      sets.add(selectTodayTaskKinds(OWNER, `2026-10-0${d}`, TODAY_TASK_POOL).join(','));
    }
    expect(sets.size).toBeGreaterThan(1);
  });

  it('локальная полночь → новый набор с нулевым прогрессом и новым ключом выплаты', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'l1', source: 'test' });
    expect(task('lesson').done).toBe(true);
    expect(grants).toHaveLength(1);
    nowMs = DAY2_NOON;
    await flush();
    const day2 = peekTodayTasks()!;
    expect(day2.dayKey).toBe(todayLocalDayKey(DAY2_NOON));
    expect(day2.tasks.every((t) => !t.done && t.units === 0)).toBe(true);
    if (day2.tasks.some((t) => t.kind === 'lesson')) {
      await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'l1', source: 'test' });
      expect(grants).toHaveLength(2);
      expect(grants[1]!.requestId).not.toBe(grants[0]!.requestId);
    }
  });
});

describe('засчитывание по типам', () => {
  it('урок: 0→1, done, монеты один раз', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'legacy:en:3', source: 'lesson_complete' });
    expect(task('lesson')).toMatchObject({ done: true, units: 1, rewardStatus: 'granted' });
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'legacy:en:4', source: 'lesson_complete' });
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'v2:en:s1', source: 'learning_v2_direct_session' });
    expect(grants.filter((g) => g.kind === 'lesson')).toHaveLength(1);
  });

  it('диалог: итог диалога V2 с репликами засчитывает, без реплик — нет', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    rememberDialogueV2SessionOutcome('session-empty', { learnerTurns: 0, corrections: [] });
    await flush();
    expect(task('dialog').done).toBe(false);
    rememberDialogueV2SessionOutcome('session-1', { learnerTurns: 3, corrections: [] });
    await flush();
    expect(task('dialog').done).toBe(true);
    rememberDialogueV2SessionOutcome('session-1', { learnerTurns: 3, corrections: [] });
    rememberDialogueV2SessionOutcome('session-2', { learnerTurns: 2, corrections: [] });
    await flush();
    expect(grants.filter((g) => g.kind === 'dialog')).toHaveLength(1);
  });

  it('карточки: 10 разных слов из тренировок; повтор того же слова не считается', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    expect(todayTaskKindForPracticeActivity('flashcards_blitz')).toBe('cards');
    expect(todayTaskKindForPracticeActivity('flashcards_training')).toBe('cards');
    expect(todayTaskKindForPracticeActivity('speaking_practice')).toBe('cards');
    expect(todayTaskKindForPracticeActivity('lesson')).toBeNull();
    for (let i = 0; i < 9; i += 1) {
      await recordTodayTaskActivity({ kind: 'cards', unitKey: `cards:w${i}`, source: 'practice_runes:flashcards_blitz' });
    }
    await recordTodayTaskActivity({ kind: 'cards', unitKey: 'cards:w0', source: 'practice_runes:flashcards_blitz' });
    expect(task('cards')).toMatchObject({ done: false, units: 9 });
    await recordTodayTaskActivity({ kind: 'cards', unitKey: 'cards:w9', source: 'practice_runes:flashcards_training' });
    expect(task('cards')).toMatchObject({ done: true, units: 10 });
    await recordTodayTaskActivity({ kind: 'cards', unitKey: 'cards:w10', source: 'practice_runes:flashcards_training' });
    expect(grants.filter((g) => g.kind === 'cards')).toHaveLength(1);
  });

  it('ошибки: 5 исправленных из «Моих ошибок»', async () => {
    await startDayWith(['mistakes', 'dialog', 'cards']);
    expect(todayTaskKindForPracticeActivity('mistake_practice')).toBe('mistakes');
    for (let i = 0; i < 5; i += 1) {
      await recordTodayTaskActivity({ kind: 'mistakes', unitKey: `mistakes:m${i}`, source: 'practice_runes:mistake_practice' });
    }
    expect(task('mistakes')).toMatchObject({ done: true, units: 5, rewardStatus: 'granted' });
    expect(grants.filter((g) => g.kind === 'mistakes')).toHaveLength(1);
  });

  it('Шпиль: 3 пройденные ступени, повтор того же отчёта не считается', async () => {
    await startDayWith(['spire_steps', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'spire_steps', unitKey: 'spire:r1', source: 'spire_step_passed' });
    await recordTodayTaskActivity({ kind: 'spire_steps', unitKey: 'spire:r1', source: 'spire_step_passed' });
    await recordTodayTaskActivity({ kind: 'spire_steps', unitKey: 'spire:r2', source: 'spire_step_passed' });
    expect(task('spire_steps')).toMatchObject({ done: false, units: 2 });
    await recordTodayTaskActivity({ kind: 'spire_steps', unitKey: 'spire:r3', source: 'spire_step_passed' });
    expect(task('spire_steps').done).toBe(true);
    expect(grants.filter((g) => g.kind === 'spire_steps')).toHaveLength(1);
  });

  // зачем (Q21, координатор 01.10): видео-задание платит как остальные — награда за задание дня.
  it('видео: 10 минут (600 с) воспроизведения через шину плеера; 50 монет за задание дня (Q21, владелец 17.10)', async () => {
    await startDayWith(['video', 'dialog', 'cards']);
    for (let s = 0; s < 599; s += 1) {
      nowMs = DAY1_NOON + s * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(nowMs);
      publishYoutubePosition('vid1', s);
    }
    await flush();
    expect(task('video').done).toBe(false);
    nowMs = DAY1_NOON + 599 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    publishYoutubePosition('vid1', 599);
    await flush();
    expect(task('video')).toMatchObject({ done: true, rewardCoins: 50 });
    expect(grants.filter((g) => g.kind === 'video')).toHaveLength(1);
  });

  // зачем (координатор 17.10): 7 минут и перезапуск не должны обнулять счёт — отметка в store раз в 60 с.
  it('видео: отметка каждую минуту, после перезапуска минуты продолжаются, показ — минуты из 10', async () => {
    await startDayWith(['video', 'dialog', 'cards']);
    const watch = async (fromSec: number, count: number) => {
      for (let s = fromSec; s < fromSec + count; s += 1) {
        nowMs = DAY1_NOON + s * 1000;
        jest.spyOn(Date, 'now').mockReturnValue(nowMs);
        publishYoutubePosition('vid1', s);
      }
      await flush();
    };
    await watch(0, 7 * 60 + 30);
    expect(task('video')).toMatchObject({ done: false, units: 420 });
    expect(todayTaskViewCounter(task('video'))).toEqual({ progress: 7, target: 10 });
    __resetTodayVideoTicks('run2'); // перезапуск: память процесса пуста, 30 с неотмеченного хвоста теряются
    await watch(1000, 3 * 60);
    expect(task('video')).toMatchObject({ done: true, rewardCoins: 50 });
    expect(todayTaskViewCounter(task('video'))).toEqual({ progress: 10, target: 10 });
    expect(grants.filter((g) => g.kind === 'video')).toHaveLength(1);
  });

  // зачем (аудит Optimistic UI 17.10, п.1): счётчик меняется сразу, до записи на диск; событие не засчитывается дважды
  it('Optimistic UI: прогресс виден синхронно, очередь не применяет событие второй раз', async () => {
    await startDayWith(['cards', 'dialog', 'lesson']);
    const pending = recordTodayTaskActivity({ kind: 'cards', unitKey: 'card:a', source: 'test' });
    expect(task('cards').units).toBe(1); // до await — уже показано
    await pending;
    await flush();
    expect(task('cards').units).toBe(1);
    void recordTodayTaskActivity({ kind: 'cards', source: 'test' }); // без ключа — тоже ровно одна единица
    await flush();
    expect(task('cards').units).toBe(2);
  });

  // зачем (аудит Optimistic UI 17.10, п.2): сбой выдачи монет повторяется сам через 30 с, а не только при следующем событии
  // зачем (Ревизор 3.11, 🔴): выдача монет ждёт сеть; событие, пришедшее за это время, не должно затираться отметкой «выдано» со старого снимка
  it('гонка: выплата ждёт сеть → пришло событие → событие не потеряно, выплата одна', async () => {
    await startDayWith(['lesson', 'cards', 'dialog']);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    hooks.setDeps({
      now: () => nowMs,
      ownerStableId: async () => OWNER,
      grant: async (request) => { await gate; grants.push(request); },
      sha256Hex: async (input) => {
        const { createHash } = await import('node:crypto');
        return createHash('sha256').update(input, 'utf8').digest('hex');
      },
    });
    const lessonDone = recordTodayTaskActivity({ kind: 'lesson', unitKey: 'lesson:1', source: 'test' });
    await new Promise((resolve) => setTimeout(resolve, 30)); // очередь дошла до выдачи и ждёт сеть
    void recordTodayTaskActivity({ kind: 'cards', unitKey: 'card:x', source: 'test' });
    expect(task('cards').units).toBe(1);
    release();
    await lessonDone;
    await flush();
    expect(task('cards').units).toBe(1);
    expect(task('lesson')).toMatchObject({ done: true, rewardStatus: 'granted' });
    expect(grants.filter((g) => g.kind === 'lesson')).toHaveLength(1);
  });

  it('сбой выдачи монет — один отложенный повтор, выплата одна', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      await startDayWith(['lesson', 'dialog', 'cards']);
      failGrant = true;
      await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'lesson:1', source: 'test' });
      expect(task('lesson')).toMatchObject({ done: true, rewardStatus: 'pending' });
      failGrant = false;
      jest.advanceTimersByTime(30_000);
      jest.useRealTimers();
      await flush();
      expect(task('lesson').rewardStatus).toBe('granted');
      expect(grants.filter((g) => g.kind === 'lesson')).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('тип не из набора дня не меняет состояние', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    const before = peekTodayTasks();
    await recordTodayTaskActivity({ kind: 'spire_steps', unitKey: 'x', source: 'test' });
    expect(peekTodayTasks()).toBe(before);
  });
});

describe('защита от фарма и сбоев', () => {
  it('перезапуск приложения: состояние с диска, второй выплаты нет', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    hooks.simulateRestart();
    setup();
    await refreshTodayTasks(['lesson', 'dialog', 'cards']);
    expect(task('lesson')).toMatchObject({ done: true, rewardStatus: 'granted' });
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'b', source: 'test' });
    expect(grants).toHaveLength(1);
  });

  it('кошелёк упал → выплата pending, повтор тем же ключом ровно один раз', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    failGrant = true;
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    expect(task('lesson')).toMatchObject({ done: true, rewardStatus: 'pending' });
    expect(grants).toHaveLength(0);
    failGrant = false;
    await refreshTodayTasks(['lesson', 'dialog', 'cards']);
    await refreshTodayTasks(['lesson', 'dialog', 'cards']);
    expect(task('lesson').rewardStatus).toBe('granted');
    expect(grants).toHaveLength(1);
  });

  it('двойной тап (два события параллельно) — одна выплата', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    await Promise.all([
      recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'tap1' }),
      recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'tap2' }),
      recordTodayTaskActivity({ kind: 'lesson', unitKey: 'b', source: 'tap3' }),
    ]);
    expect(grants).toHaveLength(1);
  });

  it('ключ выплаты детерминирован: тот же день/тип у переустановки = тот же requestId', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    const first = grants[0]!.requestId;
    await AsyncStorage.clear();
    hooks.simulateRestart();
    setup();
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    // Локальное состояние потеряно, но ключ тот же — кошелёк/сервер схлопнут повтор.
    expect(grants[1]!.requestId).toBe(first);
  });

  it('без аккаунта задание считается, выплата ждёт (pending)', async () => {
    hooks.reset();
    setup(null);
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    expect(task('lesson')).toMatchObject({ done: true, rewardStatus: 'pending' });
    expect(grants).toHaveLength(0);
  });

  it('ключ выплаты проходит серверный белый список dailyjourney_', async () => {
    await startDayWith(['lesson', 'dialog', 'cards']);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    const grant = grants[0]!;
    expect(grant.requestId).toMatch(/^dailyjourney_[A-Za-z0-9]{32}_\d{1,3}$/);
    const classification = classifyCoinWalletSource(grant.requestId);
    expect(classification.source).toBe('daily_journey');
    expect(() => assertCoinWalletOperationShape({
      requestId: grant.requestId,
      lane: 'base',
      giftId: grant.giftId,
      amount: Number(grant.giftId.replace('stars_', '')),
      promotionEligibility: 'gameplay',
    }, classification)).not.toThrow();
  });

  it('createTodayTasksDay без доступных типов — пустой набор, события не падают', async () => {
    expect(createTodayTasksDay(OWNER, '2026-10-01', []).tasks).toHaveLength(0);
    await startDayWith([]);
    await recordTodayTaskActivity({ kind: 'lesson', unitKey: 'a', source: 'test' });
    expect(peekTodayTasks()!.tasks).toHaveLength(0);
  });
});
