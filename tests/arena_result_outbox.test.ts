import {
  ARENA_OUTBOX_MAX,
  ARENA_OUTBOX_TTL_MS,
  arenaOutboxAfterFailure,
  arenaOutboxClassify,
  arenaOutboxDue,
  arenaOutboxEntryKey,
  arenaOutboxEvict,
  arenaOutboxExpired,
  arenaOutboxHasGated,
  arenaOutboxMakeEntry,
} from '../modules/arena/result_outbox';
import type { ArenaMatchReport } from '../modules/arena/match_machine';

const SCOPE = { stableUid: 'account-a', accountGeneration: 1 } as const;

/**
 * Очередь отложенной отправки. Владелец (D-58): матч доигрывается оффлайн,
 * результат уходит когда сеть вернётся.
 *
 * Главное правило, которое здесь закреплено: отсутствие сети НЕ тратит попытки.
 * Политика «мёртв после пяти попыток» — это примерно шесть минут, то есть
 * результат матча, сыгранного в самолёте, был бы выброшен.
 */

const report = (matchId: string): ArenaMatchReport => ({
  schemaVersion: 'arena-local-match.v2',
  matchId, seat: 'a', planHash: 'h', outcomes: [], pairAttemptsByTask: {},
  matchStars: 24, tieBreakElapsedMs: 90_000, correctCount: 8, firstCount: 4, longestCombo: 3,
  clockSuspect: false, abandoned: false, startedAtWallMs: 1, finishedAtWallMs: 2,
});

describe('классификация отказа', () => {
  it.each([
    [new Error('Network request failed'), 'offline'],
    [{ code: 'unavailable' }, 'offline'],
    [new Error('timeout of 10000ms exceeded'), 'offline'],
    [{ code: 'deadline-exceeded' }, 'transient'],
    [{ code: 'internal' }, 'transient'],
    [new Error('App Check token refresh failed'), 'transient'],
    [new Error('arena_client_update_required'), 'gated'],
    [{ code: 'invalid-argument' }, 'rejected'],
    [new Error('arena_report_conflict'), 'rejected'],
    [new Error('arena_match_missing'), 'rejected'],
    // Ниже — то, что раньше молча выбрасывалось как «отказ по существу».
    // Каждый случай означает «непонятно, что произошло», а не «сервер сказал
    // нет»: сворачивание приложения, обновление токена, неразобранная ошибка
    // самого Firebase и — до деплоя — отсутствующая функция.
    [{ code: 'cancelled' }, 'transient'],
    [{ code: 'unauthenticated' }, 'transient'],
    [{ code: 'unknown' }, 'transient'],
    [{ code: 'not-found' }, 'transient'],
    [null, 'transient'],
  ])('относит %j к классу %s', (error, expected) => {
    expect(arenaOutboxClassify(error)).toBe(expected);
  });
});

describe('политика повторов', () => {
  it('не тратит попытки на отсутствие сети и повторяет сразу', () => {
    const entry = arenaOutboxMakeEntry(SCOPE, report('m1'), 1_000);
    const after = arenaOutboxAfterFailure(entry, 'offline', 2_000);
    expect(after?.attempts).toBe(0);
    expect(after?.nextAttemptAtWallMs).toBe(2_000);
  });

  it('держит отчёт бесконечно, если нужно обновить приложение', () => {
    const entry = arenaOutboxMakeEntry(SCOPE, report('m1'), 1_000);
    const after = arenaOutboxAfterFailure(entry, 'gated', 2_000);
    expect(after).not.toBeNull();
    expect(after?.attempts).toBe(0);
    expect(arenaOutboxHasGated([after!])).toBe(true);
  });

  it('наращивает задержку на временных ошибках и упирается в пять минут', () => {
    let entry = arenaOutboxMakeEntry(SCOPE, report('m2'), 0);
    const delays: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      entry = arenaOutboxAfterFailure(entry, 'transient', 0)!;
      delays.push(Math.floor(entry.nextAttemptAtWallMs / 1_000));
    }
    expect(entry.attempts).toBe(6);
    expect(delays[0]).toBeLessThanOrEqual(delays[1]);
    expect(delays[3]).toBeLessThanOrEqual(delays[5]);
    expect(delays[5]).toBeGreaterThanOrEqual(300);
  });

  it('снимает запись только на отказе сервера', () => {
    const entry = arenaOutboxMakeEntry(SCOPE, report('m3'), 1_000);
    expect(arenaOutboxAfterFailure(entry, 'rejected', 2_000)).toBeNull();
  });
});

describe('срок жизни и вытеснение', () => {
  it('снимает отчёт, когда матча на сервере уже не существует', () => {
    const entry = arenaOutboxMakeEntry(SCOPE, report('m4'), 0);
    expect(arenaOutboxExpired(entry, ARENA_OUTBOX_TTL_MS - 1)).toBe(false);
    expect(arenaOutboxExpired(entry, ARENA_OUTBOX_TTL_MS + 1)).toBe(true);
    expect(arenaOutboxAfterFailure(entry, 'offline', ARENA_OUTBOX_TTL_MS + 1)).toBeNull();
  });

  it('вытесняет самые старые, а не самые новые', () => {
    // Самый новый — это матч, который игрок только что сыграл.
    const entries = Array.from(
      { length: 25 },
      (_, i) => arenaOutboxMakeEntry(SCOPE, report(`m${i}`), i * 1_000),
    );
    const { keep, dropped } = arenaOutboxEvict(entries, 30_000);
    expect(keep).toHaveLength(ARENA_OUTBOX_MAX);
    expect(dropped.slice(0, 5)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
    expect(keep.some((entry) => entry.matchId === 'm24')).toBe(true);
  });
});

describe('готовность к отправке', () => {
  it('отдаёт свежую запись сразу и ждёт после ошибки', () => {
    const entry = arenaOutboxMakeEntry(SCOPE, report('m9'), 1_000);
    expect(arenaOutboxDue(entry, 1_000)).toBe(true);
    const waiting = arenaOutboxAfterFailure(entry, 'transient', 1_000)!;
    expect(arenaOutboxDue(waiting, 1_000)).toBe(false);
    expect(arenaOutboxDue(waiting, waiting.nextAttemptAtWallMs)).toBe(true);
  });

  it('строит ключ хранения по идентификатору матча', () => {
    expect(arenaOutboxEntryKey(SCOPE, 'abc')).toBe('arena.outbox.v3.entry.account-a.abc');
  });
});
