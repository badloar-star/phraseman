// зачем (координатор 28.10, жалоба Android: «Сохранённые карточки · Личный список · 187» → «Не удалось подготовить
// тренировку. Энергия возвращена.»): id сохранённой карточки = `${lang}_${source}_${en с _}_${ts}` и несёт апострофы,
// запятые, «?», «!» — сырой ключ свайпа не проходил ID_RE компактного manifest → invalid_input, а «Верно/Неверно»
// обхода не имеет. Тест гоняет РЕАЛЬНЫЙ валидатор: сырые ключи воспроизводят отказ, отпечатки проходят и
// восстанавливают все 187 карточек; плюс замок, что экран свайпа шлёт отпечатки, и формат события [CARDS-PREP].
import { readFileSync } from 'fs';
import { join } from 'path';

const mockMemory = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockMemory.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockMemory.delete(key); }),
    getAllKeys: jest.fn(async () => [...mockMemory.keys()]),
  };
  return { ...api, default: api };
});
jest.mock('../app/account_generation', () => ({
  isCurrentAccountGeneration: (token: { stableId: string | null; phase: string }) => (
    token.phase === 'active' && token.stableId === 'account-a'
  ),
  captureAccountGeneration: () => ({ stableId: 'account-a', generation: 1, phase: 'active' }),
  withAccountTransitionLock: async (work: (lease: object) => Promise<unknown>) => work({}),
}));
jest.mock('../app/revenue_quota_store', () => ({
  readFlashcardTrainingQuotaReceipts: async () => ({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] }),
}));
jest.mock('../app/energy_session_operation_ledger', () => ({
  createEnergySessionIntent: (kind: string, subjectId: string, attemptId: string) => ({
    operationId: `energy:${kind}:${attemptId}`,
    grant: { kind, subjectId, attemptId },
  }),
  readEnergySessionStartStatus: async () => ({ status: 'missing' }),
}));

import {
  prepareFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  type FlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantScope,
} from '../app/flashcard_training_pending_grant';
import { cardManifestId, manifestSeed } from '../app/flashcards/training_manifest_ids';
import { cardsPrepAction, cardsPrepErrorOutcome, cardsPrepSourcesTag } from '../app/flashcards/cards_prep_diagnostics';
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';

const PHRASES = ["i'm fine, thanks!", 'what time is it?', "don't worry", 'see you later', 'how much is it?', "let's go"];
// Тот же шаблон id, что в hooks/use-flashcards.ts addFlashcard; ключ свайпа = `${source.id}:${card.id}`.
const SAVED_KEYS = Array.from({ length: 187 }, (_, index) => {
  const en = PHRASES[index % PHRASES.length]!;
  return `saved:all:en_lesson_${en.replace(/\s+/g, '_').slice(0, 40)}_${1761600000000 + index}`;
});

const account = (): FlashcardTrainingPendingGrantAccount => ({
  stableUid: 'account-a',
  lineage: 7,
  runtimeToken: { stableId: 'account-a', generation: 1, phase: 'active' },
});
// Как в startSession: размер «все» = MAX_SAFE_INTEGER, preset «Верно/Неверно».
const scope = (): FlashcardTrainingPendingGrantScope => ({
  mode: 'swipe', studyTarget: 'en', contentLang: 'ru', deckKeys: ['saved:all'], sessionSize: Number.MAX_SAFE_INTEGER, preset: 'truefalse',
});
const attempt = 'fb_1761600000000_abc';
const prepareSwipe = (toId: (key: string) => string, seed: string) => prepareFlashcardTrainingPendingGrant({
  account: account(),
  scope: scope(),
  manifest: {
    schemaVersion: 'flashcard-training-manifest.v1',
    mode: 'swipe',
    payload: {
      orderedCardIds: SAVED_KEYS.map(toId),
      seed,
      promptRecipe: SAVED_KEYS.map((key, index) => ({ cardId: toId(key), direction: index % 2 ? 'back_to_front' : 'front_to_back' })),
      initialCardId: toId(SAVED_KEYS[0]!),
    },
  },
  attemptId: attempt,
  receiptId: `swipe:${attempt}`,
  energyOperationId: `energy:flashcards_swipe:${attempt}`,
  energyEpoch: attempt,
  nowMs: 1000,
});

