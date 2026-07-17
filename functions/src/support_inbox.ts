// ═══════════════════════════════════════════════════════════════════════════
// support_inbox.ts — входящая почта поддержки (support.phraseman@gmail.com) в
// админке + ИИ-черновики ответов. Спека: specs/gmail-support-inbox.md.
//
// Поток: крон (или кнопка) читает INBOX по IMAP после серверного UID-checkpoint
// независимо от Gmail-флага Seen, кладёт в Firestore (support_inbox) с дедупом
// по Message-ID. В админке — список, фильтр статусов,
// ИИ-черновик по кнопке (дешёвая модель, job 'support'), правка руками, отправка
// через тот же Gmail по SMTP (встаёт в тред). Подпись из admin_config хранится
// отдельно и цепляется в конец при отправке (ИИ её не видит).
//
// Архитектура как в re_engage_push/admin_daily_digest: ЧИСТАЯ логика (парсинг,
// дедуп, обрезка, сборка ответа с подписью, отбор для «всем») отделена от I/O
// (IMAP/SMTP/OpenAI) — чистое покрыто unit-тестами без сети.
//
// НЕ трогает Support (site) (website_contact_inbox) и Resend-рассылку (admin_email).
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { openAiChat } from './explain/explain_provider';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  SUPPORT_REPLY_CONFIRMATION_TTL_MS,
  buildPreparedSupportReply,
  canonicalSupportBatchManifestHash,
  canonicalReplyPayloadHash,
  dispatchSupportReply,
  deterministicSupportMessageId,
  parseSupportReplyDispatchRequest,
  parseSupportReplyPrepareRequest,
  supportReplyOperationId,
  supportReplyBatchId,
  summarizeSupportReplyBatch,
  isSupportReplyBatchDispatchableState,
  type SupportReplyBatchChildIdentity,
  type SupportReplyOperation,
  type SupportReplyPayload,
  type SupportReplyState,
} from './support_reply_delivery';

const REGION = 'us-central1';
export const GMAIL_SUPPORT_APP_PASSWORD = defineSecret('GMAIL_SUPPORT_APP_PASSWORD');
/** Existing production secret; exported only for a server-side Agent Manager worker binding. */
export const SUPPORT_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ── Константы ─────────────────────────────────────────────────────────────────
export const SUPPORT_MAILBOX = 'support.phraseman@gmail.com';
export const INBOX_COLLECTION = 'support_inbox';
export const SUPPORT_CONFIG_DOC = 'admin_config/support_inbox';
/** Обрезка тела письма перед сохранением и перед отправкой в ИИ (экономия). */
export const BODY_MAX_CHARS = 20000;
/** «Сгенерировать всем» — не больше черновиков за один заход. */
export const GENERATE_BATCH_LIMIT = 25;
export const SUPPORT_REPLY_BATCH_LIMIT = 200;
export const SUPPORT_IMAP_BATCH_LIMIT = 500;
export const SUPPORT_IMAP_OVERLAP = 20;
export const SUPPORT_IMAP_BACKFILL_LIMIT = 100;
export const SUPPORT_IMAP_FAILED_UID_LIMIT = 500;
export const SUPPORT_REPLY_BATCH_CONFIRMATION_TTL_MS = 60 * 60 * 1000;

export type SupportStatus = 'new' | 'answered' | 'archived';

export interface RawEmail {
  messageId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  receivedAtMs: number;
  sourceUid?: number;
  mailCategory?: 'human' | 'automated' | 'unknown';
  mailCategoryReason?: string;
}

export interface SupportInboxDoc {
  messageId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  receivedAtMs: number;
  sourceUid?: number;
  status: SupportStatus;
  draftReply?: string;
  draftLang?: string;
  sentReply?: string;
  repliedAt?: string;
  draftRevision?: number;
  replyCount?: number;
  replyGate?: {
    sequence: number;
    operationId: string;
    state: SupportReplyState;
    payloadHash: string;
    outboundMessageId?: string;
    updatedAt: string;
  };
  mailCategory?: 'human' | 'automated' | 'unknown';
  mailCategoryReason?: string;
}

// ── Чистые утилиты ─────────────────────────────────────────────────────────────
function clip(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max);
}

/** Обрезает тело письма до лимита (чистая). */
export function truncateBody(body: unknown): string {
  return clip(body, BODY_MAX_CHARS);
}

/**
 * Стабильный docId из Gmail Message-ID: детерминированный, безопасный для
 * Firestore (без '/'). Дедуп строится на нём — один Message-ID = один документ.
 */
export function docIdForMessageId(messageId: string): string {
  const raw = String(messageId || '').trim();
  if (!raw) return '';
  return `m_${createHash('sha256').update(raw, 'utf8').digest('hex')}`;
}

export function legacyDocIdForMessageId(messageId: string): string {
  const raw = String(messageId || '').trim();
  return raw ? raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 400) : '';
}

/** Есть ли у письма пригодное для ИИ тело (не пустое). Чистая. */
export function hasUsableBody(doc: { bodyText?: string; subject?: string }): boolean {
  return String(doc.bodyText ?? '').trim().length > 0 || String(doc.subject ?? '').trim().length > 0;
}

/** Служебные/рассыльные локальные части адреса — заведомо не человек. */
const STRONGLY_AUTOMATED_LOCALPARTS = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'no_reply',
  'mailer-daemon', 'postmaster', 'bounce', 'bounces', 'notification', 'notifications',
  'support-noreply',
];

export interface EmailClassification {
  category: 'human' | 'automated' | 'unknown';
  reason?: string;
}

export function selectSupportImapUids(
  allUids: readonly number[],
  checkpointUid: number,
  limit: number = SUPPORT_IMAP_BATCH_LIMIT,
  overlap: number = SUPPORT_IMAP_OVERLAP,
): number[] {
  const normalized = [...new Set(allUids.filter((uid) => Number.isInteger(uid) && uid > 0))].sort((left, right) => left - right);
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeOverlap = Math.max(0, Math.floor(overlap));
  if (!Number.isInteger(checkpointUid) || checkpointUid <= 0) return normalized.slice(-safeLimit);
  const previous = normalized.filter((uid) => uid <= checkpointUid).slice(-safeOverlap);
  const next = normalized.filter((uid) => uid > checkpointUid).slice(0, safeLimit);
  return [...new Set([...previous, ...next])].sort((left, right) => left - right);
}

export function selectSupportImapBackfillUids(
  allUids: readonly number[],
  beforeUid: number,
  limit: number = SUPPORT_IMAP_BACKFILL_LIMIT,
): number[] {
  if (!Number.isInteger(beforeUid) || beforeUid <= 1) return [];
  const normalized = [...new Set(allUids.filter((uid) => Number.isInteger(uid) && uid > 0 && uid < beforeUid))].sort((left, right) => left - right);
  return normalized.slice(-Math.max(1, Math.floor(limit)));
}

export function resolveSupportImapCursor(
  storedUidValidity: unknown,
  currentUidValidity: unknown,
  checkpointUid: number,
  backfillBeforeUid: number,
): { checkpointUid: number; backfillBeforeUid: number; changed: boolean } {
  const stored = String(storedUidValidity ?? '').trim();
  const current = String(currentUidValidity ?? '').trim();
  if (current && stored !== current) return { checkpointUid: 0, backfillBeforeUid: 0, changed: true };
  return { checkpointUid, backfillBeforeUid, changed: false };
}

export function mergeSupportImapFailedUids(
  previous: readonly number[],
  failed: readonly number[],
  successful: readonly number[],
  limit: number = 100,
): number[] {
  const successfulSet = new Set(successful.filter((uid) => Number.isInteger(uid) && uid > 0));
  const merged = [...new Set([...previous, ...failed].filter((uid) => Number.isInteger(uid) && uid > 0 && !successfulSet.has(uid)))].sort((left, right) => left - right);
  return merged.slice(-Math.max(1, Math.floor(limit)));
}

export function selectSupportImapRetryUids(
  allUids: readonly number[],
  failedUids: readonly number[],
  uidValidityChanged: boolean,
  limit: number = SUPPORT_IMAP_FAILED_UID_LIMIT,
): number[] {
  if (uidValidityChanged) return [];
  const allSet = new Set(allUids.filter((uid) => Number.isInteger(uid) && uid > 0));
  return [...new Set(failedUids.filter((uid) => allSet.has(uid)))].sort((left, right) => left - right).slice(-Math.max(1, Math.floor(limit)));
}

export function classifyEmail(input: {
  fromEmail?: string;
  headers?: { listUnsubscribe?: string; precedence?: string; autoSubmitted?: string };
}): EmailClassification {
  const email = String(input.fromEmail ?? '').toLowerCase().trim();
  if (!email || !email.includes('@')) return { category: 'unknown', reason: 'missing_sender' };

  const h = input.headers ?? {};
  if (String(h.listUnsubscribe ?? '').trim()) return { category: 'automated', reason: 'list_unsubscribe' };
  const prec = String(h.precedence ?? '').toLowerCase();
  if (prec === 'bulk' || prec === 'list' || prec === 'junk') {
    return { category: 'automated', reason: `precedence_${prec}` };
  }
  const auto = String(h.autoSubmitted ?? '').toLowerCase();
  if (auto && auto !== 'no') return { category: 'automated', reason: 'auto_submitted' };

  const [localPart, domain] = email.split('@');
  if (domain === 'google.com' || domain === 'accounts.google.com' || domain.endsWith('.google.com')) {
    return { category: 'automated', reason: 'google_service_sender' };
  }
  for (const bad of STRONGLY_AUTOMATED_LOCALPARTS) {
    if (localPart === bad || localPart.startsWith(bad + '-') || localPart.startsWith(bad + '.') || localPart.startsWith(bad + '+')) {
      return { category: 'automated', reason: `automated_sender_${bad}` };
    }
  }
  return { category: 'human' };
}

/**
 * Решает, письмо ли это от ЖИВОГО человека (а не рассылка/промо/служебное Google).
 * Чистая функция — на вход адрес отправителя + релевантные заголовки.
 *
 * Отсекаем:
 *  - есть List-Unsubscribe → массовая рассылка/промо/уведомление;
 *  - Precedence: bulk/list/junk или Auto-Submitted: auto-* → авто-письмо;
 *  - служебная локальная часть адреса (noreply и пр.);
 *  - домен google.com / accounts.google.com / *.google.com и подобные сервисные.
 */
export function isHumanEmail(input: {
  fromEmail?: string;
  headers?: { listUnsubscribe?: string; precedence?: string; autoSubmitted?: string };
}): boolean {
  return classifyEmail(input).category === 'human';
}

