import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isStudyPackLanguage,
  type PackLanguage,
  type StudyPackLanguage,
} from './pack_languages';

export const PACK_LANGUAGE_PREFERENCE_KEY = 'fc_pack_language_v1';
const listeners = new Set<(language: StudyPackLanguage) => void>();
let rememberedLanguage: StudyPackLanguage | null = null;
export function peekStoredPackLanguage(): StudyPackLanguage | null { return rememberedLanguage; }
export function subscribePackLanguage(listener: (language: StudyPackLanguage) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function getStoredPackLanguage(): Promise<StudyPackLanguage | null> {
  const raw = await AsyncStorage.getItem(PACK_LANGUAGE_PREFERENCE_KEY).catch((error: unknown) => {
    console.warn('[PACK-LANG] preference:read_failed', String((error as Error)?.message ?? error));
    return null;
  });
  // зачем (D127): выбранный язык — это ФИЛЬТР по изучаемому языку. «Без языка»
  // фильтром быть не может: такие наборы видны при любом выбранном языке.
  rememberedLanguage = isStudyPackLanguage(raw) ? raw : null;
  return rememberedLanguage;
}

export async function setStoredPackLanguage(language: PackLanguage): Promise<void> {
  if (!isStudyPackLanguage(language)) {
    console.warn(`[PACK-LANG] preference:skip value="${String(language)}" — фильтр принимает только изучаемые языки`);
    return;
  }
  await AsyncStorage.setItem(PACK_LANGUAGE_PREFERENCE_KEY, language);
  rememberedLanguage = language;
  for (const listener of listeners) listener(language);
}

/* expo-router route shim: keeps the storage helper out of the route tree. */
export default function __RouteShim() { return null; }
