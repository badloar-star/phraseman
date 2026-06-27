/**
 * Вирусный реферал (7 дней другу + 7 дней пригласившему, экономия Firebase-лимитов).
 * Крючок: «друг установил приложение, ввёл код и прошёл первый урок — вы оба получаете
 * по 7 дней полного доступа». 7+7 не равно 14: это две отдельные награды двум людям.
 *
 * Поток:
 *   1. referralEnsureMyCode — referrer получает публичный код (referral_codes/{code}).
 *   2. referralApply — referee вводит код (deeplink/manual). Идемпотентно, антифрод по возрасту аккаунта.
 *      Создаёт referral_attributions/{refereeStableId} со status='pending'.
 *   3. referee РЕАЛЬНО проходит урок 1 (>= бронзы ⇒ lesson1_pass_count >= 1, для fr —
 *      scoped-ключ lesson_progress_v2::fr::lesson1_pass_count). Сервер пишет pass_count только
 *      при passed; триггер referralOnUserProgressUpdated помечает attribution status='qualified'
 *      и сразу начисляет приглашённому его 7 дней. НЕ по unlocked_lessons (урок открывается и без
 *      прохождения — premium/intro/зачёт), иначе ложная квалификация и невидимый fr-курс.
 *   4. referrer в /friends видит qualified-друга и сам жмёт «Открыть» → referralClaimVipReward:
 *      одна транзакция, +7 дней VIP пригласившему (стак vip_until), attribution → 'rewarded'.
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

// ── Тюнинг реферальной программы (крутится из «Пульта» без релиза) ───────────
// Дефолты = прежние хардкоды. Читаются из remote_config/app.numbers тем же
// async-резолвером, что у арены/карточек (см. resolveReferralConfig). Денежная
// математика: при отсутствии/мусоре → дефолт по полю, поведение не меняется.
/** Referral reward: 7 days for the invited friend and 7 days for the referrer. */
export const REFERRAL_REWARD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Антифрод-кап: сколько друзей можно «обналичить» в VIP за календарный месяц. */
export const MAX_REFERRER_CLAIMS_PER_MONTH = 30;
/**
 * Анти-фарм: сколько наград можно обналичить за КАЛЕНДАРНЫЙ ДЕНЬ. Главная защита от накрутки
 * свежими аккаунтами (created_at клиентоперезаписываем, stableId сбрасывается отключением
 * бэкапа — см. referralApply). created_at правилами до конца не закрыть; дневной throttle
 * ограничивает СКОРОСТЬ фарма при любом сбросе личности. Награды не теряются: за капом
 * остаются 'qualified' и обналичиваются на следующий день. Честный юзер редко зовёт >3/день.
 */
export const MAX_REFERRER_CLAIMS_PER_DAY = 3;

export interface ReferralConfig {
  /** Дней VIP за одного друга (и referrer'у, и referee — это два разных человека). */
  rewardDays: number;
  /** Антифрод-кап обналичиваний/календарный месяц. */
  maxClaimsPerMonth: number;
  /** Анти-фарм throttle: обналичиваний/календарный день. */
  maxClaimsPerDay: number;
}

export const REFERRAL_DEFAULTS: ReferralConfig = {
  rewardDays: REFERRAL_REWARD_DAYS,
  maxClaimsPerMonth: MAX_REFERRER_CLAIMS_PER_MONTH,
  maxClaimsPerDay: MAX_REFERRER_CLAIMS_PER_DAY,
};

function referralClampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Чистый парсер конфига рефералов из remote_config/app.numbers. Отсутствие/мусор/
 * вне границ → дефолт по полю. НИКОГДА не бросает. Экспортируется для тестов.
 */
export function referralConfigFromData(numbers: Record<string, unknown> | undefined): ReferralConfig {
  const n = numbers ?? {};
  const d = REFERRAL_DEFAULTS;
  return {
    // rewardDays min=1: 0 дней = бессмысленная награда, которая всё равно сожгла бы
    // слот капа и пометила реферал 'rewarded' без эффекта. Минимум — 1 день.
    rewardDays: referralClampInt(n.referral_reward_days, 1, 3650, d.rewardDays),
    maxClaimsPerMonth: referralClampInt(n.referral_max_claims_month, 0, 100000, d.maxClaimsPerMonth),
    maxClaimsPerDay: referralClampInt(n.referral_max_claims_day, 0, 100000, d.maxClaimsPerDay),
  };
}

