// ═══════════════════════════════════════════════════════════════════════════
// premium_expiry_cron.ts — «будильник» деактивации истёкшего премиума/VIP.
//
// Зачем: до этого крона НИКТО не снимал премиум по сроку. Если EXPIRATION-вебхук
// RevenueCat потерялся (или премиум выдан вручную на срок — Telegram-оплата,
// админ-грант, реферальный VIP), доступ висел вечно: вебхук при активной подписке
// пишет premium_expiry='0' и обновляет реальный срок только в premium_rc_expiry_ms.
//
// ⚠️ ГЛАВНЫЙ ИНВАРИАНТ: НИКОГДА не снимать действующий оплаченный премиум.
//   - premium_expiry='0' БЕЗ premium_rc_expiry_ms = бессрочный премиум
//     (ручная выдача) — НЕ трогаем вообще.
//   - premium_expiry='0' С premium_rc_expiry_ms = подписка под управлением
//     вебхука; снимаем ТОЛЬКО если rc-срок прошёл больше RC_GRACE_MS назад
//     (billing retry / задержавшийся RENEWAL-вебхук успевает продлить).
//   - Бессрочный VIP (vip_until<=0) и бессрочный админ-грант (premium_expiry<=0)
//     — НЕ трогаем.
//   Снимаем только то, у чего есть КОНКРЕТНЫЙ серверный timestamp окончания
//   в прошлом. Поля пишутся ровно так же, как их пишут существующие пути
//   деактивации (EXPIRATION-ветка revenuecat_shards.ts, vipRevokeProgressFields).
//
// Модуль только ЧИТАЕТ факт оплаты и гасит ПРОСРОЧЕННОЕ; связку
// «оплата → правильный аккаунт» (вебхуки, активация) не трогает.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { parseProgressMs, ProgressLike } from './premium_status';

const REGION = 'us-central1';

/**
 * Запас после premium_rc_expiry_ms, прежде чем считать подписку умершей без
 * вебхука. Покрывает billing retry магазина и опоздавшие RENEWAL/EXPIRATION
 * события RevenueCat. Премиум на 3 дня дольше — дёшево; снять у платящего — нет.
 */
export const RC_GRACE_MS = 72 * 60 * 60 * 1000;

const STORE_PLANS = new Set(['monthly', 'yearly', 'annual']);

function cleanStr(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanPlan(value: unknown): string {
  return cleanStr(value).toLowerCase();
}

function hasMeaningfulPlan(plan: string): boolean {
  return plan !== '' && plan !== 'null' && plan !== 'undefined';
}

function isTruthyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

export type ExpiryDeactivation = {
  /** Patch для merge в users/{uid}.progress (все значения — строки, как везде в progress). */
  patch: Record<string, string>;
  /** Что именно истекло — для логов/форензики. */
  reasons: Array<'store_rc_expired' | 'store_expiry_passed' | 'admin_grant_expired' | 'vip_expired'>;
};

/**
 * Чистая функция-решатель: что (если что-то) надо погасить у юзера по срокам.
 * Возвращает null, когда трогать нечего — в т.ч. для уже снятых (идемпотентность)
 * и для всего бессрочного.
 */
export function planExpiryDeactivation(progress: ProgressLike, now: number): ExpiryDeactivation | null {
  const data = progress ?? {};
  const patch: Record<string, string> = {};
  const reasons: ExpiryDeactivation['reasons'] = [];

  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override).toLowerCase();
  const expiryMs = parseProgressMs(data.premium_expiry);

  // ── Store-премиум (RevenueCat / ручная выдача с конкретным сроком) ─────────
  if (STORE_PLANS.has(plan) && override !== 'true') {
    const rcExpiryMs = parseProgressMs(data.premium_rc_expiry_ms);
    if (expiryMs <= 0) {
      // premium_expiry='0' = «активна, срок ведёт вебхук». Авторитет — rc-срок.
      // Без rc-срока это бессрочная ручная выдача — не трогаем НИКОГДА.
      if (rcExpiryMs > 0 && rcExpiryMs + RC_GRACE_MS < now) {
        // Зеркало EXPIRATION-ветки revenuecat_shards.ts: plan='', expiry=реальный срок.
        patch.premium_plan = '';
        patch.premium_expiry = String(rcExpiryMs);
        reasons.push('store_rc_expired');
      }
    } else if (expiryMs < now) {
      // Конкретный срок в прошлом: читатели уже не дают премиум, чистим plan,
      // чтобы код, смотрящий только на premium_plan, не считал юзера платящим.
      patch.premium_plan = '';
      reasons.push('store_expiry_passed');
    }
  }

  // ── Админский грант ────────────────────────────────────────────────────────
  const legacyAdminPlan = plan === 'admin_grant' && override !== 'false';
  const isAdminGrant = override === 'true' || legacyAdminPlan;
  if (isAdminGrant && hasMeaningfulPlan(plan) && expiryMs > 0 && expiryMs < now) {
    patch.admin_premium_override = 'false';
    if (plan === 'admin_grant') patch.premium_plan = '';
    reasons.push('admin_grant_expired');
  }

  // ── VIP (рефералка / опрос / ручная выдача) ───────────────────────────────
  const vipPlan = cleanPlan(data.vip_plan);
  const vipRevoked = isFalsyFlag(data.vip_admin_override) || isFalsyFlag(data.vip_active);
  const vipGranted = isTruthyFlag(data.vip_active)
    || isTruthyFlag(data.vip_admin_override)
    || hasMeaningfulPlan(vipPlan);
  const vipUntilMs = parseProgressMs(data.vip_until ?? data.vip_expiry);
  // vip_until<=0 = бессрочный VIP — не трогаем. Гасим только конкретный срок в прошлом.
  if (!vipRevoked && vipGranted && vipUntilMs > 0 && vipUntilMs < now) {
    // Зеркало vipRevokeProgressFields (vip_revoke.ts): falsy vip_active/override
    // гасят VIP; vip_plan/vip_from/vip_until не трогаем (срок и так в прошлом).
    patch.vip_active = 'false';
    patch.vip_admin_override = 'false';
    reasons.push('vip_expired');
  }

  if (reasons.length === 0) return null;
  patch.premium_expiry_cron_at = String(now);
  patch.premium_expiry_cron_reason = reasons.join(',');
  return { patch, reasons };
}

