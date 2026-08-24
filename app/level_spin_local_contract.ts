import { ALL_LEVEL_GIFT_DEFS, type GiftDef } from './level_gift_system';
import { isLocalSpinReceiptCreditId } from './level_spin_credit_ids';
import { LEVEL_SPIN_REWARD_CATALOG } from './level_spin_reward_catalog';

export type LocalLevelSpinReceipt = {
  ok: true;
  stableUid: string;
  requestId: string;
  creditId: string;
  level: number;
  kind: 'standard' | 'milestone';
  baseGiftId: string;
  premiumGiftId: null;
  createdAtMs: number;
  expiresAtMs: number;
  balanceAfter: number;
  status: 'awaiting_ack' | 'acknowledged';
  revealState?: 'pending' | 'acknowledged';
  deliveries: { base: { state: 'unclaimed' } };
  catalogVersion: 1 | 2 | 3;
  schemaVersion: 1 | 2;
  localOnly: true;
};

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
  if (!existing) return [...entries, entry].slice(-64);
  const priorOccurrences = Array.isArray(existing.occurrences) ? existing.occurrences : [];
  return entries.map((candidate) => (
    candidate.owner !== entry.owner || candidate.requestId !== entry.requestId
      ? candidate
      : {
          ...entry,
          occurrences: entry.occurrences.map((occurrence) => ({
            ...occurrence,
            claimed: occurrence.claimed === true
              || priorOccurrences.find((prior) => prior.lane === occurrence.lane)?.claimed === true,
          })),
        }
  ));
}

function giftById(giftId: string): GiftDef {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId);
  if (!gift) throw new Error(`local_spin_catalog_mismatch:${giftId}`);
  return { ...gift, choices: gift.choices?.map((choice) => ({ ...choice })) };
}

export function localLevelSpinReceiptToInventory(receipt: LocalLevelSpinReceipt): LocalLevelSpinInventory {
  if (receipt.localOnly !== true || !Number.isInteger(receipt.level) || receipt.level < 2 || receipt.level > 60
    || !isLocalSpinReceiptCreditId(receipt.creditId)
    || (receipt.creditId.startsWith('level_spin_v1_')
      && receipt.creditId !== `level_spin_v1_${String(receipt.level).padStart(3, '0')}`)
    || receipt.expiresAtMs !== receipt.createdAtMs + 259_200_000
    || !((receipt.catalogVersion === 1 && receipt.schemaVersion === 1)
      || (receipt.catalogVersion === 2 && receipt.schemaVersion === 2)
      || (receipt.catalogVersion === 3 && receipt.schemaVersion === 2))
    || ((receipt.catalogVersion === 2 || receipt.catalogVersion === 3)
      && !LEVEL_SPIN_REWARD_CATALOG.some((entry) => entry.id === receipt.baseGiftId))) {
    throw new Error('local_spin_receipt_invalid');
  }
  return { kind: 'single', level: receipt.level, receivedAtMs: receipt.createdAtMs, gift: giftById(receipt.baseGiftId) };
}

export function parseLocalPendingReveal(raw: string | null, owner: string): LocalLevelSpinReceipt | null {
  try {
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown; receipt?: LocalLevelSpinReceipt } : null;
    const receipt = parsed?.receipt;
    if (parsed?.owner !== owner || !receipt || receipt.stableUid !== owner || !/^[A-Za-z0-9_-]{16,96}$/.test(receipt.requestId)) return null;
    localLevelSpinReceiptToInventory(receipt);
    return receipt;
  } catch { return null; }
}
