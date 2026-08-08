import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'content', 'language-test-pilots', 'it', 'candidate-bank');
const SOURCE = path.join(OUT_DIR, 'sources', 'A1.json');
const OUTPUT = path.join(OUT_DIR, 'A1.json');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-03.it-full-authored.1';
const QUOTAS = { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 };
const POSITIONS = [
  0, 2, 1, 3, 1, 0, 3, 2, 2, 1,
  3, 0, 1, 2, 0, 3, 2, 1, 0, 3,
  3, 1, 2, 0, 1, 3, 0, 2, 2, 0,
  1, 3, 0, 2, 3, 1, 2, 0, 1, 3,
];
const SOURCE_ORDER = [
  2, 4, 1, 3, 6, 8, 5, 7, 10, 12,
  9, 11, 14, 16, 13, 15, 18, 20, 17, 19,
  22, 24, 21, 23, 26, 28, 25, 27, 30, 32,
  29, 31, 34, 36, 33, 35, 38, 40, 37, 39,
].map((sourceNumber) => sourceNumber - 1);
const difficultyAt = (index) => index === 0 ? 0.5 : index === 1 ? 0.63 : Number((0.66 + ((index - 2) * 0.54 / 37)).toFixed(3));

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (source.language !== 'it' || source.level !== 'A1' || source.publishable !== false) throw new Error('Italian A1 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored Italian A1 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} Italian A1 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('Italian A1 source order must contain every source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('Italian A1 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('Italian A1 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`Italian A1 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`Italian A1 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`Italian A1 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('it'));
  if (new Set(options).size !== 4) throw new Error(`Italian A1 item ${index + 1}: options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`Italian A1 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `In “${item.scenario}”, A1 evidence comes from controlling ${item.targetConstruct} in one familiar utterance.`,
  vocabulary: `In “${item.scenario}”, A1 evidence comes from recognising ${item.targetConstruct} in an immediate concrete context.`,
  reading: `In “${item.scenario}”, A1 evidence comes from locating explicit familiar information through ${item.targetConstruct}.`,
  pragmatics: `In “${item.scenario}”, A1 evidence comes from completing one familiar social or service exchange through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Проверяется контроль одной частотной формы в знакомом высказывании уровня A1.`,
  vocabulary: `${item.canDoRu} Проверяется узнавание частотной лексики в непосредственном конкретном контексте уровня A1.`,
  reading: `${item.canDoRu} Проверяется извлечение явно указанной знакомой информации уровня A1.`,
  pragmatics: `${item.canDoRu} Проверяется завершение одной знакомой бытовой или сервисной ситуации уровня A1.`,
}[item.skill]);

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `it-a1-${String(index + 1).padStart(3, '0')}`,
    level: 'A1', difficulty: difficultyAt(index), skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: `${item.explanation} The other options fail the explicit form, fact, or immediate communicative purpose.`,
    ambiguityNotesRu: `${item.explanationRu} Другие варианты нарушают явную форму, факт или непосредственную коммуникативную цель.`,
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expectedLevel = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'it',
  level: 'A1',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;
const expectedManifest = `${JSON.stringify({
  schemaVersion: 1,
  bankVersion: BANK_VERSION,
  language: 'it',
  status: 'candidate_bank',
  publishable: false,
  authorReviewStatus: 'self_checked',
  externalReviewStatus: 'pending',
  completedLevels: [],
  authoredLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expectedLevel, 'utf8');
  fs.writeFileSync(MANIFEST, expectedManifest, 'utf8');
  console.log('Wrote isolated Italian A1 candidate bank (40 items) and manifest.');
} else {
  let stale = false;
  for (const [file, expected] of [[OUTPUT, expectedLevel], [MANIFEST, expectedManifest]]) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected) {
      console.error(`Out of date: ${path.relative(ROOT, file)}`);
      stale = true;
    }
  }
  if (stale) process.exitCode = 1;
  else console.log('Italian A1 candidate bank is up to date.');
}
