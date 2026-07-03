import type { QuizPhrase } from './quiz_data';
import {
  ensureFrenchRemoteQuizRows,
  getCachedFrenchRemoteQuizRows,
} from './french_quiz_remote_runtime';
import { shuffle } from './utils_shuffle';

export type FrenchExamQuestion = {
  lessonNum: number;
  topic: string;
  rawTopic?: string;
  topicUK: string;
  topicES?: string;
  q: string;
  opts: string[];
  correct: number;
  type?: 'choice4';
};

export type FrenchLevelExamQuestion = {
  lessonNum: number;
  topic: string;
  topicUK: string;
  topicES: string;
  q: string;
  opts: string[];
  correct: number;
  type?: 'choice4';
};

const LEVEL_RANGES: Record<string, [number, number]> = {
  A1: [1, 8],
  A2: [9, 18],
  B1: [19, 28],
  B2: [29, 32],
};

function sourceText(row: QuizPhrase): string {
  return String(row.sourceText || row.ru || row.uk || row.es || '').trim();
}

function topicForRow(row: QuizPhrase): string {
  return String(row.skillTag || row.level || `French lesson ${row.lessonNum}`).trim();
}

function primaryCorrectIndex(row: QuizPhrase): number {
  return Array.isArray(row.correct) ? row.correct[0] ?? -1 : row.correct;
}

function rowKey(row: QuizPhrase, index: number): string {
  return row.questionId || `${row.lessonNum}:${sourceText(row)}:${index}`;
}

function toFrenchExamQuestion(row: QuizPhrase): FrenchExamQuestion | null {
  const correct = primaryCorrectIndex(row);
  const opts = Array.isArray(row.choices) ? row.choices.map((item) => String(item).trim()).filter(Boolean) : [];
  const q = sourceText(row);
  if (!q || opts.length !== 4 || correct < 0 || correct >= opts.length) return null;
  const topic = topicForRow(row);
  return {
    lessonNum: row.lessonNum,
    topic,
    rawTopic: topic,
    topicUK: topic,
    topicES: topic,
    q,
    opts,
    correct,
    type: 'choice4',
  };
}

async function loadUniqueFrenchQuizRows(sourceLocaleInput: unknown): Promise<QuizPhrase[]> {
  await ensureFrenchRemoteQuizRows(sourceLocaleInput);
  const rows = [
    ...getCachedFrenchRemoteQuizRows('easy', 400, sourceLocaleInput),
    ...getCachedFrenchRemoteQuizRows('medium', 500, sourceLocaleInput),
    ...getCachedFrenchRemoteQuizRows('hard', 500, sourceLocaleInput),
  ];
  const uniqueRows = new Map<string, QuizPhrase>();
  rows.forEach((row, index) => {
    uniqueRows.set(rowKey(row, index), row);
  });
  return [...uniqueRows.values()];
}

function pickBalancedByLesson<T extends FrenchExamQuestion>(rows: T[], count: number): T[] {
  const byLesson = new Map<number, T[]>();
  rows.forEach((row) => {
    const bucket = byLesson.get(row.lessonNum) ?? [];
    bucket.push(row);
    byLesson.set(row.lessonNum, bucket);
  });

  const mandatory: T[] = [];
  const extras: T[] = [];
  for (const lessonRows of byLesson.values()) {
    const shuffled = shuffle(lessonRows);
    if (shuffled[0]) mandatory.push(shuffled[0]);
    extras.push(...shuffled.slice(1));
  }

  return shuffle([...mandatory, ...shuffle(extras).slice(0, Math.max(0, count - mandatory.length))]).slice(0, count);
}

export async function loadFrenchRemoteFinalExamQuestions(
  sourceLocaleInput: unknown,
  count = 50,
): Promise<FrenchExamQuestion[]> {
  const rows = await loadUniqueFrenchQuizRows(sourceLocaleInput);
  return pickBalancedByLesson(
    rows.map(toFrenchExamQuestion).filter((item): item is FrenchExamQuestion => !!item),
    count,
  );
}

export async function loadFrenchRemoteLevelExamQuestions(
  level: string,
  sourceLocaleInput: unknown,
  count = 30,
): Promise<FrenchLevelExamQuestion[]> {
  const [from, to] = LEVEL_RANGES[level] ?? LEVEL_RANGES.A1;
  const rows = await loadUniqueFrenchQuizRows(sourceLocaleInput);
  const questions = rows
    .filter((row) => row.lessonNum >= from && row.lessonNum <= to)
    .map(toFrenchExamQuestion)
    .filter((item): item is FrenchExamQuestion => !!item)
    .map((item): FrenchLevelExamQuestion => ({
      ...item,
      topicES: item.topicES || item.topic,
    }));
  return pickBalancedByLesson(questions, count);
}

export default function __FrenchExamRemoteRuntimeRouteShim() {
  return null;
}
