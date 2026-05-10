import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hidden_community_pack_ids_v1';

export async function loadHiddenCommunityPackIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

export async function hideCommunityPackOnDevice(packId: string): Promise<void> {
  const cur = await loadHiddenCommunityPackIds();
  if (cur.includes(packId)) return;
  cur.push(packId);
  await AsyncStorage.setItem(KEY, JSON.stringify(cur));
}
