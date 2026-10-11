/**
 * Данные «колоды» набора для Карточек 2.0: уровень A1–C1 и первые слова.
 *
 * зачем (координатор 11.10, макет docs/design/v2-app/cards-v2.html, блок 3 «Мои наборы»): колода показывает
 * «40 · A2» и три чипа первых слов. Один источник для «Мои наборы», каталога, поиска и экрана набора.
 * Стоимость Firebase — ноль: карточки уже приходят в документе каталога (`community_packs.cards`),
 * уровень — поле того же документа; новых чтений нет.
 * Уровень ставит автор. Нет уровня (старые наборы, официальные, ролики) → undefined, и экран «· A2» не рисует —
 * уровень не выдумываем.
 */
import { normalizePackCardTexts, normalizePackLanguage, type PackLanguage } from './pack_languages';

export const PACK_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type PackLevel = (typeof PACK_LEVELS)[number];

export const PACK_PREVIEW_WORDS_COUNT = 3;
/** Длинная фраза в чипе обрезается — колода не растёт по высоте. */
const PREVIEW_WORD_MAX_CHARS = 32;

/** Уровень набора из документа/черновика; мусор и регистр — терпимо, неизвестное → undefined. */
export function normalizePackLevel(raw: unknown): PackLevel | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim().toUpperCase();
  return (PACK_LEVELS as readonly string[]).includes(value) ? (value as PackLevel) : undefined;
}

/**
 * Первые слова набора для чипов колоды: целевой язык карточки, по порядку набора, без пустых и повторов.
 * Принимает сырой массив карточек (документ Firestore, локальный набор) — форма карточки не доверяется.
 */
export function packPreviewWords(
  cards: unknown,
  packLanguage?: PackLanguage | string,
  count: number = PACK_PREVIEW_WORDS_COUNT,
): string[] {
  if (!Array.isArray(cards) || count <= 0) return [];
  const language = normalizePackLanguage(packLanguage);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of cards) {
    if (out.length >= count) break;
    if (!raw || typeof raw !== 'object') continue;
    const text = normalizePackCardTexts(raw as Parameters<typeof normalizePackCardTexts>[0], language).targetText
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text.length > PREVIEW_WORD_MAX_CHARS ? `${text.slice(0, PREVIEW_WORD_MAX_CHARS - 1).trimEnd()}…` : text);
  }
  return out;
}
