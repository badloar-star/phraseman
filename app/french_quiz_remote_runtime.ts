import * as Crypto from 'expo-crypto';

import type { QuizDifficulty, QuizPhrase } from './quiz_data';
import {
  getFrenchStudyTargetServerPackRegistrations,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';
import { sampleUniqueRandomIndices, shuffle } from './utils_shuffle';

type FrenchQuizEntry = {
  entryId?: string;
  questionId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  sourceLocales?: string[];
  surface?: string;
  section?: string;
  quizItemType?: string;
  level?: QuizPhrase['level'];
  difficulty?: QuizDifficulty;
  lessonId?: number;
  phraseId?: string;
  sourceText?: string;
  sourcePrompt_ru?: string;
  sourcePrompt_uk?: string;
  ru?: string;
  uk?: string;
  targetText?: string;
  targetPrompt?: string;
  englishBase?: string;
  choices?: string[];
  correct?: number | number[];
  answer?: string;
  explanations?: string[];
  explanationsUK?: string[];
  explanations_ru?: string[];
  explanations_uk?: string[];
  skillTag?: string;
  mistakeToken?: string;
  quiz?: {
    blank?: string;
    correct?: string;
    distractors?: string[];
    category?: string;
  };
};

type FrenchQuizPayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  entries?: FrenchQuizEntry[];
};

