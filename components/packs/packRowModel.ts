/**
 * Чистая модель строки набора: размеры, фиксированная высота, подсветка совпадения поиска.
 *
 * зачем (владелец, OWNER_REQUESTS_LEDGER строки 9 и 29): строки наборов во всех местах — одной фиксированной высоты
 * под максимум ДВЕ строки названия. Высота считается от межстрочного × 2 с учётом системного масштаба шрифта
 * (`lh` из useLineScale), а не пикселями, подогнанными под один размер шрифта: первый кадр = итоговая геометрия,
 * короткое и длинное название рядом дают одинаковые строки, без прыжков высоты.
 *
 * Размеры сняты с макетов:
 *   • 'plate'  — плашка набора сообщества, docs/design/v2-app/community-redesign.html #c1 (`.pl.p1`):
 *                поля 12/14/12/12, промежуток 14, плитка-счётчик 68, скругление 22, «+» 44;
 *   • 'row'    — строка-карточка kit `.row` (cards-section.html «Мои наборы», настройка тренировки):
 *                поля 10/16/10/19, промежуток 16, плитка 41, скругление 14.
 * Шрифты — шкала D145 (16 основной, 13 подписи): макет #c1 даёт 18/14/13 и 11 — приведены к 16/13.
 */

export type PackRowVariant = 'plate' | 'row';

export type LineScale = (lineHeight: number, maxMultiplier?: number) => number;

export const PACK_ROW_METRICS = {
  plate: {
    padTop: 12,
    padBottom: 12,
    padLeft: 12,
    padRight: 14,
    gap: 14,
    radius: 22,
    titleSize: 16,
    titleLine: 22,
    metaGap: 6,
    metaSize: 13,
    metaLine: 18,
    tileWidth: 68,
    tileMinHeight: 68,
    tileRadius: 18,
    addSize: 44,
  },
  row: {
    padTop: 10,
    padBottom: 10,
    padLeft: 19,
    padRight: 16,
    gap: 16,
    radius: 14,
    titleSize: 16,
    titleLine: 22,
    metaGap: 0,
    metaSize: 16,
    metaLine: 21,
    tileWidth: 41,
    tileMinHeight: 41,
    tileRadius: 10,
    addSize: 0,
  },
} as const;

/** Максимум строк названия — две; многоточие только если не влезает. */
export const PACK_ROW_TITLE_LINES = 2;

/**
 * Бейдж «Топ» стоит ВНУТРИ строки названия: его высота — 17 × масштаб, всегда меньше межстрочного названия 22 × масштаб,
 * поэтому строка названия не раздувается (ревью 11.10, п.7). Текст бейджа 13 с межстрочным 17 помещается при любом масштабе.
 */
export const PACK_ROW_BADGE_LINE = 17;

/**
 * Плитка-счётчик (`.ct`): тексты растут не больше этого множителя, а ширина плитки — тем же множителем.
 * зачем (ревью 11.10, п.6): «карточек» 13 в ширине 60 рвалось при шрифте 1.1–1.3; теперь слово и число
 * масштабируются вместе с плиткой и никогда не переносятся посередине. Это предел роста, не ужатие шрифта.
 */
export const COUNT_TILE_MAX_FONT_SCALE = 1.3;

/** Ширина плитки-счётчика при системном масштабе шрифта: 68 макета × min(масштаб, предел), не меньше 68. */
export function countTileWidth(fontScale: number): number {
  const base = PACK_ROW_METRICS.plate.tileWidth;
  const scale = Number.isFinite(fontScale) ? Math.min(Math.max(fontScale, 1), COUNT_TILE_MAX_FONT_SCALE) : 1;
  return Math.ceil(base * scale);
}

/**
 * Оценка ширины подписи в плитке (для расчёта-проверки): Inter 600 ≈ 0.6 em на букву — с запасом против реальных 0.53–0.57.
 * Самые длинные подписи — 8 букв («карточек», «карточки», «tarjetas»).
 */
export function estimatedTileWordWidth(word: string, fontScale: number): number {
  const scale = Math.min(Math.max(fontScale, 1), COUNT_TILE_MAX_FONT_SCALE);
  return word.length * 13 * 0.6 * scale;
}

/**
 * Фиксированная высота строки: поля + max(2 строки названия + зазор + строка подписи, минимальная плитка).
 * `lh` масштабирует межстрочный под системный шрифт (при 1.0 — те же числа, что в макете).
 */
export function packRowHeight(variant: PackRowVariant, lh: LineScale): number {
  const m = PACK_ROW_METRICS[variant];
  const text = lh(m.titleLine) * PACK_ROW_TITLE_LINES + m.metaGap + lh(m.metaLine);
  const inner = Math.max(text, m.tileMinHeight);
  return Math.ceil(m.padTop + inner + m.padBottom);
}

export type TitleHighlight = Readonly<{ before: string; match: string; after: string }>;

/**
 * Первое совпадение поиска в названии без учёта регистра (`.hl` макета #c1, экран «Поиск»).
 * Нет запроса или совпадения — всё название в `before`.
 */
export function splitTitleHighlight(title: string, query: string | null | undefined): TitleHighlight {
  const q = String(query ?? '').trim();
  if (!q) return { before: title, match: '', after: '' };
  const lowered = title.toLocaleLowerCase();
  // зачем: у некоторых букв (турецкая İ) нижний регистр длиннее — индексы разъехались бы; тогда без подсветки.
  if (lowered.length !== title.length) return { before: title, match: '', after: '' };
  const at = lowered.indexOf(q.toLocaleLowerCase());
  if (at < 0) return { before: title, match: '', after: '' };
  return { before: title.slice(0, at), match: title.slice(at, at + q.length), after: title.slice(at + q.length) };
}
