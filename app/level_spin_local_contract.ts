import { ALL_LEVEL_GIFT_DEFS, type GiftDef } from './level_gift_system';
import { isLocalSpinReceiptCreditId } from './level_spin_credit_ids';
import { LEVEL_SPIN_REWARD_CATALOG } from './level_spin_reward_catalog';
import {
  hasValidPaidLevelSpinRuneFingerprint,
  parsePaidLevelSpinRuneOperation,
  type PaidLevelSpinRuneOperationV1,
} from '../modules/phone-state/domains/economy';

type LocalLevelSpinReceiptBase = {
  ok: true;
  stableUid: string;
  requestId: string;
  baseGiftId: string;
  premiumGiftId: null;
  createdAtMs: number;
  expiresAtMs: number;
  balanceAfter: number;
  status: 'awaiting_ack' | 'acknowledged';
  revealState?: 'pending' | 'acknowledged';
  deliveries: { base: { state: 'unclaimed' } };
  catalogVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  localOnly: true;
};

export type FreeLocalLevelSpinReceipt = LocalLevelSpinReceiptBase & {
  schemaVersion: 1 | 2;
  paymentKind?: 'free_credit';
  creditId: string;
  level: number;
  kind: 'standard' | 'milestone';
};

export type PaidLocalLevelSpinReceipt = LocalLevelSpinReceiptBase & {
  schemaVersion: 3;
  paymentKind: 'runes';
  runeOperationId: string;
  runePrice: 300;
  creditId: `paid_level_spin:${string}`;
  level: 0;
  kind: 'standard';
};

export type LocalLevelSpinReceipt = FreeLocalLevelSpinReceipt | PaidLocalLevelSpinReceipt;

export type PaidLevelSpinEnvelopeV1 = Readonly<{
  schemaVersion: 'paid-level-spin-envelope.v1';
  ownerStableId: string;
  requestId: string;
  operation: PaidLevelSpinRuneOperationV1;
  receipt: PaidLocalLevelSpinReceipt;
}>;

export function paidLevelSpinEnvelopePrefix(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.includes('/')) throw new Error('paid_level_spin_owner_invalid');
  return `paid_level_spin_envelope_v1:${encodeURIComponent(owner)}:`;
}

export function paidLevelSpinEnvelopeKey(ownerStableId: string, requestId: string): string {
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(requestId)) {
    throw new Error('paid_level_spin_request_invalid');
  }
  return `${paidLevelSpinEnvelopePrefix(ownerStableId)}${requestId}`;
}

export async function parsePaidLevelSpinEnvelope(
  input: unknown,
  expectedOwnerStableId?: string,
): Promise<PaidLevelSpinEnvelopeV1 | null> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<PaidLevelSpinEnvelopeV1>;
  const keys = Object.keys(value).sort();
  const expectedKeys = ['schemaVersion', 'ownerStableId', 'requestId', 'operation', 'receipt'].sort();
  if (keys.length !== expectedKeys.length
    || !keys.every((key, index) => key === expectedKeys[index])
    || value.schemaVersion !== 'paid-level-spin-envelope.v1'
    || typeof value.ownerStableId !== 'string'
    || (expectedOwnerStableId !== undefined && value.ownerStableId !== expectedOwnerStableId)
    || typeof value.requestId !== 'string') return null;
  const operation = parsePaidLevelSpinRuneOperation(value.operation);
  const receipt = value.receipt;
  if (!operation || !receipt || receipt.schemaVersion !== 3
    || !await hasValidPaidLevelSpinRuneFingerprint(operation)
    || operation.ownerStableId !== value.ownerStableId
    || operation.requestId !== value.requestId
    || receipt.stableUid !== value.ownerStableId
    || receipt.requestId !== value.requestId
    || receipt.runeOperationId !== operation.operationId
    || receipt.creditId !== operation.operationId
    || receipt.runePrice !== operation.price
    || receipt.baseGiftId !== operation.giftId
    || receipt.catalogVersion !== operation.catalogVersion
    || receipt.createdAtMs !== operation.createdAtMs
    || !isRecoverableLocalLevelSpinReceipt(receipt, value.ownerStableId, receipt.createdAtMs)) return null;
  return value as PaidLevelSpinEnvelopeV1;
}

export type LocalLevelSpinJournalEntry = {
  owner: string;
  requestId: string;
  creditId: string;
  level: number;
  receivedAtMs: number;
  expiresAtMs: number;
  /** Explicit authority marker. Missing/false entries must use server delivery. */
  localOnly: true;
  occurrences: { occurrenceId: string; lane: 'base'; giftId: string; claimed: boolean }[];
};

