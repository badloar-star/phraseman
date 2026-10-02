/**
 * Account V2, Пакет 8M — сторож: списки карточек при серверном слиянии аккаунтов.
 * Чистые части: план объединения в страницы, решение об обнулении поля, mergeUserProgress.
 * Интеграция через outbox-джоб — в auth_merge.test.ts (общий стаб Firestore).
 */
import { mergeUserProgress } from './auth_merge';
import {
  chunkFlashcardsForPages,
  confirmedFlashcardKeysToNull,
  FLASHCARD_CARDS_PER_PAGE,
  FLASHCARD_LIST_KEY_SPECS,
  flashcardFieldFingerprint,
  planFlashcardListsMerge,
  unionFlashcards,
} from './auth_merge_flashcard_lists';

const NOW = 1_777_000_000_000;
const EN = 'flashcards_v1';
const FR = 'flashcards_v2::fr::flashcards_v1';
const LEGACY = 'flashcards';
const card = (id: string): Record<string, string> => ({ id, en: `en-${id}`, ru: `ru-${id}` });
const list = (...ids: string[]): string => JSON.stringify(ids.map(card));
const ids = (raw: string): string[] => (JSON.parse(raw) as Array<{ id: string }>).map((c) => c.id);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('8M: mergeUserProgress — список карточек проигравшего НЕ попадает в документ', () => {
  it('winner null + loser список, объединение подтверждено → null (список не попал)', () => {
    const out = mergeUserProgress({ [EN]: null }, { [EN]: list('a', 'b') }, NOW, {
      flashcardListKeysToNull: new Set([EN]),
    });
    expect(out[EN]).toBeNull();
  });

  it('winner null + loser список, без подтверждения → у победителя остаётся его null', () => {
    const out = mergeUserProgress({ [EN]: null }, { [EN]: list('a', 'b') }, NOW);
    expect(out[EN]).toBeNull();
  });

  it("winner 'null'-строка + loser список → не берётся список проигравшего", () => {
    const out = mergeUserProgress({ [EN]: 'null' }, { [EN]: list('a') }, NOW);
    expect(out[EN]).toBe('null');
  });

  it('winner absent + loser список, объединение подтверждено → null', () => {
    const out = mergeUserProgress({}, { [EN]: list('a'), [FR]: list('f') }, NOW, {
      flashcardListKeysToNull: new Set([EN, FR]),
    });
    expect(out[EN]).toBeNull();
    expect(out[FR]).toBeNull();
  });

  it('winner absent + loser список, без подтверждения → поле отсутствует (не список)', () => {
    const out = mergeUserProgress({}, { [EN]: list('a'), [FR]: list('f'), [LEGACY]: list('z') }, NOW);
    expect(EN in out).toBe(false);
    expect(FR in out).toBe(false);
    expect(LEGACY in out).toBe(false);
  });

  it('winner свой список, без подтверждения → остаётся его же список (не теряем, не берём чужой)', () => {
    const own = list('w1');
    const out = mergeUserProgress({ [EN]: own }, { [EN]: list('l1') }, NOW);
    expect(out[EN]).toBe(own);
  });

  it('древний flashcards: при подтверждении обнуляется (клиент 1.6.24 иначе взял бы его поверх страниц)', () => {
    const out = mergeUserProgress({ [EN]: null }, { [LEGACY]: list('old') }, NOW, {
      flashcardListKeysToNull: new Set([EN, LEGACY]),
    });
    expect(out[LEGACY]).toBeNull();
    expect(out[EN]).toBeNull();
  });

  it('ни у кого ключа нет → ключа нет в результате', () => {
    const out = mergeUserProgress({ user_total_xp: '1' }, { user_total_xp: '2' }, NOW, {
      flashcardListKeysToNull: new Set([EN, FR, LEGACY]),
    });
    expect(EN in out).toBe(false);
    expect(FR in out).toBe(false);
    expect(LEGACY in out).toBe(false);
  });

  it('ничьи нет: остальные ключи progress — как без карточек', () => {
    const w = { user_total_xp: '100', user_name: '', streak_count: '3', unlocked_lessons: '["l1"]' };
    const l = { user_total_xp: '50', user_name: 'Civi', streak_count: '9', other: 'x' };
    const base = mergeUserProgress(w, l, NOW);
    const withCards = mergeUserProgress(
      { ...w, [EN]: null, [FR]: list('f') },
      { ...l, [EN]: list('a'), [LEGACY]: list('z') },
      NOW,
      { flashcardListKeysToNull: new Set([EN]) },
    );
    const strip = (p: Record<string, unknown>) => Object.fromEntries(
      Object.entries(p).filter(([key]) => ![EN, FR, LEGACY].includes(key)),
    );
    expect(strip(withCards)).toEqual(base);
  });
});

