#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { russianUiForQuestion } from './english_test_russian_ui.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RANGES = {
  A1: [0.5, 1.2],
  A2: [1.3, 2.2],
  B1: [2.3, 3.1],
  B2: [3.2, 3.9],
  C1: [4.0, 4.7],
  C2: [4.8, 5.5],
};
const UPPER_BAND_EVIDENCE_IDS = new Set([
  'en-c1-001', 'en-c1-002', 'en-c1-004', 'en-c1-006', 'en-c1-015', 'en-c1-017',
  'en-c1-022', 'en-c1-024', 'en-c1-026', 'en-c1-027', 'en-c1-028', 'en-c1-030',
  'en-c1-032', 'en-c1-033', 'en-c1-034', 'en-c1-038', 'en-c1-040',
  'en-c2-007', 'en-c2-015', 'en-c2-017', 'en-c2-018', 'en-c2-020', 'en-c2-022',
  'en-c2-023', 'en-c2-024', 'en-c2-029', 'en-c2-030', 'en-c2-033', 'en-c2-034',
  'en-c2-035', 'en-c2-036', 'en-c2-037', 'en-c2-038', 'en-c2-040',
]);

const REWRITES = {
  'en-a1-031': {
    skill: 'vocabulary',
    scenario: 'Telling the time',
    prompt: 'The train leaves at quarter past seven. Which time is that?',
    options: ['7:15', '7:45', '6:45', '8:15'],
    correctAnswer: '7:15',
    explanation: '“Quarter past seven” means fifteen minutes after seven: 7:15.',
  },
  'en-a1-039': {
    scenario: 'Frequency: never',
    prompt: 'I do not drink coffee at all. I ______ drink coffee.',
    options: ['never', 'sometimes', 'usually', 'always'],
    correctAnswer: 'never',
    explanation: '“Not at all” makes the zero-frequency adverb “never” the only possible answer.',
  },
  'en-b2-003': {
    skill: 'grammar',
    scenario: 'Mixed past condition and present result',
    prompt: 'Nora did not take the promotion last year, so she is not managing the team now. If she ______ the promotion, she would be managing the team now.',
    options: ['had taken', 'took', 'would take', 'has taken'],
    correctAnswer: 'had taken',
    explanation: 'A past unreal condition with a present result uses past perfect in the if-clause and “would” plus the infinitive in the result.',
  },
  'en-c1-026': {
    skill: 'vocabulary',
    scenario: 'Precise evaluative adjective',
    prompt: 'The proposal introduced a clever, original mechanism, although it did not solve the main problem. The mechanism was ______ but ultimately ineffective.',
    options: ['ingenious', 'ingenuous', 'routine', 'accidental'],
    correctAnswer: 'ingenious',
    explanation: '“Ingenious” means cleverly inventive; the context states that quality directly while separating it from effectiveness.',
  },
  'en-a1-005': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Ordering at a café',
    prompt: 'The barista asks, “What would you like?” Choose the most natural answer.',
    options: ['A coffee, please.', 'I coffee.', 'Coffee me.', 'Give a coffee.'],
    correctAnswer: 'A coffee, please.',
    explanation: '“A coffee, please” is a simple, polite A1 request; the other choices are not natural English requests.',
  },
  'en-a1-006': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Ordering food',
    prompt: 'A server asks, “What would you like?” Choose the natural reply.',
    options: ['An apple, please.', 'Apple I.', 'Give apple.', 'I am apple.'],
    correctAnswer: 'An apple, please.',
    explanation: '“An apple, please” is a natural basic request and uses “an” before a vowel sound.',
  },
  'en-a1-037': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Responding to a simple request',
    prompt: 'Someone says, “Please close the door. It is cold.” What should you do?',
    options: ['Close the door.', 'Open the window.', 'Turn on the light.', 'Sit down.'],
    correctAnswer: 'Close the door.',
    explanation: 'The direct request asks the listener to close the door.',
  },
  'en-a1-040': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Hotel notice',
    prompt: 'Read: “Check-in is from 2 PM. Check-out is before 11 AM.” When must a guest leave the room?',
    options: ['Before 11 AM', 'At 2 PM', 'After 11 PM', 'Before 2 AM'],
    correctAnswer: 'Before 11 AM',
    explanation: 'The notice explicitly says that check-out is before 11 AM.',
  },
  'en-a2-010': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Asking a friend for permission',
    prompt: 'You need to make a quick call. What is a natural way to ask a friend?',
    options: ['Can I use your phone?', 'I use your phone.', 'Use phone me?', 'I can your phone.'],
    correctAnswer: 'Can I use your phone?',
    explanation: '“Can I ...?” is a natural A2 form for asking permission in an informal situation.',
  },
  'en-a2-012': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Giving simple advice',
    prompt: 'Your friend says, “I am exhausted.” What is the most helpful response?',
    options: ['You should get some rest.', 'You must be exhausted yesterday.', 'You can exhausted.', 'You will resting.'],
    correctAnswer: 'You should get some rest.',
    explanation: '“Should” is the standard A2 form for giving friendly advice.',
  },
  'en-a2-038': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Offering a drink',
    prompt: 'A guest has just arrived. Choose the natural offer.',
    options: ['Would you like something to drink?', 'Do you liking drink?', 'You drink something.', 'Are you like a drink?'],
    correctAnswer: 'Would you like something to drink?',
    explanation: '“Would you like ...?” is a polite, conventional way to make an offer.',
  },
  'en-a2-031': {
    scenario: 'Zero conditional scientific fact',
    prompt: 'Choose the zero conditional for a general scientific fact: “If you heat water to 100°C, it ______.”',
    options: ['boils', 'is boiling', 'boiled', 'would boil'],
    correctAnswer: 'boils',
    explanation: 'A general scientific result uses present simple in both parts of the zero conditional.',
  },
  'en-a2-034': {
    scenario: 'Movement onto a surface',
    prompt: 'The cat moved from the floor to the top of the table. It jumped ______ the table.',
    options: ['onto', 'off', 'through', 'across'],
    correctAnswer: 'onto',
    explanation: '“Onto” expresses movement from a lower position to a position on a surface.',
  },
  'en-b1-003': {
    scenario: 'Ongoing activity up to now',
    prompt: 'She started two hours ago and is still studying. She ______ for two hours.',
    options: ['has been studying', 'studies', 'studied', 'is study'],
    correctAnswer: 'has been studying',
    explanation: 'The present perfect continuous highlights an activity that began in the past and is still continuing.',
  },
  'en-b1-011': {
    scenario: 'Formal hypothetical wish',
    prompt: 'In formal English, choose the irrealis form: “I wish I ______ taller.”',
    options: ['were', 'am', 'be', 'have been'],
    correctAnswer: 'were',
    explanation: 'Formal irrealis clauses use “were” for all persons after “wish”.',
  },
  'en-b1-025': {
    scenario: 'Decision collocation',
    prompt: 'Choose the standard collocation: “We need to ______ a decision soon.”',
    options: ['make', 'perform', 'build', 'manufacture'],
    correctAnswer: 'make',
    explanation: '“Make a decision” is the standard neutral collocation.',
  },
  'en-b1-028': {
    scenario: 'Absence of obligation',
    prompt: 'There is no obligation to eat if you are not hungry. You ______ eat.',
    options: ['don’t have to', 'mustn’t', 'can’t', 'aren’t allowed to'],
    correctAnswer: 'don’t have to',
    explanation: '“Don’t have to” means there is no obligation; the other choices express prohibition or inability.',
  },
  'en-b1-027': {
    scenario: 'External workplace rule',
    prompt: 'Choose the form that emphasises an external rule: “My employer requires it, so I ______ wear safety glasses.”',
    options: ['have to', 'should', 'can', 'might'],
    correctAnswer: 'have to',
    explanation: '“Have to” expresses an obligation imposed by an external rule; the other modals do not state that obligation.',
  },
  'en-b1-036': {
    prompt: '______ do you usually get up? — At 7 o’clock exactly.',
    options: ['What time', 'Where', 'Why', 'How often'],
    correctAnswer: 'What time',
    explanation: '“What time” asks for a precise clock time; the reply gives 7 o’clock exactly.',
  },
  'en-b1-038': {
    scenario: 'Restaurant staff',
    prompt: 'The person who served our table was very friendly and helpful. He was our ______.',
    options: ['waiter', 'customer', 'chef', 'cashier'],
    correctAnswer: 'waiter',
    explanation: 'A waiter serves customers at their table; the context excludes the other restaurant roles.',
  },
  'en-b2-011': {
    scenario: 'Formal British recommendation',
    prompt: 'Choose the traditional British “should” construction: “It is essential that the report ______ before submission.”',
    options: ['should be revised', 'is revised', 'was revised', 'should revised'],
    correctAnswer: 'should be revised',
    explanation: 'Formal British English permits “should + passive infinitive” after “it is essential that”.',
    dialect: 'british',
  },
  'en-b2-005': {
    scenario: 'Regret about a completed past period',
    prompt: 'Looking back on last year, I wish I ______ more careful with my money.',
    options: ['had been', 'am', 'would be', 'have been'],
    correctAnswer: 'had been',
    explanation: 'A regret about a completed past period uses “wish + past perfect”.',
  },
  'en-b2-008': {
    scenario: 'Negative inversion with never',
    prompt: 'Never ______ such a beautiful sunset.',
    options: ['have I seen', 'I have seen', 'did I saw', 'I saw'],
    correctAnswer: 'have I seen',
    explanation: 'Fronted “never” triggers auxiliary–subject inversion: “Never have I seen ...”.',
  },
  'en-b2-012': {
    scenario: 'American mandative subjunctive',
    prompt: 'Choose the American mandative subjunctive: “It is important that he ______ on time.”',
    options: ['be', 'is being', 'was', 'to be'],
    correctAnswer: 'be',
    explanation: 'The American mandative subjunctive uses the bare form “be” after “it is important that”.',
    dialect: 'american',
  },
  'en-b2-017': {
    scenario: 'Causative with have',
    prompt: 'Complete the causative specifically with “have”: “I ______ my car serviced last week.”',
    options: ['had', 'made', 'let', 'did'],
    correctAnswer: 'had',
    explanation: '“Had my car serviced” is the past causative with “have”; the prompt explicitly requests that construction.',
  },
  'en-b2-018': {
    scenario: 'Causative with get',
    prompt: 'Complete the causative specifically with “get”: “She ______ her hair cut yesterday.”',
    options: ['got', 'made', 'let', 'did'],
    correctAnswer: 'got',
    explanation: '“Got her hair cut” is the past causative with “get”; the prompt excludes the alternative causative with “have”.',
  },
  'en-b2-019': {
    scenario: 'Present preference with would rather',
    prompt: 'From now on, I would rather you ______ me the truth.',
    options: ['told', 'tell', 'to tell', 'would tell'],
    correctAnswer: 'told',
    explanation: 'For a present or future preference about another person, “would rather” takes a past form.',
  },
  'en-b2-020': {
    scenario: 'It is high time',
    prompt: 'Complete the standard construction: “It’s high time we ______ home.”',
    options: ['went', 'go', 'to go', 'would go'],
    correctAnswer: 'went',
    explanation: '“It’s high time + subject” conventionally takes a past form for a present overdue action.',
  },
  'en-b2-021': {
    scenario: 'Expected schedule contradicted by delay',
    prompt: 'Use “supposed to” for an expected schedule: “The train ______ at 9:00, but it’s delayed.”',
    options: ['is supposed to leave', 'is suppose leave', 'supposed leaving', 'was suppose to leave'],
    correctAnswer: 'is supposed to leave',
    explanation: '“Is supposed to leave” expresses the scheduled expectation that the delay contradicts.',
  },
  'en-b2-022': {
    scenario: 'Unnecessary action that was completed',
    prompt: 'I brought an umbrella, but it did not rain. The action was unnecessary: I ______ brought it.',
    options: ['needn’t have', 'didn’t need to', 'mustn’t have', 'couldn’t have'],
    correctAnswer: 'needn’t have',
    explanation: '“Needn’t have + past participle” means the action happened but was unnecessary.',
  },
  'en-b2-027': {
    scenario: 'Auxiliary ellipsis',
    prompt: 'Repeat the modal with ellipsis: “Will you come to the party?” “Yes, I ______.”',
    options: ['will', 'do', 'am', 'have'],
    correctAnswer: 'will',
    explanation: 'The modal “will” stands for the omitted verb phrase “will come to the party”.',
  },
  'en-b2-034': {
    prompt: 'Choose the tentative request with “would”: “______ you mind closing the window?”',
    options: ['Would', 'Do', 'Will', 'Are'],
    correctAnswer: 'Would',
    explanation: '“Would you mind ...?” is the requested conventional tentative form.',
  },
  'en-c1-006': {
    prompt: 'Seldom ______ such exceptional ability.',
    options: ['has a candidate demonstrated', 'a candidate has demonstrated', 'did a candidate demonstrated', 'a candidate demonstrated has'],
    correctAnswer: 'has a candidate demonstrated',
    explanation: 'A fronted negative adverb triggers subject–auxiliary inversion: “Seldom has a candidate demonstrated ...”.',
  },
  'en-c1-001': {
    scenario: 'American mandative passive subjunctive',
    prompt: 'Choose the American mandative subjunctive without “should”: “The judge ordered that the defendant ______ in custody.”',
    options: ['be remanded', 'is remanded', 'was remanded', 'to be remanded'],
    correctAnswer: 'be remanded',
    explanation: 'The American mandative subjunctive uses bare “be” plus the passive participle after “ordered that”.',
    dialect: 'american',
  },
  'en-c1-002': {
    scenario: 'American mandative passive subjunctive',
    prompt: 'Choose the American mandative subjunctive: “It is imperative that the data ______ by an independent auditor.”',
    options: ['be verified', 'is verifying', 'was verified', 'to verify'],
    correctAnswer: 'be verified',
    explanation: 'The American mandative subjunctive uses “be verified” after “it is imperative that”.',
    dialect: 'american',
  },
  'en-c1-004': {
    scenario: 'Formal conditional inversion',
    prompt: 'Use formal inversion without “if”: “______ you change your mind, let us know immediately.”',
    options: ['Should', 'Unless', 'Because', 'Whether'],
    correctAnswer: 'Should',
    explanation: '“Should + subject + bare infinitive” forms a formal open conditional without “if”.',
  },
  'en-c1-012': {
    scenario: 'Academic collocation: cast doubt on',
    prompt: 'Complete the fixed academic collocation: “The study ______ doubt on previous assumptions.”',
    options: ['casts', 'places', 'draws', 'creates'],
    correctAnswer: 'casts',
    explanation: '“Cast doubt on” is the established academic collocation meaning to make a claim less certain.',
  },
  'en-c1-015': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Mitigation in professional correspondence',
    prompt: 'A colleague writes, “I wonder whether you might reconsider the deadline.” What is the main function of “I wonder whether you might”?',
    options: [
      'It softens a request for reconsideration.',
      'It expresses doubt that a deadline exists.',
      'It withdraws the earlier proposal completely.',
      'It demands an immediate answer.',
    ],
    correctAnswer: 'It softens a request for reconsideration.',
    explanation: 'The indirect modal framing reduces imposition while retaining the request.',
  },
  'en-c1-016': {
    skill: 'vocabulary',
    scenario: 'Epistemic status of a proposal',
    prompt: 'The plan may be revised after the trial results; for now, it should be regarded as ______.',
    options: ['provisional', 'definitive', 'arbitrary', 'redundant'],
    correctAnswer: 'provisional',
    explanation: '“Provisional” describes something accepted for the present but subject to later revision.',
  },
  'en-c1-017': {
    skill: 'grammar',
    scenario: 'Negative-adverbial inversion',
    prompt: 'Rarely ______ such a small study generated so much debate.',
    options: ['has', 'it has', 'has it', 'did it has'],
    correctAnswer: 'has',
    explanation: 'Fronted “rarely” triggers subject–auxiliary inversion; the subject follows the gap: “Rarely has such a small study ...”.',
  },
  'en-c1-022': {
    scenario: 'Negative inversion in a formal recommendation',
    prompt: 'Use “should” with inversion: “Under no circumstances ______ the password be shared.”',
    options: ['should', 'it should', 'should it', 'it will'],
    correctAnswer: 'should',
    explanation: 'The fronted negative phrase requires “should” before the subject already present after the gap.',
  },
  'en-c1-024': {
    scenario: 'Stream of consciousness',
    prompt: 'A passage presents a character’s thoughts as an immediate, continuously flowing inner sequence with loose associations. Which technique is this?',
    options: ['Stream of consciousness', 'Third-person omniscient summary', 'Dialogue-driven narration', 'Objective reportage'],
    correctAnswer: 'Stream of consciousness',
    explanation: 'Immediate continuous representation of associative thought is the defining feature of stream of consciousness.',
  },
  'en-c1-027': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Verb-phrase ellipsis across a contrast',
    prompt: '“The first model predicts a decline; the revised model does not.” What does “does not” replace?',
    options: ['predict a decline', 'revise the model', 'decline to predict', 'use the first model'],
    correctAnswer: 'predict a decline',
    explanation: 'The auxiliary carries the negated verb phrase from the first clause: the revised model does not predict a decline.',
  },
  'en-c1-028': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Cautious possibility',
    prompt: '“I wouldn’t rule out a further delay.” What is the speaker communicating?',
    options: [
      'A further delay remains possible.',
      'A further delay has been prevented.',
      'A further delay is certain.',
      'The speaker refuses to discuss timing.',
    ],
    correctAnswer: 'A further delay remains possible.',
    explanation: '“Wouldn’t rule out” cautiously keeps a possibility open without predicting it as certain.',
  },
  'en-c1-031': {
    skill: 'vocabulary',
    scenario: 'Idiomatic closure',
    prompt: 'After the final settlement, both sides hoped to draw a line ______ the dispute and move on.',
    options: ['under', 'through', 'beside', 'against'],
    correctAnswer: 'under',
    explanation: '“Draw a line under” an episode means treat it as finished and stop returning to it.',
  },
  'en-c1-032': {
    skill: 'vocabulary',
    scenario: 'Critical treatment of evidence',
    prompt: 'The report mentioned the contradictory data only briefly and avoided examining it. It ______ the problem.',
    options: ['glossed over', 'zeroed in on', 'accounted for', 'bore out'],
    correctAnswer: 'glossed over',
    explanation: 'To “gloss over” a problem is to treat it too briefly or conceal its significance.',
  },
  'en-c1-034': {
    skill: 'grammar',
    scenario: 'Concessive clause with “much as”',
    prompt: '______ I admire the ambition behind the proposal, I cannot endorse its methods.',
    options: ['Much as', 'As much', 'Despite', 'However much of'],
    correctAnswer: 'Much as',
    explanation: '“Much as + subject + verb” forms a concessive clause meaning “although I greatly admire ...”.',
  },
  'en-c1-035': {
    scenario: 'Weakening credibility',
    prompt: 'Choose the formal verb meaning “weakened but not disproved”: “The testimony was ______ by timeline inconsistencies.”',
    options: ['undermined', 'confirmed', 'clarified', 'strengthened'],
    correctAnswer: 'undermined',
    explanation: '“Undermined” precisely means that the inconsistencies weakened the testimony’s credibility.',
  },
  'en-c1-038': {
    scenario: 'Academic evidence verb',
    prompt: 'Choose the formal verb meaning “supported with evidence”: “The independent results ______ the original hypothesis.”',
    options: ['substantiated', 'obscured', 'evaded', 'contradicted'],
    correctAnswer: 'substantiated',
    explanation: '“Substantiated” means supported by evidence; the other verbs express concealment, avoidance, or opposition.',
  },
  'en-c1-040': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Qualified evaluation of a forecast',
    prompt: '“The forecast identified the overall direction of change, although it missed both the timing and the scale.” Which summary is best supported?',
    options: [
      'It was broadly directional but not precise.',
      'It was accurate in every material respect.',
      'It predicted the timing but not the direction.',
      'It contained no useful information at all.',
    ],
    correctAnswer: 'It was broadly directional but not precise.',
    explanation: 'The sentence credits the broad direction while explicitly limiting precision in timing and magnitude.',
  },
  'en-c1-025': {
    scenario: 'Formal committee procedure',
    prompt: 'The committee chose to ______ consideration of the proposal until the next meeting.',
    options: ['defer', 'endorse', 'expedite', 'abandon'],
    correctAnswer: 'defer',
    explanation: '“Defer consideration” is the formal collocation meaning to postpone consideration until a later time.',
  },
  'en-c1-030': {
    scenario: 'Face-saving disagreement',
    prompt: 'Choose the two-word discourse marker meaning “despite that”: “That’s an interesting perspective. ______, the data suggests a different conclusion.”',
    options: ['That said', 'As a result', 'In addition', 'For example'],
    correctAnswer: 'That said',
    explanation: '“That said” concedes the preceding point before introducing a tactful contrast.',
  },
  'en-c1-033': {
    skill: 'grammar',
    scenario: 'Degree-fronting with inversion',
    prompt: 'So compelling ______ the evidence that the panel reopened the inquiry.',
    options: ['was', 'the evidence was', 'did', 'has'],
    correctAnswer: 'was',
    explanation: 'Fronting “so + adjective” triggers inversion: “So compelling was the evidence that ...”.',
  },
  'en-c2-006': {
    scenario: 'Formal preference with would sooner',
    prompt: 'I would sooner ______ my resignation than accept those terms.',
    options: ['hand in', 'handed in', 'to hand in', 'have handing in'],
    correctAnswer: 'hand in',
    explanation: 'With the same subject, “would sooner” takes the bare infinitive: “would sooner hand in”.',
  },
  'en-c2-001': {
    scenario: 'Completed but unnecessary action',
    prompt: 'I carried my umbrella all day. It was harmless but unnecessary because it did not rain. I ______ brought it.',
    options: ['needn’t have', 'didn’t need to', 'mustn’t have', 'couldn’t have'],
    correctAnswer: 'needn’t have',
    explanation: '“Needn’t have” states that the action occurred but proved unnecessary.',
  },
  'en-c2-002': {
    scenario: 'No necessity and no action',
    prompt: 'My roommate had already ordered pizza, so I did not cook dinner. I ______ cook dinner.',
    options: ['didn’t need to', 'needn’t have', 'mustn’t', 'shouldn’t have'],
    correctAnswer: 'didn’t need to',
    explanation: '“Didn’t need to” fits an unnecessary action that the speaker did not perform.',
  },
  'en-c2-005': {
    scenario: 'Present preference about another person',
    prompt: 'From now on, I’d rather you ______ anything about this to anyone.',
    options: ['didn’t say', 'don’t say', 'hadn’t said', 'wouldn’t say'],
    correctAnswer: 'didn’t say',
    explanation: 'For a present or future preference about another person, “would rather” takes a past form.',
  },
  'en-c2-007': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Implicature in a critical review',
    prompt: 'A reviewer writes, “The author has certainly assembled a great many sources,” but offers no praise for the reasoning. What is the most likely implication?',
    options: [
      'The sources are numerous, but the central argument may still be weak.',
      'The reviewer has verified every source personally.',
      'The book contains too few references for its subject.',
      'The reviewer fully endorses the author’s conclusion.',
    ],
    correctAnswer: 'The sources are numerous, but the central argument may still be weak.',
    explanation: 'The narrowly positive comment on quantity, combined with withheld praise for reasoning, conventionally implies a reservation about argumentative quality.',
  },
  'en-c2-008': {
    scenario: 'Inverted third conditional',
    prompt: 'Use the past-perfect inverted form for a completed past result: “______ your generosity, this project would never have been completed.”',
    options: ['Had it not been for', 'Should it not be for', 'If it was not for', 'Were it not being for'],
    correctAnswer: 'Had it not been for',
    explanation: 'A counterfactual completed past condition uses “Had it not been for ...”.',
  },
  'en-c2-009': {
    scenario: 'Partial negation',
    prompt: 'Use partial—not absolute—negation: “All that glitters ______ gold.”',
    options: ['isn’t necessarily', 'is never', 'cannot be', 'must be'],
    correctAnswer: 'isn’t necessarily',
    explanation: '“Isn’t necessarily” denies that the statement is always true without claiming that it is never true.',
  },
  'en-c2-010': {
    prompt: 'Little ______ that their conversation was being recorded.',
    options: ['did they know', 'they knew', 'had they knew', 'they did know'],
    correctAnswer: 'did they know',
    explanation: 'Fronted negative “little” triggers inversion: “Little did they know ...”.',
  },
  'en-c2-015': {
    skill: 'pragmatics',
    scenario: 'Calibrated academic claim',
    prompt: 'The evidence is suggestive but not conclusive. Which sentence states the causal claim with appropriate academic caution?',
    options: [
      'The findings may be consistent with a causal relationship.',
      'The findings conclusively prove a causal relationship.',
      'The findings make a causal relationship inevitable.',
      'The findings are wholly irrelevant to causation.',
    ],
    correctAnswer: 'The findings may be consistent with a causal relationship.',
    explanation: '“May be consistent with” preserves the distinction between suggestive evidence and a demonstrated causal conclusion.',
    dialect: 'neutral',
  },
  'en-c2-014': {
    scenario: 'Formal concessive conjunction',
    prompt: 'Choose the formal concessive word: “The plan was accepted, ______ reluctantly.”',
    options: ['albeit', 'because', 'therefore', 'unless'],
    correctAnswer: 'albeit',
    explanation: '“Albeit” is a formal concessive conjunction meaning “although it was”.',
  },
  'en-c2-016': {
    skill: 'reading',
    scenario: 'Concessive discourse relation',
    prompt: 'The evidence is methodologically robust; ______, its relevance to the present case remains uncertain.',
    options: ['nonetheless', 'accordingly', 'similarly', 'for example'],
    correctAnswer: 'nonetheless',
    explanation: '“Nonetheless” marks the contrast between methodological strength and uncertain relevance.',
    dialect: 'neutral',
  },
  'en-c2-017': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Scope of partial negation',
    prompt: '“Not all of the committee members rejected the amendment.” What must be true?',
    options: [
      'At least one member did not reject it.',
      'No member rejected it.',
      'Exactly one member accepted it.',
      'Most members approved it.',
    ],
    correctAnswer: 'At least one member did not reject it.',
    explanation: '“Not all rejected” logically entails that at least one member did not reject; it does not specify how many or whether they approved.',
  },
  'en-c2-018': {
    skill: 'vocabulary',
    scenario: 'Restrictive legal relation',
    prompt: 'The waiver applies ______ compliance would impose a disproportionate burden, and only to that extent.',
    options: ['insofar as', 'notwithstanding', 'lest', 'whereas'],
    correctAnswer: 'insofar as',
    explanation: '“Insofar as” means “to the extent that” and matches the explicit restriction in the second clause.',
  },
  'en-c2-020': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Litotes in an evaluation',
    prompt: 'A reviewer concludes, “The proposal is not without merit, though its central assumption remains untested.” Which interpretation best preserves the stance?',
    options: [
      'The proposal has some merit, but the reviewer retains a serious reservation.',
      'The proposal is entirely without merit.',
      'The reviewer considers the assumption fully established.',
      'The reviewer offers unqualified endorsement.',
    ],
    correctAnswer: 'The proposal has some merit, but the reviewer retains a serious reservation.',
    explanation: '“Not without merit” gives limited praise, while the following clause preserves a substantial qualification.',
  },
  'en-c2-021': {
    skill: 'vocabulary',
    scenario: 'Non-committal public stance',
    prompt: 'The spokesperson’s reply could be read as either qualified support or a polite refusal; it was deliberately ______.',
    options: ['equivocal', 'unequivocal', 'tangential', 'redundant'],
    correctAnswer: 'equivocal',
    explanation: '“Equivocal” describes language intentionally open to opposing interpretations and therefore non-committal.',
  },
  'en-c2-022': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Legal effect of a reservation clause',
    prompt: '“This concession is made without prejudice to the claimant’s existing rights.” What does the clause mean?',
    options: [
      'The concession does not surrender or weaken those rights.',
      'The claimant’s existing rights are cancelled by the concession.',
      'The concession proves that the claim was prejudiced.',
      'The claimant may exercise only newly created rights.',
    ],
    correctAnswer: 'The concession does not surrender or weaken those rights.',
    explanation: 'In legal usage, “without prejudice to” preserves the referenced rights despite the present act.',
  },
  'en-c2-023': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Restrictive scope in a complex sentence',
    prompt: '“Only the amendments that the committee had rejected were resubmitted.” What necessarily follows?',
    options: [
      'Every resubmitted amendment had been rejected by the committee.',
      'Every rejected amendment was resubmitted.',
      'No accepted amendment was ever discussed again.',
      'The committee rejected the amendments after resubmission.',
    ],
    correctAnswer: 'Every resubmitted amendment had been rejected by the committee.',
    explanation: '“Only X were resubmitted” makes prior rejection necessary for resubmission, but does not say that all rejected items were resubmitted.',
  },
  'en-c2-024': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Qualified denial in public language',
    prompt: 'A report says, “The minister stopped short of denying that officials had discussed the proposal.” What does this wording most clearly mean?',
    options: [
      'The minister did not issue a full denial.',
      'The minister confirmed every detail of the discussion.',
      'The minister refused to speak to the officials.',
      'The minister ended the discussion immediately.',
    ],
    correctAnswer: 'The minister did not issue a full denial.',
    explanation: '“Stopped short of denying” means the response did not go as far as an outright denial; it does not amount to full confirmation.',
  },
  'en-c2-029': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Epistemic distance in reporting',
    prompt: 'An analyst writes, “The effect appears to have been overstated.” What stance does this wording convey?',
    options: [
      'The analyst questions the reported magnitude without necessarily denying an effect.',
      'The analyst proves that no effect existed.',
      'The analyst accepts the reported magnitude without reservation.',
      'The analyst is describing how loudly the result was announced.',
    ],
    correctAnswer: 'The analyst questions the reported magnitude without necessarily denying an effect.',
    explanation: '“Appears to have been overstated” combines evidential caution with a challenge to degree, not a categorical denial.',
  },
  'en-c2-030': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Accepted premise versus open question',
    prompt: '“That the policy reduced expenditure is not in dispute; whether it improved outcomes is another matter.” Which reading is accurate?',
    options: [
      'The cost reduction is accepted, while the effect on outcomes remains unresolved.',
      'Both cost reduction and improved outcomes are rejected.',
      'Improved outcomes are accepted, but cost reduction is disputed.',
      'The two claims are presented as equivalent.',
    ],
    correctAnswer: 'The cost reduction is accepted, while the effect on outcomes remains unresolved.',
    explanation: 'The first nominal clause is explicitly treated as settled; “another matter” separates and leaves open the outcome claim.',
  },
  'en-c2-032': {
    scenario: 'Understatement at an extreme temperature',
    prompt: 'Which device deliberately minimizes severity? At −30°C, the mountaineer says, “It’s a bit chilly.”',
    options: ['understatement', 'hyperbole', 'metaphor', 'alliteration'],
    correctAnswer: 'understatement',
    explanation: 'Calling −30°C “a bit chilly” deliberately makes the extreme cold sound less severe.',
  },
  'en-c2-033': {
    skill: 'vocabulary',
    scenario: 'Distance from an avowed purpose',
    prompt: 'The measure was ______ introduced to simplify regulation, though internal documents suggest a political motive.',
    options: ['ostensibly', 'inherently', 'inadvertently', 'unequivocally'],
    correctAnswer: 'ostensibly',
    explanation: '“Ostensibly” marks the stated or apparent purpose while signalling that the real motive may differ.',
  },
  'en-c2-034': {
    skill: 'vocabulary',
    scenario: 'Formal dependency relation',
    prompt: 'Approval is ______ the applicant’s securing independent funding; without it, the project cannot proceed.',
    options: ['contingent upon', 'commensurate with', 'incidental to', 'irrespective of'],
    correctAnswer: 'contingent upon',
    explanation: '“Contingent upon” means dependent on a condition being fulfilled.',
  },
  'en-c2-035': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Quantifier scope in a research claim',
    prompt: '“Few, if any, of the reported gains survived adjustment for prior attainment.” What is the most accurate interpretation?',
    options: [
      'Possibly none survived, and certainly not many did.',
      'Every reported gain survived the adjustment.',
      'Exactly a few gains survived, but none were reported.',
      'The adjustment increased most of the reported gains.',
    ],
    correctAnswer: 'Possibly none survived, and certainly not many did.',
    explanation: '“Few, if any” allows zero and otherwise limits the surviving set to a small number.',
  },
  'en-c2-036': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Withholding a stronger judgement',
    prompt: '“I wouldn’t go so far as to call the findings conclusive.” What is the speaker doing?',
    options: [
      'Rejecting “conclusive” as too strong while leaving room for weaker support.',
      'Declaring that the findings prove nothing whatsoever.',
      'Endorsing the findings as fully conclusive.',
      'Refusing to read the findings.',
    ],
    correctAnswer: 'Rejecting “conclusive” as too strong while leaving room for weaker support.',
    explanation: 'The speaker sets an upper limit on endorsement rather than making a total negative judgement.',
  },
  'en-c2-037': {
    skill: 'pragmatics',
    format: 'multiple-choice',
    scenario: 'Authorial distance from a claim',
    prompt: 'A critique says, “The paper purports to resolve the paradox.” What does “purports to” signal here?',
    options: [
      'The paper claims to do so, but the writer withholds endorsement.',
      'The paper unquestionably resolves the paradox.',
      'The paper refuses to discuss the paradox.',
      'The writer has reproduced the paper’s proof.',
    ],
    correctAnswer: 'The paper claims to do so, but the writer withholds endorsement.',
    explanation: 'In critical prose, “purports to” reports a claimed achievement while creating distance from its truth.',
  },
  'en-c2-039': {
    scenario: 'Contextual implicature at closing time',
    prompt: 'At 5:55, a visitor asks a librarian, “Can I stay here?” The librarian replies, “The library closes at six.” What is implied?',
    options: ['The visitor must leave very soon.', 'The library will stay open late.', 'The librarian does not know the time.', 'The visitor should arrive at six.'],
    correctAnswer: 'The visitor must leave very soon.',
    explanation: 'In this context, mentioning the six o’clock closing time indirectly tells the visitor that they must leave soon.',
  },
  'en-c2-038': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Corrective focus with “not so much ... as”',
    prompt: '“The reform was not so much abandoned as recast in narrower terms.” Which paraphrase is closest?',
    options: [
      'It continued in a more limited form rather than simply being dropped.',
      'It was abandoned because its terms were too narrow.',
      'It continued unchanged despite being rejected.',
      'It was broadened and then withdrawn.',
    ],
    correctAnswer: 'It continued in a more limited form rather than simply being dropped.',
    explanation: 'The construction corrects the first description (“abandoned”) in favour of the more precise second one (“recast”).',
  },
  'en-c2-040': {
    skill: 'reading',
    format: 'multiple-choice',
    scenario: 'Legal non-admission clause',
    prompt: '“Nothing in this statement should be construed as an admission of liability.” What is the intended effect?',
    options: [
      'It prevents the statement from being treated as conceding liability.',
      'It confirms liability while disputing the amount.',
      'It admits that the statement is legally inaccurate.',
      'It transfers liability to the reader.',
    ],
    correctAnswer: 'It prevents the statement from being treated as conceding liability.',
    explanation: '“Should be construed as” concerns interpretation; the clause expressly blocks an inference of admitted liability.',
  },
};

