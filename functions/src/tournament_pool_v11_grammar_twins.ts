import { createHash } from 'node:crypto';
import {
  createTournamentProvenanceKey,
  type TournamentProvenanceKey,
} from './tournament_semantic_contract';

export const TOURNAMENT_GRAMMAR_RULE_CATALOG_VERSION = 'arena-grammar-twins-v1' as const;

export type StrictGrammarRuleId =
  | 'subject_be_agreement'
  | 'question_subject_be_agreement'
  | 'modal_base_form'
  | 'question_modal_base_form'
  | 'do_aux_base_form'
  | 'question_do_aux_base_form'
  | 'negative_do_aux_base_form'
  | 'to_infinitive_base_form'
  | 'lets_imperative_base_form'
  | 'irregular_subject_verb_agreement'
  | 'preposition_object_pronoun_case'
  | 'transitive_object_pronoun_case'
  | 'sentence_initial_subject_pronoun_case';

export type V11SourceWord = Readonly<{
  text: string;
  partOfSpeech: string;
  distractors?: readonly string[];
}>;

export type V11SourcePhrase = Readonly<{
  id: string;
  english: string;
  meaning: Readonly<{ ru: string }>;
  words?: readonly V11SourceWord[];
}>;

export type V11SourceDay = Readonly<{
  planId: string;
  dayIndex: number;
  level?: string;
  topic?: Readonly<{ ru?: string }>;
}>;

export type GrammarTwin = Readonly<{
  value: string;
  completedText: string;
  slotIndex: number;
  partOfSpeech: string;
  ruleId: StrictGrammarRuleId;
  reason: string;
  evidence: Readonly<Record<string, string>>;
}>;

export type StrictGrammarTwinSet = Readonly<{
  correctValue: string;
  correctCompletedText: string;
  slotIndex: number;
  partOfSpeech: string;
  ruleId: StrictGrammarRuleId;
  ruleCatalogVersion: typeof TOURNAMENT_GRAMMAR_RULE_CATALOG_VERSION;
  ruleCatalogSha256: string;
  evidence: Readonly<Record<string, string>>;
  distractors: readonly [GrammarTwin, GrammarTwin, GrammarTwin];
  provenanceKey: TournamentProvenanceKey;
}>;

export type StrictGrammarTwinValidation =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: 'source_invalid' | 'proof_missing' | 'proof_mismatch' }>;

type Lexeme = Readonly<{
  value: string;
  normalized: string;
  start: number;
  end: number;
}>;

type VerbParadigm = Readonly<{
  base: string;
  thirdPerson: string;
  past: string;
  participle: string;
  gerund: string;
}>;

const WORD_TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;
const SIMPLE_TOKEN = /^[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*$/u;
const VERB_POS = new Set(['verb', 'verbs', 'to be', 'be']);
const PRONOUN_POS = new Set(['pronoun', 'pronouns']);
const REVIEWED_SUBJECT_PRONOUNS = new Set(['i', 'he', 'she', 'it', 'we', 'they']);
const SUBJECT_PRONOUN_WRONG_VALUES = Object.freeze(['me', 'us', 'him', 'her', 'them']);
const OBJECT_PRONOUN_WRONG_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  me: Object.freeze(['I', 'we', 'he', 'she', 'they']),
  us: Object.freeze(['I', 'we', 'he', 'she', 'they']),
  him: Object.freeze(['I', 'we', 'he', 'she', 'they']),
  her: Object.freeze(['I', 'we', 'he', 'she', 'they']),
  them: Object.freeze(['I', 'we', 'he', 'she', 'they']),
});
const OBJECT_PRONOUN_PREPOSITIONS = new Set([
  'about', 'against', 'among', 'around', 'at', 'before', 'behind', 'beneath',
  'beside', 'between', 'beyond', 'by', 'despite', 'during', 'except', 'for',
  'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off', 'on', 'onto',
  'opposite', 'outside', 'over', 'past', 'round', 'through', 'to', 'toward',
  'towards', 'under', 'underneath', 'unlike', 'until', 'upon', 'with', 'within',
  'without',
]);
const OBJECT_PRONOUN_TRANSITIVE_GOVERNORS = new Set([
  'ask', 'asked', 'asks', 'call', 'called', 'calls', 'give', 'gave', 'given',
  'gives', 'hear', 'heard', 'help', 'helped', 'helps', 'keep', 'kept', 'let',
  'make', 'made', 'makes', 'phone', 'phoned', 'phones', 'remind', 'reminded',
  'reminds', 'show', 'showed', 'shown', 'shows', 'teach', 'taught', 'tell',
  'told', 'tells', 'thank', 'thanked', 'thanks', 'want', 'wanted', 'wants',
]);
const PRESENT_SUBJECT_BE: Readonly<Record<string, 'am' | 'is' | 'are'>> = Object.freeze({
  i: 'am',
  he: 'is',
  she: 'is',
  it: 'is',
  this: 'is',
  that: 'is',
  you: 'are',
  we: 'are',
  they: 'are',
  these: 'are',
  those: 'are',
});
const PAST_SUBJECT_BE: Readonly<Record<string, 'was' | 'were'>> = Object.freeze({
  i: 'was',
  he: 'was',
  she: 'was',
  it: 'was',
  this: 'was',
  that: 'was',
  you: 'were',
  we: 'were',
  they: 'were',
  these: 'were',
  those: 'were',
});
const MODALS = new Set([
  'could', 'might', 'must', 'shall', 'should', 'would',
]);
const QUESTION_MODALS = new Set([
  'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
]);
const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const IRREGULAR_SINGULAR_SUBJECTS = new Set(['he', 'she', 'it', 'this', 'that']);
const IRREGULAR_PLURAL_SUBJECTS = new Set(['i', 'you', 'we', 'they', 'these', 'those']);
const DO_AUXILIARIES = new Set([
  "don't", 'don’t', "doesn't", 'doesn’t', "didn't", 'didn’t',
]);
const PLAIN_DO_AUXILIARIES = new Set(['do', 'does', 'did']);
const QUESTION_WORDS = new Set(['how', 'what', 'when', 'where', 'which', 'who', 'why']);
const TO_INFINITIVE_GOVERNORS = new Set([
  'able', 'agree', 'agreed', 'best', 'chance', 'choose', 'chose', 'decide',
  'decided', 'easy', 'expect', 'expected', 'fail', 'failed', 'forget', 'forgot',
  'glad', 'hard', 'hope', 'hoped', 'learn', 'learned', 'like', 'liked', 'love',
  'loved', 'need', 'needed', 'opportunity', 'place', 'plan', 'planned', 'prefer',
  'preferred', 'promise', 'promised', 'ready', 'refuse', 'refused', 'remember',
  'remembered', 'sorry', 'start', 'started', 'time', 'try', 'tried', 'want',
  'wanted', 'way', 'wish', 'wished',
]);
const BASE_FORM_REJECTED_INFLECTIONS = Object.freeze([
  'thirdPerson', 'past', 'gerund', 'participle',
] as const);
const PRESENT_BE_WRONG_VALUES = Object.freeze({
  am: Object.freeze(['is', 'are', 'been', 'being', 'be']),
  is: Object.freeze(['am', 'are', 'been', 'being', 'be']),
  are: Object.freeze(['am', 'is', 'been', 'being', 'be']),
});
const PAST_BE_WRONG_VALUES = Object.freeze({
  was: Object.freeze(['were', 'been', 'being', 'be']),
  were: Object.freeze(['was', 'been', 'being', 'be']),
});

