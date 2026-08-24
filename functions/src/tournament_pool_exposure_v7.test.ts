import {
  loadTournamentTaskSlicesForToken,
  parseReadyTournamentPoolToken,
  tournamentExposureBucketId,
  type TournamentPoolBarrierToken,
} from './tournaments';
import { TOURNAMENT_POOL_V11_VERSION, tournamentV11TaskId } from './tournament_pool_v11_factory';
import {
  TOURNAMENT_V11_EXPOSURE_EPOCH_DAY,
  tournamentV11ExposureCellOffset,
} from './tournament_core';

const BUCKETED_COUNTS = Object.freeze({
  // зачем 2026-08-03: v9 ужесточил дистракторы guess_phrase — 1433 задания
  // вместо 1200, 36 бакетов вместо 30. Значение обязано совпадать с
  // production-хардкодом TOURNAMENT_BUCKETED_EXPOSURE_BUCKET_COUNTS в
  // tournaments.ts.
  guess_phrase: 36,
  fill_gap: 13,
  find_oddity: 10,
  translate_build: 38,
  // зачем 2026-08-03: speed_match пересобран из словарных слов (фикс
  // «максимум 3 слова», коммит 347f8eb29) — 192 задания вместо 400, 5
  // бакетов вместо 10.
  speed_match: 5,
});

function bucketedToken(generation = 'tpool_20260801_v8'): TournamentPoolBarrierToken {
  return {
    generation,
    revision: 8,
    exposureBucketCounts: BUCKETED_COUNTS,
    exposureLayoutHash: 'a'.repeat(64),
  };
}