/**
 * Превращает RawEmail в документ Firestore со статусом 'new' (чистая).
 * Тело обрезается здесь.
 */
export function rawEmailToDoc(raw: RawEmail): SupportInboxDoc {
  return {
    messageId: String(raw.messageId || ''),
    fromEmail: String(raw.fromEmail || '').toLowerCase().trim(),
    fromName: clip(raw.fromName, 200),
    subject: clip(raw.subject, 500),
    bodyText: truncateBody(raw.bodyText),
    receivedAt: new Date(raw.receivedAtMs || Date.now()).toISOString(),
    receivedAtMs: raw.receivedAtMs || Date.now(),
    status: 'new',
    ...(Number.isInteger(raw.sourceUid) ? { sourceUid: raw.sourceUid } : {}),
    ...(raw.mailCategory ? { mailCategory: raw.mailCategory } : {}),
    ...(raw.mailCategoryReason ? { mailCategoryReason: raw.mailCategoryReason } : {}),
  };
}

/**
 * Собирает финальный текст письма-ответа: тело ответа + подпись в конце.
 * Подпись цепляется отдельно (ИИ её не пишет). Пустая подпись → только тело.
 * Чистая функция.
 */
export function composeReplyWithSignature(replyBody: string, signature: string): string {
  const body = String(replyBody ?? '').trim();
  const sig = String(signature ?? '').trim();
  if (!sig) return body;
  return `${body}\n\n${sig}`;
}

/**
 * Экранирует спецсимволы HTML, чтобы текст пользователя/подписи не сломал разметку
 * и не стал вектором инъекции. Чистая функция.
 */
export function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Превращает plain-text письмо (тело + подпись) в безопасный HTML для sendMail.html.
 * Поддерживает лёгкий Markdown в подписи: **жирный** → <strong>. Переносы строк →
 * <br>. Сначала экранируем HTML (защита от инъекции), потом применяем **bold** уже
 * по экранированному тексту — звёздочки спецсимволами не являются, порядок безопасен.
 * Чистая функция (без сети/состояния).
 */
export function plainToHtmlEmail(text: string): string {
  const escaped = escapeHtml(String(text ?? ''));
  const withBold = escaped.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  const withBreaks = withBold.replace(/\r\n|\r|\n/g, '<br>');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#111;white-space:normal">${withBreaks}</div>`;
}

/**
 * Отбирает письма для пакетной генерации «всем»: статус 'new' и без черновика,
 * не больше limit. Чистая функция.
 */
export function selectForBatchGenerate<T extends { status?: string; draftReply?: string }>(
  docs: T[],
  limit: number = GENERATE_BATCH_LIMIT,
): T[] {
  return docs
    .filter((d) => d.status === 'new' && !String(d.draftReply ?? '').trim())
    .slice(0, limit);
}

/**
 * Отбирает письма для пакетной отправки: статус 'new' с непустым черновиком.
 * Чистая функция.
 */
export function selectForBatchSend<T extends { status?: string; draftReply?: string }>(
  docs: T[],
): T[] {
  return docs.filter((d) => d.status === 'new' && String(d.draftReply ?? '').trim().length > 0);
}

// ── ИИ: системный промпт и построение запроса ──────────────────────────────────
const REPLY_SYSTEM_PROMPT = [
  'Ты пишешь ответ службы поддержки приложения для изучения английского Phraseman.',
  'Тебе дают входящее письмо пользователя (тема + текст). Напиши краткий вежливый ОТВЕТ',
  'СТРОГО на языке письма (определи по тексту). От лица команды («мы»), тепло, по-человечески,',
  'по делу. Без канцелярита, без обещаний конкретных сроков, без выдуманных фактов.',
  'НЕ добавляй подпись/имя/«с уважением» в конце — подпись добавят автоматически отдельно.',
  'Только текст ответа, без темы и без служебных пометок.',
].join('\n');

/** Payload для ИИ из письма: только тема+тело, обрезанные (экономия). Чистая. */
export function buildReplyPrompt(doc: { subject?: string; bodyText?: string }): string {
  const subject = clip(doc.subject, 500);
  const body = clip(doc.bodyText, BODY_MAX_CHARS);
  return `Тема: ${subject}\n\nТекст письма:\n${body}`;
}

// ── I/O: генерация одного черновика через OpenAI ───────────────────────────────
async function generateDraftForDoc(
  apiKey: string,
  model: string,
  doc: { subject?: string; bodyText?: string },
): Promise<string> {
  const result = await openAiChat({
    apiKey,
    model,
    messages: [
      { role: 'system', content: REPLY_SYSTEM_PROMPT },
      { role: 'user', content: buildReplyPrompt(doc) },
    ],
    maxTokens: 600,
    temperature: 0.5,
  });
  return result.text.trim();
}

// ── I/O: чтение конфигурации (подпись) ─────────────────────────────────────────
async function readSignatureConfig(db: FirebaseFirestore.Firestore): Promise<{ signature: string; revision: number }> {
  try {
    const [col, docId] = SUPPORT_CONFIG_DOC.split('/');
    const snap = await db.collection(col).doc(docId).get();
    const data = snap.data() ?? {};
    const revision = Number(data.signatureRevision ?? 0);
    return {
      signature: String(data.signature ?? ''),
      revision: Number.isInteger(revision) && revision >= 0 ? revision : 0,
    };
  } catch {
    return { signature: '', revision: 0 };
  }
}

export function sanitizeSupportMailHeader(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isSafeSupportRecipient(value: string): boolean {
  return value.length <= 320 && !/[\r\n]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── I/O: IMAP-забор писем ──────────────────────────────────────────────────────
/**
 * Читает письма из INBOX по IMAP после серверного UID-checkpoint и с небольшим
 * overlap для дедупликации. Gmail \Seen не участвует в доставке: письмо может
 * быть прочитано владельцем в обычной почте до синхронизации админки.
 */
async function fetchEmailsViaImap(
  appPassword: string,
  checkpointUid: number,
  backfillBeforeUid: number,
  storedUidValidity: string,
  retryUids: readonly number[],
): Promise<{
  emails: RawEmail[];
  selectedUids: number[];
  forwardUids: number[];
  backfillUids: number[];
  parseFailed: boolean;
  failedUids: number[];
  uidValidity: string;
  uidValidityChanged: boolean;
  cursorCheckpointUid: number;
  cursorBackfillBeforeUid: number;
  retryUidsPresent: number[];
}> {
  // Ленивая загрузка тяжёлых модулей — только когда реально читаем почту.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ImapFlow } = require('imapflow');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { simpleParser } = require('mailparser');

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: SUPPORT_MAILBOX, pass: appPassword },
    logger: false,
  });

  const out: RawEmail[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const currentUidValidity = String(client.mailbox?.uidValidity ?? '').trim();
      const cursor = resolveSupportImapCursor(storedUidValidity, currentUidValidity, checkpointUid, backfillBeforeUid);
      // ВАЖНО: search с { uid: true } возвращает UID (а не seq-номера), чтобы
      // дальнейшие fetch/messageFlagsAdd с { uid: true } работали по тем же
      // сообщениям. Без этого seq-номера трактуются как UID → не те письма.
      const all = await client.search({ all: true }, { uid: true });
      const normalizedAll = all || [];
      const forwardUids = selectSupportImapUids(normalizedAll, cursor.checkpointUid);
      const backfillUids = selectSupportImapBackfillUids(normalizedAll, cursor.backfillBeforeUid);
      const persistedRetryUids = selectSupportImapRetryUids(normalizedAll, retryUids, cursor.changed);
      const uids = [...new Set([...forwardUids, ...backfillUids, ...persistedRetryUids])].sort((left, right) => left - right);
      if (uids.length === 0) return {
        emails: out, selectedUids: [], forwardUids: [], backfillUids: [], parseFailed: false, failedUids: [],
        uidValidity: currentUidValidity, uidValidityChanged: cursor.changed,
        cursorCheckpointUid: cursor.checkpointUid, cursorBackfillBeforeUid: cursor.backfillBeforeUid,
        retryUidsPresent: [],
      };
      const failedUids: number[] = [];

      for await (const msg of client.fetch(uids, { source: true, uid: true })) {
        try {
          const parsed = await simpleParser(msg.source as Buffer);
          const fromAddr = parsed.from?.value?.[0];
          const fromEmail = String(fromAddr?.address || '');
          const hdr = (name: string): string => {
            const v = parsed.headers?.get(name);
            return typeof v === 'string' ? v : (v ? String(v) : '');
          };
          const classification = classifyEmail({
            fromEmail,
            headers: {
              listUnsubscribe: hdr('list-unsubscribe'),
              precedence: hdr('precedence'),
              autoSubmitted: hdr('auto-submitted'),
            },
          });
          const messageId = String(parsed.messageId || `uid_${currentUidValidity || 'unknown'}_${msg.uid}@${SUPPORT_MAILBOX}`);
          out.push({
            messageId,
            fromEmail,
            fromName: String(fromAddr?.name || ''),
            subject: String(parsed.subject || '(без темы)'),
            bodyText: String(parsed.text || parsed.html || '').trim(),
            receivedAtMs: parsed.date ? parsed.date.getTime() : Date.now(),
            sourceUid: Number(msg.uid),
            mailCategory: classification.category,
            mailCategoryReason: classification.reason,
          });
        } catch (e) {
          failedUids.push(Number(msg.uid));
          console.warn('support_inbox: parse failed for uid', msg.uid, e);
        }
      }

      // Помечаем забранные прочитанными, чтобы следующий крон не тянул повторно.
      // (Дубль всё равно не создастся — дедуп по Message-ID.)
      try {
        await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
      } catch (e) {
        console.warn('support_inbox: mark seen failed', e);
      }
      return {
        emails: out, selectedUids: uids, forwardUids, backfillUids,
        parseFailed: failedUids.length > 0, failedUids,
        uidValidity: currentUidValidity, uidValidityChanged: cursor.changed,
        cursorCheckpointUid: cursor.checkpointUid, cursorBackfillBeforeUid: cursor.backfillBeforeUid,
        retryUidsPresent: persistedRetryUids,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return {
    emails: out, selectedUids: [], forwardUids: [], backfillUids: [], parseFailed: false, failedUids: [],
    uidValidity: storedUidValidity, uidValidityChanged: false,
    cursorCheckpointUid: checkpointUid, cursorBackfillBeforeUid: backfillBeforeUid,
    retryUidsPresent: [],
  };
}

// ── I/O: SMTP-отправка ответа через тот же Gmail ───────────────────────────────
/**
 * Отправляет ответ из support-ящика по SMTP (smtp.gmail.com:465), в тред
 * исходного письма (In-Reply-To/References = messageId). Бросает при ошибке.
 */
interface SupportSmtpTransport {
  verify(): Promise<unknown>;
  sendMail(input: Record<string, unknown>): Promise<{ messageId?: string }>;
  close?(): void;
}

function createSupportSmtpTransport(appPassword: string): SupportSmtpTransport {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    auth: { user: SUPPORT_MAILBOX, pass: appPassword },
  });
}

