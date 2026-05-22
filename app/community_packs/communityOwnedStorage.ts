import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flashcardsCommunityOwnedPacksKey,
  type RuntimeStudyTarget,
} from '../target_storage_keys';

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function loadCommunityOwnedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  try {
    return parseIds(await AsyncStorage.getItem(flashcardsCommunityOwnedPacksKey(studyTarget)));
  } catch {
    return [];
  }
}

export async function addCommunityOwnedPackId(id: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  const cur = await loadCommunityOwnedPackIds(studyTarget);
  if (cur.includes(id)) return;
  await AsyncStorage.setItem(flashcardsCommunityOwnedPacksKey(studyTarget), JSON.stringify([...cur, id]));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
