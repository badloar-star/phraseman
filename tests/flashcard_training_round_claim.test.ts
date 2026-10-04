/**
 * Лимит тренировок (04.10): Блиц/«Вспомни»/«Устно» делают claim старта, как свайп, — запись выдачи проходит
 * prepared → quota_committed → playable → очищена, и следующий раунд на той же колоде получает НОВУЮ квитанцию.
 * Цепочка экрана воспроизведена шагами модуля: prepare → reconcile → claim → энергия → consume → commit → playable → clear.
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
  abandonFlashcardTrainingPendingGrant,
  acknowledgeAndClearFlashcardTrainingPendingGrant,
  claimFlashcardTrainingRoundStart,
  markFlashcardTrainingEnergyCharged,
  markFlashcardTrainingPendingGrantPlayable,
  markFlashcardTrainingQuotaCommitted,
  prepareFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  type FlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantMode,
  type FlashcardTrainingPendingGrantScope,
} from '../app/flashcard_training_pending_grant';
import { createMonthlyTrainingSessionAccess } from '../app/monthly_training_sessions';

const account: FlashcardTrainingPendingGrantAccount = {
  stableUid: 'account-a',
  lineage: 7,
  runtimeToken: { stableId: 'account-a', generation: 1, phase: 'active' },
};
const scopeFor = (mode: FlashcardTrainingPendingGrantMode): FlashcardTrainingPendingGrantScope => ({
  mode: 'swipe',
  studyTarget: 'en',
  contentLang: 'ru',
  deckKeys: [`pack:${mode}`],
  sessionSize: 10,
  preset: 'trainer',
});
const manifest = { schemaVersion: 'flashcard-training-manifest.v1' as const, mode: 'swipe' as const, payload: { orderedCardIds: ['card-1', 'card-2'], seed: 'seed-1' } };

function makeQuota() {
  const quotaMemory = new Map<string, string>();
  return createMonthlyTrainingSessionAccess({
    now: () => Date.UTC(2026, 9, 4, 12),
    timeZone: () => 'UTC',
    isCurrentAccount: () => true,
    storage: {
      getItem: async (key: string) => quotaMemory.get(key) ?? null,
      setItem: async (key: string, value: string) => { quotaMemory.set(key, value); },
    } as never,
  });
}
const token = { stableId: 'account-a', generation: 1, phase: 'active' } as never;

/** Цепочка старта раунда так, как её делают экраны после починки (энергия списана, Free). */
async function playRound(mode: FlashcardTrainingPendingGrantMode, round: number, quota: ReturnType<typeof makeQuota>) {
  const attemptId = `${mode}-attempt-${round}`;
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account,
    scope: scopeFor(mode),
    manifest,
    attemptId,
    receiptId: `${mode}:${attemptId}`,
    energyOperationId: `energy:flashcards_${mode}:${attemptId}`,
    energyEpoch: `boot-${round}`,
  });
  if (prepared.status !== 'prepared' && prepared.status !== 'reused') throw new Error(`prepare_${prepared.status}`);
  // До старта раунда сервер ещё не видел подтверждения старта энергии.
  mockReadEnergyStatus.mockResolvedValue({ status: 'missing' });
  const reconciled = await reconcileFlashcardTrainingPendingGrant(account, scopeFor(mode));
  if (reconciled.status !== 'found') throw new Error(`reconcile_${reconciled.status}`);
  let record = await claimFlashcardTrainingRoundStart({ account, record: reconciled.record, mode, currentAttemptId: attemptId });
  const charged = await markFlashcardTrainingEnergyCharged(account, record.fingerprint);
  if ('record' in charged) record = charged.record;
  let quotaResult = null;
  if (record.phase === 'prepared') {
    quotaResult = await quota.consume({ token, receiptId: record.receiptId, mode });
    const committed = await markFlashcardTrainingQuotaCommitted(account, record.fingerprint, Date.now(), quotaResult.resetAt);
    expect(committed.status).toBe('quota_committed');
  }
  const playable = await markFlashcardTrainingPendingGrantPlayable(account, record.fingerprint);
  expect(playable.status).toBe('playable');
  // Экран подтвердил старт энергии (acknowledgeSessionStart) — сервер его видит.
  mockReadEnergyStatus.mockResolvedValue({ status: 'acknowledged' });
  const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(account, record.fingerprint, async () => true);
  return { prepared: prepared.status, quotaResult, cleared: cleared.status, receiptId: record.receiptId };
}

