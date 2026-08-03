import {
  loadTournamentTaskSlicesForToken,
  parseReadyTournamentPoolToken,
  tournamentExposureBucketId,
  type TournamentPoolBarrierToken,
} from './tournaments';

const BUCKETED_COUNTS = Object.freeze({
  guess_phrase: 30,
  fill_gap: 13,
  find_oddity: 10,
  translate_build: 38,
  // зачем 2026-08-03: speed_match пересобран из словарных слов (фикс
  // «максимум 3 слова», коммит 347f8eb29) — 192 задания вместо 400, 5
  // бакетов вместо 10. Значение обязано совпадать с production-хардкодом
  // TOURNAMENT_BUCKETED_EXPOSURE_BUCKET_COUNTS в tournaments.ts.
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