describe('8M: план объединения карточек в страницы победителя', () => {
  const page = (target: 'en' | 'fr', index: number, cardIds: string[]) => ({
    id: `${target}_${String(index).padStart(4, '0')}`,
    data: { target, index, count: cardIds.length, cards: list(...cardIds), updatedAt: 1 },
  });

  it('страницы победителя + недостающие карточки проигравшего (его поле) без дублей', () => {
    const plans = planFlashcardListsMerge({
      winnerProgress: { [EN]: null },
      loserProgress: { [EN]: list('b', 'c', 'c') },
      winnerPages: [page('en', 0, ['a', 'b'])],
      loserPages: [],
    });
    const en = plans.find((p) => p.target === 'en');
    expect(en?.status).toBe('merged');
    if (en?.status !== 'merged') throw new Error('unreachable');
    expect(en.pages).toHaveLength(1);
    expect(ids(en.pages[0].cards)).toEqual(['a', 'b', 'c']);
    expect(en.loserAdded).toBe(1);
    expect(plans.find((p) => p.target === 'fr')?.status).toBe('empty');
  });

  it('источник проигравшего — его страницы; поле документа победителя тоже входит', () => {
    const plans = planFlashcardListsMerge({
      winnerProgress: { [FR]: list('w-field') },
      loserProgress: {},
      winnerPages: [page('fr', 0, ['w-page'])],
      loserPages: [page('fr', 0, ['l-page', 'w-page'])],
    });
    const fr = plans.find((p) => p.target === 'fr');
    if (fr?.status !== 'merged') throw new Error(`fr=${fr?.status}`);
    expect(ids(fr.pages[0].cards)).toEqual(['w-page', 'w-field', 'l-page']);
  });

  it('C-1: победитель flashcards_v1=null + страницы + древний с карточками → древние карточки в объединении, флаг covered', () => {
    const en = planFlashcardListsMerge({
      winnerProgress: { [EN]: null, [LEGACY]: list('old', 'a') },
      loserProgress: {},
      winnerPages: [page('en', 0, ['a'])],
      loserPages: [],
    }).find((p) => p.target === 'en');
    if (en?.status !== 'merged') throw new Error(`en=${en?.status}`);
    expect(ids(en.pages[0].cards)).toEqual(['a', 'old']);
    expect(en.winnerLegacyCovered).toBe(true);
  });

  it("C-1: победитель flashcards_v1='[]' + древний → древние карточки в объединении", () => {
    const en = planFlashcardListsMerge({
      winnerProgress: { [EN]: '[]', [LEGACY]: list('old') }, loserProgress: {}, winnerPages: [], loserPages: [],
    }).find((p) => p.target === 'en');
    if (en?.status !== 'merged') throw new Error(`en=${en?.status}`);
    expect(ids(en.pages[0].cards)).toEqual(['old']);
  });

  it('C-1: проигравший с древним (и с flashcards_v1=null) → его древние карточки в страницах победителя', () => {
    const en = planFlashcardListsMerge({
      winnerProgress: {}, loserProgress: { [EN]: null, [LEGACY]: list('l-old') }, winnerPages: [], loserPages: [],
    }).find((p) => p.target === 'en');
    if (en?.status !== 'merged') throw new Error(`en=${en?.status}`);
    expect(ids(en.pages[0].cards)).toEqual(['l-old']);
  });

  it('C-1: древний победителя не разобрался → язык всё равно объединён, но флаг covered=false', () => {
    const en = planFlashcardListsMerge({
      winnerProgress: { [LEGACY]: '{broken' }, loserProgress: { [EN]: list('x') }, winnerPages: [], loserPages: [],
    }).find((p) => p.target === 'en');
    if (en?.status !== 'merged') throw new Error(`en=${en?.status}`);
    expect(ids(en.pages[0].cards)).toEqual(['x']);
    expect(en.winnerLegacyCovered).toBe(false);
  });

  it('несколько страниц: хвост лишних страниц победителя удаляется', () => {
    const many = Array.from({ length: FLASHCARD_CARDS_PER_PAGE + 5 }, (_, i) => `l${i}`);
    const plans = planFlashcardListsMerge({
      winnerProgress: {},
      loserProgress: { [EN]: list(...many) },
      winnerPages: [page('en', 0, ['a']), page('en', 1, ['b']), page('en', 2, ['c']), page('fr', 0, ['f'])],
      loserPages: [],
    });
    const en = plans.find((p) => p.target === 'en');
    if (en?.status !== 'merged') throw new Error('unreachable');
    expect(en.pages.map((p) => p.id)).toEqual(['en_0000', 'en_0001']);
    expect(en.pages[0].count).toBe(FLASHCARD_CARDS_PER_PAGE);
    expect(en.staleIds).toEqual(['en_0002']);
    expect(en.total).toBe(many.length + 3);
  });

  it('повторный проход: страницы уже равны объединению → unchanged, без записи', () => {
    const plans = planFlashcardListsMerge({
      winnerProgress: { [EN]: null },
      loserProgress: { [EN]: list('a') },
      winnerPages: [page('en', 0, ['a', 'b'])],
      loserPages: [],
    });
    expect(plans.find((p) => p.target === 'en')?.status).toBe('unchanged');
  });

  it('битая страница или поле → язык пропускается (ничего не пишем, поле не обнулится)', () => {
    const broken = { id: 'en_0000', data: { target: 'en', index: 0, cards: '{oops' } };
    expect(planFlashcardListsMerge({
      winnerProgress: {}, loserProgress: { [EN]: list('a') }, winnerPages: [broken], loserPages: [],
    }).find((p) => p.target === 'en')).toEqual({ status: 'skipped', target: 'en', reason: 'winner_page_unusable' });
    expect(planFlashcardListsMerge({
      winnerProgress: {}, loserProgress: { [EN]: '{not json' }, winnerPages: [], loserPages: [],
    }).find((p) => p.target === 'en')).toEqual({ status: 'skipped', target: 'en', reason: 'loser_field_unparsable' });
  });

  it('union и chunk: дубли по id внутри стороны схлопываются, страница ≤200', () => {
    expect(unionFlashcards([card('a'), card('a')], [card('a'), card('b')])).toEqual({
      cards: [card('a'), card('b')], loserAdded: 1,
    });
    const chunks = chunkFlashcardsForPages(Array.from({ length: 401 }, (_, i) => card(String(i))));
    expect(chunks?.map((c) => (JSON.parse(c) as unknown[]).length)).toEqual([200, 200, 1]);
  });
});

