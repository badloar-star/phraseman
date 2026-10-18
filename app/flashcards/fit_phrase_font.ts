// fit_phrase_font.ts — размер шрифта фразы на карточке по длине текста (владелец 18.10, координатор 10:10).
//
// зачем: у карточек из видео длинная фраза не помещалась на карточку (вылезала или пряталась в прокрутку). Владелец: «если текст длиннее — размер текста уменьшается соответственно,
// чтобы весь текст поместился». Считаем расчётом по длине и ширине (без adjustsFontSizeToFit — на iOS это класс бага, и без повторной раскладки: первый кадр сразу с итоговым размером):
// перенос по словам, шаг вниз по 1 до минимума (14), без обрезки «…». Короткий текст получает базовый размер без изменений — вид обычных карточек не меняется.
const AVG_CHAR_WIDTH_EM = 0.56; // средняя ширина знака жирного начертания в em (с запасом на широкие буквы)
const LINE_HEIGHT_RATIO = 1.3;

/** Сколько строк займёт текст при переносе по словам (слово длиннее строки делится по знакам). */
export function estimateWrappedLines(text: string, fontSize: number, widthPx: number): number {
  const charsPerLine = Math.max(1, Math.floor(widthPx / (fontSize * AVG_CHAR_WIDTH_EM)));
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    let current = 0;
    let used = 1;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const len = word.length;
      if (len > charsPerLine) {
        // длинное слово: начинаем с новой строки и делим по знакам
        if (current > 0) used += 1;
        used += Math.ceil(len / charsPerLine) - 1;
        current = len % charsPerLine || charsPerLine;
        continue;
      }
      if (current === 0) current = len;
      else if (current + 1 + len <= charsPerLine) current += 1 + len;
      else { used += 1; current = len; }
    }
    lines += used;
  }
  return Math.max(1, lines);
}

export type FitPhraseInput = Readonly<{
  text: string;
  /** Базовый кегль места (без изменений, если текст помещается). */
  baseSize: number;
  /** Нижний предел кегля; ниже не уменьшаем. */
  minSize?: number;
  /** Ширина области текста, px. */
  widthPx: number;
  /** Высота области текста, px. */
  maxHeightPx: number;
}>;

/** Наибольший кегль от baseSize до minSize, при котором текст целиком помещается в область; не помещается и на минимуме — минимум (дальше решает прокрутка места). */
export function fitPhraseFontSize({ text, baseSize, minSize = 14, widthPx, maxHeightPx }: FitPhraseInput): number {
  const floor = Math.min(baseSize, minSize);
  if (!text || widthPx <= 0 || maxHeightPx <= 0) return baseSize;
  for (let size = Math.round(baseSize); size >= floor; size -= 1) {
    const lines = estimateWrappedLines(text, size, widthPx);
    if (lines * size * LINE_HEIGHT_RATIO <= maxHeightPx) return size;
  }
  return floor;
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __FitPhraseFontRouteShim() {
  return null;
}
