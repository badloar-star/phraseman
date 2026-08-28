import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from '../generator_course_contract';
import type {
  LearningV2ModeAudioReferenceV1,
  LearningV2ModeChoiceFeedbackV1,
  LearningV2ModeNativePayloadV1,
} from '../../contracts/mode_native_payload_v1';
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionVocabularyContactStageV1,
  type SessionVocabularySourceV1,
} from './session_shard_from_source_v1';
import { ES_EPISODE_01_SESSION_33_VOCABULARY_V1 } from './es_episode_01_session_33_vocabulary_v1';
import { ES_EPISODE_01_SESSION_33_PHRASES } from './es_episode_01_session_33_phrases_v1';

// зачем этот файл (владелец, 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10, открывает Главу 5 "Больше признаков"): испанская сессия
// 33 переписывается в mode-native формат, зеркаля КОД (не данные) сессии 18 —
// тот же класс сессии (words_then_phrases, ровно одно новое слово). Легаси-
// черновик 2026-08-25/26 (vocabulary/phrases/intro/localized_details) уже
// полностью mode-native-ready по ДАННЫМ: словарная карточка bueno авторит все
// три контакта (recognize/retrieve_meaning/build_form) с честными
// дистракторами, все 15 фраз локализованы на восьми объяснительных локалях.
// Единственное, чего не хватало — интеракционного слоя и wiring, которые
// добавляет этот файл; ни одна строка словаря/фраз/интро не менялась.
//
// зачем phrase_builder/listen_build_dictation используются только на
// индексах 0-8 и 14 (владелец, 2026-08-28, тот же 8-дистракторный бюджет,
// что и в сессиях 18/22/25-32): подсчитано скриптом по количеству уникальных
// value среди distractors каждой фразы — индексы 0-4 дают 4 уникальных,
// 5-8 и 14 дают 6, а индексы 9/10/12/13 дают 10, индекс 11 — 11. Это выше
// лимита responseFeedbackById в course_session_client_children_v1.ts;
// индексы 9-13 получают только listen_choose/context_gap_grammar/speed_match.
const vocabulary = ES_EPISODE_01_SESSION_33_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_33_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_33_mode_native_phrase_count_invalid');
}
if (vocabulary.length !== 1) {
  throw new Error('es_session_33_mode_native_vocabulary_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-28, тот же класс бага сессий 5/6/8-32):
// runtime-валидатор ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без
// диакритики. Эта сессия не вводит диакритику в новом слове (bueno без
// accent), но фразы содержат también (reasonCode 'accent_missing:también') —
// защита применена проактивно на все reasonCode/value.
function asciiId(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/gu, '');
}

function feedback(
  responseId: string,
  correct: boolean,
  testedDimension: string,
  feedbackByLocale: LearningV2Localized<string>,
): LearningV2ModeChoiceFeedbackV1 {
  return Object.freeze({ responseId, correct, testedDimension, feedbackByLocale });
}

function vocabularyFeedback(
  item: SessionVocabularySourceV1,
  stage: SessionVocabularyContactStageV1,
): readonly LearningV2ModeChoiceFeedbackV1[] {
  const contact = item.contacts[stage];
  return Object.freeze([
    feedback(`${item.id}:${stage}:correct`, true, stage, expandLocalized(contact.guidance)),
    ...contact.distractors.map((entry) => feedback(
      `${item.id}:${stage}:${asciiId(entry.reasonCode)}`,
      false,
      `${entry.trapType}:${asciiId(entry.reasonCode)}`,
      expandLocalized(entry.feedback),
    )),
  ]);
}

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-32): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails хранит объяснение
// под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_33_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_33_phrase_locale_missing:${phraseIndex}:${locale}`);
    return [locale, detail[field]];
  })) as LearningV2Localized<string>;
}

function localizedPhraseDistractorFeedback(
  phraseIndex: number,
  value: string,
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const reason = phrase?.localizedDetails?.[englishExplanationLocale as typeof locale]?.distractors.find(
      (entry) => entry.value === value,
    )?.reason;
    if (!reason) throw new Error(`es_session_33_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
    return [locale, reason];
  })) as LearningV2Localized<string>;
}

function phraseBuilderFeedback(phraseIndex: number): readonly LearningV2ModeChoiceFeedbackV1[] {
  const phrase = phrases[phraseIndex]!;
  const values = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))];
  return Object.freeze([
    feedback(`${phrase.id}:builder:correct`, true, 'phrase_assembly', localizedPhraseField(phraseIndex, 'explanation')),
    ...values.map((value) => feedback(
      `${phrase.id}:builder:${asciiId(value)}`,
      false,
      `phrase_assembly:${asciiId(value)}`,
      localizedPhraseDistractorFeedback(phraseIndex, value),
    )),
  ]);
}

function authoredAudio(audioTargetId: string, transcript: string): LearningV2ModeAudioReferenceV1 {
  return Object.freeze({ audioTargetId, transcript });
}

// Stable logical targets exist before immutable clips are published. The DEV
// owner-preview reads their exact transcripts through on-device TTS; release
// audio later binds to the same ids without changing authored interactions.
const WORD_AUDIO = authoredAudio('es-e01-s33-word-bueno', 'bueno');
const WORD_SLOW_AUDIO = authoredAudio('es-e01-s33-word-bueno-slow', 'bueno');
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s33-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s33-phrase-${phraseIndex + 1}-slow`, phrase.english);
}