type SweepStats = {
  scanned: number;
  deactivated: number;
  byReason: Record<string, number>;
  errors: number;
};

/**
 * Постраничный скан users/ (cursor по __name__, как в compute_leaderboard_stats.ts):
 * для каждого юзера считаем patch чистой функцией и merge-им только при необходимости.
 * Идемпотентно: повторный прогон по уже снятым ничего не пишет.
 */
export async function sweepExpiredPremium(now: number = Date.now()): Promise<SweepStats> {
  const db = admin.firestore();
  const stats: SweepStats = { scanned: 0, deactivated: 0, byReason: {}, errors: 0 };

  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = db.collection('users').orderBy('__name__').limit(500);
    if (lastDoc) q = q.startAfter(lastDoc);
    const page = await q.get();
    if (page.empty) break;

    const writes: Array<Promise<void>> = [];
    for (const doc of page.docs) {
      stats.scanned += 1;
      const progress = (doc.data()?.progress ?? {}) as Record<string, unknown>;
      const decision = planExpiryDeactivation(progress, now);
      if (!decision) continue;

      writes.push(
        doc.ref
          .set({ progress: decision.patch, updatedAt: now }, { merge: true })
          .then(() => {
            stats.deactivated += 1;
            for (const r of decision.reasons) {
              stats.byReason[r] = (stats.byReason[r] ?? 0) + 1;
            }
          })
          .catch((e) => {
            stats.errors += 1;
            console.error('premiumExpiryCron: write failed', doc.id, e);
          }),
      );
    }
    await Promise.all(writes);

    lastDoc = page.docs[page.docs.length - 1];
    if (page.size < 500) break;
  }

  console.log(
    `premiumExpiryCron: scanned=${stats.scanned} deactivated=${stats.deactivated}`,
    stats.byReason,
    stats.errors ? `errors=${stats.errors}` : '',
  );
  return stats;
}

// memory 1GiB + timeout 540s: полный постраничный скан users/ (как
// syncFriendActivityMirrorCron). Каждые 12 часов — просрочка снимается с лагом
// максимум ~12ч+grace; для премиум-доступа это мягче к пользователю и дешевле по full-scan reads.
export const premiumExpiryCron = functions.scheduler.onSchedule(
  { schedule: 'every 12 hours', timeZone: 'UTC', region: REGION, memory: '1GiB', timeoutSeconds: 540 },
  async () => {
    await sweepExpiredPremium();
  },
);
