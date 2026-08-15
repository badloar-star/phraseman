import * as fs from 'fs';
import * as path from 'path';
import {
  arenaOutboxDecodeEntry,
  arenaOutboxEnqueue,
  arenaOutboxFlush,
  arenaOutboxHasMatch,
  arenaOutboxList,
} from '../modules/arena/outbox_storage';
import { ARENA_OUTBOX_ENTRY_PREFIX, ARENA_OUTBOX_INDEX_KEY } from '../modules/arena/result_outbox';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';

/**
 * Очередь отправки результатов.
 *
 * Она была написана целиком и покрыта тестами — и НЕ ПОДКЛЮЧЕНА НИ К ЧЕМУ.
 * Экран матча при неудачной отправке глотал ошибку с комментарием «очередь
 * дошлёт», а очереди не существовало: отчёт пропадал навсегда. Матч,
 * доигранный в метро, стоил игроку звёзд, очков ранга и самого факта игры —
 * при том что владелец (D-58) прямо просил обратного.
 */

function fakeStore(): ArenaKeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function report(matchId: string): ArenaMatchReport {
  return {
    schemaVersion: 'arena-local-match.v2',
    matchId,
    seat: 'a',
    planHash: 'hash',
    outcomes: [],
    pairAttemptsByTask: {},
    matchStars: 12,
    tieBreakElapsedMs: 5_000,
    correctCount: 4,
    firstCount: 2,
    longestCombo: 3,
    clockSuspect: false,
    abandoned: false,
    startedAtWallMs: 1_000,
    finishedAtWallMs: 60_000,
  } as ArenaMatchReport;
}

describe('отчёт переживает потерю сети', () => {
  it('кладётся на диск вместе с версией правил', async () => {
    const store = fakeStore();
    // Версия правил хранится рядом: досылка может случиться через сутки, когда
    // плана матча на руках уже нет и взять её будет неоткуда.
    expect(await arenaOutboxEnqueue(store, report('m1'), 1_000, 'arena-stars.v3')).toBe(true);
    const entries = await arenaOutboxList(store);
    expect(entries).toHaveLength(1);
    expect(entries[0].matchId).toBe('m1');
    expect(entries[0].rulesVersion).toBe('arena-stars.v3');
    expect(await arenaOutboxHasMatch(store, 'm1')).toBe(true);
  });

  it('один и тот же матч не кладётся дважды', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    await arenaOutboxEnqueue(store, report('m1'), 2_000, 'v');
    expect(await arenaOutboxList(store)).toHaveLength(1);
  });

  it('нечитаемая запись не прячет остальные', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    await arenaOutboxEnqueue(store, report('m2'), 1_000, 'v');
    store.data.set(`${ARENA_OUTBOX_ENTRY_PREFIX}m1`, '{ это не json');
    const entries = await arenaOutboxList(store);
    expect(entries).toHaveLength(1);
    expect(entries[0].matchId).toBe('m2');
  });

  it('чужая схема отбрасывается целиком', () => {
    expect(arenaOutboxDecodeEntry(JSON.stringify({ schemaVersion: 'arena-outbox.v1', matchId: 'm' }))).toBeNull();
    expect(arenaOutboxDecodeEntry('не json')).toBeNull();
    expect(arenaOutboxDecodeEntry(null)).toBeNull();
  });
});

describe('досылка', () => {
  it('успешная отправка убирает запись и из индекса, и с диска', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    const result = await arenaOutboxFlush(store, { send: async () => {}, wallNowMs: 2_000 });
    expect(result.sent).toEqual(['m1']);
    expect(await arenaOutboxList(store)).toHaveLength(0);
    expect(store.data.get(`${ARENA_OUTBOX_ENTRY_PREFIX}m1`)).toBeUndefined();
    expect(store.data.get(ARENA_OUTBOX_INDEX_KEY)).toBe('[]');
  });

  /**
   * Главное свойство: отсутствие сети НЕ выбрасывает отчёт. Иначе матч,
   * доигранный в самолёте, терялся бы вместе с наградой.
   */
  it('нет сети — запись остаётся ждать', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    const result = await arenaOutboxFlush(store, {
      send: async () => { throw new Error('network request failed'); },
      wallNowMs: 2_000,
    });
    expect(result.kept).toEqual(['m1']);
    expect(result.dropped).toHaveLength(0);
    const entries = await arenaOutboxList(store);
    expect(entries).toHaveLength(1);
    // Попытки тратит только настоящий отказ сервера.
    expect(entries[0].attempts).toBe(0);
    expect(entries[0].lastFailure).toBe('offline');
  });

  it('без сети остальные отчёты не долбят сервер', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    await arenaOutboxEnqueue(store, report('m2'), 1_000, 'v');
    let calls = 0;
    await arenaOutboxFlush(store, {
      send: async () => { calls += 1; throw new Error('network request failed'); },
      wallNowMs: 2_000,
    });
    expect(calls).toBe(1);
  });

  it('отказ по существу выбрасывает запись — сервер не примет её и завтра', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    const result = await arenaOutboxFlush(store, {
      send: async () => { throw new Error('arena_match_missing'); },
      wallNowMs: 2_000,
    });
    expect(result.dropped).toEqual(['m1']);
    expect(await arenaOutboxList(store)).toHaveLength(0);
  });

  it('временный отказ тратит попытку и отодвигает следующую', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, report('m1'), 1_000, 'v');
    await arenaOutboxFlush(store, {
      send: async () => { throw new Error('deadline-exceeded'); },
      wallNowMs: 2_000,
    });
    const entries = await arenaOutboxList(store);
    expect(entries[0].attempts).toBe(1);
    expect(entries[0].nextAttemptAtWallMs).toBeGreaterThan(2_000);
    // И пока не пришло время — отправка не повторяется.
    let calls = 0;
    await arenaOutboxFlush(store, { send: async () => { calls += 1; }, wallNowMs: 2_100 });
    expect(calls).toBe(0);
  });
});

/**
 * Экраны перечислены поимённо: без этого очередь снова могла бы остаться
 * написанной и никуда не подключённой.
 */
describe('очередь действительно подключена', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it('экран матча кладёт непрошедший отчёт в очередь', () => {
    const source = read('app/arena_match.tsx');
    expect(source).toContain('arenaOutboxEnqueue');
    // Старый комментарий обещал очередь, которой не было.
    expect(source).not.toContain('очередь отправки дошлёт его');
  });

  it('хаб и экран результата досылают', () => {
    expect(read('app/arena.tsx')).toContain('arenaFlushOutbox');
    expect(read('app/arena_results.tsx')).toContain('arenaFlushOutbox');
  });

  /**
   * Отчёт, застрявший из-за старой сборки, повторами не спасти: сервер
   * отвергает старого клиента и будет отвергать дальше. Без подсказки игрок
   * никогда бы не узнал, почему награда не пришла.
   */
  it('застрявший из-за обновления отчёт виден на хабе', () => {
    const hub = read('app/arena.tsx');
    expect(hub).toContain('arenaOutboxBlockedByUpdate');
    expect(hub).toContain("'reportBlocked'");
    expect(read('app/arena_client.ts')).toContain('arenaOutboxHasGated');
  });

  it('экран результата не называет матч засчитанным, пока отчёт не ушёл', () => {
    const source = read('app/arena_results.tsx');
    expect(source).toContain('arenaOutboxPending');
    expect(source).toContain("'reportQueued'");
  });
});