const item = vocabulary[0]!;

// зачем эта извлекаемая доп.-ловушка на build_form (владелец, 2026-08-28,
// тот же класс, что сессии 3/4/5/6/9/12/18): build_form-контакт словаря уже
// содержит buenno (орфография) и malo (антоним) — оба честных дистрактора,
// доп.-ловушка не требуется отдельно, budget контакта уже 2 (manual policy).
function listenChooseBueno(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.recognize;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: WORD_AUDIO,
    slowReferenceAudio: WORD_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:recognize:correct`, targetText: item.target, meaningByLocale: null },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:recognize:${asciiId(entry.reasonCode)}`,
        targetText: entry.value,
        meaningByLocale: null,
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'recognize'),
  });
}

function listenBuildBueno(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.recognize;
  return Object.freeze({
    family: 'listen_build_dictation',
    referenceAudio: WORD_AUDIO,
    slowReferenceAudio: WORD_SLOW_AUDIO,
    hiddenTargetPhrase: item.target,
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze(contact.distractors.map((entry) => entry.value)),
    slotFeedback: vocabularyFeedback(item, 'recognize'),
  });
}

function contextGapBuenoMeaning(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.retrieve_meaning;
  const phrase = phrases[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: 'Soy ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: 'bueno' },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        text: entry.value,
      })),
    ]),
    testedDimension: 'meaning:bueno_general_positive_not_price_or_ease',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:retrieve_meaning:correct`, true, 'retrieve_meaning', localizedPhraseField(0, 'explanation')),
      ...contact.distractors.map((entry) => feedback(
        `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `${entry.trapType}:${asciiId(entry.reasonCode)}`,
        expandLocalized(entry.feedback),
      )),
    ]),
  });
}

function listenChooseBuenoMeaning(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.retrieve_meaning;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: WORD_AUDIO,
    slowReferenceAudio: WORD_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, targetText: item.target, meaningByLocale: expandLocalized(item.meaning) },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}`,
        targetText: entry.value,
        meaningByLocale: entry.value === 'caro'
          ? L({ ru: 'дорого', uk: 'дорого', es: 'expensive', 'pt-BR': 'caro', vi: 'đắt', id: 'mahal', tr: 'pahalı', pl: 'drogo' })
          : L({ ru: 'лёгкий', uk: 'легкий', es: 'easy', 'pt-BR': 'fácil', vi: 'dễ', id: 'mudah', tr: 'kolay', pl: 'łatwy' }),
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'retrieve_meaning'),
  });
}

function buenoFormBuilder(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  return Object.freeze({
    family: 'phrase_builder',
    targetPhrase: item.target,
    localizedMeaning: expandLocalized(item.meaning),
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze(build.distractors.map((entry) => entry.value)),
    slotFeedback: vocabularyFeedback(item, 'build_form'),
  });
}

function buenoContextGapForm(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  const phrase = phrases[1]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(1, 'meaning'),
    gappedTargetPhrase: 'Eres ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct_buena`, text: 'buena' },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${asciiId(entry.reasonCode)}`, text: entry.value })),
    ]),
    testedDimension: 'build_form:buena_gender_agreement',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:build_form:correct_buena`, true, 'build_form', localizedPhraseField(1, 'explanation')),
      ...vocabularyFeedback(item, 'build_form').filter((row) => !row.correct),
    ]),
  });
}

