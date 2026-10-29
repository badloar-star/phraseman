// Автоначисление Plus за события (призы конкурса «Набор месяца», лесенка приглашений) — тем же механизмом, что Telegram.
//
// зачем (владелец 29.10 ~07:55): «Конкурсы каждый месяц. Система начисляет автоматически Plus, и он активируется как надо».
// Поэтому никакой «кнопки забрать»: сервер сам пишет vip_* (как Telegram-продление и промокоды) и проекцию доступа, которую
// читает приложение. Срок продлевается, а не затирается: max(текущий конец ЛЮБОГО Plus, сейчас) + N. Повторный запуск
// ничего не начисляет: журнал plus_grant_ledger/{key} создаётся в той же транзакции, что и выдача.
import { writeAccessProjectionFromPatch } from './access_projection';
import { isAdminGrantActive, isStorePremiumActive, isVipActive, parseProgressMs } from './premium_status';

export const PLUS_GRANT_LEDGER = 'plus_grant_ledger';
const LOG = '[PLUS-GRANT]';

export type PlusGrantDuration = Readonly<{ months: number }> | Readonly<{ days: number }>;
export type PlusGrantPlan = 'community_month' | 'referral_ladder';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Календарные месяцы с прижатием к последнему дню (31.01 + 1 мес. = 28/29.02), как communityPlusExpiry. */
export function addUtcMonths(ms: number, months: number): number {
  const start = new Date(ms);
  const end = new Date(ms);
  const day = start.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end.getTime();
}

/**
 * Конец текущего Plus по всем источникам. null — Plus бессрочный (lifetime / VIP без даты конца): продлевать нечего.
 * 0 — Plus сейчас нет.
 */
export function currentPlusEndMs(progress: Readonly<Record<string, unknown>>, nowMs: number): number | null {
  const ends: number[] = [];
  if (isVipActive(progress, nowMs)) {
    const vipUntil = parseProgressMs(progress.vip_until ?? progress.vip_expiry);
    if (vipUntil <= 0) return null;
    ends.push(vipUntil);
  }
  if (isStorePremiumActive(progress, nowMs) || isAdminGrantActive(progress, nowMs)) {
    const expiry = Math.max(parseProgressMs(progress.premium_expiry), parseProgressMs(progress.premium_rc_expiry_ms));
    if (expiry <= 0) return null;
    ends.push(expiry);
  }
  const community = parseProgressMs(progress.community_plus_until_ms);
  if (community > nowMs) ends.push(community);
  return ends.length ? Math.max(...ends) : 0;
}

export type PlusGrantPatch =
  | Readonly<{ kind: 'grant'; patch: Record<string, string>; baseMs: number; untilMs: number }>
  | Readonly<{ kind: 'lifetime' }>;

/** Чистое ядро: какой vip_* патч записать. Отдельно от Firestore, чтобы правила проверялись тестом напрямую. */
export function buildPlusGrantPatch(
  progress: Readonly<Record<string, unknown>>,
  nowMs: number,
  duration: PlusGrantDuration,
  plan: PlusGrantPlan,
  grantKey: string,
): PlusGrantPatch {
  const currentEnd = currentPlusEndMs(progress, nowMs);
  if (currentEnd === null) return { kind: 'lifetime' };
  const baseMs = Math.max(currentEnd, nowMs);
  const untilMs = 'months' in duration ? addUtcMonths(baseMs, duration.months) : baseMs + Math.max(0, Math.floor(duration.days)) * DAY_MS;
  // vip_from: если VIP уже идёт — не сдвигаем начало (иначе «окно» начнётся позже и Plus мигнёт); иначе — сейчас
  const vipFrom = isVipActive(progress, nowMs) ? parseProgressMs(progress.vip_from) : 0;
  return {
    kind: 'grant',
    baseMs,
    untilMs,
    patch: {
      vip_active: 'true',
      vip_plan: plan,
      vip_from: String(vipFrom > 0 && vipFrom <= nowMs ? vipFrom : nowMs),
      vip_until: String(untilMs),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(nowMs),
      plus_grant_last_key: grantKey,
    },
  };
}

/** Ключ журнала → id документа (без «/»). */
export function plusGrantLedgerId(grantKey: string): string {
  if (!/^[a-z_]+:[A-Za-z0-9_.:-]{1,200}$/.test(grantKey)) throw new Error(`Invalid plus grant key: ${grantKey.slice(0, 60)}`);
  return grantKey.replace(/:/g, '__');
}

