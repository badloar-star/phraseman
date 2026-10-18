/**
 * Размер текста и высота плитки галереи «Сохранённых»: текст ВСЕГДА помещается целиком, плитка растёт под него.
 *
 * зачем (владелец 18.10 через координатора, снимки iPhone: «Do you mind if I join you her…», перевод «Вы не против,» обрезан; капсом: «текст ВСЕГДА уменьшается
 * вместе с карточкой и ВСЕГДА помещается целиком — фраза и перевод, на любой позиции ползунка»): кегль считается от ширины плитки пропорционально шагу
 * (k = ширина плитки / ширина плитки в макете cards-v2 на iPhone 390), перенос по словам, БЕЗ многоточия, БЕЗ adjustsFontSizeToFit (запрет, ломается на iOS);
 * высота плитки = максимум из высоты макета (118 / 96 / 62 / 37 × k) и высоты, которую занимает текст. Число строк оцениваем по таблице ширин символов
 * намеренно с запасом (пессимистично), а настоящее число строк сверяет плитка при отрисовке (onTextLayout) и дорисовывает недостающее — см. useGalleryGrids.
 * Модуль чистый: без React Native, без часов — считается и в тестах.
 */
import { GALLERY_STEPS } from './cardsGalleryLayout';

/** Ширина сетки в макете (iPhone 390 минус поля 20 + 20): от неё считается масштаб k. */
export const FIT_REF_GRID_WIDTH = 350;
/** Пределы масштаба: на узком экране текст и плитка уменьшаются не больше чем до 0.78, на широком растут не больше чем до 1.12. */
export const FIT_K_MIN = 0.78;
export const FIT_K_MAX = 1.12;
/** Потолок системного масштаба шрифта в плитках: при крупнее плитка просто растёт ещё, а Text не раздувается сверх него (maxFontSizeMultiplier). */
export const FIT_MAX_FONT_SCALE = 1.3;

/** Числа макета на ширине FIT_REF_GRID_WIDTH (`.zg.s0…s3`, `.wc`), px. Подпись EN, слово, перевод; поля; кнопка звука; запас под точки. */
type FaceDef = Readonly<{
  lg: number; lgLine: number; word: number; wordLine: number; wordTop: number; tr: number; trLine: number; trTop: number;
  padL: number; padR: number; padV: number; /** Ширина всего, что стоит слева от текста в строке (кнопка звука + зазор): только у 1 колонки. */ lead: number;
  /** Запас снизу под точки силы слова (шаги 0 и 1 показывают точки слева снизу). */ foot: number;
  label: boolean; translation: boolean;
}>;

const FACES: readonly FaceDef[] = [
  { lg: 12, lgLine: 14, word: 26, wordLine: 32, wordTop: 6, tr: 15, trLine: 20, trTop: 2, padL: 12, padR: 46, padV: 14, lead: 60, foot: 0, label: true, translation: true },
  { lg: 11, lgLine: 14, word: 20, wordLine: 25, wordTop: 4, tr: 13.5, trLine: 18, trTop: 2, padL: 16, padR: 44, padV: 12, lead: 0, foot: 10, label: true, translation: true },
  { lg: 0, lgLine: 0, word: 15, wordLine: 19, wordTop: 0, tr: 0, trLine: 0, trTop: 0, padL: 12, padR: 12, padV: 8, lead: 0, foot: 0, label: false, translation: false },
  { lg: 0, lgLine: 0, word: 10.5, wordLine: 13, wordTop: 0, tr: 0, trLine: 0, trTop: 0, padL: 7, padR: 7, padV: 4, lead: 0, foot: 0, label: false, translation: false },
];

/** Ширина плитки шага в макете — точка отсчёта масштаба. */
export function fitRefTileWidth(step: number): number {
  const def = GALLERY_STEPS[step]!;
  return (FIT_REF_GRID_WIDTH - def.gap * (def.cols - 1)) / def.cols;
}

/** Масштаб шага от ширины плитки: пропорционально, в пределах [FIT_K_MIN, FIT_K_MAX]. */
export function fitScaleFor(step: number, tileW: number): number {
  const k = tileW / fitRefTileWidth(step);
  return Math.max(FIT_K_MIN, Math.min(FIT_K_MAX, Number.isFinite(k) ? k : 1));
}

