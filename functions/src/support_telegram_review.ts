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
  /**
   * message_id карточки в Telegram.
   *
   * зачем (владелец, 2026-08-17): карточка пересоздаётся каждый час, и в чате
   * копились пять версий с живыми на вид кнопками. Владелец жал на старую —
   * её токен погашен, нажатие уходило в пустоту. По этому номеру новая
   * карточка снимает кнопки у прежних, оставляя действующей ровно одну.
   */
  readonly telegramMessageId?: number;
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

/**
 * Кнопка «Снова доверить боту» — снимает молчание после личного ответа.
 *
 * зачем (владелец, 2026-08-16): молчание после личного ответа было вечным и
 * отменялось только правкой базы руками. Человек, которому владелец ответил
 * однажды, через полгода пишет с новым вопросом — и не получает ответа
 * никогда. Кнопка возвращает разговор автоматике одним нажатием.
 *
 * зачем conversationId, а НЕ messageDocId, как у трёх остальных кнопок:
 * молчание живёт на разговоре. Снять его с одного письма бессмысленно —
 * следующее письмо того же человека снова упрётся в метку, и владелец жал бы
 * кнопку на каждое письмо, думая, что она не работает.
 *
 * зачем свой префикс, а не 'approve' у общего типа: см. соседний
 * CANCEL_TOKEN_DEPARTMENT_PREFIX — ApprovalAction общий для всех
 * департаментов Джарвиса, и расширять его ради одной кнопки поддержки
 * означало бы менять чужую инфраструктуру.
 */
const RESUME_TOKEN_DEPARTMENT_PREFIX = 'support_email_resume';

export function supportResumeBotTokenDepartment(conversationId: string): string {
  return `${RESUME_TOKEN_DEPARTMENT_PREFIX}:${conversationId}`;
}

/**
 * Принадлежит ли approval-токен поддержке (любой из её кнопок).
 *
 * зачем единая функция (аудит 2026-08-16): проверка «это департамент
 * поддержки?» была скопирована в ТРИ места, и добавляя cancel-кнопку я
 * починил только одно. Два других (approval_webhook, approval_webhook_core)
 * не узнавали 'support_email_cancel:' — нажатие «Отменить» показывало чужой
 * текст подтверждения и проваливалось в lifecycle-механику планов Джарвиса.
 * Разошедшиеся копии одного правила — известный класс бага в этом проекте,
 * поэтому здесь одна точка правды вместо четвёртой копии регулярки.
 */
export function isSupportEmailDepartment(department: unknown): boolean {
  return /^support_email(?:_cancel|_resume)?:/.test(String(department ?? ''));
}

/**
 * Разбирает токен кнопки «Снова доверить боту».
 *
 * зачем отдельно от parseSupportReviewApprovalToken: тот возвращает
 * messageDocId и draftRevision, которых у этой кнопки нет и быть не может —
 * она про разговор, а не про конкретный черновик.
 */
export function parseSupportResumeBotToken(doc: ApprovalTokenDoc): { conversationId: string } | null {
  const match = String(doc.department).match(/^support_email_resume:([A-Za-z0-9_-]{1,200})$/);
  if (!match || doc.action !== 'approve') return null;
  return Object.freeze({ conversationId: match[1] });
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

function escapeTelegramHtmlClamped(value: unknown, maxChars: number): string {
  let escaped = '';
  for (const character of String(value ?? '')) {
    const piece = escapeTelegramHtml(character);
    if (escaped.length + piece.length > maxChars - 1) return `${escaped}…`;
    escaped += piece;
  }
  return escaped;
}

function supportTelegramEmailHeader(input: {
  readonly fromName?: string;
  readonly fromEmail?: string;
  readonly subject?: string;
}): readonly string[] {
  const fromName = String(input.fromName ?? '').trim();
  const fromEmail = String(input.fromEmail ?? '').trim();
  const from = fromName && fromEmail ? `${fromName} <${fromEmail}>` : fromName || fromEmail || 'клиент';
  const subject = String(input.subject ?? '').trim();
  return Object.freeze([
    `<b>От:</b> ${escapeTelegramHtmlClamped(from, 260)}`,
    ...(subject ? [`<b>Тема:</b> ${escapeTelegramHtmlClamped(subject, 200)}`] : []),
  ]);
}

const TELEGRAM_SAFE_FINAL_TEXT_MAX = 2_900;
const TELEGRAM_SENSITIVE = /(?:\b(?:\d[ -]*?){13,19}\b|\b\d{4,8}\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:api[_ -]?key|password|парол|код подтверждения|verification code|bearer)\s*[:=]\s*\S+)/i;

