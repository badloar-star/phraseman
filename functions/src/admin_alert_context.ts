import type { AdminAlertType } from './admin_alert_catalog';
import { sanitizeAdminAlertPayload, sanitizePublicNickname, type AdminAlertDetail, type AdminAlertSafePayload } from './admin_alert_privacy';

export type AlertSourceRow = Readonly<Record<string, unknown>>;
export interface AlertContextInput {
  readonly eventType: AdminAlertType;
  readonly source: string;
  readonly sourceId: string;
  readonly payload: AdminAlertSafePayload;
  readonly attempts?: number;
}
export type ReadAlertDocument = (path: string) => Promise<AlertSourceRow | null>;

function row(value: unknown): AlertSourceRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AlertSourceRow : {};
}

function text(data: AlertSourceRow, ...keys: readonly string[]): string {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>((current, part) => row(current)[part], data);
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim();
  }
  return '';
}

function localized(value: unknown): string {
  if (typeof value === 'string') return value;
  return text(row(value), 'ru', 'en', 'uk', 'es', 'fr', 'de', 'pt', 'it');
}

const DOC_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,299}$/;
const DIRECT_SOURCES: Readonly<Record<string, string>> = Object.freeze({
  'legacy.serial_refunder_receipt': 'community_pack_purchases',
  'user.created': 'users', 'feedback.rating': 'feedback_entries',
  'legacy.content_report': 'error_reports', 'legacy.user_report': 'user_reports',
  'legacy.critical_error': 'app_errors', 'app.error': 'app_errors', 'payment.webhook_failure': 'app_errors',
  'user_ideas.created': 'user_ideas', 'website_contact_inbox.created': 'website_contact_inbox',
  'support_inbox.created': 'support_inbox', 'community_pack_submissions.created': 'community_pack_submissions',
  'community_pack_reports.created': 'community_pack_reports', 'subscription_cancel_surveys.created': 'subscription_cancel_surveys',
  'revenuecat.receipt': 'revenuecat_premium_events', 'gift_certificate.created': 'gift_certificate_deliveries',
  'admin.audit': 'admin_log', 'safety.flag': 'safety_flags',
  'explanation.report': 'explain_report_entries', 'explanation.retired': 'phrase_explanations',
  'explain_report_entries.created': 'explain_report_entries',
  'explanation.retired_report': 'explain_report_entries',
});

/** Only code-owned collection paths. Neither source IDs nor payloads can inject a path. */
export function adminAlertSourcePath(source: string, id: string): string | null {
  if (!DOC_ID.test(id)) return null;
  if (DIRECT_SOURCES[source]) return `${DIRECT_SOURCES[source]}/${id}`;
  const pathWithSuffix = (collection: string, suffix: RegExp) => {
    const key = id.replace(suffix, '');
    return key !== id && DOC_ID.test(key) ? `${collection}/${key}` : null;
  };
  if (source.startsWith('referral.')) return pathWithSuffix('referral_attributions', /:(attributed|first-launch|qualified|rewarded)$/);
  if (source === 'user.ban') return pathWithSuffix('banned_users', /:(banned|unbanned):\d+$/);
  if (source === 'web.paid_order') return pathWithSuffix('web_premium_orders', /:(purchase|renewal|cancellation):.+$/);
  if (source === 'telegram.paid_order') return pathWithSuffix('telegram_premium_orders', /:(purchase|renewal|cancellation):.+$/);
  if (source === 'community_pack.purchase') return pathWithSuffix('community_pack_purchases', /:(completed|refunded)$/);
  if (source === 'push.job_terminal') return pathWithSuffix('admin_push_jobs', /:(done|error)$/);
  if (source === 'app_message.published') return pathWithSuffix('app_messages', /:published$/);
  if (source === 'compliance.control') return pathWithSuffix('soc2_automated_control_projection', /:(failed|blocked):.+$/);
  if (source === 'jarvis.critical_plan') return pathWithSuffix('jarvis_plans', /:[^:]+$/);
  if (source === 'cron.health') return pathWithSuffix('cron_heartbeats', /-(failed|recovered)-\d+$/);
  const parts = id.split(':');
  if (parts.length === 2 && parts.every((part) => DOC_ID.test(part))) {
    if (source === 'promo.redemption') return `users/${parts[0]}/promo_redemptions/${parts[1]}`;
    if (source === 'idea.report') return `user_ideas/${parts[0]}/idea_reports/${parts[1]}`;
  }
  return null;
}

