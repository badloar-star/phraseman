// зачем (дыра в экономике 03.10): Блиц/«Вспомни»/«Устно» слали в prepareFlashcardTrainingPendingGrant ПОЛНЫЕ
// объекты → invalid_input → fail-open → энергия и месячный лимит не списывались. Эти тесты гоняют РЕАЛЬНЫЙ
// валидатор модуля на реальных payload трёх экранов и проверяют помощники отпечатков и интента энергии.
const mockMemory = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => mockMemory.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => { mockMemory.set(key, value); });
const mockRemoveItem = jest.fn(async (key: string) => { mockMemory.delete(key); });
const mockGetAllKeys = jest.fn(async () => [...mockMemory.keys()]);
const mockReadQuotaReceipts = jest.fn();
const mockReadEnergyStatus = jest.fn();
const mockCreateEnergyIntent = jest.fn((kind: string, subjectId: string, attemptId: string) => ({
  operationId: `energy:${kind}:${attemptId}`,
  grant: { kind, subjectId, attemptId },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = { getItem: mockGetItem, setItem: mockSetItem, removeItem: mockRemoveItem, getAllKeys: mockGetAllKeys };
  return { ...api, default: api };
});
jest.mock('../app/account_generation', () => ({
  isCurrentAccountGeneration: (token: { stableId: string | null; phase: string }) => (
    token.phase === 'active' && token.stableId === 'account-a'
  ),
  withAccountTransitionLock: async (work: (lease: object) => Promise<unknown>) => work({}),
}));
jest.mock('../app/revenue_quota_store', () => ({
  readFlashcardTrainingQuotaReceipts: (...args: unknown[]) => mockReadQuotaReceipts(...args),
}));
jest.mock('../app/energy_session_operation_ledger', () => ({
  createEnergySessionIntent: (...args: unknown[]) => mockCreateEnergyIntent(...args as [string, string, string]),
  readEnergySessionStartStatus: (...args: unknown[]) => mockReadEnergyStatus(...args),
}));

import {
  claimFlashcardTrainingPendingGrantStart,
  markFlashcardTrainingEnergyCharged,
  prepareFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  type FlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantScope,
} from '../app/flashcard_training_pending_grant';
import {
  buildManifestCardIndex,
  cardManifestId,
  manifestSeed,
  restoreManifestCards,
  toManifestIds,
} from '../app/flashcards/training_manifest_ids';
import { resolveEnergyIntentForRecord } from '../app/flashcards/training_energy_intent';

// Тот же шаблон, что ID_RE в валидаторе (валидатор НЕ ослаблялся).
const ID_RE = /^[A-Za-z0-9_.:@/-]{1,180}$/;

const account = (): FlashcardTrainingPendingGrantAccount => ({
  stableUid: 'account-a',
  lineage: 7,
  runtimeToken: { stableId: 'account-a', generation: 1, phase: 'active' },
});
const scope = (mode: FlashcardTrainingPendingGrantScope['mode'], preset: string): FlashcardTrainingPendingGrantScope => ({
  mode, studyTarget: 'en', contentLang: 'ru', deckKeys: ['saved'], sessionSize: 10, preset,
});

type Card = { id: string; en: string; translation: string };
// Сырые id, которые НЕ проходят ID_RE: пробелы, кириллица, эмодзи.
const POOL: Card[] = [
  { id: 'custom:слово один', en: 'one', translation: 'один' },
  { id: 'saved card 2', en: 'two', translation: 'два' },
  { id: 'pack:абв/3', en: 'three', translation: 'три' },
  { id: '😀 4', en: 'four', translation: 'четыре' },
];

const prepare = (
  mode: FlashcardTrainingPendingGrantScope['mode'],
  payload: Record<string, unknown>,
  attempt = 'attempt-1',
  preset: string = mode,
) => prepareFlashcardTrainingPendingGrant({
  account: account(),
  scope: scope(mode, preset),
  manifest: { schemaVersion: 'flashcard-training-manifest.v1', mode, payload: payload as never },
  attemptId: attempt,
  receiptId: `${mode}:${attempt}`,
  energyOperationId: `energy:flashcards_${mode}:${attempt}`,
  energyEpoch: attempt,
  nowMs: 1000,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  mockMemory.clear();
  mockReadQuotaReceipts.mockResolvedValue({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] });
  mockReadEnergyStatus.mockResolvedValue({ status: 'missing' });
});
afterEach(() => { jest.restoreAllMocks(); });