describe('tournament pool bounded exposure', () => {
  const v11Token = {
    generation: TOURNAMENT_POOL_V11_VERSION,
    revision: 11,
    exposureBucketCounts: {
      guess_phrase: 38, fill_gap: 13, find_oddity: 8, translate_build: 38, speed_match: 5,
    },
    exposureLayoutHash: '1'.repeat(64),
    taskCount: 4_000,
    manifestSha256: '2'.repeat(64),
    bundleSha256: '3'.repeat(64),
    receiptLedgerSha256: '4'.repeat(64),
  } as const;

  test('requires the exact v11 barrier pins while preserving legacy generations', () => {
    expect(parseReadyTournamentPoolToken({
      kind: 'tournament_task_pool_barrier_v1', state: 'ready', ...v11Token,
    })).toEqual(v11Token);
    for (const mutation of [
      { taskCount: 3_999 }, { exposureBucketCounts: { ...v11Token.exposureBucketCounts, fill_gap: 12 } },
      { manifestSha256: undefined }, { bundleSha256: 'bad' }, { receiptLedgerSha256: '5'.repeat(63) },
    ]) expect(() => parseReadyTournamentPoolToken({
      kind: 'tournament_task_pool_barrier_v1', state: 'ready', ...v11Token, ...mutation,
    })).toThrow('tournament_pool_barrier_invalid');
  });

  test('v11 two-lane cursor covers an odd 19-day cell without adjacent parity overlap', () => {
    // translate_build d2 distributes 700 tasks round-robin over 38 buckets,
    // so the largest real difficulty cell contains 19 tasks.
    const ordered = Array.from({ length: 19 }, (_, index) => index);
    const seen = new Set<number>();
    let previous = new Set<number>();
    for (let relativeDay = 0; relativeDay < 19; relativeDay += 1) {
      const dayOrdinal = TOURNAMENT_V11_EXPOSURE_EPOCH_DAY + relativeDay;
      const parity = dayOrdinal % 2;
      const dwellStartParity = TOURNAMENT_V11_EXPOSURE_EPOCH_DAY % 2;
      const deck = ordered.filter((_, index) => (dwellStartParity + index) % 2 === parity);
      const current = new Set<number>();
      for (const [roomSeries, shard] of [['daily_1200', 0], ['daily_1900', 1]] as const) {
        const offset = tournamentV11ExposureCellOffset(dayOrdinal, roomSeries, shard, 1, 0);
        const selected = deck[offset % deck.length];
        current.add(selected);
        seen.add(selected);
      }
      expect([...current].some((task) => previous.has(task))).toBe(false);
      previous = current;
    }
    expect(seen.size).toBe(19);
  });

  test('v11 uses only pinned buckets and rejects missing receipt/provenance or drifted hashes', async () => {
    let legacyReads = 0;
    const base = {
      taskId: tournamentV11TaskId(TOURNAMENT_POOL_V11_VERSION, '7'.repeat(64)),
      mode: 'guess_phrase', poolVersion: TOURNAMENT_POOL_V11_VERSION,
      verified: true, source: 'ai', lifecycle: 'published', provenanceKeys: ['gavan:1:phrase-1'],
      tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, 'provenance-parity:0'],
      semanticSignature: '6'.repeat(64), contentSha256: '7'.repeat(64),
      semanticReceiptId: '8'.repeat(64), semanticReceiptSha256: '9'.repeat(64),
      reviewContractVersion: 'tournament-semantic-review-v2', promptSetSha256: 'a'.repeat(64),
    };
    const rows = await loadTournamentTaskSlicesForToken({
      token: v11Token, dayOrdinal: 20,
      readLegacyMode: async () => { legacyReads += 1; return []; },
      readExposureBucket: async (mode, bucket) => [{ ...base, mode, exposureBucket: bucket }],
    });
    expect(rows).toHaveLength(5);
    expect(legacyReads).toBe(0);
    for (const drift of [
      { provenanceKeys: undefined }, { semanticReceiptId: undefined },
      { lifecycle: undefined }, { contentSha256: 'b'.repeat(64) }, { exposureBucket: 'malformed' },
      { tags: ['provenance-parity:0'] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, 'provenance-parity:0', 'provenance-parity:1'] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, 'provenance-parity:0', 'provenance-parity:2'] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, 'pool:tpool_legacy', 'provenance-parity:0'] },
    ]) await expect(loadTournamentTaskSlicesForToken({
      token: v11Token, dayOrdinal: 20, readLegacyMode: async () => [],
      readExposureBucket: async (mode, bucket) => [{ ...base, mode, exposureBucket: bucket, ...drift }],
    })).rejects.toThrow('tournament_pool_exposure_task_mismatch');
  });
  test('keeps v6 compatible and requires the exact v7/v8 bucket layout', () => {
    expect(parseReadyTournamentPoolToken({
      kind: 'tournament_task_pool_barrier_v1',
      state: 'ready',
      generation: 'tpool_20260731_v6',
      revision: 6,
    })).toEqual({ generation: 'tpool_20260731_v6', revision: 6 });

    expect(parseReadyTournamentPoolToken({
      kind: 'tournament_task_pool_barrier_v1',
      state: 'ready',
      ...bucketedToken(),
    })).toEqual(bucketedToken());

    expect(parseReadyTournamentPoolToken({
      kind: 'tournament_task_pool_barrier_v1',
      state: 'ready',
      ...bucketedToken('tpool_20260801_v7'),
    })).toEqual(bucketedToken('tpool_20260801_v7'));

    for (const exposureBucketCounts of [
      undefined,
      { ...BUCKETED_COUNTS, fill_gap: 0 },
      { ...BUCKETED_COUNTS, speed_match: 11 },
      { guess_phrase: 30 },
    ]) {
      expect(() => parseReadyTournamentPoolToken({
        kind: 'tournament_task_pool_barrier_v1',
        state: 'ready',
        generation: 'tpool_20260801_v8',
        revision: 8,
        exposureBucketCounts,
        exposureLayoutHash: 'a'.repeat(64),
      })).toThrow('tournament_pool_barrier_invalid');
    }
  });

  test('chooses one deterministic generation-scoped bucket per mode', () => {
    const token = bucketedToken();
    const epochDay = Math.floor(Date.parse('2026-08-01T00:00:00.000Z') / 86_400_000);
    expect(tournamentExposureBucketId(token, 'fill_gap', epochDay + 98))
      .toBe('tpool_20260801_v8:fill_gap:007');
    expect(tournamentExposureBucketId(token, 'translate_build', epochDay + 722))
      .toBe('tpool_20260801_v8:translate_build:000');
    expect(() => tournamentExposureBucketId(
      { generation: 'tpool_20260731_v6', revision: 6 },
      'fill_gap',
      20,
    )).toThrow('tournament_pool_exposure_layout_required');
  });

  test('v8 performs five bounded bucket reads and validates generation/bucket parity', async () => {
    const token = bucketedToken();
    const calls: string[] = [];
    const tasks = await loadTournamentTaskSlicesForToken({
      token,
      dayOrdinal: 20,
      readLegacyMode: async () => { throw new Error('legacy read forbidden'); },
      readExposureBucket: async (mode, bucket, limit) => {
        calls.push(`${mode}:${bucket}:${limit}`);
        return [{
          taskId: `${mode}-1`,
          mode,
          poolVersion: token.generation,
          exposureBucket: bucket,
          verified: true,
          source: 'ai',
        }];
      },
    });

    expect(tasks).toHaveLength(5);
    expect(calls).toHaveLength(5);
    expect(calls.every((entry) => entry.endsWith(':40'))).toBe(true);

    await expect(loadTournamentTaskSlicesForToken({
      token,
      dayOrdinal: 20,
      readLegacyMode: async () => [],
      readExposureBucket: async (mode, bucket) => [{
        taskId: 'bad',
        mode,
        poolVersion: 'tpool_20260731_v6',
        exposureBucket: bucket,
        verified: true,
        source: 'ai',
      }],
    })).rejects.toThrow('tournament_pool_exposure_task_mismatch');
  });

  test('v6 retains the legacy per-mode bounded reads', async () => {
    const token: TournamentPoolBarrierToken = {
      generation: 'tpool_20260731_v6',
      revision: 6,
    };
    let legacyReads = 0;
    const tasks = await loadTournamentTaskSlicesForToken({
      token,
      dayOrdinal: 20,
      readLegacyMode: async (mode, limit) => {
        legacyReads += 1;
        expect(limit).toBe(40);
        return [{ taskId: `${mode}-legacy`, mode }];
      },
      readExposureBucket: async () => { throw new Error('bucketed read forbidden'); },
    });
    expect(legacyReads).toBe(5);
    expect(tasks).toHaveLength(5);
  });
});
