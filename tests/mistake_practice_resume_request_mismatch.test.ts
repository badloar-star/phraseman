/**
 * «Мои ошибки» (координатор 13.10, mistakes-panel-017 «из 12 ошибок собирается 1 задание»).
 *
 * зачем: окно «Перед отработкой» открывает сессию по группе ошибок (facetGroup), а сохранённая сессия не помнила, под какой
 * запрос её собрали. Человек начал «Грамматика 1», вышел, нажал «Все 12» — и продолжалась старая сессия из одного задания.
 */
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

const cards = Array.from({ length: 6 }, (_, index) => ({ id: `custom_${index}`, en: `word ${index}`, ru: `слово ${index}` }));
const deps = { loadCustomCards: async () => cards };

async function seed(accountScope: string, storage: MistakePracticeStorage): Promise<void> {
  beginAccountGeneration(accountScope);
  for (const [index, card] of cards.entries()) {
    await captureObjectiveAttempt({
      accountScope, attemptId: `wrong-${index}`, studyTarget: 'en', verdict: 'wrong', objective: true,
      content: { sourceKind: 'flashcard', sourceId: card.id, canonicalTarget: card.en, sourceMeaning: card.ru, tokens: card.en.split(' ') },
      // одна ошибка порядка слов, пять — значения
      facet: index === 0 ? { kind: 'word_order' } : { kind: 'meaning', expected: card.en },
    }, { storage });
  }
}

const prepareAll = (storage: MistakePracticeStorage, facets?: readonly ('word_order' | 'meaning')[]) => prepareMistakePracticeSession({
  accountScope: 'owner-a', studyTarget: 'en', requestedLength: 'all', persistSession: true, deferNewSessionSave: true,
  ...(facets ? { facets } : {}), storage,
}, deps);

describe('mistake practice: «Все N» не продолжает сессию, собранную под другой запрос', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { __resetAccountGenerationForTests(); jest.restoreAllMocks(); });

  test('сессия группы из 1 ошибки, выход, затем «Все» без группы → новая сессия на все готовые', async () => {
    const storage = createStorage();
    await seed('owner-a', storage);
    const group = await prepareAll(storage, ['word_order']);
    expect(group.session.queue).toHaveLength(1);
    await commitPreparedMistakePracticeSession({ accountScope: 'owner-a', studyTarget: 'en', session: group.session, storage });

    const all = await prepareAll(storage);
    expect(all.resumed).toBe(false);
    expect(all.session.queue).toHaveLength(6);
  });

  test('тот же запрос после выхода — продолжение (оплаченная сессия не теряется)', async () => {
    const storage = createStorage();
    await seed('owner-a', storage);
    const first = await prepareAll(storage);
    await commitPreparedMistakePracticeSession({ accountScope: 'owner-a', studyTarget: 'en', session: first.session, storage });
    const again = await prepareAll(storage);
    expect(again.resumed).toBe(true);
    expect(again.session.sessionId).toBe(first.session.sessionId);
  });
});
