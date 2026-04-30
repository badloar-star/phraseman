import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { collectMetadata } from './error_report';

const THROTTLE_KEY = 'last_user_suggestion_ts';
const THROTTLE_MS = 45_000;

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
};

function buildSuggestionCopyText(text: string, meta: Awaited<ReturnType<typeof collectMetadata>>): string {
  const lines = [
    '=== PHRASEMAN USER SUGGESTION ===',
    `user:      ${meta.userName} #${String(meta.uid).slice(-8)} | Lv${meta.userLevel} | ${meta.userXP} XP | streak ${meta.userStreak} | premium: ${meta.userPremium} | days: ${meta.userDaysInApp}`,
    `device:    ${meta.deviceOS} ${meta.deviceOSVersion} | ${meta.deviceModel} | ${meta.screenWidth}x${meta.screenHeight} @${meta.pixelRatio}x | app v${meta.appVersion}`,
    `lang:      ${meta.userLanguage}`,
    'text:',
    ...String(text).split('\n').map((l) => `  ${l}`),
    '===========================',
  ];
  return lines.join('\n');
}

export type UserSuggestionResult = 'sent' | 'throttled' | 'empty' | 'offline';

export const submitUserSuggestion = async (
  rawText: string,
  userName: string,
  lang: 'ru' | 'uk' | 'es' = 'ru',
): Promise<UserSuggestionResult> => {
  const text = String(rawText ?? '').trim();
  if (!text) return 'empty';

  const now = Date.now();
  const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY);
  if (lastRaw && now - parseInt(lastRaw, 10) < THROTTLE_MS) return 'throttled';

  const meta = await collectMetadata(userName, lang);
  const db = getFirestore();
  if (!db) {
    return 'offline';
  }

  const copyText = buildSuggestionCopyText(text, meta);

  await db
    .collection('user_suggestions')
    .add({
      text,
      screen: 'settings_suggestion',
      uid: meta.uid,
      userName: meta.userName,
      userLevel: meta.userLevel,
      userXP: meta.userXP,
      userStreak: meta.userStreak,
      userPremium: meta.userPremium,
      userLanguage: meta.userLanguage,
      userDaysInApp: meta.userDaysInApp,
      deviceModel: meta.deviceModel,
      deviceOS: meta.deviceOS,
      deviceOSVersion: meta.deviceOSVersion,
      screenWidth: meta.screenWidth,
      screenHeight: meta.screenHeight,
      pixelRatio: meta.pixelRatio,
      appVersion: meta.appVersion,
      copyText,
      status: 'new',
      createdAt: new Date().toISOString(),
    })
    .catch(() => {});

  await AsyncStorage.setItem(THROTTLE_KEY, String(now));
  return 'sent';
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
