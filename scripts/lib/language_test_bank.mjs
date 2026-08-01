import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const LANGUAGES = Object.freeze(['en', 'de', 'fr', 'it', 'es']);
export const DIALECTS = Object.freeze({
  en: Object.freeze(['neutral', 'british', 'american']),
  de: Object.freeze(['standard']),
  fr: Object.freeze(['standard']),
  it: Object.freeze(['standard']),
  es: Object.freeze(['standard']),
});

// Canonical generated bank bytes use CRLF to match the checked-in English artifacts.
const CANONICAL_EOL = '\r\n';

const DIFFICULTY_RANGES = Object.freeze({
  A1: [0.5, 1.2],
  A2: [1.3, 2.2],
  B1: [2.3, 3.1],
  B2: [3.2, 3.9],
  C1: [4.0, 4.7],
  C2: [4.8, 5.5],
});

export function assertLanguage(language) {
  if (!LANGUAGES.includes(language)) throw new Error(`Unsupported language: ${language}`);
}

export function sourceDirFor(root, language) {
  assertLanguage(language);
  return language === 'en'
    ? join(root, 'content', 'english-test', 'questions')
    : join(root, 'content', 'language-tests', 'questions', language);
}

export function outputPathsFor(root, language) {
  assertLanguage(language);
  const filename = `questions.${language}.json`;
  return [
    join(root, 'knowly-www', 'english-level-test', 'data', filename),
    join(root, 'functions-english-test', 'data', filename),
  ];
}

function requireNonEmptyString(question, key) {
  if (typeof question[key] !== 'string' || !question[key].trim()) {
    throw new Error(`Question ${question.id || '?'} has empty or invalid field: ${key}`);
  }
}

export function validateQuestion(question, { language, level, seenIds }) {
  const required = [
    'id', 'level', 'difficulty', 'skill', 'format', 'scenario', 'prompt',
    'scenarioRu', 'instructionRu', 'stimulus',
    'options', 'correctIndex', 'explanation', 'targetConstruct',
    'cefrRationale', 'dialect', 'reviewStatus', 'ambiguityNotes',
  ];
  for (const key of required) {
    if (!(key in question)) throw new Error(`Question ${question.id || '?'} missing field: ${key}`);
  }
  if (question.level !== level) throw new Error(`Question ${question.id} has level ${question.level}, expected ${level}`);
  if (!question.id.startsWith(`${language}-`)) {
    throw new Error(`Question ${question.id} must use the ${language}- ID prefix`);
  }
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    throw new Error(`Question ${question.id} must have exactly 4 options`);
  }
  const normalizedOptions = question.options.map((option) => String(option).trim().toLowerCase());
  if (normalizedOptions.some((option) => !option) || new Set(normalizedOptions).size !== 4) {
    throw new Error(`Question ${question.id} must have four unique non-empty options`);
  }
  if (question.options.some((option) => /all (?:are|of the above)/i.test(option))) {
    throw new Error(`Question ${question.id} uses a forbidden meta-answer`);
  }
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
    throw new Error(`Question ${question.id} has invalid correctIndex: ${question.correctIndex}`);
  }
  const [minDifficulty, maxDifficulty] = DIFFICULTY_RANGES[level];
  if (typeof question.difficulty !== 'number' || question.difficulty < minDifficulty || question.difficulty > maxDifficulty) {
    throw new Error(`Question ${question.id} has invalid difficulty: ${question.difficulty}`);
  }
  for (const key of [
    'scenario', 'prompt', 'scenarioRu', 'instructionRu', 'explanation',
    'targetConstruct', 'cefrRationale', 'ambiguityNotes',
  ]) requireNonEmptyString(question, key);
  if (typeof question.stimulus !== 'string') throw new Error(`Question ${question.id} has invalid stimulus`);
  if (!/[\u0400-\u04FF]/.test(question.scenarioRu) || !/[\u0400-\u04FF]/.test(question.instructionRu)) {
    throw new Error(`Question ${question.id} must have Russian UI copy`);
  }
  if (!['grammar', 'vocabulary', 'reading', 'pragmatics'].includes(question.skill)) {
    throw new Error(`Question ${question.id} has invalid skill: ${question.skill}`);
  }
  if (!['multiple-choice', 'gap-fill'].includes(question.format)) {
    throw new Error(`Question ${question.id} has invalid format: ${question.format}`);
  }
  if (!DIALECTS[language].includes(question.dialect)) {
    throw new Error(`Question ${question.id} has invalid ${language} dialect: ${question.dialect}`);
  }
  if (question.reviewStatus !== 'reviewed') throw new Error(`Question ${question.id} is not reviewed`);
  if (seenIds.has(question.id)) throw new Error(`Duplicate question ID: ${question.id}`);
  seenIds.add(question.id);
}

