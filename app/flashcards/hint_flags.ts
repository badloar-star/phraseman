// Одноразовые нудж-подсказки раздела карточек (Cards 2.0, ключ fc_hint_flags_v1).
// Новый ключ — существующие ключи AsyncStorage не трогаем (принцип 4 мастер-плана).
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FC_HINT_FLAGS_KEY = 'fc_hint_flags_v1';

export type FcHintFlag = 'chevron_nudge';

export function parseHintFlags(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function getHintFlag(flag: FcHintFlag): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FC_HINT_FLAGS_KEY);
    return parseHintFlags(raw)[flag] === true;
  } catch {
    // При ошибке чтения считаем «показано» — лучше не показать нудж, чем зациклить его
    return true;
  }
}

export async function setHintFlag(flag: FcHintFlag): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FC_HINT_FLAGS_KEY);
    const flags = parseHintFlags(raw);
    if (flags[flag] === true) return;
    flags[flag] = true;
    await AsyncStorage.setItem(FC_HINT_FLAGS_KEY, JSON.stringify(flags));
  } catch {
    // ignore
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
