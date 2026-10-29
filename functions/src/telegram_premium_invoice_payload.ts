// telegram_premium_invoice_payload.ts — данные счёта Telegram Stars (invoice_payload) для бота @PhrasemanPremiumBot.
//
// зачем (жалоба №9, разбор 29.10; владелец «Да, чинить + логи»): раньше в данные счёта клали ник из приложения. Лимит Telegram —
// 128 байт, служебные поля с 10-значными id занимали ~67 байт до base64, и ник длиннее ~14 кириллических букв (или с эмодзи) давал
// «invoice payload too long»: человек видел «Не удалось открыть оплату», повтор не помогал (журнал 21.10). Теперь данные постоянной
// длины: тариф, id, номер счёта, время; ник лежит в сессии бота по номеру счёта. Разбор понимает и старые данные (v1 с ником):
// Stars-подписка продлевается со своими исходными данными месяцами.
import { createHash, randomBytes } from 'crypto';

export type TelegramInvoicePlan = 'monthly' | 'yearly';

/** Лимит Telegram на invoice_payload (байты). */
export const TELEGRAM_INVOICE_PAYLOAD_MAX_BYTES = 128;

export type TelegramInvoicePayloadV2Input = Readonly<{
  plan: TelegramInvoicePlan;
  userId: number | string;
  chatId: number | string;
  invoiceId: string;
  issuedAtSec: number;
}>;

export type ParsedTelegramInvoicePayload = Readonly<{
  v: number;
  plan: TelegramInvoicePlan;
  userId: number | string;
  chatId: number | string;
  /** v1: ник из самих данных счёта; v2: null — ник берётся из сессии по invoiceId. */
  appNickname: string | null;
  invoiceId: string | null;
  issuedAt: number;
}>;

export function sanitizeTelegramNickname(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
}

function assertPlan(plan: unknown): asserts plan is TelegramInvoicePlan {
  if (plan !== 'monthly' && plan !== 'yearly') throw new Error('unknown plan');
}

/** Номер счёта: 8 знаков base36, без смысла — только ключ ника в сессии. */
export function newTelegramInvoiceId(): string {
  // 48 бит < 2^53 — обычное число без потерь
  return parseInt(randomBytes(6).toString('hex'), 16).toString(36).padStart(8, '0').slice(-8);
}

const INVOICE_ID_RE = /^[0-9a-z]{4,16}$/;

/** Данные счёта v2: без ника, длина не зависит от ввода человека. */
export function buildTelegramInvoicePayloadV2(input: TelegramInvoicePayloadV2Input): string {
  assertPlan(input.plan);
  if (!INVOICE_ID_RE.test(input.invoiceId)) throw new Error('bad invoice id');
  const encoded = Buffer.from(JSON.stringify({
    v: 2,
    p: input.plan === 'yearly' ? 'y' : 'm',
    u: input.userId,
    c: input.chatId,
    i: input.invoiceId,
    t: Math.floor(input.issuedAtSec),
  }), 'utf8').toString('base64url');
  if (Buffer.byteLength(encoded, 'utf8') > TELEGRAM_INVOICE_PAYLOAD_MAX_BYTES) throw new Error('invoice payload too long');
  return encoded;
}

/** Разбор данных счёта: v2 (номер счёта) и v1 (ник внутри, поля коротко u/c/n/t или длинно userId/chatId/appNickname/issuedAt). */
export function parseTelegramInvoicePayload(payload: string | undefined): ParsedTelegramInvoicePayload {
  const parsed = JSON.parse(Buffer.from(String(payload || ''), 'base64url').toString('utf8')) as Record<string, unknown>;
  const plan = parsed.plan || (parsed.p === 'y' ? 'yearly' : 'monthly');
  assertPlan(plan);
  const version = Number(parsed.v || 1);
  const rawNickname = parsed.appNickname ?? parsed.n;
  const invoiceId = typeof parsed.i === 'string' && INVOICE_ID_RE.test(parsed.i) ? parsed.i : null;
  return {
    v: version,
    plan,
    userId: (parsed.userId || parsed.u) as number | string,
    chatId: (parsed.chatId || parsed.c) as number | string,
    appNickname: rawNickname === undefined || rawNickname === null ? null : sanitizeTelegramNickname(rawNickname),
    invoiceId,
    issuedAt: Number(parsed.issuedAt || parsed.t || 0),
  };
}

/** Сколько последних счетов помнит сессия бота (ник по номеру счёта). */
export const TELEGRAM_INVOICE_NICKNAMES_KEEP = 5;

/**
 * Какие записи invoiceNicknames удалить, чтобы вместе с новым счётом осталось не больше `keep` последних (по времени `at`).
 * зачем (координатор 29.10): запись на каждый счёт не должна расти бесконечно. Удалять сразу после оплаты нельзя — месячная
 * подписка продлевается со своими исходными данными счёта, и ник продления берётся из этой записи.
 */
export function invoiceNicknamesToDrop(
  existing: Readonly<Record<string, { at?: unknown } | undefined>> | undefined,
  keep: number = TELEGRAM_INVOICE_NICKNAMES_KEEP,
): string[] {
  const entries = Object.entries(existing ?? {}).map(([id, value]) => ({ id, at: Number(value?.at) || 0 }));
  const roomForOld = Math.max(0, keep - 1); // одно место — под новый счёт
  if (entries.length <= roomForOld) return [];
  return entries
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .slice(roomForOld)
    .map((entry) => entry.id);
}

/** Хэш Telegram id для логов: связывает строки одного человека, не раскрывая id. */
export function hashTelegramUserId(userId: unknown): string {
  if (userId === undefined || userId === null || userId === '') return 'none';
  return createHash('sha256').update(`tg:${String(userId)}`).digest('hex').slice(0, 10);
}

/** Хост адреса вебхука — без пути и параметров (в пути может быть секрет). */
export function webhookUrlHost(url: unknown): string | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  try {
    return new URL(url).host;
  } catch (error) {
    console.warn('[TG-PAY] webhook url не разобрался', error instanceof Error ? error.message : String(error));
    return 'unparseable';
  }
}
