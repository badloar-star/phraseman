import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flashcardsHiddenCommunityPacksKey,
  type RuntimeStudyTarget,
} from '../target_storage_keys';

export async function loadHiddenCommunityPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(flashcardsHiddenCommunityPacksKey(studyTarget));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

export async function hideCommunityPackOnDevice(packId: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  const cur = await loadHiddenCommunityPackIds(studyTarget);
  if (cur.includes(packId)) return;
  cur.push(packId);
  await AsyncStorage.setItem(flashcardsHiddenCommunityPacksKey(studyTarget), JSON.stringify(cur));
}