const SERVER_TYPES = new Set<AdminAlertType>([
  'banChanged', 'trialStart', 'premiumPurchase', 'renewal', 'cancellation', 'expiration', 'billingIssue', 'refund',
  'refundSpike', 'revenueDigest', 'promoGift', 'ugcSubmission', 'explanationReport', 'safetyFlag',
  'cronHealth', 'paymentWebhookFailure', 'adminAudit', 'pushJob', 'appMessagePublished', 'jarvisCritical',
  'complianceRisk', 'authFailureSpike', 'ownerDailyDigest', 'activityDigest', 'paywallDigest',
]);

function eventDetails(eventType: AdminAlertType, data: AlertSourceRow): AdminAlertDetail[] {
  const details: AdminAlertDetail[] = [];
  const add = (label: string, value: unknown) => {
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) details.push({ label, value: String(value).trim() });
  };
  const pick = (label: string, ...keys: readonly string[]) => add(label, text(data, ...keys));
  const title = text(data, 'titleRu', 'titleEn', 'packTitle', 'entityLabel', 'payload.titleRu', 'payload.titleEn') || localized(data.title) || localized(row(data.payload).title);
  const description = text(data, 'descriptionRu', 'descriptionEn', 'description', 'payload.descriptionRu', 'payload.descriptionEn');
  switch (eventType) {
    case 'contentReport':
      pick('Текст репорта', 'comment', 'reportText', 'message'); pick('Контент', 'dataText'); pick('Ответ пользователя', 'userAnswer');
      pick('Уровень', 'userLevel'); pick('XP', 'userXP'); pick('Стрик', 'userStreak'); pick('Дней в приложении', 'userDaysInApp');
      if (typeof data.userPremium === 'boolean') add('Доступ', data.userPremium ? 'Premium' : 'Free');
      break;
    case 'criticalError': case 'appErrorDigest': case 'paymentWebhookFailure':
      pick('Ошибка', 'errorName'); pick('Сообщение ошибки', 'message'); pick('Контекст', 'context', 'feature'); pick('Стек ошибки', 'stack');
      break;
    case 'lessonRating': case 'vocabDialogueRating': case 'arenaRating':
      pick('Отзыв', 'message', 'comment'); pick('Урок / сессия', 'entityLabel', 'entityId'); break;
    case 'userReport': case 'ideaOrCommunityReport':
      pick('Причина', 'reason'); pick('Комментарий', 'comment', 'message'); add('Название', title); break;
    case 'newIdea':
      add('Название', title); add('Описание', description); pick('Обоснование', 'benefit'); pick('Сообщение', 'text', 'message'); break;
    case 'websiteInbox':
      pick('Отправитель', 'name'); pick('Тема', 'topic', 'subject'); pick('Сообщение', 'message'); pick('Страница', 'pageUrl'); break;
    case 'supportEmail':
      pick('Отправитель', 'fromName', 'fromEmail'); pick('Тема', 'subject'); pick('Сообщение', 'bodyText'); break;
    case 'ugcSubmission': case 'ugcPurchase': case 'cardPackDigest':
      add('Набор', title); add('Описание', description); pick('Тип изменения', 'submissionKind');
      if (Array.isArray(row(data.payload).cards)) add('Карточек', (row(data.payload).cards as unknown[]).length);
      pick('Причина возврата', 'refundReason', 'refundComment'); break;
    case 'cancelReason':
      pick('Причина отмены', 'reason'); pick('Комментарий', 'reasonText', 'comment'); break;
    case 'trialStart': case 'premiumPurchase': case 'renewal': case 'cancellation': case 'expiration': case 'billingIssue': case 'refund': case 'promoGift':
      pick('Период подписки', 'periodType', 'billingCadence', 'planDuration', 'plan');
      pick('Причина отмены', 'cancelReason', 'cancellationReason'); pick('Причина истечения', 'expirationReason');
      pick('Причина возврата', 'refundReason'); pick('Число продлений', 'renewalCount');
      if (typeof data.stripeCancelAtPeriodEnd === 'boolean') add('Автопродление', data.stripeCancelAtPeriodEnd ? 'выключено' : 'включено');
      else if (typeof data.isRecurring === 'boolean') add('Автопродление', data.isRecurring ? 'включено' : 'выключено');
      { const end = Number(data.expirationAtMs);
        if (Number.isFinite(end) && end > 0 && end < 8.64e15) add('Окончание подписки', new Date(end).toISOString());
        else pick('Окончание подписки', 'subscriptionExpiresAtIso'); }
      break;
    case 'banChanged': pick('Причина', 'reason'); break;
    case 'referralAttributed': case 'referralFirstLaunch': case 'referralQualified': case 'referralRewarded':
      pick('Награда', 'rewardDays', 'rewardType'); break;
    case 'safetyFlag':
      pick('Категория безопасности', 'category'); pick('Текст пользователя', 'userText'); pick('Контекст', 'mode'); break;
    case 'explanationReport':
      pick('Фраза', 'phraseEn', 'phraseText', 'phrase', 'target'); pick('Причина', 'reason'); pick('Комментарий', 'comment');
      pick('Контент', 'explanationText', 'full', 'text');
      pick('Ответ пользователя', 'userAnswer'); pick('Количество репортов', 'reportCount'); break;
    case 'cronHealth': pick('Ошибка', 'lastError', 'error'); pick('Длительность', 'durationMs'); break;
    case 'adminAudit':
      pick('Действие', 'action'); pick('Объект', 'entity.collection'); pick('Причина', 'reason');
      // The audit before/after maps may contain access secrets. Only selected outcomes are allowed.
      pick('Результат', 'after.status', 'after.result', 'result'); break;
    case 'pushJob':
      pick('Название', 'notification.title', 'title'); pick('Сообщение', 'notification.body', 'body');
      pick('Аудитория', 'audience.kind', 'audience.type', 'audience', 'mode'); pick('Доставлено', 'sentCount'); pick('Цель рассылки', 'targetCount');
      pick('Не доставлено', 'failedCount', 'errorCount'); pick('Ошибка', 'error'); break;
    case 'appMessagePublished':
      add('Название', title); add('Сообщение', text(data, 'messageRu', 'messageEn') || localized(data.body) || localized(row(data.content).body));
      add('Вопрос', text(data, 'poll.questionRu', 'poll.questionEn') || localized(row(data.poll).question));
      if (Array.isArray(row(data.poll).options)) add('Варианты ответа', (row(data.poll).options as unknown[]).map((option) => text(row(option), 'textRu', 'textEn') || localized(row(option).text) || localized(option)).filter(Boolean).join('\n'));
      break;
    case 'jarvisCritical':
      pick('Вопрос', 'question'); pick('Проблема', 'finding'); pick('Обоснование', 'hypothesis'); pick('Рекомендация', 'recommendation'); break;
    case 'complianceRisk':
      pick('Контроль', 'controlId'); pick('Проблема', 'error', 'lastError', 'summary', 'reason'); break;
    default: break;
  }
  pick('Экран', 'screen'); pick('Устройство', 'deviceModel', 'deviceName');
  add('ОС', [text(data, 'deviceOS', 'platform'), text(data, 'deviceOSVersion', 'osVersion')].filter(Boolean).join(' '));
  pick('Язык обучения', 'studyTarget', 'targetLanguage', 'language', 'lang');
  return details;
}

