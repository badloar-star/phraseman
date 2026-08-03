import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank', 'sources', 'A2.json');
const OUTPUT = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank', 'A2.json');
const WRITE = process.argv.includes('--write');
const BANK_VERSION = '2026-08-02.es-full-authored.1';
const POSITIONS = [
  2, 0, 3, 1, 1, 3, 0, 2, 0, 3,
  1, 2, 3, 1, 2, 0, 1, 0, 3, 2,
  3, 2, 0, 1, 2, 1, 3, 0, 0, 2,
  1, 3, 1, 3, 2, 0, 2, 0, 1, 3,
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (source.language !== 'es' || source.level !== 'A2' || source.publishable !== false) {
  throw new Error('A2 source metadata is invalid');
}
if (!Array.isArray(source.items) || source.items.length !== 40) {
  throw new Error(`Expected 40 authored A2 items, found ${source.items?.length ?? 0}`);
}

const difficultyAt = (index) => Number((1.3 + (index * 0.9 / 39)).toFixed(3));
const cefrEn = (item) => ({
  grammar: `The familiar A2 situation “${item.scenario}” requires controlled use of ${item.targetConstruct}.`,
  vocabulary: `The A2 context “${item.scenario}” requires the learner to discriminate ${item.targetConstruct}.`,
  reading: `This short A2 text requires integration of explicit details through ${item.targetConstruct}.`,
  pragmatics: `This familiar A2 interaction requires an appropriate response through ${item.targetConstruct}.`,
}[item.skill]);
const cefrRu = (item) => ({
  grammar: `${item.canDoRu} Проверяется контролируемое употребление одной грамматической конструкции уровня A2.`,
  vocabulary: `${item.canDoRu} Проверяется различение частотной лексики в знакомом контексте уровня A2.`,
  reading: `${item.canDoRu} Короткий текст требует сопоставить явно сообщённые детали уровня A2.`,
  pragmatics: `${item.canDoRu} Знакомая ситуация требует уместной реакции и одной практической детали уровня A2.`,
}[item.skill]);
const ambiguityEn = (item, index) => [
  `${item.explanation} Each alternative conflicts with an explicit cue or changes the requested operation.`,
  `The stimulus supports “${item.answer}” directly. ${item.explanation} The alternatives fail a stated detail.`,
  `“${item.answer}” preserves every stated condition. ${item.explanation} No distractor does so.`,
  `The decisive contextual cue selects “${item.answer}”. The other responses answer a different question or use an incompatible form.`,
][index % 4];
const ambiguityRu = (item, index) => [
  `${item.explanationRu} Каждый другой ответ противоречит явной подсказке или меняет требуемое действие.`,
  `Стимул прямо поддерживает «${item.answer}». ${item.explanationRu} Остальные ответы нарушают указанную деталь.`,
  `Форма «${item.answer}» сохраняет все условия контекста. ${item.explanationRu} Дистракторы этого не делают.`,
  `Решающая контекстная подсказка указывает на «${item.answer}»; другие ответы решают иную задачу или используют несовместимую форму.`,
][index % 4];

const questions = source.items.map((item, index) => {
  const position = POSITIONS[index];
  const entries = item.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(position, 0, { text: item.answer, correct: true });
  return {
    id: `es-a2-${String(index + 1).padStart(3, '0')}`,
    level: 'A2',
    difficulty: difficultyAt(index),
    skill: item.skill,
    format: item.format,
    scenario: item.scenario,
    prompt: item.prompt,
    scenarioRu: item.scenarioRu,
    instructionRu: item.instructionRu,
    stimulus: item.stimulus,
    options: entries.map(({ text }) => text),
    correctIndex: position,
    explanation: item.explanation,
    explanationRu: item.explanationRu,
    targetConstruct: item.targetConstruct,
    targetConstructRu: item.targetConstructRu,
    cefrRationale: cefrEn(item),
    cefrRationaleRu: cefrRu(item),
    dialect: 'standard',
    reviewStatus: 'self_checked',
    ambiguityNotes: ambiguityEn(item, index),
    ambiguityNotesRu: ambiguityRu(item, index),
    canDoRu: item.canDoRu,
    claimBasis: 'SYNTHESIS',
    distractorRationalesRu: Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]])),
  };
});

const levelFile = {
  schemaVersion: 3,
  bankVersion: BANK_VERSION,
  language: 'es',
  level: 'A2',
  dialect: 'standard',
  publishable: false,
  questions,
};
const expected = `${JSON.stringify(levelFile, null, 2)}\n`;

if (WRITE) {
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log('Wrote isolated Spanish A2 candidate bank (40 items).');
} else if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
  console.error(`Out of date: ${path.relative(ROOT, OUTPUT)}`);
  process.exitCode = 1;
} else {
  console.log('Spanish A2 candidate bank is up to date.');
}
