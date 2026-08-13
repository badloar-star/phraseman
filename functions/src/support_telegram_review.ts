import { createHash } from 'crypto';
import type { ApprovalTokenDoc } from './jarvis/approval_token';
import { findSupportHumanVoiceViolations } from './support_communication_bible';

export const SUPPORT_TELEGRAM_REVIEW_COLLECTION = 'support_telegram_reviews';
export const SUPPORT_TELEGRAM_EDIT_SESSION_COLLECTION = 'support_telegram_edit_sessions';
export const SUPPORT_TELEGRAM_JOB_COLLECTION = 'support_telegram_reply_jobs';
export const SUPPORT_TELEGRAM_EDIT_TTL_MS = 30 * 60 * 1_000;
export const SUPPORT_TELEGRAM_AUTO_SEND_DELAY_MS = 3 * 60 * 60 * 1_000;
export const SUPPORT_TELEGRAM_APPROVAL_TTL_MS = SUPPORT_TELEGRAM_AUTO_SEND_DELAY_MS;
export const SUPPORT_TELEGRAM_JOB_LEASE_MS = 10 * 60 * 1_000;
const TOKEN_DEPARTMENT_PREFIX = 'support_email';

export type SupportTelegramReviewState =
  | 'awaiting_approval'
  | 'awaiting_feedback'
  | 'revising'
  | 'dispatching'
  | 'accepted'
  | 'attention_required'
  | 'stale';

export interface SupportTelegramReviewDoc {
  readonly messageDocId: string;
  readonly draftRevision: number;
  readonly draftHash: string;
  readonly state: SupportTelegramReviewState;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly ownerTelegramUserId: string;
  readonly ownerTelegramChatId: string;
  readonly operationId?: string;
  readonly payloadHash?: string;
  readonly confirmationNonce?: string;
  readonly knowledgeFingerprint?: string;
  readonly policyVersion?: number;
  readonly draftOrigin?: 'jarvis' | 'owner_manual';
  readonly instructionsSchemaVersion?: number;
  readonly instructionsPromptVersion?: number;
  readonly instructionsRevision?: number;
  readonly instructionsFingerprint?: string;
  readonly notificationAtMs?: number;
  readonly autoSendAtMs?: number | null;
  readonly telegramPreviewSafe?: boolean;
  readonly customerReady?: boolean;
  readonly conversationId?: string;
  readonly conversationRevision?: number;
  readonly lastErrorCode?: string;
}

export type SupportTelegramJobAction = 'send' | 'rewrite';
export interface SupportTelegramJobDoc {
  readonly action: SupportTelegramJobAction;
  readonly state: 'pending' | 'processing' | 'accepted' | 'failed' | 'attention_required';
  readonly reviewId: string;
  readonly messageDocId: string;
  readonly draftRevision: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly leaseId?: string;
  readonly leaseExpiresAtMs?: number;
  readonly feedback?: string;
  readonly source?: 'telegram' | 'auto_deadline';
}

export function supportTelegramJobLeaseOwns(
  job: Pick<SupportTelegramJobDoc, 'state' | 'leaseId'> | null | undefined,
  leaseId: string,
): boolean {
  return Boolean(job && job.state === 'processing' && job.leaseId === leaseId);
}

export function supportDraftHash(text: unknown): string {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex');
}

export function supportReviewTokenDepartment(messageDocId: string, draftRevision: number): string {
  return `${TOKEN_DEPARTMENT_PREFIX}:${messageDocId}:${draftRevision}`;
}

export function parseSupportReviewApprovalToken(doc: ApprovalTokenDoc): {
  messageDocId: string;
  draftRevision: number;
  action: 'send' | 'edit';
  draftHashPrefix: string;
} | null {
  const match = String(doc.department).match(/^support_email:(m_[a-f0-9]{64}):(\d+)$/);
  if (!match || !/^\w{8,64}$/.test(String(doc.decisionHash))) return null;
  const draftRevision = Number(match[2]);
  if (!Number.isSafeInteger(draftRevision) || draftRevision < 0) return null;
  return Object.freeze({
    messageDocId: match[1],
    draftRevision,
    action: doc.action === 'approve' ? 'send' : 'edit',
    draftHashPrefix: String(doc.decisionHash),
  });
}

export function supportEditSessionId(ownerTelegramUserId: string, ownerTelegramChatId: string): string {
  return createHash('sha256')
    .update(`${ownerTelegramUserId}|${ownerTelegramChatId}`, 'utf8')
    .digest('hex');
}

function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TELEGRAM_SAFE_FINAL_TEXT_MAX = 2_900;
const TELEGRAM_SENSITIVE = /(?:\b(?:\d[ -]*?){13,19}\b|\b\d{4,8}\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:api[_ -]?key|password|парол|код подтверждения|verification code|bearer)\s*[:=]\s*\S+)/i;

export function buildSupportTelegramReviewPreview(input: {
  readonly finalText: string;
  readonly draftRevision: number;
  readonly revised?: boolean;
  readonly customerReady?: boolean;
  readonly customerIssue?: string;
}): { readonly text: string; readonly approvable: boolean; readonly violations: readonly string[] } {
  const finalText = String(input.finalText ?? '').trim();
  const violations = findSupportHumanVoiceViolations(finalText, input.customerIssue ?? '');
  const approvable = Boolean(finalText)
    && input.customerReady !== false
    && finalText.length <= TELEGRAM_SAFE_FINAL_TEXT_MAX
    && !TELEGRAM_SENSITIVE.test(finalText)
    && violations.length === 0;
  const title = input.revised ? '✏️ <b>Исправленная версия ответа</b>' : '📬 <b>Ответ Джарвиса готов</b>';
  if (!approvable) {
    return Object.freeze({
      approvable: false,
      violations,
      text: [
        title,
        '',
        input.customerReady === false
          ? '⛔ Ответ не прошёл проверку фактов и человеческого качества. Автоотправка и кнопка отправки отключены.'
          : '🔒 Полный текст содержит чувствительные данные, внутренние формулировки или слишком длинный для безопасного предпросмотра.',
        'Откройте раздел «Gmail Support Inbox» в админке и перепишите ответ перед отправкой.',
        '',
        `<i>Версия ${input.draftRevision}. Автоотправка для этой версии отключена.</i>`,
      ].join('\n'),
    });
  }
  return Object.freeze({
    approvable: true,
    violations,
    text: [
      title,
      '',
      '<b>Полный текст письма вместе с подписью:</b>',
      escapeTelegramHtml(finalText),
      '',
      `<i>Версия ${input.draftRevision}. «Отправить сейчас» отправит ровно показанный текст. «Внести правки» ждёт ваше следующее сообщение.</i>`,
    ].join('\n'),
  });
}

export function formatSupportTelegramReview(input: {
  readonly subject: string;
  readonly draftReply: string;
  readonly draftRevision: number;
  readonly revised?: boolean;
}): string {
  return buildSupportTelegramReviewPreview({
    finalText: input.draftReply,
    draftRevision: input.draftRevision,
    revised: input.revised,
  }).text;
}