async function deliverPreparedSupportReply(
  transporter: SupportSmtpTransport,
  payload: SupportReplyPayload,
  operationId: string,
): Promise<{ outboundMessageId: string }> {
  const messageId = deterministicSupportMessageId(operationId);
  const info = await transporter.sendMail({
    from: SUPPORT_MAILBOX,
    to: payload.to,
    subject: payload.subject,
    text: payload.finalText,
    html: plainToHtmlEmail(payload.finalText),
    inReplyTo: payload.inReplyTo || undefined,
    references: payload.inReplyTo || undefined,
    messageId,
    headers: { 'X-Phraseman-Operation-Id': operationId },
  });
  return { outboundMessageId: String(info.messageId || messageId) };
}

// ── I/O: главный забор (крон + кнопка) ─────────────────────────────────────────
export interface PullSummary {
  fetched: number;
  saved: number;
  skippedDuplicates: number;
  firstRun: boolean;
  checkpointUid: number;
  backfillBeforeUid: number;
  parseFailed: boolean;
  failedUidCount: number;
  uidValidityChanged: boolean;
}

/**
 * Читает почту и апсертит в support_inbox. Идемпотентно: существующий Message-ID
 * пропускается (skip, не перетирает статус/черновик). firstRun определяется по
 * пустоте коллекции.
 */
export async function runSupportInboxPull(appPassword: string): Promise<PullSummary> {
  const db = admin.firestore();

  // firstRun = коллекция пуста.
  const existingProbe = await db.collection(INBOX_COLLECTION).limit(1).get();
  const firstRun = existingProbe.empty;
  const [configCollection, configDocId] = SUPPORT_CONFIG_DOC.split('/');
  const configRef = db.collection(configCollection).doc(configDocId);
  const configSnap = await configRef.get();
  const rawCheckpoint = Number(configSnap.data()?.imapLastUid ?? 0);
  const checkpointUid = Number.isInteger(rawCheckpoint) && rawCheckpoint > 0 ? rawCheckpoint : 0;
  const rawBackfillBefore = Number(configSnap.data()?.imapBackfillBeforeUid ?? 0);
  const backfillBeforeUid = Number.isInteger(rawBackfillBefore) && rawBackfillBefore > 0 ? rawBackfillBefore : 0;
  const storedUidValidity = String(configSnap.data()?.imapUidValidity ?? '').trim();
  const storedFailedUids = Array.isArray(configSnap.data()?.imapFailedUids)
    ? (configSnap.data()?.imapFailedUids as unknown[]).map(Number).filter((uid) => Number.isInteger(uid) && uid > 0).slice(-SUPPORT_IMAP_FAILED_UID_LIMIT)
    : [];

  const fetched = await fetchEmailsViaImap(appPassword, checkpointUid, backfillBeforeUid, storedUidValidity, storedFailedUids);
  const raws = fetched.emails;
  let saved = 0;
  let skipped = 0;

  for (const raw of raws) {
    const id = docIdForMessageId(raw.messageId);
    if (!id) continue;
    const ref = db.collection(INBOX_COLLECTION).doc(id);
    const legacyId = legacyDocIdForMessageId(raw.messageId);
    const legacyRef = db.collection(INBOX_COLLECTION).doc(legacyId);
    const [existing, legacyExisting] = await Promise.all([
      ref.get(),
      legacyId && legacyId !== id ? legacyRef.get() : Promise.resolve(null),
    ]);
    const legacyMatchesMessage = legacyExisting?.exists
      && String(legacyExisting.data()?.messageId ?? '').trim() === String(raw.messageId).trim();
    if (existing.exists || legacyMatchesMessage) {
      skipped++;
      continue;
    }
    await ref.set(rawEmailToDoc(raw));
    saved++;
  }

  let nextCheckpointUid = fetched.cursorCheckpointUid;
  let nextBackfillBeforeUid = fetched.cursorBackfillBeforeUid;
  if (fetched.forwardUids.length > 0) {
    nextCheckpointUid = Math.max(fetched.cursorCheckpointUid, ...fetched.forwardUids);
  }
  if (fetched.cursorBackfillBeforeUid === 0 && fetched.forwardUids.length > 0) nextBackfillBeforeUid = Math.min(...fetched.forwardUids);
  else if (fetched.backfillUids.length > 0) nextBackfillBeforeUid = Math.min(...fetched.backfillUids);
  const successfulUids = raws.map((raw) => Number(raw.sourceUid ?? 0)).filter((uid) => Number.isInteger(uid) && uid > 0);
  const nextFailedUids = mergeSupportImapFailedUids(
    fetched.uidValidityChanged ? [] : fetched.retryUidsPresent,
    fetched.failedUids,
    successfulUids,
    SUPPORT_IMAP_FAILED_UID_LIMIT,
  );
  await configRef.set({
    imapLastUid: nextCheckpointUid,
    imapBackfillBeforeUid: nextBackfillBeforeUid,
    imapUidValidity: fetched.uidValidity,
    imapFailedUids: nextFailedUids,
    imapSyncedAt: new Date().toISOString(),
  }, { merge: true });

  return {
    fetched: raws.length,
    saved,
    skippedDuplicates: skipped,
    firstRun,
    checkpointUid: nextCheckpointUid,
    backfillBeforeUid: nextBackfillBeforeUid,
    parseFailed: fetched.parseFailed,
    failedUidCount: nextFailedUids.length,
    uidValidityChanged: fetched.uidValidityChanged,
  };
}

// ── Admin helpers ──────────────────────────────────────────────────────────────
interface SupportAdminContext {
  readonly actorUid: string;
  readonly role: AdminRole;
}

interface SupportReplyBatchDoc {
  readonly schemaVersion: 2;
  readonly batchId: string;
  readonly state: 'prepared' | 'dispatching' | 'accepted' | 'attention_required' | 'partial' | 'cancelled';
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly manifestHash: string;
  readonly confirmationNonce: string;
  readonly confirmationExpiresAt: string;
  readonly children: readonly SupportReplyBatchChildIdentity[];
  readonly createdAt: string;
  readonly createdBy: string;
  readonly accepted?: number;
  readonly attention?: number;
  readonly pending?: number;
  readonly failed?: number;
}

function requireSupportPermission(
  request: { auth?: { uid?: string; token?: Record<string, unknown> } | null },
  permission: AdminPermission,
): SupportAdminContext {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  // Existing owner accounts predate adminRole claims. Treat the old admin=true
  // claim as the admin role until their token is refreshed with an explicit role.
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  if (!hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
  return { actorUid: String(request.auth.uid), role };
}

export function supportRequestFingerprint<T extends {
  messageDocId: string;
  replyText: string;
  expectedDraftRevision: number;
}>(input: T): string {
  return createHash('sha256').update(JSON.stringify({
    messageDocId: String(input.messageDocId),
    replyText: String(input.replyText),
    expectedDraftRevision: Number(input.expectedDraftRevision),
  }), 'utf8').digest('hex');
}

function boundedSupportRequestId(value: unknown, prefix: string): string {
  const supplied = String(value ?? '').trim().slice(0, 120);
  return supplied || `${prefix}-${randomUUID()}`;
}

function writeSupportAudit(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  input: {
    action: string;
    actor: SupportAdminContext;
    entityCollection?: string;
    entityId: string;
    requestId: string;
    beforeState: string;
    afterState: string;
    reason: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
  },
): string {
  const auditRef = db.collection('admin_log').doc();
  const audit = createAuditRecord({
    action: input.action,
    actorUid: input.actor.actorUid,
    role: input.actor.role,
    entity: { collection: input.entityCollection ?? 'support_reply_operations', id: input.entityId },
    reason: input.reason,
    before: { state: input.beforeState },
    after: { state: input.afterState, ...(input.metadata ?? {}) },
    requestId: input.requestId,
    timestamp: input.timestamp,
  });
  // Message bodies, recipients and signatures never enter admin_log.
  tx.create(auditRef, audit);
  return auditRef.id;
}

function supportReplyPreview(operation: SupportReplyOperation): Record<string, unknown> {
  return {
    operationId: operation.operationId,
    batchId: operation.batchId ?? '',
    messageDocId: operation.messageDocId,
    replySequence: operation.replySequence,
    state: operation.state,
    payloadHash: operation.payloadHash,
    confirmationNonce: operation.confirmationNonce,
    confirmationExpiresAt: operation.confirmationExpiresAt,
    payload: operation.payload,
    outboundMessageId: operation.outboundMessageId,
  };
}

function asSupportReplyOperation(data: FirebaseFirestore.DocumentData): SupportReplyOperation {
  return data as SupportReplyOperation;
}

async function saveGeneratedSupportDraft(
  db: FirebaseFirestore.Firestore,
  messageDocId: string,
  draftReply: string,
  actor: SupportAdminContext,
  requestId: string,
): Promise<number> {
  const messageRef = db.collection(INBOX_COLLECTION).doc(messageDocId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(messageRef);
    if (!snap.exists) throw new HttpsError('not-found', 'message_not_found');
    const currentRevision = Number(snap.data()?.draftRevision ?? 0);
    const nextRevision = (Number.isInteger(currentRevision) && currentRevision >= 0 ? currentRevision : 0) + 1;
    const now = new Date().toISOString();
    tx.set(messageRef, { draftReply, draftLang: '', draftRevision: nextRevision, draftUpdatedAt: now }, { merge: true });
    writeSupportAudit(tx, db, {
      action: 'support.draft.generate',
      actor,
      entityId: messageDocId,
      requestId,
      beforeState: `draft:${nextRevision - 1}`,
      afterState: `draft:${nextRevision}`,
      reason: 'Generated support reply draft',
      metadata: { draftRevision: nextRevision },
      timestamp: now,
    });
    return nextRevision;
  });
}

export type AgentManagerSupportDraftOutcome = Readonly<{
  kind: 'stored' | 'stale' | 'unavailable';
  outputHash: string | null;
}>;

/**
 * Server-only seam for Agent Manager. It writes one draft only while the
 * source message is still new and untouched; it never sends mail or changes
 * the inbox status.
 */