export type StepFace = Readonly<{
  step: number; k: number; fontScale: number;
  lgSize: number; lgLine: number; wordSize: number; wordLine: number; wordTop: number; trSize: number; trLine: number; trTop: number;
  padL: number; padR: number; padV: number; foot: number; minH: number; textW: number;
  label: boolean; translation: boolean;
}>;

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Размеры лица плитки шага при её ширине. fontScale — системный масштаб шрифта, уже ограниченный потолком. */
export function stepFace(step: number, tileW: number, fontScale = 1): StepFace {
  const def = GALLERY_STEPS[step]!;
  const f = FACES[step]!;
  const k = fitScaleFor(step, tileW);
  const fs = Math.max(1, Math.min(FIT_MAX_FONT_SCALE, fontScale));
  const padL = f.padL * k;
  const padR = f.padR * k;
  return {
    step, k, fontScale: fs,
    lgSize: r2(f.lg * k), lgLine: Math.ceil(f.lgLine * k * fs),
    wordSize: r2(f.word * k), wordLine: Math.ceil(f.wordLine * k * fs), wordTop: r2(f.wordTop * k),
    trSize: r2(f.tr * k), trLine: Math.ceil(f.trLine * k * fs), trTop: r2(f.trTop * k),
    padL: r2(padL), padR: r2(padR), padV: r2(f.padV * k), foot: r2(f.foot * k),
    minH: Math.round(def.h * k),
    textW: Math.max(24, tileW - padL - padR - f.lead * k),
    label: f.label, translation: f.translation,
  };
}

// ── оценка числа строк ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Доли кегля на символ (полужирный гротеск, Inter-подобный) — завышены: лучше лишняя пустая строка, чем обрезанная.
const NARROW = new Set(['i', 'l', 'j', 't', 'f', 'r', 'I', '.', ',', ':', ';', '!', '|', "'", '’', '`', '(', ')', '[', ']', '-', '/']);
const WIDE = new Set(['m', 'w', 'M', 'W', '@', '%', 'ш', 'щ', 'ы', 'ю', 'ж', 'м']);
const SAFETY = 1.03;

function charEm(ch: string): number {
  if (ch === ' ') return 0.3;
  if (NARROW.has(ch)) return 0.34;
  if (WIDE.has(ch)) return 0.92;
  if (ch >= 'A' && ch <= 'Z') return 0.68;
  if (ch >= 'А' && ch <= 'Я') return 0.72;
  if (ch >= '0' && ch <= '9') return 0.6;
  return 0.57;
}

function wordWidth(word: string, size: number): number {
  let em = 0;
  for (const ch of word) em += charEm(ch);
  return em * size * SAFETY;
}

/** Сколько строк займёт текст при кегле `size` и ширине `maxW`: перенос по словам, слишком длинное слово ломается по символам. */
export function estimateLines(text: string, size: number, maxW: number): number {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  if (!(size > 0) || !(maxW > 0)) return 1;
  const space = charEm(' ') * size * SAFETY;
  let lines = 1;
  let used = 0;
  for (const word of clean.split(' ')) {
    const w = wordWidth(word, size);
    if (w > maxW) {
      // слово шире строки: начинается с новой строки (если на текущей что-то есть) и занимает ceil(w / maxW) строк
      if (used > 0) lines += 1;
      lines += Math.ceil(w / maxW) - 1;
      used = w - (Math.ceil(w / maxW) - 1) * maxW;
      continue;
    }
    if (used === 0) { used = w; continue; }
    if (used + space + w <= maxW) used += space + w;
    else { lines += 1; used = w; }
  }
  return lines;
}

export type TileFit = Readonly<{ h: number; wordLines: number; trLines: number }>;

/**
 * Высота плитки под текст карточки на шаге и сколько строк займут фраза и перевод. extraPx — поправка по настоящему замеру (onTextLayout), если оценка
 * оказалась меньше действительности.
 */
export function tileFit(face: StepFace, front: string, back: string | null | undefined, extraPx = 0): TileFit {
  const wordLines = Math.max(1, estimateLines(front, face.wordSize * face.fontScale, face.textW));
  const trLines = face.translation && back ? estimateLines(back, face.trSize * face.fontScale, face.textW) : 0;
  let content = wordLines * face.wordLine + face.wordTop;
  if (face.label) content += face.lgLine;
  if (trLines > 0) content += face.trTop + trLines * face.trLine;
  const need = content + face.padV * 2 + face.foot + extraPx;
  return { h: Math.ceil(Math.max(face.minH, need)), wordLines, trLines };
}
