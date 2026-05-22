import type { Lang, PlannedInterfaceLang } from '../constants/i18n';

/** Тема вопроса: RU в пуле, UK/ES/planned — отдельные user-facing topic поля. */
export type ExamTopicFields = {
  topic: string;
  topicUK: string;
  topicES?: string;
  topicPtBr?: string;
  topicVi?: string;
  topicId?: string;
  topicTr?: string;
  topicPl?: string;
};

const CORE_TOPIC_FIELDS: Partial<Record<Lang, keyof ExamTopicFields>> = {
  uk: 'topicUK',
  es: 'topicES',
};

const PLANNED_TOPIC_FIELDS: Record<PlannedInterfaceLang, keyof ExamTopicFields> = {
  'pt-BR': 'topicPtBr',
  vi: 'topicVi',
  id: 'topicId',
  tr: 'topicTr',
  pl: 'topicPl',
};

const TOPIC_UNAVAILABLE: Record<PlannedInterfaceLang | 'es', string> = {
  es: 'Tema no disponible',
  'pt-BR': 'Tópico indisponível',
  vi: 'Chưa có chủ đề',
  id: 'Topik belum tersedia',
  tr: 'Konu kullanılamıyor',
  pl: 'Temat jest niedostępny',
};

export function examTopicForLang(q: ExamTopicFields, lang: Lang): string {
  const plannedField = PLANNED_TOPIC_FIELDS[lang as PlannedInterfaceLang];
  if (plannedField) {
    return q[plannedField] || TOPIC_UNAVAILABLE[lang as PlannedInterfaceLang];
  }

  const coreField = CORE_TOPIC_FIELDS[lang];
  if (coreField) {
    return q[coreField] || TOPIC_UNAVAILABLE[lang as 'es'] || q.topic;
  }

  return q.topic;
}
