import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'sources', 'B1.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'B1.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.de-full-authored.1';
const QUOTAS = { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 };
const POSITIONS = [
  1, 3, 0, 2, 2, 0, 3, 1, 0, 2,
  1, 3, 3, 1, 2, 0, 2, 3, 0, 1,
  1, 0, 2, 3, 0, 3, 1, 2, 2, 1,
  3, 0, 3, 2, 0, 1, 1, 2, 0, 3,
];
const SOURCE_ORDER = [
  2, 6, 14, 22, 34, 10, 18, 26, 38, 30,
  1, 5, 17, 21, 29, 13, 9, 25, 33, 37,
  35, 15, 27, 3, 7, 19, 23, 11, 31, 39,
  4, 20, 16, 12, 32, 36, 24, 28, 8, 40,
].map((sourceNumber) => sourceNumber - 1);
const DIFFICULTIES = [
  2.300, 2.316, 2.335, 2.351, 2.374, 2.389, 2.407, 2.426, 2.443, 2.465,
  2.486, 2.503, 2.527, 2.546, 2.568, 2.583, 2.609, 2.631, 2.648, 2.672,
  2.694, 2.713, 2.737, 2.752, 2.779, 2.801, 2.819, 2.844, 2.861, 2.887,
  2.906, 2.924, 2.947, 2.969, 2.984, 3.008, 3.027, 3.051, 3.076, 3.100,
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (source.language !== 'de' || source.level !== 'B1' || source.publishable !== false) throw new Error('German B1 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored German B1 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} German B1 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('German B1 source order must contain every source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('German B1 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('German B1 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`German B1 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`German B1 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`German B1 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('de'));
  if (new Set(options).size !== 4) throw new Error(`German B1 item ${index + 1}: options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`German B1 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `The B1 situation “${item.scenario}” requires reliable connected control of ${item.targetConstruct}.`,
  vocabulary: `The B1 context “${item.scenario}” requires context-sensitive discrimination of ${item.targetConstruct}.`,
  reading: `This connected B1 text requires supported inference or relation tracking through ${item.targetConstruct}.`,
  pragmatics: `This familiar B1 interaction requires coordination of multiple practical components through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание требует надёжного контроля связной грамматической структуры уровня B1.`,
  vocabulary: `${item.canDoRu} Задание требует контекстно точного различения частотной лексики уровня B1.`,
  reading: `${item.canDoRu} Связный текст требует обоснованного вывода или отслеживания отношений уровня B1.`,
  pragmatics: `${item.canDoRu} Знакомая ситуация требует совместить несколько практических компонентов на уровне B1.`,
}[item.skill]);

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `de-b1-${String(index + 1).padStart(3, '0')}`,
    level: 'B1', difficulty: DIFFICULTIES[index], skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: `${item.explanation} Each alternative fails one explicit grammatical, evidential, discourse, or interactional relation.`,
    ambiguityNotesRu: `${item.explanationRu} Каждый другой вариант нарушает одну явную грамматическую, доказательную, дискурсивную или коммуникативную связь.`,
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'de',
  level: 'B1',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated German B1 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('German B1 candidate bank is up to date.');
}