const VERB_PARADIGMS: readonly VerbParadigm[] = Object.freeze([
  { base: 'adapt', thirdPerson: 'adapts', past: 'adapted', participle: 'adapted', gerund: 'adapting' },
  { base: 'add', thirdPerson: 'adds', past: 'added', participle: 'added', gerund: 'adding' },
  { base: 'answer', thirdPerson: 'answers', past: 'answered', participle: 'answered', gerund: 'answering' },
  { base: 'apply', thirdPerson: 'applies', past: 'applied', participle: 'applied', gerund: 'applying' },
  { base: 'arrive', thirdPerson: 'arrives', past: 'arrived', participle: 'arrived', gerund: 'arriving' },
  { base: 'ask', thirdPerson: 'asks', past: 'asked', participle: 'asked', gerund: 'asking' },
  { base: 'attend', thirdPerson: 'attends', past: 'attended', participle: 'attended', gerund: 'attending' },
  { base: 'avoid', thirdPerson: 'avoids', past: 'avoided', participle: 'avoided', gerund: 'avoiding' },
  { base: 'be', thirdPerson: 'is', past: 'was', participle: 'been', gerund: 'being' },
  { base: 'become', thirdPerson: 'becomes', past: 'became', participle: 'become', gerund: 'becoming' },
  { base: 'book', thirdPerson: 'books', past: 'booked', participle: 'booked', gerund: 'booking' },
  { base: 'buy', thirdPerson: 'buys', past: 'bought', participle: 'bought', gerund: 'buying' },
  { base: 'call', thirdPerson: 'calls', past: 'called', participle: 'called', gerund: 'calling' },
  { base: 'carry', thirdPerson: 'carries', past: 'carried', participle: 'carried', gerund: 'carrying' },
  { base: 'catch', thirdPerson: 'catches', past: 'caught', participle: 'caught', gerund: 'catching' },
  { base: 'change', thirdPerson: 'changes', past: 'changed', participle: 'changed', gerund: 'changing' },
  { base: 'check', thirdPerson: 'checks', past: 'checked', participle: 'checked', gerund: 'checking' },
  { base: 'clarify', thirdPerson: 'clarifies', past: 'clarified', participle: 'clarified', gerund: 'clarifying' },
  { base: 'climb', thirdPerson: 'climbs', past: 'climbed', participle: 'climbed', gerund: 'climbing' },
  { base: 'come', thirdPerson: 'comes', past: 'came', participle: 'come', gerund: 'coming' },
  { base: 'consider', thirdPerson: 'considers', past: 'considered', participle: 'considered', gerund: 'considering' },
  { base: 'cook', thirdPerson: 'cooks', past: 'cooked', participle: 'cooked', gerund: 'cooking' },
  { base: 'cover', thirdPerson: 'covers', past: 'covered', participle: 'covered', gerund: 'covering' },
  { base: 'dance', thirdPerson: 'dances', past: 'danced', participle: 'danced', gerund: 'dancing' },
  { base: 'develop', thirdPerson: 'develops', past: 'developed', participle: 'developed', gerund: 'developing' },
  { base: 'do', thirdPerson: 'does', past: 'did', participle: 'done', gerund: 'doing' },
  { base: 'drink', thirdPerson: 'drinks', past: 'drank', participle: 'drunk', gerund: 'drinking' },
  { base: 'earn', thirdPerson: 'earns', past: 'earned', participle: 'earned', gerund: 'earning' },
  { base: 'eat', thirdPerson: 'eats', past: 'ate', participle: 'eaten', gerund: 'eating' },
  { base: 'exchange', thirdPerson: 'exchanges', past: 'exchanged', participle: 'exchanged', gerund: 'exchanging' },
  { base: 'exercise', thirdPerson: 'exercises', past: 'exercised', participle: 'exercised', gerund: 'exercising' },
  { base: 'expand', thirdPerson: 'expands', past: 'expanded', participle: 'expanded', gerund: 'expanding' },
  { base: 'explain', thirdPerson: 'explains', past: 'explained', participle: 'explained', gerund: 'explaining' },
  { base: 'explore', thirdPerson: 'explores', past: 'explored', participle: 'explored', gerund: 'exploring' },
  { base: 'feel', thirdPerson: 'feels', past: 'felt', participle: 'felt', gerund: 'feeling' },
  { base: 'fill', thirdPerson: 'fills', past: 'filled', participle: 'filled', gerund: 'filling' },
  { base: 'find', thirdPerson: 'finds', past: 'found', participle: 'found', gerund: 'finding' },
  { base: 'finish', thirdPerson: 'finishes', past: 'finished', participle: 'finished', gerund: 'finishing' },
  { base: 'fix', thirdPerson: 'fixes', past: 'fixed', participle: 'fixed', gerund: 'fixing' },
  { base: 'focus', thirdPerson: 'focuses', past: 'focused', participle: 'focused', gerund: 'focusing' },
  { base: 'get', thirdPerson: 'gets', past: 'got', participle: 'gotten', gerund: 'getting' },
  { base: 'go', thirdPerson: 'goes', past: 'went', participle: 'gone', gerund: 'going' },
  { base: 'grow', thirdPerson: 'grows', past: 'grew', participle: 'grown', gerund: 'growing' },
  { base: 'handle', thirdPerson: 'handles', past: 'handled', participle: 'handled', gerund: 'handling' },
  { base: 'happen', thirdPerson: 'happens', past: 'happened', participle: 'happened', gerund: 'happening' },
  { base: 'have', thirdPerson: 'has', past: 'had', participle: 'had', gerund: 'having' },
  { base: 'hear', thirdPerson: 'hears', past: 'heard', participle: 'heard', gerund: 'hearing' },
  { base: 'help', thirdPerson: 'helps', past: 'helped', participle: 'helped', gerund: 'helping' },
  { base: 'improve', thirdPerson: 'improves', past: 'improved', participle: 'improved', gerund: 'improving' },
  { base: 'join', thirdPerson: 'joins', past: 'joined', participle: 'joined', gerund: 'joining' },
  { base: 'keep', thirdPerson: 'keeps', past: 'kept', participle: 'kept', gerund: 'keeping' },
  { base: 'know', thirdPerson: 'knows', past: 'knew', participle: 'known', gerund: 'knowing' },
  { base: 'learn', thirdPerson: 'learns', past: 'learned', participle: 'learned', gerund: 'learning' },
  { base: 'leave', thirdPerson: 'leaves', past: 'left', participle: 'left', gerund: 'leaving' },
  { base: 'like', thirdPerson: 'likes', past: 'liked', participle: 'liked', gerund: 'liking' },
  { base: 'live', thirdPerson: 'lives', past: 'lived', participle: 'lived', gerund: 'living' },
  { base: 'look', thirdPerson: 'looks', past: 'looked', participle: 'looked', gerund: 'looking' },
  { base: 'love', thirdPerson: 'loves', past: 'loved', participle: 'loved', gerund: 'loving' },
  { base: 'make', thirdPerson: 'makes', past: 'made', participle: 'made', gerund: 'making' },
  { base: 'meet', thirdPerson: 'meets', past: 'met', participle: 'met', gerund: 'meeting' },
  { base: 'miss', thirdPerson: 'misses', past: 'missed', participle: 'missed', gerund: 'missing' },
  { base: 'move', thirdPerson: 'moves', past: 'moved', participle: 'moved', gerund: 'moving' },
  { base: 'order', thirdPerson: 'orders', past: 'ordered', participle: 'ordered', gerund: 'ordering' },
  { base: 'pack', thirdPerson: 'packs', past: 'packed', participle: 'packed', gerund: 'packing' },
  { base: 'paint', thirdPerson: 'paints', past: 'painted', participle: 'painted', gerund: 'painting' },
  { base: 'park', thirdPerson: 'parks', past: 'parked', participle: 'parked', gerund: 'parking' },
  { base: 'pass', thirdPerson: 'passes', past: 'passed', participle: 'passed', gerund: 'passing' },
  { base: 'pay', thirdPerson: 'pays', past: 'paid', participle: 'paid', gerund: 'paying' },
  { base: 'phone', thirdPerson: 'phones', past: 'phoned', participle: 'phoned', gerund: 'phoning' },
  { base: 'photograph', thirdPerson: 'photographs', past: 'photographed', participle: 'photographed', gerund: 'photographing' },
  { base: 'pick', thirdPerson: 'picks', past: 'picked', participle: 'picked', gerund: 'picking' },
  { base: 'reach', thirdPerson: 'reaches', past: 'reached', participle: 'reached', gerund: 'reaching' },
  { base: 'receive', thirdPerson: 'receives', past: 'received', participle: 'received', gerund: 'receiving' },
  { base: 'recommend', thirdPerson: 'recommends', past: 'recommended', participle: 'recommended', gerund: 'recommending' },
  { base: 'relax', thirdPerson: 'relaxes', past: 'relaxed', participle: 'relaxed', gerund: 'relaxing' },
  { base: 'rent', thirdPerson: 'rents', past: 'rented', participle: 'rented', gerund: 'renting' },
  { base: 'report', thirdPerson: 'reports', past: 'reported', participle: 'reported', gerund: 'reporting' },
  { base: 'rest', thirdPerson: 'rests', past: 'rested', participle: 'rested', gerund: 'resting' },
  { base: 'retire', thirdPerson: 'retires', past: 'retired', participle: 'retired', gerund: 'retiring' },
  { base: 'return', thirdPerson: 'returns', past: 'returned', participle: 'returned', gerund: 'returning' },
  { base: 'review', thirdPerson: 'reviews', past: 'reviewed', participle: 'reviewed', gerund: 'reviewing' },
  { base: 'save', thirdPerson: 'saves', past: 'saved', participle: 'saved', gerund: 'saving' },
  { base: 'see', thirdPerson: 'sees', past: 'saw', participle: 'seen', gerund: 'seeing' },
  { base: 'send', thirdPerson: 'sends', past: 'sent', participle: 'sent', gerund: 'sending' },
  { base: 'share', thirdPerson: 'shares', past: 'shared', participle: 'shared', gerund: 'sharing' },
  { base: 'ship', thirdPerson: 'ships', past: 'shipped', participle: 'shipped', gerund: 'shipping' },
  { base: 'sit', thirdPerson: 'sits', past: 'sat', participle: 'sat', gerund: 'sitting' },
  { base: 'sleep', thirdPerson: 'sleeps', past: 'slept', participle: 'slept', gerund: 'sleeping' },
  { base: 'solve', thirdPerson: 'solves', past: 'solved', participle: 'solved', gerund: 'solving' },
  { base: 'speak', thirdPerson: 'speaks', past: 'spoke', participle: 'spoken', gerund: 'speaking' },
  { base: 'spend', thirdPerson: 'spends', past: 'spent', participle: 'spent', gerund: 'spending' },
  { base: 'start', thirdPerson: 'starts', past: 'started', participle: 'started', gerund: 'starting' },
  { base: 'stay', thirdPerson: 'stays', past: 'stayed', participle: 'stayed', gerund: 'staying' },
  { base: 'stop', thirdPerson: 'stops', past: 'stopped', participle: 'stopped', gerund: 'stopping' },
  { base: 'succeed', thirdPerson: 'succeeds', past: 'succeeded', participle: 'succeeded', gerund: 'succeeding' },
  { base: 'swim', thirdPerson: 'swims', past: 'swam', participle: 'swum', gerund: 'swimming' },
  { base: 'take', thirdPerson: 'takes', past: 'took', participle: 'taken', gerund: 'taking' },
  { base: 'talk', thirdPerson: 'talks', past: 'talked', participle: 'talked', gerund: 'talking' },
  { base: 'test', thirdPerson: 'tests', past: 'tested', participle: 'tested', gerund: 'testing' },
  { base: 'text', thirdPerson: 'texts', past: 'texted', participle: 'texted', gerund: 'texting' },
  { base: 'travel', thirdPerson: 'travels', past: 'traveled', participle: 'traveled', gerund: 'traveling' },
  { base: 'try', thirdPerson: 'tries', past: 'tried', participle: 'tried', gerund: 'trying' },
  { base: 'understand', thirdPerson: 'understands', past: 'understood', participle: 'understood', gerund: 'understanding' },
  { base: 'use', thirdPerson: 'uses', past: 'used', participle: 'used', gerund: 'using' },
  { base: 'visit', thirdPerson: 'visits', past: 'visited', participle: 'visited', gerund: 'visiting' },
  { base: 'wait', thirdPerson: 'waits', past: 'waited', participle: 'waited', gerund: 'waiting' },
  { base: 'wake', thirdPerson: 'wakes', past: 'woke', participle: 'woken', gerund: 'waking' },
  { base: 'walk', thirdPerson: 'walks', past: 'walked', participle: 'walked', gerund: 'walking' },
  { base: 'watch', thirdPerson: 'watches', past: 'watched', participle: 'watched', gerund: 'watching' },
  { base: 'work', thirdPerson: 'works', past: 'worked', participle: 'worked', gerund: 'working' },
  { base: 'write', thirdPerson: 'writes', past: 'wrote', participle: 'written', gerund: 'writing' },
]);

