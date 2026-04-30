import type { FlashcardMarketPack, FlashcardPackCategory } from '../marketplace';
import type { CardItem } from '../types';
import { marketplaceEsOverlayForId } from './flashcardMarketplaceEsOverlay';

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Фолбек для паків без поля `codeName` у JSON / Firestore (звичайний регістр, не капс). */
export function derivePackCodeName(packId: string): string {
  const known: Record<string, string> = {
    official_negotiator_en: 'Negotiator',
    official_dark_logic_en: 'Dark Logic',
    official_wild_west_en: 'Wild West',
    official_royal_tea_en: 'Royal Tea',
    official_peaky_blinders_en: 'Peaky Blinders',
  };
  if (known[packId]) return known[packId];
  const stripped = packId
    .replace(/^official_/i, '')
    .replace(/_en$/i, '')
    .replace(/_/g, ' ')
    .trim();
  return stripped.length > 0 ? titleCaseWords(stripped) : packId;
}

/**
 * Рядок картки в `official_*.json` (маркетплейс / Victoria).
 *
 * **Профіль `marketplace_phrase_v1`:** у кожної картки обов’язкові
 * `en`, `ru`, `uk`, `literalRu`, `literalUk`, `explanationRu`, `explanationUk`, `transcription`;
 * `example*`, `usageNote*`, `register`, `level` — лише якщо свідомо додаєте колонку (див. `docs/pipelines/victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md`).
 */
export type VictoriaRow = {
  id: string;
  en: string;
  /** Явна абревіатура (набір EN-шифр); якщо є разом з expansionEn — без парсингу рядка en. */
  abbrev?: string;
  /** Англ. розшифровка лише фразою (без абревіатури). */
  expansionEn?: string;
  transcription?: string;
  ru: string;
  uk: string;
  /** ES (інтерфейс `es`); можна задати тут або в `flashcardMarketplaceEsOverlay`. */
  es?: string;
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
  register?: string;
  level?: string;
  usageNoteRu?: string;
  usageNoteUk?: string;
  usageNoteEs?: string;
};

export type VictoriaPackFile = {
  pack: {
    id: string;
    /** Коротке кодове ім’я на плитці хаба (звичайний регістр). Якщо немає — `derivePackCodeName(id)`. */
    codeName?: string;
    titleRu: string;
    titleUk: string;
    titleEs?: string;
    descriptionRu: string;
    descriptionUk: string;
    descriptionEs?: string;
    category: string;
    cardCount: number;
    priceShards: number;
    authorName: string;
    isOfficial: boolean;
    /** Сортування в каталозі; якщо немає — фолбек (див. `victoriaMetaFromPackJson`) */
    updatedAt?: string;
  };
  cards: VictoriaRow[];
};

export function victoriaMetaFromPackJson(p: VictoriaPackFile['pack']): FlashcardMarketPack {
  const code = p.codeName?.trim();
  return {
    id: p.id,
    codeName: code && code.length > 0 ? code : derivePackCodeName(p.id),
    titleRu: p.titleRu,
    titleUk: p.titleUk,
    titleEs: String(p.titleEs ?? ''),
    descriptionRu: p.descriptionRu,
    descriptionUk: p.descriptionUk,
    descriptionEs: String(p.descriptionEs ?? ''),
    category: (p.category as FlashcardPackCategory) ?? 'daily',
    cardCount: p.cardCount,
    priceShards: p.priceShards,
    ratingAvg: 0,
    ratingCount: 0,
    salesCount: 0,
    authorName: p.authorName,
    isOfficial: p.isOfficial,
    updatedAt: p.updatedAt?.trim() || '2026-04-25T00:00:00.000Z',
  };
}

/** `sourceId` = `DEV:${packId}` — общий с фильтрами / диплинками. */
export function mapVictoriaRowsToCardItems(packId: string, cards: VictoriaRow[]): CardItem[] {
  return cards.map((c) => {
    const ov = marketplaceEsOverlayForId(c.id);
    return {
      id: c.id,
      en: c.en,
      ru: c.ru,
      uk: c.uk,
      es: c.es ?? ov?.es,
      transcription: c.transcription,
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${packId}`,
      literalRu: c.literalRu,
      literalUk: c.literalUk,
      literalEs: c.literalEs ?? ov?.literalEs,
      explanationRu: c.explanationRu,
      explanationUk: c.explanationUk,
      explanationEs: c.explanationEs ?? ov?.explanationEs,
      exampleEn: c.exampleEn,
      exampleRu: c.exampleRu,
      exampleUk: c.exampleUk,
      exampleEs: c.exampleEs ?? ov?.exampleEs,
      usageNoteRu: c.usageNoteRu,
      usageNoteUk: c.usageNoteUk,
      usageNoteEs: c.usageNoteEs ?? ov?.usageNoteEs,
      register: c.register,
      level: c.level,
      abbrevEn: c.abbrev,
      expansionEn: c.expansionEn,
    };
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
