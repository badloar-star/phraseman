/**
 * Руны за просмотр видео (Plus/Pro): клиентская сторона.
 *
 * зачем (владелец 2026-09-03): бесплатному во время просмотра ускоряется энергия
 * (app/energy_video_watch_credit.ts), а у Plus/Pro она безлимитная — ускорять
 * нечего. Им вместо этого капают руны: 1 за каждую полную минуту просмотра.
 *
 * Разделение обязанностей:
 *  - СЧЁТ на экране идёт локально и мгновенно (Optimistic UI): человек видит
 *    «+3 руны» сразу, не дожидаясь сети;
 *  - НАЧИСЛЕНИЕ делает сервер ОДНИМ вызовом в конце просмотра (решение
 *    владельца). Руны server-owned: поле `stars` закрыто правилами Firestore,
 *    клиент его не пишет физически. Поминутные вызовы стоили бы 60 обращений
 *    в час на человека — отсюда и накопление отрезка.
 *
 * Черновик минут хранится на устройстве до подтверждения сервером: если
 * приложение убьют посреди просмотра, минуты не пропадут — уедут при следующем
 * запуске. Ключ привязан к аккаунту, чтобы черновик не утёк другому владельцу.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { DebugLogger } from './debug-logger';

const REGION = 'us-central1';

/** Одна руна за минуту — зеркало серверной константы (сторожит тест). */
export const VIDEO_WATCH_RUNES_PER_MINUTE = 1;

/** Дневной потолок — зеркало серверного (владелец: 600 рун = 10 часов). */
export const VIDEO_WATCH_RUNES_DAILY_CAP = 600;

/** Черновик несданных минут: переживает перезапуск, привязан к аккаунту. */
function pendingKeyFor(stableId: string): string {
  return `video_watch_runes_pending_v1:${stableId}`;
}

type ClaimWire = {
  ok?: boolean;
  granted?: number;
  reason?: string;
  grantedToday?: number;
  dailyCap?: number;
  stars?: number;
  starsEarnedTotal?: number;
  starsSeq?: number;
};

export type VideoWatchClaimResult =
  | { ok: false; reason: string }
  | { ok: true; granted: number; grantedToday: number; reason: string };

/** Сколько минут ждут отправки (для мгновенного счётчика на экране). */
export async function readPendingWatchMinutes(stableId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(pendingKeyFor(stableId));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch (e) {
    DebugLogger.error(
      'video_watch_runes_client:readPending',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
    return 0;
  }
}

/** Копит просмотренные минуты локально. Сеть здесь не участвует. */
export async function addPendingWatchMinutes(stableId: string, minutes: number): Promise<number> {
  if (!Number.isFinite(minutes) || minutes <= 0) return readPendingWatchMinutes(stableId);
  try {
    const current = await readPendingWatchMinutes(stableId);
    const next = current + Math.floor(minutes);
    await AsyncStorage.setItem(pendingKeyFor(stableId), String(next));
    return next;
  } catch (e) {
    DebugLogger.error(
      'video_watch_runes_client:addPending',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
    return 0;
  }
}

/** Идентификатор запроса: один на отрезок, чтобы повтор не начислил дважды. */
function makeRequestId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `vw${Date.now().toString(36)}${rand}`.slice(0, 96);
}

/**
 * Ключ идентификатора запроса — живёт РЯДОМ с черновиком минут.
 *
 * зачем (аудит 2026-09-03): идемпотентность на сервере привязана к requestId,
 * но первая версия генерила его заново на КАЖДУЮ попытку. Сценарий двойного
 * начисления: транзакция закоммитилась, а ответ потерялся в сети — черновик
 * минут сознательно сохраняется, и следующая попытка уходила уже с НОВЫМ
 * requestId, то есть новой операцией. Те же минуты начислялись дважды.
 * Теперь идентификатор создаётся один раз вместе с черновиком и живёт до
 * подтверждённой сдачи — ретрай несёт тот же opId, и леджер его отвергает.
 */
function requestKeyFor(stableId: string): string {
  return `video_watch_runes_request_v1:${stableId}`;
}

/** Возвращает идентификатор текущего черновика, создавая его при первой минуте. */
async function getOrCreateRequestId(stableId: string): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(requestKeyFor(stableId));
    if (existing && /^[A-Za-z0-9_-]{12,96}$/.test(existing)) return existing;
  } catch (e) {
    DebugLogger.error(
      'video_watch_runes_client:readRequestId',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
  }
  const fresh = makeRequestId();
  await AsyncStorage.setItem(requestKeyFor(stableId), fresh).catch(() => {});
  return fresh;
}

