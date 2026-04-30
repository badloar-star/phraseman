// Flashcards domain model shared across screen, constants, selectors and storage.
export type CategoryId =
  | 'emotions'
  | 'fillers'
  | 'reactions'
  | 'traps'
  | 'phrasal'
  | 'situations'
  | 'connectors'
  | 'saved'
  | 'custom';

export interface Category {
  id: CategoryId;
  icon: string;
  labelRU: string;
  labelUK: string;
  labelES: string;
  fullLabelRU: string;
  fullLabelUK: string;
  fullLabelES: string;
}

export interface CardItem {
  id: string;
  en: string;
  ru: string;
  uk: string;
  /** Traducción al español (interfaz `es`). */
  es?: string;
  /** User-authored note (custom cards) — e.g. mnemonics, context */
  description?: string;
  transcription?: string;
  categoryId: CategoryId;
  isSystem: boolean;
  source?: string;
  sourceId?: string;
  // Rich details — present on marketplace pack cards only
  literalRu?: string;
  literalUk?: string;
  literalEs?: string;
  explanationRu?: string;
  explanationUk?: string;
  explanationEs?: string;
  exampleEn?: string;
  exampleRu?: string;
  exampleUk?: string;
  exampleEs?: string;
  usageNoteRu?: string;
  usageNoteUk?: string;
  usageNoteEs?: string;
  register?: string;
  level?: string;
  /** Лише набір EN-шифр: абревіатура окремо від EN-розшифровки (3 сторони картки). */
  abbrevEn?: string;
  expansionEn?: string;
}

/** Interfaz / reverso de tarjeta: traducción según idioma UI. */
export type FlashcardContentLang = 'ru' | 'uk' | 'es';

export function resolveFlashcardBackText(item: CardItem, lang: FlashcardContentLang): string {
  const pick = (s: string | undefined) => {
    const t = s?.trim();
    return t ? t : undefined;
  };
  if (lang === 'uk') return pick(item.uk) ?? pick(item.ru) ?? '';
  if (lang === 'es') return pick(item.es) ?? pick(item.ru) ?? pick(item.uk) ?? '';
  return pick(item.ru) ?? pick(item.uk) ?? '';
}

/** Returns true if the card has expandable details (separate panel, same as paid packs). */
export function cardHasDetails(card: CardItem): boolean {
  return !!(
    card.description?.trim() ||
    card.explanationRu ||
    card.explanationUk ||
    card.explanationEs ||
    card.usageNoteRu ||
    card.usageNoteUk ||
    card.usageNoteEs ||
    card.literalRu ||
    card.literalUk ||
    card.literalEs
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