describe('8M: решение об обнулении поля в транзакции публикации', () => {
  const record = (overrides: Record<string, unknown> = {}) => ({
    leaseToken: 'lease-1',
    mergedAt: NOW,
    targets: { en: { status: 'merged', winnerLegacyCovered: true }, fr: { status: 'empty', winnerLegacyCovered: true } },
    winnerFieldFingerprints: Object.fromEntries(FLASHCARD_LIST_KEY_SPECS.map((s) => [s.key, 'absent'])),
    ...overrides,
  });

  it('подтверждает ключи, если проход тот же и поле победителя не менялось', () => {
    expect([...confirmedFlashcardKeysToNull(record(), 'lease-1', {})].sort()).toEqual([LEGACY, EN, FR].sort());
  });

  it('чужой проход (другой leaseToken) или нет записи → ничего не обнуляем', () => {
    expect(confirmedFlashcardKeysToNull(record(), 'lease-2', {}).size).toBe(0);
    expect(confirmedFlashcardKeysToNull(null, 'lease-1', {}).size).toBe(0);
  });

  it('поле победителя изменилось после шага → этот ключ не обнуляется', () => {
    const out = confirmedFlashcardKeysToNull(record(), 'lease-1', { [EN]: list('new') });
    expect(out.has(EN)).toBe(false);
    expect(out.has(FR)).toBe(true);
  });

  it('язык пропущен шагом → его ключи не обнуляются', () => {
    const out = confirmedFlashcardKeysToNull(
      record({ targets: { en: { status: 'skipped', reason: 'loser_page_unusable' }, fr: { status: 'merged' } } }),
      'lease-1',
      {},
    );
    expect(out.has(EN)).toBe(false);
    expect(out.has(LEGACY)).toBe(false);
    expect(out.has(FR)).toBe(true);
  });

  it('C-1 (б): древнее поле не вошло в объединение → flashcards НЕ обнуляется, flashcards_v1 — да', () => {
    const out = confirmedFlashcardKeysToNull(
      record({ targets: { en: { status: 'merged', winnerLegacyCovered: false }, fr: { status: 'empty' } } }),
      'lease-1',
      {},
    );
    expect(out.has(LEGACY)).toBe(false);
    expect(out.has(EN)).toBe(true);
    // Флага нет вовсе (старая запись) — тоже не обнуляем.
    const noFlag = confirmedFlashcardKeysToNull(
      record({ targets: { en: { status: 'merged' }, fr: { status: 'empty' } } }),
      'lease-1',
      {},
    );
    expect(noFlag.has(LEGACY)).toBe(false);
  });

  it('отпечаток различает absent / null / значение', () => {
    expect(flashcardFieldFingerprint(undefined)).toBe('absent');
    expect(flashcardFieldFingerprint(null)).toBe('null');
    expect(flashcardFieldFingerprint(list('a'))).not.toBe(flashcardFieldFingerprint(list('b')));
  });
});
