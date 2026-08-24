import assert from 'node:assert/strict';
import { selectTaskDistractors } from '../modules/learning-v2/content/source/task_specific_distractors_v1';
import { lesson1DistractorChoicesV2 } from '../modules/learning-v2/content/source/lesson1_distractor_catalog_v2';

const areRejected = [
  { value: 'isn’t', reasonCode: 'grammar:are:isnt' },
  { value: 'aren’t', reasonCode: 'grammar:are:arent' },
  { value: 'Is', reasonCode: 'grammar:are:is' },
  { value: 'Do', reasonCode: 'grammar:are:do' },
];

const builder = selectTaskDistractors({
  family: 'phrase_builder',
  target: 'Are you tired?',
  rejectedAnswers: areRejected,
});
assert.equal(builder.responseMode, 'extra_tokens');
assert.equal(builder.correct, 'Are');
assert.deepEqual(builder.distractors.map((item) => item.value), ['Is', 'Do']);
assert.deepEqual(
  builder.distractors.map((item) => item.testedDimension),
  ['agreement', 'auxiliary'],
);

const grammarGap = selectTaskDistractors({
  family: 'context_gap_grammar',
  target: 'Are you happy?',
  rejectedAnswers: areRejected,
});
assert.equal(grammarGap.responseMode, 'single_tokens');
assert.deepEqual(grammarGap.distractors.map((item) => item.value), ['Is', 'Do']);

const session2NegationEvidence = [
  { value: 'no', reasonCode: 'orthographic:not:no' },
  { value: 'now', reasonCode: 'phonetic:not:now' },
  { value: 'note', reasonCode: 'orthographic:not:note' },
];
const session2NegationGap = selectTaskDistractors({
  family: 'context_gap_grammar',
  target: 'I am not ready',
  rejectedAnswers: session2NegationEvidence,
  sessionOrdinal: 2,
});
assert.equal(session2NegationGap.correct, 'not');
assert.deepEqual(
  session2NegationGap.distractors.map((item) => item.value),
  ['no', 'now'],
  'Session 2 phrase applications must test the new word not, not the old am form',
);
const session2NegationSpeed = selectTaskDistractors({
  family: 'speed_match',
  target: 'I am not here',
  rejectedAnswers: session2NegationEvidence,
  sessionOrdinal: 2,
});
assert.equal(session2NegationSpeed.correct, 'not');
assert.deepEqual(
  session2NegationSpeed.distractors.map((item) => item.value),
  ['I am no here', 'I am now here'],
);

const session3StateEvidence = [
  { value: 'an', reasonCode: 'phonetic:am:an' },
  { value: 'm', reasonCode: 'orthographic:am:m' },
  { value: 'heavy', reasonCode: 'phonetic:happy:heavy' },
  { value: 'happen', reasonCode: 'phonetic:happy:happen' },
];
const session3StateGap = selectTaskDistractors({
  family: 'context_gap_grammar',
  target: 'I am happy',
  rejectedAnswers: session3StateEvidence,
  sessionOrdinal: 3,
});
assert.equal(session3StateGap.correct, 'happy');
assert.deepEqual(
  session3StateGap.distractors.map((item) => item.value),
  ['heavy', 'happen'],
  'Session 3 must test the new state word rather than repeat the old am form',
);
const session3StateSpeed = selectTaskDistractors({
  family: 'speed_match',
  target: 'I am happy',
  rejectedAnswers: session3StateEvidence,
  sessionOrdinal: 3,
});
assert.deepEqual(
  session3StateSpeed.distractors.map((item) => item.value),
  ['I am heavy', 'I am happen'],
);

const session4ContractionEvidence = [
  { value: 'Im', reasonCode: "orthographic:I'm:missing_apostrophe" },
  { value: "I'am", reasonCode: "orthographic:I'm:apostrophe_after_a" },
  { value: 'dizzy', reasonCode: 'phonetic:busy:dizzy' },
  { value: 'lazy', reasonCode: 'semantic_neighbor:busy:lazy' },
];
const session4ContractionGap = selectTaskDistractors({
  family: 'context_gap_grammar',
  target: "I'm busy",
  rejectedAnswers: session4ContractionEvidence,
  sessionOrdinal: 4,
});
assert.equal(session4ContractionGap.correct, "I'm");
assert.deepEqual(
  session4ContractionGap.distractors.map((item) => item.value),
  ['Im', "I'am"],
  'Session 4 must test the apostrophe position instead of an already-known state word',
);
const session4ContractionSpeed = selectTaskDistractors({
  family: 'speed_match',
  target: "I'm busy",
  rejectedAnswers: session4ContractionEvidence,
  sessionOrdinal: 4,
});
assert.deepEqual(
  session4ContractionSpeed.distractors.map((item) => item.value),
  ['Im busy', "I'am busy"],
);

