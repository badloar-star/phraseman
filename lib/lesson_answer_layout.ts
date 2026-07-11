const NARROW_SCREEN_MAX_WIDTH = 399;
const LONG_ANSWER_THRESHOLD = 22;
const VERY_LONG_ANSWER_THRESHOLD = 30;
const MIN_ANSWER_FONT_SIZE = 18;

export function resolveLessonAnswerFontSize(
  baseFontSize: number,
  screenWidth: number,
  text: string,
): number {
  const normalizedLength = text.trim().replace(/\s+/g, ' ').length;
  if (
    !Number.isFinite(baseFontSize)
    || baseFontSize <= 0
    || !Number.isFinite(screenWidth)
    || screenWidth > NARROW_SCREEN_MAX_WIDTH
    || normalizedLength <= LONG_ANSWER_THRESHOLD
  ) {
    return baseFontSize;
  }

  const reduction = normalizedLength > VERY_LONG_ANSWER_THRESHOLD ? 8 : 4;
  return Math.min(baseFontSize, Math.max(MIN_ANSWER_FONT_SIZE, baseFontSize - reduction));
}
