import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY_PREFIX = 'compass_auto_open_day_v1';

async function accountKey(stableId: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, stableId.trim());
  return `${KEY_PREFIX}:${digest.slice(0, 24)}`;
}

export async function shouldAutoOpenCompass(input: {
  stableId: string;
  studyTarget: string;
  localDayKey: string;
}): Promise<boolean> {
  if (!input.stableId.trim() || !input.studyTarget.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDayKey)) return false;
  try {
    return (await AsyncStorage.getItem(`${await accountKey(input.stableId)}:${input.studyTarget.trim()}`)) !== input.localDayKey;
  } catch {
    return false;
  }
}

/** Mark only after the arbiter actually made Compass visible. */
export async function markCompassAutoOpened(input: {
  stableId: string;
  studyTarget: string;
  localDayKey: string;
}): Promise<boolean> {
  if (!input.stableId.trim() || !input.studyTarget.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDayKey)) return false;
  try {
    await AsyncStorage.setItem(`${await accountKey(input.stableId)}:${input.studyTarget.trim()}`, input.localDayKey);
    return true;
  } catch {
    return false;
  }
}

export default function __RouteShim() { return null; }
