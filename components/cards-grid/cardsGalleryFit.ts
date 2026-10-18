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
  { lg: 0, lgLine: 0, word: 15, wordLine: 19, wordTop: 0, tr: 10, trLine: 13, trTop: 2, padL: 8, padR: 8, padV: 6, lead: 0, foot: 0, label: false, translation: true },
  { lg: 0, lgLine: 0, word: 10.5, wordLine: 13, wordTop: 0, tr: 7, trLine: 9, trTop: 1, padL: 5, padR: 5, padV: 3, lead: 0, foot: 0, label: false, translation: true },
];

/**
 * Наименьшая высота плитки шага на ширине макета, px. зачем (владелец 18.10 через координатора: «карточка всегда горизонтальная, ширина больше высоты»; 1 колонка ≈ 390×105
 * по CARDS_LOCKED): 105 / 96 / 62 / 37 — все плитки шире, чем выше.
 */
const MIN_H = [105, 96, 62, 37] as const;
/**
 * Потолок высоты плитки как доля её ширины: 0.62 / 0.7 / 0.72 / 0.72 (ширина больше высоты в 1,6 / 1,4 / 1,4 / 1,4 раза) — плитка не становится квадратной и вертикальной. Фраза не влезла — сперва растём до потолка,
 * потом уменьшаем кегль (не меньше пола ниже), и только если даже на полу не влезает — плитка растёт выше потолка (текст целиком важнее пропорции).
 */
export const FIT_CAP_RATIO = [0.62, 0.7, 0.72, 0.72] as const;
/**
 * Пол кегля фразы и перевода, px. зачем (владелец 18.10: «не влезает — уменьши кегль», карточка остаётся горизонтальной): на мелких шагах длинная фраза в плитке шириной 50–110 px читается
 * только очень мелкой — это выбор человека, поставившего мелкий шаг; пол нужен лишь затем, чтобы кегль не уходил в ноль.
 */
const WORD_FLOOR = [6, 2, 1, 0.5] as const;
const TR_FLOOR = [6, 2, 1, 0.5] as const;

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
    minH: Math.round(MIN_H[step]! * k),
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

/** Как лёг текст одной карточки на шаге: кегль и межстрочный (после уменьшения), число строк, высота плитки под текст. */
export type CardFit = Readonly<{ h: number; scale: number; wordSize: number; wordLine: number; trSize: number; trLine: number; wordLines: number; trLines: number }>;

/**
 * Текст карточки при масштабе кегля `scale` (1 — как в макете): высота плитки под него и число строк. extraPx — поправка по настоящему замеру (onTextLayout), если оценка
 * оказалась меньше действительности. Кегль не ниже пола шага.
 */
export function fitAtScale(face: StepFace, front: string, back: string | null | undefined, scale: number, extraPx = 0): CardFit {
  const wordSize = r2(Math.max(WORD_FLOOR[face.step]!, face.wordSize * scale));
  const wordLine = Math.ceil(face.wordLine * (wordSize / face.wordSize));
  const showTr = face.translation && !!back;
  const trSize = showTr ? r2(Math.max(TR_FLOOR[face.step]!, face.trSize * scale)) : face.trSize;
  const trLine = showTr ? Math.ceil(face.trLine * (trSize / face.trSize)) : face.trLine;
  const wordLines = Math.max(1, estimateLines(front, wordSize * face.fontScale, face.textW));
  const trLines = showTr ? estimateLines(back as string, trSize * face.fontScale, face.textW) : 0;
  let content = wordLines * wordLine + face.wordTop;
  if (face.label) content += face.lgLine;
  if (trLines > 0) content += face.trTop + trLines * trLine;
  const need = content + face.padV * 2 + face.foot + extraPx;
  return { h: Math.ceil(Math.max(face.minH, need)), scale, wordSize, wordLine, trSize, trLine, wordLines, trLines };
}

/**
 * Высота плитки под текст при масштабе 1 и число строк — прежний вход (тесты, оценка роста ряда). Для раскладки с потолком по пропорции — fitWithin.
 */
export function tileFit(face: StepFace, front: string, back: string | null | undefined, extraPx = 0): TileFit {
  const f = fitAtScale(face, front, back, 1, extraPx);
  return { h: f.h, wordLines: f.wordLines, trLines: f.trLines };
}

/**
 * Самый крупный кегль (масштаб ≤ 1), при котором текст помещается в высоту `maxH`. Не помещается даже на полу кегля — возвращаем текст на полу: плитка вырастет выше `maxH`.
 */
export function fitWithin(face: StepFace, front: string, back: string | null | undefined, maxH: number, extraPx = 0): CardFit {
  const full = fitAtScale(face, front, back, 1, extraPx);
  if (full.h <= maxH) return full;
  // оба кегля (фразы и перевода) уменьшаются, пока каждый не упрётся в свой пол: нижняя граница масштаба — меньший из двух
  const wordFloorScale = WORD_FLOOR[face.step]! / face.wordSize;
  const floorScale = face.translation && back ? Math.min(wordFloorScale, TR_FLOOR[face.step]! / face.trSize) : wordFloorScale;
  const low = fitAtScale(face, front, back, Math.min(1, floorScale), extraPx);
  if (low.h > maxH) return low;
  let lo = Math.min(1, floorScale);
  let hi = 1;
  let best = low;
  for (let i = 0; i < 7; i += 1) {
    const mid = (lo + hi) / 2;
    const f = fitAtScale(face, front, back, mid, extraPx);
    if (f.h <= maxH) { best = f; lo = mid; } else hi = mid;
  }
  return best;
}