export function buildLanguageBank({ root, language }) {
  assertLanguage(language);
  const allQuestions = [];
  const seenIds = new Set();
  let schemaVersion = null;
  let bankVersion = null;

  for (const level of LEVELS) {
    const sourcePath = join(sourceDirFor(root, language), `${level}.json`);
    if (!existsSync(sourcePath)) throw new Error(`Missing level file: ${sourcePath}`);
    const data = JSON.parse(readFileSync(sourcePath, 'utf-8'));
    if (schemaVersion === null) schemaVersion = data.schemaVersion;
    if (bankVersion === null) bankVersion = data.bankVersion;
    if (data.schemaVersion !== schemaVersion) throw new Error(`Schema version mismatch in ${level}.json`);
    if (data.bankVersion !== bankVersion) throw new Error(`Bank version mismatch in ${level}.json`);
    if (data.language !== language) throw new Error(`Language mismatch in ${level}.json`);
    if (data.level !== level) throw new Error(`Level mismatch in ${level}.json`);

    const questions = data.questions || [];
    if (questions.length !== 40) throw new Error(`Level ${level} has ${questions.length} questions, expected 40`);
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      validateQuestion(question, { language, level, seenIds });
      if (index > 0 && question.difficulty <= questions[index - 1].difficulty) {
        throw new Error(`Level ${level} difficulty is not ascending at ${question.id}`);
      }
    }
    const positions = [0, 0, 0, 0];
    const representedSkills = new Set();
    for (const question of questions) {
      positions[question.correctIndex] += 1;
      representedSkills.add(question.skill);
    }
    if (positions.some((count) => count !== 10)) {
      throw new Error(`Level ${level} correctIndex distribution is ${positions.join(',')}, expected 10 each`);
    }
    if (representedSkills.size < 3) throw new Error(`Level ${level} must represent at least three text skills`);
    allQuestions.push(...questions);
  }
  if (allQuestions.length !== 240) throw new Error(`Total questions: ${allQuestions.length}, expected 240`);
  return JSON.stringify({ schemaVersion, bankVersion, language, levels: LEVELS, questions: allQuestions }, null, 2)
    .replace(/\n/g, CANONICAL_EOL) + CANONICAL_EOL;
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

export function writeGeneratedOutputs({ root, language, jsonText = buildLanguageBank({ root, language }) }) {
  for (const outputPath of outputPathsFor(root, language)) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, jsonText, 'utf-8');
  }
  return jsonText;
}

export function checkGeneratedOutputs({ root, languages }) {
  for (const language of languages) {
    const generated = Buffer.from(buildLanguageBank({ root, language }), 'utf-8');
    for (const outputPath of outputPathsFor(root, language)) {
      if (!existsSync(outputPath)) throw new Error(`Check failed: output does not exist: ${outputPath}`);
      const beforeMtimeNs = statSync(outputPath, { bigint: true }).mtimeNs;
      const existing = readFileSync(outputPath);
      if (!existing.equals(generated)) {
        throw new Error(`Check failed: generated output differs from ${outputPath}`);
      }
      const afterMtimeNs = statSync(outputPath, { bigint: true }).mtimeNs;
      if (afterMtimeNs !== beforeMtimeNs) throw new Error(`Check failed: output mtime changed: ${outputPath}`);
    }
  }
}
