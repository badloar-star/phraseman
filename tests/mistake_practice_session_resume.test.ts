import { loadMistakePracticeSession, saveMistakePracticeSession } from '../app/mistake_practice_session_store';
import { beginAccountGeneration } from '../app/account_generation';

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: async (key: string) => map.get(key) ?? null,
    setItem: async (key: string, value: string) => { map.set(key, value); },
    removeItem: async (key: string) => { map.delete(key); },
  };
};

const snapshot = {
  version: 1 as const,
  sessionId: 'resume-me',
  startedAtMs: 10,
  initialCount: 5,
  cursor: 1,
  queue: [],
  failureCounts: {},
  answeredAttemptIds: ['once'],
};

describe('mistake session resume', () => {
  test('restores only the matching account and target', async () => {
    const storage = memory();
    await saveMistakePracticeSession({ accountScope: 'a', studyTarget: 'en', session: snapshot, storage });
    await expect(loadMistakePracticeSession({ accountScope: 'a', studyTarget: 'en', storage })).resolves.toEqual(snapshot);
    await expect(loadMistakePracticeSession({ accountScope: 'b', studyTarget: 'en', storage })).resolves.toBeNull();
    await expect(loadMistakePracticeSession({ accountScope: 'a', studyTarget: 'fr', storage })).resolves.toBeNull();
  });

  test('uses physically different keys for different owners', async () => {
    const storage = memory();
    await saveMistakePracticeSession({ accountScope: 'a', studyTarget: 'en', session: snapshot, storage });
    await saveMistakePracticeSession({ accountScope: 'b', studyTarget: 'en', session: { ...snapshot, sessionId: 'b' }, storage });
    await expect(loadMistakePracticeSession({ accountScope: 'a', studyTarget: 'en', storage })).resolves.toEqual(snapshot);
    await expect(loadMistakePracticeSession({ accountScope: 'b', studyTarget: 'en', storage })).resolves.toMatchObject({ sessionId: 'b' });
  });

  test('rejects a deferred owner-A read after the active account switches to B', async () => {
    const values = new Map<string, string>();
    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
    const storage = {
      getItem: async (key: string) => {
        await readGate;
        return values.get(key) ?? null;
      },
      setItem: async (key: string, value: string) => { values.set(key, value); },
      removeItem: async (key: string) => { values.delete(key); },
    };
    beginAccountGeneration('a');
    await saveMistakePracticeSession({ accountScope: 'a', studyTarget: 'en', session: snapshot, storage });
    const pending = loadMistakePracticeSession({ accountScope: 'a', studyTarget: 'en', storage });
    beginAccountGeneration('b');
    releaseRead();
    await expect(pending).rejects.toThrow('stale_account_generation');
  });
});
