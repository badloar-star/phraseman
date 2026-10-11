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
  result: 'ok' | 'no_language' | 'no_cache' | 'empty_after_filter';
  language: string | null;
  /** Откуда язык: снимок настроек в памяти или его ещё нет (диск не дочитан). */
  languageSource: 'stored_peek' | 'none';
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

/** A warm frame must use the same language as the later asynchronous load. */
export function peekSelectedSavedContour() {
  const language = peekStoredPackLanguage();
  const en = peekFlashcardsCache('en');
  const fr = peekFlashcardsCache('fr');
  const base = {
    language: language ?? null,
    languageSource: language ? 'stored_peek' as const : 'none' as const,
    enLen: en ? en.length : null,
    frLen: fr ? fr.length : null,
  };
  if (!language) {
    notePeek({ ...base, result: 'no_language', filteredLen: null });
    return null;
  }
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

export default function __RouteShim() { return null; }
