import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { submitClientReport as submitClientReportCallable } from './client_reports';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { isDevCardsFail, isDevCommunityPackId } from './dev_cards_state';

/** зачем (Макеты 12.10, съёмка R1): жалоба на демо-набор/его отклик — исход без сети и без троттлинга; null — обычный путь. */
function devCommunityReportOutcome(packId: string): 'sent' | 'failed' | null {
  if (!isDevCommunityPackId(packId)) return null;
  const outcome = isDevCardsFail('report_send') ? 'failed' : 'sent';
  console.warn(`[DEV-STATE] community: жалоба без сети pack=${packId} исход=${outcome}`); // guard-ok: dev-ветка
  return outcome;
}

const THROTTLE_KEY = 'last_user_report_ts';
const THROTTLE_MS = 30_000;

// зачем (2026-09-30): у визитки «Про» есть свой текст — на него жалуются отдельной
// причиной, со снимком текста (reportedText), чтобы модератор видел, что было написано.
export type UserReportReason = 'offensive_nickname' | 'offensive_profile_text';

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

/** Лимит жалоб 30 с по локальной отметке — для шторки жалобы: проверить ДО оптимистичного тоста (ревью Авторизации 13.10). Ничего не пишет. */
export async function isReportThrottledNow(): Promise<boolean> {
  return isReportThrottled(Date.now());
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
  /** Снимок текста визитки — только для причины offensive_profile_text. */
  reportedText?: string;
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
      ...(params.reason === 'offensive_profile_text' && params.reportedText
        ? { reportedText: params.reportedText.slice(0, 200) }
        : {}),
      screen: params.screen,
      reporterName: reporterName ?? 'unknown',
      platform: Platform.OS,
      appVersion,
    });
  } catch (error: unknown) {
    // зачем (аудит Optimistic UI, 12.10): отказ отправки жалобы был немым — экран откатывает «Готово», а причины в журнале не было
    console.warn(`[REPORT] user_report: отправка не удалась — ${error instanceof Error ? error.message : String(error)}`);
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
  // зачем (Макеты 12.10, cards-058/059): жалоба на демо-набор не уходит в прод; `fail=report_send` — «не отправилась».
  const devPackReport = devCommunityReportOutcome(params.packId);
  if (devPackReport) return devPackReport;
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
  } catch (error: unknown) {
    // зачем (аудит Optimistic UI, 12.10): отказ отправки жалобы был немым — экран откатывает «Готово», а причины в журнале не было
    console.warn(`[REPORT] community_pack_report: отправка не удалась — ${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }

  await markReportSent(now);
  return 'sent';
};

/**
 * Жалоба на КОНКРЕТНЫЙ отклик под набором сообщества (владелец 2026-09-17,
 * см. app/community_packs/ReportCommentModal.tsx). Тот же callable и та же
 * коллекция `community_pack_reports`, что и жалоба на весь набор — отличает
 * их наличие `commentId`. Троттл общий с остальными жалобами.
 */
export const submitPackCommentReport = async (params: {
  packId: string;
  packTitle: string;
  commentId: string;
  commentAuthorStableId: string;
  commentText: string;
  reason: PackReportReason;
  comment?: string;
}): Promise<'sent' | 'throttled' | 'failed'> => {
  const devCommentReport = devCommunityReportOutcome(params.packId);
  if (devCommentReport) return devCommentReport;
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
      commentId: params.commentId,
      commentAuthorStableId: params.commentAuthorStableId,
      commentText: params.commentText.slice(0, 200),
      reason: params.reason,
      comment: (params.comment ?? '').slice(0, 500),
      reporterName: reporterName ?? 'unknown',
      platform: Platform.OS,
      appVersion,
    });
  } catch (error: unknown) {
    // зачем (аудит Optimistic UI, 12.10): отказ отправки жалобы был немым — экран откатывает «Готово», а причины в журнале не было
    console.warn(`[REPORT] community_pack_comment_report: отправка не удалась — ${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }

  await markReportSent(now);
  return 'sent';
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

