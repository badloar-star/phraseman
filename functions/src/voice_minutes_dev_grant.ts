/**
 * Дев-выдача голосовых минут БЕЗ оплаты — только для ручного тестирования.
 *
 * зачем (владелец 2026-08-29): владелец тестирует MAX с телефона под АНОНИМНЫМ
 * аккаунтом (почты нет, claim `admin` отсутствует — он висит на
 * badloar@gmail.com). Поэтому админская adminGrantVoiceMinutes отвечала
 * `permission-denied`, и проверить покупку минут было нечем: sandbox Google Play
 * не настроен.
 *
 * ⚠️ ЭТО ПЛАТНЫЙ ТОВАР, ВЫДАВАЕМЫЙ ДАРОМ. Пока флаг включён, ЛЮБОЙ вошедший
 * пользователь может начислить себе минуты бесплатно. Флаг обязан быть выключен
 * до релиза — сторож voice_minutes_dev_grant.test.ts держит дефолт `false`.
 *
 * Ограничители (осознанно узкие):
 *  • выключено по умолчанию — нужен флаг `voiceMinuteDevGrantEnabled: true`
 *    в документе config/max_voice;
 *  • только 30/120/300 минут — те же номиналы, что и в магазине;
 *  • не более DEV_GRANT_LIFETIME_CAP_MIN минут на аккаунт суммарно;
 *  • событие пишется тем же неизменяемым идемпотентным журналом, что и покупка
 *    (Economy Constitution: второго писателя баланса не появляется), с
 *    environment 'DEV' — такие начисления видно в аудите отдельно.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  appendVoiceMinuteEventInTransaction,
  createVoiceMinuteAdminGrantEvent,
  readVoiceMinuteWallet,
} from './voice_minutes';
import { voiceMinuteWalletResponse } from './voice_minutes_api';

/** Номиналы магазина: дев-выдача не изобретает своих пакетов. */
export const DEV_GRANT_ALLOWED_MINUTES = Object.freeze([30, 120, 300] as const);

/** Потолок на аккаунт: тестирование не должно превращаться в бесконечный кран. */
export const DEV_GRANT_LIFETIME_CAP_MIN = 600;

export function normalizeDevGrantMinutes(raw: unknown): number {
  // Строго число: строку '30' не принимаем — вход в платящий путь не должен
  // зависеть от неявных приведений типа.
  if (typeof raw !== 'number'
    || !Number.isSafeInteger(raw)
    || !(DEV_GRANT_ALLOWED_MINUTES as readonly number[]).includes(raw)) {
    throw new HttpsError('invalid-argument', 'voice_minute_dev_grant_minutes_invalid');
  }
  return raw;
}

/**
 * Флаг живёт в том же документе, что и остальная конфигурация MAX, и по
 * умолчанию ВЫКЛЮЧЕН: отсутствие поля обязано означать «нельзя».
 */
export function devGrantEnabledFromConfig(configData: Record<string, unknown> | undefined): boolean {
  return configData?.voiceMinuteDevGrantEnabled === true;
}

export const voiceMinuteDevGrant = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();

  // guard-ok: это чтение ОДНОГО документа по id (.doc()), а не запрос коллекции;
  // limit() к нему неприменим, стоимость — ровно 1 чтение.
  const configSnap = await db.collection('config').doc('max_voice').get();
  if (!devGrantEnabledFromConfig(configSnap.exists ? configSnap.data() : undefined)) {
    throw new HttpsError('failed-precondition', 'voice_minute_dev_grant_disabled');
  }

  const minutes = normalizeDevGrantMinutes(
    (request.data as Record<string, unknown> | undefined)?.minutes,
  );
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, undefined, {
    repairLinks: false,
    requireKnownIdentity: true,
  });

  const wallet = await readVoiceMinuteWallet(db, stableUid);
  // guard-ok: баланс здесь только ЧИТАЕТСЯ для проверки потолка; ни одна ветка
  // этой функции не уменьшает кошелёк — начисление идёт append-only событием.
  const grantedSoFarMin = Math.floor(Math.max(0, wallet.grantedSeconds) / 60);
  if (grantedSoFarMin + minutes > DEV_GRANT_LIFETIME_CAP_MIN) {
    throw new HttpsError('resource-exhausted', 'voice_minute_dev_grant_cap_reached');
  }

  const nowMs = Date.now();
  // Ключ идемпотентности — аккаунт + номинал + минута: двойной тап не удваивает
  // начисление, а осознанное повторное — проходит минутой позже.
  const sourceId = `dev_grant_${stableUid}_${minutes}_${Math.floor(nowMs / 60_000)}`;
  const event = createVoiceMinuteAdminGrantEvent({
    sourceId,
    ownerStableId: stableUid,
    grantedMinutes: minutes,
    occurredAtMs: nowMs,
    actorUid: request.auth.uid,
    requestId: sourceId,
    reason: 'dev_build_local_test_grant',
    comment: 'DEV grant (no payment)',
  });

  const applied = await db.runTransaction(
    (tx) => appendVoiceMinuteEventInTransaction(tx, db, event),
  );
  return voiceMinuteWalletResponse(applied.wallet, applied.applied);
});
