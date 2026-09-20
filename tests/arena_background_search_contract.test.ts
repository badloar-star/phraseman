/**
 * Сторож фонового поиска соперника (владелец 2026-09-20).
 *
 * Охраняет обещания, которые обычные тесты Арены не ловят:
 *  • уход с экрана НЕ отменяет очередь;
 *  • «Отклонить» и молчание — один и тот же путь, оба гасят поиск;
 *  • остановленный поиск не воскресает поздним ответом сети;
 *  • отсчёт берётся из серверного срока, а не из константы клиента;
 *  • повторный старт не плодит вторую очередь.
 *
 * Сработал — чинить логику, а не сторожа.
 */
import {
  ARENA_QUICK_FALLBACK_MAX_MS,
  ARENA_QUICK_SEARCH_GIVE_UP_MS,
  ARENA_RANKED_FALLBACK_MAX_MS,
  ARENA_RANKED_SEARCH_GIVE_UP_MS,
} from '../modules/arena/contract';
import {
  ARENA_ACCEPT_WINDOW_FALLBACK_MS,
  ArenaBackgroundSearch,
  type ArenaBackgroundSearchDeps,
  type ArenaBackgroundSearchFindResult,
  type ArenaBackgroundSearchMatched,
} from '../modules/arena/background_search';

type Harness = Readonly<{
  search: ArenaBackgroundSearch;
  calls: {
    findMatch: { mode: string; requestId: string }[];
    cancelQueue: string[];
    releaseStaleMatch: number;
    cancelStaleQueue: number;
    declineMatch: string[];
    requestBot: string[];
  };
  /** Прокрутить виртуальное время и выполнить созревшие таймеры. */
  advance: (ms: number) => Promise<void>;
  setFindResult: (result: ArenaBackgroundSearchFindResult) => void;
  setBotResult: (match: ArenaBackgroundSearchMatched | Error) => void;
  setFindError: (error: Error | null) => void;
  setReleaseResult: (value: boolean) => void;
  logs: string[];
}>;

function createHarness(): Harness {
  let now = 1_000_000;
  let seq = 0;
  const timers: { id: number; at: number; fn: () => void }[] = [];
  const logs: string[] = [];
  const calls = {
    findMatch: [] as { mode: string; requestId: string }[],
    cancelQueue: [] as string[],
    declineMatch: [] as string[],
    requestBot: [] as string[],
    releaseStaleMatch: 0,
    cancelStaleQueue: 0,
  };
  let findError: Error | null = null;
  let releaseResult = true;
  let findResult: ArenaBackgroundSearchFindResult = { queue: null, match: null };
  let botResult: ArenaBackgroundSearchMatched | Error = new Error('bot_not_configured');

  const deps: ArenaBackgroundSearchDeps = {
    findMatch: async (mode, _target, requestId) => {
      calls.findMatch.push({ mode, requestId });
      if (findError) throw findError;
      return findResult;
    },
    requestBot: async (_mode, _target, requestId) => {
      calls.requestBot.push(requestId);
      if (botResult instanceof Error) throw botResult;
      return botResult;
    },
    cancelQueue: async (_target, requestId) => { calls.cancelQueue.push(requestId); },
    declineMatch: async (matchId) => { calls.declineMatch.push(matchId); },
    releaseStaleMatch: async () => { calls.releaseStaleMatch += 1; return releaseResult; },
    cancelStaleQueue: async () => { calls.cancelStaleQueue += 1; },
    createRequestId: () => { seq += 1; return `req-${seq}`; },
    nowMs: () => now,
    setTimer: (fn, ms) => {
      seq += 1;
      const id = seq;
      timers.push({ id, at: now + ms, fn });
      return id;
    },
    clearTimer: (handle) => {
      const index = timers.findIndex((timer) => timer.id === handle);
      if (index >= 0) timers.splice(index, 1);
    },
    log: (message) => { logs.push(message); },
  };

  /**
   * Прокрутить виртуальное время.
   *
   * зачем предел итераций: heartbeat переставляет САМ СЕБЯ, поэтому наивное
   * «крутить, пока есть созревшие таймеры» — бесконечный цикл, который съедает
   * кучу и роняет воркер по памяти (так и случилось на первом прогоне).
   * Предел щедрый, но конечный: он отделяет «тест долго идёт» от «тест завис».
   */
  const advance = async (ms: number) => {
    const target = now + ms;
    for (let guard = 0; guard < 500; guard += 1) {
      const due = timers
        .filter((timer) => timer.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) {
        now = target;
        await Promise.resolve();
        return;
      }
      timers.splice(timers.indexOf(due), 1);
      now = due.at;
      due.fn();
      await Promise.resolve();
      await Promise.resolve();
    }
    throw new Error('advance(): таймеры не сходятся за 500 шагов — похоже на петлю');
  };

  return {
    search: new ArenaBackgroundSearch(deps),
    calls,
    advance,
    setFindResult: (result) => { findResult = result; },
    setBotResult: (match) => { botResult = match; },
    setFindError: (error: Error | null) => { findError = error; },
    setReleaseResult: (value: boolean) => { releaseResult = value; },
    logs,
  };
}