export const TOURNAMENT_GRAMMAR_RULE_CATALOG_DESCRIPTOR = Object.freeze({
  version: TOURNAMENT_GRAMMAR_RULE_CATALOG_VERSION,
  rules: Object.freeze([
    'subject_be_agreement',
    'question_subject_be_agreement',
    'modal_base_form',
    'question_modal_base_form',
    'do_aux_base_form',
    'question_do_aux_base_form',
    'negative_do_aux_base_form',
    'to_infinitive_base_form',
    'lets_imperative_base_form',
    'irregular_subject_verb_agreement',
    'preposition_object_pronoun_case',
    'transitive_object_pronoun_case',
    'sentence_initial_subject_pronoun_case',
  ] as const),
  presentSubjectBe: PRESENT_SUBJECT_BE,
  pastSubjectBe: PAST_SUBJECT_BE,
  modals: Object.freeze([...MODALS].sort()),
  questionModals: Object.freeze([...QUESTION_MODALS].sort()),
  subjectPronouns: Object.freeze([...SUBJECT_PRONOUNS].sort()),
  irregularSingularSubjects: Object.freeze([...IRREGULAR_SINGULAR_SUBJECTS].sort()),
  irregularPluralSubjects: Object.freeze([...IRREGULAR_PLURAL_SUBJECTS].sort()),
  doAuxiliaries: Object.freeze([...DO_AUXILIARIES].sort()),
  plainDoAuxiliaries: Object.freeze([...PLAIN_DO_AUXILIARIES].sort()),
  questionWords: Object.freeze([...QUESTION_WORDS].sort()),
  toInfinitiveGovernors: Object.freeze([...TO_INFINITIVE_GOVERNORS].sort()),
  baseFormRejectedInflections: BASE_FORM_REJECTED_INFLECTIONS,
  presentBeWrongValues: PRESENT_BE_WRONG_VALUES,
  pastBeWrongValues: PAST_BE_WRONG_VALUES,
  objectPronounWrongValues: OBJECT_PRONOUN_WRONG_VALUES,
  objectPronounPrepositions: Object.freeze([...OBJECT_PRONOUN_PREPOSITIONS].sort()),
  objectPronounTransitiveGovernors: Object.freeze([...OBJECT_PRONOUN_TRANSITIVE_GOVERNORS].sort()),
  reviewedSubjectPronouns: Object.freeze([...REVIEWED_SUBJECT_PRONOUNS].sort()),
  subjectPronounWrongValues: SUBJECT_PRONOUN_WRONG_VALUES,
  verbParadigms: VERB_PARADIGMS,
  proofPolicy: Object.freeze({
    annotatedTargetMustBeUnique: true,
    annotatedTargetMustBeSingleToken: true,
    directAgreementSubjectSlot: 0,
    directAgreementVerbSlot: 1,
    distractorSetSize: 3,
    deduplicateRejectedSurfaceForms: true,
    excludeAffirmativeDoAuxiliary: true,
    excludeAmbiguousAffirmativeModals: Object.freeze(['can', 'may', 'will']),
    excludePastInvertedBeQuestions: true,
    excludePerfectAndProgressiveProofs: true,
    excludePleaseImperative: true,
    questionMustEndWithQuestionMark: true,
    questionDoAuxiliaryMustBeInitialOrFollowOneQuestionWord: true,
    negativeDoAuxiliaryMustFollowSentenceInitialSubject: true,
    subjectPronounMustBeSentenceInitialBeforeReviewedFinitePredicate: true,
    rejectIfPrefixedSubjectClause: true,
    rejectedDirectAgreementPrefixTokens: Object.freeze(['if']),
    irregularAgreementRequiresDistinctPastAndParticiple: true,
    rejectedFormsMustExcludeCorrectSurface: true,
    maxOptionLengthRatio: 3,
    maxOptionCodePointDelta: 4,
    supportedPartOfSpeech: Object.freeze(['be', 'pronoun', 'pronouns', 'to be', 'verb', 'verbs']),
  }),
});

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  throw new Error('unsupported_grammar_catalog_value');
}

