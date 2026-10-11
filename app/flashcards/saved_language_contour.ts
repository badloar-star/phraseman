import { loadAllSavedFlashcards, peekFlashcardsCache } from '../../hooks/use-flashcards';
import { getStoredPackLanguage, peekStoredPackLanguage } from './pack_language_preferences';
import { filterCardsByPackLanguage, normalizePackLanguage } from './pack_languages';

/** Saved training follows the flag selected in Saved, never a physical storage bucket. */
export async function loadSelectedSavedContour(fallbackLanguage?: unknown) {
  const language = await getStoredPackLanguage() ?? normalizePackLanguage(fallbackLanguage);
  return filterCardsByPackLanguage(await loadAllSavedFlashcards(), language);
}

// зачем (координатор 11.10, «сперва логи»): у гостя с 64 сохранёнными хаб показывал заглушку «Boarding pass», а три
// ранних выхода ниже молчали. Каждый вызов записывает итог; в журнал — только когда итог сменился (хаб зовёт это на
// каждом рендере, лог на каждый кадр утопил бы всё остальное).
export type SavedContourPeekDiagnostics = Readonly<{
  result: 'ok' | 'no_cache' | 'empty_after_filter';
  language: string | null;
  /** Откуда язык: снимок настроек в памяти; язык изучения (как у полной загрузки); 'en' по умолчанию. */
  languageSource: 'stored_peek' | 'study_target' | 'default_en';
  enLen: number | null;
  frLen: number | null;
  filteredLen: number | null;
}>;
let lastPeekDiagnostics: SavedContourPeekDiagnostics | null = null;
let lastLoggedPeekDiagnostics = '';

export function peekSelectedSavedContourDiagnostics(): SavedContourPeekDiagnostics | null {
  return lastPeekDiagnostics;
}

function notePeek(diagnostics: SavedContourPeekDiagnostics): void {
  lastPeekDiagnostics = diagnostics;
  const key = JSON.stringify(diagnostics);
  if (key === lastLoggedPeekDiagnostics) return;
  lastLoggedPeekDiagnostics = key;
  console.log('[HUB-TOPCARD] contour', key);
}

/**
 * A warm frame must use the same language as the later asynchronous load.
 *
 * зачем (Сверка 11.10, [HUB-TOPCARD] language=null, enLen=64 → заглушка «Boarding pass»): язык набора в памяти
 * ещё не прочитан с диска, и быстрая проверка молча отдавала null. Полная загрузка в этот момент берёт
 * `normalizePackLanguage(fallbackLanguage)` — тот же запасной язык берём и здесь, иначе первый кадр расходится
 * с данными. Вызывающие передают тот же аргумент, что в loadSelectedSavedContour (язык изучения).
 */
export function peekSelectedSavedContour(fallbackLanguage?: unknown) {
  const storedLanguage = peekStoredPackLanguage();
  const language = storedLanguage ?? normalizePackLanguage(fallbackLanguage);
  const en = peekFlashcardsCache('en');
  const fr = peekFlashcardsCache('fr');
  const base = {
    language,
    languageSource: storedLanguage
      ? 'stored_peek' as const
      : fallbackLanguage !== undefined && fallbackLanguage !== null ? 'study_target' as const : 'default_en' as const,
    enLen: en ? en.length : null,
    frLen: fr ? fr.length : null,
  };
  if (!en && !fr) {
    notePeek({ ...base, result: 'no_cache', filteredLen: null });
    return null;
  }
  const filtered = filterCardsByPackLanguage([
    ...(en ?? []).map(card => ({ ...card, packLanguage: normalizePackLanguage(card.packLanguage ?? 'en') })),
    ...(fr ?? []).map(card => ({ ...card, packLanguage: normalizePackLanguage(card.packLanguage ?? 'fr') })),
  ], language);
  notePeek({ ...base, result: filtered.length > 0 ? 'ok' : 'empty_after_filter', filteredLen: filtered.length });
  return filtered;
}

/**
 * Первая сохранённая карточка без фильтра по языку — для обложки стопки, когда в выбранном языке пусто.
 * зачем (координатор 11.10): заглушка «Boarding pass» только при действительно пустом кэше; есть карточки — показываем
 * настоящую. null — кэша нет совсем (no_cache).
 */
export function peekFirstSavedCardAnyLanguage() {
  return peekFlashcardsCache('en')?.[0] ?? peekFlashcardsCache('fr')?.[0] ?? null;
}

export default function __RouteShim() { return null; }
