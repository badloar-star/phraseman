import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { getCanonicalUserId } from './user_id_policy';

const THROTTLE_KEY = 'last_user_report_ts';
const THROTTLE_MS = 30_000;

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
};

export type UserReportReason = 'offensive_nickname';

export const submitUserReport = async (params: {
  reportedUid: string;
  reportedName: string;
  reason: UserReportReason;
  screen: 'leaderboard' | 'arena';
}): Promise<'sent' | 'throttled'> => {
  const now = Date.now();
  const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY);
  if (lastRaw && now - parseInt(lastRaw) < THROTTLE_MS) return 'throttled';

  const [canonicalUid, legacyAnonId, reporterName, appVersion] = await Promise.all([
    getCanonicalUserId().catch(() => null),
    AsyncStorage.getItem('anon_id'),
    AsyncStorage.getItem('user_name'),
    Promise.resolve(Constants.expoConfig?.version ?? 'unknown'),
  ]);

  const db = getFirestore();
  if (db) {
    db.collection('user_reports').add({
      reportedUid:  params.reportedUid,
      reportedName: params.reportedName,
      reason:       params.reason,
      screen:       params.screen,
      reporterUid:  canonicalUid ?? legacyAnonId ?? 'unknown',
      reporterName: reporterName ?? 'unknown',
      platform:     Platform.OS,
      appVersion,
      status:       'new',
      createdAt:    new Date().toISOString(),
    }).catch(() => {});
  }

  await AsyncStorage.setItem(THROTTLE_KEY, String(now));
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
  reason: PackReportReason;
  comment?: string;
}): Promise<'sent' | 'throttled'> => {
  const now = Date.now();
  const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY);
  if (lastRaw && now - parseInt(lastRaw) < THROTTLE_MS) return 'throttled';

  const [canonicalUid, legacyAnonId, reporterName, appVersion] = await Promise.all([
    getCanonicalUserId().catch(() => null),
    AsyncStorage.getItem('anon_id'),
    AsyncStorage.getItem('user_name'),
    Promise.resolve(Constants.expoConfig?.version ?? 'unknown'),
  ]);

  const db = getFirestore();
  if (db) {
    db.collection('community_pack_reports').add({
      packId:         params.packId,
      packTitle:      params.packTitle,
      authorStableId: params.authorStableId ?? null,
      reason:         params.reason,
      comment:        (params.comment ?? '').slice(0, 500),
      reporterUid:    canonicalUid ?? legacyAnonId ?? 'unknown',
      reporterName:   reporterName ?? 'unknown',
      platform:       Platform.OS,
      appVersion,
      status:         'new',
      createdAt:      new Date().toISOString(),
    }).catch(() => {});
  }

  await AsyncStorage.setItem(THROTTLE_KEY, String(now));
  return 'sent';
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