/**
 * Читает конфиг рефералов из remote_config/app.numbers. НИКОГДА не бросает:
 * при ошибке/отсутствии → дефолты (поведение как до фичи).
 */
export async function resolveReferralConfig(
  db: admin.firestore.Firestore,
): Promise<ReferralConfig> {
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    return referralConfigFromData(data?.numbers);
  } catch (e) {
    console.warn('resolveReferralConfig failed, using defaults', e);
    return { ...REFERRAL_DEFAULTS };
  }
}

/**
 * Чистая функция: сколько наград можно выдать прямо сейчас с учётом дневного И месячного капов.
 * Берёт минимум из остатков, не уходит в минус. Капы по умолчанию = дефолтные (обратная
 * совместимость и тесты); вызовы из callable передают значения из «Пульта». Экспортируется.
 */
export function referralClaimSlotsLeft(
  usedThisMonth: number,
  usedToday: number,
  maxPerMonth: number = MAX_REFERRER_CLAIMS_PER_MONTH,
  maxPerDay: number = MAX_REFERRER_CLAIMS_PER_DAY,
): number {
  const monthLeft = maxPerMonth - Math.max(0, Math.floor(usedThisMonth));
  const dayLeft = maxPerDay - Math.max(0, Math.floor(usedToday));
  return Math.max(0, Math.min(monthLeft, dayLeft));
}
/** Сколько qualified-друзей обрабатываем за один claim-вызов (защита от гигантских транзакций). */
const MAX_CLAIMS_PER_CALL = 20;

/**
 * Квалифицировать ли referee СРАЗУ при apply по уже имеющемуся прогрессу.
 * false (строго): нет — прогресс на момент apply мог быть подсунут миграцией снапшота
 * (клиентский lesson1_pass_count), что давало бы free-премиум без прохождения. Квалификацию
 * делает только триггер на ЖИВОМ событии урока (с отсевом миграции). Цена строгого режима:
 * редкий честный кейс «прошёл урок 1 ДО ввода кода» квалифицируется на следующем событии урока.
 */
const REFEREE_QUALIFY_ON_APPLY = false;

/**
 * Антифрод: код принимаем только от «нового» пользователя — того, у кого, по сути,
 * раньше не было приложения. Точный device-level признак «было/не было приложение»
 * недоступен (App Store/Play запрещают аппам стабильные device-id: IDFV сбрасывается,
 * SSAID меняется при factory reset). Поэтому опираемся на stableId, который СПЕЦИАЛЬНО
 * переживает переустановку (iOS Keychain AFTER_FIRST_UNLOCK + iCloud Keychain; Android
 * AsyncStorage в Google Drive Auto Backup — см. app/stable_id.ts). Если у человека когда-то
 * было приложение, у него уже есть stableId и users/{id}.created_at — он отсекается.
 *
 * Окно = 72ч, синхронно с intro-доступом новичка (intro_full_access ~72ч): пока у друга
 * идёт бесплатное полное окно — он точно новенький. НЕ ставим «created_at отсутствует»:
 * created_at пишется при ПЕРВОМ облачном синке прогресса (cloud_sync.ts), т.е. РАНЬШЕ,
 * чем друг успеет ввести код (особенно iOS — ручной ввод позже) — иначе резали бы честных.
 * 0 = проверка выключена.
 */
const REFEREE_MAX_ACCOUNT_AGE_MS = 72 * 60 * 60 * 1000;

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

/**
 * Ключи «урок 1 реально пройден» (pass_count >= 1), которые сервер пишет ТОЛЬКО при
 * passed (score >= 2.5) — см. functions/src/progress_events.ts:applyLessonFields.
 *  - EN/legacy:  lesson1_pass_count
 *  - FR (scoped): lesson_progress_v2::fr::lesson1_pass_count
 * НЕ используем unlocked_lessons: урок 2 открывается и без прохождения (premium/intro-триал
 * открывает весь уровень, сдача зачёта уровня, fallback-открытие) — это давало ложную
 * квалификацию (C2) и не видело fr-курс (C3).
 */
const LESSON1_PASS_KEYS = ['lesson1_pass_count', 'lesson_progress_v2::fr::lesson1_pass_count'] as const;

