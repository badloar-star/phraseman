import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';

/**
 * Статистика экрана «Сколько английского ты знаешь» в онбординге (владелец 15.10, через координатора).
 *
 * зачем так:
 *  - экономно: один дневной документ-агрегат onboarding_level_daily/{YYYY-MM-DD} с FieldValue.increment по уровню и языку
 *    изучения; админка читает дни (≤ 90 документов), а не людей;
 *  - корректно: один ответ на человека — метка onboarding_level_counted/{stableId} создаётся в той же транзакции; повторный
 *    онбординг, повтор вызова, гость → вход с тем же stableId не задваивают;
 *  - приватность: на сервере НЕ хранится уровень конкретного человека — в метке только день; сам уровень живёт в профиле на
 *    телефоне (UserProfile.currentLevel), как и раньше. Счётчики — числа без uid.
 * Клиент: app/onboarding_level_stats.ts (только при согласии на статистику). Журнал [ONB-LEVEL].
 */

const LOG = '[ONB-LEVEL]';
export const ONB_LEVEL_DAILY_COLLECTION = 'onboarding_level_daily' as const;
export const ONB_LEVEL_COUNTED_COLLECTION = 'onboarding_level_counted' as const;
export const ONB_LEVELS = Object.freeze(['a0', 'a1', 'a2', 'b1', 'b2'] as const);
export type OnbLevel = (typeof ONB_LEVELS)[number];

export type OnbLevelAnswer = Readonly<{ level: OnbLevel | null; target: string }>;

/** Проверка входа: уровень из списка или null (пропустил), язык изучения — короткий код. Чистая функция. */
export function parseOnbLevelAnswer(data: unknown): OnbLevelAnswer {
  const raw = (data ?? {}) as Record<string, unknown>;
  const level = raw.level === null || raw.level === undefined ? null : String(raw.level);
  if (level !== null && !(ONB_LEVELS as readonly string[]).includes(level)) {
    throw new HttpsError('invalid-argument', 'onb_level_invalid');
  }
  const target = String(raw.target ?? '').trim().toLowerCase();
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(target)) throw new HttpsError('invalid-argument', 'onb_target_invalid');
  return Object.freeze({ level: level as OnbLevel | null, target });
}

export function onbDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Поля инкремента дневного агрегата. Чистая функция (FieldValue подставляет вызывающий). */
export function onbDailyIncrementPaths(answer: OnbLevelAnswer): readonly string[] {
  const bucket = answer.level ?? 'skipped';
  // в путях полей Firestore update допустимы только буквы, цифры и _: pt-br → pt_br
  const target = answer.target.replace(/[^a-z]/g, '_');
  return Object.freeze(['total', answer.level ? 'answered' : 'skipped', `byLevel.${bucket}`, `byTarget.${target}.${bucket}`]);
}

export async function recordOnbLevelAnswer(
  db: admin.firestore.Firestore,
  stableUid: string,
  answer: OnbLevelAnswer,
  nowMs: number,
): Promise<'counted' | 'duplicate'> {
  const countedRef = db.collection(ONB_LEVEL_COUNTED_COLLECTION).doc(stableUid);
  const day = onbDayKey(nowMs);
  const dailyRef = db.collection(ONB_LEVEL_DAILY_COLLECTION).doc(day);
  return db.runTransaction(async (tx) => {
    // все чтения транзакции — до записей (требование Firestore): метка человека и дневной документ одним getAll
    const [counted, dailySnap] = await tx.getAll(countedRef, dailyRef);
    if (counted.exists) return 'duplicate' as const;
    tx.create(countedRef, { day, atMs: nowMs }); // guard-ok: метка «посчитан» в транзакции, без уровня
    const inc = admin.firestore.FieldValue.increment(1);
    const patch: Record<string, unknown> = { day, updatedAtMs: nowMs };
    for (const fieldPath of onbDailyIncrementPaths(answer)) patch[fieldPath] = inc;
    // update с точечными путями создаёт вложенные карты; первый ответ дня — set(merge) с той же формой
    if (dailySnap.exists) tx.update(dailyRef, patch);
    else {
      const nested: Record<string, unknown> = { day, updatedAtMs: nowMs };
      for (const fieldPath of onbDailyIncrementPaths(answer)) {
        const parts = fieldPath.split('.');
        let node = nested;
        for (let i = 0; i < parts.length - 1; i += 1) {
          node[parts[i]] = (node[parts[i]] as Record<string, unknown>) ?? {};
          node = node[parts[i]] as Record<string, unknown>;
        }
        node[parts[parts.length - 1]] = inc;
      }
      tx.set(dailyRef, nested, { merge: true });
    }
    return 'counted' as const;
  });
}

// зачем: владелец 15.10 — статистика уровня из онбординга в админке; вызывает клиент один раз при завершении онбординга.
export const onboardingLevelRecord = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<{ status: 'counted' | 'duplicate' }> => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    console.warn(`${LOG} reject reason=auth_required`);
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const answer = parseOnbLevelAnswer(request.data);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.ownerStableId, { requireKnownIdentity: true, repairLinks: false });
  const status = await recordOnbLevelAnswer(db, stableUid, answer, Date.now());
  console.log(`${LOG} ${status} level=${answer.level ?? 'skipped'} target=${answer.target} uid=${stableUid.slice(0, 8)}`);
  return { status };
});
