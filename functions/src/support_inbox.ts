// ═══════════════════════════════════════════════════════════════════════════
// support_inbox.ts — входящая почта поддержки (support.phraseman@gmail.com) в
// админке + ИИ-черновики ответов. Спека: specs/gmail-support-inbox.md.
//
// Поток: раз в сутки крон (или кнопка) читает НЕПРОЧИТАННЫЕ письма из INBOX по
// IMAP (App Password, секрет GMAIL_SUPPORT_APP_PASSWORD), кладёт в Firestore
// (support_inbox), помечает прочитанными. В админке — список, фильтр статусов,
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
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { openAiChat } from './explain/explain_provider';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';

const REGION = 'us-central1';
export const GMAIL_SUPPORT_APP_PASSWORD = defineSecret('GMAIL_SUPPORT_APP_PASSWORD');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ── Константы ─────────────────────────────────────────────────────────────────
export const SUPPORT_MAILBOX = 'support.phraseman@gmail.com';
export const INBOX_COLLECTION = 'support_inbox';
export const SUPPORT_CONFIG_DOC = 'admin_config/support_inbox';
/** Обрезка тела письма перед сохранением и перед отправкой в ИИ (экономия). */
export const BODY_MAX_CHARS = 20000;
/** «Сгенерировать всем» / первичный забор — не больше за один заход. */
export const GENERATE_BATCH_LIMIT = 25;
export const FIRST_PULL_LIMIT = 50;

export type SupportStatus = 'new' | 'answered' | 'archived';

export interface RawEmail {
  messageId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  receivedAtMs: number;
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
  status: SupportStatus;
  draftReply?: string;
  draftLang?: string;
  sentReply?: string;
  repliedAt?: string;
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
  // messageId вида <abc.def@mail.gmail.com>; заменяем всё небезопасное.
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 400);
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
async function readSignature(db: FirebaseFirestore.Firestore): Promise<string> {
  try {
    const [col, docId] = SUPPORT_CONFIG_DOC.split('/');
    const snap = await db.collection(col).doc(docId).get();
    return String(snap.data()?.signature ?? '');
  } catch {
    return '';
  }
}

// ── I/O: IMAP-забор писем ──────────────────────────────────────────────────────
/**
 * Читает письма из INBOX по IMAP. Если firstRun — последние FIRST_PULL_LIMIT
 * (любые), иначе только НЕПРОЧИТАННЫЕ. Помечает забранные прочитанными. Бросает
 * при недоступности IMAP (ловится выше → понятная ошибка, не молчание).
 */
async function fetchEmailsViaImap(appPassword: string, firstRun: boolean): Promise<RawEmail[]> {
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
      // Первый запуск: последние N любых. Иначе: только непрочитанные.
      // ВАЖНО: search с { uid: true } возвращает UID (а не seq-номера), чтобы
      // дальнейшие fetch/messageFlagsAdd с { uid: true } работали по тем же
      // сообщениям. Без этого seq-номера трактуются как UID → не те письма.
      let uids: number[] = [];
      // Do not make Gmail's \Seen flag the delivery contract. The owner or a
      // mail client may read a message before the admin sync runs. Fetch a
      // bounded recent tail every time and let Firestore deduplicate it.
      const all = await client.search({ all: true }, { uid: true });
      uids = (all || []).slice(-FIRST_PULL_LIMIT);
      if (uids.length === 0) return out;

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
          const messageId = String(parsed.messageId || `uid_${msg.uid}@${SUPPORT_MAILBOX}`);
          out.push({
            messageId,
            fromEmail,
            fromName: String(fromAddr?.name || ''),
            subject: String(parsed.subject || '(без темы)'),
            bodyText: String(parsed.text || parsed.html || '').trim(),
            receivedAtMs: parsed.date ? parsed.date.getTime() : Date.now(),
            mailCategory: classification.category,
            mailCategoryReason: classification.reason,
          });
        } catch (e) {
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
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return out;
}

// ── I/O: SMTP-отправка ответа через тот же Gmail ───────────────────────────────
/**
 * Отправляет ответ из support-ящика по SMTP (smtp.gmail.com:465), в тред
 * исходного письма (In-Reply-To/References = messageId). Бросает при ошибке.
 */
async function sendReplyViaSmtp(
  appPassword: string,
  to: string,
  subject: string,
  text: string,
  inReplyToMessageId: string,
  fromName: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: SUPPORT_MAILBOX, pass: appPassword },
  });
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  await transporter.sendMail({
    from: fromName ? `${fromName} <${SUPPORT_MAILBOX}>` : SUPPORT_MAILBOX,
    to,
    subject: replySubject,
    text,
    html: plainToHtmlEmail(text),
    inReplyTo: inReplyToMessageId || undefined,
    references: inReplyToMessageId || undefined,
  });
}

// ── I/O: главный забор (крон + кнопка) ─────────────────────────────────────────
export interface PullSummary {
  fetched: number;
  saved: number;
  skippedDuplicates: number;
  firstRun: boolean;
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

  const raws = await fetchEmailsViaImap(appPassword, firstRun);
  let saved = 0;
  let skipped = 0;

  for (const raw of raws) {
    const id = docIdForMessageId(raw.messageId);
    if (!id) continue;
    const ref = db.collection(INBOX_COLLECTION).doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      skipped++;
      continue;
    }
    await ref.set(rawEmailToDoc(raw));
    saved++;
  }

  return { fetched: raws.length, saved, skippedDuplicates: skipped, firstRun };
}

