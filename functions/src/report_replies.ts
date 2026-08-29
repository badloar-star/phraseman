/**
 * Ответы на юзерские репорты через персональные уведомления (инбокс-колокольчик).
 *
 * Поток (заменяет молчаливое shards += 1 из админки):
 *   1) Админ (вручную или через ИИ-черновик adminDraftReportReply) готовит краткий
 *      вежливый ответ юзеру на его репорт.
 *   2) adminReplyToReport пишет персональное сообщение в users/{uid}/user_messages
 *      (kind 'report_reply'); если проблема подтверждена и исправлена — с пакетом наград.
 *   3) Юзер видит ответ в колокольчике на главной; если есть награда — кнопка
 *      «Получить» вызывает claimReportReward (идемпотентная транзакция).
 *
 * Награда появляется только после явного подтверждения в модале ответа.
 *
 * Прочитанность/дизмисс — через существующий users/{uid}/app_message_states
 * (тот же механизм, что у глобальных app_messages; ключ = id сообщения).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolveIsLifetimePlan } from './premium_status';
import { openAiChat } from './explain/explain_provider';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import { getLevelFromXP } from './xp_levels';
import { hasClaimedPermission, type AdminPermission } from './admin/permissions';
import { appendExternalEconomyEvent } from './external_economy_events';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

export const USER_MESSAGES_COLLECTION = 'user_messages';

/** Счётчик подтверждённых полезных репортов (титул «Хелпер», см. constants/titles.ts). */
const HELPFUL_REPORTS_CONFIRMED_KEY = 'helpful_error_reports_confirmed_v1';

/**
 * Публичная проекция борда «Топ хелперов» (top_helpers/{uid}). Пишется в той же
 * транзакции, что и инкремент счётчика — чтобы рейтинг на борде всегда совпадал с
 * progress.helpful_error_reports_confirmed_v1. Приватные users/{uid} читать нельзя
 * (rules), поэтому имя/аватар/премиум берём из публичного leaderboard/{uid} —
 * ровно те же поля, что рисует Зал славы, чтобы UI борда совпадал с лигой.
 */
const TOP_HELPERS_COLLECTION = 'top_helpers';

interface TopHelperProjection {
  displayName?: string;
  avatar?: string;
  aura?: string;
  frame?: string;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  profileCardLevel?: number;
  /** Настоящий игровой уровень (не флаг карточки). Рисуется на аватарке борда. */
  gameLevel?: number;
  profileCardTheme?: string;
  leagueCrownExpiresAt?: number;
  leagueCrownCount?: number;
}

function firstNonEmptyString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * Достаём публичные поля профиля для проекции борда из ТРЁХ источников по приоритету.
 *
 * ИСТОЧНИКИ ПРОФИЛЯ (аудит 2026-07-04):
 *   1) users/{uid}.progress.user_* — первичный, но у многих активных юзеров ПУСТ
 *      (имя/уровень живут только в AsyncStorage на устройстве, на сервер не синкаются).
 *   2) leaderboard/{uid} — вторичная проекция; ПРОПУСКАЕТ юзеров без имени/с xp<50.
 *   3) error_reports/{id} (репорт, за который юзер попал в хелперы) — САМЫЙ НАДЁЖНЫЙ:
 *      клиент кладёт userName/userLevel/userXP/userPremium прямо в документ репорта.
 * Без источника (3) реальные юзеры («Стелла» ур.50 и т.п.) показывались как «—» ур.1.
 *
 * ВАЖНО про уровень: progress.profile_card_level / leaderboard.profileCardLevel — это
 * ФЛАГ карточки (0..1), НЕ игровой уровень. Настоящий уровень (gameLevel) берём из
 * progress.user_level → getLevelFromXP(report.userXP) → report.userLevel.
 *
 * @param lb     leaderboard/{uid} (может отсутствовать)
 * @param prog   users/{uid}.progress
 * @param report документ репорта с полями userName/userLevel/userXP/userPremium
 */
