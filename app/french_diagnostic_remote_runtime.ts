import type { QuizPhrase } from './quiz_data';
import {
  ensureFrenchRemoteQuizRows,
  getCachedFrenchRemoteQuizRows,
} from './french_quiz_remote_runtime';
import { shuffle } from './utils_shuffle';

type DiagnosticQuestion = {
  phrase: string;
  hintRU: string;
  hintUK: string;
  hintES: string;
  opts: string[];
  correct: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  type: 'choice4';
  answer?: string;
};

function sourceText(row: QuizPhrase): string {
  return String(row.sourceText || row.ru || row.uk || row.es || '').trim();
}

function diagnosticLevel(row: QuizPhrase): DiagnosticQuestion['level'] {
  if (row.lessonNum <= 10) return 'A1';
  if (row.lessonNum <= 20) return 'A2';
  if (row.lessonNum <= 28) return 'B1';
  if (row.lessonNum <= 31) return 'B2';
  return 'C1';
}

function primaryCorrectIndex(row: QuizPhrase): number {
  return Array.isArray(row.correct) ? row.correct[0] ?? -1 : row.correct;
}

function toDiagnosticQuestion(row: QuizPhrase): DiagnosticQuestion | null {
  const correct = primaryCorrectIndex(row);
  const opts = Array.isArray(row.choices) ? row.choices.map((item) => String(item).trim()).filter(Boolean) : [];
  const prompt = sourceText(row);
  if (!prompt || opts.length !== 4 || correct < 0 || correct >= opts.length) return null;

  const hint = row.sourceExplanations?.[correct] || row.explanations?.[correct] || row.explanationsUK?.[correct] || prompt;
  return {
    phrase: prompt,
    hintRU: hint,
    hintUK: row.sourceExplanations?.[correct] || row.explanationsUK?.[correct] || hint,
    hintES: row.explanationsES?.[correct] || hint,
    opts,
    correct,
    level: diagnosticLevel(row),
    type: 'choice4',
    answer: row.answer || opts[correct],
  };
}

export async function loadFrenchRemoteDiagnosticQuestions(
  sourceLocaleInput: unknown,
  totalCount = 20,
): Promise<DiagnosticQuestion[]> {
  await ensureFrenchRemoteQuizRows(sourceLocaleInput);
  const rows = [
    ...getCachedFrenchRemoteQuizRows('easy', 200, sourceLocaleInput),
    ...getCachedFrenchRemoteQuizRows('medium', 300, sourceLocaleInput),
    ...getCachedFrenchRemoteQuizRows('hard', 400, sourceLocaleInput),
  ];
  const uniqueRows = new Map<string, QuizPhrase>();
  rows.forEach((row, index) => {
    uniqueRows.set(row.questionId || `${row.lessonNum}:${sourceText(row)}:${index}`, row);
  });

  const byLevel = new Map<DiagnosticQuestion['level'], DiagnosticQuestion[]>();
  for (const row of uniqueRows.values()) {
    const question = toDiagnosticQuestion(row);
    if (!question) continue;
    const bucket = byLevel.get(question.level) ?? [];
    bucket.push(question);
    byLevel.set(question.level, bucket);
  }

  const orderedLevels: DiagnosticQuestion['level'][] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const perLevel = Math.max(1, Math.floor(totalCount / orderedLevels.length));
  const picked = orderedLevels.flatMap((level) => shuffle(byLevel.get(level) ?? []).slice(0, perLevel));
  const remaining = shuffle([...byLevel.values()].flat()).filter((question) => !picked.includes(question));
  return [...picked, ...remaining].slice(0, totalCount);
}

export default function __FrenchDiagnosticRemoteRuntimeRouteShim() {
  return null;
}
