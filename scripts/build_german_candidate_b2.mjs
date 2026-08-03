import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'sources', 'B2.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'B2.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.de-full-authored.1';
const QUOTAS = { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 };
const POSITIONS = [
  3, 1, 0, 2, 1, 3, 2, 0, 0, 2,
  3, 1, 2, 0, 1, 3, 1, 2, 0, 3,
  3, 0, 2, 1, 0, 1, 3, 2, 2, 3,
  1, 0, 3, 2, 1, 0, 2, 3, 0, 1,
];
const SOURCE_ORDER = [
  2, 10, 6, 14, 22, 18, 26, 30, 34, 38,
  5, 9, 13, 21, 33, 1, 17, 25, 29, 37,
  7, 27, 19, 35, 23, 11, 15, 31, 39, 3,
  4, 8, 12, 20, 24, 32, 28, 16, 36, 40,
].map((sourceNumber) => sourceNumber - 1);
const DIFFICULTIES = [
  3.200, 3.214, 3.231, 3.245, 3.265, 3.278, 3.294, 3.310, 3.325, 3.344,
  3.363, 3.378, 3.399, 3.415, 3.435, 3.448, 3.470, 3.490, 3.505, 3.526,
  3.545, 3.561, 3.582, 3.596, 3.619, 3.638, 3.654, 3.676, 3.691, 3.714,
  3.730, 3.746, 3.766, 3.785, 3.799, 3.820, 3.836, 3.857, 3.879, 3.900,
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (source.language !== 'de' || source.level !== 'B2' || source.publishable !== false) throw new Error('German B2 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored German B2 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} German B2 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('German B2 source order must contain every source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('German B2 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('German B2 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`German B2 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`German B2 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`German B2 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('de'));
  if (new Set(options).size !== 4) throw new Error(`German B2 item ${index + 1}: options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`German B2 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `The B2 situation “${item.scenario}” requires reliable multi-clause control of ${item.targetConstruct}.`,
  vocabulary: `The B2 context “${item.scenario}” requires precise register-aware discrimination of ${item.targetConstruct}.`,
  reading: `This B2 text requires supported inference or integration through ${item.targetConstruct}.`,
  pragmatics: `This B2 interaction requires coordinated stance, evidence, and outcome control through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание требует надёжного управления многокомпонентной грамматической связью уровня B2.`,
  vocabulary: `${item.canDoRu} Задание требует точного различения лексики и регистра уровня B2.`,
  reading: `${item.canDoRu} Текст требует обоснованного вывода или интеграции нескольких отношений уровня B2.`,
  pragmatics: `${item.canDoRu} Ситуация требует одновременно контролировать позицию, данные и практический результат уровня B2.`,
}[item.skill]);

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `de-b2-${String(index + 1).padStart(3, '0')}`,
    level: 'B2', difficulty: DIFFICULTIES[index], skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: `${item.explanation} Each alternative fails one explicit grammatical, evidential, scope, register, or interactional constraint.`,
    ambiguityNotesRu: `${item.explanationRu} Каждый другой вариант нарушает одно явное грамматическое, доказательное, смысловое, регистровое или коммуникативное ограничение.`,
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'de',
  level: 'B2',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated German B2 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('German B2 candidate bank is up to date.');
}