// зачем speed_match сочетает bueno/buena/malo/mala (владелец, 2026-08-28):
// review-словарь фиксирует recalls: [1, 4] — оценочные признаки truth_adjective
// (fácil/verdad, сессия 1) и quality_adjective (сессия 4). Grid комбинирует
// новую пару bueno/buena с её антонимом malo/mala (уже введённым как
// дистрактор в этой же сессии) — прямое противопоставление двух признаков.
const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: 'bueno', target: 'bueno', meaning: L({ ru: 'хороший', uk: 'хороший', es: 'good', 'pt-BR': 'bom', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobry' }) },
  { id: 'buena', target: 'buena', meaning: L({ ru: 'хорошая', uk: 'хороша', es: 'good (fem.)', 'pt-BR': 'boa', vi: 'tốt (giống cái)', id: 'baik (feminin)', tr: 'iyi (dişil)', pl: 'dobra' }) },
  { id: 'malo', target: 'malo', meaning: L({ ru: 'плохой', uk: 'поганий', es: 'bad', 'pt-BR': 'ruim', vi: 'xấu', id: 'buruk', tr: 'kötü', pl: 'zły' }) },
  { id: 'mala', target: 'mala', meaning: L({ ru: 'плохая', uk: 'погана', es: 'bad (fem.)', 'pt-BR': 'ruim (fem.)', vi: 'xấu (giống cái)', id: 'buruk (feminin)', tr: 'kötü (dişil)', pl: 'zła' }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_MATCH_VOCABULARY.map((word) => ({
    pairId: `es-e01-s33-pair-${word.id}`,
    target: word.target,
    meaningByLocale: word.meaning,
  }))),
  leftColumn: Object.freeze(['es-e01-s33-pair-mala', 'es-e01-s33-pair-bueno', 'es-e01-s33-pair-malo', 'es-e01-s33-pair-buena']),
  rightColumn: Object.freeze(['es-e01-s33-pair-malo', 'es-e01-s33-pair-buena', 'es-e01-s33-pair-mala', 'es-e01-s33-pair-bueno']),
  pairingKey: 'pair_id',
  timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
  finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
});

function phraseBuilder(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'phrase_builder',
    targetPhrase: phrase.english,
    localizedMeaning: localizedPhraseField(phraseIndex, 'meaning'),
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

function listenBuildPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'listen_build_dictation',
    referenceAudio: phraseAudio(phraseIndex),
    slowReferenceAudio: phraseSlowAudio(phraseIndex),
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

function listenChoosePhrase(phraseIndex: number, distractorIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const distractor = phrases[distractorIndex]!;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: phraseAudio(phraseIndex),
    slowReferenceAudio: phraseSlowAudio(phraseIndex),
    localizedMeaningChoices: Object.freeze([
      { responseId: `${phrase.id}:listen:correct`, targetText: phrase.english, meaningByLocale: localizedPhraseField(phraseIndex, 'meaning') },
      { responseId: `${phrase.id}:listen:distractor_${distractorIndex}`, targetText: distractor.english, meaningByLocale: localizedPhraseField(distractorIndex, 'meaning') },
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:listen:correct`, true, 'listening_exact_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      feedback(
        `${phrase.id}:listen:distractor_${distractorIndex}`,
        false,
        `semantic_neighbor:phrase_mismatch:${asciiId(distractor.id)}`,
        localizedPhraseField(distractorIndex, 'explanation'),
      ),
    ]),
  });
}

// зачем гейт стоит на ПОСЛЕДНЕМ содержательном слове (владелец, 2026-08-28,
// как и сессии 18/26): последнее содержательное слово каждой фразы несёт
// либо признак (bueno/buena/malo/mala), либо también — оба варианта уже
// авторены authored-дистракторами в phrases-файле.
function contextGapLastWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const lastWord = phrase.words[phrase.words.length - 1]!;
  const precedingTokens = phrase.english.split(' ').slice(0, -1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: precedingTokens.length > 0 ? `${precedingTokens} ___` : '___',
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:apply:correct`, text: lastWord.correct },
      ...lastWord.distractors.map((entry) => ({ responseId: `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`, text: entry.value })),
    ]),
    testedDimension: `quality_extended_adjective:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:apply:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...lastWord.distractors.map((entry) => feedback(
        `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `quality_extended_adjective:${asciiId(entry.reasonCode)}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

function repeatCompare(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: phraseAudio(phraseIndex),
    slowReferenceAudio: phraseSlowAudio(phraseIndex),
    targetPhrase: phrase.english,
    recordControlPolicy: 'hold_press_release_with_accessible_toggle',
    modelPlayback: 'reference_and_slow',
    learnerPlayback: 'available_after_capture',
    honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const),
  });
}

// зачем именно этот порядок 17 шагов (владелец, 2026-08-28, зеркало
// es_episode_01_session_18_mode_native_v1.ts по структуре
// words_then_phrases): 3 обязательных word-first контакта (recognize/
// retrieve_meaning/build_form) + по одной дополнительной интеракции другой
// family на каждой стадии (правило "target+family не повторяется"), затем
// speed_match на review-словарь (bueno/buena/malo/mala), и десять
// application-шагов на 15 фраз — phrase_builder/listen_build_dictation
// только там, где ≤8 уникальных дистракторов (индексы 0-8 и 14).
export const ES_EPISODE_01_SESSION_33_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseBueno() },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildBueno() },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextGapBuenoMeaning() },
  { family: 'listen_choose', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseBuenoMeaning() },
  { family: 'phrase_builder', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buenoFormBuilder() },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buenoContextGapForm() },
  { family: 'speed_match', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0] }, modePayload: speedMatchVocabularyPayload },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: phraseBuilder(2) },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: listenBuildPhrase(3) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: contextGapLastWord(4) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: listenChoosePhrase(5, 6) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 7 }, modePayload: contextGapLastWord(7) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: listenChoosePhrase(9, 10) },
  { family: 'context_gap_grammar', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 11 }, modePayload: contextGapLastWord(11) },
  { family: 'listen_choose', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: listenChoosePhrase(12, 13) },
  { family: 'phrase_builder', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 8 }, modePayload: phraseBuilder(8) },
  { family: 'listen_build_dictation', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: listenBuildPhrase(14) },
]);

if (ES_EPISODE_01_SESSION_33_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_33_mode_native_practice_count_invalid');
}
