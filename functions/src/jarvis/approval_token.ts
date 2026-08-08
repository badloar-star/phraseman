import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Одноразовые токены approval для кнопок Джарвиса в Telegram.
 *
 * зачем именно так (runbook docs/guides/jarvis-telegram-approvals.md):
 * нажатие кнопки — это действие от вашего имени, поэтому оно обязано доказать
 * ТРИ вещи сразу: кто нажал, что именно подтверждается и что нажатие свежее.
 *
 *  1. В Firestore лежит только ХЕШ nonce. Утечка базы не даёт нажать кнопку:
 *     сырой nonce живёт лишь в callback_data у вас в телефоне.
 *  2. Токен привязан и к user id, и к chat id. Пересланное сообщение в другом
 *     чате не сработает.
 *  3. TTL 10 минут и одноразовость: старое сообщение в истории не превращается
 *     в вечно живую кнопку.
 *
 * Модуль намеренно чистый — без Firestore и сети, чтобы логику безопасности
 * можно было проверить тестами целиком.
 */

/** Не больше десяти минут — требование runbook. */
export const APPROVAL_TTL_MS = 10 * 60 * 1_000;

/** 32 байта случайности: подобрать перебором невозможно. */
const NONCE_BYTES = 24;

/** Версия формата в callback_data. Старый агентный слой использовал `ao1`. */
const CALLBACK_PREFIX = 'jv1';

export type ApprovalAction = 'approve' | 'reject';

export type ApprovalRejectReason =
  | 'unknown_nonce'
  | 'wrong_user'
  | 'wrong_chat'
  | 'expired'
  | 'already_used';

export interface ApprovalTokenDoc {
  readonly nonceHash: string;
  readonly decisionHash: string;
  readonly department: string;
  readonly action: ApprovalAction;
  readonly ownerTelegramUserId: string;
  readonly ownerTelegramChatId: string;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  /** Проставляется при первом успешном нажатии — второй раз не сработает. */
  readonly usedAtMs?: number;
}

export interface BuildApprovalTokenInput {
  readonly nonce?: string;
  readonly decisionHash: string;
  readonly department: string;
  readonly action: ApprovalAction;
  readonly ownerTelegramUserId: string;
  readonly ownerTelegramChatId: string;
  readonly nowMs: number;
}

export interface BuildApprovalTokenResult {
  /** Сырой nonce — уходит ТОЛЬКО в callback_data кнопки, нигде не хранится. */
  readonly nonce: string;
  readonly doc: ApprovalTokenDoc;
  /** Готовая строка для callback_data. */
  readonly callbackData: string;
}

export function hashNonce(nonce: string): string {
  return createHash('sha256').update(nonce, 'utf8').digest('hex');
}

/**
 * зачем timingSafeEqual: обычное `===` возвращается тем быстрее, чем раньше
 * разошлись строки. По времени ответа можно подбирать хеш посимвольно.
 */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function buildApprovalToken(input: BuildApprovalTokenInput): BuildApprovalTokenResult {
  const nonce = input.nonce ?? randomBytes(NONCE_BYTES).toString('base64url');
  const doc: ApprovalTokenDoc = Object.freeze({
    nonceHash: hashNonce(nonce),
    decisionHash: input.decisionHash,
    department: input.department,
    action: input.action,
    ownerTelegramUserId: String(input.ownerTelegramUserId),
    ownerTelegramChatId: String(input.ownerTelegramChatId),
    createdAtMs: input.nowMs,
    expiresAtMs: input.nowMs + APPROVAL_TTL_MS,
  });
  const shortAction = input.action === 'approve' ? 'a' : 'r';
  return Object.freeze({
    nonce,
    doc,
    callbackData: `${CALLBACK_PREFIX}:${shortAction}:${nonce}`,
  });
}

export interface VerifyApprovalTokenInput {
  readonly doc: ApprovalTokenDoc | null | undefined;
  readonly nonce: string;
  readonly fromTelegramUserId: string;
  readonly fromTelegramChatId: string;
  readonly nowMs: number;
}

export type VerifyApprovalTokenResult =
  | { readonly ok: true; readonly doc: ApprovalTokenDoc }
  | { readonly ok: false; readonly reason: ApprovalRejectReason };

export function verifyApprovalToken(input: VerifyApprovalTokenInput): VerifyApprovalTokenResult {
  const doc = input.doc;
  if (!doc || !safeEqualHex(doc.nonceHash, hashNonce(input.nonce))) {
    return { ok: false, reason: 'unknown_nonce' };
  }
  // зачем проверять пользователя раньше срока: чужому не нужно знать, был ли
  // токен вообще валидным — ответ одинаков для просроченного и живого.
  if (String(input.fromTelegramUserId) !== doc.ownerTelegramUserId) {
    return { ok: false, reason: 'wrong_user' };
  }
  if (String(input.fromTelegramChatId) !== doc.ownerTelegramChatId) {
    return { ok: false, reason: 'wrong_chat' };
  }
  if (typeof doc.usedAtMs === 'number') {
    return { ok: false, reason: 'already_used' };
  }
  if (input.nowMs > doc.expiresAtMs) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, doc };
}

export interface ParsedCallback {
  readonly action: ApprovalAction;
  readonly nonce: string;
}

/** Разбор callback_data кнопки. Всё, что не совпало точно, — мусор. */
export function parseCallbackData(raw: unknown): ParsedCallback | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.split(':');
  if (parts.length !== 3) return null;
  const [prefix, shortAction, nonce] = parts;
  if (prefix !== CALLBACK_PREFIX) return null;
  if (shortAction !== 'a' && shortAction !== 'r') return null;
  if (!nonce) return null;
  return Object.freeze({ action: shortAction === 'a' ? 'approve' : 'reject', nonce });
}
