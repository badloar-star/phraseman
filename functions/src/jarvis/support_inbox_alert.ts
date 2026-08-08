/**
 * Текст Telegram-уведомления о новом письме поддержки.
 *
 * зачем отдельно от отправки: владелец 2026-08-04 попросил, чтобы Джарвис
 * писал в Telegram СРАЗУ при новом письме — текст письма + готовый ответ,
 * без промо/рекламы/уведомлений Google. Спам уже отсеян ДО вызова этой
 * функции (support_spam_triage.ts + технический classifyEmail) — сюда
 * попадают только письма, которые владелец реально должен прочитать.
 */

const MAX_BODY_CHARS = 1_200;
const MAX_DRAFT_CHARS = 1_500;
/** Запас до предела Telegram (4096) — режем раньше, чем сервер. */
const MAX_MESSAGE_LEN = 3_800;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface NewMailAlertInput {
  readonly fromEmail: string;
  readonly subject: string;
  readonly bodyText: string;
  /** null — черновик не удалось подготовить (LLM недоступен/бюджет исчерпан). */
  readonly draftReply: string | null;
}

export function buildNewMailAlertText(input: NewMailAlertInput): string {
  const from = escapeHtml(input.fromEmail.slice(0, 200));
  const subject = escapeHtml(input.subject.slice(0, 300));
  const body = escapeHtml(input.bodyText.slice(0, MAX_BODY_CHARS));
  const draftBlock = input.draftReply
    ? escapeHtml(input.draftReply.slice(0, MAX_DRAFT_CHARS))
    : '⚠️ Черновик не подготовлен — подготовьте ответ в админке вручную.';

  const text = [
    '📧 <b>Новое письмо в поддержку</b>',
    '',
    `От: ${from}`,
    `Тема: ${subject}`,
    '',
    body,
    '',
    '<b>Подготовленный ответ:</b>',
    draftBlock,
  ].join('\n');

  if (text.length <= MAX_MESSAGE_LEN) return text;
  const cut = text.slice(0, MAX_MESSAGE_LEN);
  const lastBreak = cut.lastIndexOf('\n');
  return `${cut.slice(0, lastBreak > 0 ? lastBreak : MAX_MESSAGE_LEN)}\n\n…продолжение в админке.`;
}
