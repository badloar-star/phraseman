/**
 * Гипотеза бага «Блиц: 28 из 30 до и после раунда» (DQA, 04.10). Отпечаток записи выдачи — только параметры
 * раунда (режим, язык, колода, размер), одинаковые для каждого раунда Блица на той же колоде. Если запись прошлого
 * раунда не очистилась (очистка требует playable + startInProgress + подтверждённый старт энергии), следующий раунд
 * получает ту же запись. Уточнено тестом: Блиц не делает claim старта, поэтому запись навсегда в фазе prepared,
 * и каждый новый раунд списывает лимит квитанцией ПЕРВОГО раунда — повтор, остаток не меняется.
 * Тест фиксирует механизм; починка — после воспроизведения логов [BLITZ-LIMIT].
 */
const mockMemory = new Map<string, string>();
const mockReadEnergyStatus = jest.fn();

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
  isCurrentAccountGeneration: (token: { stableId: string | null; phase: string }) => token.phase === 'active' && token.stableId === 'account-a',
  withAccountTransitionLock: async (work: (lease: object) => Promise<unknown>) => work({}),
}));
jest.mock('../app/revenue_quota_store', () => ({
  readFlashcardTrainingQuotaReceipts: jest.fn(async () => ({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] })),
}));
jest.mock('../app/energy_session_operation_ledger', () => ({
  createEnergySessionIntent: (kind: string, subjectId: string, attemptId: string) => ({ operationId: `energy:${kind}:${attemptId}`, grant: { kind, subjectId, attemptId } }),
  readEnergySessionStartStatus: (...args: unknown[]) => mockReadEnergyStatus(...args),
}));

import {
  acknowledgeAndClearFlashcardTrainingPendingGrant,
  markFlashcardTrainingPendingGrantPlayable,
  markFlashcardTrainingQuotaCommitted,
  prepareFlashcardTrainingPendingGrant,
  type FlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantScope,
} from '../app/flashcard_training_pending_grant';
import { createMonthlyTrainingSessionAccess } from '../app/monthly_training_sessions';

const account: FlashcardTrainingPendingGrantAccount = {
  stableUid: 'account-a',
  lineage: 7,
  runtimeToken: { stableId: 'account-a', generation: 1, phase: 'active' },
};
// Тот же scope, что строит Блиц: колода, язык, «бесконечный» размер, пресет blitz.
const blitzScope: FlashcardTrainingPendingGrantScope = {
  mode: 'swipe',
  studyTarget: 'en',
  contentLang: 'ru',
  deckKeys: ['saved'],
  sessionSize: 10,
  preset: 'trainer',
};
const manifest = { schemaVersion: 'flashcard-training-manifest.v1' as const, mode: 'swipe' as const, payload: { orderedCardIds: ['card-1', 'card-2'], seed: 'seed-1' } };

const prepareRound = (round: number) => prepareFlashcardTrainingPendingGrant({
  account,
  scope: blitzScope,
  manifest,
  attemptId: `attempt-${round}`,
  receiptId: `blitz:attempt-${round}`,
  energyOperationId: `energy:flashcards_blitz:attempt-${round}`,
  energyEpoch: `boot-${round}`,
  nowMs: 100 * round,
});
/** Решение Блица (flashcards_blitz_session.tsx): списывать лимит только для новой записи. */
const blitzWillConsume = (phase: string): boolean => phase === 'prepared';

beforeEach(() => {
  mockMemory.clear();
  mockReadEnergyStatus.mockReset();
  mockReadEnergyStatus.mockResolvedValue({ status: 'missing' });
});

test('round 1 is prepared and consumes the monthly allowance', async () => {
  const first = await prepareRound(1);
  expect(first.status).toBe('prepared');
  if (first.status !== 'prepared') throw new Error('expected prepared');
  expect(blitzWillConsume(first.record.phase)).toBe(true);
});

test('Blitz never claims the start: the record stays prepared, round 2 reuses round 1 receipt and the monthly count does not move', async () => {
  // Монетный счётчик — настоящий модуль лимита на памяти.
  const quotaMemory = new Map<string, string>();
  const quota = createMonthlyTrainingSessionAccess({
    now: () => Date.UTC(2026, 9, 4, 12),
    timeZone: () => 'UTC',
    isCurrentAccount: () => true,
    storage: {
      getItem: async (key: string) => quotaMemory.get(key) ?? null,
      setItem: async (key: string, value: string) => { quotaMemory.set(key, value); },
    } as never,
  });
  const token = { stableId: 'account-a', generation: 1, phase: 'active' } as never;

  const first = await prepareRound(1);
  if (first.status !== 'prepared') throw new Error('expected prepared');
  const firstQuota = await quota.consume({ token, receiptId: first.record.receiptId, mode: 'blitz' });
  expect(firstQuota.used).toBe(1);

  // Как в flashcards_blitz_session.tsx: без claimFlashcardTrainingPendingGrantStart переходы фаз отвергаются…
  expect((await markFlashcardTrainingQuotaCommitted(account, first.record.fingerprint, 150, null)).status).toBe('claim_required');
  expect((await markFlashcardTrainingPendingGrantPlayable(account, first.record.fingerprint, 160)).status).toBe('claim_required');
  // …и очистка при старте раунда запись не удаляет (Блиц игнорирует этот статус).
  expect((await acknowledgeAndClearFlashcardTrainingPendingGrant(account, first.record.fingerprint, async () => true)).status).not.toBe('cleared');

  const second = await prepareRound(2);
  expect(second.status).toBe('reused');
  if (second.status !== 'reused') throw new Error('expected reused');
  expect(second.record.phase).toBe('prepared');
  expect(blitzWillConsume(second.record.phase)).toBe(true);
  // Новый раунд несёт квитанцию первого — списание считается повтором, остаток не меняется («28 из 30» до и после).
  expect(second.record.receiptId).toBe('blitz:attempt-1');
  const secondQuota = await quota.consume({ token, receiptId: second.record.receiptId, mode: 'blitz' });
  expect(secondQuota.used).toBe(1);
  expect(secondQuota.bypass).toBe('idempotent');
});