describe('отпечатки id', () => {
  test('детерминизм и формат ID_RE даже для пробелов, кириллицы и эмодзи', () => {
    for (const card of POOL) {
      const fp = cardManifestId(card.id);
      expect(fp).toBe(cardManifestId(card.id));
      expect(ID_RE.test(fp)).toBe(true);
      expect(ID_RE.test(card.id)).toBe(false);
    }
    expect(new Set(POOL.map((c) => cardManifestId(c.id))).size).toBe(POOL.length);
    expect(cardManifestId('a')).not.toBe(cardManifestId('b'));
  });

  test('seed: годный id остаётся, негодный становится отпечатком', () => {
    expect(manifestSeed('attempt:1_x')).toBe('attempt:1_x');
    expect(ID_RE.test(manifestSeed('попытка №1'))).toBe(true);
  });

  test('разные сырые id с одним отпечатком — ошибка коллизии; одинаковые id — не коллизия', () => {
    const weak = () => 'fc_same';
    expect(() => buildManifestCardIndex(POOL, weak)).toThrow('pending_grant_manifest_id_collision');
    const dup = [POOL[0]!, { ...POOL[0]! }];
    expect(() => buildManifestCardIndex(dup)).not.toThrow();
  });

  test('восстановление даёт ТЕ ЖЕ карточки в том же порядке; чужой отпечаток — cards_unavailable', () => {
    const index = buildManifestCardIndex(POOL);
    const order = [POOL[2]!, POOL[0]!, POOL[3]!];
    expect(restoreManifestCards<Card>(toManifestIds(order), index)).toEqual(order);
    expect(() => restoreManifestCards<Card>([...toManifestIds(order), 'fc_ffffffffffffffff'], index))
      .toThrow('pending_grant_manifest_cards_unavailable');
    expect(() => restoreManifestCards<Card>([], index)).toThrow('pending_grant_manifest_cards_unavailable');
    expect(() => restoreManifestCards<Card>(undefined, index)).toThrow('pending_grant_manifest_cards_unavailable');
  });
});

describe('prepare принимает реальные payload трёх экранов (валидатор не ослаблен)', () => {
  const ids = toManifestIds(POOL);

  test('СТАРЫЕ полные объекты по-прежнему отвергаются с field=manifest (это и была дыра)', async () => {
    const blitz = await prepare('blitz', { pool: POOL, roundQueue: POOL, initialQuestion: {}, energyIntent: {} });
    const recall = await prepare('recall', { round: POOL, energyIntent: {} });
    const speaking = await prepare('speaking', { cards: POOL, prefs: { task: 'recall' }, energyIntent: {} }, 'a', 'recall');
    for (const result of [blitz, recall, speaking]) {
      expect(result).toEqual({ status: 'unavailable', reason: 'invalid_input' });
    }
    const logged = (console.warn as jest.Mock).mock.calls.map((c) => String(c[1] ?? '')).join('\n');
    expect(logged).toContain('"field":"manifest(');
  });

  test('blitz компактный', async () => {
    const result = await prepare('blitz', {
      orderedCardIds: ids,
      roundCardIds: [...ids].reverse(),
      seed: manifestSeed('feedback:0'),
      initialCardId: ids[3],
    });
    expect(result.status).toBe('prepared');
  });

  test('recall компактный', async () => {
    const result = await prepare('recall', { orderedCardIds: ids, seed: manifestSeed('attempt-1') });
    expect(result.status).toBe('prepared');
  });

  test('speaking компактный (task из prefs)', async () => {
    const result = await prepare('speaking', { orderedCardIds: ids, seed: manifestSeed('attempt-1'), task: 'repeat' }, 'attempt-1', 'repeat');
    expect(result.status).toBe('prepared');
  });

  test('сырые id с пробелами/кириллицей в manifest ПО-ПРЕЖНЕМУ отвергаются (поэтому нужны отпечатки)', async () => {
    const result = await prepare('recall', { orderedCardIds: POOL.map((c) => c.id), seed: 'attempt-1' });
    expect(result).toEqual({ status: 'unavailable', reason: 'invalid_input' });
  });

  test('блиц: initialCardId вне пула и неизвестный ключ отвергаются', async () => {
    expect((await prepare('blitz', {
      orderedCardIds: ids, roundCardIds: ids, seed: 's', initialCardId: 'fc_0000000000000000',
    })).status).toBe('unavailable');
    expect((await prepare('recall', { orderedCardIds: ids, seed: 's', energyIntent: {} })).status).toBe('unavailable');
  });
});

