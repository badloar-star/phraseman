/**
 * Вирусный реферал (односторонний VIP, экономия Firebase-лимитов).
 * Крючок: «позови друга — неделя полного доступа тебе». Другу VIP не даём — у него и так
 * свои 72ч intro-доступа (intro_full_access), а VIP — награда именно за приведение.
 *
 * Поток:
 *   1. referralEnsureMyCode — referrer получает публичный код (referral_codes/{code}).
 *   2. referralApply — referee вводит код (deeplink/manual). Идемпотентно, антифрод по возрасту аккаунта.
 *      Создаёт referral_attributions/{refereeStableId} со status='pending'.
 *   3. referee проходит урок 1 (>= бронзы ⇒ unlocked_lessons содержит 2). Его cloud_sync и так
 *      пишет progress.unlocked_lessons; триггер referralOnUserProgressUpdated помечает attribution
 *      status='qualified' — БЕЗ начисления (никаких фоновых записей).
 *   4. referrer в /friends видит qualified-друга и сам жмёт «Открыть» → referralClaimVipReward:
 *      одна транзакция, +7 дней VIP (стак vip_until), attribution → 'rewarded'. 1 write на клик.
 *
 * VIP-механику НЕ меняем: пишем те же поля vip_* в users/{id}.progress, что и admin-grant.
 * Авторитетный источник premium/vip — только Admin SDK (firestore.rules: progressHasNoPremiumWrites).
 */
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions/v2';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';

const CODE_LEN = 6;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CODE_ATTEMPTS = 12;

/** Односторонний VIP: 7 дней получает только referrer, по кнопке (pull), стакается. */
const REFERRER_VIP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Антифрод-кап: сколько друзей можно «обналичить» в VIP за календарный месяц. */
const MAX_REFERRER_CLAIMS_PER_MONTH = 30;
/** Сколько qualified-друзей обрабатываем за один claim-вызов (защита от гигантских транзакций). */
const MAX_CLAIMS_PER_CALL = 20;

/** Привязка apply только для «свежих» аккаунтов (ms с users.created_at). 0 = выкл. */
const REFEREE_MAX_ACCOUNT_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const REFERRAL_CODES = 'referral_codes';
const REFERRAL_OWNERS = 'referral_owners';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';

type AttributionStatus =
  | 'pending'
  | 'qualified'
  | 'rewarded'
  | 'skipped_referrer_cap';

function parseUnlockedLessons(raw: unknown): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  }
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? j.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function hasLesson1DoneProgress(
  root: admin.firestore.DocumentData | undefined,
): boolean {
  if (!root) return false;
  const p = (root as { progress?: Record<string, string> })?.progress;
  const u = p?.unlocked_lessons;
  return parseUnlockedLessons(u).includes(2);
}

/** Текущее VIP-окно referrer'а из users/{id}.progress (ms). Не активные/пустые → 0. */
function parseVipUntilMs(data: admin.firestore.DocumentData | undefined): number {
  const p = (data as { progress?: Record<string, unknown> } | undefined)?.progress;
  return vipUntilFromProgress(p);
}

/** Чистая функция: читает vip_until/vip_expiry из объекта progress (ms). Экспортируется для тестов. */
export function vipUntilFromProgress(progress: Record<string, unknown> | undefined): number {
  const raw = progress?.vip_until ?? progress?.vip_expiry;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/**
 * Чистая функция стакинга VIP-дней. Ключевое решение «копить на потом»:
 * стак считается от max(текущее_окно, now), поэтому уже накопленные дни НЕ сгорают,
 * а новые добавляются к концу окна. Экспортируется для тестов.
 */
export function stackVipUntilMs(
  currentUntilMs: number,
  nowMs: number,
  addDays: number,
  dayMs = DAY_MS,
): number {
  const base = Math.max(currentUntilMs > 0 ? currentUntilMs : 0, nowMs);
  return base + Math.max(0, Math.floor(addDays)) * dayMs;
}


function randomCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i += 1) {
    s += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return s;
}

function yyyymmNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Referee прошёл урок 1 ⇒ помечаем его attribution как 'qualified'.
 *
 * referee'у НИЧЕГО не начисляем: у него и так свои 72ч intro-доступа (intro_full_access),
 * VIP бережём как награду именно за приведение. referrer'у в фоне тоже не пишем — он обналичит
 * свои 7 дней по кнопке (pull), чтобы не делать запись в чужой документ на каждого друга.
 *
 * Односторонний VIP: 7 дней получает только referrer, по кнопке.
 */
