// learning_v2_chapter_exam_v1.ts — экзамен главы в приложении: вопросы из готовых заданий главы, запись попытки, зачёт эпизодов.
// зачем (решения владельца 21.10, №8/№10; «НЕ ВИЖУ ЭКЗАМЕН» 22.10): движок чистый (modules/learning-v2/exam/chapter_exam_v1.ts),
// здесь — связь с данными: задания главы берём из встроенного выпуска (без сети), результат пишем на устройство, при сдаче
// засчитываем пропущенные эпизоды главы в локальном прогрессе курса по порядку, без звёзд. Firebase не трогаем.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  chapterExamKeyV1,
  chapterExamSessionsToCreditV1,
  chapterSessionOrdinalsV1,
  recordChapterExamAttemptV1,
  scoreChapterExamV1,
  selectChapterExamQuestionsV1,
  type ChapterExamCandidateV1,
  type ChapterExamQuestionV1,
  type ChapterExamRecordV1,
  type ChapterExamResultV1,
} from '../modules/learning-v2/exam/chapter_exam_v1';
import { learningV2CourseSessionIdV1 } from '../modules/learning-v2/content/course_topology_v1';
import { loadLearningV2ChapterExamRecordsV1, saveLearningV2ChapterExamRecordV1 } from './learning_v2_chapter_exam_store_v1';

const LOG = '[CHAPTER-EXAM]';

type LearnerJson = { interactions?: { interactionId?: string; family?: string; modePayload?: { isWordCard?: boolean } }[] };