function readLeaderboardProjection(
  lb: FirebaseFirestore.DocumentData | undefined,
  prog?: FirebaseFirestore.DocumentData | undefined,
  report?: FirebaseFirestore.DocumentData | undefined,
): TopHelperProjection {
  const d = lb ?? {};
  const p = prog ?? {};
  const r = report ?? {};
  const name = firstNonEmptyString(p.user_name, d.displayName, d.name, r.userName);
  const avatar = firstNonEmptyString(p.user_avatar, d.avatar, r.userAvatar);
  const aura = firstNonEmptyString(p.user_avatar_aura, d.aura, r.userAvatarAura);
  const frame = firstNonEmptyString(p.user_avatar_frame, d.frame, r.userAvatarFrame);
  // Настоящий игровой уровень: progress.user_level → getLevelFromXP(report.userXP) → report.userLevel.
  const reportXp = Math.floor(Number(r.userXP) || 0);
  const gameLevel = Math.max(
    0,
    Math.floor(Number(p.user_level) || 0)
      || (reportXp > 0 ? getLevelFromXP(reportXp) : 0)
      || Math.floor(Number(r.userLevel) || 0),
  );
  const proj: TopHelperProjection = {
    isPremium: !!d.isPremium || !!r.userPremium,
    isVip: !!d.isVip,
    isLifetime: !!d.isLifetime,
    profileCardLevel: Math.max(0, Math.floor(Number(d.profileCardLevel) || 0)),
  };
  if (gameLevel > 0) proj.gameLevel = gameLevel;
  if (name) proj.displayName = name.slice(0, 60);
  if (avatar) proj.avatar = avatar.slice(0, 64);
  if (aura) proj.aura = aura.slice(0, 64);
  if (frame) proj.frame = frame.slice(0, 64);
  const theme = firstNonEmptyString(d.profileCardTheme, p.profile_card_theme);
  if (theme) proj.profileCardTheme = theme.slice(0, 64);
  const crownCount = Math.max(0, Math.floor(Number(d.leagueCrownCount) || 0));
  if (crownCount > 0) proj.leagueCrownCount = crownCount;
  if (Number(d.leagueCrownExpiresAt) > 0) {
    proj.leagueCrownExpiresAt = Math.floor(Number(d.leagueCrownExpiresAt));
  }
  return proj;
}

const REPORT_RESOLUTIONS = ['confirmed_fixed', 'duplicate', 'in_progress', 'rejected', 'unconfirmed'] as const;
export type ReportResolution = typeof REPORT_RESOLUTIONS[number];
export type ReportRewardSeverity = 'none' | 'minor' | 'serious' | 'critical' | 'legacy';
export type ReportRewardBundle = Readonly<{
  version: 1;
  severity: ReportRewardSeverity;
  spins: number;
  runes: number;
  pearls: number;
}>;

export const REPORT_REWARD_TIERS = Object.freeze({
  none: Object.freeze({ version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 }),
  minor: Object.freeze({ version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 }),
  serious: Object.freeze({ version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 }),
  critical: Object.freeze({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 }),
} satisfies Record<Exclude<ReportRewardSeverity, 'legacy'>, ReportRewardBundle>);

const LEGACY_ONE_PEARL_BUNDLE: ReportRewardBundle = Object.freeze({
  version: 1,
  severity: 'legacy',
  spins: 0,
  runes: 0,
  pearls: 1,
});
const REPLY_TITLE_MAX = 120;
const REPLY_BODY_MAX = 1200;

/** Коллекции репортов, на которые можно отвечать. Замкнутый список — админка не
 *  должна уметь помечать произвольные документы произвольных коллекций. */
const REPORT_COLLECTIONS: ReadonlySet<string> = new Set([
  'error_reports',
  'explain_report_entries',
  'user_reports',
  'community_pack_reports',
]);