async function markRefereeQualified(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<void> {
  const attRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(userId);
  const attSnap = await attRef.get();
  if (!attSnap.exists) return;
  const att0 = attSnap.data() as { status?: string; referrerStableId?: string };
  // Уже qualified/rewarded — ничего не делаем (идемпотентность).
  if (att0?.status && att0.status !== 'pending') return;
  const referrerId = String(att0.referrerStableId ?? '').trim();
  if (!referrerId) return;

  const uref = (uid: string) => db.collection(USERS).doc(uid);

  await db.runTransaction(async (tx) => {
    const attR = await tx.get(attRef);
    const refeeSnap = await tx.get(uref(userId));
    if (!attR.exists) return;
    if (!hasLesson1DoneProgress(refeeSnap.data())) return;
    const row = attR.data() as { status?: string };
    if (row?.status && row.status !== 'pending') return;

    // Помечаем attribution готовым к обналичиванию referrer'ом. referee ничего не пишем.
    tx.set(
      attRef,
      {
        status: 'qualified' as AttributionStatus,
        qualifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        qualifiedBy: 'unlocked_lesson_2',
      },
      { merge: true },
    );
  });
}

async function assertAuthStableLink(
  db: admin.firestore.Firestore,
  authUid: string,
  clientStableId: string,
): Promise<void> {
  const linkRef = db.collection(AUTH_LINKS).doc(authUid);
  const linkSnap = await linkRef.get();
  if (!linkSnap.exists) {
    throw new HttpsError('failed-precondition', 'LINK_ACCOUNT_REQUIRED');
  }
  const stableId = String(linkSnap.data()?.stable_id ?? '').trim();
  if (!stableId || stableId !== clientStableId) {
    throw new HttpsError('permission-denied', 'STABLE_ID_MISMATCH');
  }
}

/**
 * App Check: клиент инициализирует в app/app_check_init.ts.
 * После проверки токенов в Firebase Console → true (иначе callables вернут 401).
 */
// App Check env-gated (ENFORCE_APP_CHECK=true) — как в callable_options/account_delete.
// По умолчанию off, чтобы не ломать клиентов без App Check-токена; включается на проде через env.
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

/** Возвращает/создаёт публичный рефкод, привязанный к users/{stableId} через auth_links. */
export const referralEnsureMyCode = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const stableId = String(request.data?.stableId ?? '').trim();
  if (!stableId) {
    throw new HttpsError('invalid-argument', 'stableId required');
  }
  const db = admin.firestore();
  await assertAuthStableLink(db, authUid, stableId);

  const ownerRef = db.collection(REFERRAL_OWNERS).doc(stableId);
  const existing = await ownerRef.get();
  if (existing.exists && existing.data()?.code) {
    return { code: String(existing.data()!.code) };
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = randomCode();
    const codeRef = db.collection(REFERRAL_CODES).doc(code);
    // eslint-disable-next-line no-await-in-loop
    const created = await db.runTransaction(async (tx) => {
      const oSnap = await tx.get(ownerRef);
      if (oSnap.exists && oSnap.data()?.code) {
        return { code: String(oSnap.data()!.code), created: false };
      }
      const cSnap = await tx.get(codeRef);
      if (cSnap.exists) {
        return null;
      }
      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(codeRef, { ownerStableId: stableId, createdAt: now, normalized: code });
      tx.set(
        ownerRef,
        { code, ownerStableId: stableId, createdAt: now },
        { merge: true },
      );
      return { code, created: true };
    });
    if (created && 'code' in created) {
      return { code: created.code };
    }
  }
  throw new HttpsError('resource-exhausted', 'CODE_GENERATION_FAILED');
});

/**
 * Первичная фиксация: приглашённый (referee) вводит код до/после sign-in. Идемпотентно.
 * Антифрод: аки старше REFEREE_MAX_ACCOUNT_AGE_MS (по users.created_at) не принимаем.
 */
