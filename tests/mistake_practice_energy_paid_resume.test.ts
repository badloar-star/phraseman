/**
 * §123 (координатор 04.10): продолжение без списания энергии — только для сессии, за которую
 * энергия реально списана. Подготовка с deferNewSessionSave НЕ сохраняет новую сессию; экран
 * сохраняет её через commitPreparedMistakePracticeSession лишь после оплаты.
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
import { loadMistakePracticeSession } from '../app/mistake_practice_session_store';

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

const prepare = (accountScope: string, storage: MistakePracticeStorage) => prepareMistakePracticeSession({
  accountScope, studyTarget: 'en', requestedLength: '5', persistSession: true, deferNewSessionSave: true, storage,
}, deps);

describe('mistake practice: resume without energy only for a paid session (§123)', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test('cancelled energy prompt → nothing saved → next entry is a NEW session (asks energy again)', async () => {
    const storage = createStorage();
    await seed('owner-a', storage);
    const first = await prepare('owner-a', storage);
    expect(first).toMatchObject({ resumed: false, needsSave: true });
    // Человек отменил окно энергии: экран НЕ вызывает commit.
    expect(await loadMistakePracticeSession({ accountScope: 'owner-a', studyTarget: 'en', storage })).toBeNull();
    const second = await prepare('owner-a', storage);
    expect(second.resumed).toBe(false);
    expect(second.needsSave).toBe(true);
  });

  test('paid and interrupted (exit/restart) → resumed without a second charge', async () => {
    const storage = createStorage();
    await seed('owner-a', storage);
    const first = await prepare('owner-a', storage);
    await commitPreparedMistakePracticeSession({ accountScope: 'owner-a', studyTarget: 'en', session: first.session, storage });
    const reopened = await prepare('owner-a', storage);
    expect(reopened).toMatchObject({ resumed: true, needsSave: false });
    expect(reopened.session.sessionId).toBe(first.session.sessionId);
  });

  test('screen: save only after spent/unlimited; cancelled/insufficient leave without saving; one operationId per mount', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
    expect(src).toContain('deferNewSessionSave: true');
    const cancelAt = src.indexOf("energyResult === 'cancelled' || energyResult === 'insufficient'");
    const commitAt = src.indexOf('await commitPreparedMistakePracticeSession(');
    expect(cancelAt).toBeGreaterThan(-1);
    // Сохранение стоит ПОСЛЕ ветки отмены (отменённая сессия до него не доходит).
    expect(commitAt).toBeGreaterThan(cancelAt);
    expect(src).toContain("'[MISTAKES-GATE] session:energy_result'");
    expect(src).toContain("'[MISTAKES-GATE] session:not_paid → not saved'");
    // Двойной тап «подтвердить» → одно списание: намерение (operationId) одно на монтирование экрана.
    expect(src).toMatch(/const \[attemptSessionId\] = useState\(makeFeedbackAttemptId\)/);
    expect(src).toContain("useEnergySessionIntent('mistake_practice', studyTarget, attemptSessionId)");
  });
});
