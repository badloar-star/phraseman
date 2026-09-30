/* eslint-disable import/first -- Jest mocks must precede imports of the module under test. */

const mockMultilingualBundleLoad = jest.fn();

jest.mock('firebase-admin', () => {
  const firestore = Object.assign(jest.fn(), {
    FieldPath: { documentId: jest.fn(() => '__name__') },
  });
  return { firestore, storage: jest.fn() };
});

jest.mock('./arena_target_registry', () => {
  const actual = jest.requireActual('./arena_target_registry');
  return {
    ...actual,
    resolveArenaTargetPublication: jest.fn(() => ({
      studyTarget: 'es',
      poolVersion: 'pool-v1',
      factPackVersion: 'facts-v1',
      factPackSha256: 'a'.repeat(64),
      publicationFingerprint: 'b'.repeat(64),
      manifestSha256: 'c'.repeat(64),
      merkleRootSha256: 'd'.repeat(64),
      legacy: false,
    })),
  };
});

jest.mock('./generated/spire_multilingual_es.json', () => {
  mockMultilingualBundleLoad();
  return jest.requireActual('./generated/spire_multilingual_es.json');
});

import * as admin from 'firebase-admin';
import { resolveArenaTargetPublication } from './arena_target_registry';
import { runSpirePackBuild } from './spire_pack_build';

type Snapshot = Readonly<{ exists: boolean; data: () => unknown }>;

function missingSnapshot(): Snapshot {
  return { exists: false, data: () => undefined };
}

function emptyPoolQuery() {
  const poolGet = jest.fn(async () => ({ size: 0, empty: true, docs: [] }));
  const query: any = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    startAfter: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: poolGet,
  };
  return { query, poolGet };
}

function installFirebase(flagsRead: () => Promise<Snapshot>) {
  const { query: taskSource, poolGet } = emptyPoolQuery();
  const db = {
    collection: jest.fn((collection: string) => {
      if (collection === 'tournamentTasks') return taskSource;
      return {
        doc: jest.fn((id: string) => ({
          get: jest.fn(async () => {
            if (id === 'spire_v1') return missingSnapshot();
            if (id === 'current') return { exists: true, data: () => ({}) };
            if (id === 'spire_task_flags_es') return flagsRead();
            throw new Error(`unexpected_doc:${collection}/${id}`);
          }),
        })),
      };
    }),
  };
  const save = jest.fn();
  const file = jest.fn(() => ({
    exists: jest.fn(async () => [false]),
    getMetadata: jest.fn(async () => [{}]),
    save,
  }));
  (admin.firestore as unknown as jest.Mock).mockReturnValue(db);
  (admin.storage as unknown as jest.Mock).mockReturnValue({ bucket: () => ({ file }) });
  return { poolGet, save };
}

async function runOneLanguage() {
  return runSpirePackBuild({
    weekIds: ['2026-W40'],
    langs: ['es'],
    tiers: [0],
    force: false,
    requireLive: false,
    trigger: 'admin',
  });
}

describe('Spire task flags fail closed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Firestore flag read failure blocks the language with a stable reason', async () => {
    const { poolGet, save } = installFirebase(async () => {
      throw new Error('transient backend detail must not become the public reason');
    });

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({ es: 'spire_task_flags_read_failed' });
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'spire_task_flags_read_failed',
    }]);
    expect(poolGet).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test('flag failure wins before loading the direct multilingual fallback', async () => {
    (resolveArenaTargetPublication as jest.Mock).mockReturnValueOnce(null);
    const { poolGet, save } = installFirebase(async () => {
      throw new Error('flags unavailable');
    });

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({ es: 'spire_task_flags_read_failed' });
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'spire_task_flags_read_failed',
    }]);
    expect(mockMultilingualBundleLoad).not.toHaveBeenCalled();
    expect(poolGet).not.toHaveBeenCalled();
    expect(result.poolReads).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });

  test('a corrupt existing flags document blocks the language with a stable reason', async () => {
    const { poolGet, save } = installFirebase(async () => ({
      exists: true,
      data: () => ({
        schemaVersion: 'spire-task-flags-v1',
        studyTarget: 'es',
        flagged: {
          'arena-es-fill_gap-1-0000': {
            taskId: 'different-task-id', reason: 'bad task', flaggedAtMs: 1, flaggedByUid: 'admin-1',
          },
        },
      }),
    }));

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({ es: 'spire_task_flags_invalid' });
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'spire_task_flags_invalid',
    }]);
    expect(poolGet).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test('a parser-coercible but noncanonical flag entry is still rejected', async () => {
    const { poolGet, save } = installFirebase(async () => ({
      exists: true,
      data: () => ({
        schemaVersion: 'spire-task-flags-v1',
        studyTarget: 'es',
        flagged: {
          '123': { taskId: 123, reason: 456, flaggedAtMs: 1, flaggedByUid: 789 },
        },
      }),
    }));

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({ es: 'spire_task_flags_invalid' });
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'spire_task_flags_invalid',
    }]);
    expect(poolGet).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test.each([
    ['reason whitespace normalization', { reason: ' bad task ' }],
    ['UID whitespace normalization', { flaggedByUid: ' admin-1 ' }],
    ['reason truncation', { reason: 'x'.repeat(401) }],
    ['unexpected entry field', { unexpected: true }],
  ])('rejects canonical-looking entries changed by %s', async (_label, override) => {
    const { poolGet, save } = installFirebase(async () => ({
      exists: true,
      data: () => ({
        schemaVersion: 'spire-task-flags-v1',
        studyTarget: 'es',
        flagged: {
          'arena-es-fill_gap-1-0000': {
            taskId: 'arena-es-fill_gap-1-0000',
            reason: 'bad task',
            flaggedAtMs: 1,
            flaggedByUid: 'admin-1',
            ...override,
          },
        },
      }),
    }));

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({ es: 'spire_task_flags_invalid' });
    expect(result.outcomes[0]).toMatchObject({ status: 'failed', reason: 'spire_task_flags_invalid' });
    expect(poolGet).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test('a valid existing flags document remains usable', async () => {
    installFirebase(async () => ({
      exists: true,
      data: () => ({
        schemaVersion: 'spire-task-flags-v1',
        studyTarget: 'es',
        flagged: {
          'arena-es-fill_gap-1-0000': {
            taskId: 'arena-es-fill_gap-1-0000', reason: 'bad task', flaggedAtMs: 1, flaggedByUid: 'admin-1',
          },
        },
      }),
    }));

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({});
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'pool_too_small',
    }]);
  });

  test('a flags snapshot that cannot be decoded blocks the language', async () => {
    const { poolGet, save } = installFirebase(async () => ({
      exists: true,
      data: () => { throw new Error('decode failed'); },
    }));

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({ es: 'spire_task_flags_invalid' });
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'spire_task_flags_invalid',
    }]);
    expect(poolGet).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test('a genuinely missing flags document still means no flags', async () => {
    installFirebase(async () => missingSnapshot());

    const result = await runOneLanguage();

    expect(result.unavailableLangs).toEqual({});
    expect(result.outcomes).toEqual([{
      lang: 'es', tier: 0, weekId: '2026-W40', status: 'failed', reason: 'pool_too_small',
    }]);
  });
});