export type LocalLevelSpinInventory = {
  kind: 'single'; level: number; receivedAtMs: number; gift: GiftDef;
};

export function localJournalEntryForReceipt(receipt: LocalLevelSpinReceipt, owner: string): LocalLevelSpinJournalEntry {
  return {
    owner, requestId: receipt.requestId, creditId: receipt.creditId, level: receipt.level,
    receivedAtMs: receipt.createdAtMs, expiresAtMs: receipt.expiresAtMs,
    localOnly: true,
    occurrences: [{ occurrenceId: `level-spin:${receipt.requestId}:base`, lane: 'base', giftId: receipt.baseGiftId, claimed: false }],
  };
}

export function mergeLocalSpinJournal(
  entries: readonly LocalLevelSpinJournalEntry[], entry: LocalLevelSpinJournalEntry,
): LocalLevelSpinJournalEntry[] {
  const existing = entries.find((candidate) => (
    candidate.owner === entry.owner && candidate.requestId === entry.requestId
  ));
  const next = !existing
    ? [...entries, entry]
    : entries.map((candidate) => {
        if (candidate.owner !== entry.owner || candidate.requestId !== entry.requestId) return candidate;
        const priorOccurrences = Array.isArray(candidate.occurrences) ? candidate.occurrences : [];
        return {
          ...entry,
          occurrences: entry.occurrences.map((occurrence) => ({
            ...occurrence,
            claimed: occurrence.claimed === true
              || priorOccurrences.find((prior) => prior.lane === occurrence.lane)?.claimed === true,
          })),
        };
      });
  // Pending entries are recovery authority and must never be evicted merely
  // because 64 later terminal receipts exist. Only fully claimed history is
  // bounded; if pending itself exceeds the budget it stays pinned fail-closed.
  const terminal = (candidate: LocalLevelSpinJournalEntry): boolean => (
    Array.isArray(candidate.occurrences)
    && candidate.occurrences.length > 0
    && candidate.occurrences.every((occurrence) => occurrence?.claimed === true)
  );
  const pendingEntries = next.filter((candidate) => !terminal(candidate));
  const terminalEntries = next.filter(terminal);
  const terminalBudget = Math.max(0, 64 - pendingEntries.length);
  return [
    ...pendingEntries,
    ...(terminalBudget > 0 ? terminalEntries.slice(-terminalBudget) : []),
  ];
}

function giftById(giftId: string): GiftDef {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId);
  if (!gift) throw new Error(`local_spin_catalog_mismatch:${giftId}`);
  return { ...gift, choices: gift.choices?.map((choice) => ({ ...choice })) };
}

const LEGACY_V1_SPIN_REWARD_IDS = new Set<string>([
  'energy_full', 'xp_100', 'xp_250', 'hint_1', 'xp_bank_150', 'xp_2x_24h',
  'energy_plus2', 'chain_shield_1', 'hint_3', 'xp_bank_300',
  // v1 avatar receipts retain the historical 01..40 reward contract.
  'cosmetic_avatar_common', 'xp_2x_48h', 'energy_plus3', 'xp_bank_600',
]);

const SPIN_REWARD_INTRO_CATALOG_VERSION: Readonly<Partial<Record<string, 3 | 4 | 5 | 6 | 7>>> = {
  cosmetic_avatar_aura: 3,
  cosmetic_theme: 4,
  cosmetic_avatar_common: 5,
  attempt_restore_all: 6,
  // v7 (2026-08-29): шесть ценных призов. Квитанция, подписанная старой
  // версией каталога, не может выдать награду, которой в той версии не было.
  chain_shield_3: 7,
  xp_bank_1500: 7,
  pearls_1000: 7,
  stars_2000: 7,
  plus_days_14: 7,
  plus_days_30: 7,
};

/** Rejects a valid current gift ID when it was not authority in the signed catalog version. */
export function isLocalSpinGiftAllowedForCatalogVersion(giftId: string, catalogVersion: number): boolean {
  if (catalogVersion === 1) return LEGACY_V1_SPIN_REWARD_IDS.has(giftId);
  if (!Number.isInteger(catalogVersion) || catalogVersion < 2 || catalogVersion > 7) return false;
  if (!LEVEL_SPIN_REWARD_CATALOG.some((entry) => entry.id === giftId)) return false;
  return catalogVersion >= (SPIN_REWARD_INTRO_CATALOG_VERSION[giftId] ?? 2);
}