/**
 * Сдаёт накопленные минуты на сервер и мерджит авторитетный баланс.
 * Черновик очищается ТОЛЬКО после успешного ответа — потерянная сеть означает
 * повтор в следующий раз, а не потерянные руны.
 */
export async function claimPendingWatchRunes(
  token: AccountGenerationToken,
  stableId: string,
): Promise<VideoWatchClaimResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'cloud_disabled' };
  const minutes = await readPendingWatchMinutes(stableId);
  if (minutes <= 0) return { ok: false, reason: 'nothing_pending' };
  if (!isCurrentAccountGeneration(token, stableId)) {
    return { ok: false, reason: 'account_changed_before_claim' };
  }

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    // Тот же идентификатор при повторе — иначе потерянный ответ начислил бы
    // те же минуты второй раз (см. комментарий у getOrCreateRequestId).
    const requestId = await getOrCreateRequestId(stableId);
    const fn = httpsCallable<{ stableId: string; requestId: string; minutes: number }, ClaimWire>(
      getFunctions(getApp(), REGION),
      'videoWatchRunesClaim',
    );
    const res = await fn({ stableId, requestId, minutes });
    if (!isCurrentAccountGeneration(token, stableId)) {
      return { ok: false, reason: 'account_changed_after_claim' };
    }

    const data = res.data;
    const stars = Number(data?.stars);
    const earned = Number(data?.starsEarnedTotal);
    const seq = Number(data?.starsSeq);
    await mergeLevelSpinServerStars(token, {
      ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(Number.isFinite(earned) ? { starsEarnedTotal: Math.max(0, Math.trunc(earned)) } : {}),
      ...(Number.isSafeInteger(seq) && seq >= 0 ? { starsSeq: seq } : {}),
    });
    // Сервер принял отрезок (в том числе с ответом «потолок дня выбран») —
    // черновик отработал и обязан исчезнуть, иначе те же минуты поедут снова.
    await AsyncStorage.multiRemove([pendingKeyFor(stableId), requestKeyFor(stableId)])
      .catch(() => {});

    const granted = Math.max(0, Math.trunc(Number(data?.granted) || 0));
    const grantedToday = Math.max(0, Math.trunc(Number(data?.grantedToday) || 0));
    if (__DEV__) {
      console.log(
        `[VIDEO-RUNES] начислено ${granted} за ${minutes} мин · сегодня ${grantedToday}`
        + `/${VIDEO_WATCH_RUNES_DAILY_CAP} · reason=${String(data?.reason ?? '-')}`,
      );
    }
    return { ok: true, granted, grantedToday, reason: String(data?.reason ?? 'granted') };
  } catch (error) {
    const code = String((error as { code?: unknown })?.code ?? '');
    // Премиум кончился прямо во время просмотра — черновик больше не нужен,
    // иначе он будет вечно биться о серверный отказ при каждом запуске.
    if (code.includes('permission-denied')) {
      await AsyncStorage.multiRemove([pendingKeyFor(stableId), requestKeyFor(stableId)])
      .catch(() => {});
      DebugLogger.error(
        'video_watch_runes_client:permission_denied',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
      return { ok: false, reason: 'premium_required' };
    }
    // Сеть/сервер недоступны — черновик СОХРАНЯЕМ: минуты уедут в следующий раз.
    DebugLogger.error(
      'video_watch_runes_client:claim_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return { ok: false, reason: `claim_failed:${code || 'unknown'}` };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