// ── Admin helpers ──────────────────────────────────────────────────────────────
function requireAdmin(request: { auth?: { token?: Record<string, unknown> } | null }): void {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
}

function readAppPassword(): string {
  const pass = String(GMAIL_SUPPORT_APP_PASSWORD.value() || process.env.GMAIL_SUPPORT_APP_PASSWORD || '').trim();
  if (!pass) throw new HttpsError('failed-precondition', 'GMAIL_SUPPORT_APP_PASSWORD not configured');
  return pass;
}

function readOpenAiKey(): string {
  // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
  const key = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
  return key;
}

// ── Callable: проверить почту вручную ──────────────────────────────────────────
export const adminSupportPull = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GMAIL_SUPPORT_APP_PASSWORD] },
  async (request) => {
    requireAdmin(request);
    const pass = readAppPassword();
    try {
      return { ok: true, ...(await runSupportInboxPull(pass)) };
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
export const adminSupportGenerateReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requireAdmin(request);
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
      await ref.set({ draftReply: draft, draftLang: '' }, { merge: true });
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
        await db.collection(INBOX_COLLECTION).doc(d.id).set({ draftReply: draft, draftLang: '' }, { merge: true });
        generated++;
      } catch (e) {
        console.warn('support_inbox: draft gen failed', d.id, e);
      }
    }
    const remaining = docs.filter((d) => d.status === 'new' && !String(d.draftReply ?? '').trim()).length - generated;
    return { ok: true, generated, remaining: Math.max(0, remaining) };
  },
);

// ── Callable: отправить ответ (одно письмо или все готовые черновики) ──────────
/**
 * data: { messageDocId?: string; replyText?: string }
 *   messageDocId задан → отправить этому (replyText = отредактированный текст,
 *     иначе draftReply). Не задан → отправить все 'new' с непустым черновиком.
 * Подпись из admin_config цепляется в конец. Возвращает { ok, sent, failed }.
 */
export const adminSupportSendReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GMAIL_SUPPORT_APP_PASSWORD] },
  async (request) => {
    requireAdmin(request);
    const pass = readAppPassword();
    const db = admin.firestore();
    const signature = await readSignature(db);
    const messageDocId = String(request.data?.messageDocId ?? '').trim();
    const nowIso = new Date().toISOString();

    const sendOne = async (docId: string, doc: SupportInboxDoc, replyBody: string): Promise<void> => {
      const finalText = composeReplyWithSignature(replyBody, signature);
      await sendReplyViaSmtp(pass, doc.fromEmail, doc.subject, finalText, doc.messageId, '');
      await db.collection(INBOX_COLLECTION).doc(docId).set(
        { status: 'answered', sentReply: finalText, repliedAt: nowIso },
        { merge: true },
      );
    };

    // Один документ.
    if (messageDocId) {
      const ref = db.collection(INBOX_COLLECTION).doc(messageDocId);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'message_not_found');
      const doc = snap.data() as SupportInboxDoc;
      const replyBody = String(request.data?.replyText ?? '').trim() || String(doc.draftReply ?? '').trim();
      if (!replyBody) throw new HttpsError('failed-precondition', 'empty_reply');
      if (!doc.fromEmail) throw new HttpsError('failed-precondition', 'no_recipient');
      try {
        await sendOne(messageDocId, doc, replyBody);
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error('adminSupportSendReply send failed', messageDocId, e);
        throw new HttpsError('unavailable', e instanceof Error ? e.message : 'smtp_failed');
      }
      return { ok: true, sent: 1, failed: 0 };
    }

    // Пачка: все 'new' с непустым черновиком.
    const newSnap = await db.collection(INBOX_COLLECTION).where('status', '==', 'new').limit(200).get();
    const docs = newSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SupportInboxDoc) }));
    const toSend = selectForBatchSend(docs);
    let sent = 0;
    let failed = 0;
    for (const d of toSend) {
      if (!d.fromEmail) { failed++; continue; }
      try {
        await sendOne(d.id, d, String(d.draftReply ?? '').trim());
        sent++;
      } catch (e) {
        failed++;
        console.warn('support_inbox: batch send failed', d.id, e);
      }
    }
    return { ok: true, sent, failed };
  },
);

// ── Callable: сохранить подпись ────────────────────────────────────────────────
export const adminSupportSaveSignature = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireAdmin(request);
    const signature = String(request.data?.signature ?? '').slice(0, 2000);
    const db = admin.firestore();
    const [col, docId] = SUPPORT_CONFIG_DOC.split('/');
    await db.collection(col).doc(docId).set(
      { signature, updatedAt: new Date().toISOString(), updatedBy: String(request.auth?.token?.email ?? 'admin') },
      { merge: true },
    );
    return { ok: true, signature };
  },
);

// ── Callable: сменить статус письма (архив/вернуть) ────────────────────────────
export const adminSupportSetStatus = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireAdmin(request);
    const messageDocId = String(request.data?.messageDocId ?? '').trim();
    const status = String(request.data?.status ?? '').trim() as SupportStatus;
    if (!messageDocId) throw new HttpsError('invalid-argument', 'messageDocId required');
    if (status !== 'new' && status !== 'answered' && status !== 'archived') {
      throw new HttpsError('invalid-argument', 'bad_status');
    }
    await admin.firestore().collection(INBOX_COLLECTION).doc(messageDocId).set({ status }, { merge: true });
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
