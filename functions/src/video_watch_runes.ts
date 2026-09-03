/**
 * videoWatchRunesClaim — руны за просмотр видео в приложении: 1 руна за минуту.
 *
 * зачем (владелец 2026-09-03): бесплатному во время просмотра ускоряется энергия
 * (10 минут вместо 30, см. app/energy_video_watch_credit.ts), но у Plus/Pro
 * энергия безлимитная — ускорять нечего, и значок им вообще не показывался.
 * Вместо энергии им капают руны: 1 за каждую полную минуту реального просмотра.
 *
 * Класс операции — 'grant', НЕ 'earn' (решение зафиксировано в stars_ledger):
 * просмотр не оплачен учёбой и не должен двигать очки лиги и соревновательный
 * earnedTotal, иначе таблицу лиги выигрывал бы тот, кто дольше держит плеер.
 *
 * Начисление ОДНИМ вызовом в конце просмотра (решение владельца): счётчик на
 * экране тикает локально и мгновенно, а на сервер уходит один запрос при паузе
 * или закрытии. Поминутные вызовы стоили бы 60 обращений в час на человека.
 *
 * Потолок — 600 рун в сутки (владелец): десять часов просмотра. Считается по
 * UTC-дню в самом документе пользователя, без отдельной коллекции: лишняя
 * коллекция означала бы лишнее чтение на каждый вызов.
 *
 * Идемпотентность двухслойная, как в welcome_gift:
 *  - opId привязан к requestId клиента — повтор того же отрезка леджер отвергнет;
 *  - счётчик дня и его ключ живут в одной транзакции с начислением.
 *
 * App Check не включаем — запломбирован владельцем (callable_options.ts,
 * APP_CHECK_SEALED_BY_OWNER_2026_08_17).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { isPremiumActive } from './admin_push_jobs';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Одна руна за минуту просмотра — число владельца. */
export const VIDEO_WATCH_RUNES_PER_MINUTE = 1;

/** Дневной потолок (владелец 2026-09-03): 600 рун = десять часов просмотра. */
export const VIDEO_WATCH_RUNES_DAILY_CAP = 600;

/**
 * Потолок ОДНОГО отрезка: 180 минут непрерывного просмотра. Защита от испорченных
 * часов на устройстве и от подделанного запроса — клиент присылает минуты, и
 * доверять им без ограничения нельзя.
 */
const MAX_MINUTES_PER_CLAIM = 180;

/** Поле дневного счётчика внутри users/{uid}. */
const DAILY_FIELD = 'videoWatchRunesDaily';

/** Зеркало welcome_gift.userMatchesAuth: stableId обязан принадлежать вызывающему. */
function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

/** UTC-день как ключ счётчика: тот же день у всех, без сюрпризов часовых поясов. */
export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Тот же ISO-ключ недели, что в welcome_gift (ленивый перенос недели в леджере). */
function isoWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Сколько рун реально можно выдать: минуты, обрезанные дневным потолком.
 * Вынесено отдельно и экспортировано — на это считает тест, и та же арифметика
 * зеркалится на клиенте для мгновенного счётчика.
 */
export function grantableVideoWatchRunes(
  requestedMinutes: number,
  alreadyGrantedToday: number,
): number {
  if (!Number.isFinite(requestedMinutes) || requestedMinutes <= 0) return 0;
  const minutes = Math.min(Math.floor(requestedMinutes), MAX_MINUTES_PER_CLAIM);
  const wanted = minutes * VIDEO_WATCH_RUNES_PER_MINUTE;
  const left = Math.max(0, VIDEO_WATCH_RUNES_DAILY_CAP - Math.max(0, alreadyGrantedToday));
  return Math.min(wanted, left);
}

export const videoWatchRunesClaim = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = String(request.data?.stableId ?? '').trim();
  const requestId = String(request.data?.requestId ?? '').trim();
  const minutes = Number(request.data?.minutes);
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'invalid_request_id');
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new HttpsError('invalid-argument', 'minutes_required');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableUid);
  const now = Date.now();
  const dayKey = utcDayKey(now);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    const data = userSnap.data();
    if (!userMatchesAuth(stableUid, data, request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }

    // Руны за просмотр — привилегия платной подписки: бесплатному вместо них
    // ускоряется энергия. Проверяем на СЕРВЕРЕ: клиентскому признаку доверять
    // нельзя, иначе награду получит кто угодно.
    if (!isPremiumActive(data ?? {}, now)) {
      throw new HttpsError('permission-denied', 'premium_required');
    }

    const dailyRaw = (data?.[DAILY_FIELD] ?? {}) as { dayKey?: unknown; granted?: unknown };
    const sameDay = String(dailyRaw.dayKey ?? '') === dayKey;
    const grantedToday = sameDay ? Math.max(0, Number(dailyRaw.granted) || 0) : 0;

    const grant = grantableVideoWatchRunes(minutes, grantedToday);
    if (grant <= 0) {
      // Потолок дня выбран — это штатный отказ, не ошибка. Возвращаем текущее
      // состояние, чтобы клиент показал честную цифру и убрал свой черновик.
      const current = normalizeStars(data?.stars);
      return {
        ok: true,
        granted: 0,
        reason: 'daily_cap_reached',
        grantedToday,
        dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
        stars: current.balance,
        starsEarnedTotal: current.earnedTotal,
        starsSeq: current.seq,
      };
    }

    const starOps: StarOpRequest[] = [{
      // opId привязан к requestId клиента: повторная отправка того же отрезка
      // (потерянный ответ, ретрай сети) не начислит второй раз — леджер отвергнет.
      //
      // ⚠️ РОВНО ОДНО двоеточие: формат леджера — /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/
      // (OP_ID_RE в stars_ledger.ts). Первая версия писала `video_watch:{uid}:{requestId}`
      // с двумя двоеточиями — такая операция отвергалась как invalid_op_id, и руны
      // не начислялись бы ВООБЩЕ. Поймано тестом до выката; uid здесь не нужен,
      // потому что расписки и так лежат в подколлекции самого пользователя.
      opId: `video_watch:${requestId}`,
      delta: grant,
      reason: 'video_watch',
      sourceKind: 'video_watch',
      sourceId: stableUid,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { requestId, minutes: Math.floor(minutes) },
    }];

    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
      nowMs: now,
      activeSeasonId: '',
      weekKeyNow: isoWeekKey(now),
      authUid: request.auth!.uid,
    });
    const committed = commitStarOperations(tx, prepared);

    // Счётчик дня пишем той же транзакцией: разъехаться с начислением он не может.
    tx.set(userRef, {
      [DAILY_FIELD]: { dayKey, granted: grantedToday + grant, updatedAt: now },
    }, { merge: true });

    return {
      ok: true,
      granted: grant,
      reason: 'granted',
      grantedToday: grantedToday + grant,
      dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
      stars: committed.balance,
      starsEarnedTotal: committed.earnedTotal,
      starsSeq: committed.seq,
    };
  });
});