const MATCH: ArenaBackgroundSearchMatched = {
  matchId: 'match-1',
  acceptDeadlineAtMs: 1_000_000 + 12_000,
  opponentName: 'Марина',
};

describe('фоновый поиск: очередь переживает экран', () => {
  test('старт ставит очередь и остаётся searching без экрана', async () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    await Promise.resolve();

    expect(h.search.getState().phase).toBe('searching');
    expect(h.calls.findMatch).toHaveLength(1);
    // Ничего не отменяли: экран мог быть закрыт, поиск продолжается.
    expect(h.calls.cancelQueue).toHaveLength(0);
  });

  test('повторный старт НЕ создаёт вторую очередь', async () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    await Promise.resolve();
    const first = h.search.getState().requestId;

    h.search.start('quick', 'en');
    await Promise.resolve();

    expect(h.search.getState().requestId).toBe(first);
    expect(h.calls.findMatch).toHaveLength(1);
  });

  test('пауза глушит heartbeat, возврат его восстанавливает без нового requestId',
    async () => {
      const h = createHarness();
      h.search.start('quick', 'en');
      await Promise.resolve();
      const requestId = h.search.getState().requestId;
      const afterStart = h.calls.findMatch.length;

      h.search.pause();
      expect(h.search.getState().phase).toBe('paused');
      await h.advance(60_000);
      // В фоне сеть не трогаем вовсе: ни одного нового вызова.
      expect(h.calls.findMatch).toHaveLength(afterStart);

      h.search.resume();
      await Promise.resolve();
      expect(h.search.getState().phase).toBe('searching');
      expect(h.search.getState().requestId).toBe(requestId);
      expect(h.calls.findMatch.length).toBeGreaterThan(afterStart);
    });
});

describe('фоновый поиск: находка и согласие', () => {
  test('найденный соперник переводит в found и несёт серверный срок', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();

    const state = h.search.getState();
    expect(state.phase).toBe('found');
    expect(state.found?.matchId).toBe('match-1');
    expect(state.found?.acceptDeadlineAtMs).toBe(MATCH.acceptDeadlineAtMs);
  });

  test('срок решения берётся у сервера, а не из константы клиента', async () => {
    const h = createHarness();
    // Сервер прислал НЕ 12 секунд: клиент обязан подчиниться ему.
    h.setFindResult({ queue: null, match: { ...MATCH, acceptDeadlineAtMs: 1_000_000 + 5_000 } });
    h.search.start('quick', 'en');
    await Promise.resolve();

    expect(h.search.getState().found?.acceptDeadlineAtMs).toBe(1_000_000 + 5_000);
  });

  test('без серверного срока используется запасное окно 12 с', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: { matchId: 'match-2' } });
    h.search.start('quick', 'en');
    await Promise.resolve();

    expect(h.search.getState().found?.acceptDeadlineAtMs)
      .toBe(1_000_000 + ARENA_ACCEPT_WINDOW_FALLBACK_MS);
  });

  test('«Отклонить» гасит поиск и закрывает матч на сервере', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();

    h.search.stop('declined');
    await Promise.resolve();

    expect(h.search.getState().phase).toBe('stopped');
    expect(h.search.getState().stopReason).toBe('declined');
    expect(h.calls.declineMatch).toEqual(['match-1']);
  });

  test('молчание проходит тем же путём, что и «Отклонить»', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();

    await h.advance(12_000);

    expect(h.search.getState().phase).toBe('stopped');
    expect(h.search.getState().stopReason).toBe('accept_timeout');
    // Живой соперник на том конце обязан быть отпущен, а не брошен ждать.
    expect(h.calls.declineMatch).toEqual(['match-1']);
  });

  test('принятый матч НЕ отклоняется на сервере', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();

    h.search.acknowledgeAccepted();
    await Promise.resolve();

    expect(h.search.getState().phase).toBe('stopped');
    expect(h.calls.declineMatch).toHaveLength(0);
  });

  test('после остановки повторный тост не выдаётся', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();
    h.search.stop('declined');
    await Promise.resolve();

    // Любые дозревшие таймеры не имеют права вернуть находку.
    await h.advance(120_000);
    expect(h.search.getState().phase).toBe('stopped');
    expect(h.search.getState().found).toBeNull();
  });
});

