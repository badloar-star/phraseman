/**
 * зачем (владелец 04.10, «Повторить исправленные»): подготовка сессии с pool:'corrected'.
 * Повтор и обычная отработка не подменяют друг друга при возобновлении: оплаченная обычная
 * сессия не открывается вместо повтора и наоборот. Экран передаёт pool, пишет review в журнал
 * и платит ценой повтора (1 монета).
 */
import fs from 'fs';
import path from 'path';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { captureObjectiveAttempt } from '../app/mistake_practice_capture';
import {
  commitPreparedMistakePracticeSession,
  prepareMistakePracticeSession,
} from '../app/mistake_practice_session_runtime';
import type { MistakePracticeStorage } from '../app/mistake_practice_store';

function createStorage(): MistakePracticeStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    getAllKeys: async () => [...values.keys()],
  };
}

const cards = Array.from({ length: 5 }, (_, index) => ({ id: `custom_${index}`, en: `word ${index}`, ru: `слово ${index}` }));
const deps = { loadCustomCards: async () => cards };

async function seed(accountScope: string, storage: MistakePracticeStorage): Promise<void> {
  beginAccountGeneration(accountScope);
  for (const [index, card] of cards.entries()) {
    await captureObjectiveAttempt({
      accountScope, attemptId: `wrong-${index}`, studyTarget: 'en', verdict: 'wrong', objective: true,
      content: { sourceKind: 'flashcard', sourceId: card.id, canonicalTarget: card.en, sourceMeaning: card.ru },
      facet: { kind: 'meaning', expected: card.en },
    }, { storage });
  }
}

const prepare = (storage: MistakePracticeStorage, pool?: 'active' | 'corrected') => prepareMistakePracticeSession({
  accountScope: 'owner-a', studyTarget: 'en', requestedLength: '5', persistSession: true, deferNewSessionSave: true, storage,
  ...(pool ? { pool } : {}),
}, deps);

describe('повтор исправленных: подготовка', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test('нет исправленных — повтор честно отказывает, обычная отработка работает как раньше', async () => {
    const storage = createStorage();
    await seed('owner-a', storage);
    await expect(prepare(storage, 'corrected')).rejects.toThrow('mistake_practice_no_ready_mistakes');
    const plain = await prepare(storage);
    expect(plain.session.initialCount).toBe(5);
    expect(plain.session).not.toHaveProperty('pool');
  });

  test('оплаченная обычная сессия не открывается вместо повтора, и сама продолжается как раньше', async () => {
    const storage = createStorage();
    await seed('owner-a', storage);
    const paid = await prepare(storage);
    await commitPreparedMistakePracticeSession({ accountScope: 'owner-a', studyTarget: 'en', session: paid.session, storage });
    // Повтор: у него своё место хранения — оплаченную обычную сессию он не видит и не стирает.
    await expect(prepare(storage, 'corrected')).rejects.toThrow('mistake_practice_no_ready_mistakes');
    const reopened = await prepare(storage);
    expect(reopened).toMatchObject({ resumed: true });
    expect(reopened.session.sessionId).toBe(paid.session.sessionId);
  });

  test('экран: pool из маршрута, review в журнал, цена повтора в копилке', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
    expect(src).toContain("const reviewPool = params.pool === 'corrected' ? 'corrected' as const : undefined;");
    expect(src).toContain("repeatPriceOnly: reviewPool === 'corrected',");
    expect(src).toContain('pool: reviewPool,');
    expect(src).toContain("...(session.pool === 'corrected' ? { review: true } : {}),");
    const hook = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'usePracticeRunes.ts'), 'utf8');
    expect(hook).toContain('const firstCompletion = input.repeatPriceOnly === true ? false : settledCount === 0;');
  });
});
