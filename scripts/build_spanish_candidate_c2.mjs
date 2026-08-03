import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank', 'sources', 'C2.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank', 'C2.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.es-full-authored.1';
const QUOTAS = { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 };
const UPPER_BAND_EVIDENCE_QUOTAS = { grammar: 0, vocabulary: 4, reading: 6, pragmatics: 6 };
const POSITIONS = [
  3, 1, 0, 2, 1, 3, 2, 0, 0, 2,
  3, 1, 2, 0, 1, 3, 1, 2, 0, 3,
  3, 0, 2, 1, 0, 1, 3, 2, 2, 3,
  1, 0, 3, 2, 1, 0, 2, 3, 0, 1,
];
// Expert pre-calibration order: controlled lexical nuance -> discourse grammar
// -> multi-layer critical interpretation -> high-stakes interaction design.
const SOURCE_ORDER = [
  13, 1, 17, 29, 9, 5, 25, 21,
  8, 28, 20, 16, 32, 24, 12, 4,
  6, 10, 18, 30, 35, 37, 2, 14, 22, 26, 33, 39,
  3, 7, 11, 15, 19, 23, 27, 31, 34, 36, 38, 40,
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
if (source.language !== 'es' || source.level !== 'C2' || source.publishable !== false) throw new Error('C2 source metadata is invalid');
if (!Array.isArray(source.items) || source.items.length !== 40) throw new Error(`Expected 40 authored C2 items, found ${source.items?.length ?? 0}`);
for (const [skill, expected] of Object.entries(QUOTAS)) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== expected) throw new Error(`Expected ${expected} C2 ${skill} items, found ${count}`);
}
if (new Set(SOURCE_ORDER).size !== 40 || SOURCE_ORDER.some((index) => index < 0 || index >= 40)) throw new Error('C2 source order must contain each source row exactly once');
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('C2 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('C2 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!(item.skill in QUOTAS)) throw new Error(`C2 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`C2 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`C2 item ${index + 1}: expected three distractors`);
  const options = [item.answer, ...item.distractors.map(({ text }) => text)].map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('es'));
  if (new Set(options).size !== 4) throw new Error(`C2 item ${index + 1}: answer options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) throw new Error(`C2 item ${index + 1}: missing Russian distractor rationale`);
  }
});

const cefrEn = (item) => ({
  grammar: `The C2 situation “${item.scenario}” requires effortless discourse-sensitive control of ${item.targetConstruct} under competing cues.`,
  vocabulary: `The C2 context “${item.scenario}” requires exact control of semantic scope, connotation, collocation, and register through ${item.targetConstruct}.`,
  reading: `This C2 text requires precise integration of voice, scope, presupposition, evidence, or non-linear argument through ${item.targetConstruct}.`,
  pragmatics: `This C2 interaction requires simultaneous control of truth, stance, face, accountability, risk, and outcome through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание требует свободно управлять дискурсивно обусловленной формой при конкурирующих сигналах уровня C2.`,
  vocabulary: `${item.canDoRu} Задание требует точного контроля смысловой области, коннотации, сочетаемости и регистра уровня C2.`,
  reading: `${item.canDoRu} Текст требует точной интеграции голоса, области действия, пресуппозиции, доказательств или нелинейного аргумента уровня C2.`,
  pragmatics: `${item.canDoRu} Ситуация требует одновременно контролировать истинность, позицию, сохранение лица, подотчётность, риск и результат на уровне C2.`,
}[item.skill]);
const ambiguityEn = (item, index) => [
  `${item.explanation} Each alternative violates one decisive semantic, scope, evidential, or interactional constraint.`,
  `The complete C2 context supports “${item.answer}”. ${item.explanation} Every alternative preserves a sophisticated but incomplete reading.`,
  `Only “${item.answer}” integrates all stated and projected constraints without adding an unsupported claim. ${item.explanation}`,
  `The decisive discourse evidence selects “${item.answer}”; each distractor is locally coherent but fails the complete C2 operation.`,
][index % 4];
const ambiguityRu = (item, index) => [
  `${item.explanationRu} Каждый другой вариант нарушает одно решающее смысловое, доказательное, коммуникативное ограничение или ограничение области действия.`,
  `Полный контекст C2 поддерживает «${item.answer}». ${item.explanationRu} Каждый другой вариант сохраняет сложное, но неполное прочтение.`,
  `Только «${item.answer}» объединяет все явные и проецируемые ограничения без добавления неподтверждённого утверждения. ${item.explanationRu}`,
  `Решающие данные дискурса указывают на «${item.answer}»; каждый дистрактор локально связен, но не выполняет полную операцию C2.`,
][index % 4];

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `es-c2-${String(index + 1).padStart(3, '0')}`,
    level: 'C2', difficulty: DIFFICULTIES[index], skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item), dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: item.ambiguityTailEn
      ? `${item.explanation} ${item.ambiguityTailEn}`
      : ambiguityEn(item, index),
    ambiguityNotesRu: item.ambiguityTailRu
      ? `${item.explanationRu} ${item.ambiguityTailRu}`
      : ambiguityRu(item, index),
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    upperBandEvidence: evidenceSourceIndexes.has(sourceIndex),
    ...(evidenceSourceIndexes.has(sourceIndex) ? { upperBandEvidenceRu: `${item.canDoRu} Ключевой проверяемый аспект: ${item.targetConstructRu}. Задание требует самостоятельного анализа без подсказки более низкого уровня.` } : {}),
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'es',
  level: 'C2',
  dialect: 'standard',
  publishable: false,
  questions,
}, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated Spanish C2 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('Spanish C2 candidate bank is up to date.');
}