export async function generateAgentManagerSupportDraft(input: Readonly<{
  db: FirebaseFirestore.Firestore;
  sourceDocumentId: string;
  apiKey: string;
  requestId: string;
  finalize?: (tx: FirebaseFirestore.Transaction, outputHash: string) => Promise<boolean>;
}>): Promise<AgentManagerSupportDraftOutcome> {
  if (!/^m_[a-f0-9]{64}$/.test(input.sourceDocumentId)) return Object.freeze({ kind: 'unavailable', outputHash: null });
  const ref = input.db.collection(INBOX_COLLECTION).doc(input.sourceDocumentId);
  const initial = await ref.get();
  if (!initial.exists) return Object.freeze({ kind: 'stale', outputHash: null });
  const source = initial.data() as SupportInboxDoc;
  const expectedRevision = Number(source.draftRevision ?? 0);
  if (source.status !== 'new' || String(source.draftReply ?? '').trim() || !Number.isInteger(expectedRevision) || expectedRevision < 0 || !hasUsableBody(source)) {
    return Object.freeze({ kind: 'stale', outputHash: null });
  }
  const cfg = await resolveJobConfig(input.db, 'support');
  try { assertJobEnabled(cfg, 'support'); } catch { return Object.freeze({ kind: 'unavailable', outputHash: null }); }
  const draft = await generateDraftForDoc(input.apiKey, cfg.model, source);
  const outputHash = createHash('sha256').update(`agent-manager-support-draft-v1:${draft}`, 'utf8').digest('hex');
  const stored = await input.db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const data = current.exists ? current.data() as SupportInboxDoc : null;
    if (!data || data.status !== 'new' || String(data.draftReply ?? '').trim() || Number(data.draftRevision ?? 0) !== expectedRevision) return false;
    if (input.finalize && !(await input.finalize(tx, outputHash))) return false;
    const now = new Date().toISOString();
    tx.set(ref, { draftReply: draft, draftLang: '', draftRevision: expectedRevision + 1, draftUpdatedAt: now }, { merge: true });
    writeSupportAudit(tx, input.db, {
      action: 'support.draft.generate', actor: { actorUid: 'agent_manager_execution_worker', role: 'admin' }, entityId: input.sourceDocumentId,
      requestId: input.requestId, beforeState: `draft:${expectedRevision}`, afterState: `draft:${expectedRevision + 1}`,
      reason: 'Agent Manager prepared a support reply draft for manual review', metadata: { draftRevision: expectedRevision + 1, origin: 'agent_manager' }, timestamp: now,
    });
    return true;
  });
  return Object.freeze({ kind: stored ? 'stored' : 'stale', outputHash: stored ? outputHash : null });
}

function readAppPassword(): string {
  const pass = String(GMAIL_SUPPORT_APP_PASSWORD.value() || process.env.GMAIL_SUPPORT_APP_PASSWORD || '').trim();
  if (!pass) throw new HttpsError('failed-precondition', 'GMAIL_SUPPORT_APP_PASSWORD not configured');
  return pass;
}

function readOpenAiKey(): string {
  // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
  const key = String(SUPPORT_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
  return key;
}

// ── Callable: проверить почту вручную ──────────────────────────────────────────
export const adminSupportPull = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GMAIL_SUPPORT_APP_PASSWORD] },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.inbox.pull');
    const pass = readAppPassword();
    try {
      const summary = await runSupportInboxPull(pass);
      await admin.firestore().collection('admin_log').add(createAuditRecord({
        action: 'support.inbox.pull',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: INBOX_COLLECTION, id: 'gmail-sync' },
        reason: 'Manual support inbox sync',
        before: {},
        after: {
          fetched: summary.fetched,
          saved: summary.saved,
          skippedDuplicates: summary.skippedDuplicates,
          failedUidCount: summary.failedUidCount,
          uidValidityChanged: summary.uidValidityChanged,
        },
        requestId: boundedSupportRequestId(request.data?.requestId, 'support-pull'),
        timestamp: new Date().toISOString(),
      }));
      return { ok: true, ...summary };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('adminSupportPull failed', e);
      throw new HttpsError('unavailable', e instanceof Error ? e.message : 'imap_failed');
    }
  },
);

// ── Callable: сгенерировать ИИ-черновик (одно письмо или пачка 'new') ──────────
/**
 * data: { messageDocId?: string }
 *   messageDocId задан → черновик для этого письма;
 *   не задан → пачка до GENERATE_BATCH_LIMIT писем 'new' без черновика.
 * Возвращает { ok, generated, remaining }.
 */
/**
 * Server-side read for the admin inbox. support_inbox intentionally has no
 * client Firestore read rule: messages contain private correspondence and
 * must be returned only after the callable has checked the admin claim.
 */
export const adminSupportList = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireSupportPermission(request, 'support.inbox.read');
    const requestedLimit = Number(request.data?.limit ?? 500);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(500, Math.floor(requestedLimit))) : 500;
    const db = admin.firestore();
    const [snap, signatureConfig] = await Promise.all([
      db.collection(INBOX_COLLECTION).orderBy('receivedAtMs', 'desc').limit(limit).get(),
      readSignatureConfig(db),
    ]);
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as SupportInboxDoc) }));
    const activeOperationIds = [...new Set(items
      .filter((item) => item.replyGate && ['prepared', 'dispatching', 'delivery_unknown'].includes(item.replyGate.state))
      .map((item) => String(item.replyGate?.operationId ?? ''))
      .filter(Boolean))];
    const operationSnaps = await Promise.all(activeOperationIds.map((operationId) => db.collection('support_reply_operations').doc(operationId).get()));
    const activeOperations = operationSnaps
      .filter((operationSnap) => operationSnap.exists)
      .map((operationSnap) => asSupportReplyOperation(operationSnap.data()!))
      .filter((operation) => ['prepared', 'dispatching', 'delivery_unknown'].includes(operation.state));
    const pendingReplies = activeOperations.filter((operation) => !operation.batchId).map(supportReplyPreview);
    const batchIds = [...new Set(activeOperations.map((operation) => String(operation.batchId ?? '')).filter(Boolean))];
    const batchSnaps = await Promise.all(batchIds.map((batchId) => db.collection('support_reply_batches').doc(batchId).get()));
    const pendingBatches = await Promise.all(batchSnaps.filter((batchSnap) => batchSnap.exists).map(async (batchSnap) => {
      const batch = batchSnap.data() as SupportReplyBatchDoc;
      const operations = await readSupportReplyBatchOperations(db, batch);
      return supportReplyBatchPreview(batch, operations);
    }));
    return {
      ok: true,
      items,
      signature: signatureConfig.signature,
      signatureRevision: signatureConfig.revision,
      pendingReplies,
      pendingBatches,
    };
  },
);

export const adminSupportGenerateReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [SUPPORT_OPENAI_API_KEY] },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.draft.write');
    const apiKey = readOpenAiKey();
    const db = admin.firestore();
    const cfg = await resolveJobConfig(db, 'support');
    assertJobEnabled(cfg, 'support');

    const messageDocId = String(request.data?.messageDocId ?? '').trim();

    // Один документ.
    if (messageDocId) {
      const ref = db.collection(INBOX_COLLECTION).doc(messageDocId);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'message_not_found');
      const doc = snap.data() as SupportInboxDoc;
      if (!hasUsableBody(doc)) throw new HttpsError('failed-precondition', 'empty_body');
      const draft = await generateDraftForDoc(apiKey, cfg.model, doc);
      await saveGeneratedSupportDraft(
        db,
        messageDocId,
        draft,
        actor,
        boundedSupportRequestId(request.data?.requestId, 'support-draft'),
      );
      return { ok: true, generated: 1, remaining: 0 };
    }

    // Пачка: 'new' без черновика, до лимита.
    const newSnap = await db
      .collection(INBOX_COLLECTION)
      .where('status', '==', 'new')
      .limit(GENERATE_BATCH_LIMIT * 4)
      .get();
    const docs = newSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SupportInboxDoc) }));
    const batch = selectForBatchGenerate(docs, GENERATE_BATCH_LIMIT);
    let generated = 0;
    for (const d of batch) {
      if (!hasUsableBody(d)) continue;
      try {
        const draft = await generateDraftForDoc(apiKey, cfg.model, d);
        await saveGeneratedSupportDraft(db, d.id, draft, actor, `support-draft-${randomUUID()}`);
        generated++;
      } catch (e) {
        console.warn('support_inbox: draft gen failed', d.id, e);
      }
    }
    const remaining = docs.filter((d) => d.status === 'new' && !String(d.draftReply ?? '').trim()).length - generated;
    return { ok: true, generated, remaining: Math.max(0, remaining) };
  },
);