export const TOURNAMENT_GRAMMAR_RULE_CATALOG_SHA256 = createHash('sha256')
  .update(canonicalJson(TOURNAMENT_GRAMMAR_RULE_CATALOG_DESCRIPTOR), 'utf8')
  .digest('hex');

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
}

function lexemes(value: string): readonly Lexeme[] {
  return [...value.matchAll(WORD_TOKEN)].map((match) => ({
    value: match[0],
    normalized: normalized(match[0]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

function replaceLexeme(source: string, lexeme: Lexeme, replacement: string): string {
  return `${source.slice(0, lexeme.start)}${replacement}${source.slice(lexeme.end)}`;
}

function exactSourceWord(
  phrase: V11SourcePhrase,
  word: unknown,
): Readonly<{
  tokens: readonly Lexeme[];
  slotIndex: number;
  token: Lexeme;
  partOfSpeech: 'verb' | 'pronoun';
}> | null {
  if (!word || typeof word !== 'object' || Array.isArray(word)) return null;
  const sourceWord = word as Partial<V11SourceWord>;
  if (typeof sourceWord.text !== 'string' || typeof sourceWord.partOfSpeech !== 'string') return null;
  const normalizedPartOfSpeech = normalized(sourceWord.partOfSpeech).replace(/[_-]+/gu, ' ');
  const partOfSpeech = VERB_POS.has(normalizedPartOfSpeech)
    ? 'verb' as const
    : PRONOUN_POS.has(normalizedPartOfSpeech)
      ? 'pronoun' as const
      : null;
  if (!SIMPLE_TOKEN.test(sourceWord.text) || !partOfSpeech) return null;
  const tokens = lexemes(phrase.english);
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.normalized === normalized(sourceWord.text ?? ''));
  if (matches.length !== 1) return null;
  return { tokens, slotIndex: matches[0].index, token: matches[0].token, partOfSpeech };
}

function freezeEvidence(input: Record<string, string>): Readonly<Record<string, string>> {
  return Object.freeze({ ...input });
}

function reasonFor(
  ruleId: StrictGrammarRuleId,
  wrong: string,
  correct: string,
  anchor: string,
): string {
  if (ruleId === 'subject_be_agreement' || ruleId === 'question_subject_be_agreement') {
    if (new Set(['be', 'been', 'being']).has(normalized(wrong))) {
      return `Форма «${wrong}» нефинитная и не образует здесь сказуемое; требуется финитная форма «${correct}».`;
    }
    return `Форма «${wrong}» не согласуется с подлежащим «${anchor}»; здесь требуется «${correct}».`;
  }
  if (ruleId === 'modal_base_form') {
    return `После модального глагола «${anchor}» нужна базовая форма «${correct}», поэтому «${wrong}» грамматически неверно.`;
  }
  if (ruleId === 'question_modal_base_form') {
    return `В вопросе после модального «${anchor}» и подлежащего нужна базовая форма «${correct}», поэтому «${wrong}» грамматически неверно.`;
  }
  if (ruleId === 'do_aux_base_form'
    || ruleId === 'question_do_aux_base_form'
    || ruleId === 'negative_do_aux_base_form') {
    return `После вспомогательного «${anchor}» нужна базовая форма «${correct}», поэтому «${wrong}» грамматически неверно.`;
  }
  if (ruleId === 'lets_imperative_base_form') {
    return `После «${anchor}» нужна базовая форма «${correct}», поэтому «${wrong}» грамматически неверно.`;
  }
  if (ruleId === 'irregular_subject_verb_agreement') {
    return `С подлежащим «${anchor}» здесь нужна форма «${correct}»; «${wrong}» не образует правильное сказуемое.`;
  }
  if (ruleId === 'preposition_object_pronoun_case'
    || ruleId === 'transitive_object_pronoun_case') {
    const governor = ruleId === 'preposition_object_pronoun_case' ? 'предлога' : 'глагола';
    return `После ${governor} «${anchor}» нужен объектный падеж «${correct}»; форма «${wrong}» грамматически неверна.`;
  }
  if (ruleId === 'sentence_initial_subject_pronoun_case') {
    return `В позиции подлежащего перед сказуемым «${anchor}» нужен именительный падеж «${correct}»; форма «${wrong}» грамматически неверна.`;
  }
  return `После конструкции «${anchor} to» нужна базовая форма «${correct}», поэтому «${wrong}» грамматически неверно.`;
}

function createSet(input: Readonly<{
  phrase: V11SourcePhrase;
  provenanceKey: TournamentProvenanceKey;
  token: Lexeme;
  slotIndex: number;
  correctValue: string;
  wrongValues: readonly [string, string, string];
  ruleId: StrictGrammarRuleId;
  anchor: string;
  partOfSpeech?: 'verb' | 'pronoun';
}>): StrictGrammarTwinSet {
  const commonEvidence = freezeEvidence({
    anchor: input.anchor,
    expectedForm: input.correctValue,
    sourceSentence: input.phrase.english,
  });
  const distractors = input.wrongValues.map((value): GrammarTwin => Object.freeze({
    value,
    completedText: replaceLexeme(input.phrase.english, input.token, value),
    slotIndex: input.slotIndex,
    partOfSpeech: input.partOfSpeech ?? 'verb',
    ruleId: input.ruleId,
    reason: reasonFor(input.ruleId, value, input.correctValue, input.anchor),
    evidence: freezeEvidence({
      ...commonEvidence,
      rejectedForm: value,
    }),
  })) as unknown as readonly [GrammarTwin, GrammarTwin, GrammarTwin];
  return Object.freeze({
    correctValue: input.correctValue,
    correctCompletedText: input.phrase.english,
    slotIndex: input.slotIndex,
    partOfSpeech: input.partOfSpeech ?? 'verb',
    ruleId: input.ruleId,
    ruleCatalogVersion: TOURNAMENT_GRAMMAR_RULE_CATALOG_VERSION,
    ruleCatalogSha256: TOURNAMENT_GRAMMAR_RULE_CATALOG_SHA256,
    evidence: commonEvidence,
    distractors: Object.freeze(distractors),
    provenanceKey: input.provenanceKey,
  });
}

function triples(values: readonly string[]): readonly (readonly [string, string, string])[] {
  const unique = values.filter((value, index) => values.indexOf(value) === index);
  const result: Array<readonly [string, string, string]> = [];
  for (let first = 0; first < unique.length - 2; first += 1) {
    for (let second = first + 1; second < unique.length - 1; second += 1) {
      for (let third = second + 1; third < unique.length; third += 1) {
        result.push(Object.freeze([unique[first], unique[second], unique[third]]));
      }
    }
  }
  return Object.freeze(result);
}

function baseFormSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  const paradigm = VERB_PARADIGMS.find((item) => item.base === found.token.normalized);
  if (!paradigm || found.slotIndex < 1) return [];
  const previous = found.tokens[found.slotIndex - 1]?.normalized ?? '';
  const beforePrevious = found.tokens[found.slotIndex - 2]?.normalized ?? '';
  const threeBefore = found.tokens[found.slotIndex - 3]?.normalized ?? '';
  let ruleId: StrictGrammarRuleId | null = null;
  let anchor = previous;
  if (MODALS.has(previous)) ruleId = 'modal_base_form';
  else if (phrase.english.trimEnd().endsWith('?')
    && SUBJECT_PRONOUNS.has(previous)
    && QUESTION_MODALS.has(beforePrevious)) {
    ruleId = 'question_modal_base_form';
    anchor = beforePrevious;
  }
  else if (DO_AUXILIARIES.has(previous)) ruleId = 'do_aux_base_form';
  else if (phrase.english.trimEnd().endsWith('?')
    && SUBJECT_PRONOUNS.has(previous)
    && PLAIN_DO_AUXILIARIES.has(beforePrevious)
    && (found.slotIndex - 2 === 0
      || (found.slotIndex - 2 === 1 && QUESTION_WORDS.has(found.tokens[0]?.normalized ?? '')))) {
    ruleId = 'question_do_aux_base_form';
    anchor = beforePrevious;
  }
  else if (previous === 'not'
    && found.slotIndex === 3
    && PLAIN_DO_AUXILIARIES.has(beforePrevious)
    && SUBJECT_PRONOUNS.has(threeBefore)) {
    ruleId = 'negative_do_aux_base_form';
    anchor = beforePrevious;
  }
  else if (previous === "let's" || previous === 'let’s') ruleId = 'lets_imperative_base_form';
  else if (previous === 'to' && TO_INFINITIVE_GOVERNORS.has(beforePrevious)) {
    ruleId = 'to_infinitive_base_form';
    anchor = beforePrevious;
  }
  if (!ruleId) return [];
  const wrongValues = BASE_FORM_REJECTED_INFLECTIONS.map((form) => paradigm[form])
    .filter((value, index, values) => value !== paradigm.base && values.indexOf(value) === index);
  return triples(wrongValues).map((wrongTriple) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues: wrongTriple,
    ruleId,
    anchor,
  }));
}

function subjectBeSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  if (found.slotIndex !== 1) return [];
  const subject = found.tokens[found.slotIndex - 1]?.normalized ?? '';
  if (found.tokens[found.slotIndex - 2]?.normalized === 'if') return [];
  const correct = found.token.normalized;
  const presentExpected = PRESENT_SUBJECT_BE[subject];
  const pastExpected = PAST_SUBJECT_BE[subject];
  let wrongValues: readonly string[] | null = null;
  if (presentExpected === correct) {
    wrongValues = PRESENT_BE_WRONG_VALUES[correct];
  } else if (pastExpected === correct) {
    wrongValues = PAST_BE_WRONG_VALUES[correct];
  }
  if (!wrongValues) return [];
  return triples(wrongValues).map((wrongTriple) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues: wrongTriple,
    ruleId: 'subject_be_agreement',
    anchor: found.tokens[found.slotIndex - 1]?.value ?? subject,
  }));
}

function irregularSubjectAgreementSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  if (found.slotIndex !== 1) return [];
  const subjectToken = found.tokens[found.slotIndex - 1];
  const subject = subjectToken?.normalized ?? '';
  const singular = IRREGULAR_SINGULAR_SUBJECTS.has(subject);
  const plural = IRREGULAR_PLURAL_SUBJECTS.has(subject);
  if (!singular && !plural) return [];
  const paradigm = VERB_PARADIGMS.find((item) => (
    item.past !== item.participle
    && (singular ? item.thirdPerson : item.base) === found.token.normalized
  ));
  if (!paradigm || !subjectToken) return [];
  const wrong = singular
    ? [paradigm.base, paradigm.participle, paradigm.gerund]
    : [paradigm.thirdPerson, paradigm.participle, paradigm.gerund];
  return triples(wrong.filter((value) => value !== found.token.normalized)).map((wrongValues) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues,
    ruleId: 'irregular_subject_verb_agreement',
    anchor: subjectToken.value,
  }));
}

function sentenceCase(value: string): string {
  return value.length ? `${value[0].toLocaleUpperCase('en')}${value.slice(1)}` : value;
}

function isReviewedFinitePredicate(subject: string, predicate: string): boolean {
  if (PRESENT_SUBJECT_BE[subject] === predicate || PAST_SUBJECT_BE[subject] === predicate) return true;
  if (QUESTION_MODALS.has(predicate) || predicate === 'did' || predicate === 'had') return true;
  const singular = IRREGULAR_SINGULAR_SUBJECTS.has(subject);
  const plural = IRREGULAR_PLURAL_SUBJECTS.has(subject);
  if ((singular && (predicate === 'does' || predicate === 'has'))
    || (plural && (predicate === 'do' || predicate === 'have'))) return true;
  return VERB_PARADIGMS.some((paradigm) => (
    predicate === paradigm.past
    || (singular && predicate === paradigm.thirdPerson)
    || (plural && predicate === paradigm.base)
  ));
}

function sentenceInitialSubjectPronounSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  const subject = found.token.normalized;
  const predicate = found.tokens[1];
  if (found.slotIndex !== 0 || !REVIEWED_SUBJECT_PRONOUNS.has(subject)
    || !predicate || !isReviewedFinitePredicate(subject, predicate.normalized)) return [];
  return triples(SUBJECT_PRONOUN_WRONG_VALUES.map(sentenceCase)).map((wrongTriple) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues: wrongTriple,
    ruleId: 'sentence_initial_subject_pronoun_case',
    anchor: predicate.value,
    partOfSpeech: 'pronoun',
  }));
}

function questionSubjectBeSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  if (found.slotIndex !== 0 || found.tokens.length < 2 || !phrase.english.trimEnd().endsWith('?')) return [];
  const subjectToken = found.tokens[1];
  const subject = subjectToken?.normalized ?? '';
  const correct = found.token.normalized;
  const presentExpected = PRESENT_SUBJECT_BE[subject];
  let wrongValues: readonly string[] | null = null;
  if (presentExpected === correct) {
    wrongValues = PRESENT_BE_WRONG_VALUES[correct];
  }
  if (!wrongValues || !subjectToken) return [];
  return triples(wrongValues.map(sentenceCase)).map((wrongTriple) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues: wrongTriple,
    ruleId: 'question_subject_be_agreement',
    anchor: subjectToken.value,
  }));
}

function prepositionObjectPronounSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  if (found.slotIndex < 1) return [];
  const preposition = found.tokens[found.slotIndex - 1];
  const wrongValues = OBJECT_PRONOUN_WRONG_VALUES[found.token.normalized];
  if (!preposition || !OBJECT_PRONOUN_PREPOSITIONS.has(preposition.normalized) || !wrongValues) return [];
  return triples(wrongValues).map((wrongTriple) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues: wrongTriple,
    ruleId: 'preposition_object_pronoun_case',
    anchor: preposition.value,
    partOfSpeech: 'pronoun',
  }));
}

function transitiveObjectPronounSets(
  phrase: V11SourcePhrase,
  provenanceKey: TournamentProvenanceKey,
  found: Readonly<{ tokens: readonly Lexeme[]; slotIndex: number; token: Lexeme }>,
): readonly StrictGrammarTwinSet[] {
  if (found.slotIndex < 1) return [];
  const governor = found.tokens[found.slotIndex - 1];
  const wrongValues = OBJECT_PRONOUN_WRONG_VALUES[found.token.normalized];
  if (!governor || !OBJECT_PRONOUN_TRANSITIVE_GOVERNORS.has(governor.normalized) || !wrongValues) return [];
  return triples(wrongValues).map((wrongTriple) => createSet({
    phrase,
    provenanceKey,
    token: found.token,
    slotIndex: found.slotIndex,
    correctValue: found.token.value,
    wrongValues: wrongTriple,
    ruleId: 'transitive_object_pronoun_case',
    anchor: governor.value,
    partOfSpeech: 'pronoun',
  }));
}

