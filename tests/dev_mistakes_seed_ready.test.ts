// зачем (координатор 13.10, mistakes-panel-021): практика «Моих ошибок» требует ≥5 готовых ошибок; dev-подмена mistakes=demo засевает ими НАСТОЯЩИЙ журнал гостя той же записью, что пишет урок.
// Тест гоняет настоящие captureObjectiveAttempt + проекцию на памяти-заглушке: число готовых ≥5, повторный засев идемпотентен, в не-dev засев отказывает и ничего не пишет.
import {
  DEV_MISTAKES_SEED_ATTEMPTS,
  DEV_MISTAKES_SEED_TARGET,
  seedDevMistakesReady,
} from '../app/dev_mistakes_seed';
import { captureObjectiveAttempt } from '../app/mistake_practice_capture';
import { loadMistakeEventJournal, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { MISTAKE_PRACTICE_ENERGY_MIN_COUNT } from '../modules/mistake-practice/session';
import { projectMistakes } from '../modules/mistake-practice/projection';

const SCOPE = 'dev-seed-test-scope';

function memoryStorage(): MistakePracticeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

type SeedDeps = Parameters<typeof seedDevMistakesReady>[0];

function deps(storage: MistakePracticeStorage): SeedDeps {
  return {
    capture: (attempt) => captureObjectiveAttempt({ ...attempt, accountScope: SCOPE }, { storage }),
    countReady: async () => {
      const journal = await loadMistakeEventJournal({ accountScope: SCOPE, studyTarget: DEV_MISTAKES_SEED_TARGET, storage });
      const nowMs = Date.now();
      return [...projectMistakes(journal.events).items.values()].filter((item) => item.status === 'active' && item.dueAtMs <= nowMs).length;
    },
  };
}

describe('dev: засев журнала ошибок готовыми (mistakes=demo)', () => {
  const globalWithDev = globalThis as unknown as { __DEV__?: boolean };
  const originalDev = globalWithDev.__DEV__;
  afterEach(() => { globalWithDev.__DEV__ = originalDev; });

  it('даёт не меньше пяти готовых ошибок — порог практики', async () => {
    globalWithDev.__DEV__ = true;
    const storage = memoryStorage();
    const ready = await seedDevMistakesReady(deps(storage));
    expect(DEV_MISTAKES_SEED_ATTEMPTS.length).toBeGreaterThanOrEqual(MISTAKE_PRACTICE_ENERGY_MIN_COUNT);
    expect(ready).toBeGreaterThanOrEqual(MISTAKE_PRACTICE_ENERGY_MIN_COUNT);
    expect(ready).toBe(DEV_MISTAKES_SEED_ATTEMPTS.length);
  });

  it('повторный засев ничего не плодит', async () => {
    globalWithDev.__DEV__ = true;
    const storage = memoryStorage();
    const first = await seedDevMistakesReady(deps(storage));
    const second = await seedDevMistakesReady(deps(storage));
    expect(second).toBe(first);
  });

  it('пишет в журнал признак cloud: pushed|local_only', async () => {
    globalWithDev.__DEV__ = true;
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await seedDevMistakesReady({ ...deps(memoryStorage()), cloudState: async () => 'pushed' });
      const lines = log.mock.calls.map((call) => String(call[0]));
      expect(lines.some((line) => line.includes('mistakes seeded') && line.includes('cloud: pushed'))).toBe(true);
    } finally {
      log.mockRestore();
    }
  });

  it('в не-dev отказывает и журнал не трогает', async () => {
    globalWithDev.__DEV__ = false;
    const storage = memoryStorage();
    const ready = await seedDevMistakesReady(deps(storage));
    expect(ready).toBe(0);
    expect(storage.data.size).toBe(0);
  });
});