// ── Durable reply protocol: prepare → confirm → dispatch → reconcile ──────────
async function prepareSupportReplyOperation(
  db: FirebaseFirestore.Firestore,
  rawInput: unknown,
  actor: SupportAdminContext,
): Promise<Record<string, unknown>> {
  const input = parseSupportReplyPrepareRequest(rawInput);
  const requestFingerprint = supportRequestFingerprint(input);
  const proposedOperationId = supportReplyOperationId(input.idempotencyKey);
  const commandRef = db.collection('admin_command_operations').doc(`support_prepare_${proposedOperationId}`);
  const messageRef = db.collection(INBOX_COLLECTION).doc(input.messageDocId);
  const [configCollection, configDocId] = SUPPORT_CONFIG_DOC.split('/');
  const configRef = db.collection(configCollection).doc(configDocId);
  const now = new Date();
  const nowIso = now.toISOString();
  const confirmationNonce = randomBytes(24).toString('base64url');
  const confirmationExpiresAt = new Date(now.getTime() + SUPPORT_REPLY_CONFIRMATION_TTL_MS).toISOString();

  return db.runTransaction(async (tx) => {
    const [messageSnap, configSnap, commandSnap] = await Promise.all([
      tx.get(messageRef),
      tx.get(configRef),
      tx.get(commandRef),
    ]);
    if (commandSnap.exists) {
      const command = commandSnap.data() ?? {};
      if (String(command.requestFingerprint ?? '') !== requestFingerprint) {
        throw new HttpsError('already-exists', 'idempotencyKey already used for another support reply');
      }
      const replayOperationRef = db.collection('support_reply_operations').doc(String(command.operationId ?? ''));
      const replaySnap = await tx.get(replayOperationRef);
      if (!replaySnap.exists) throw new HttpsError('data-loss', 'support_reply_operation_missing');
      return { ok: true, replayed: true, ...supportReplyPreview(asSupportReplyOperation(replaySnap.data()!)) };
    }

    if (!messageSnap.exists) throw new HttpsError('not-found', 'message_not_found');
    const message = messageSnap.data() as SupportInboxDoc;
    const currentDraftRevision = Number(message.draftRevision ?? 0);
    if (!Number.isInteger(currentDraftRevision) || currentDraftRevision !== input.expectedDraftRevision) {
      throw new HttpsError('failed-precondition', 'draft_changed_reload_before_sending');
    }

    const signature = String(configSnap.data()?.signature ?? '');
    const rawSignatureRevision = Number(configSnap.data()?.signatureRevision ?? 0);
    const signatureRevision = Number.isInteger(rawSignatureRevision) && rawSignatureRevision >= 0 ? rawSignatureRevision : 0;
    const rawReplySubject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;
    const payload: SupportReplyPayload = Object.freeze({
      to: sanitizeSupportMailHeader(message.fromEmail, 320),
      subject: sanitizeSupportMailHeader(rawReplySubject, 500),
      inReplyTo: sanitizeSupportMailHeader(message.messageId, 1000),
      finalText: composeReplyWithSignature(input.replyText, signature),
      signatureRevision,
    });
    if (!isSafeSupportRecipient(payload.to)) throw new HttpsError('failed-precondition', 'no_recipient');
    const payloadHash = canonicalReplyPayloadHash(payload);

    const gate = message.replyGate;
    let gatedOperation: SupportReplyOperation | null = null;
    if (gate?.operationId) {
      const gatedSnap = await tx.get(db.collection('support_reply_operations').doc(gate.operationId));
      if (!gatedSnap.exists) throw new HttpsError('data-loss', 'reply_gate_operation_missing');
      gatedOperation = asSupportReplyOperation(gatedSnap.data()!);
    }

    if (gatedOperation?.state === 'prepared' && Date.parse(gatedOperation.confirmationExpiresAt) <= now.getTime()) {
      tx.update(db.collection('support_reply_operations').doc(gatedOperation.operationId), {
        state: 'expired',
        reconciledAt: nowIso,
        lastErrorCode: 'confirmation_expired',
      });
      writeSupportAudit(tx, db, {
        action: 'support.reply.expire', actor, entityId: gatedOperation.operationId,
        requestId: input.requestId, beforeState: 'prepared', afterState: 'expired',
        reason: 'Reply confirmation expired', timestamp: nowIso,
      });
      gatedOperation = null;
    }

    if (gatedOperation && ['prepared', 'dispatching', 'delivery_unknown'].includes(gatedOperation.state)) {
      if (gatedOperation.payloadHash !== payloadHash) {
        throw new HttpsError('already-exists', `reply_already_${gatedOperation.state}`);
      }
      tx.create(commandRef, {
        operationId: gatedOperation.operationId,
        requestFingerprint,
        kind: 'support.reply.prepare',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, replayed: true, ...supportReplyPreview(gatedOperation) };
    }

    if (message.status !== 'new') {
      throw new HttpsError('failed-precondition', message.status === 'archived' ? 'message_archived' : 'message_already_answered_reopen_first');
    }

    const previousSequence = Math.max(Number(message.replyCount ?? 0), Number(gate?.sequence ?? 0));
    const operation = buildPreparedSupportReply({
      operationId: proposedOperationId,
      messageDocId: input.messageDocId,
      replySequence: previousSequence + 1,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      requestFingerprint,
      draftRevision: currentDraftRevision,
      payload,
      confirmationNonce,
      confirmationExpiresAt,
      actorUid: actor.actorUid,
      createdAt: nowIso,
    });
    const operationRef = db.collection('support_reply_operations').doc(operation.operationId);
    tx.create(operationRef, operation);
    tx.create(commandRef, {
      operationId: operation.operationId,
      requestFingerprint,
      kind: 'support.reply.prepare',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(messageRef, {
      replyGate: {
        sequence: operation.replySequence,
        operationId: operation.operationId,
        state: 'prepared',
        payloadHash: operation.payloadHash,
        updatedAt: nowIso,
      },
    }, { merge: true });
    writeSupportAudit(tx, db, {
      action: 'support.reply.prepare', actor, entityId: operation.operationId,
      requestId: input.requestId, beforeState: gate?.state ?? 'none', afterState: 'prepared',
      reason: 'Prepared immutable support reply',
      metadata: { messageDocId: input.messageDocId, replySequence: operation.replySequence, draftRevision: currentDraftRevision },
      timestamp: nowIso,
    });
    return { ok: true, replayed: false, ...supportReplyPreview(operation) };
  });
}

async function claimSupportReplyDispatch(
  db: FirebaseFirestore.Firestore,
  input: ReturnType<typeof parseSupportReplyDispatchRequest> & { invocationId: string },
  actor: SupportAdminContext,
): Promise<import('./support_reply_delivery').SupportReplyClaimResult> {
  const operationRef = db.collection('support_reply_operations').doc(input.operationId);
  return db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (!operationSnap.exists) throw new HttpsError('not-found', 'support_reply_operation_not_found');
    const operation = asSupportReplyOperation(operationSnap.data()!);
    if (operation.payloadHash !== input.payloadHash || operation.confirmationNonce !== input.confirmationNonce) {
      throw new HttpsError('permission-denied', 'support_reply_confirmation_mismatch');
    }
    if (operation.state !== 'prepared') return { kind: 'replay', state: operation.state };

    const messageRef = db.collection(INBOX_COLLECTION).doc(operation.messageDocId);
    const messageSnap = await tx.get(messageRef);
    if (!messageSnap.exists) throw new HttpsError('data-loss', 'support_message_missing');
    const message = messageSnap.data() as SupportInboxDoc;
    const nowIso = new Date().toISOString();
    if (Date.parse(operation.confirmationExpiresAt) <= Date.now()) {
      tx.update(operationRef, { state: 'expired', reconciledAt: nowIso, lastErrorCode: 'confirmation_expired' });
      tx.set(messageRef, { replyGate: { ...message.replyGate, state: 'expired', updatedAt: nowIso } }, { merge: true });
      writeSupportAudit(tx, db, {
        action: 'support.reply.expire', actor, entityId: operation.operationId,
        requestId: operation.requestId, beforeState: 'prepared', afterState: 'expired',
        reason: 'Reply confirmation expired before dispatch', timestamp: nowIso,
      });
      return { kind: 'replay', state: 'expired' };
    }
    if (message.replyGate?.operationId !== operation.operationId || message.replyGate.state !== 'prepared') {
      throw new HttpsError('failed-precondition', 'support_reply_gate_changed');
    }
    const dispatching = { ...operation, state: 'dispatching' as const, confirmedAt: nowIso, confirmedBy: actor.actorUid, dispatchStartedAt: nowIso, dispatchInvocationId: input.invocationId };
    tx.update(operationRef, {
      state: 'dispatching', confirmedAt: nowIso, confirmedBy: actor.actorUid,
      dispatchStartedAt: nowIso, dispatchInvocationId: input.invocationId,
    });
    tx.set(messageRef, { replyGate: { ...message.replyGate, state: 'dispatching', updatedAt: nowIso } }, { merge: true });
    writeSupportAudit(tx, db, {
      action: 'support.reply.dispatch', actor, entityId: operation.operationId,
      requestId: operation.requestId, beforeState: 'prepared', afterState: 'dispatching',
      reason: 'Confirmed support reply dispatch',
      metadata: { messageDocId: operation.messageDocId, replySequence: operation.replySequence },
      timestamp: nowIso,
    });
    return { kind: 'claimed', operation: dispatching };
  });
}

async function finalizeSupportReplyAccepted(
  db: FirebaseFirestore.Firestore,
  operationId: string,
  invocationId: string,
  outboundMessageId: string,
  actor: SupportAdminContext,
): Promise<void> {
  const operationRef = db.collection('support_reply_operations').doc(operationId);
  await db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (!operationSnap.exists) throw new HttpsError('data-loss', 'support_reply_operation_missing');
    const operation = asSupportReplyOperation(operationSnap.data()!);
    if (operation.state === 'accepted' && operation.dispatchInvocationId === invocationId) return;
    if (operation.state !== 'dispatching' || operation.dispatchInvocationId !== invocationId) {
      throw new HttpsError('failed-precondition', 'support_reply_dispatch_owner_changed');
    }
    const messageRef = db.collection(INBOX_COLLECTION).doc(operation.messageDocId);
    const messageSnap = await tx.get(messageRef);
    if (!messageSnap.exists) throw new HttpsError('data-loss', 'support_message_missing');
    const message = messageSnap.data() as SupportInboxDoc;
    const nowIso = new Date().toISOString();
    tx.update(operationRef, { state: 'accepted', outboundMessageId, acceptedAt: nowIso, lastErrorCode: admin.firestore.FieldValue.delete() });
    tx.set(messageRef, {
      status: 'answered',
      sentReply: operation.payload.finalText,
      repliedAt: nowIso,
      replyCount: Math.max(Number(message.replyCount ?? 0), operation.replySequence),
      replyGate: { ...message.replyGate, state: 'accepted', outboundMessageId, updatedAt: nowIso },
    }, { merge: true });
    writeSupportAudit(tx, db, {
      action: 'support.reply.accept', actor, entityId: operation.operationId,
      requestId: operation.requestId, beforeState: 'dispatching', afterState: 'accepted',
      reason: 'SMTP provider accepted support reply',
      metadata: { messageDocId: operation.messageDocId, replySequence: operation.replySequence },
      timestamp: nowIso,
    });
  });
}

async function markSupportReplyDeliveryUnknown(
  db: FirebaseFirestore.Firestore,
  operationId: string,
  invocationId: string,
  errorCode: string,
  actor: SupportAdminContext,
): Promise<void> {
  const operationRef = db.collection('support_reply_operations').doc(operationId);
  await db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (!operationSnap.exists) return;
    const operation = asSupportReplyOperation(operationSnap.data()!);
    if (operation.state !== 'dispatching' || operation.dispatchInvocationId !== invocationId) return;
    const messageRef = db.collection(INBOX_COLLECTION).doc(operation.messageDocId);
    const messageSnap = await tx.get(messageRef);
    const message = (messageSnap.data() ?? {}) as SupportInboxDoc;
    const nowIso = new Date().toISOString();
    tx.update(operationRef, { state: 'delivery_unknown', reconciledAt: nowIso, lastErrorCode: errorCode.slice(0, 120) });
    if (messageSnap.exists) {
      tx.set(messageRef, { replyGate: { ...message.replyGate, state: 'delivery_unknown', updatedAt: nowIso } }, { merge: true });
    }
    writeSupportAudit(tx, db, {
      action: 'support.reply.delivery_unknown', actor, entityId: operation.operationId,
      requestId: operation.requestId, beforeState: 'dispatching', afterState: 'delivery_unknown',
      reason: 'SMTP outcome was ambiguous; automatic retry is disabled',
      metadata: { messageDocId: operation.messageDocId, replySequence: operation.replySequence, errorCode: errorCode.slice(0, 120) },
      timestamp: nowIso,
    });
  });
}

