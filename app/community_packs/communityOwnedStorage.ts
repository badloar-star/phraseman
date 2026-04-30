import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'community_owned_pack_ids_v1';

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function loadCommunityOwnedPackIds(): Promise<string[]> {
  try {
    return parseIds(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export async function addCommunityOwnedPackId(id: string): Promise<void> {
  const cur = await loadCommunityOwnedPackIds();
  if (cur.includes(id)) return;
  await AsyncStorage.setItem(KEY, JSON.stringify([...cur, id]));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
