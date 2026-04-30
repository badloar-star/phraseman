import type { Lang } from '../constants/i18n';

/** Тема вопроса: RU в пуле, UK в topicUK; ES — опционально, иначе показываем RU. */
export type ExamTopicFields = { topic: string; topicUK: string; topicES?: string };

export function examTopicForLang(q: ExamTopicFields, lang: Lang): string {
  if (lang === 'uk') return q.topicUK || q.topic;
  if (lang === 'es') return q.topicES ?? q.topic;
  return q.topic;
}