export async function runSupportReplyDispatchSweeper(nowMs: number = Date.now()): Promise<{ scanned: number; markedUnknown: number }> {
  const db = admin.firestore();
  const snap = await db.collection('support_reply_operations').where('state', '==', 'dispatching').limit(100).get();
  const staleBefore = nowMs - 15 * 60 * 1000;
  let markedUnknown = 0;
  const systemActor: SupportAdminContext = { actorUid: 'system:support-reply-sweeper', role: 'admin' };
  for (const doc of snap.docs) {
    const operation = asSupportReplyOperation(doc.data());
    const startedAt = Date.parse(String(operation.dispatchStartedAt ?? ''));
    if (!Number.isFinite(startedAt) || startedAt > staleBefore || !operation.dispatchInvocationId) continue;
    await markSupportReplyDeliveryUnknown(db, operation.operationId, operation.dispatchInvocationId, 'dispatch_worker_stale', systemActor);
    markedUnknown++;
  }
  return { scanned: snap.size, markedUnknown };
}

export const adminSupportPrepareReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.reply.send');
    return prepareSupportReplyOperation(admin.firestore(), request.data, actor);
  },
);

async function handleSupportReplyDispatch(request: {
  auth?: { uid?: string; token?: Record<string, unknown> } | null;
  data?: unknown;
}): Promise<Record<string, unknown>> {
  const actor = requireSupportPermission(request, 'support.reply.send');
  const input = parseSupportReplyDispatchRequest(request.data);
  const db = admin.firestore();
  const existingSnap = await db.collection('support_reply_operations').doc(input.operationId).get();
  if (!existingSnap.exists) throw new HttpsError('not-found', 'support_reply_operation_not_found');
  const existing = asSupportReplyOperation(existingSnap.data()!);
  if (existing.payloadHash !== input.payloadHash || existing.confirmationNonce !== input.confirmationNonce) {
    throw new HttpsError('permission-denied', 'support_reply_confirmation_mismatch');
  }
  if (existing.state !== 'prepared') return { ok: true, operationId: existing.operationId, state: existing.state, replayed: true };
  const pass = readAppPassword();
  const transporter = createSupportSmtpTransport(pass);
  try {
    const result = await dispatchSupportReply(input, {
      preflight: async () => { await transporter.verify(); },
      claim: (claimInput) => claimSupportReplyDispatch(db, claimInput, actor),
      deliver: (payload, headers) => deliverPreparedSupportReply(transporter, payload, headers.operationId),
      accept: (operationId, invocationId, outboundMessageId) => finalizeSupportReplyAccepted(db, operationId, invocationId, outboundMessageId, actor),
      markUnknown: (operationId, invocationId, errorCode) => markSupportReplyDeliveryUnknown(db, operationId, invocationId, errorCode, actor),
      createInvocationId: randomUUID,
    });
    return { ok: true, ...result };
  } finally {
    transporter.close?.();
  }
}

export const adminSupportDispatchReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GMAIL_SUPPORT_APP_PASSWORD] },
  handleSupportReplyDispatch,
);

// Compatibility function name retained for the original admin. It now accepts
// only the sealed operation confirmation payload; the unsafe mutable payload
// path has been removed without removing the user-visible capability.
export const adminSupportSendReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GMAIL_SUPPORT_APP_PASSWORD] },
  handleSupportReplyDispatch,
);

export const adminSupportCancelReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.reply.send');
    const operationId = String(request.data?.operationId ?? '').trim();
    const confirmationNonce = String(request.data?.confirmationNonce ?? '').trim();
    if (!operationId || !confirmationNonce) throw new HttpsError('invalid-argument', 'operationId and confirmationNonce required');
    const db = admin.firestore();
    const operationRef = db.collection('support_reply_operations').doc(operationId);
    return db.runTransaction(async (tx) => {
      const operationSnap = await tx.get(operationRef);
      if (!operationSnap.exists) throw new HttpsError('not-found', 'support_reply_operation_not_found');
      const operation = asSupportReplyOperation(operationSnap.data()!);
      if (operation.confirmationNonce !== confirmationNonce) throw new HttpsError('permission-denied', 'support_reply_confirmation_mismatch');
      if (operation.state !== 'prepared') return { ok: true, state: operation.state, replayed: true };
      const messageRef = db.collection(INBOX_COLLECTION).doc(operation.messageDocId);
      const messageSnap = await tx.get(messageRef);
      const message = (messageSnap.data() ?? {}) as SupportInboxDoc;
      const nowIso = new Date().toISOString();
      tx.update(operationRef, { state: 'cancelled', reconciledAt: nowIso, lastErrorCode: 'cancelled_by_admin' });
      if (messageSnap.exists && message.replyGate?.operationId === operationId) {
        tx.set(messageRef, { replyGate: { ...message.replyGate, state: 'cancelled', updatedAt: nowIso } }, { merge: true });
      }
      writeSupportAudit(tx, db, {
        action: 'support.reply.cancel', actor, entityId: operationId,
        requestId: boundedSupportRequestId(request.data?.requestId, 'support-cancel'),
        beforeState: 'prepared', afterState: 'cancelled', reason: 'Admin cancelled prepared support reply', timestamp: nowIso,
      });
      return { ok: true, state: 'cancelled', replayed: false };
    });
  },
);

function parseSupportReplyBatchPrepareRequest(data: unknown): {
  idempotencyKey: string;
  requestId: string;
  limit: number;
} {
  const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const idempotencyKey = String(record.idempotencyKey ?? '').trim();
  const requestId = String(record.requestId ?? '').trim();
  const rawLimit = Number(record.limit ?? SUPPORT_REPLY_BATCH_LIMIT);
  if (!idempotencyKey || idempotencyKey.length > 120 || !requestId || requestId.length > 120) {
    throw new HttpsError('invalid-argument', 'idempotencyKey and requestId required');
  }
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > SUPPORT_REPLY_BATCH_LIMIT) {
    throw new HttpsError('invalid-argument', `limit must be 1..${SUPPORT_REPLY_BATCH_LIMIT}`);
  }
  return { idempotencyKey, requestId, limit: rawLimit };
}

function supportReplyBatchPreview(batch: SupportReplyBatchDoc, operations: readonly SupportReplyOperation[]): Record<string, unknown> {
  return {
    batchId: batch.batchId,
    state: batch.state,
    manifestHash: batch.manifestHash,
    confirmationNonce: batch.confirmationNonce,
    confirmationExpiresAt: batch.confirmationExpiresAt,
    count: operations.length,
    items: operations.map((operation) => ({
      operationId: operation.operationId,
      messageDocId: operation.messageDocId,
      payloadHash: operation.payloadHash,
      replySequence: operation.replySequence,
      payload: operation.payload,
    })),
  };
}

async function readSupportReplyBatchOperations(
  db: FirebaseFirestore.Firestore,
  batch: SupportReplyBatchDoc,
): Promise<SupportReplyOperation[]> {
  const snaps = await Promise.all(batch.children.map((child) => db.collection('support_reply_operations').doc(child.operationId).get()));
  if (snaps.some((snap) => !snap.exists)) throw new HttpsError('data-loss', 'support_reply_batch_child_missing');
  return snaps.map((snap) => asSupportReplyOperation(snap.data()!));
}

async function refreshSupportReplyBatchSummary(
  db: FirebaseFirestore.Firestore,
  batchId: string,
  actor: SupportAdminContext,
  requestId: string,
): Promise<void> {
  if (!batchId) return;
  const batchRef = db.collection('support_reply_batches').doc(batchId);
  const batchSnap = await batchRef.get();
  if (!batchSnap.exists) return;
  const batch = batchSnap.data() as SupportReplyBatchDoc;
  const operations = await readSupportReplyBatchOperations(db, batch);
  const summary = summarizeSupportReplyBatch(operations.map((operation) => operation.state));
  await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(batchRef);
    if (!freshSnap.exists) return;
    const beforeState = String(freshSnap.data()?.state ?? batch.state);
    if (beforeState === summary.state
      && Number(freshSnap.data()?.accepted ?? -1) === summary.accepted
      && Number(freshSnap.data()?.attention ?? -1) === summary.attention
      && Number(freshSnap.data()?.pending ?? -1) === summary.pending
      && Number(freshSnap.data()?.failed ?? -1) === summary.failed) return;
    const nowIso = new Date().toISOString();
    tx.update(batchRef, { ...summary, reconciledAt: nowIso });
    writeSupportAudit(tx, db, {
      action: 'support.reply.batch.reconcile', actor, entityCollection: 'support_reply_batches', entityId: batchId,
      requestId, beforeState, afterState: summary.state,
      reason: 'Recomputed support reply batch after child reconciliation',
      metadata: { accepted: summary.accepted, attention: summary.attention, pending: summary.pending, failed: summary.failed },
      timestamp: nowIso,
    });
  });
}