export const referralApply = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const refereeStableId = String(request.data?.refereeStableId ?? '').trim();
  const refCode = String(request.data?.refCode ?? '')
    .trim()
    .toUpperCase();
  if (!refereeStableId || !refCode) {
    throw new HttpsError('invalid-argument', 'refereeStableId and refCode required');
  }
  if (refCode.length < 4) {
    throw new HttpsError('invalid-argument', 'REF_CODE_INVALID');
  }

  const db = admin.firestore();
  await assertAuthStableLink(db, authUid, refereeStableId);

  const codeRef = db.collection(REFERRAL_CODES).doc(refCode);
  const attRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(refereeStableId);
  const userRef = db.collection(USERS).doc(refereeStableId);

  const result = await db.runTransaction(async (tx) => {
    const att0 = await tx.get(attRef);
    if (att0.exists) {
      const d = att0.data() as { refCode?: string; referrerStableId?: string; status?: string } | undefined;
      return {
        ok: true,
        already: true,
        refCode: d?.refCode ?? refCode,
        referrerStableId: d?.referrerStableId,
        status: d?.status,
      };
    }
    if (REFEREE_MAX_ACCOUNT_AGE_MS > 0) {
      const userSnap = await tx.get(userRef);
      if (userSnap.exists) {
        const c = userSnap.data()?.created_at;
        if (typeof c === 'number' && c > 0) {
          const age = Date.now() - c;
          if (age > REFEREE_MAX_ACCOUNT_AGE_MS) {
            throw new HttpsError('failed-precondition', 'REFERRAL_REFEREE_ACCOUNT_TOO_OLD');
          }
        }
      }
    }
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists) {
      throw new HttpsError('not-found', 'REF_CODE_UNKNOWN');
    }
    const ownerStableId = String(codeSnap.data()?.ownerStableId ?? '').trim();
    if (!ownerStableId) {
      throw new HttpsError('failed-precondition', 'REF_CODE_BROKEN');
    }
    if (ownerStableId === refereeStableId) {
      throw new HttpsError('invalid-argument', 'SELF_REFERRAL');
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(attRef, {
      referrerStableId: ownerStableId,
      refCode,
      status: 'pending' as AttributionStatus,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, already: false, referrerStableId: ownerStableId, refCode };
  });
  if (result?.ok) {
    await markRefereeQualified(db, refereeStableId).catch((e) => {
      console.warn('[referral] qualify after apply failed', e);
    });
  }
  return result;
});

/**
 * Когда в users/{stableId} появляется progress.unlocked_lessons с "2" (урок 1 с бронзой) —
 * помечаем attribution referee как 'qualified' + начисляем referee шарды. referrer'у НИЧЕГО
 * не пишем (pull): он обналичит VIP по кнопке. onDocumentWritten: и create, и update.
 */
export const referralOnUserProgressUpdated = functions.firestore.onDocumentWritten(
  { document: `${USERS}/{userId}`, region: REGION },
  async (event) => {
    const userId = event.params.userId as string;
    const after = event.data?.after.data();
    if (!after) return;
    const beforeExists = event.data?.before?.exists;
    const before = beforeExists ? event.data?.before.data() : undefined;
    const pA = (after as { progress?: Record<string, string> })?.progress;
    const pB = (before as { progress?: Record<string, string> } | undefined)?.progress;
    if (pA?.unlocked_lessons === pB?.unlocked_lessons) return;
    if (!hasLesson1DoneProgress(after)) return;

    const db = admin.firestore();
    await markRefereeQualified(db, userId);
  },
);

type InviteState = {
  refereeStableId: string;
  status: AttributionStatus;
  /** ms, для сортировки «новые сверху» на клиенте. */
  createdAtMs: number;
};

/**
 * Список приглашений этого referrer'а для экрана друзей (бейджи + кнопка «Получить»).
 * Читаем attributions на сервере (rules держим закрытыми: isAdmin only), отдаём только
 * безопасные поля. Один read на открытие /friends; клиент кеширует через SWR.
 */
export const referralListMyInvites = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const referrerStableId = String(request.data?.referrerStableId ?? '').trim();
  if (!referrerStableId) {
    throw new HttpsError('invalid-argument', 'referrerStableId required');
  }
  const db = admin.firestore();
  await assertAuthStableLink(db, authUid, referrerStableId);

  const snap = await db
    .collection(REFERRAL_ATTRIBUTIONS)
    .where('referrerStableId', '==', referrerStableId)
    .limit(200)
    .get();

  const invites: InviteState[] = snap.docs.map((d) => {
    const row = d.data() as { status?: string; createdAt?: admin.firestore.Timestamp };
    const createdAtMs =
      row.createdAt && typeof row.createdAt.toMillis === 'function'
        ? row.createdAt.toMillis()
        : 0;
    return {
      refereeStableId: d.id,
      status: (row.status as AttributionStatus) ?? 'pending',
      createdAtMs,
    };
  });

  const qualifiedCount = invites.filter((i) => i.status === 'qualified').length;
  return {
    ok: true,
    invites,
    qualifiedCount,
    claimableVipDays: qualifiedCount * REFERRER_VIP_DAYS,
  };
});

type ClaimedFriend = {
  refereeStableId: string;
  daysGranted: number;
};

