import { loadAllSavedFlashcards, peekFlashcardsCache } from '../../hooks/use-flashcards';
import { getStoredPackLanguage, peekStoredPackLanguage } from './pack_language_preferences';
import { filterCardsByPackLanguage, normalizePackLanguage } from './pack_languages';

/** Saved training follows the flag selected in Saved, never a physical storage bucket. */
export async function loadSelectedSavedContour(fallbackLanguage?: unknown) {
  const language = await getStoredPackLanguage() ?? normalizePackLanguage(fallbackLanguage);
  return filterCardsByPackLanguage(await loadAllSavedFlashcards(), language);
}

/** A warm frame must use the same language as the later asynchronous load. */
export function peekSelectedSavedContour() {
  const language = peekStoredPackLanguage();
  if (!language) return null;
  const en = peekFlashcardsCache('en');
  const fr = peekFlashcardsCache('fr');
  if (!en && !fr) return null;
  return filterCardsByPackLanguage([
    ...(en ?? []).map(card => ({ ...card, packLanguage: normalizePackLanguage(card.packLanguage ?? 'en') })),
    ...(fr ?? []).map(card => ({ ...card, packLanguage: normalizePackLanguage(card.packLanguage ?? 'fr') })),
  ], language);
}

export default function __RouteShim() { return null; }