export const adminSupportPrepareReplyBatch = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.reply.send');
    const input = parseSupportReplyBatchPrepareRequest(request.data);
    const db = admin.firestore();
    const batchId = supportReplyBatchId(input.idempotencyKey);
    const batchRef = db.collection('support_reply_batches').doc(batchId);
    const commandRef = db.collection('admin_command_operations').doc(`support_batch_${batchId}`);
    const requestFingerprint = createHash('sha256').update(JSON.stringify({ limit: input.limit }), 'utf8').digest('hex');
    const candidateSnap = await db.collection(INBOX_COLLECTION).where('status', '==', 'new').limit(500).get();
    const candidateRefs = candidateSnap.docs
      .filter((doc) => String(doc.data().draftReply ?? '').trim())
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, input.limit)
      .map((doc) => db.collection(INBOX_COLLECTION).doc(doc.id));
    const [configCollection, configDocId] = SUPPORT_CONFIG_DOC.split('/');
    const configRef = db.collection(configCollection).doc(configDocId);
    const now = new Date();
    const nowIso = now.toISOString();
    const confirmationNonce = randomBytes(24).toString('base64url');
    const confirmationExpiresAt = new Date(now.getTime() + SUPPORT_REPLY_BATCH_CONFIRMATION_TTL_MS).toISOString();

    const outcome = await db.runTransaction(async (tx) => {
      const [commandSnap, configSnap, ...messageSnaps] = await Promise.all([
        tx.get(commandRef),
        tx.get(configRef),
        ...candidateRefs.map((ref) => tx.get(ref)),
      ]);
      if (commandSnap.exists) {
        const command = commandSnap.data() ?? {};
        if (String(command.requestFingerprint ?? '') !== requestFingerprint) {
          throw new HttpsError('already-exists', 'batch idempotencyKey already used for another request');
        }
        return { replayed: true, batchId: String(command.batchId ?? batchId), batch: null, operations: null };
      }

      const signature = String(configSnap.data()?.signature ?? '');
      const rawSignatureRevision = Number(configSnap.data()?.signatureRevision ?? 0);
      const signatureRevision = Number.isInteger(rawSignatureRevision) && rawSignatureRevision >= 0 ? rawSignatureRevision : 0;
      const eligible = messageSnaps
        .filter((snap) => snap.exists)
        .map((snap) => ({ id: snap.id, ...(snap.data() as SupportInboxDoc) }))
        .filter((message) => message.status === 'new' && String(message.draftReply ?? '').trim())
        .filter((message) => !message.replyGate || !['prepared', 'dispatching', 'delivery_unknown'].includes(message.replyGate.state))
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, input.limit);
      if (!eligible.length) throw new HttpsError('failed-precondition', 'no_ready_support_drafts');

      const operations = eligible.map((message) => {
        const draftRevision = Number.isInteger(Number(message.draftRevision ?? 0)) ? Number(message.draftRevision ?? 0) : 0;
        const operationId = supportReplyOperationId(`${batchId}:${message.id}:${draftRevision}`);
        const rawReplySubject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;
        const payload: SupportReplyPayload = Object.freeze({
          to: sanitizeSupportMailHeader(message.fromEmail, 320),
          subject: sanitizeSupportMailHeader(rawReplySubject, 500),
          inReplyTo: sanitizeSupportMailHeader(message.messageId, 1000),
          finalText: composeReplyWithSignature(String(message.draftReply ?? ''), signature),
          signatureRevision,
        });
        if (!isSafeSupportRecipient(payload.to)) throw new HttpsError('failed-precondition', `no_recipient:${message.id}`);
        return buildPreparedSupportReply({
          operationId,
          messageDocId: message.id,
          replySequence: Math.max(Number(message.replyCount ?? 0), Number(message.replyGate?.sequence ?? 0)) + 1,
          batchId,
          idempotencyKey: `${input.idempotencyKey}:${message.id}`,
          requestId: input.requestId,
          requestFingerprint: supportRequestFingerprint({ messageDocId: message.id, replyText: String(message.draftReply ?? ''), expectedDraftRevision: draftRevision }),
          draftRevision,
          payload,
          confirmationNonce,
          confirmationExpiresAt,
          actorUid: actor.actorUid,
          createdAt: nowIso,
        });
      });
      const children = operations.map((operation): SupportReplyBatchChildIdentity => ({
        operationId: operation.operationId,
        messageDocId: operation.messageDocId,
        payloadHash: operation.payloadHash,
      }));
      const batch: SupportReplyBatchDoc = Object.freeze({
        schemaVersion: 2,
        batchId,
        state: 'prepared',
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        requestFingerprint,
        manifestHash: canonicalSupportBatchManifestHash(children),
        confirmationNonce,
        confirmationExpiresAt,
        children: Object.freeze(children),
        createdAt: nowIso,
        createdBy: actor.actorUid,
      });

      for (const operation of operations) {
        tx.create(db.collection('support_reply_operations').doc(operation.operationId), operation);
        tx.set(db.collection(INBOX_COLLECTION).doc(operation.messageDocId), {
          replyGate: {
            sequence: operation.replySequence,
            operationId: operation.operationId,
            state: 'prepared',
            payloadHash: operation.payloadHash,
            updatedAt: nowIso,
          },
        }, { merge: true });
      }
      tx.create(batchRef, batch);
      tx.create(commandRef, { batchId, requestFingerprint, kind: 'support.reply.batch.prepare', createdAt: admin.firestore.FieldValue.serverTimestamp() });
      writeSupportAudit(tx, db, {
        action: 'support.reply.batch.prepare', actor, entityCollection: 'support_reply_batches', entityId: batchId,
        requestId: input.requestId, beforeState: 'none', afterState: 'prepared',
        reason: 'Prepared sealed support reply batch',
        metadata: { count: operations.length, manifestHash: batch.manifestHash, messageDocIds: operations.map((operation) => operation.messageDocId) },
        timestamp: nowIso,
      });
      return { replayed: false, batchId, batch, operations };
    });

    if (outcome.batch && outcome.operations) return { ok: true, replayed: false, ...supportReplyBatchPreview(outcome.batch, outcome.operations) };
    const batchSnap = await db.collection('support_reply_batches').doc(outcome.batchId).get();
    if (!batchSnap.exists) throw new HttpsError('data-loss', 'support_reply_batch_missing');
    const batch = batchSnap.data() as SupportReplyBatchDoc;
    const operations = await readSupportReplyBatchOperations(db, batch);
    return { ok: true, replayed: true, ...supportReplyBatchPreview(batch, operations) };
  },
);

export const adminSupportDispatchReplyBatch = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GMAIL_SUPPORT_APP_PASSWORD], timeoutSeconds: 540 },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.reply.send');
    const batchId = String(request.data?.batchId ?? '').trim();
    const confirmationNonce = String(request.data?.confirmationNonce ?? '').trim();
    const manifestHash = String(request.data?.manifestHash ?? '').trim().toLowerCase();
    if (!batchId || !confirmationNonce || !/^[a-f0-9]{64}$/.test(manifestHash)) {
      throw new HttpsError('invalid-argument', 'batchId, confirmationNonce and manifestHash required');
    }
    const db = admin.firestore();
    const batchRef = db.collection('support_reply_batches').doc(batchId);
    const initialBatchSnap = await batchRef.get();
    if (!initialBatchSnap.exists) throw new HttpsError('not-found', 'support_reply_batch_not_found');
    const initialBatch = initialBatchSnap.data() as SupportReplyBatchDoc;
    if (initialBatch.confirmationNonce !== confirmationNonce || initialBatch.manifestHash !== manifestHash) {
      throw new HttpsError('permission-denied', 'support_reply_batch_confirmation_mismatch');
    }
    if (initialBatch.state === 'accepted' || initialBatch.state === 'cancelled') {
      return { ok: true, replayed: true, batchId, state: initialBatch.state, accepted: initialBatch.accepted ?? 0, attention: initialBatch.attention ?? 0, pending: initialBatch.pending ?? 0, failed: initialBatch.failed ?? 0 };
    }
    const pass = readAppPassword();
    const transporter = createSupportSmtpTransport(pass);
    try {
      await transporter.verify();
      const dispatchStartedAt = new Date().toISOString();
      const batchClaim = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(batchRef);
        if (!freshSnap.exists) throw new HttpsError('not-found', 'support_reply_batch_not_found');
        const fresh = freshSnap.data() as SupportReplyBatchDoc;
        if (fresh.confirmationNonce !== confirmationNonce || fresh.manifestHash !== manifestHash) {
          throw new HttpsError('permission-denied', 'support_reply_batch_confirmation_mismatch');
        }
        if (!isSupportReplyBatchDispatchableState(fresh.state)) {
          return { dispatchable: false as const, batch: fresh };
        }
        if (Date.parse(fresh.confirmationExpiresAt) <= Date.now() && fresh.state === 'prepared') {
          throw new HttpsError('deadline-exceeded', 'support_reply_batch_confirmation_expired');
        }
        if (fresh.state === 'prepared') {
          tx.update(batchRef, { state: 'dispatching', dispatchStartedAt, dispatchStartedBy: actor.actorUid });
          writeSupportAudit(tx, db, {
            action: 'support.reply.batch.dispatch', actor, entityCollection: 'support_reply_batches', entityId: batchId,
            requestId: fresh.requestId, beforeState: 'prepared', afterState: 'dispatching',
            reason: 'Confirmed sealed support reply batch', metadata: { count: fresh.children.length, manifestHash }, timestamp: dispatchStartedAt,
          });
        }
        return {
          dispatchable: true as const,
          startedNew: fresh.state === 'prepared',
          batch: { ...fresh, state: fresh.state === 'prepared' ? 'dispatching' as const : fresh.state },
        };
      });
      if (!batchClaim.dispatchable) {
        const terminal = batchClaim.batch;
        return { ok: true, replayed: true, batchId, state: terminal.state, accepted: terminal.accepted ?? 0, attention: terminal.attention ?? 0, pending: terminal.pending ?? 0, failed: terminal.failed ?? 0 };
      }
      const batch = batchClaim.batch;

      const results: Array<{ state: SupportReplyState }> = new Array(batch.children.length);
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (true) {
          const index = cursor++;
          if (index >= batch.children.length) return;
          const child = batch.children[index];
          try {
            results[index] = await dispatchSupportReply({ operationId: child.operationId, confirmationNonce, payloadHash: child.payloadHash }, {
              preflight: async () => undefined,
              claim: (claimInput) => claimSupportReplyDispatch(db, claimInput, actor),
              deliver: (payload, headers) => deliverPreparedSupportReply(transporter, payload, headers.operationId),
              accept: (operationId, invocationId, outboundMessageId) => finalizeSupportReplyAccepted(db, operationId, invocationId, outboundMessageId, actor),
              markUnknown: (operationId, invocationId, errorCode) => markSupportReplyDeliveryUnknown(db, operationId, invocationId, errorCode, actor),
              createInvocationId: randomUUID,
            });
          } catch {
            const childSnap = await db.collection('support_reply_operations').doc(child.operationId).get();
            results[index] = { state: childSnap.exists ? asSupportReplyOperation(childSnap.data()!).state : 'cancelled' };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, batch.children.length) }, () => worker()));
      const summary = summarizeSupportReplyBatch(results.map((result) => result.state));
      const finishedAt = new Date().toISOString();
      const finishResult = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(batchRef);
        if (!freshSnap.exists) throw new HttpsError('data-loss', 'support_reply_batch_missing');
        const beforeState = String(freshSnap.data()?.state ?? 'dispatching');
        if (!['dispatching', 'attention_required', 'partial'].includes(beforeState)) {
          return { updated: false as const, state: beforeState };
        }
        tx.update(batchRef, { ...summary, finishedAt });
        writeSupportAudit(tx, db, {
          action: 'support.reply.batch.finish', actor, entityCollection: 'support_reply_batches', entityId: batchId,
          requestId: batch.requestId, beforeState, afterState: summary.state,
          reason: 'Finished support reply batch pass',
          metadata: { accepted: summary.accepted, attention: summary.attention, pending: summary.pending, failed: summary.failed, manifestHash },
          timestamp: finishedAt,
        });
        return { updated: true as const, state: summary.state };
      });
      if (!finishResult.updated) return { ok: true, replayed: true, batchId, state: finishResult.state };
      return { ok: true, replayed: !batchClaim.startedNew, batchId, ...summary };
    } finally {
      transporter.close?.();
    }
  },
);

