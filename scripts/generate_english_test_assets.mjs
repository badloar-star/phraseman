#!/usr/bin/env node
/**
 * English Level Test Asset Generator
 * Combines per-level JSON banks into a single deterministic questions.en.json
 * Usage:
 *   node scripts/generate_english_test_assets.mjs
 *   node scripts/generate_english_test_assets.mjs --check
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DIFFICULTY_RANGES = {
  A1: [0.5, 1.2],
  A2: [1.3, 2.2],
  B1: [2.3, 3.1],
  B2: [3.2, 3.9],
  C1: [4.0, 4.7],
  C2: [4.8, 5.5],
};
const SOURCE_DIR = join(ROOT, 'content', 'english-test', 'questions');
const WEB_OUT = join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.en.json');
const FUNCTIONS_OUT = join(ROOT, 'functions-english-test', 'data', 'questions.en.json');

function sha256(text) {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

function loadLevel(level) {
  const path = join(SOURCE_DIR, `${level}.json`);
  if (!existsSync(path)) {
    throw new Error(`Missing level file: ${path}`);
  }
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw);
  return data;
}

function requireNonEmptyString(question, key) {
  if (typeof question[key] !== 'string' || !question[key].trim()) {
    throw new Error(`Question ${question.id || '?'} has empty or invalid field: ${key}`);
  }
}

function validateQuestion(q, level, seenIds) {
  const required = [
    'id', 'level', 'difficulty', 'skill', 'format', 'scenario', 'prompt',
    'scenarioRu', 'instructionRu', 'stimulus',
    'options', 'correctIndex', 'explanation', 'targetConstruct',
    'cefrRationale', 'dialect', 'reviewStatus', 'ambiguityNotes',
  ];
  for (const key of required) {
    if (!(key in q)) {
      throw new Error(`Question ${q.id || '?'} missing field: ${key}`);
    }
  }
  if (q.level !== level) {
    throw new Error(`Question ${q.id} has level ${q.level}, expected ${level}`);
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    throw new Error(`Question ${q.id} must have exactly 4 options`);
  }
  const normalizedOptions = q.options.map((option) => String(option).trim().toLowerCase());
  if (normalizedOptions.some((option) => !option) || new Set(normalizedOptions).size !== 4) {
    throw new Error(`Question ${q.id} must have four unique non-empty options`);
  }
  if (q.options.some((option) => /all (?:are|of the above)/i.test(option))) {
    throw new Error(`Question ${q.id} uses a forbidden meta-answer`);
  }
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
    throw new Error(`Question ${q.id} has invalid correctIndex: ${q.correctIndex}`);
  }
  const [minDifficulty, maxDifficulty] = DIFFICULTY_RANGES[level];
  if (typeof q.difficulty !== 'number' || q.difficulty < minDifficulty || q.difficulty > maxDifficulty) {
    throw new Error(`Question ${q.id} has invalid difficulty: ${q.difficulty}`);
  }
  for (const key of [
    'scenario', 'prompt', 'scenarioRu', 'instructionRu', 'explanation',
    'targetConstruct', 'cefrRationale', 'ambiguityNotes',
  ]) {
    requireNonEmptyString(q, key);
  }
  if (typeof q.stimulus !== 'string') {
    throw new Error(`Question ${q.id} has invalid stimulus`);
  }
  if (!/[\u0400-\u04FF]/.test(q.scenarioRu) || !/[\u0400-\u04FF]/.test(q.instructionRu)) {
    throw new Error(`Question ${q.id} must have Russian UI copy`);
  }
  const validSkills = ['grammar', 'vocabulary', 'reading', 'pragmatics'];
  if (!validSkills.includes(q.skill)) {
    throw new Error(`Question ${q.id} has invalid skill: ${q.skill}`);
  }
  if (!['multiple-choice', 'gap-fill'].includes(q.format)) {
    throw new Error(`Question ${q.id} has invalid format: ${q.format}`);
  }
  if (!['neutral', 'british', 'american'].includes(q.dialect)) {
    throw new Error(`Question ${q.id} has invalid dialect: ${q.dialect}`);
  }
  if (q.reviewStatus !== 'reviewed') {
    throw new Error(`Question ${q.id} is not reviewed`);
  }
  if (seenIds.has(q.id)) {
    throw new Error(`Duplicate question ID: ${q.id}`);
  }
  seenIds.add(q.id);
}

function buildOutput() {
  const allQuestions = [];
  const seenIds = new Set();
  let schemaVersion = null;
  let bankVersion = null;
  let language = null;

  for (const level of LEVELS) {
    const data = loadLevel(level);
    if (schemaVersion === null) schemaVersion = data.schemaVersion;
    if (bankVersion === null) bankVersion = data.bankVersion;
    if (language === null) language = data.language;

    if (data.schemaVersion !== schemaVersion) {
      throw new Error(`Schema version mismatch in ${level}.json`);
    }
    if (data.bankVersion !== bankVersion) {
      throw new Error(`Bank version mismatch in ${level}.json`);
    }
    if (data.language !== language) {
      throw new Error(`Language mismatch in ${level}.json`);
    }

    const questions = data.questions || [];
    if (questions.length !== 40) {
      throw new Error(`Level ${level} has ${questions.length} questions, expected 40`);
    }

    for (let index = 0; index < questions.length; index += 1) {
      const q = questions[index];
      validateQuestion(q, level, seenIds);
      if (index > 0 && q.difficulty < questions[index - 1].difficulty) {
        throw new Error(`Level ${level} difficulty is not ascending at ${q.id}`);
      }
    }

    const positions = [0, 0, 0, 0];
    const representedSkills = new Set();
    for (const q of questions) {
      positions[q.correctIndex] += 1;
      representedSkills.add(q.skill);
    }
    if (positions.some((count) => count !== 10)) {
      throw new Error(`Level ${level} correctIndex distribution is ${positions.join(',')}, expected 10 each`);
    }
    if (representedSkills.size < 3) {
      throw new Error(`Level ${level} must represent at least three text skills`);
    }

    allQuestions.push(...questions);
  }

  if (allQuestions.length !== 240) {
    throw new Error(`Total questions: ${allQuestions.length}, expected 240`);
  }

  const output = {
    schemaVersion,
    bankVersion,
    language,
    levels: LEVELS,
    questions: allQuestions,
  };

  return JSON.stringify(output, null, 2) + '\n';
}

function writeOutputs(jsonText) {

  // Write web output
  mkdirSync(dirname(WEB_OUT), { recursive: true });
  writeFileSync(WEB_OUT, jsonText, 'utf-8');

  // Write functions output
  mkdirSync(dirname(FUNCTIONS_OUT), { recursive: true });
  writeFileSync(FUNCTIONS_OUT, jsonText, 'utf-8');

  console.log(`Web output: ${WEB_OUT}`);
  console.log(`Functions output: ${FUNCTIONS_OUT}`);
  console.log(`SHA-256: ${sha256(jsonText)}`);
}

function main() {
  const isCheck = process.argv.includes('--check');
  const generated = buildOutput();

  if (isCheck) {
    for (const output of [WEB_OUT, FUNCTIONS_OUT]) {
      if (!existsSync(output)) {
        console.error(`Check failed: output does not exist: ${output}`);
        process.exit(1);
      }
      const existing = readFileSync(output, 'utf-8');
      if (existing !== generated) {
        console.error(`Check failed: generated output differs from ${output}`);
        process.exit(1);
      }
    }
    console.log('Check passed: outputs match');
  } else {
    writeOutputs(generated);
    console.log('Generated 240 reviewed questions');
  }
}

main();
