import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'it', 'candidate-bank', 'sources', 'C1.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'it', 'candidate-bank', 'C1.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-03.it-full-authored.1';
const QUOTAS = { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 };
const UPPER_BAND_EVIDENCE_QUOTAS = { grammar: 4, vocabulary: 4, reading: 4, pragmatics: 4 };
const POSITIONS = [
  2, 0, 3, 1, 0, 2, 1, 3, 3, 1,
  2, 0, 1, 3, 0, 2, 2, 1, 3, 0,
  1, 2, 0, 3, 2, 0, 3, 1, 1, 3,
  0, 2, 1, 0, 3, 2, 0, 1, 3, 2,
];
const SOURCE_ORDER = [
  22, 1, 24, 4, 11, 21, 2, 13, 27, 7,
  14, 5, 32, 9, 19, 3, 25, 8, 12, 17,
  29, 6, 28, 15, 34, 10, 18, 23, 31, 20,
  37, 16, 35, 26, 39, 30, 33, 36, 38, 40,
].map((sourceNumber) => sourceNumber - 1);
const DIFFICULTIES = [
  4.000, 4.014, 4.031, 4.045, 4.065, 4.078, 4.094, 4.110, 4.125, 4.144,
  4.163, 4.178, 4.199, 4.215, 4.235, 4.248, 4.270, 4.290, 4.305, 4.326,
  4.345, 4.361, 4.382, 4.396, 4.419, 4.438, 4.454, 4.476, 4.491, 4.514,
  4.530, 4.546, 4.566, 4.585, 4.599, 4.620, 4.636, 4.657, 4.679, 4.700,
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const evidenceSourceIndexes = new Set(Object.entries(UPPER_BAND_EVIDENCE_QUOTAS).flatMap(([skill, count]) => {
  const candidates = source.items.flatMap((item, sourceIndex) => item.skill === skill ? [sourceIndex] : []);
  if (candidates.length < count) throw new Error(`Not enough ${skill} items for C1 upper-band evidence`);
  return Array.from({ length: count }, (_, slot) => candidates[Math.round(slot * (candidates.length - 1) / (count - 1))]);
}));
if (source.language !== 'it' || source.level !== 'C1' || source.publishable !== false) throw new Error('Italian C1 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored Italian C1 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} Italian C1 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('Italian C1 source order must contain every source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('Italian C1 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('Italian C1 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`Italian C1 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`Italian C1 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`Italian C1 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('it'));
  if (new Set(options).size !== 4) throw new Error(`Italian C1 item ${index + 1}: options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`Italian C1 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `The C1 situation “${item.scenario}” requires discourse-sensitive control of ${item.targetConstruct}.`,
  vocabulary: `The C1 context “${item.scenario}” requires precise, register-aware discrimination of ${item.targetConstruct}.`,
  reading: `This C1 text requires stance, evidence, scope, or multi-step inference through ${item.targetConstruct}.`,
  pragmatics: `This C1 interaction requires calibrated management of face, evidence, accountability, and outcome through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание требует дискурсивно обусловленного управления сложной грамматикой уровня C1.`,
  vocabulary: `${item.canDoRu} Задание требует точного различения значения и регистра уровня C1.`,
  reading: `${item.canDoRu} Текст требует отслеживания позиции, доказательств, области действия или многошагового вывода уровня C1.`,
  pragmatics: `${item.canDoRu} Ситуация требует калиброванно управлять лицом, данными, ответственностью и результатом уровня C1.`,
}[item.skill]);

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `it-c1-${String(index + 1).padStart(3, '0')}`,
    level: 'C1', difficulty: DIFFICULTIES[index], skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: `${item.explanation} Each alternative fails one explicit grammatical, evidential, scope, register, causal, or interactional constraint.`,
    ambiguityNotesRu: `${item.explanationRu} Каждый другой вариант нарушает одно явное грамматическое, доказательное, смысловое, регистровое, причинное или коммуникативное ограничение.`,
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    upperBandEvidence: evidenceSourceIndexes.has(sourceIndex),
    ...(evidenceSourceIndexes.has(sourceIndex) ? { upperBandEvidenceRu: `${item.canDoRu} Ключевой проверяемый аспект: ${item.targetConstructRu}. Задание требует самостоятельного анализа без подсказки более низкого уровня.` } : {}),
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'it',
  level: 'C1',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated Italian C1 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('Italian C1 candidate bank is up to date.');
}
