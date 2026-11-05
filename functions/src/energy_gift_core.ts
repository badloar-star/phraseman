// Governance-ID: TG-77EE1592FAEB
/**
 * «Подарок энергии» — чистое ядро правил (docs/work/tasks/energy-gift-design-2026-11-05.md §1–2).
 * зачем (владелец 05.11: «разрешить с лимитом»): 1 подарок +1 энергии, отправитель — 1 в сутки, получатель — не больше 3
 * принятых в сутки, только давним друзьям (≥ 24 ч), не себе, не получателю с Plus. Модуль без Firestore: его зовёт callable
 * и тесты. Сутки считаются по серверному дню UTC, а не по часам телефона.
 */

export const ENERGY_GIFT_AMOUNT = 1;
/** Отправитель: подарков в сутки. */
export const ENERGY_GIFT_SEND_PER_DAY = 1;
/** Получатель: принятых подарков в сутки. */
export const ENERGY_GIFT_CLAIM_PER_DAY = 3;
/** Дружба должна существовать не меньше этого срока. */
export const ENERGY_GIFT_MIN_FRIENDSHIP_MS = 24 * 60 * 60 * 1000;
/** Срок жизни неполученного подарка. */
export const ENERGY_GIFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type EnergyGiftStatus = 'pending' | 'claimed' | 'void';

export type EnergyGiftQuota = Readonly<{ dayKey: string; sent: number; received: number }>;

export const EMPTY_ENERGY_GIFT_QUOTA: EnergyGiftQuota = Object.freeze({ dayKey: '', sent: 0, received: 0 });

export function energyGiftDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Детерминированный номер подарка: повтор отправки в тот же день тому же другу возвращает тот же подарок. */
export function energyGiftId(fromUid: string, toUid: string, dayKey: string): string {
  return `${fromUid}_${toUid}_${dayKey}`.replace(/[/#?[\]]/g, '_').slice(0, 200);
}

function nonNegInt(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

/** Счётчики за текущие сутки: на смене дня обнуляются, мусор читается как ноль. */
export function normalizeEnergyGiftQuota(raw: unknown, dayKey: string): EnergyGiftQuota {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return Object.freeze({ dayKey, sent: 0, received: 0 });
  const value = raw as Record<string, unknown>;
  if (value.dayKey !== dayKey) return Object.freeze({ dayKey, sent: 0, received: 0 });
  return Object.freeze({ dayKey, sent: nonNegInt(value.sent), received: nonNegInt(value.received) });
}

export type EnergyGiftRefusal =
  | 'self'
  | 'not_friends_24h'
  | 'quota_sender'
  | 'quota_receiver'
  | 'plus_receiver';

export type EnergyGiftSendCheckInput = Readonly<{
  fromUid: string;
  toUid: string;
  /** Момент создания более позднего из двух рёбер дружбы (серверное createTime документа), мс; null — ребра нет. */
  friendshipSinceMs: number | null;
  nowMs: number;
  senderQuota: EnergyGiftQuota;
  receiverQuota: EnergyGiftQuota;
  receiverHasPlus: boolean;
}>;

/** Первый отказ по порядку проверок или null, если подарок можно отправлять. */
export function energyGiftSendRefusal(input: EnergyGiftSendCheckInput): EnergyGiftRefusal | null {
  if (!input.fromUid || input.fromUid === input.toUid) return 'self';
  if (input.friendshipSinceMs === null
    || !Number.isFinite(input.friendshipSinceMs)
    || input.nowMs - input.friendshipSinceMs < ENERGY_GIFT_MIN_FRIENDSHIP_MS) return 'not_friends_24h';
  if (input.receiverHasPlus) return 'plus_receiver';
  if (input.senderQuota.sent >= ENERGY_GIFT_SEND_PER_DAY) return 'quota_sender';
  if (input.receiverQuota.received >= ENERGY_GIFT_CLAIM_PER_DAY) return 'quota_receiver';
  return null;
}

export type EnergyGiftClaimDecision =
  | Readonly<{ kind: 'apply' }>
  | Readonly<{ kind: 'already' }>
  | Readonly<{ kind: 'void'; reason: 'expired' | 'plus_receiver' | 'not_pending' }>
  | Readonly<{ kind: 'quota_receiver' }>;

export function energyGiftClaimDecision(input: Readonly<{
  status: unknown;
  createdAtMs: unknown;
  nowMs: number;
  receiverHasPlus: boolean;
  receiverQuota: EnergyGiftQuota;
}>): EnergyGiftClaimDecision {
  if (input.status === 'claimed') return { kind: 'already' };
  if (input.status !== 'pending') return { kind: 'void', reason: 'not_pending' };
  const created = Number(input.createdAtMs);
  if (!Number.isFinite(created) || input.nowMs - created > ENERGY_GIFT_TTL_MS) return { kind: 'void', reason: 'expired' };
  // зачем: подарок получателю с Plus гаснет без ошибки (у Plus энергия не тратится)
  if (input.receiverHasPlus) return { kind: 'void', reason: 'plus_receiver' };
  if (input.receiverQuota.received >= ENERGY_GIFT_CLAIM_PER_DAY) return { kind: 'quota_receiver' };
  return { kind: 'apply' };
}