const DIALECTS = {
  'en-b1-026': 'british',
  'en-b2-011': 'british',
  'en-c2-015': 'british',
  'en-c2-016': 'american',
  'en-c2-031': 'british',
};

function applyRewrite(question) {
  const rewrite = REWRITES[question.id];
  if (!rewrite) return question;
  const { correctAnswer, ...fields } = rewrite;
  const revised = { ...question, ...fields };
  revised.correctIndex = revised.options.indexOf(correctAnswer);
  if (revised.correctIndex < 0) throw new Error(`Missing correct answer for ${question.id}`);
  return revised;
}

function moveCorrectAnswer(question, desiredIndex) {
  const answer = question.options[question.correctIndex];
  const distractors = question.options.filter((_, index) => index !== question.correctIndex);
  const options = [...distractors];
  options.splice(desiredIndex, 0, answer);
  return { ...question, options, correctIndex: desiredIndex };
}

function reviewQuestion(question, level, index) {
  const [minimum, maximum] = RANGES[level];
  const difficulty = Number((minimum + (maximum - minimum) * (index / 39)).toFixed(2));
  let reviewed = applyRewrite({ ...question, difficulty });
  reviewed = moveCorrectAnswer(reviewed, index % 4);
  const answer = reviewed.options[reviewed.correctIndex];
  const targetConstruct = `Use ${reviewed.skill} to resolve “${reviewed.prompt}” in the context “${reviewed.scenario}”.`;
  const cefrRationale = `${level} text task: the learner handles “${reviewed.scenario}” and identifies “${answer}” using the stated ${reviewed.skill} cue.`;
  const ambiguityNotes = `Only “${answer}” satisfies the stated context and target; the distractors conflict with the prompt or this rule: ${reviewed.explanation}`;
  return {
    ...reviewed,
    ...russianUiForQuestion(reviewed),
    targetConstruct,
    cefrRationale,
    dialect: reviewed.dialect || DIALECTS[reviewed.id] || 'neutral',
    // A maintenance script must never certify its own output. Existing status
    // is preserved and the strict generator fails if a human review has not
    // already supplied it.
    reviewStatus: reviewed.reviewStatus,
    ambiguityNotes,
    ...(['C1', 'C2'].includes(level)
      ? { upperBandEvidence: UPPER_BAND_EVIDENCE_IDS.has(reviewed.id) }
      : {}),
  };
}

for (const level of LEVELS) {
  const file = join(ROOT, 'content', 'english-test', 'questions', `${level}.json`);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.schemaVersion = 3;
  data.bankVersion = '2026-07-22.4';
  data.questions = data.questions.map((question, index) => reviewQuestion(question, level, index));
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Reviewed ${level}: ${data.questions.length} questions`);
}