type FrenchQuizManifest = {
  sha256?: string;
  payloadSha256?: string;
  payloadShard?: string;
  serverPathPreview?: string;
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly QuizPhrase[]>>();
const resolvedPayloadCache = new Map<FrenchTargetSourceLocale, readonly QuizPhrase[]>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T | null>;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await withTimeout(fetch(url), LOAD_TIMEOUT_MS);
    if (!response || !response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function basename(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/\\/g, '/').split('?')[0].split('#')[0];
  const last = clean.split('/').filter(Boolean).pop();
  return last || null;
}

function payloadCandidates(manifest: FrenchQuizManifest): string[] {
  return [
    basename(manifest.payloadShard),
    basename(manifest.serverPathPreview),
    typeof manifest.sha256 === 'string' ? `${manifest.sha256}.json` : null,
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function levelForLesson(lessonId: number): QuizPhrase['level'] {
  if (lessonId <= 10) return 'A1';
  if (lessonId <= 20) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

function difficultyAllowsLesson(difficulty: QuizDifficulty, lessonId: number): boolean {
  if (difficulty === 'easy') return lessonId <= 10;
  if (difficulty === 'medium') return lessonId > 10 && lessonId <= 24;
  return lessonId > 24;
}

function difficultyStarsForLesson(lessonId: number): number {
  return lessonId <= 10 ? 1 : lessonId <= 24 ? 2 : 3;
}

function isValidCorrectIndex(correct: unknown, choices: readonly string[]): correct is number {
  return typeof correct === 'number' && Number.isInteger(correct) && correct >= 0 && correct < choices.length;
}

function validExplanations(value: unknown, choices: readonly string[]): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean);
  return items.length === choices.length ? items : null;
}

function entryToFullSentenceQuizPhrase(entry: FrenchQuizEntry): QuizPhrase | null {
  const sourceLocale = normalizeFrenchTargetSourceLocale(entry.sourceLocale);
  const choices = Array.isArray(entry.choices)
    ? entry.choices.map((item) => item.trim()).filter(Boolean)
    : [];
  if (
    entry.studyTarget !== 'fr' ||
    entry.surface !== 'quiz' ||
    !sourceLocale ||
    typeof entry.lessonId !== 'number' ||
    choices.length !== 4 ||
    !isValidCorrectIndex(entry.correct, choices)
  ) {
    return null;
  }

  const sourceText = (
    sourceLocale === 'uk'
      ? entry.sourcePrompt_uk || entry.uk || entry.sourceText
      : entry.sourcePrompt_ru || entry.ru || entry.sourceText
  )?.trim();
  const sourceTextRu = (entry.sourcePrompt_ru || entry.ru || sourceText)?.trim();
  const sourceTextUk = (entry.sourcePrompt_uk || entry.uk || sourceText)?.trim();
  const answer = (entry.answer || choices[entry.correct]).trim();
  const targetText = (entry.targetText || answer).trim();
  const explanationsRu = validExplanations(entry.explanations_ru, choices)
    || validExplanations(entry.explanations, choices);
  const explanationsUk = validExplanations(entry.explanations_uk, choices)
    || validExplanations(entry.explanationsUK, choices)
    || explanationsRu;

  if (!sourceText || !sourceTextRu || !sourceTextUk || !answer || !targetText || !explanationsRu || !explanationsUk) {
    return null;
  }

  return {
    ru: sourceTextRu,
    uk: sourceTextUk,
    es: sourceText,
    choices,
    correct: entry.correct,
    answer,
    explanations: explanationsRu,
    explanationsUK: explanationsUk,
    explanationsES: explanationsRu,
    sourceLocale,
    sourceText,
    sourceExplanations: sourceLocale === 'uk' ? explanationsUk : explanationsRu,
    lessonNum: entry.lessonId,
    level: entry.level || levelForLesson(entry.lessonId),
    questionId: entry.questionId || entry.entryId || entry.phraseId,
    skillTag: entry.skillTag || entry.mistakeToken,
    reviewerFlag: null,
    difficultyStars: difficultyStarsForLesson(entry.lessonId),
    quizItemType: entry.quizItemType || 'standard_mcq_full_sentence',
  };
}

function entryToLegacyQuizPhrase(entry: FrenchQuizEntry): QuizPhrase | null {
  const sourceLocale = normalizeFrenchTargetSourceLocale(entry.sourceLocale);
  const correct = entry.quiz?.correct?.trim();
  const blank = entry.quiz?.blank?.trim();
  const distractors = Array.isArray(entry.quiz?.distractors)
    ? entry.quiz.distractors.map((item) => item.trim()).filter(Boolean)
    : [];
  if (
    entry.studyTarget !== 'fr' ||
    entry.surface !== 'quiz' ||
    !sourceLocale ||
    typeof entry.lessonId !== 'number' ||
    typeof entry.phraseId !== 'string' ||
    typeof entry.sourceText !== 'string' ||
    typeof entry.targetText !== 'string' ||
    !blank ||
    !correct ||
    distractors.length < 3
  ) {
    return null;
  }

  const choices = shuffle([correct, ...distractors.filter((item) => item !== correct)]).slice(0, 4);
  const correctIndex = choices.indexOf(correct);
  if (choices.length !== 4 || correctIndex < 0) return null;

  const prompt = `${entry.sourceText}\n${blank}`;
  const explanation = `${blank.replace('___', correct)} = ${entry.targetText}`;
  return {
    ru: sourceLocale === 'ru' ? prompt : entry.englishBase || prompt,
    uk: sourceLocale === 'uk' ? prompt : entry.englishBase || prompt,
    es: prompt,
    choices,
    correct: correctIndex,
    answer: correct,
    explanations: choices.map((choice) => choice === correct ? explanation : `Здесь нужна форма: ${correct}.`),
    explanationsUK: choices.map((choice) => choice === correct ? explanation : `Тут потрібна форма: ${correct}.`),
    explanationsES: choices.map((choice) => choice === correct ? explanation : `La forma correcta es: ${correct}.`),
    sourceLocales: {
      [sourceLocale]: {
        prompt,
        explanations: choices.map((choice) => choice === correct ? explanation : `Правильный вариант: ${correct}.`),
      },
    },
    sourceLocale,
    sourceText: prompt,
    sourceExplanations: choices.map((choice) => choice === correct ? explanation : `Правильный вариант: ${correct}.`),
    lessonNum: entry.lessonId,
    level: levelForLesson(entry.lessonId),
    questionId: entry.entryId,
    skillTag: entry.quiz?.category,
    reviewerFlag: null,
    difficultyStars: difficultyStarsForLesson(entry.lessonId),
    quizItemType: 'mcq',
  };
}

export function entryToQuizPhrase(entry: FrenchQuizEntry): QuizPhrase | null {
  return entryToFullSentenceQuizPhrase(entry) || entryToLegacyQuizPhrase(entry);
}

async function loadFrenchQuizPayload(sourceLocale: FrenchTargetSourceLocale): Promise<readonly QuizPhrase[]> {
  const registration = getFrenchStudyTargetServerPackRegistrations(sourceLocale)
    .find((item) => item.surface === 'quiz');
  if (!registration) return [];

  const manifestText = await fetchText(registration.manifestUrl);
  if (!manifestText) return [];

  let manifest: FrenchQuizManifest;
  try {
    manifest = JSON.parse(manifestText) as FrenchQuizManifest;
  } catch {
    return [];
  }

  const expectedHash = (manifest.payloadSha256 || manifest.sha256 || '').toLowerCase();
  for (const payloadName of payloadCandidates(manifest)) {
    const payloadText = await fetchText(registration.rowUrl(payloadName));
    if (!payloadText) continue;
    if (expectedHash) {
      const actualHash = (await sha256(payloadText)).toLowerCase();
      if (actualHash !== expectedHash) continue;
    }
    let payload: FrenchQuizPayload;
    try {
      payload = JSON.parse(payloadText) as FrenchQuizPayload;
    } catch {
      continue;
    }
    if (payload.studyTarget !== 'fr' || payload.sourceLocale !== sourceLocale || payload.surface !== 'quiz') {
      continue;
    }
    return Object.freeze((payload.entries ?? [])
      .map(entryToQuizPhrase)
      .filter((item): item is QuizPhrase => !!item));
  }

  return [];
}

export function prefetchFrenchRemoteQuizRows(sourceLocaleInput: unknown): void {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  if (!payloadCache.has(sourceLocale)) {
    const task = loadFrenchQuizPayload(sourceLocale)
      .then((rows) => {
        resolvedPayloadCache.set(sourceLocale, rows);
        return rows;
      })
      .catch(() => {
        resolvedPayloadCache.set(sourceLocale, []);
        return [];
      });
    payloadCache.set(sourceLocale, task);
  }
}

export async function ensureFrenchRemoteQuizRows(sourceLocaleInput: unknown): Promise<void> {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  prefetchFrenchRemoteQuizRows(sourceLocale);
  await payloadCache.get(sourceLocale);
}

export function getCachedFrenchRemoteQuizRows(
  difficulty: QuizDifficulty,
  count: number,
  sourceLocaleInput: unknown,
): QuizPhrase[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  const rows = resolvedPayloadCache.get(sourceLocale);
  if (!rows) return [];

  const pool = rows.filter((row) => difficultyAllowsLesson(difficulty, row.lessonNum));
  const k = Math.min(count, pool.length);
  return sampleUniqueRandomIndices(pool.length, k)
    .map((index) => pool[index])
    .filter((item): item is QuizPhrase => !!item);
}

export default function __FrenchQuizRemoteRuntimeRouteShim() {
  return null;
}