export function requireReportReplyPermission(
  request: { auth?: { token?: Record<string, unknown> } | null },
  permission: Extract<AdminPermission, 'reports.reply.draft' | 'reports.reply.send'>,
): void {
  if (!hasClaimedPermission(request.auth?.token, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
}

function cleanString(value: unknown, maxLen: number): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

function bundleHasReward(bundle: ReportRewardBundle): boolean {
  return bundle.spins > 0 || bundle.runes > 0 || bundle.pearls > 0;
}

function isExactRewardBundle(value: unknown): value is ReportRewardBundle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  const severity = cleanString(input.severity, 16) as Exclude<ReportRewardSeverity, 'legacy'>;
  const tier = REPORT_REWARD_TIERS[severity];
  return !!tier
    && Number(input.version) === tier.version
    && Number(input.spins) === tier.spins
    && Number(input.runes) === tier.runes
    && Number(input.pearls) === tier.pearls;
}

export function normalizeReportReplyReward(data: unknown): {
  resolution: ReportResolution;
  rewardBundle: ReportRewardBundle;
} {
  const input = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  const resolution = cleanString(input.resolution, 40) as ReportResolution;
  if (!(REPORT_RESOLUTIONS as readonly string[]).includes(resolution)) {
    throw new HttpsError('invalid-argument', 'unsupported report resolution');
  }

  let rewardBundle: ReportRewardBundle;
  if (input.rewardBundle !== undefined) {
    if (!isExactRewardBundle(input.rewardBundle)) {
      throw new HttpsError('invalid-argument', 'rewardBundle must match an exact supported tier');
    }
    const severity = cleanString((input.rewardBundle as Record<string, unknown>).severity, 16) as Exclude<ReportRewardSeverity, 'legacy'>;
    rewardBundle = REPORT_REWARD_TIERS[severity];
  } else {
    const coins = Number(input.coins ?? 0);
    if (!Number.isInteger(coins) || (coins !== 0 && coins !== 1)) {
      throw new HttpsError('invalid-argument', 'legacy coins must be exactly 0 or 1');
    }
    rewardBundle = coins === 1 ? LEGACY_ONE_PEARL_BUNDLE : REPORT_REWARD_TIERS.none;
  }
  if (bundleHasReward(rewardBundle) && resolution !== 'confirmed_fixed') {
    throw new HttpsError('failed-precondition', 'a reward bundle requires confirmed_fixed');
  }
  return { resolution, rewardBundle };
}

export function reportDocumentAllowsReward(
  report: FirebaseFirestore.DocumentData,
  resolution: ReportResolution,
): boolean {
  return resolution === 'confirmed_fixed'
    && (cleanString(report.resolution, 40) === 'confirmed_fixed' || cleanString(report.status, 40) === 'fixed');
}

/** Backward-compatible export for older focused tests/callers. */
export const reportDocumentAllowsCoin = reportDocumentAllowsReward;

export function normalizeStoredReportReplyRewardBundle(
  message: FirebaseFirestore.DocumentData,
): ReportRewardBundle {
  if (message.rewardBundle !== undefined) {
    const resolution = (cleanString(message.resolution, 40) || 'confirmed_fixed') as ReportResolution;
    return normalizeReportReplyReward({ resolution, rewardBundle: message.rewardBundle }).rewardBundle;
  }
  return normalizeStoredReportReplyClaimAmount(message) === 1
    ? LEGACY_ONE_PEARL_BUNDLE
    : REPORT_REWARD_TIERS.none;
}

export function reportRewardClaimReceipt(
  messageId: string,
  rewardBundle: ReportRewardBundle,
  alreadyClaimed: boolean,
): Readonly<{
  ok: true;
  eventId: string;
  rewardBundle: ReportRewardBundle;
  alreadyClaimed: boolean;
}> {
  return Object.freeze({ ok: true, eventId: messageId, rewardBundle, alreadyClaimed });
}

export function normalizeStoredReportReplyClaimAmount(
  message: FirebaseFirestore.DocumentData,
): 0 | 1 {
  if (message.coins !== undefined) return Number(message.coins) === 1 ? 1 : 0;
  return Math.floor(Number(message.shards) || 0) > 0 ? 1 : 0;
}

export function reportRecipientCandidate(
  reportCollection: string,
  report: FirebaseFirestore.DocumentData,
): string {
  if (reportCollection === 'error_reports') {
    return cleanString(report.stableUid || report.uid, 128);
  }
  if (reportCollection === 'explain_report_entries') {
    return cleanString(report.stableUid || report.uid, 128);
  }
  if (reportCollection === 'user_reports' || reportCollection === 'community_pack_reports') {
    return cleanString(report.reporterUid, 128);
  }
  return '';
}

export function reportRecipientIdentityLookup(
  reportCollection: string,
  report: FirebaseFirestore.DocumentData,
): { originalUid: string; authUid: string; requestedStableId?: string } {
  const originalUid = reportRecipientCandidate(reportCollection, report);
  const storedAuthUid = cleanString(report.authUid || report.reporterAuthUid, 128);
  if (!storedAuthUid) return { originalUid, authUid: originalUid };
  return { originalUid, authUid: storedAuthUid, requestedStableId: originalUid };
}

/**
 * adminReplyToReport — отправить юзеру персональный ответ на его репорт.
 *
 * data: {
 *   uid: string;                 // stable uid юзера (из репорта)
 *   reportCollection: string;    // одна из REPORT_COLLECTIONS
 *   reportId: string;            // id документа репорта
 *   title: string;               // заголовок в языке юзера
 *   body: string;                // краткий вежливый ответ в языке юзера
 *   resolution: ReportResolution;
 *   rewardBundle: ReportRewardBundle;
 * }
 *
 * Эффект (транзакция):
 *   - users/{uid}/user_messages/{auto}: kind 'report_reply', rewardBundle, claimed:false
 *   - при rewardBundle>0: progress.helpful_error_reports_confirmed_v1 += 1 (титул «Хелпер»)
 *   - репорт: status 'answered', replyMessageId, repliedAt (награда НЕ начисляется здесь)
 *   - admin_log: аудит
 */
export const adminReplyToReport = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireReportReplyPermission(request, 'reports.reply.send');

    const reportCollection = cleanString(request.data?.reportCollection, 64);
    const reportId = cleanString(request.data?.reportId, 128);
    const title = cleanString(request.data?.title, REPLY_TITLE_MAX);
    const body = cleanString(request.data?.body, REPLY_BODY_MAX);
    const reward = normalizeReportReplyReward(request.data);

    if (!REPORT_COLLECTIONS.has(reportCollection)) {
      throw new HttpsError('invalid-argument', `reportCollection must be one of: ${Array.from(REPORT_COLLECTIONS).join(', ')}`);
    }
    if (!reportId) throw new HttpsError('invalid-argument', 'reportId required');
    if (!title || !body) throw new HttpsError('invalid-argument', 'title and body required');

    const db = admin.firestore();
    const adminEmail = String(request.auth?.token?.email ?? '');
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const reportRef = db.collection(reportCollection).doc(reportId);
    const initialReportSnap = await reportRef.get();
    if (!initialReportSnap.exists) {
      throw new HttpsError('not-found', `report ${reportCollection}/${reportId} not found`);
    }
    const recipientIdentity = reportRecipientIdentityLookup(
      reportCollection,
      initialReportSnap.data() ?? {},
    );
    const { originalUid } = recipientIdentity;
    if (!originalUid || originalUid === 'unknown') {
      throw new HttpsError('failed-precondition', 'report recipient identity is missing');
    }
    const uid = await resolveStableUidForAuth(
      db,
      recipientIdentity.authUid,
      recipientIdentity.requestedStableId,
      { requireKnownIdentity: true, repairLinks: false },
    );
    const userRef = db.collection('users').doc(uid);
    const messageRef = userRef.collection(USER_MESSAGES_COLLECTION).doc();
    const notificationRef = userNotificationRef(db, uid, `report_reply_${messageRef.id}`);
    const auditRef = db.collection('admin_log').doc();
    const helperRef = db.collection(TOP_HELPERS_COLLECTION).doc(uid);
    // Публичный профиль для проекции борда из 3 источников (см. readLeaderboardProjection):
    // users.progress → leaderboard → САМ РЕПОРТ (userName/userLevel/userXP). Репорт —
    // самый надёжный источник имени/уровня для хелпера. Читаем ДО транзакции параллельно.
    const [leaderboardSnap, userProfileSnap, reportProfileSnap] = await Promise.all([
      db.collection('leaderboard').doc(uid).get(),
      userRef.get(),
      reportRef.get(),
    ]);
    const userProgress = (userProfileSnap.data()?.progress ?? {}) as FirebaseFirestore.DocumentData;
    const helperProjection = readLeaderboardProjection(
      leaderboardSnap.data(),
      userProgress,
      reportProfileSnap.data(),
    );
    // Pro-план (разовая «Навсегда») резолвим СЕРВЕРНО из users/{uid} — leaderboard-документ
    // премиум-поля не обновляет, поэтому опираться на него для Pro нельзя.
    helperProjection.isLifetime = await resolveIsLifetimePlan(db, uid, nowMs).catch(() => false);

    await db.runTransaction(async (tx) => {
      const reportSnap = await tx.get(reportRef);
      if (!reportSnap.exists) throw new HttpsError('not-found', `report ${reportCollection}/${reportId} not found`);
      const report = reportSnap.data() ?? {};
      // Идемпотентность: повторный «Ответить» на уже отвеченный репорт — ошибка,
      // а не второе сообщение юзеру (админ жмёт кнопку дважды / две вкладки).
      if (typeof report.replyMessageId === 'string' && report.replyMessageId) {
        throw new HttpsError('already-exists', 'report already replied');
      }
      if (bundleHasReward(reward.rewardBundle) && !reportDocumentAllowsReward(report, reward.resolution)) {
        throw new HttpsError('failed-precondition', 'report is not server-confirmed as fixed');
      }

      tx.set(messageRef, {
        kind: 'report_reply',
        title,
        body,
        rewardBundle: reward.rewardBundle,
        coins: reward.rewardBundle.severity === 'legacy' ? reward.rewardBundle.pearls : 0,
        resolution: reward.resolution,
        claimed: false,
        claimedAtMs: null,
        reportCollection,
        reportId,
        adminEmail,
        createdAt: nowIso,
        createdAtMs: nowMs,
      });

      tx.set(notificationRef, {
        ...buildUserNotification({
          type: 'report_reply',
          fromUid: 'phraseman_team',
          fromName: 'Phraseman',
          text: title,
          nav: { kind: 'report_reply', messageId: messageRef.id },
        }, nowMs),
        reportReply: {
          messageId: messageRef.id,
          title,
          body,
          rewardBundle: reward.rewardBundle,
          coins: reward.rewardBundle.severity === 'legacy' ? reward.rewardBundle.pearls : 0,
          resolution: reward.resolution,
          claimed: false,
          claimedAtMs: null,
          reportCollection,
          reportId,
        },
      });

      // Подтверждённый полезный репорт — двигаем счётчик титула сразу (не при клейме:
      // подтверждение состоялось независимо от того, заберёт ли юзер награду).
      // В той же транзакции обновляем публичную проекцию борда «Топ хелперов»,
      // чтобы рейтинг на борде и счётчик титула никогда не разъезжались.
      if (bundleHasReward(reward.rewardBundle)) {
        tx.set(userRef, {
          progress: { [HELPFUL_REPORTS_CONFIRMED_KEY]: admin.firestore.FieldValue.increment(1) },
        }, { merge: true });
        tx.set(helperRef, {
          uid,
          confirmed: admin.firestore.FieldValue.increment(1),
          lastConfirmedAtMs: nowMs,
          updatedAtMs: nowMs,
          ...helperProjection,
        }, { merge: true });
      }

      tx.set(reportRef, {
        status: 'answered',
        replyMessageId: messageRef.id,
        replyNotificationId: notificationRef.id,
        replyTitle: title,
        replyBody: body,
        replyCoins: reward.rewardBundle.severity === 'legacy' ? reward.rewardBundle.pearls : 0,
        replyRewardBundle: reward.rewardBundle,
        resolution: reward.resolution,
        repliedAt: nowIso,
        repliedAtMs: nowMs,
        repliedBy: adminEmail,
        replyRecipientUid: uid,
        ...(originalUid !== uid ? { replyOriginalUid: originalUid } : {}),
      }, { merge: true });

      tx.set(auditRef, {
        ts: nowIso,
        adminEmail,
        action: 'reply_to_report',
        uid,
        details: { reportCollection, reportId, rewardBundle: reward.rewardBundle, resolution: reward.resolution, title },
      });
    });

    return { ok: true, messageId: messageRef.id, notificationId: notificationRef.id, rewardBundle: reward.rewardBundle };
  },
);

