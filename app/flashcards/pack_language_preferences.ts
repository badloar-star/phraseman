import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerHubCacheProbe } from '../hub_lifecycle_probe';
import { peekGlobalStudyTargetSafe, setSectionLanguageOverride, subscribeSectionLanguageReset } from '../section_language';
import {
  defaultPackLanguageForStudyTarget,
  isStudyPackLanguage,
  type PackLanguage,
  type StudyPackLanguage,
} from './pack_languages';

/** Старый ключ на диске: больше НЕ читается и не пишется (владелец 15.10 — выбор в разделе локальный, глобального ключа нет). */
export const PACK_LANGUAGE_PREFERENCE_KEY = 'fc_pack_language_v1';
const listeners = new Set<(language: StudyPackLanguage) => void>();
let rememberedLanguage: StudyPackLanguage | null = null;
// зачем (владелец 15.10, R57 «выбор языка пишет глобальный ключ»): выбор языка наборов — только на время захода в «Карточки»; ушёл из раздела — снова язык из Настроек.
subscribeSectionLanguageReset((section) => {
  if (section !== 'cards' || rememberedLanguage === null) return;
  rememberedLanguage = null;
  const rawGlobal = peekGlobalStudyTargetSafe();
  const globalDefault = defaultPackLanguageForStudyTarget(rawGlobal);
  for (const listener of listeners) listener(globalDefault);
  if (rawGlobal === null) {
    // зачем (Ревизор 2d06352db 🟡): снимок языка из Настроек пуст — выше подставился 'en' молча. Пишем причину и уточняем язык из хранилища (асинхронно), если он другой.
    console.log(`[SECTION-LANG] ${JSON.stringify({ section: 'cards', event: 'reset', reason: 'snapshot_null', to: globalDefault })}`); // guard-ok: пустой снимок
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem('study_target_v1');
        const refined = defaultPackLanguageForStudyTarget(stored);
        console.log(`[SECTION-LANG] ${JSON.stringify({ section: 'cards', event: 'reset', reason: 'snapshot_null_storage', stored, to: refined })}`); // guard-ok: язык из хранилища
        if (refined !== globalDefault && rememberedLanguage === null) for (const listener of listeners) listener(refined);
      } catch (error: unknown) {
        console.warn(`[SECTION-LANG] snapshot_null storage read FAILED reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
      }
    })();
  }
});
export function peekStoredPackLanguage(): StudyPackLanguage | null { return rememberedLanguage; }
export function subscribePackLanguage(listener: (language: StudyPackLanguage) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function getStoredPackLanguage(): Promise<StudyPackLanguage | null> {
  // зачем (владелец 15.10): язык хранится только в памяти раздела; нет локального выбора — вызывающий берёт язык из Настроек.
  return rememberedLanguage;
}

export async function setStoredPackLanguage(language: PackLanguage): Promise<void> {
  if (!isStudyPackLanguage(language)) {
    console.warn(`[PACK-LANG] preference:skip value="${String(language)}" — фильтр принимает только изучаемые языки`);
    return;
  }
  // зачем (владелец 15.10): запись на диск убрана — выбор локален для раздела и сбрасывается при выходе из него.
  setSectionLanguageOverride('cards', language);
  rememberedLanguage = language;
  for (const listener of listeners) listener(language);
}

/* expo-router route shim: keeps the storage helper out of the route tree. */
export default function __RouteShim() { return null; }

// зачем (координатор 12.10, утечка памяти в хабе Карточек; сперва логи): размеры кэшей этого модуля попадают в [HUB-LIFECYCLE] на mount/unmount хаба; вне dev — пусто.
registerHubCacheProbe('pack_language.listeners', () => listeners.size);