/**
 * Pull-обналичивание: referrer жмёт «Получить 7 дней». Начисляем +7 дней VIP за каждого
 * qualified-друга (стак vip_until), помечаем attribution 'rewarded'. Идемпотентно: повторный
 * вызов без новых qualified вернёт granted=0. Месячный кап от абьюза.
 *
 * VIP пишем теми же полями, что admin-grant (vip_* в users/{id}.progress) — механику не трогаем.
 */
export const referralClaimVipReward = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const referrerStableId = String(request.data?.referrerStableId ?? '').trim();
  if (!referrerStableId) {
    throw new HttpsError('invalid-argument', 'referrerStableId required');
  }

  const db = admin.firestore();
  await assertAuthStableLink(db, authUid, referrerStableId);

  // Какие приглашения этого referrer'а готовы к обналичиванию (qualified, ещё не rewarded).
  const qualifiedSnap = await db
    .collection(REFERRAL_ATTRIBUTIONS)
    .where('referrerStableId', '==', referrerStableId)
    .where('status', '==', 'qualified')
    .limit(MAX_CLAIMS_PER_CALL)
    .get();

  if (qualifiedSnap.empty) {
    // Возвращаем текущее окно, чтобы клиент мог синхронизировать состояние без начисления.
    const u = await db.collection(USERS).doc(referrerStableId).get();
    return {
      ok: true,
      granted: 0,
      claimed: [] as ClaimedFriend[],
      vipUntilMs: parseVipUntilMs(u.data()),
      cappedThisMonth: false,
    };
  }

  const ym = yyyymmNow();
  const userRef = db.collection(USERS).doc(referrerStableId);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
    const attRefs = qualifiedSnap.docs.map((d) =>
      db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id),
    );
    const attSnaps = await Promise.all(attRefs.map((r) => tx.get(r)));

    const userData = userSnap.data() ?? {};
    const monthly =
      (userData.progress as { referral_vip_claims_monthly?: Record<string, number> } | undefined)
        ?.referral_vip_claims_monthly ?? {};
    let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    let vipUntil = Math.max(parseVipUntilMs(userData), nowMs);
    const claimed: ClaimedFriend[] = [];
    let cappedThisMonth = false;

    for (let i = 0; i < attSnaps.length; i += 1) {
      const snap = attSnaps[i];
      if (!snap.exists) continue;
      const row = snap.data() as { status?: string } | undefined;
      if (row?.status !== 'qualified') continue; // уже обналичено в гонке — пропускаем

      if (usedThisMonth >= MAX_REFERRER_CLAIMS_PER_MONTH) {
        cappedThisMonth = true;
        tx.set(
          attRefs[i],
          {
            status: 'skipped_referrer_cap' as AttributionStatus,
            cappedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        continue;
      }

      // Стак: +7 дней от текущего конца окна (или от now, если окна не было).
      vipUntil = stackVipUntilMs(vipUntil, nowMs, REFERRER_VIP_DAYS);
      usedThisMonth += 1;
      claimed.push({ refereeStableId: snap.id, daysGranted: REFERRER_VIP_DAYS });

      tx.set(
        attRefs[i],
        {
          status: 'rewarded' as AttributionStatus,
          rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
          referrerVipDays: REFERRER_VIP_DAYS,
          rewardKind: 'vip_days',
        },
        { merge: true },
      );
    }

    if (claimed.length > 0) {
      // Пишем VIP теми же полями, что admin-grant — премиум-механику не меняем.
      // vip_admin_grant_at — маркер для клиентской анимации (vip_celebration_state).
      tx.set(
        userRef,
        {
          progress: {
            vip_active: 'true',
            vip_plan: 'referral',
            vip_from: String(Math.min(parseVipUntilMs(userData) || nowMs, nowMs)),
            vip_until: String(vipUntil),
            vip_admin_override: 'true',
            vip_admin_grant_at: String(nowMs),
            referral_vip_claims_monthly: { ...monthly, [ym]: usedThisMonth },
          },
          updatedAt: nowMs,
        },
        { merge: true },
      );

      const rewardRef = userRef.collection('shard_rewards').doc();
      tx.set(rewardRef, {
        ts: nowIso,
        reason: 'referral_referrer_vip',
        rewardType: 'vip_days',
        amount: 0,
        days: claimed.length * REFERRER_VIP_DAYS,
        friends: claimed.length,
        label: `💎 +${claimed.length * REFERRER_VIP_DAYS} дней VIP`,
        seen: false,
      });
    }

    return {
      ok: true,
      granted: claimed.length * REFERRER_VIP_DAYS,
      claimed,
      vipUntilMs: vipUntil,
      cappedThisMonth,
    };
  });
});
