import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank', 'sources', 'B1.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank', 'B1.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.es-full-authored.1';
const POSITIONS = [
  1, 3, 0, 2, 2, 0, 3, 1, 0, 2,
  1, 3, 3, 1, 2, 0, 2, 3, 0, 1,
  1, 0, 2, 3, 0, 3, 1, 2, 2, 1,
  3, 0, 3, 2, 0, 1, 1, 2, 0, 3,
];
const REQUIRED_SKILLS = ['grammar', 'vocabulary', 'reading', 'pragmatics'];
// Source rows are authored by blueprint topic. Runtime order is an expert pre-calibration:
// explicit lexical discrimination -> controlled form -> detail integration -> inference/negotiation.
const SOURCE_ORDER = [
  4, 11, 15, 7, 19, 27, 31, 35, 39, 23,
  13, 33, 29, 17, 5, 21, 9, 25, 2, 6,
  1, 26, 10, 38, 3, 24, 12, 16, 28, 18,
  22, 34, 14, 30, 8, 20, 32, 36, 40, 37,
].map((sourceNumber) => sourceNumber - 1);
const DIFFICULTIES = [
  2.300, 2.316, 2.335, 2.351, 2.374, 2.389, 2.407, 2.426, 2.443, 2.465,
  2.486, 2.503, 2.527, 2.546, 2.568, 2.583, 2.609, 2.631, 2.648, 2.672,
  2.694, 2.713, 2.737, 2.752, 2.779, 2.801, 2.819, 2.844, 2.861, 2.887,
  2.906, 2.924, 2.947, 2.969, 2.984, 3.008, 3.027, 3.051, 3.076, 3.100,
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (source.language !== 'es' || source.level !== 'B1' || source.publishable !== false) {
  throw new Error('B1 source metadata is invalid');
}
if (!Array.isArray(source.items) || source.items.length !== 40) {
  throw new Error(`Expected 40 authored B1 items, found ${source.items?.length ?? 0}`);
}
for (const skill of REQUIRED_SKILLS) {
  const count = source.items.filter((item) => item.skill === skill).length;
  if (count !== 10) throw new Error(`Expected 10 B1 ${skill} items, found ${count}`);
}
if (new Set(source.items.map(({ stimulus }) => stimulus)).size !== 40) throw new Error('B1 stimuli must be unique');
if (new Set(source.items.map(({ targetConstruct }) => targetConstruct)).size !== 40) throw new Error('B1 target constructs must be unique');
source.items.forEach((item, index) => {
  if (!REQUIRED_SKILLS.includes(item.skill)) throw new Error(`B1 item ${index + 1}: invalid skill`);
  if (!['multiple-choice', 'gap-fill'].includes(item.format)) throw new Error(`B1 item ${index + 1}: invalid format`);
  if (!Array.isArray(item.distractors) || item.distractors.length !== 3) throw new Error(`B1 item ${index + 1}: expected three distractors`);
  const normalizedOptions = [item.answer, ...item.distractors.map(({ text }) => text)]
    .map((text) => text.normalize('NFKC').trim().toLocaleLowerCase('es'));
  if (new Set(normalizedOptions).size !== 4) throw new Error(`B1 item ${index + 1}: answer options must be unique`);
  for (const distractor of item.distractors) {
    if (!distractor.reasonRu || !/[\u0400-\u04ff]/u.test(distractor.reasonRu)) {
      throw new Error(`B1 item ${index + 1}: missing Russian distractor rationale`);
    }
  }
});

const cefrEn = (item) => ({
  grammar: `The B1 situation “${item.scenario}” requires controlled use of ${item.targetConstruct} in connected meaning.`,
  vocabulary: `The B1 context “${item.scenario}” requires precise discrimination of ${item.targetConstruct} rather than isolated word recognition.`,
  reading: `This B1 text requires connected interpretation through ${item.targetConstruct}.`,
  pragmatics: `This B1 interaction requires a contextually appropriate response through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Задание проверяет контролируемое употребление грамматической конструкции уровня B1 в связном контексте.`,
  vocabulary: `${item.canDoRu} Задание проверяет точное различение тематической лексики уровня B1, а не узнавание отдельного слова.`,
  reading: `${item.canDoRu} Короткий связный текст требует сопоставить несколько деталей или отношений уровня B1.`,
  pragmatics: `${item.canDoRu} Ситуация требует уместной реакции с учётом цели, тона и практического результата на уровне B1.`,
}[item.skill]);
const ambiguityEn = (item, index) => [
  `${item.explanation} Each alternative fails at least one explicit condition in the stimulus.`,
  `The full context supports “${item.answer}”. ${item.explanation} The other options alter the requested meaning or outcome.`,
  `“${item.answer}” is the only option preserving every stated relationship. ${item.explanation}`,
  `The decisive contextual evidence selects “${item.answer}”; each distractor conflicts with a stated detail, form, or communicative goal.`,
][index % 4];
const ambiguityRu = (item, index) => [
  `${item.explanationRu} Каждый другой вариант нарушает хотя бы одно явно указанное условие.`,
  `Полный контекст поддерживает «${item.answer}». ${item.explanationRu} Остальные варианты меняют требуемый смысл или результат.`,
  `Только «${item.answer}» сохраняет все названные отношения. ${item.explanationRu}`,
  `Решающие данные контекста указывают на «${item.answer}»; каждый дистрактор противоречит указанной детали, форме или цели общения.`,
][index % 4];

const questions = SOURCE_ORDER.map((sourceIndex, index) => {
  const item = source.items[sourceIndex];
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `es-b1-${String(index + 1).padStart(3, '0')}`,
    level: 'B1', difficulty: DIFFICULTIES[index], skill: item.skill, format: item.format,
    scenario: item.scenario, prompt: item.prompt, scenarioRu: item.scenarioRu, instructionRu: item.instructionRu,
    stimulus: item.stimulus, options: entries.map(({ text }) => text), correctIndex: position,
    explanation: item.explanation, explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct, targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item), cefrRationaleRu: cefrRu(item),
    dialect: 'standard', reviewStatus: 'self_checked',
    ambiguityNotes: ambiguityEn(item, index), ambiguityNotesRu: ambiguityRu(item, index),
    canDoRu: item.canDoRu, claimBasis: 'SYNTHESIS',
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => (
      entry.correct ? [] : [[String(optionIndex), entry.reasonRu]]
    ))),
  };
});

const levelFile = {
  schemaVersion: 3, bankVersion: BANK_VERSION, language: 'es', level: 'B1', dialect: 'standard', publishable: false, questions,
};
const expected = `${JSON.stringify(levelFile, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated Spanish B1 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('Spanish B1 candidate bank is up to date.');
}
