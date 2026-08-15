/**
 * cards-2.0 (E11): персист режима просмотра коллекции «Список / Стопка» (§3.2).
 * Отдельный новый ключ `fc_collection_view_v1` — существующие ключи не трогаем
 * (принцип 4 мастер-плана). Чтение толерантное: любой мусор → 'list'.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FC_COLLECTION_VIEW_KEY = 'fc_collection_view_v1';

export type FcCollectionViewMode = 'list' | 'deck';

/** Чистая функция парсинга (юнит-тестируема). */
export function parseCollectionViewMode(raw: string | null | undefined): FcCollectionViewMode {
  return raw === 'deck' ? 'deck' : 'list';
}

let viewModeMemory: FcCollectionViewMode | null = null;

export async function getCollectionViewMode(): Promise<FcCollectionViewMode> {
  if (viewModeMemory) return viewModeMemory;
  try {
    const raw = await AsyncStorage.getItem(FC_COLLECTION_VIEW_KEY);
    viewModeMemory = parseCollectionViewMode(raw);
  } catch {
    viewModeMemory = 'list';
  }
  return viewModeMemory;
}

export function setCollectionViewMode(mode: FcCollectionViewMode): void {
  viewModeMemory = mode;
  AsyncStorage.setItem(FC_COLLECTION_VIEW_KEY, mode).catch(() => {});
}

/** Только для юнит-тестов. */
export function __resetCollectionViewPrefsForTests(): void {
  viewModeMemory = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