/**
 * claimReportReward — юзер жмёт «Получить» в уведомлении-ответе.
 *
 * data: { messageId: string }
 *
 * Транзакция: проверить своё сообщение (kind report_reply, reward>0, !claimed) →
 * claimed:true + immutable external economy fact + audit log. Личный баланс
 * сервер не читает и не пишет. Повторный вызов возвращает тот же receipt.
 */
export const claimReportReward = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const messageId = cleanString(request.data?.messageId, 128);
    if (!messageId) throw new HttpsError('invalid-argument', 'messageId required');

    const db = admin.firestore();
    const stableUid = await resolveStableUidForAuth(db, request.auth.uid);
    const userRef = db.collection('users').doc(stableUid);
    const messageRef = userRef.collection(USER_MESSAGES_COLLECTION).doc(messageId);
    const notificationRef = userNotificationRef(db, stableUid, `report_reply_${messageId}`);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    return db.runTransaction(async (tx) => {
      const [messageSnap, notificationSnap] = await Promise.all([
        tx.get(messageRef),
        tx.get(notificationRef),
      ]);
      if (!messageSnap.exists) throw new HttpsError('not-found', 'message not found');
      const message = messageSnap.data() ?? {};
      if (message.kind !== 'report_reply') throw new HttpsError('failed-precondition', 'not a report reply');
      const rewardBundle = normalizeStoredReportReplyRewardBundle(message);
      if (!bundleHasReward(rewardBundle)) throw new HttpsError('failed-precondition', 'nothing to claim');
      if (message.claimed === true) {
        return reportRewardClaimReceipt(messageId, rewardBundle, true);
      }

      tx.update(messageRef, { claimed: true, claimedAtMs: nowMs });
      if (notificationSnap.exists) {
        tx.update(notificationRef, {
          'reportReply.claimed': true,
          'reportReply.claimedAtMs': nowMs,
          updatedAt: nowMs,
        });
      }
      appendExternalEconomyEvent(tx, userRef, {
        source: 'report_reply',
        eventId: messageId,
        ownerStableId: stableUid,
        delta: rewardBundle.pearls,
        reason: 'report_reward_bundle_claim',
        kind: 'confirmed_report_reward_bundle',
        subjectId: messageId,
        payload: { messageId, rewardBundle },
        createdAtMs: nowMs,
      });

      const shardLogRef = userRef.collection('shard_log').doc();
      tx.set(shardLogRef, {
        ts: nowIso,
        type: 'earn',
        amount: rewardBundle.pearls,
        reason: 'report_reward_bundle_claim',
        authority: 'external_event',
        messageId,
        rewardBundle,
      });

      return reportRewardClaimReceipt(messageId, rewardBundle, false);
    });
  },
);