/**
 * Чистая функция: пройден ли РЕАЛЬНО первый урок (любого курса). Экспортируется для тестов.
 * `progress` — это users/{id}.progress (map строк).
 */
export function hasCompletedFirstLesson(
  progress: Record<string, unknown> | undefined,
): boolean {
  if (!progress) return false;
  for (const key of LESSON1_PASS_KEYS) {
    const n = Number(progress[key]);
    if (Number.isFinite(n) && n >= 1) return true;
  }
  return false;
}

function hasLesson1DoneProgress(
  root: admin.firestore.DocumentData | undefined,
): boolean {
  if (!root) return false;
  const p = (root as { progress?: Record<string, unknown> })?.progress;
  return hasCompletedFirstLesson(p);
}

/**
 * Был ли это записью МИГРАЦИИ снапшота прогресса (progressMigrateSnapshot), а не живым
 * событием урока. Миграция доверяет клиентскому lesson1_pass_count (progress_events.ts:
 * buildMigrationPatch) и могла бы фиктивно «зачесть» урок 1 → выдать 7 дней без прохождения.
 * Реальное прохождение приходит через progressSubmitEvent и НЕ трогает progressMigratedAt.
 * Отличаем по появлению/изменению поля progressMigratedAt в корне users/{id}.
 * Экспортируется для тестов. `beforeRoot`/`afterRoot` — корневые данные документа.
 */