describe('фоновый поиск: отказ действительно останавливает', () => {
  /**
   * зачем (аудит 2026-09-20): первая версия экрана поиска перезапускала поиск
   * на каждой смене фазы, и отказ в тосте воскрешал очередь — человек на
   * экране Арены не мог отказаться вовсе. Ядро обязано оставаться
   * остановленным само по себе; экран это не «чинит», а просто не мешает.
   */
  test('после отказа ядро не возвращается в поиск само', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();
    h.search.stop('declined');
    await Promise.resolve();

    const callsAfterStop = h.calls.findMatch.length;
    await h.advance(90_000);

    expect(h.search.getState().phase).toBe('stopped');
    // Ни одной новой сверки: остановленный поиск не стучится к серверу.
    expect(h.calls.findMatch).toHaveLength(callsAfterStop);
  });

  test('reset возвращает в idle и позволяет начать заново', async () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    await Promise.resolve();
    h.search.stop('cancelled');
    h.search.reset();

    expect(h.search.getState().phase).toBe('idle');
    expect(h.search.getState().stopReason).toBeNull();

    h.search.start('quick', 'en');
    await Promise.resolve();
    expect(h.search.getState().phase).toBe('searching');
  });

  test('reset не трогает живой поиск', async () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    await Promise.resolve();

    h.search.reset();

    expect(h.search.getState().phase).toBe('searching');
  });
});

describe('фоновый поиск: отмена и гонки', () => {
  test('отмена до находки снимает очередь', async () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    await Promise.resolve();
    const requestId = h.search.getState().requestId!;

    h.search.stop('cancelled');
    await Promise.resolve();

    expect(h.calls.cancelQueue).toEqual([requestId]);
    expect(h.calls.declineMatch).toHaveLength(0);
  });

  test('поздний ответ сети не воскрешает остановленный поиск', async () => {
    const h = createHarness();
    let release: (value: ArenaBackgroundSearchFindResult) => void = () => {};
    const pending = new Promise<ArenaBackgroundSearchFindResult>((resolve) => { release = resolve; });
    const search = new ArenaBackgroundSearch({
      findMatch: () => pending,
      requestBot: async () => MATCH,
      cancelQueue: async () => {},
      declineMatch: async () => {},
      releaseStaleMatch: async () => true,
      cancelStaleQueue: async () => {},
      createRequestId: () => 'req-late',
      nowMs: () => 1_000_000,
      setTimer: () => null,
      clearTimer: () => {},
      log: () => {},
    });

    search.start('quick', 'en');
    search.stop('cancelled');
    release({ queue: null, match: MATCH });
    await Promise.resolve();
    await Promise.resolve();

    expect(search.getState().phase).toBe('stopped');
    expect(search.getState().found).toBeNull();
  });

  test('двойной stop не задваивает уборку', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();

    h.search.stop('declined');
    h.search.stop('declined');
    await Promise.resolve();

    expect(h.calls.declineMatch).toHaveLength(1);
  });

  test('отказ бота логирует причину и не гасит поиск', async () => {
    const h = createHarness();
    h.setFindResult({
      queue: { joinedAtMs: 1_000_000, botDueAtMs: 1_000_000 + 5_000 },
      match: null,
    });
    h.setBotResult(new Error('arena_quick_bot_too_early'));
    h.search.start('quick', 'en');
    await Promise.resolve();

    await h.advance(6_000);

    expect(h.search.getState().phase).toBe('searching');
    expect(h.logs.some((line) => line.includes('bot rejected')
      && line.includes('arena_quick_bot_too_early'))).toBe(true);
  });

  test('бот приходит по серверному сроку и даёт находку', async () => {
    const h = createHarness();
    h.setFindResult({
      queue: { joinedAtMs: 1_000_000, botDueAtMs: 1_000_000 + 5_000 },
      match: null,
    });
    h.setBotResult(MATCH);
    h.search.start('quick', 'en');
    await Promise.resolve();

    await h.advance(5_000);

    expect(h.calls.requestBot).toHaveLength(1);
    expect(h.search.getState().phase).toBe('found');
  });
});

