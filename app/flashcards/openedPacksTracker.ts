import AsyncStorage from '@react-native-async-storage/async-storage';
import { flashcardsOpenedPacksKey, type RuntimeStudyTarget } from '../target_storage_keys';

/**
 * Список packId, для яких юзер уже пройшов церемонію відкриття (Hearthstone-стайл).
 * Якщо id тут — повторно анімація розкриття не показується, відкриваємо одразу «Картки».
 */
async function loadIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(flashcardsOpenedPacksKey(studyTarget));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function isPackCeremoniallyOpened(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  if (!packId) return false;
  const ids = await loadIds(studyTarget);
  return ids.includes(packId);
}

export async function markPackCeremoniallyOpened(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (!packId) return;
  try {
    const ids = await loadIds(studyTarget);
    if (ids.includes(packId)) return;
    await AsyncStorage.setItem(flashcardsOpenedPacksKey(studyTarget), JSON.stringify([...ids, packId]));
  } catch {
    // ignore — не критично, у гіршому разі юзер побачить церемонію ще раз
  }
}

export async function loadOpenedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  return loadIds(studyTarget);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
