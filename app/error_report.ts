import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions, PixelRatio } from 'react-native';
import Constants from 'expo-constants';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import type { Lang } from '../constants/i18n';
import { registerXP } from './xp_manager';
import { getCanonicalUserId } from './user_id_policy';
import { getLevelFromXP } from '../constants/theme';
import { getVerifiedPremiumStatus } from './premium_guard';

const THROTTLE_KEY = 'last_error_report_ts';
const THROTTLE_MS = 60_000;

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

/**
 * Структурированный репорт.
 *
 * dataId  — машинно-читаемый ключ для поиска в коде:
 *   "lesson_5_phrase_42"         → grep lesson 5 data, index 42
 *   "irregular_verb_go"          → grep "go" в irregular_verbs_data.ts
 *   "word_take_off"              → grep "take_off" в words data
 *   "quiz_easy_run_out_of"       → grep "run out of" в quiz_data.ts
 *   "flashcard_give_up"          → grep "give up" в flashcards
 *   "exam_lesson_3_q5"           → exam lesson 3, вопрос 5
 *   "dialog_job_interview_step_3" → dialog id + step index
 *   "theory_lesson_7"            → lesson_help.tsx, lessonId=7
 *   "review_she_insisted"        → grep phrase в active_recall data
 */
export const ERROR_REPORT_COMMENT_MIN_LEN = 5;

export interface ErrorReportPayload {
  screen: string;
  category: string;
  dataId: string;
  dataText: string;
  /** Обязательный поясняющий текст; минимум ERROR_REPORT_COMMENT_MIN_LEN символов после trim */
  comment: string;
}

export type ErrorReportResult = 'sent' | 'throttled' | 'invalid_comment';

export async function collectMetadata(userName: string, lang: string) {
  const { width, height } = Dimensions.get('window');
  const pixelRatio = PixelRatio.get();

  const [
    xpRaw,
    streakRaw,
    installDateRaw,
    legacyAnonId,
    fallbackName,
    canonicalUid,
  ] = await Promise.all([
    AsyncStorage.getItem('user_total_xp'),
    AsyncStorage.getItem('streak_count'),
    AsyncStorage.getItem('install_date'),
    AsyncStorage.getItem('anon_id'),
    AsyncStorage.getItem('user_name'),
    getCanonicalUserId().catch(() => null),
  ]);

  const totalXp = parseInt(xpRaw ?? '0') || 0;
  const streak = parseInt(streakRaw ?? '0') || 0;
  const level = getLevelFromXP(totalXp) ?? 1;
  const isPremium = await getVerifiedPremiumStatus().catch(() => false);

  let daysInApp = 0;
  if (installDateRaw) {
    const installMs = parseInt(installDateRaw);
    if (!isNaN(installMs)) {
      daysInApp = Math.floor((Date.now() - installMs) / 86_400_000);
    }
  }

  const deviceModel = Constants.deviceName ?? 'unknown';
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';

  return {
    // Device
    deviceModel,
    deviceOS: Platform.OS,
    deviceOSVersion: String(Platform.Version),
    screenWidth: width,
    screenHeight: height,
    pixelRatio,
    appVersion,
    // User
    uid: canonicalUid ?? legacyAnonId ?? 'unknown',
    userName: userName || fallbackName || 'unknown',
    userLevel: level,
    userXP: totalXp,
    userStreak: streak,
    userPremium: isPremium,
    userLanguage: lang,
    userDaysInApp: daysInApp,
  };
}

export function buildCopyText(
  payload: ErrorReportPayload,
  meta: Awaited<ReturnType<typeof collectMetadata>>,
): string {
  const lines = [
    '=== PHRASEMAN BUG REPORT ===',
    `dataId:    ${payload.dataId}`,
    `screen:    ${payload.screen}`,
    `category:  ${payload.category}`,
    `user:      ${meta.userName} #${meta.uid.slice(-4)} | Lv${meta.userLevel} | ${meta.userXP} XP | streak ${meta.userStreak} | premium: ${meta.userPremium} | days: ${meta.userDaysInApp}`,
    `device:    ${meta.deviceOS} ${meta.deviceOSVersion} | ${meta.deviceModel} | ${meta.screenWidth}x${meta.screenHeight} @${meta.pixelRatio}x | app v${meta.appVersion}`,
    `lang:      ${meta.userLanguage}`,
    'content:',
    ...payload.dataText.split('\n').map(l => `  ${l}`),
  ];
  lines.push(`comment:   ${payload.comment.trim()}`);
  lines.push('===========================');
  return lines.join('\n');
}

export const submitErrorReport = async (
  payload: ErrorReportPayload,
  userName: string,
  lang: Lang = 'ru',
): Promise<ErrorReportResult> => {
  const commentTrimmed = (payload.comment ?? '').trim();
  if (commentTrimmed.length < ERROR_REPORT_COMMENT_MIN_LEN) {
    return 'invalid_comment';
  }

  const now = Date.now();
  const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY);
  if (lastRaw && now - parseInt(lastRaw) < THROTTLE_MS) {
    return 'throttled';
  }

  const meta = await collectMetadata(userName, lang);

  const db = getFirestore();
  if (db) {
    // fire-and-forget: не блокируем XP-выдачу ожиданием Firestore
    db.collection('error_reports').add({
      // Content
      screen:    payload.screen,
      category:  payload.category,
      dataId:    payload.dataId,
      dataText:  payload.dataText,
      comment:   commentTrimmed,
      // Device
      deviceModel:      meta.deviceModel,
      deviceOS:         meta.deviceOS,
      deviceOSVersion:  meta.deviceOSVersion,
      screenWidth:      meta.screenWidth,
      screenHeight:     meta.screenHeight,
      pixelRatio:       meta.pixelRatio,
      appVersion:       meta.appVersion,
      // User
      uid:            meta.uid,
      userName:       meta.userName,
      userLevel:      meta.userLevel,
      userXP:         meta.userXP,
      userStreak:     meta.userStreak,
      userPremium:    meta.userPremium,
      userLanguage:   meta.userLanguage,
      userDaysInApp:  meta.userDaysInApp,
      // Meta
      copyText:  buildCopyText(payload, meta),
      createdAt: new Date().toISOString(),
    }).catch(() => {/* Firestore недоступен — XP уже выдан */});
  }

  await AsyncStorage.setItem(THROTTLE_KEY, String(now));
  await registerXP(10, 'achievement_reward', userName, lang);

  return 'sent';
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
