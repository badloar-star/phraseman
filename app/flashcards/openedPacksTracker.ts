import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Список packId, для яких юзер уже пройшов церемонію відкриття (Hearthstone-стайл).
 * Якщо id тут — повторно анімація розкриття не показується, відкриваємо одразу «Картки».
 */
const OPENED_PACKS_KEY = 'flashcards_opened_packs_v1';

async function loadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(OPENED_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function isPackCeremoniallyOpened(packId: string): Promise<boolean> {
  if (!packId) return false;
  const ids = await loadIds();
  return ids.includes(packId);
}

export async function markPackCeremoniallyOpened(packId: string): Promise<void> {
  if (!packId) return;
  try {
    const ids = await loadIds();
    if (ids.includes(packId)) return;
    await AsyncStorage.setItem(OPENED_PACKS_KEY, JSON.stringify([...ids, packId]));
  } catch {
    // ignore — не критично, у гіршому разі юзер побачить церемонію ще раз
  }
}

export async function loadOpenedPackIds(): Promise<string[]> {
  return loadIds();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
