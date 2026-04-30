/**
 * Извлечение и замена внутреннего блока lessonCards[N] в lesson_cards_data.ts
 * (между `  N: {\n` и закрытием перед `  N+1: {\n    1: {`).
 */

export function getLessonInnerBounds(fullRaw, lessonId) {
  if (!Number.isFinite(lessonId) || lessonId < 1) throw new Error('lessonId must be >= 1');
  const full = fullRaw.replace(/\r\n/g, '\n');
  const openStr = `  ${lessonId}: {\n`;
  const open = full.indexOf(openStr);
  if (open === -1) throw new Error(`lesson ${lessonId}: открывающая граница не найдена`);
  const closeStr = `\n  },\n  ${lessonId + 1}: {\n    1: {`;
  const close = full.indexOf(closeStr, open);
  if (close === -1) {
    throw new Error(
      `lesson ${lessonId}: закрывающая граница не найдена (нужен следующий урок ${lessonId + 1} с карточкой 1)`,
    );
  }
  const innerStart = open + openStr.length;
  return { full, open, close, innerStart, innerEnd: close, inner: full.slice(innerStart, close) };
}

export function replaceLessonInner(fullRaw, lessonId, newInner) {
  const { full, innerStart, innerEnd } = getLessonInnerBounds(fullRaw, lessonId);
  const innerNorm = newInner.replace(/\r\n/g, '\n');
  const rebuilt = full.slice(0, innerStart) + innerNorm + full.slice(innerEnd);
  return fullRaw.includes('\r\n') ? rebuilt.replace(/\n/g, '\r\n') : rebuilt;
}