export const adminSupportCancelReplyBatch = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.reply.send');
    const batchId = String(request.data?.batchId ?? '').trim();
    const confirmationNonce = String(request.data?.confirmationNonce ?? '').trim();
    if (!batchId || !confirmationNonce) throw new HttpsError('invalid-argument', 'batchId and confirmationNonce required');
    const db = admin.firestore();
    const batchRef = db.collection('support_reply_batches').doc(batchId);
    return db.runTransaction(async (tx) => {
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists) throw new HttpsError('not-found', 'support_reply_batch_not_found');
      const batch = batchSnap.data() as SupportReplyBatchDoc;
      if (batch.confirmationNonce !== confirmationNonce) throw new HttpsError('permission-denied', 'support_reply_batch_confirmation_mismatch');
      if (batch.state === 'cancelled' || batch.state === 'accepted') return { ok: true, state: batch.state, replayed: true };
      if (batch.state !== 'prepared') throw new HttpsError('failed-precondition', 'dispatching_batch_cannot_be_cancelled');
      const operationRefs = batch.children.map((child) => db.collection('support_reply_operations').doc(child.operationId));
      const operationSnaps = await Promise.all(operationRefs.map((ref) => tx.get(ref)));
      if (operationSnaps.some((snap) => !snap.exists)) throw new HttpsError('data-loss', 'support_reply_batch_child_missing');
      const operations = operationSnaps.map((snap) => asSupportReplyOperation(snap.data()!));
      const messageRefs = operations.map((operation) => db.collection(INBOX_COLLECTION).doc(operation.messageDocId));
      const messageSnaps = await Promise.all(messageRefs.map((ref) => tx.get(ref)));
      const nowIso = new Date().toISOString();
      operations.forEach((operation, index) => {
        if (operation.state !== 'prepared') return;
        tx.update(operationRefs[index], { state: 'cancelled', reconciledAt: nowIso, lastErrorCode: 'batch_cancelled_by_admin' });
        const message = (messageSnaps[index]?.data() ?? {}) as SupportInboxDoc;
        if (messageSnaps[index]?.exists && message.replyGate?.operationId === operation.operationId) {
          tx.set(messageRefs[index], { replyGate: { ...message.replyGate, state: 'cancelled', updatedAt: nowIso } }, { merge: true });
        }
      });
      tx.update(batchRef, { state: 'cancelled', cancelledAt: nowIso, cancelledBy: actor.actorUid });
      writeSupportAudit(tx, db, {
        action: 'support.reply.batch.cancel', actor, entityCollection: 'support_reply_batches', entityId: batchId,
        requestId: boundedSupportRequestId(request.data?.requestId, 'support-batch-cancel'), beforeState: 'prepared', afterState: 'cancelled',
        reason: 'Admin cancelled sealed support reply batch', metadata: { count: operations.length, manifestHash: batch.manifestHash }, timestamp: nowIso,
      });
      return { ok: true, state: 'cancelled', replayed: false };
    });
  },
);

export const adminSupportResolveReplyDelivery = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.reply.resolve_ambiguous');
    const operationId = String(request.data?.operationId ?? '').trim();
    const resolution = String(request.data?.resolution ?? '').trim() as 'accepted' | 'verified_not_sent';
    if (!operationId || (resolution !== 'accepted' && resolution !== 'verified_not_sent')) {
      throw new HttpsError('invalid-argument', 'operationId and valid resolution required');
    }
    const db = admin.firestore();
    const operationRef = db.collection('support_reply_operations').doc(operationId);
    const requestId = boundedSupportRequestId(request.data?.requestId, 'support-reconcile');
    const result = await db.runTransaction(async (tx) => {
      const operationSnap = await tx.get(operationRef);
      if (!operationSnap.exists) throw new HttpsError('not-found', 'support_reply_operation_not_found');
      const operation = asSupportReplyOperation(operationSnap.data()!);
      if (operation.state === resolution) return { ok: true, state: resolution, replayed: true, batchId: operation.batchId ?? '' };
      if (operation.state !== 'delivery_unknown') throw new HttpsError('failed-precondition', 'reply_is_not_ambiguous');
      const messageRef = db.collection(INBOX_COLLECTION).doc(operation.messageDocId);
      const messageSnap = await tx.get(messageRef);
      if (!messageSnap.exists) throw new HttpsError('data-loss', 'support_message_missing');
      const message = messageSnap.data() as SupportInboxDoc;
      const nowIso = new Date().toISOString();
      const outboundMessageId = String(request.data?.outboundMessageId ?? operation.outboundMessageId ?? deterministicSupportMessageId(operationId));
      const reconciliationReason = String(request.data?.reason ?? '').trim().slice(0, 500) || 'Manually reconciled ambiguous SMTP delivery';
      tx.update(operationRef, {
        state: resolution,
        reconciledAt: nowIso,
        ...(resolution === 'accepted' ? { acceptedAt: nowIso, outboundMessageId } : {}),
        lastErrorCode: admin.firestore.FieldValue.delete(),
      });
      tx.set(messageRef, resolution === 'accepted' ? {
        status: 'answered',
        sentReply: operation.payload.finalText,
        repliedAt: nowIso,
        replyCount: Math.max(Number(message.replyCount ?? 0), operation.replySequence),
        replyGate: { ...message.replyGate, state: 'accepted', outboundMessageId, updatedAt: nowIso },
      } : {
        replyGate: { ...message.replyGate, state: 'verified_not_sent', updatedAt: nowIso },
      }, { merge: true });
      writeSupportAudit(tx, db, {
        action: 'support.reply.reconcile', actor, entityId: operationId,
        requestId,
        beforeState: 'delivery_unknown', afterState: resolution,
        reason: reconciliationReason,
        metadata: { messageDocId: operation.messageDocId, replySequence: operation.replySequence }, timestamp: nowIso,
      });
      return { ok: true, state: resolution, replayed: false, batchId: operation.batchId ?? '' };
    });
    if (result.batchId) await refreshSupportReplyBatchSummary(db, result.batchId, actor, requestId);
    return result;
  },
);

// ── Callable: сохранить подпись ────────────────────────────────────────────────
export const adminSupportSaveSignature = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.settings.write');
    const signature = String(request.data?.signature ?? '').slice(0, 2000);
    const db = admin.firestore();
    const [col, docId] = SUPPORT_CONFIG_DOC.split('/');
    const ref = db.collection(col).doc(docId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const previousRevision = Number(snap.data()?.signatureRevision ?? 0);
      const signatureRevision = (Number.isInteger(previousRevision) && previousRevision >= 0 ? previousRevision : 0) + 1;
      const nowIso = new Date().toISOString();
      tx.set(ref, { signature, signatureRevision, updatedAt: nowIso, updatedBy: actor.actorUid }, { merge: true });
      writeSupportAudit(tx, db, {
        action: 'support.settings.signature', actor, entityId: 'signature',
        requestId: boundedSupportRequestId(request.data?.requestId, 'support-signature'),
        beforeState: `signature:${signatureRevision - 1}`, afterState: `signature:${signatureRevision}`,
        reason: 'Updated support signature', metadata: { signatureRevision }, timestamp: nowIso,
      });
      return { signatureRevision };
    });
    return { ok: true, signature, signatureRevision: result.signatureRevision };
  },
);

// ── Callable: сменить статус письма (архив/вернуть) ────────────────────────────
export const adminSupportSetStatus = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireSupportPermission(request, 'support.archive');
    const messageDocId = String(request.data?.messageDocId ?? '').trim();
    const status = String(request.data?.status ?? '').trim() as SupportStatus;
    if (!messageDocId) throw new HttpsError('invalid-argument', 'messageDocId required');
    if (status !== 'new' && status !== 'answered' && status !== 'archived') {
      throw new HttpsError('invalid-argument', 'bad_status');
    }
    const db = admin.firestore();
    const messageRef = db.collection(INBOX_COLLECTION).doc(messageDocId);
    await db.runTransaction(async (tx) => {
      const messageSnap = await tx.get(messageRef);
      if (!messageSnap.exists) throw new HttpsError('not-found', 'message_not_found');
      const message = messageSnap.data() as SupportInboxDoc;
      const nowIso = new Date().toISOString();
      let nextGate = message.replyGate;
      if (status === 'archived' && message.replyGate?.state === 'prepared') {
        const operationRef = db.collection('support_reply_operations').doc(message.replyGate.operationId);
        const operationSnap = await tx.get(operationRef);
        if (operationSnap.exists && operationSnap.data()?.state === 'prepared') {
          tx.update(operationRef, { state: 'cancelled', reconciledAt: nowIso, lastErrorCode: 'message_archived' });
          nextGate = { ...message.replyGate, state: 'cancelled', updatedAt: nowIso };
          writeSupportAudit(tx, db, {
            action: 'support.reply.cancel', actor, entityId: message.replyGate.operationId,
            requestId: boundedSupportRequestId(request.data?.requestId, 'support-archive-cancel'),
            beforeState: 'prepared', afterState: 'cancelled', reason: 'Message archived before dispatch', timestamp: nowIso,
          });
        }
      }
      tx.set(messageRef, { status, ...(nextGate ? { replyGate: nextGate } : {}) }, { merge: true });
      writeSupportAudit(tx, db, {
        action: 'support.inbox.status', actor, entityId: messageDocId,
        requestId: boundedSupportRequestId(request.data?.requestId, 'support-status'),
        beforeState: message.status ?? 'new', afterState: status,
        reason: 'Changed support inbox status', timestamp: nowIso,
      });
    });
    return { ok: true, status };
  },
);

// ── Крон: забор раз в сутки ─────────────────────────────────────────────────────
// (регистрируется в index.ts как gmailSupportPullCron)
export async function runSupportInboxPullCron(): Promise<PullSummary | null> {
  const pass = String(GMAIL_SUPPORT_APP_PASSWORD.value() || process.env.GMAIL_SUPPORT_APP_PASSWORD || '').trim();
  if (!pass) {
    console.error('gmailSupportPullCron: GMAIL_SUPPORT_APP_PASSWORD not configured — skipping');
    return null;
  }
  try {
    const summary = await runSupportInboxPull(pass);
    console.log('gmailSupportPullCron', JSON.stringify(summary));
    return summary;
  } catch (e) {
    console.error('gmailSupportPullCron failed (IMAP?)', e);
    return null;
  }
}
