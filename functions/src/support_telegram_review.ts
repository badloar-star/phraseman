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
  | 'notifying'
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
  readonly automationRevision?: number;
  readonly draftOrigin?: 'jarvis' | 'owner_manual';
  readonly instructionsSchemaVersion?: number;
  readonly instructionsPromptVersion?: number;
  readonly instructionsRevision?: number;
  readonly instructionsFingerprint?: string;
  readonly notificationAtMs?: number;
  readonly notificationLeaseId?: string | null;
  readonly notificationLeaseExpiresAtMs?: number | null;
  readonly autoSendAtMs?: number | null;
  readonly telegramPreviewSafe?: boolean;
  readonly customerReady?: boolean;
  readonly holding?: boolean;
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
  readonly automationRevision?: number;
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

/**
 * зачем отдельный department-префикс, а не третье значение ApprovalAction
 * (владелец, 2026-08-16: "должна ещё быть кнопка отменить"): ApprovalAction
 * ('approve'|'reject') — общий тип, его использует approval_webhook_core и
 * другие department'ы Джарвиса за пределами поддержки. Расширять его ради
 * одной кнопки в одном месте означало бы менять чужую инфраструктуру.
 * department — обычная строка, которую сверяет только эта функция, поэтому
 * третье действие безопасно кодируется отдельным префиксом на том же
 * action='reject', не трогая общий тип нигде за пределами этого файла.
 */
const CANCEL_TOKEN_DEPARTMENT_PREFIX = 'support_email_cancel';

export function supportReviewCancelTokenDepartment(messageDocId: string, draftRevision: number): string {
  return `${CANCEL_TOKEN_DEPARTMENT_PREFIX}:${messageDocId}:${draftRevision}`;
}