/** Кандидаты в вопросы: все задания эпизодов главы из встроенного выпуска (английский курс; ru/uk). */
export function gatherLearningV2ChapterExamCandidatesV1(input: Readonly<{
  lessonOrdinal: number;
  chapterOrdinal: number;
  locale: 'ru' | 'uk';
}>): readonly ChapterExamCandidateV1[] {
  // зачем: каталог выпуска тяжёлый — грузим лениво, только когда человек открыл экзамен
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FACTORY_NATIVE_MANIFEST_V1 } = require('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated') as typeof import('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated');
  const sessions = new Set(chapterSessionOrdinalsV1(input.chapterOrdinal));
  const rows = FACTORY_NATIVE_MANIFEST_V1.filter((row) => row.lessonOrdinal === input.lessonOrdinal && sessions.has(row.sessionOrdinal));
  const out: ChapterExamCandidateV1[] = [];
  for (const row of rows) {
    let learner: LearnerJson;
    try {
      learner = row.loadLearner(input.locale) as LearnerJson;
    } catch (error) {
      console.warn(`${LOG} candidates:session_load_failed`, JSON.stringify({ lesson: input.lessonOrdinal, session: row.sessionOrdinal, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
      continue;
    }
    for (const interaction of learner.interactions ?? []) {
      if (!interaction.interactionId || !interaction.family) continue;
      out.push({
        interactionId: interaction.interactionId,
        courseSessionId: learningV2CourseSessionIdV1(input.lessonOrdinal, row.sessionOrdinal),
        sessionOrdinal: row.sessionOrdinal,
        family: interaction.family,
        isWordCard: interaction.modePayload?.isWordCard === true,
      });
    }
  }
  console.log(`${LOG} candidates`, JSON.stringify({ lesson: input.lessonOrdinal, chapter: input.chapterOrdinal, sessionsInRelease: rows.length, candidates: out.length, source: 'bundled_release' })); // guard-ok: откуда пришло
  return Object.freeze(out);
}

/** Вопросы попытки: номер попытки = прошлые попытки + 1, поэтому новая попытка после часа даёт другой набор. */
export async function prepareLearningV2ChapterExamV1(input: Readonly<{
  accountScopeHash: string;
  targetLanguage: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  locale: 'ru' | 'uk';
}>): Promise<Readonly<{ examKey: string; attempt: number; questions: readonly ChapterExamQuestionV1[] }> | null> {
  const examKey = chapterExamKeyV1(input);
  const records = await loadLearningV2ChapterExamRecordsV1(input.accountScopeHash);
  const attempt = (records[examKey]?.attempts ?? 0) + 1;
  const questions = selectChapterExamQuestionsV1({
    examKey,
    attempt,
    candidates: gatherLearningV2ChapterExamCandidatesV1(input),
  });
  if (!questions) {
    console.warn(`${LOG} prepare:no_exam`, JSON.stringify({ examKey, attempt })); // guard-ok: ранний выход пишет причину
    return null;
  }
  return Object.freeze({ examKey, attempt, questions });
}

/**
 * Завершить попытку: результат → запись (сдал / пауза час) → при сдаче засчитать пропущенные эпизоды главы по порядку.
 * Сердечки экзамен не тратит — здесь их нет вовсе.
 */
export async function finishLearningV2ChapterExamV1(input: Readonly<{
  accountScopeHash: string;
  progressAccountScopeHash: string;
  examKey: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  answers: readonly Readonly<{ interactionId: string; correct: boolean }>[];
  finishedAtMs: number;
}>): Promise<Readonly<{ result: ChapterExamResultV1; record: ChapterExamRecordV1; creditedSessionIds: readonly string[] }>> {
  const result = scoreChapterExamV1(input.answers);
  const records = await loadLearningV2ChapterExamRecordsV1(input.accountScopeHash);
  const record = recordChapterExamAttemptV1(records[input.examKey] ?? null, { examKey: input.examKey, result, finishedAtMs: input.finishedAtMs });
  await saveLearningV2ChapterExamRecordV1(input.accountScopeHash, record);
  if (!result.passed) {
    console.log(`${LOG} finish:failed`, JSON.stringify({ examKey: input.examKey, correct: result.correct, retryAtMs: record.retryAtMs })); // guard-ok: ветка и значение
    return Object.freeze({ result, record, creditedSessionIds: Object.freeze([]) });
  }
  const creditedSessionIds: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createLearningV2CourseLocalProgressStoreV1 } = require('../modules/learning-v2/progress/course_local_progress_v1') as typeof import('../modules/learning-v2/progress/course_local_progress_v1');
    const store = createLearningV2CourseLocalProgressStoreV1(AsyncStorage);
    const progress = await store.load(input.progressAccountScopeHash);
    const done = new Set(progress.completedSessionIds);
    const completedInChapter = chapterSessionOrdinalsV1(input.chapterOrdinal)
      .filter((ordinal) => done.has(learningV2CourseSessionIdV1(input.lessonOrdinal, ordinal)));
    for (const ordinal of chapterExamSessionsToCreditV1({ chapterOrdinal: input.chapterOrdinal, completedSessionOrdinals: completedInChapter })) {
      const sessionId = learningV2CourseSessionIdV1(input.lessonOrdinal, ordinal);
      await store.complete(input.progressAccountScopeHash, sessionId);
      creditedSessionIds.push(sessionId);
    }
  } catch (error) {
    // зачем: прогресс — строгая цепочка; если до главы ещё не дошли подряд, зачёт откажет — экзамен всё равно сдан, причина в журнале
    console.warn(`${LOG} finish:credit_failed`, JSON.stringify({ examKey: input.examKey, credited: creditedSessionIds, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
  console.log(`${LOG} finish:passed`, JSON.stringify({ examKey: input.examKey, correct: result.correct, credited: creditedSessionIds })); // guard-ok: итог
  return Object.freeze({ result, record, creditedSessionIds: Object.freeze(creditedSessionIds) });
}

/** Сданные главы урока — для карты «пройдена» и строки «Экзамен сдан · X из 12». */
export function learningV2PassedChaptersV1(records: Readonly<Record<string, ChapterExamRecordV1>>, targetLanguage: string, lessonOrdinal: number): ReadonlyMap<number, number> {
  const out = new Map<number, number>();
  for (let chapter = 1; chapter <= 7; chapter += 1) {
    const record = records[chapterExamKeyV1({ targetLanguage, lessonOrdinal, chapterOrdinal: chapter })];
    if (record?.status === 'passed') out.set(chapter, record.passedCorrect ?? record.lastCorrect);
  }
  return out;
}

export default function __RouteShim() { return null; }
