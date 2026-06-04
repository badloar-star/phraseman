import type { LessonPhrase, LessonTeachingNote } from './lesson_data_types';
import { listPersonalPlanAttemptEvents } from './personal_plan_attempt_events';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';
import type { PlanAttemptEvent } from './personal_plan_engine_contracts';

export type PersonalPlanPhraseRecallItemSource = 'wrong_attempt' | 'fallback';

export type PersonalPlanPhraseRecallItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  targetText: string;
  source: PersonalPlanPhraseRecallItemSource;
  contentUnitId?: string;
  previousSelectedAnswer?: string;
  grammarTags: string[];
  vocabularyTags: string[];
  explanation: LessonTeachingNote;
};

export type GetPersonalPlanPhraseRecallItemsInput = {
  planInstanceId: string;
  lessonId: string;
  contentUnitIds: string[];
};

function normalizeKey(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function phraseTags(phrase: LessonPhrase | undefined): string[] {
  return phrase?.words.map((word) => word.category).filter(Boolean) as string[] ?? [];
}

function recallExplanation(targetText: string): LessonTeachingNote {
  const id = targetText.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'phrase';
  return {
    id: `plan_phrase_recall_${id}`,
    titleRu: 'Вспомни без подсказки',
    correctRu: 'Да, так фраза начинает вспоминаться сама. Коротко, понятно, без вариантов перед глазами.',
    wrongRu: 'Сейчас не сравниваем с прошлым ответом и не угадываем по кнопкам. Посмотри на смысл, проговори фразу медленнее и набери ее снова.',
  };
}

function attemptKey(event: PlanAttemptEvent): string {
  return normalizeKey(event.contentUnitId) || normalizeKey(event.expectedAnswer) || event.id;
}

function isRecallCandidate(event: PlanAttemptEvent): boolean {
  return (event.result === 'wrong' || event.result === 'skipped') && Boolean(event.expectedAnswer?.trim());
}

function isLaterResolved(event: PlanAttemptEvent): boolean {
  return event.result === 'correct' || event.result === 'completed';
}

function latestOpenWrongAttempts(events: PlanAttemptEvent[]): PlanAttemptEvent[] {
  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const resolved = new Set<string>();
  const wrongByKey = new Map<string, PlanAttemptEvent>();

  for (const event of sorted) {
    const key = attemptKey(event);
    if (isLaterResolved(event)) {
      resolved.add(key);
      wrongByKey.delete(key);
      continue;
    }
    if (!resolved.has(key) && isRecallCandidate(event)) {
      wrongByKey.set(key, event);
    }
  }

  return [...wrongByKey.values()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export async function getPersonalPlanPhraseRecallItems(
  input: GetPersonalPlanPhraseRecallItemsInput,
): Promise<PersonalPlanPhraseRecallItem[]> {
  const lesson = getPersonalPlanPhraseLesson(input.lessonId);
  if (!lesson) return [];

  const phrasesById = new Map(lesson.phrases.map((phrase) => [String(phrase.id), phrase]));
  const phrasesByEnglish = new Map(lesson.phrases.map((phrase) => [normalizeKey(phrase.english), phrase]));
  const used = new Set<string>();
  const items: PersonalPlanPhraseRecallItem[] = [];

  const attempts = await listPersonalPlanAttemptEvents(input.planInstanceId);
  for (const event of latestOpenWrongAttempts(attempts)) {
    const phrase = event.contentUnitId ? phrasesById.get(event.contentUnitId) : phrasesByEnglish.get(normalizeKey(event.expectedAnswer));
    const contentUnitId = event.contentUnitId || (phrase?.id === undefined ? undefined : String(phrase.id));
    const targetText = event.expectedAnswer?.trim() || phrase?.english;
    if (!targetText) continue;

    const key = normalizeKey(contentUnitId) || normalizeKey(targetText);
    if (used.has(key)) continue;
    used.add(key);

    items.push({
      id: `recall:${contentUnitId ?? targetText.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      promptRu: phrase?.russian ?? 'Вспомни фразу.',
      promptUk: phrase?.ukrainian ?? phrase?.russian ?? 'Вспомни фразу.',
      targetText,
      source: 'wrong_attempt',
      contentUnitId,
      previousSelectedAnswer: event.selectedAnswerKnown ? event.selectedAnswer : undefined,
      grammarTags: event.grammarTags.length > 0 ? event.grammarTags : phraseTags(phrase),
      vocabularyTags: event.vocabularyTags,
      explanation: recallExplanation(targetText),
    });
  }

  const fallbackIds = input.contentUnitIds.length > 0
    ? input.contentUnitIds
    : lesson.phrases.map((phrase) => String(phrase.id));

  for (const id of fallbackIds) {
    const phrase = phrasesById.get(id);
    if (!phrase) continue;
    const key = normalizeKey(String(phrase.id));
    if (used.has(key)) continue;
    used.add(key);
    items.push({
      id: `fallback:${phrase.id}`,
      promptRu: phrase.russian,
      promptUk: phrase.ukrainian,
      targetText: phrase.english,
      source: 'fallback',
      contentUnitId: String(phrase.id),
      grammarTags: phraseTags(phrase),
      vocabularyTags: [],
      explanation: recallExplanation(phrase.english),
    });
  }

  return items;
}