describe('фоновый поиск: замок незакрытого матча', () => {
  /**
   * зачем (инциденты 2026-08-29, защита потеряна при переписи экрана и
   * возвращена аудитом 2026-09-20): сервер НЕ создаёт очередь, пока за
   * профилем висит незакрытый матч. Без реакции поиск молчит вечно.
   */
  test('ошибка arena_active_match_exists снимает замок и продолжает поиск', async () => {
    const h = createHarness();
    h.setFindError(new Error('arena_active_match_exists'));
    h.search.start('quick', 'en');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(h.calls.releaseStaleMatch).toBeGreaterThan(0);
    expect(h.search.getState().phase).toBe('searching');
  });

  test('сервер отказал снять замок — матч живой, поиск заканчивается', async () => {
    const h = createHarness();
    h.setFindError(new Error('arena_active_match_exists'));
    h.setReleaseResult(false);
    h.search.start('quick', 'en');
    for (let i = 0; i < 6; i += 1) await Promise.resolve();

    expect(h.search.getState().phase).toBe('stopped');
  });

  test('уход без игры просит закрыть незакрытый матч', async () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    await Promise.resolve();

    h.search.stop('cancelled');
    await Promise.resolve();

    expect(h.calls.releaseStaleMatch).toBeGreaterThan(0);
  });

  test('принятый матч НЕ закрывается при остановке поиска', async () => {
    const h = createHarness();
    h.setFindResult({ queue: null, match: MATCH });
    h.search.start('quick', 'en');
    await Promise.resolve();
    const before = h.calls.releaseStaleMatch;

    h.search.acknowledgeAccepted();
    await Promise.resolve();

    expect(h.calls.releaseStaleMatch).toBe(before);
  });
});

describe('поиск не дольше 10 секунд (владелец 2026-09-20)', () => {
  /**
   * «рейтинг сократи поиск и блиц игра на арене до 10 секунд, бот
   * подключается уже не более чем через 10 секунд».
   *
   * Клиент режет серверный срок этим потолком, поэтому правило действует
   * независимо от версии развёрнутых функций.
   */
  test('потолок ожидания бота — 10 секунд в обоих режимах', () => {
    expect(ARENA_QUICK_FALLBACK_MAX_MS).toBeLessThanOrEqual(10_000);
    expect(ARENA_RANKED_FALLBACK_MAX_MS).toBeLessThanOrEqual(10_000);
  });

  test('сдача поиска позже потолка, но не растягивает обещание', () => {
    // Запас нужен на один короткий повтор запроса бота, не больше.
    expect(ARENA_QUICK_SEARCH_GIVE_UP_MS).toBeGreaterThan(ARENA_QUICK_FALLBACK_MAX_MS);
    expect(ARENA_RANKED_SEARCH_GIVE_UP_MS).toBeGreaterThan(ARENA_RANKED_FALLBACK_MAX_MS);
    expect(ARENA_QUICK_SEARCH_GIVE_UP_MS).toBeLessThanOrEqual(20_000);
    expect(ARENA_RANKED_SEARCH_GIVE_UP_MS).toBeLessThanOrEqual(20_000);
  });

  test('секундомер идёт с первой секунды, не дожидаясь сервера', () => {
    const h = createHarness();
    h.search.start('quick', 'en');
    // Ответ сервера ещё не пришёл, а отсчёт уже должен идти.
    expect(h.search.getState().startedAtMs).not.toBeNull();
  });
});

describe('висящая очередь не вешает поиск (владелец 2026-09-20)', () => {
  /**
   * Лог 14:38:19→14:39:20: пять подряд reconcile с
   * arena_queue_request_active, поиск шёл «минуту» и не мог получить очередь.
   */
  test('arena_queue_request_active снимает висящую очередь и повторяет', async () => {
    const h = createHarness();
    h.setFindError(new Error('arena_queue_request_active'));
    h.search.start('ranked', 'en');
    for (let i = 0; i < 6; i += 1) await Promise.resolve();

    expect(h.calls.cancelStaleQueue).toBeGreaterThan(0);
  });

  test('если очередь не снимается — поиск честно заканчивается', async () => {
    const h = createHarness();
    h.setFindError(new Error('arena_queue_request_active'));
    h.search.start('ranked', 'en');
    // Предел попыток обязан сработать, а не крутиться вечно.
    for (let i = 0; i < 40; i += 1) await Promise.resolve();

    expect(h.search.getState().phase).toBe('stopped');
  });
});

describe('окончательные отказы бота не крутятся вечно (аудит 2026-09-20)', () => {
  /**
   * Дневной лимит рейтинговых ботов и закрытая очередь не рассасываются
   * сами. Повтор после них = вечный поиск — тот же класс, что владелец видел
   * как «поиск идёт минуту».
   */
  const terminal = [
    'arena_ranked_bot_daily_limit',
    'arena_quick_queue_not_waiting',
    'arena_ranked_queue_not_waiting',
  ];

  for (const code of terminal) {
    test(`${code} заканчивает поиск, а не повторяется`, async () => {
      const h = createHarness();
      h.setFindResult({
        queue: { joinedAtMs: 1_000_000, botDueAtMs: 1_000_000 + 3_000 },
        match: null,
      });
      h.setBotResult(new Error(code));
      h.search.start('ranked', 'en');
      await Promise.resolve();
      await h.advance(4_000);

      expect(h.search.getState().phase).toBe('stopped');
      // Ровно одна попытка: повторять бессмысленно.
      expect(h.calls.requestBot).toHaveLength(1);
    });
  }
});
