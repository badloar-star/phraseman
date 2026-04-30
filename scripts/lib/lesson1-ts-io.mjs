/**
 * @deprecated используйте lesson-ts-io.mjs — оставлено для совместимости импортов.
 */
import { getLessonInnerBounds, replaceLessonInner } from './lesson-ts-io.mjs';

export function getLesson1InnerBounds(fullRaw) {
  return getLessonInnerBounds(fullRaw, 1);
}

export function replaceLesson1Inner(fullRaw, newInner) {
  return replaceLessonInner(fullRaw, 1, newInner);
}