const DRAFT_SYSTEM_PROMPT = [
  'Ты — сотрудник поддержки приложения для изучения английского Phraseman.',
  'Тебе дают юзерский репорт об ошибке и вердикт команды (подтвердился или нет).',
  'Напиши КОРОТКИЙ (2-4 предложения) вежливый ответ юзеру на языке из поля lang.',
  'Обязательно: поблагодари за репорт. Если подтвердился — скажи, что ошибка исправлена',
  'и что пользователь сможет получить приятный бонус. Не перечисляй виды наград и количества.',
  'Если не подтвердился — мягко объясни почему,',
  'без канцелярита и без обвинений. Пиши от лица команды («мы»), тепло и по-человечески.',
  'ВАЖНО: каждый юзер видит ТОЛЬКО своё сообщение и не знает о других юзерах, их репортах',
  'или каких-либо «соседних сообщениях». Никогда не ссылайся на другие сообщения, на других',
  'людей или на то, что кто-то уже сообщал об этой проблеме. Пиши так, будто это единственный',
  'разговор с этим человеком.',
  'Без эмодзи-спама (максимум один), без ссылок, без обещаний сроков.',
  'Предложи rewardSeverity: minor для локальной небольшой ошибки, serious для заметной проблемы,',
  'critical только для критического сбоя с большим влиянием; rejected всегда none.',
  'Ответ верни строго JSON-объектом: {"title": "...", "body": "...", "rewardSeverity": "none|minor|serious|critical"}.',
  'title — до 60 знаков, body — до 500 знаков.',
].join(' ');