function provenanceFor(day: V11SourceDay, phrase: V11SourcePhrase): TournamentProvenanceKey | null {
  if (!Number.isInteger(day.dayIndex) || day.dayIndex < 0) return null;
  try {
    return createTournamentProvenanceKey(`${day.planId}:${day.dayIndex}:${phrase.id}`);
  } catch {
    return null;
  }
}

export function buildStrictGrammarTwinSets(
  day: V11SourceDay,
  phrase: V11SourcePhrase,
): readonly StrictGrammarTwinSet[] {
  if (!day || !phrase || typeof phrase.english !== 'string' || !phrase.english.trim()
    || !Array.isArray(phrase.words)) return [];
  const provenanceKey = provenanceFor(day, phrase);
  if (!provenanceKey) return [];
  const results: StrictGrammarTwinSet[] = [];
  for (const word of phrase.words) {
    const found = exactSourceWord(phrase, word);
    if (!found) continue;
    if (found.partOfSpeech === 'pronoun') {
      const subjectCase = sentenceInitialSubjectPronounSets(phrase, provenanceKey, found);
      const prepositionObject = prepositionObjectPronounSets(phrase, provenanceKey, found);
      results.push(...(subjectCase.length
        ? subjectCase
        : prepositionObject.length
          ? prepositionObject
          : transitiveObjectPronounSets(phrase, provenanceKey, found)));
      continue;
    }
    const subjectBe = subjectBeSets(phrase, provenanceKey, found);
    const questionSubjectBe = questionSubjectBeSets(phrase, provenanceKey, found);
    const baseForms = baseFormSets(phrase, provenanceKey, found);
    const irregularAgreement = irregularSubjectAgreementSets(phrase, provenanceKey, found);
    results.push(...(subjectBe.length
      ? subjectBe
      : questionSubjectBe.length
        ? questionSubjectBe
        : baseForms.length
          ? baseForms
          : irregularAgreement));
  }
  return Object.freeze(results.filter((proof) => {
    const lengths = [proof.correctValue, ...proof.distractors.map((item) => item.value)]
      .map((value) => [...value].length);
    return Math.max(...lengths) / Math.max(1, Math.min(...lengths)) <= 3
      && Math.max(...lengths) - Math.min(...lengths) <= 4;
  }));
}

export function validateStrictGrammarTwinSet(
  day: V11SourceDay,
  phrase: V11SourcePhrase,
  candidate: unknown,
): StrictGrammarTwinValidation {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, reason: 'proof_missing' };
  }
  const proof = candidate as Partial<StrictGrammarTwinSet>;
  const rebuilt = buildStrictGrammarTwinSets(day, phrase);
  if (!rebuilt.length) return { ok: false, reason: 'source_invalid' };
  const matchingProofs = rebuilt.filter((item) => (
    item.slotIndex === proof.slotIndex
    && item.ruleId === proof.ruleId
    && normalized(item.correctValue) === normalized(proof.correctValue ?? '')
  ));
  if (!matchingProofs.length) return { ok: false, reason: 'proof_missing' };
  try {
    return matchingProofs.some((rebuiltProof) => canonicalJson(rebuiltProof) === canonicalJson(candidate))
      ? { ok: true }
      : { ok: false, reason: 'proof_mismatch' };
  } catch {
    return { ok: false, reason: 'proof_mismatch' };
  }
}