/**
 * Почему одобренный ответ так и не ушёл.
 *
 * зачем (владелец, 2026-08-17: «я одобрил, но сообщение не отправилось»): при
 * отмене подготовленного черновика письмо тихо возвращалось в очередь, а в
 * Telegram не приходило НИЧЕГО. Владелец нажимал кнопку, видел «поставлен в
 * очередь отправки» — и считал дело закрытым. Женщина ждала ответа, которого
 * никто не отправил, и узнать об этом было негде.
 *
 * Молчание здесь дороже любой другой недоработки: оно превращает нажатие
 * кнопки в ложное обещание. Поэтому у каждой причины отмены есть человеческое
 * объяснение и понятный следующий шаг.
 */
export function buildSupportSendCancelledNotice(reason: unknown, willRetry: boolean): string {
  const code = String(reason ?? '');
  let explanation = 'Черновик перестал быть актуальным до отправки.';
  if (code === 'support_knowledge_changed') {
    explanation = 'Пока ответ ждал одобрения, изменился код приложения — Джарвис не отправляет ответ,'
      + ' собранный по устаревшим данным, чтобы не написать клиенту неправду.';
  } else if (code === 'support_instructions_changed') {
    explanation = 'Пока ответ ждал одобрения, изменились ваши инструкции для поддержки.';
  } else if (code === 'support_quality_not_customer_ready') {
    explanation = 'Ответ не прошёл проверку качества перед отправкой.';
  } else if (code === 'signature_changed') {
    explanation = 'Пока ответ ждал одобрения, изменилась подпись писем.';
  } else if (code === 'draft_changed') {
    explanation = 'Черновик успели изменить в админке.';
  } else if (code === 'automation_revision_changed' || code === 'automation_mode_changed') {
    explanation = 'Изменились настройки автоответов.';
  } else if (code === 'confirmation_expired') {
    explanation = 'Подтверждение просрочено — на отправку даётся ограниченное время.';
  } else if (code === 'delivery_unknown') {
    explanation = 'Отправка началась, но почтовый сервер не подтвердил доставку.'
      + ' Проверьте папку «Отправленные» в Gmail, прежде чем отправлять снова.';
  }
  return [
    '🚫 <b>Письмо НЕ отправлено</b>',
    '',
    explanation,
    '',
    willRetry
      ? 'Джарвис готовит новый ответ — он придёт сюда отдельной карточкой. Ничего делать не нужно.'
      : '<i>Откройте админку → Gmail Support Inbox и отправьте ответ вручную.</i>',
  ].join('\n');
}

/**
 * зачем письмо целиком, а не «откройте админку» (владелец, 2026-08-17: «не
 * должно быть заготовок!!!»): раньше клиенту на billing/account/legal уходил
 * фиксированный текст «поднимем вашу покупку» — читался как отписка сервиса,
 * а не осмысленный ответ. Теперь клиент не получает НИЧЕГО, а владелец
 * получает всё сразу — тему, от кого, текст письма — и отвечает сам прямо
 * из Gmail, не заходя в админку. Заход в админку означал минуту простоя
 * между «увидел уведомление» и «начал отвечать»; теперь простоя нет.
 *
 * зачем ответ владельца становится обучающим примером автоматически, а не
 * по отдельной кнопке: этот путь уже существует — rememberOwnerStyleExample
 * читает папку «Отправленные» в Gmail и учится на КАЖДОМ личном ответе
 * владельца, входящем письмо было приоткрыто ботом или нет. Дублировать
 * его отдельной кнопкой «взять на обучение» значило бы завести вторую копию
 * одного и того же механизма — известный класс бага в этом проекте.
 */
