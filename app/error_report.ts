import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions, PixelRatio } from 'react-native';
import Constants from 'expo-constants';
import type { Lang } from '../constants/i18n';
import { registerXP } from './xp_manager';
import { getCanonicalUserId } from './user_id_policy';
import { getLevelFromXP } from '../constants/theme';
import { getVerifiedPremiumStatus } from './premium_guard';
import { submitClientReport } from './client_reports';

const THROTTLE_KEY = 'last_error_report_ts';
const THROTTLE_MS = 60_000;
let errorReportThrottleCacheTs = 0;
const safeReportEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

async function isErrorReportThrottled(now: number): Promise<boolean> {
  if (errorReportThrottleCacheTs > 0 && now - errorReportThrottleCacheTs < THROTTLE_MS) {
    return true;
  }
  const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY);
  const last = parseInt(lastRaw || '0', 10) || 0;
  if (last > 0) {
    errorReportThrottleCacheTs = last;
    if (now - last < THROTTLE_MS) return true;
  }
  return false;
}

/**
 * Structured bug report.
 *
 * dataId  — машинно-читаемый ключ для поиска в коде:
 *   "lesson_5_phrase_42"         → grep lesson 5 data, index 42
 *   "irregular_verb_go"          → grep "go" в irregular_verbs_data.ts
 *   "word_take_off"              → grep "take_off" в words data
 *   "lesson_words_run_out_of"    → grep "run out of" в lesson content
 *   "flashcard_give_up"          → grep "give up" в flashcards
 *   "exam_lesson_3_q5"           → exam lesson 3, вопрос 5
 *   "theory_lesson_7"            → lesson_help.tsx, lessonId=7
 *   "review_she_insisted"        → grep phrase в mistake-practice events
 */
export const ERROR_REPORT_COMMENT_MIN_LEN = 10;
export const ERROR_REPORT_FREE_TEXT_CATEGORY = 'free_text';

export interface ErrorReportPayload {
  screen: string;
  /** Legacy/admin grouping field. The app now submits free-text reports only. */
  category?: string;
  dataId: string;
  dataText: string;
  /** What the user actually entered/assembled before sending the report. */
  userAnswer?: string;
  /** Обязательный поясняющий текст; минимум ERROR_REPORT_COMMENT_MIN_LEN символов после trim */
  comment: string;
}

export type ErrorReportResult = 'sent' | 'throttled' | 'invalid_comment' | 'failed';

/**
 * Стабильный `dataId` для упражнения «собери фразу» в уроке (`lesson_N_phrase_K`).
 * Совпадает с суффиксом `phrase.id`, если он в формате `lesson{N}_phrase_{K}`.
 */
export function lessonPhraseReportDataId(
  lessonId: number,
  phrase: { id?: string | null } | null | undefined,
  realPhraseIdx: number,
): string {
  const raw = phrase?.id != null ? String(phrase.id).trim() : '';
  const m = raw.match(/^lesson(\d+)_phrase_(\d+)$/i);
  if (m) return `lesson_${m[1]}_phrase_${m[2]}`;
  return `lesson_${lessonId}_phrase_${realPhraseIdx + 1}`;
}

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
  const category = payload.category?.trim() || ERROR_REPORT_FREE_TEXT_CATEGORY;
  const lines = [
    '=== PHRASEMAN BUG REPORT ===',
    `dataId:    ${payload.dataId}`,
    `screen:    ${payload.screen}`,
    `category:  ${category}`,
    `user:      ${meta.userName} #${meta.uid.slice(-4)} | Lv${meta.userLevel} | ${meta.userXP} XP | streak ${meta.userStreak} | premium: ${meta.userPremium} | days: ${meta.userDaysInApp}`,
    `device:    ${meta.deviceOS} ${meta.deviceOSVersion} | ${meta.deviceModel} | ${meta.screenWidth}x${meta.screenHeight} @${meta.pixelRatio}x | app v${meta.appVersion}`,
    `lang:      ${meta.userLanguage}`,
    'content:',
    ...payload.dataText.split('\n').map(l => `  ${l}`),
  ];
  const userAnswer = (payload.userAnswer ?? '').trim();
  if (userAnswer.length > 0) {
    lines.push(`userAnswer: ${userAnswer}`);
  }
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
  const category = payload.category?.trim() || ERROR_REPORT_FREE_TEXT_CATEGORY;

  const now = Date.now();
  if (await isErrorReportThrottled(now)) {
    return 'throttled';
  }

  const meta = await collectMetadata(userName, lang);

  try {
    await submitClientReport('error_report', {
      screen: payload.screen,
      category,
      dataId: payload.dataId,
      dataText: payload.dataText,
      userAnswer: (payload.userAnswer ?? '').trim(),
      comment: commentTrimmed,
      deviceModel: meta.deviceModel,
      deviceOS: meta.deviceOS,
      deviceOSVersion: meta.deviceOSVersion,
      screenWidth: meta.screenWidth,
      screenHeight: meta.screenHeight,
      pixelRatio: meta.pixelRatio,
      appVersion: meta.appVersion,
      userName: meta.userName,
      userLevel: meta.userLevel,
      userXP: meta.userXP,
      userStreak: meta.userStreak,
      userPremium: meta.userPremium,
      userLanguage: meta.userLanguage,
      userDaysInApp: meta.userDaysInApp,
      copyText: buildCopyText({ ...payload, category, comment: commentTrimmed }, meta),
    });
  } catch {
    return 'failed';
  }
  await AsyncStorage.setItem(THROTTLE_KEY, String(now));
  errorReportThrottleCacheTs = now;
  /** Маленький бонус за отправку — не await: иначе общая очередь registerXP может навсегда держать «Отправка…». */
  void registerXP(10, 'achievement_reward', userName, lang, undefined, {
    eventId: [
      'achievement',
      'error_report',
      safeReportEventPart(Math.floor(now / THROTTLE_MS)),
      safeReportEventPart(payload.dataId, 50),
    ].join(':'),
    payload: {
      surface: 'error_report',
      dataId: payload.dataId,
    },
  }).catch(() => {});

  return 'sent';
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
