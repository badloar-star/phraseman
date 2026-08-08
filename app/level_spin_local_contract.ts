import { ALL_LEVEL_GIFT_DEFS, type GiftDef } from './level_gift_system';

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
  catalogVersion: 1;
  schemaVersion: 1;
  localOnly: true;
};

export type LocalLevelSpinJournalEntry = {
  owner: string;
  requestId: string;
  creditId: string;
  level: number;
  receivedAtMs: number;
  expiresAtMs: number;
  occurrences: { occurrenceId: string; lane: 'base'; giftId: string; claimed: boolean }[];
};

export type LocalLevelSpinInventory = {
  kind: 'single'; level: number; receivedAtMs: number; gift: GiftDef;
};

export function localJournalEntryForReceipt(receipt: LocalLevelSpinReceipt, owner: string): LocalLevelSpinJournalEntry {
  return {
    owner, requestId: receipt.requestId, creditId: receipt.creditId, level: receipt.level,
    receivedAtMs: receipt.createdAtMs, expiresAtMs: receipt.expiresAtMs,
    occurrences: [{ occurrenceId: `level-spin:${receipt.requestId}:base`, lane: 'base', giftId: receipt.baseGiftId, claimed: false }],
  };
}

export function mergeLocalSpinJournal(
  entries: readonly LocalLevelSpinJournalEntry[], entry: LocalLevelSpinJournalEntry,
): LocalLevelSpinJournalEntry[] {
  return entries.some((candidate) => candidate.requestId === entry.requestId) ? [...entries] : [...entries, entry].slice(-64);
}

function giftById(giftId: string): GiftDef {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId);
  if (!gift) throw new Error(`local_spin_catalog_mismatch:${giftId}`);
  return { ...gift, choices: gift.choices?.map((choice) => ({ ...choice })) };
}

export function localLevelSpinReceiptToInventory(receipt: LocalLevelSpinReceipt): LocalLevelSpinInventory {
  if (!receipt.localOnly || !Number.isInteger(receipt.level) || receipt.level < 2 || receipt.level > 60
    || (!/^local_spin_(?:dev_[A-Za-z0-9_-]{1,96}|lesson_[A-Za-z0-9_-]{1,96})$/.test(receipt.creditId)
      && receipt.creditId !== `level_spin_v1_${String(receipt.level).padStart(3, '0')}`)
    || receipt.expiresAtMs !== receipt.createdAtMs + 259_200_000) throw new Error('local_spin_receipt_invalid');
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