export function parseSupportReviewApprovalToken(doc: ApprovalTokenDoc): {
  messageDocId: string;
  draftRevision: number;
  action: 'send' | 'edit' | 'cancel';
  draftHashPrefix: string;
} | null {
  const department = String(doc.department);
  const cancelMatch = department.match(/^support_email_cancel:(m_[a-f0-9]{64}):(\d+)$/);
  if (cancelMatch) {
    if (doc.action !== 'reject' || !/^\w{8,64}$/.test(String(doc.decisionHash))) return null;
    const draftRevision = Number(cancelMatch[2]);
    if (!Number.isSafeInteger(draftRevision) || draftRevision < 0) return null;
    return Object.freeze({
      messageDocId: cancelMatch[1], draftRevision, action: 'cancel',
      draftHashPrefix: String(doc.decisionHash),
    });
  }
  const match = department.match(/^support_email:(m_[a-f0-9]{64}):(\d+)$/);
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

export function buildSupportAttentionRequiredNotice(reason: unknown): string {
  const code = String(reason ?? '');
  if (code === 'telegram_preview_unsafe') {
    return [
      '🔒 <b>Ответ готов, но Telegram-предпросмотр заблокирован</b>',
      '',
      'Полная версия сохранена в админке, но её нельзя безопасно показать или отправить кнопкой в Telegram.',
      'Автоотправка отключена. Проверьте полный текст и отправьте его вручную из Gmail Support Inbox.',
    ].join('\n');
  }
  let explanation = 'Для ответа не хватает подтверждённых фактов или требуется решение владельца.';
  if (/^guarded_(?:billing|account)$/.test(code)) {
    explanation = 'Нужно проверить данные конкретной покупки, подписки или аккаунта. Джарвис не создаёт догадки вместо такой проверки.';
  } else if (/^guarded_(?:legal|privacy|safety|security)$/.test(code)) {
    explanation = 'Обращение относится к чувствительной теме и требует решения владельца.';
  } else if (/^conversation_(?:sender_mismatch|ambiguous_parent)$/.test(code)) {
    explanation = 'Нужно вручную проверить отправителя и цепочку переписки.';
  } else if (/^(?:auto_repair_exhausted_|untrusted_snapshot_|insufficient_evidence)/.test(code)) {
    explanation = 'Автоматическая доработка не смогла получить подтверждённый ответ, прошедший проверку.';
  }
  return [
    '⚠️ <b>Обращение требует решения</b>',
    '',
    explanation,
    'Готового ответа нет. Кнопка отправки и автоотправка не создавались.',
    '',
    '<i>Откройте админку → Gmail Support Inbox и проверьте само обращение.</i>',
  ].join('\n');
}

/** зачем отдельный флаг, а не парсить reason из текста: строка reason
 * (`conversation_sender_mismatch`/`conversation_ambiguous_parent`) — внутренний
 * код, а не то, на что должна опираться разметка UI. Явный булев параметр
 * не рассинхронизируется, если формат reason когда-нибудь поменяется. */
export function buildSupportTelegramReviewPreview(input: {
  readonly finalText: string;
  readonly draftRevision: number;
  readonly revised?: boolean;
  readonly customerReady?: boolean;
  readonly customerIssue?: string;
  readonly holding?: boolean;
  readonly identityUnresolved?: boolean;
}): { readonly text: string; readonly approvable: boolean; readonly violations: readonly string[] } {
  const finalText = String(input.finalText ?? '').trim();
  const violations = findSupportHumanVoiceViolations(finalText, input.customerIssue ?? '');
  const approvable = Boolean(finalText)
    && input.customerReady !== false
    && finalText.length <= TELEGRAM_SAFE_FINAL_TEXT_MAX
    && !TELEGRAM_SENSITIVE.test(finalText)
    && violations.length === 0;
  if (!approvable) {
    const title = input.customerReady === false
      ? '⚠️ <b>Ответ не готов</b>'
      : '🔒 <b>Ответ требует проверки в админке</b>';
    return Object.freeze({
      approvable: false,
      violations,
      text: [
        title,
        '',
        input.customerReady === false
          ? '⛔ Готового ответа нет: обязательные проверки не пройдены. Автоотправка и кнопка отправки отключены.'
          : '🔒 Полный текст содержит чувствительные данные, внутренние формулировки или слишком длинный для безопасного предпросмотра.',
        input.customerReady === false
          ? 'Готового ответа и кнопки отправки нет. Откройте «Gmail Support Inbox» и проверьте само обращение.'
          : 'Откройте «Gmail Support Inbox» и проверьте полный текст перед отправкой.',
        '',
        `<i>Черновик версии ${input.draftRevision} заблокирован. Автоотправка отключена.</i>`,
      ].join('\n'),
    });
  }
  const title = input.identityUnresolved
    ? '🕵️ <b>Личность отправителя не подтверждена</b>'
    : input.holding
      ? '🕓 <b>Промежуточный ответ Джарвиса</b>'
      : input.revised ? '✏️ <b>Исправленная версия ответа</b>' : '📬 <b>Ответ Джарвиса готов</b>';
  return Object.freeze({
    approvable: true,
    violations,
    text: [
      title,
      // зачем этот блок первым и отдельным от обычного holding-абзаца
      // (владелец, 2026-08-16: "он обязан готовить ВСЕГДА человеческий
      // ответ"): раньше это был единственный случай полной тишины в
      // Telegram. Теперь текст готов и виден, но здесь — в отличие от
      // обычного промежуточного ответа — автоотправка НЕ включится сама:
      // письмо может уйти не тому человеку, если нажать кнопку не проверив.
      ...(input.identityUnresolved
        ? ['', '⚠️ Это письмо ссылается на переписку от другого отправителя, поэтому Джарвис не уверен, кому отвечает. Проверьте цепочку в «Gmail Support Inbox», прежде чем нажимать «Отправить сейчас» — автоматической отправки для этого письма не будет.']
        : input.holding
          ? ['', 'Подтверждённого ответа по существу не нашлось, поэтому клиент получит честный промежуточный ответ — без выдуманных фактов. Обращение останется у вас в «Gmail Support Inbox» для полноценного ответа.']
          : []),
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
