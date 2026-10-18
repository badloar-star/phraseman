/**
 * Чистая модель «стопки» (Карточки 2.0, docs/design/v2-app/cards-v2.html: `.deck` / `.dc`, функции `deck()`, `mySets()`, `catalog()`).
 *
 * зачем (владелец 12.10: макет cards-v2 утверждён целиком, «Мои наборы», каталог и поиск рисуют ОДНУ стопку): карточка r20 со стопкой
 * слоёв сзади, название 21/700, подпись «40 · A2», три чипа первых слов и круглая кнопка «играть». Размеры сняты с CSS макета.
 * Данных «уровень набора A1–C1» и «первые слова набора» в документах пока нет (ждём от Ядра) — читаем их из полей
 * `level` / `previewWords`, если они появятся, а пока блок скрыт: ничего не выдумываем.
 */

export const PACK_DECK_METRICS = {
  /** `.deck { padding-top: 12px }` — место под слои стопки. */
  stackTop: 12,
  /** `.dc { border-radius: 20px; padding: 16px 16px 16px 18px }`. */
  radius: 20,
  padTop: 16,
  padBottom: 16,
  padLeft: 18,
  padRight: 16,
  /** `.dk` слои: высота 30, радиус 16; `.a` сверху 0, ширина 86 %, прозрачность .55; `.b` сверху 6, 93 %, .9. */
  layerHeight: 30,
  layerRadius: 16,
  layerA: { top: 0, widthPct: 86, opacity: 0.55 },
  layerB: { top: 6, widthPct: 93, opacity: 0.9 },
  /** `.dt1` 21/26 700. */
  titleSize: 21,
  titleLine: 26,
  /** `.ds` 14 → 13 (шкала D145), строка 18, отступ 3. */
  subSize: 13,
  subLine: 18,
  subGap: 3,
  /** `.dw`: три колонки, промежуток 6, отступ сверху 14; `.mc` высота 38, радиус 9. */
  chipsTop: 14,
  chipsGap: 6,
  chipHeight: 38,
  chipRadius: 9,
  /** `.pl` — круглая «играть» 44. */
  playSize: 44,
  /** `.av` — аватар автора 22. */
  avatarSize: 22,
  /** `.stack.g14` — промежуток между стопками. */
  stackGap: 14,
} as const;

// зачем (координатор 18.10): «набор без слов — скелетон по факту previewWords»: помним, были ли у последней нарисованной стопки чипы слов; пока не видели ни одной — 143.
let lastDeckHadChips: boolean | null = null;
export function noteDeckHadChips(hadChips: boolean): void {
  lastDeckHadChips = hadChips;
}

/**
 * Высота стопки для скелетона (1 строка названия, подпись, ряд чипов слов): отступ сверху + поля + название + подпись + чипы.
 * зачем (координатор 18.10, «первый кадр = геометрия готового экрана»): у опубликованных наборов previewWords почти всегда есть
 * (считается из карточек набора), и настоящая стопка 143, а не 91 — заглушка 91 давала скачок ~52 dp на каждой строке при подмене.
 */
export function packDeckSkeletonHeight(withChips: boolean = lastDeckHadChips ?? true): number {
  const m = PACK_DECK_METRICS;
  const head = Math.max(m.titleLine + m.subGap + m.subLine, m.playSize);
  return m.stackTop + m.padTop + head + m.padBottom + (withChips ? m.chipsTop + m.chipHeight : 0);
}

/** Не больше трёх чипов — по числу колонок `.dw`. */
export const PACK_DECK_MAX_WORDS = 3;

const LEVEL_RE = /^(A1|A2|B1|B2|C1|C2)$/;

/** Уровень набора A1–C2 из документа; нет поля или мусор — null (чип и «· A2» скрыты). */
export function packDeckLevel(pack: unknown): string | null {
  if (!pack || typeof pack !== 'object') return null;
  const raw = (pack as { level?: unknown }).level;
  if (typeof raw !== 'string') return null;
  const level = raw.trim().toUpperCase();
  return LEVEL_RE.test(level) ? level : null;
}

/** Первые слова набора для чипов; нет поля — пустой список (ряд чипов не рисуется). */
export function packDeckWords(pack: unknown): readonly string[] {
  if (!pack || typeof pack !== 'object') return [];
  const raw = (pack as { previewWords?: unknown }).previewWords;
  if (!Array.isArray(raw)) return [];
  const words: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const word = item.trim();
    if (word) words.push(word);
    if (words.length >= PACK_DECK_MAX_WORDS) break;
  }
  return words;
}

/**
 * Числовая часть подписи: «40 · A2» (макет) или просто «40», пока уровня нет.
 * Слово «карточек» добавляет вызывающий (packCardsWord), когда уровня нет, — число без единицы ничего не говорит.
 */
export function packDeckCountLevel(count: number, level: string | null): { text: string; needsUnit: boolean } {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  return level ? { text: `${safeCount} · ${level}`, needsUnit: false } : { text: String(safeCount), needsUnit: true };
}