function uniqueNickname(value: unknown): string {
  const name = sanitizePublicNickname(value);
  return /^(unknown|undefined|null|anonymous|user|гость)$/i.test(name) ? '' : name;
}

async function lookupNickname(uid: string, read: ReadAlertDocument): Promise<string | null> {
  if (!DOC_ID.test(uid)) return '';
  let stableId = uid;
  // A live auth anchor wins over an obsolete users/{authUid} document, just as
  // in auth_identity. This lookup is read-only: never repair or merge accounts.
  const link = await read(`auth_links/${uid}`);
  const linked = text(link ?? {}, 'stable_id');
  if (DOC_ID.test(linked)) stableId = linked;
  const user = await read(`users/${stableId}`);
  if (user?.identityHidden === true || user?.deleted === true) return null;
  const name = uniqueNickname(text(user ?? {}, 'progress.user_name', 'user_name'));
  if (name) return name;
  // Legacy public projections are read-only fallbacks, never auth displayName/email.
  for (const collection of ['public_profiles', 'leaderboard']) {
    const profile = await read(`${collection}/${stableId}`).catch(() => null);
    if (profile?.identityHidden === true) continue;
    const projected = uniqueNickname(profile?.name);
    if (projected) return projected;
  }
  return '';
}

export async function enrichAdminAlertContext(input: AlertContextInput, read: ReadAlertDocument): Promise<AdminAlertSafePayload> {
  let path = adminAlertSourcePath(input.source, input.sourceId);
  // Compatibility for already deployed producers: category is their exact
  // `${kind}:${lang}` discriminator, never a client-chosen collection path.
  if (input.source === 'explanation.retired' && path && input.payload.category?.startsWith('mistake:')) path = `mistake_explanations/${input.sourceId}`;
  let data: AlertSourceRow = path ? (await read(path) ?? {}) : {};
  if (input.source === 'explanation.retired' && Object.keys(data).length === 0 && DOC_ID.test(input.sourceId)) {
    const counter = await read(`explain_reports/${input.sourceId}`);
    data = counter ? { ...counter, explanationText: counter.latestExplanationText, reason: counter.lastReason } : {};
  }
  if (!path && !DOC_ID.test(input.sourceId)) return sanitizeAdminAlertPayload(input.eventType, input.payload);
  if (input.source === 'idea.report' && path) {
    const idea = await read(`user_ideas/${input.sourceId.split(':')[0]}`).catch(() => null);
    data = { title: idea?.title, titleRu: idea?.titleRu, ...data };
  }
  if (input.eventType === 'ugcPurchase' && DOC_ID.test(text(data, 'packId'))) {
    const pack = await read(`community_packs/${text(data, 'packId')}`).catch(() => null);
    if (pack) data = { titleRu: pack.titleRu, titleEn: pack.titleEn, ...data };
  }
  let uid = text(data, 'reporterUid', 'stableUid', 'stableId', 'uid', 'userId', 'buyerStableId', 'buyerUid', 'authorStableId', 'actorUid');
  if (input.source === 'user.created') uid = input.sourceId;
  if (input.source === 'user.ban' && path) uid = path.split('/')[1];
  if (input.source === 'promo.redemption') uid = input.sourceId.split(':')[0];
  if (input.source.startsWith('referral.') && path) uid = text(data, 'inviteeStableId', 'referredStableId', 'inviteeUid') || path.split('/')[1];
  if (input.source === 'legacy.serial_refunder') uid = input.sourceId;
  const fallback = uniqueNickname(text(data, 'reporterName', 'userName', 'appNickname', 'authorName')) || uniqueNickname(input.payload.nickname);
  const nickname = uid ? await lookupNickname(uid, read) : '';
  if (input.eventType === 'newUser' && nickname === '' && (input.attempts ?? 1) < 4) throw new Error('new_user_nickname_pending');
  let relatedUid = text(data, 'reportedUid');
  let relatedRole = 'На кого жалоба';
  if (input.eventType === 'ideaOrCommunityReport') { relatedUid = text(data, 'authorStableId', 'authorUid'); relatedRole = 'Автор контента'; }
  if (input.source.startsWith('referral.')) { relatedUid = text(data, 'referrerStableId', 'referrerUid'); relatedRole = 'Пригласивший'; }
  if (input.eventType === 'adminAudit' && text(data, 'entity.collection') === 'users') { relatedUid = text(data, 'entity.id'); relatedRole = 'Пользователь изменения'; }
  if (input.eventType === 'ugcPurchase') { relatedUid = text(data, 'sellerStableId', 'authorStableId'); relatedRole = 'Автор набора'; }
  const relatedNickname = relatedUid ? await lookupNickname(relatedUid, read).catch(() => '') : '';
  const identifiers = [uid, relatedUid, text(data, 'authUid'), text(data, 'reporterAuthUid')].filter((id) => id.length >= 4);
  const details = [...(input.payload.details ?? []), ...eventDetails(input.eventType, data)].map((detail) => ({
    label: detail.label,
    value: identifiers.reduce((value, id) => value.split(id).join('[пользователь]'), detail.value),
  }));
  if (nickname !== null && fallback && fallback !== nickname) details.push({ label: 'Ник в событии', value: fallback });
  if (input.source === 'explanation.retired' || input.source === 'explanation.retired_report') details.push({ label: 'Автоотключение', value: 'Объяснение снято после жалоб' });
  const appVersion = text(data, 'appVersion') || input.payload.appVersion;
  const versionContext = input.eventType === 'websiteInbox' || input.eventType === 'supportEmail' || input.source === 'web.paid_order' || input.source === 'telegram.paid_order'
    ? 'web' : SERVER_TYPES.has(input.eventType) ? 'server' : 'client';
  return sanitizeAdminAlertPayload(input.eventType, { ...input.payload,
    nickname, relatedNickname, relatedRole: relatedUid ? relatedRole : undefined, appVersion, versionContext,
    buildNumber: text(data, 'buildNumber') || input.payload.buildNumber,
    platform: text(data, 'platform') || input.payload.platform,
    language: text(data, 'language', 'lang', 'userLang') || input.payload.language,
    details,
  });
}
