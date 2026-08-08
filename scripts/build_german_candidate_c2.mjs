import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'sources', 'C2.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'C2.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.de-full-authored.1';
const QUOTAS = { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 };
const UPPER_BAND_EVIDENCE_QUOTAS = { grammar: 0, vocabulary: 4, reading: 6, pragmatics: 6 };
const POSITIONS = [
  1, 3, 0, 2, 3, 1, 2, 0, 0, 2,
  1, 3, 2, 0, 3, 1, 1, 2, 0, 3,
  2, 0, 3, 1, 0, 2, 1, 3, 3, 0,
  2, 1, 0, 3, 1, 2, 3, 0, 2, 1,
];
const SOURCE_ORDER = [
  7, 1, 11, 17, 27, 32, 12, 22, 4, 9,
  14, 19, 24, 34, 29, 40, 2, 8, 15, 18,
  5, 28, 31, 35, 21, 25, 37, 39, 6, 3,
  10, 13, 16, 20, 23, 26, 30, 33, 36, 38,
].map((sourceNumber) => sourceNumber - 1);
const DIFFICULTIES = [
  4.800, 4.814, 4.831, 4.845, 4.865, 4.878, 4.894, 4.910, 4.925, 4.944,
  4.963, 4.978, 4.999, 5.015, 5.035, 5.048, 5.070, 5.090, 5.105, 5.126,
  5.145, 5.161, 5.182, 5.196, 5.219, 5.238, 5.254, 5.276, 5.291, 5.314,
  5.330, 5.346, 5.366, 5.385, 5.399, 5.420, 5.436, 5.457, 5.479, 5.500,
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const evidenceSourceIndexes = new Set(Object.entries(UPPER_BAND_EVIDENCE_QUOTAS).flatMap(([skill, count]) => {
  if (count === 0) return [];
  const candidates = source.items.flatMap((item, sourceIndex) => item.skill === skill ? [sourceIndex] : []);
  if (candidates.length < count) throw new Error(`Not enough ${skill} items for C2 upper-band evidence`);
  return Array.from({ length: count }, (_, slot) => candidates[Math.round(slot * (candidates.length - 1) / (count - 1))]);
}));
if (source.language !== 'de' || source.level !== 'C2' || source.publishable !== false) throw new Error('German C2 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored German C2 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} German C2 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('German C2 source order must contain every source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('German C2 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('German C2 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`German C2 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`German C2 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`German C2 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('de'));
  if (new Set(options).size !== 4) throw new Error(`German C2 item ${index + 1}: options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`German C2 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `The C2 situation “${item.scenario}” requires near-native discourse control of ${item.targetConstruct}.`,
  vocabulary: `The C2 context “${item.scenario}” requires exact denotational, collocational, and stance control of ${item.targetConstruct}.`,
  reading: `This C2 text requires precise scope, voice, causal, genre, or multi-layer inference through ${item.targetConstruct}.`,
  pragmatics: `This C2 interaction requires simultaneous management of institutional legitimacy, evidence, face, accountability, and consequence through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание требует почти носительского дискурсивного контроля сложной грамматики уровня C2.`,
  vocabulary: `${item.canDoRu} Задание требует точного контроля значения, сочетаемости, регистра и позиции уровня C2.`,
  reading: `${item.canDoRu} Текст требует точного анализа области действия, голоса, причинности, жанра или многоуровневого вывода уровня C2.`,
  pragmatics: `${item.canDoRu} Ситуация требует одновременно управлять легитимностью, данными, лицом, ответственностью и последствиями уровня C2.`,
}[item.skill]);

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `de-c2-${String(index + 1).padStart(3, '0')}`,
    level: 'C2', difficulty: DIFFICULTIES[index], skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: `${item.explanation} Each alternative fails one explicit scope, voice, grammatical, evidential, register, causal, or institutional constraint.`,
    ambiguityNotesRu: `${item.explanationRu} Каждый другой вариант нарушает одно явное ограничение области действия, голоса, грамматики, доказательств, регистра, причинности или институциональной логики.`,
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    upperBandEvidence: evidenceSourceIndexes.has(sourceIndex),
    ...(evidenceSourceIndexes.has(sourceIndex) ? { upperBandEvidenceRu: `${item.canDoRu} Ключевой проверяемый аспект: ${item.targetConstructRu}. Задание требует самостоятельного анализа без подсказки более низкого уровня.` } : {}),
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'de',
  level: 'C2',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated German C2 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('German C2 candidate bank is up to date.');
}
