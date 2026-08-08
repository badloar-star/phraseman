import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'sources', 'A2.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'A2.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.de-full-authored.1';
const QUOTAS = { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 };
const POSITIONS = [
  2, 0, 3, 1, 1, 3, 0, 2, 0, 3,
  1, 2, 3, 1, 2, 0, 1, 0, 3, 2,
  3, 2, 0, 1, 2, 1, 3, 0, 0, 2,
  1, 3, 1, 3, 2, 0, 2, 0, 1, 3,
];
const SOURCE_ORDER = [
  18, 10, 22, 38, 14, 34, 6, 26, 2, 30,
  1, 25, 9, 13, 37, 29, 5, 33, 17, 21,
  3, 23, 11, 19, 27, 7, 15, 35, 39, 31,
  8, 4, 12, 20, 28, 16, 32, 36, 40, 24,
].map((sourceNumber) => sourceNumber - 1);
const difficultyAt = (index) => Number((1.3 + (index * 0.9 / 39)).toFixed(3));

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (source.language !== 'de' || source.level !== 'A2' || source.publishable !== false) throw new Error('German A2 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored German A2 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} German A2 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('German A2 source order must contain every source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('German A2 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('German A2 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`German A2 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`German A2 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`German A2 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('de'));
  if (new Set(options).size !== 4) throw new Error(`German A2 item ${index + 1}: options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`German A2 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `The familiar A2 situation “${item.scenario}” requires controlled use of ${item.targetConstruct}.`,
  vocabulary: `The A2 context “${item.scenario}” requires discrimination of ${item.targetConstruct}.`,
  reading: `This short connected A2 text requires integration of explicit details through ${item.targetConstruct}.`,
  pragmatics: `This familiar A2 interaction requires a two-part appropriate response through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание проверяет управляемое использование частотной формы уровня A2 в знакомом контексте.`,
  vocabulary: `${item.canDoRu} Задание требует различить частотные слова или устойчивые сочетания уровня A2.`,
  reading: `${item.canDoRu} Короткий связный текст требует объединить несколько явно указанных деталей уровня A2.`,
  pragmatics: `${item.canDoRu} Знакомая ситуация требует уместно совместить две простые коммуникативные функции уровня A2.`,
}[item.skill]);

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `de-a2-${String(index + 1).padStart(3, '0')}`,
    level: 'A2', difficulty: difficultyAt(index), skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: `${item.explanation} Each alternative fails one explicit form, fact, or required interaction component.`,
    ambiguityNotesRu: `${item.explanationRu} Каждый другой вариант нарушает одну явную форму, факт или обязательный компонент взаимодействия.`,
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'de',
  level: 'A2',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated German A2 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('German A2 candidate bank is up to date.');
}
