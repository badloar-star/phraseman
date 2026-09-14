import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isPackLanguage,
  type PackLanguage,
} from './pack_languages';

export const PACK_LANGUAGE_PREFERENCE_KEY = 'fc_pack_language_v1';
const listeners = new Set<(language: PackLanguage) => void>();
let rememberedLanguage: PackLanguage | null = null;
export function peekStoredPackLanguage(): PackLanguage | null { return rememberedLanguage; }
export function subscribePackLanguage(listener: (language: PackLanguage) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function getStoredPackLanguage(): Promise<PackLanguage | null> {
  const raw = await AsyncStorage.getItem(PACK_LANGUAGE_PREFERENCE_KEY).catch(() => null);
  rememberedLanguage = isPackLanguage(raw) ? raw : null;
  return rememberedLanguage;
}

export async function setStoredPackLanguage(language: PackLanguage): Promise<void> {
  await AsyncStorage.setItem(PACK_LANGUAGE_PREFERENCE_KEY, language);
  rememberedLanguage = language;
  for (const listener of listeners) listener(language);
}

/* expo-router route shim: keeps the storage helper out of the route tree. */
export default function __RouteShim() { return null; }