export function localLevelSpinReceiptToInventory(receipt: LocalLevelSpinReceipt): LocalLevelSpinInventory {
  const paid = receipt?.schemaVersion === 3 && receipt.paymentKind === 'runes';
  if (!receipt || typeof receipt !== 'object'
    || receipt.ok !== true
    || receipt.localOnly !== true
    || typeof receipt.stableUid !== 'string' || receipt.stableUid.trim().length === 0
    || typeof receipt.requestId !== 'string' || !/^[A-Za-z0-9_-]{16,96}$/.test(receipt.requestId)
    || (paid
      ? receipt.level !== 0
        || receipt.kind !== 'standard'
        || receipt.runePrice !== 300
        || receipt.runeOperationId !== `paid_level_spin:${receipt.requestId}`
        || receipt.creditId !== receipt.runeOperationId
      : !Number.isInteger(receipt.level) || receipt.level < 2 || receipt.level > 60
        || !isLocalSpinReceiptCreditId(receipt.creditId)
        || (receipt.creditId.startsWith('level_spin_v1_')
          && receipt.creditId !== `level_spin_v1_${String(receipt.level).padStart(3, '0')}`))
    || !Number.isSafeInteger(receipt.createdAtMs) || receipt.createdAtMs <= 0
    || !Number.isSafeInteger(receipt.expiresAtMs)
    || receipt.expiresAtMs !== receipt.createdAtMs + 259_200_000
    || !(paid
      ? receipt.catalogVersion >= 2 && receipt.catalogVersion <= 7
      : (receipt.catalogVersion === 1 && receipt.schemaVersion === 1)
      || (receipt.catalogVersion === 2 && receipt.schemaVersion === 2)
      || (receipt.catalogVersion === 3 && receipt.schemaVersion === 2)
      // v4 (2026-08-26): добавлена награда «тема оформления», подняты веса
      // энергии. Схема квитанции не менялась — только состав каталога.
      || (receipt.catalogVersion === 4 && receipt.schemaVersion === 2)
      // v5 (2026-08-26): добавлен spin-only полный пул аватаров 01..125.
      || (receipt.catalogVersion === 5 && receipt.schemaVersion === 2)
      // v6 (2026-08-26): добавлен постоянный подарок восстановления попыток.
      || (receipt.catalogVersion === 6 && receipt.schemaVersion === 2)
      // v7 (2026-08-29): шесть ценных призов (щит 3 дня, банк 1500, джекпоты
      // валют, Plus 14/30). Схема квитанции прежняя — расширен только каталог.
      || (receipt.catalogVersion === 7 && receipt.schemaVersion === 2))
    || !isLocalSpinGiftAllowedForCatalogVersion(receipt.baseGiftId, receipt.catalogVersion)) {
    throw new Error('local_spin_receipt_invalid');
  }
  return { kind: 'single', level: receipt.level, receivedAtMs: receipt.createdAtMs, gift: giftById(receipt.baseGiftId) };
}

export function isRecoverableLocalLevelSpinReceipt(
  receipt: LocalLevelSpinReceipt,
  owner: string,
  nowMs: number = Date.now(),
): boolean {
  try {
    localLevelSpinReceiptToInventory(receipt);
    return receipt.stableUid === owner
      && receipt.status === 'awaiting_ack'
      && (receipt.revealState === undefined || receipt.revealState === 'pending')
      && receipt.premiumGiftId === null
      && receipt.deliveries?.base?.state === 'unclaimed'
      && Object.keys(receipt.deliveries ?? {}).length === 1
      && Number.isSafeInteger(receipt.balanceAfter)
      && receipt.balanceAfter >= 0
      && (receipt.schemaVersion === 3
        ? receipt.paymentKind === 'runes'
          && receipt.kind === 'standard'
          && receipt.level === 0
          && receipt.runePrice === 300
          && receipt.runeOperationId === receipt.creditId
        : (receipt.kind === 'standard' || receipt.kind === 'milestone')
          && receipt.kind === (receipt.level % 5 === 0 ? 'milestone' : 'standard'))
      && Number.isSafeInteger(nowMs)
      && (receipt.schemaVersion === 3 || receipt.expiresAtMs > nowMs);
  } catch {
    return false;
  }
}

export function parseLocalPendingReveal(
  raw: string | null,
  owner: string,
  nowMs: number = Date.now(),
): LocalLevelSpinReceipt | null {
  try {
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown; receipt?: LocalLevelSpinReceipt } : null;
    const receipt = parsed?.receipt;
    return parsed?.owner === owner && receipt && isRecoverableLocalLevelSpinReceipt(receipt, owner, nowMs)
      ? receipt
      : null;
  } catch { return null; }
}