export function isSnapshotMigrationWrite(
  beforeRoot: Record<string, unknown> | undefined,
  afterRoot: Record<string, unknown> | undefined,
): boolean {
  const a = afterRoot?.progressMigratedAt;
  if (a == null) return false;
  const b = beforeRoot?.progressMigratedAt;
  // Сравниваем по строковому виду — serverTimestamp материализуется в Timestamp/число.
  return String(a) !== String(b ?? '');
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

export function buildReferralVipProgressPatch(
  currentProgress: Record<string, unknown> | undefined,
  nowMs: number,
  addDays: number,
  source: 'referee' | 'referrer',
): Record<string, string> {
  const currentUntil = vipUntilFromProgress(currentProgress);
  const vipUntil = stackVipUntilMs(currentUntil, nowMs, addDays);
  return {
    vip_active: 'true',
    vip_plan: 'referral',
    vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
    vip_until: String(vipUntil),
    vip_admin_override: 'true',
    vip_admin_grant_at: String(nowMs),
    referral_vip_last_source: source,
  };
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

function yyyymmddNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Оставляет только N самых свежих периодов. Ключи дат (YYYY-MM-DD или YYYY-MM)
 * сортируются лексикографически = хронологически. Используется и для дневного
 * (keepDays=10), и для месячного (keepMonths=3) счётчика — иначе map растёт в
 * progress-документе бесконечно (M1).
 */
export function prunePeriodCounter(map: Record<string, number>, keep: number): Record<string, number> {
  const keys = Object.keys(map).sort().reverse().slice(0, keep);
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = map[k];
  return out;
}

/** @deprecated имя оставлено для совместимости тестов — делегирует prunePeriodCounter. */
function pruneDailyCounter(map: Record<string, number>, keepDays = 10): Record<string, number> {
  return prunePeriodCounter(map, keepDays);
}

/**
 * Referee прошёл урок 1 ⇒ помечаем его attribution как 'qualified'.
 *
 * Приглашённый получает свои 7 дней сразу после выполнения условия.
 * Пригласивший получает отдельные 7 дней по кнопке, чтобы не писать в чужой документ
 * на каждое обновление прогресса. 7+7 — это два отдельных человека, не 14 дней одному.
 */
export async function markRefereeQualified(
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

  // Тюнинг из «Пульта» (дней награды). Читаем ДО транзакции (отдельный документ).
  const cfg = await resolveReferralConfig(db);
  const uref = (uid: string) => db.collection(USERS).doc(uid);

  await db.runTransaction(async (tx) => {
    const attR = await tx.get(attRef);
    const refeeSnap = await tx.get(uref(userId));
    if (!attR.exists) return;
    if (!hasLesson1DoneProgress(refeeSnap.data())) return;
    const row = attR.data() as { status?: string };
    if (row?.status && row.status !== 'pending') return;

    const nowMs = Date.now();
    const refereeData = refeeSnap.data() ?? {};
    const refereeProgress = (refereeData as { progress?: Record<string, unknown> }).progress ?? {};
    const refereeVipPatch = buildReferralVipProgressPatch(
      refereeProgress,
      nowMs,
      cfg.rewardDays,
      'referee',
    );

    // Помечаем attribution готовым к обналичиванию referrer'ом.
    // Приглашённый получает свои 7 дней сразу; пригласивший забирает свои 7 дней по кнопке.
    tx.set(
      attRef,
      {
        status: 'qualified' as AttributionStatus,
        qualifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        qualifiedBy: 'lesson1_pass_count',
        refereeVipDays: cfg.rewardDays,
        refereeRewardedAtMs: nowMs,
        rewardKind: 'vip_days_both',
      },
      { merge: true },
    );
    tx.set(
      uref(userId),
      {
        progress: refereeVipPatch,
        updatedAt: nowMs,
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
 * Антифрод: код принимаем только от нового пользователя (у кого, по сути, не было
 * приложения) — аккаунт старше REFEREE_MAX_ACCOUNT_AGE_MS (72ч, по users.created_at,
 * stableId переживает переустановку) не принимаем.
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
  // НЕ квалифицируем сразу по факту уже существующего прогресса: его мог подсунуть
  // progressMigrateSnapshot (клиентский lesson1_pass_count) → free-премиум без прохождения.
  // Квалификацию делает ТОЛЬКО триггер referralOnUserProgressUpdated на ЖИВОМ событии урока
  // (там же отсев миграции). Это «строгий» режим: см. REFEREE_QUALIFY_ON_APPLY.
  if (result?.ok && REFEREE_QUALIFY_ON_APPLY) {
    await markRefereeQualified(db, refereeStableId).catch((e) => {
      console.warn('[referral] qualify after apply failed', e);
    });
  }
  return result;
});

/**
 * Когда referee РЕАЛЬНО проходит урок 1 (lesson1_pass_count >= 1, для fr — scoped-ключ) —
 * помечаем attribution referee как 'qualified' + начисляем приглашённому его 7 дней VIP.
 * referrer'у НИЧЕГО не пишем (pull): он обналичит свои 7 дней по кнопке. Отсекаем запись
 * миграции снапшота (isSnapshotMigrationWrite). onDocumentWritten: и create, и update.
 */
export const referralOnUserProgressUpdated = functions.firestore.onDocumentWritten(
  { document: `${USERS}/{userId}`, region: REGION },
  async (event) => {
    const userId = event.params.userId as string;
    const after = event.data?.after.data();
    if (!after) return;
    const beforeExists = event.data?.before?.exists;
    const before = beforeExists ? event.data?.before.data() : undefined;
    // Анти-обход: миграция снапшота (progressMigrateSnapshot) доверяет клиентскому
    // lesson1_pass_count и могла бы зачесть урок 1 без реального прохождения. Реальное
    // прохождение идёт через progressSubmitEvent и не трогает progressMigratedAt.
    if (isSnapshotMigrationWrite(
      before as Record<string, unknown> | undefined,
      after as Record<string, unknown> | undefined,
    )) return;
    const pA = (after as { progress?: Record<string, unknown> })?.progress;
    const pB = (before as { progress?: Record<string, unknown> } | undefined)?.progress;
    // Дёшево выходим, если сигнал «урок 1 пройден» не изменился (любой из pass-ключей).
    const unchanged = LESSON1_PASS_KEYS.every((k) => pA?.[k] === pB?.[k]);
    if (unchanged) return;
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
  const cfg = await resolveReferralConfig(db);
  return {
    ok: true,
    invites,
    qualifiedCount,
    claimableVipDays: qualifiedCount * cfg.rewardDays,
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

  // Тюнинг из «Пульта» (дней награды + капы). Читаем ДО транзакции (отд. документ).
  const cfg = await resolveReferralConfig(db);

  // Какие приглашения этого referrer'а готовы к обналичиванию (ещё не rewarded).
  // Включаем и legacy 'skipped_referrer_cap' — раньше эти строки застревали навсегда (M1);
  // теперь они тоже claimable (восстановление ранее потерянных наград).
  const qualifiedSnap = await db
    .collection(REFERRAL_ATTRIBUTIONS)
    .where('referrerStableId', '==', referrerStableId)
    .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
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
      cappedToday: false,
    };
  }

  const ym = yyyymmNow();
  const ymd = yyyymmddNow();
  const userRef = db.collection(USERS).doc(referrerStableId);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
    const attRefs = qualifiedSnap.docs.map((d) =>
      db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id),
    );
    const attSnaps = await Promise.all(attRefs.map((r) => tx.get(r)));

    const userData = userSnap.data() ?? {};
    const progressData = userData.progress as {
      referral_vip_claims_monthly?: Record<string, number>;
      referral_vip_claims_daily?: Record<string, number>;
    } | undefined;
    const monthly = progressData?.referral_vip_claims_monthly ?? {};
    const daily = progressData?.referral_vip_claims_daily ?? {};
    let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
    let usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    let vipUntil = Math.max(parseVipUntilMs(userData), nowMs);
    const claimed: ClaimedFriend[] = [];
    let cappedThisMonth = false;
    let cappedToday = false;

    for (let i = 0; i < attSnaps.length; i += 1) {
      const snap = attSnaps[i];
      if (!snap.exists) continue;
      const row = snap.data() as { status?: string } | undefined;
      // Принимаем qualified и legacy skipped_referrer_cap; 'rewarded'/прочее — пропуск (гонка).
      if (row?.status !== 'qualified' && row?.status !== 'skipped_referrer_cap') continue;

      if (referralClaimSlotsLeft(usedThisMonth, usedToday, cfg.maxClaimsPerMonth, cfg.maxClaimsPerDay) <= 0) {
        // Достигнут кап (день или месяц). НЕ понижаем статус — оставляем 'qualified',
        // эти 7 дней не теряются: дожмёт «Открыть» позже (на след. день / след. месяц).
        // Раньше ставили 'skipped_referrer_cap' и они терялись НАВСЕГДА (M1).
        if (usedThisMonth >= cfg.maxClaimsPerMonth) cappedThisMonth = true;
        else cappedToday = true; // дневной throttle (анти-фарм свежими аккаунтами)
        tx.set(
          attRefs[i],
          { lastCappedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        break; // остаток qualified-друзей сейчас тоже за капом — выходим.
      }

      // Стак: +N дней от текущего конца окна (или от now, если окна не было).
      vipUntil = stackVipUntilMs(vipUntil, nowMs, cfg.rewardDays);
      usedThisMonth += 1;
      usedToday += 1;
      claimed.push({ refereeStableId: snap.id, daysGranted: cfg.rewardDays });

      tx.set(
        attRefs[i],
        {
          status: 'rewarded' as AttributionStatus,
          rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
          referrerVipDays: cfg.rewardDays,
          rewardKind: 'vip_days_both',
        },
        { merge: true },
      );
    }

    if (claimed.length > 0) {
      // Пишем VIP теми же полями, что admin-grant — премиум-механику не меняем.
      // vip_admin_grant_at — маркер для клиентской анимации (vip_celebration_state).
      const referrerVipPatch = buildReferralVipProgressPatch(
        (userData as { progress?: Record<string, unknown> }).progress,
        nowMs,
        claimed.length * cfg.rewardDays,
        'referrer',
      );
      tx.set(
        userRef,
        {
          progress: {
            ...referrerVipPatch,
            // Месячный счётчик: чистим старые месяцы (храним ~3 последних), иначе
            // map рос бесконечно в progress-документе (M1, аудит 2026-06-21).
            referral_vip_claims_monthly: prunePeriodCounter({ ...monthly, [ym]: usedThisMonth }, 3),
            // Дневной счётчик: чистим старые дни, чтобы map не рос бесконечно (храним ~10 последних).
            referral_vip_claims_daily: prunePeriodCounter({ ...daily, [ymd]: usedToday }, 10),
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
        days: claimed.length * cfg.rewardDays,
        friends: claimed.length,
        label: `💎 +${claimed.length * cfg.rewardDays} дней VIP`,
        seen: false,
      });
    }

    return {
      ok: true,
      granted: claimed.length * cfg.rewardDays,
      claimed,
      vipUntilMs: vipUntil,
      cappedThisMonth,
      cappedToday,
    };
  });
});