/**
 * adminDraftReportReply — ИИ-черновик ответа юзеру (для админки).
 *
 * data: {
 *   reportText: string;             // сырой текст репорта (что прислал юзер + контекст)
 *   verdict: 'confirmed' | 'rejected';  // вердикт команды после разбора
 *   fixNote?: string;               // что именно исправили / почему отклонили
 *   lang?: string;                  // язык юзера (ru/uk/es/...), дефолт ru
 * }
 * Возвращает { title, body } — админ может отредактировать перед отправкой.
 */
export const adminDraftReportReply = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requireReportReplyPermission(request, 'reports.reply.draft');

    const reportText = cleanString(request.data?.reportText, 4000);
    const verdict = cleanString(request.data?.verdict, 16);
    const fixNote = cleanString(request.data?.fixNote, 600);
    const lang = cleanString(request.data?.lang, 8) || 'ru';
    if (!reportText) throw new HttpsError('invalid-argument', 'reportText required');
    if (verdict !== 'confirmed' && verdict !== 'rejected') {
      throw new HttpsError('invalid-argument', "verdict must be 'confirmed' | 'rejected'");
    }

    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const userPayload = JSON.stringify({ lang, verdict, fixNote: fixNote || null, report: reportText });
    const result = await openAiChat({
      apiKey,
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      maxTokens: 400,
      temperature: 0.6,
      responseFormat: { type: 'json_object' },
    });

    // Модель может вернуть НЕ JSON, а прозу/отказ (например, отказалась
    // формулировать ответ на репорт с чувствительным содержимым). Тогда JSON.parse
    // падает, и раньше админ видел глухое «INTERNAL» без причины. Отдаём понятную
    // ошибку с обрезанным сырым текстом модели, чтобы было видно, ЧТО она ответила
    // (в т.ч. текст отказа), и админ мог написать ответ вручную.
    const raw = String(result.text || '').trim();
    if (!raw) {
      throw new HttpsError('failed-precondition', 'ИИ вернул пустой ответ — сформулируй ответ вручную.');
    }
    let title = '';
    let body = '';
    let rewardSeverity = 'none';
    try {
      const parsed = JSON.parse(raw) as { title?: unknown; body?: unknown; rewardSeverity?: unknown };
      title = cleanString(parsed.title, REPLY_TITLE_MAX);
      body = cleanString(parsed.body, REPLY_BODY_MAX);
      const suggested = cleanString(parsed.rewardSeverity, 16);
      rewardSeverity = verdict === 'confirmed' && ['minor', 'serious', 'critical'].includes(suggested)
        ? suggested
        : 'none';
    } catch {
      throw new HttpsError(
        'failed-precondition',
        `ИИ не вернул черновик (возможно, отказ). Ответ модели: ${raw.slice(0, 300)}`,
      );
    }
    if (!title || !body) {
      throw new HttpsError(
        'failed-precondition',
        `ИИ вернул неполный черновик (нет заголовка или текста). Ответ модели: ${raw.slice(0, 300)}`,
      );
    }

    return { ok: true, title, body, rewardSeverity };
  },
);