export function buildSupportAttentionRequiredNotice(input: {
  readonly reason: unknown;
  readonly fromName?: string;
  readonly fromEmail?: string;
  readonly subject?: string;
  readonly bodyText?: string;
}): string {
  const code = String(input.reason ?? '');
  if (code === 'telegram_preview_unsafe') {
    return [
      '🔒 <b>Ответ готов, но Telegram-предпросмотр заблокирован</b>',
      '',
      'Полная версия сохранена в админке, но её нельзя безопасно показать или отправить кнопкой в Telegram.',
      'Автоотправка отключена. Проверьте полный текст и отправьте его вручную из Gmail Support Inbox.',
    ].join('\n');
  }
  let explanation = 'Подтверждённого ответа по существу не нашлось.';
  if (/^guarded_(?:billing|account)$/.test(code)) {
    explanation = 'Нужно проверить данные конкретной покупки, подписки или аккаунта — Джарвис не создаёт догадки вместо такой проверки.';
  } else if (/^guarded_(?:legal|privacy|safety|security)$/.test(code)) {
    explanation = 'Обращение относится к чувствительной теме и требует вашего решения.';
  } else if (/^conversation_(?:sender_mismatch|ambiguous_parent)$/.test(code)) {
    explanation = 'Не удалось надёжно понять, кому именно отвечать в этой цепочке писем.';
  } else if (/^(?:auto_repair_exhausted_|untrusted_snapshot_|insufficient_evidence)/.test(code)) {
    explanation = 'Собранный ответ не прошёл проверку фактов.';
  } else if (code === 'model_unavailable') {
    explanation = 'Модель сейчас недоступна.';
  }
  const body = String(input.bodyText ?? '').trim();
  return [
    '🤷 <b>Не знаю, как ответить</b>',
    '',
    explanation,
    '',
    ...supportTelegramEmailHeader(input),
    '',
    body ? escapeTelegramHtml(clampSupportAttentionBody(body)) : '<i>(тело письма пустое)</i>',
    '',
    '<i>Клиенту пока ничего не отправлено. Ответьте прямо в Gmail — систему учит на ваших живых ответах.</i>',
  ].join('\n');
}

/**
 * Уведомление о новом письме в разговоре, который владелец раньше забрал себе.
 *
 * Клиентский текст показывается прямо в Telegram, но кнопка меняет только
 * состояние разговора: она не отправляет письмо и не обходит обычные проверки
 * качества. После нажатия текущее письмо забирает штатный retry-крон.
 */
export function buildSupportOwnerTakenOverNotice(input: {
  readonly fromName?: string;
  readonly fromEmail?: string;
  readonly subject?: string;
  readonly bodyText?: string;
}): string {
  const body = String(input.bodyText ?? '').trim();
  return [
    '👤 <b>Снова написал знакомый клиент</b>',
    '',
    'Вы уже отвечали этому клиенту лично, поэтому бот не отвечает и не вмешивается в вашу переписку.',
    '',
    ...supportTelegramEmailHeader(input),
    '',
    body ? escapeTelegramHtmlClamped(body, 1_700) : '<i>(тело письма пустое)</i>',
    '',
    '<i>Клиенту пока ничего не отправлено. Если теперь можно вернуть разговор автоматике, нажмите кнопку ниже.</i>',
  ].join('\n');
}

/**
 * Telegram обрезает сообщения на 4096 символах — длинное письмо целиком
 * могло бы обрезать уже саму пометку «клиенту не отправлено», самую важную
 * строку в уведомлении. Оставляем письмо читаемым, но не безграничным.
 */
function clampSupportAttentionBody(body: string, max = 1_500): string {
  return body.length > max ? `${body.slice(0, max)}…` : body;
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
  readonly fromName?: string;
  readonly fromEmail?: string;
  readonly subject?: string;
  /** Текст написал владелец руками, а не модель. */
  readonly ownerManual?: boolean;
}): { readonly text: string; readonly approvable: boolean; readonly violations: readonly string[] } {
  const finalText = String(input.finalText ?? '').trim();
  // зачем послабления для ручного текста (найдено тестом 2026-08-16):
  // правила «не короче 35 слов» и «язык ответа = язык письма» написаны
  // против МОДЕЛИ. Владелец вправе ответить коротко и на своём языке —
  // без этой ветки его собственный текст блокировался бы в карточке,
  // и он не смог бы отправить то, что сам же и написал.
  const rawViolations = findSupportHumanVoiceViolations(finalText, input.customerIssue ?? '');
  const violations = input.ownerManual
    ? rawViolations.filter((v) => v !== 'too_short' && v !== 'wrong_language')
    : rawViolations;
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
      ...(input.holding ? ['', ...supportTelegramEmailHeader(input)] : []),
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