beforeEach(() => {
  mockMemory.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

describe('личный список 187 карточек: подготовка свайпа', () => {
  test('воспроизведение: сырые ключи сохранённых карточек → invalid_input (то, что видел человек)', async () => {
    const result = await prepareSwipe((key) => key, attempt);
    expect(result).toEqual({ status: 'unavailable', reason: 'invalid_input' });
  });

  test('отпечатки ключей → prepared, и восстановление отдаёт все 187 карточек в том же порядке', async () => {
    const byManifestId = new Map(SAVED_KEYS.map((key) => [cardManifestId(key), key]));
    expect(byManifestId.size).toBe(SAVED_KEYS.length);
    const prepared = await prepareSwipe(cardManifestId, manifestSeed(attempt));
    expect(prepared.status).toBe('prepared');
    const reconciled = await reconcileFlashcardTrainingPendingGrant(account(), scope());
    expect(reconciled.status).toBe('found');
    if (reconciled.status !== 'found') return;
    const payload = reconciled.record.manifest.payload as unknown as { orderedCardIds: string[]; promptRecipe: { cardId: string }[] };
    expect(payload.orderedCardIds.map((id) => byManifestId.get(id))).toEqual(SAVED_KEYS);
    expect(payload.promptRecipe.every((recipe) => byManifestId.has(recipe.cardId))).toBe(true);
  });
});

describe('экран свайпа шлёт отпечатки, а не сырые ключи', () => {
  const swipe = readFileSync(join(__dirname, '../app/flashcards_swipe.tsx'), 'utf8');
  test('orderedCardIds / promptRecipe / initialCardId / seed', () => {
    expect(swipe).toContain('orderedCardIds: sessionCards.map((card) => cardManifestId(card.trainingKey))');
    expect(swipe).toContain('cardId: cardManifestId(prompt.card.trainingKey)');
    expect(swipe).toContain('initialCardId: cardManifestId(promptQueue[0]!.card.trainingKey)');
    expect(swipe).toContain('seed: manifestSeed(attemptSessionId)');
    expect(swipe).not.toContain('orderedCardIds: sessionCards.map((card) => card.trainingKey)');
  });
});

describe('[CARDS-PREP] событие журнала обращений', () => {
  test('действие проходит белый список схемы для каждого итога', () => {
    const outcomes = ['ok', 'fail_open', 'no_cards', 'quota_refused', 'energy_insufficient', 'error_invalid_input', 'error_storage',
      'error_capacity', 'error_account', 'error_manifest', 'error_settlement', 'error_other'] as const;
    for (const outcome of outcomes) {
      const action = cardsPrepAction('truefalse', cardsPrepSourcesTag(['saved', 'community']), 187, outcome);
      const event = sanitizeSupportDiagnosticEvent({ event: 'feature_action', action, screen: '/flashcards_swipe', result: 'blocked', subject: 'app', atMs: 1 });
      expect(event?.action).toBe(action);
      expect(event?.screen).toBe('/flashcards_swipe');
    }
  });

  test('сообщение ошибки → закрытое перечисление', () => {
    expect(cardsPrepErrorOutcome('pending_grant_unavailable:invalid_input')).toBe('error_invalid_input');
    expect(cardsPrepErrorOutcome('pending_grant_unavailable:storage_limit')).toBe('error_storage');
    expect(cardsPrepErrorOutcome('pending_grant_unavailable:capacity_committed')).toBe('error_capacity');
    expect(cardsPrepErrorOutcome('pending_grant_account_unavailable')).toBe('error_account');
    expect(cardsPrepErrorOutcome('pending_grant_manifest_cards_unavailable')).toBe('error_manifest');
    expect(cardsPrepErrorOutcome('pending_grant_claim_conflict')).toBe('error_settlement');
    expect(cardsPrepErrorOutcome('boom')).toBe('error_other');
  });

  test('размер и источники без id и текста', () => {
    expect(cardsPrepAction('swipe', cardsPrepSourcesTag([]), 5000, 'ok')).toBe('cards:prep:swipe:none:n999:ok');
    expect(cardsPrepSourcesTag(['saved', 'saved', 'custom'])).toBe('custom_saved');
  });
});
