// Governance-ID: TG-881446C70686
import { getPerWordDistracts, WORD_POOLS_L1 } from '../app/lesson1_smart_options';

// зачем (владелец/Теория 05.11, №43): в плитках итальянского появлялись английские fires/finish/favorite — это старые английские пулы
// приложения. Для курса любого языка, кроме en/es/fr, соблазны берутся ТОЛЬКО из курса. Сторож падает, если английский пул вернётся.

const ENGLISH = new Set<string>([
  ...WORD_POOLS_L1.nouns, ...WORD_POOLS_L1.verbs, ...WORD_POOLS_L1.adjectives,
  ...WORD_POOLS_L1.adverbs, ...WORD_POOLS_L1.prepositions, ...WORD_POOLS_L1.pronouns,
].map((w) => w.toLowerCase()));

function classicPhrase(words: Array<{ correct: string; distractors: string[]; category?: string }>) {
  return {
    id: 'it-l1-p1',
    english: 'I finish my work',
    russian: 'Я заканчиваю свою работу',
    classic: true,
    words: words.map((w) => ({ text: w.correct, correct: w.correct, distractors: w.distractors, category: w.category ?? '' })),
  } as never;
}

describe('соблазны плиток: чужой язык запрещён', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { log.mockRestore(); });

  test.each(['it', 'de'])('курс %s: только слова курса, без английских пулов', (target) => {
    const phrase = classicPhrase([
      { correct: 'finisco', distractors: ['comincio', 'lavoro', 'mangio', 'dormo', 'parlo'] },
      { correct: 'il', distractors: ['la', 'lo', 'un', 'una', 'gli'] },
      { correct: 'lavoro', distractors: ['casa', 'tempo', 'libro', 'amico', 'giorno'] },
    ]);
    const courseWords = new Set(['finisco', 'comincio', 'lavoro', 'mangio', 'dormo', 'parlo', 'il', 'la', 'lo', 'un', 'una', 'gli',
      'casa', 'tempo', 'libro', 'amico', 'giorno']);
    for (let i = 0; i < 3; i += 1) {
      const options = getPerWordDistracts(phrase, i, target as never);
      expect(options.length).toBeGreaterThan(0);
      expect(options.filter((w) => !courseWords.has(w.toLowerCase()))).toEqual([]);
      expect(options.filter((w) => ENGLISH.has(w.toLowerCase()) && !courseWords.has(w.toLowerCase()))).toEqual([]);
    }
  });

  test('если у курса мало соблазнов — плиток меньше, но не английских', () => {
    const phrase = classicPhrase([{ correct: 'finisco', distractors: ['comincio'] }]);
    const options = getPerWordDistracts(phrase, 0, 'it' as never);
    expect(options).toContain('finisco');
    expect(options.every((w) => !['fires', 'finish', 'favorite'].includes(w.toLowerCase()))).toBe(true);
    expect(options.length).toBeLessThanOrEqual(2);
  });

  test('журнал [TILE-SOURCE] показывает, что английские пулы не разрешены для итальянского', () => {
    const phrase = classicPhrase([{ correct: 'finisco', distractors: ['comincio', 'lavoro'] }]);
    getPerWordDistracts(phrase, 0, 'it' as never);
    const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.startsWith('[TILE-SOURCE]')) ?? '';
    expect(line).toContain('"englishPoolsAllowed":false');
    expect(line).toContain('"globalPool":0');
    expect(line).toContain('"categoryPool":0');
  });

  test('курс английского не затронут: английские пулы по-прежнему доступны', () => {
    const phrase = {
      id: 'en-l1-p1', english: 'I finish', russian: 'Я заканчиваю', classic: true,
      words: [{ text: 'finish', correct: 'finish', distractors: [], category: 'verb' }],
    } as never;
    const options = getPerWordDistracts(phrase, 0, 'en' as never);
    expect(options.length).toBeGreaterThan(2);
  });
});