const preposition = selectTaskDistractors({
  family: 'speed_match',
  target: 'Are you at home?',
  rejectedAnswers: [
    { value: 'in', reasonCode: 'l1_transfer:at:in' },
    { value: 'on', reasonCode: 'l1_transfer:at:on' },
    { value: 'to', reasonCode: 'l1_transfer:at:to' },
  ],
});
assert.equal(preposition.responseMode, 'whole_phrases');
assert.equal(preposition.correct, 'at');
assert.deepEqual(
  preposition.distractors.map((item) => item.value),
  ['Are you in home?', 'Are you on home?'],
);
assert.ok(
  preposition.distractors.every(
    (item) => item.testedDimension === 'preposition',
  ),
);

const oneWordFormula = selectTaskDistractors({
  family: 'phrase_builder',
  target: 'Hi',
  rejectedAnswers: [
    { value: 'high', reasonCode: 'phonetic:hi:high' },
    { value: 'he', reasonCode: 'phonetic:hi:he' },
    { value: 'hide', reasonCode: 'orthographic:hi:hide' },
  ],
});
assert.deepEqual(
  oneWordFormula.distractors.map((item) => item.value),
  ['High', 'He'],
);
assert.ok(
  oneWordFormula.distractors.every(
    (item) => item.testedDimension === 'sound',
  ),
);

const uppercasePronoun = selectTaskDistractors({
  family: 'phrase_builder',
  target: 'I',
  rejectedAnswers: [
    { value: 'i', reasonCode: 'orthographic:I:i:lowercase_pronoun' },
    { value: 'l', reasonCode: 'orthographic:I:l:lowercase_l_shape' },
  ],
});
assert.deepEqual(
  uppercasePronoun.distractors.map((item) => item.value),
  ['i', 'l'],
  'Orthographic traps must preserve the exact case and glyph being tested',
);

const fixedFormula = selectTaskDistractors({
  family: 'listen_build_dictation',
  target: 'Thank you',
  rejectedAnswers: [
    { value: 'thanks', reasonCode: 'collocation_pragmatics:thank:thanks' },
    { value: 'think', reasonCode: 'phonetic:thank:think' },
    { value: 'he', reasonCode: 'grammar:you:he' },
  ],
});
assert.equal(fixedFormula.correct, 'Thank');
assert.deepEqual(
  fixedFormula.distractors.map((item) => item.value),
  ['Thanks', 'Think'],
);
assert.deepEqual(
  fixedFormula.distractors.map((item) => item.testedDimension),
  ['collocation', 'sound'],
);

assert.throws(
  () => selectTaskDistractors({
    family: 'phrase_builder',
    target: 'Are you ready?',
    rejectedAnswers: [
      { value: 'aren’t', reasonCode: 'grammar:are:arent' },
    ],
  }),
  /task_specific_distractors_insufficient/u,
);

const areFeedback = lesson1DistractorChoicesV2('ru', 'Are', 'Are you tired?');
assert.match(
  areFeedback.find((item) => item.value === 'is')?.reason ?? '',
  /he, she, it.*you/iu,
);
assert.match(
  areFeedback.find((item) => item.value === 'do')?.reason ?? '',
  /действи.*Are you tired.*are/iu,
);
const atFeedback = lesson1DistractorChoicesV2('ru', 'at', 'Are you at home?');
assert.match(
  atFeedback.find((item) => item.value === 'in')?.reason ?? '',
  /внутр.*at home/iu,
);
assert.match(
  atFeedback.find((item) => item.value === 'on')?.reason ?? '',
  /поверхност.*at home/iu,
);

process.stdout.write('LEARNING V2 TASK-SPECIFIC DISTRACTORS: PASS\n');