describe('интент энергии под запись журнала (без двойного списания)', () => {
  const ids = toManifestIds(POOL);
  const screen = { screenKind: 'flashcards_recall', screenSubjectId: 'saved', mode: 'recall' } as const;
  const intentOf = (attempt: string) => mockCreateEnergyIntent('flashcards_recall', 'saved', attempt);

  test('запись текущей попытки → текущий интент', async () => {
    const prepared = await prepare('recall', { orderedCardIds: ids, seed: 's' }, 'attempt-1');
    if (prepared.status !== 'prepared') throw new Error('expected prepared');
    const current = intentOf('attempt-1');
    const record = { ...prepared.record, energyOperationId: current.operationId, energyKind: 'flashcards_recall' };
    expect(resolveEnergyIntentForRecord({ record, currentIntent: current, ...screen })).toBe(current);
  });

  test('reused от прежней попытки: интент пересобирается под ПРЕЖНЮЮ операцию, а не новую', async () => {
    const first = await prepare('recall', { orderedCardIds: ids, seed: 's' }, 'attempt-old');
    if (first.status !== 'prepared') throw new Error('expected prepared');
    const reused = await prepare('recall', { orderedCardIds: ids, seed: 's2' }, 'attempt-new');
    expect(reused.status).toBe('reused');
    if (reused.status !== 'reused') throw new Error('expected reused');
    const current = intentOf('attempt-new');
    expect(reused.record.energyOperationId).not.toBe(current.operationId);
    const resolved = resolveEnergyIntentForRecord({ record: reused.record, currentIntent: current, ...screen });
    expect(resolved.operationId).toBe(reused.record.energyOperationId);
    expect(resolved.operationId).not.toBe(current.operationId);
  });

  test('записанное «списано» + reused: reconcile держит charged, второго списания нет', async () => {
    const first = await prepare('recall', { orderedCardIds: ids, seed: 's' }, 'attempt-old');
    if (first.status !== 'prepared') throw new Error('expected prepared');
    await claimFlashcardTrainingPendingGrantStart(account(), first.record.fingerprint, first.record.receiptId, 'mount-1', 1100);
    await markFlashcardTrainingEnergyCharged(account(), first.record.fingerprint, 1200);
    mockReadEnergyStatus.mockResolvedValue({ status: 'charged' });
    const reused = await prepare('recall', { orderedCardIds: ids, seed: 's2' }, 'attempt-new');
    expect(reused.status).toBe('reused');
    const reconciled = await reconcileFlashcardTrainingPendingGrant(account(), scope('recall', 'recall'));
    expect(reconciled.status).toBe('found');
    if (reconciled.status === 'found') {
      // экран проверяет energyState === 'charged' ДО confirmSpendOne → второго списания нет
      expect(reconciled.record.energyState).toBe('charged');
      expect(reconciled.record.energyOperationId).toBe(first.record.energyOperationId);
    }
  });

  test('ротированная запись (после возврата) → интент ротации журнала', async () => {
    const prepared = await prepare('recall', { orderedCardIds: ids, seed: 's' }, 'attempt-1');
    if (prepared.status !== 'prepared') throw new Error('expected prepared');
    const rotatedOp = mockCreateEnergyIntent('flashcards_recall', 'saved', 'attempt-1:resume:1');
    const record = {
      ...prepared.record, energyOperationId: rotatedOp.operationId, energyAttemptOrdinal: 1,
      energyKind: 'flashcards_recall', energySubjectId: 'saved',
    };
    const resolved = resolveEnergyIntentForRecord({
      record, currentIntent: intentOf('attempt-1'), ...screen,
    });
    expect(resolved.operationId).toBe(rotatedOp.operationId);
  });

  test('неразрешимое несовпадение → pending_grant_energy_intent_mismatch (уходит в fail-open)', async () => {
    const prepared = await prepare('recall', { orderedCardIds: ids, seed: 's' }, 'attempt-1');
    if (prepared.status !== 'prepared') throw new Error('expected prepared');
    const record = { ...prepared.record, energyOperationId: 'energy:something_else:zzz' };
    expect(() => resolveEnergyIntentForRecord({
      record, currentIntent: intentOf('attempt-other'), ...screen,
    })).toThrow('pending_grant_energy_intent_mismatch');
  });
});

describe('ревью Opus 03.10', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fsx = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pathx = require('path') as typeof import('path');
  const src = (f: string) => fsx.readFileSync(pathx.join(process.cwd(), f), 'utf8');

  test('HIGH: в «Устно» fail-open сначала abandon+discard записи, и только потом speakingLocalStart()', () => {
    const s = src('app/flashcards_speaking_session.tsx');
    const failOpen = s.indexOf("if (/^pending_grant/.test(message) && speakingLocalStart");
    const abandon = s.indexOf('abandonFlashcardTrainingPendingGrant(', failOpen);
    const discard = s.indexOf('discardFlashcardTrainingPendingGrant(', abandon);
    const local = s.indexOf('speakingLocalStart();', failOpen);
    expect(failOpen).toBeGreaterThan(-1);
    expect(abandon).toBeGreaterThan(failOpen);
    expect(discard).toBeGreaterThan(abandon);
    expect(local).toBeGreaterThan(discard);
  });

  test('LOW 1: кандидаты ревизии — от 0 до текущей (+1), с потолком', () => {
    const { attemptRevisionCandidates } = require('../app/flashcards/training_energy_intent');
    expect(attemptRevisionCandidates('a', 0)).toEqual(['a:0', 'a:1']);
    expect(attemptRevisionCandidates('a', 2)).toEqual(['a:0', 'a:1', 'a:2', 'a:3']);
    expect(attemptRevisionCandidates('a', 10_000).length).toBe(51);
  });

  test('LOW 3: Блиц кладёт в manifest один список (очередь раунда), без roundCardIds', () => {
    const s = src('app/flashcards_blitz_session.tsx');
    expect(s).toContain('orderedCardIds: toManifestIds(roundQueue)');
    expect(s).not.toContain('roundCardIds: toManifestIds');
  });
});