beforeEach(() => {
  mockMemory.clear();
  mockReadEnergyStatus.mockReset();
  mockReadEnergyStatus.mockResolvedValue({ status: 'missing' });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test.each(['blitz', 'recall', 'speaking'] as const)('%s: two rounds in a row on the same deck spend the monthly allowance twice', async (mode) => {
  const quota = makeQuota();
  const first = await playRound(mode, 1, quota);
  expect(first).toMatchObject({ prepared: 'prepared', cleared: 'cleared' });
  expect(first.quotaResult?.used).toBe(1);

  const second = await playRound(mode, 2, quota);
  // Запись первого раунда очищена → второй раунд готовит СВОЮ запись с новой квитанцией.
  expect(second.prepared).toBe('prepared');
  expect(second.receiptId).not.toBe(first.receiptId);
  expect(second.quotaResult?.used).toBe(2);
  expect(second.quotaResult?.bypass).toBeNull();
});

test('a double tap on «Start» with the same receipt spends the allowance once', async () => {
  const quota = makeQuota();
  const [a, b] = await Promise.all([
    quota.consume({ token, receiptId: 'blitz:double-tap', mode: 'blitz' }),
    quota.consume({ token, receiptId: 'blitz:double-tap', mode: 'blitz' }),
  ]);
  expect([a.used, b.used].sort()).toEqual([1, 1]);
  expect((await quota.preview({ token })).used).toBe(1);
});

test('leaving before the first card refunds the energy exactly once', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account,
    scope: scopeFor('blitz'),
    manifest,
    attemptId: 'blitz-attempt-exit',
    receiptId: 'blitz:blitz-attempt-exit',
    energyOperationId: 'energy:flashcards_blitz:blitz-attempt-exit',
    energyEpoch: 'boot-exit',
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  const record = await claimFlashcardTrainingRoundStart({ account, record: prepared.record, mode: 'blitz', currentAttemptId: 'blitz-attempt-exit' });
  await markFlashcardTrainingEnergyCharged(account, record.fingerprint);

  const refund = jest.fn(async () => undefined);
  const first = await abandonFlashcardTrainingPendingGrant(account, record.fingerprint, refund, Date.now(), 'entry_cancelled');
  const second = await abandonFlashcardTrainingPendingGrant(account, record.fingerprint, refund, Date.now(), 'entry_cancelled');
  expect(first.status).toBe('refunded');
  expect(second.status).toBe('nothing_to_refund');
  expect(refund).toHaveBeenCalledTimes(1);
});

test('a record left prepared by an old build is logged as stale and still goes through the chain', async () => {
  const quota = makeQuota();
  // Старая сборка: подготовила запись и не сделала claim.
  const old = await prepareFlashcardTrainingPendingGrant({
    account, scope: scopeFor('blitz'), manifest, attemptId: 'old-attempt', receiptId: 'blitz:old-attempt',
    energyOperationId: 'energy:flashcards_blitz:old-attempt', energyEpoch: 'boot-old',
  });
  expect(old.status).toBe('prepared');
  const round = await playRound('blitz', 9, quota);
  expect(round.prepared).toBe('reused');
  expect(round.cleared).toBe('cleared');
  expect(console.warn).toHaveBeenCalledWith('[BLITZ-LIMIT] stale_prepared', expect.any(String));
});