export type PlusGrantResult =
  | Readonly<{ status: 'granted'; untilMs: number; baseMs: number }>
  | Readonly<{ status: 'already'; untilMs: number | null }>
  | Readonly<{ status: 'lifetime' }>
  | Readonly<{ status: 'user_missing' }>;

/**
 * Одна выдача Plus: журнал + профиль + проекция доступа в одной транзакции.
 * extraProgress — поля того же патча (например, отметка для истории победителя), пишутся только вместе с выдачей.
 */
export async function grantPlusOnce(db: FirebaseFirestore.Firestore, input: Readonly<{
  uid: string;
  grantKey: string;
  duration: PlusGrantDuration;
  plan: PlusGrantPlan;
  source: string;
  extraProgress?: Readonly<Record<string, string>>;
  /** Поля для бессрочного Plus (продлевать нечего) — например, история с plusMonths: 0 (Моменты 29.10). */
  extraProgressLifetime?: Readonly<Record<string, string>>;
  nowMs?: number;
}>): Promise<PlusGrantResult> {
  const ledgerRef = db.collection(PLUS_GRANT_LEDGER).doc(plusGrantLedgerId(input.grantKey));
  const userRef = db.collection('users').doc(input.uid);
  console.log(`${LOG} enter`, JSON.stringify({ key: input.grantKey, plan: input.plan, source: input.source, duration: input.duration }));
  try {
    const result = await db.runTransaction(async (tx) => {
      const [ledgerSnap, userSnap] = await Promise.all([tx.get(ledgerRef), tx.get(userRef)]);
      if (ledgerSnap.exists) {
        const until = Number(ledgerSnap.data()?.untilMs);
        return { status: 'already', untilMs: Number.isFinite(until) ? until : null } as const;
      }
      if (!userSnap.exists) return { status: 'user_missing' } as const;
      const user = userSnap.data() ?? {};
      if (user.identityHidden === true || user.levelSpinMergePending) {
        // склейка аккаунтов в процессе — повтор на следующем запуске расписания, а не выдача «в никуда»
        throw new Error('account_updating');
      }
      const nowMs = input.nowMs ?? Date.now();
      const progress = (user.progress && typeof user.progress === 'object' ? user.progress : {}) as Record<string, unknown>;
      const built = buildPlusGrantPatch(progress, nowMs, input.duration, input.plan, input.grantKey);
      if (built.kind === 'lifetime') {
        // зачем (владелец 29.10: «юзеру приходит история»): Plus продлевать нечего, но факт события (место в конкурсе)
        // всё равно пишем тем же ключом журнала — история приходит и бессрочному подписчику
        const lifetimeExtra = input.extraProgressLifetime ?? input.extraProgress;
        if (lifetimeExtra && Object.keys(lifetimeExtra).length > 0) {
          tx.set(userRef, { progress: { ...lifetimeExtra }, updatedAt: nowMs }, { merge: true });
          // проекция перечитывает progress — история (contestLastWin) доходит и бессрочному подписчику
          writeAccessProjectionFromPatch(tx, userRef, progress, lifetimeExtra, nowMs);
        }
        tx.create(ledgerRef, { key: input.grantKey, uid: input.uid, plan: input.plan, source: input.source, outcome: 'lifetime_noop', grantedAtMs: nowMs });
        return { status: 'lifetime' } as const;
      }
      const patch = { ...built.patch, ...(input.extraProgress ?? {}) };
      tx.set(userRef, { progress: patch, updatedAt: nowMs }, { merge: true });
      writeAccessProjectionFromPatch(tx, userRef, progress, patch, nowMs);
      tx.create(ledgerRef, {
        key: input.grantKey, uid: input.uid, plan: input.plan, source: input.source, outcome: 'granted',
        baseMs: built.baseMs, untilMs: built.untilMs, grantedAtMs: nowMs,
      });
      return { status: 'granted', untilMs: built.untilMs, baseMs: built.baseMs } as const;
    });
    console.log(`${LOG} result`, JSON.stringify({ key: input.grantKey, ...result }));
    return result;
  } catch (error) {
    console.warn(`${LOG} failed`, JSON.stringify({ key: input.grantKey, reason: error instanceof Error ? error.message.slice(0, 160) : String(error) }));
    throw error;
  }
}
