import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { submitClientReport as submitClientReportCallable } from './client_reports';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

const THROTTLE_KEY = 'last_user_report_ts';
const THROTTLE_MS = 30_000;

export type UserReportReason = 'offensive_nickname';

let reportThrottleCacheTs = 0;

async function isReportThrottled(now: number): Promise<boolean> {
  if (reportThrottleCacheTs > 0 && now - reportThrottleCacheTs < THROTTLE_MS) {
    return true;
  }
  const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY);
  const last = parseInt(lastRaw || '0', 10) || 0;
  if (last > 0) {
    reportThrottleCacheTs = last;
    if (now - last < THROTTLE_MS) return true;
  }
  return false;
}

async function markReportSent(now: number): Promise<void> {
  await AsyncStorage.setItem(THROTTLE_KEY, String(now));
  reportThrottleCacheTs = now;
}

export const submitUserReport = async (params: {
  reportedUid: string;
  reportedName: string;
  reason: UserReportReason;
  screen: 'leaderboard' | 'profile';
}): Promise<'sent' | 'throttled' | 'failed'> => {
  const now = Date.now();
  if (await isReportThrottled(now)) return 'throttled';

  const [reporterName, appVersion] = await Promise.all([
    AsyncStorage.getItem('user_name'),
    Promise.resolve(Constants.expoConfig?.version ?? 'unknown'),
  ]);

  try {
    await submitClientReportCallable('user_report', {
      reportedUid: params.reportedUid,
      reportedName: params.reportedName,
      reason: params.reason,
      screen: params.screen,
      reporterName: reporterName ?? 'unknown',
      platform: Platform.OS,
      appVersion,
    });
  } catch {
    return 'failed';
  }

  await markReportSent(now);
  return 'sent';
};

// ────────────────────────────────────────────────────────────────────────────
// Community pack reporting (UGC) — Apple Guideline 1.2 для UGC-додатків
// вимагає механізм користувача поскаржитися на контент. Зберігаємо в окремій
// колекції `community_pack_reports`. У адмінці: вкладка «Community» → підвкладка «Жалобы на наборы».
// Throttle спільний з user_reports щоб юзер не спамив.
// ────────────────────────────────────────────────────────────────────────────

export type PackReportReason =
  | 'offensive'        // образливий, ненависницький контент
  | 'sexual'           // дорослий контент
  | 'spam'             // спам, нісенітниця, повтори
  | 'copyright'        // порушення авторського права
  | 'wrong_translation' // неправильний переклад / некоректний контент
  | 'other';

export const submitPackReport = async (params: {
  packId: string;
  packTitle: string;
  authorStableId?: string | null;
  studyTarget?: RuntimeStudyTarget;
  reason: PackReportReason;
  comment?: string;
}): Promise<'sent' | 'throttled' | 'failed'> => {
  const now = Date.now();
  if (await isReportThrottled(now)) return 'throttled';

  const [reporterName, appVersion] = await Promise.all([
    AsyncStorage.getItem('user_name'),
    Promise.resolve(Constants.expoConfig?.version ?? 'unknown'),
  ]);

  try {
    await submitClientReportCallable('community_pack_report', {
      packId: params.packId,
      packTitle: params.packTitle,
      authorStableId: params.authorStableId ?? null,
      studyTarget: storageStudyTarget(params.studyTarget),
      reason: params.reason,
      comment: (params.comment ?? '').slice(0, 500),
      reporterName: reporterName ?? 'unknown',
      platform: Platform.OS,
      appVersion,
    });
  } catch {
    return 'failed';
  }

  await markReportSent(now);
  return 'sent';
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

/**
 * Пожаловаться на ник соперника прямо из боя Арены.
 *
 * зачем: uid соперника в клиент намеренно не приходит (в плане матча только
 * место a/b, имя и аватар), поэтому обычная жалоба на игрока здесь невозможна.
 * Шлём matchId + место — uid находит сервер. Жалоба на бота отклоняется им же.
 *
 * Троттл общий с жалобами на игрока: 30 секунд между отправками.
 */
export const submitArenaOpponentReport = async (params: {
  matchId: string;
  opponentSeat: 'a' | 'b';
  opponentName: string;
}): Promise<'sent' | 'throttled' | 'failed'> => {
  const now = Date.now();
  if (await isReportThrottled(now)) return 'throttled';

  const [reporterName, appVersion] = await Promise.all([
    AsyncStorage.getItem('user_name'),
    Promise.resolve(Constants.expoConfig?.version ?? 'unknown'),
  ]);

  try {
    await submitClientReportCallable('arena_opponent_report', {
      matchId: params.matchId,
      opponentSeat: params.opponentSeat,
      reportedName: params.opponentName,
      reason: 'offensive_nickname',
      reporterName: reporterName ?? 'unknown',
      platform: Platform.OS,
      appVersion,
    });
  } catch {
    return 'failed';
  }

  await markReportSent(now);
  return 'sent';
};
