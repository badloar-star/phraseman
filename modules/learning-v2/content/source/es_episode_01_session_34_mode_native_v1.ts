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
import { ES_EPISODE_01_SESSION_34_VOCABULARY_V1 } from './es_episode_01_session_34_vocabulary_v1';
import { ES_EPISODE_01_SESSION_34_PHRASES } from './es_episode_01_session_34_phrases_v1';

// зачем этот файл (владелец, 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10, Глава 5 "Больше признаков"): испанская сессия 34
// написана В ЭТОТ ЖЕ ХОД (легаси-черновика на диске не было вовсе для
// сессий 34-40, проверено grep — единственный совпавший набор
// episode_01_session_34..40_*.ts принадлежит английскому треку). Код этого
// файла зеркалит структуру es_episode_01_session_33_mode_native_v1.ts (тот
// же класс сессии, words_then_phrases, ровно одно новое слово), данные —
// полностью самостоятельные под diferente/igual этой сессии.
//
// зачем phrase_builder/listen_build_dictation используются только на
// индексах 0-8, 13 и 14 (та же экономия, что в сессии 33): подсчитано
// скриптом по количеству уникальных value среди distractors каждой фразы —
// индексы 0-4 дают 4 уникальных, 5-8 и 14 дают 6, индекс 13 даёт ровно 8,
// а индексы 9-12 дают 10. Это выше лимита responseFeedbackById в
// course_session_client_children_v1.ts; индексы 9-12 получают только
// listen_choose/context_gap_grammar.
const vocabulary = ES_EPISODE_01_SESSION_34_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_34_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_34_mode_native_phrase_count_invalid');
}
if (vocabulary.length !== 1) {
  throw new Error('es_session_34_mode_native_vocabulary_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (тот же класс бага сессий 5/6/8-33): runtime-валидатор
// ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без диакритики. Эта
// сессия не вводит диакритику в новом слове (diferente без accent), но
// фразы содержат también (reasonCode 'accent_missing:también') — защита
// применена проактивно на все reasonCode/value.
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-33): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails хранит объяснение
// под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_34_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_34_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_34_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
const WORD_AUDIO = authoredAudio('es-e01-s34-word-diferente', 'diferente');
const WORD_SLOW_AUDIO = authoredAudio('es-e01-s34-word-diferente-slow', 'diferente');
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s34-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s34-phrase-${phraseIndex + 1}-slow`, phrase.english);
}

const item = vocabulary[0]!;

// зачем build_form-контакт не требует доп.-ловушки (тот же класс, что
// сессии 3/4/5/6/9/12/18/33): контакт словаря уже содержит diferenta
// (грамматика) и igual (антоним) — оба честных дистрактора, budget
// контакта уже 2 (manual policy).
function listenChooseDiferente(): LearningV2ModeNativePayloadV1 {
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

function listenBuildDiferente(): LearningV2ModeNativePayloadV1 {
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

function contextGapDiferenteMeaning(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.retrieve_meaning;
  const phrase = phrases[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: 'Soy ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: 'diferente' },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        text: entry.value,
      })),
    ]),
    testedDimension: 'meaning:diferente_comparison_not_quality_or_indifference',
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

function listenChooseDiferenteMeaning(): LearningV2ModeNativePayloadV1 {
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
        meaningByLocale: entry.value === 'bueno'
          ? L({ ru: 'хороший', uk: 'хороший', es: 'good', 'pt-BR': 'bom', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobry' })
          : L({ ru: 'всё равно', uk: 'все одно', es: 'all the same', 'pt-BR': 'tanto faz', vi: 'cũng như nhau', id: 'sama saja', tr: 'aynı şey', pl: 'wszystko jedno' }),
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'retrieve_meaning'),
  });
}

function diferenteFormBuilder(): LearningV2ModeNativePayloadV1 {
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

function diferenteContextGapForm(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  const phrase = phrases[3]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(3, 'meaning'),
    gappedTargetPhrase: 'Somos ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct_plural`, text: 'diferentes' },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${asciiId(entry.reasonCode)}`, text: entry.value })),
    ]),
    testedDimension: 'build_form:diferente_invariable_plural',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:build_form:correct_plural`, true, 'build_form', localizedPhraseField(3, 'explanation')),
      ...vocabularyFeedback(item, 'build_form').filter((row) => !row.correct),
    ]),
  });
}

// зачем speed_match сочетает diferente/diferentes/igual (владелец,
// 2026-08-28): review-словарь фиксирует recalls: [4, 33] — сессия
// объединяет неизменяемый класс (diferente/igual, обе формы) с уже
// знакомым словом igual (сессия 14), а не с bueno/malo (другой класс
// согласования, -o/-a) — grid держит один согласовательный класс, чтобы не
// смешивать инвариантные и изменяемые признаки в одном упражнении.
const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: 'diferente', target: 'diferente', meaning: L({ ru: 'другой', uk: 'інший', es: 'different', 'pt-BR': 'diferente', vi: 'khác', id: 'berbeda', tr: 'farklı', pl: 'inny' }) },
  { id: 'diferentes', target: 'diferentes', meaning: L({ ru: 'разные', uk: 'різні', es: 'different (pl.)', 'pt-BR': 'diferentes', vi: 'khác nhau', id: 'berbeda (jamak)', tr: 'farklı (çoğul)', pl: 'różni' }) },
  { id: 'igual', target: 'igual', meaning: L({ ru: 'всё равно', uk: 'все одно', es: 'all the same', 'pt-BR': 'tanto faz', vi: 'cũng như nhau', id: 'sama saja', tr: 'aynı şey', pl: 'wszystko jedno' }) },
  { id: 'iguales', target: 'iguales', meaning: L({ ru: 'одинаковые, всё равно', uk: 'однакові, все одно', es: 'all the same (pl.)', 'pt-BR': 'tanto faz (pl.)', vi: 'cũng như nhau (số nhiều)', id: 'sama saja (jamak)', tr: 'aynı şey (çoğul)', pl: 'wszystko jedno (l.mn.)' }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_MATCH_VOCABULARY.map((word) => ({
    pairId: `es-e01-s34-pair-${word.id}`,
    target: word.target,
    meaningByLocale: word.meaning,
  }))),
  leftColumn: Object.freeze(['es-e01-s34-pair-iguales', 'es-e01-s34-pair-diferente', 'es-e01-s34-pair-igual', 'es-e01-s34-pair-diferentes']),
  rightColumn: Object.freeze(['es-e01-s34-pair-igual', 'es-e01-s34-pair-diferentes', 'es-e01-s34-pair-iguales', 'es-e01-s34-pair-diferente']),
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

// зачем гейт стоит на ПОСЛЕДНЕМ содержательном слове (как сессии 18/26/33):
// последнее содержательное слово каждой фразы несёт либо признак
// (diferente/diferentes/igual/bueno), либо también — оба варианта уже
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
    testedDimension: `comparison_basic_adjective:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:apply:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...lastWord.distractors.map((entry) => feedback(
        `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `comparison_basic_adjective:${asciiId(entry.reasonCode)}`,
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
// es_episode_01_session_33_mode_native_v1.ts по структуре words_then_phrases):
// 3 обязательных word-first контакта (recognize/retrieve_meaning/build_form)
// + по одной дополнительной интеракции другой family на каждой стадии
// (правило "target+family не повторяется"), затем speed_match на
// review-словарь (diferente/diferentes/igual/iguales), и десять
// application-шагов на 15 фраз — phrase_builder/listen_build_dictation
// только там, где ≤8 уникальных дистракторов (индексы 0-8, 13, 14).
export const ES_EPISODE_01_SESSION_34_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseDiferente() },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildDiferente() },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextGapDiferenteMeaning() },
  { family: 'listen_choose', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseDiferenteMeaning() },
  { family: 'phrase_builder', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: diferenteFormBuilder() },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: diferenteContextGapForm() },
  { family: 'speed_match', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0] }, modePayload: speedMatchVocabularyPayload },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: phraseBuilder(2) },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: listenBuildPhrase(3) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: contextGapLastWord(4) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: listenChoosePhrase(5, 6) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 7 }, modePayload: contextGapLastWord(7) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: listenChoosePhrase(9, 10) },
  { family: 'context_gap_grammar', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 11 }, modePayload: contextGapLastWord(11) },
  { family: 'listen_choose', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: listenChoosePhrase(12, 9) },
  { family: 'phrase_builder', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 8 }, modePayload: phraseBuilder(8) },
  { family: 'listen_build_dictation', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: listenBuildPhrase(14) },
]);

if (ES_EPISODE_01_SESSION_34_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_34_mode_native_practice_count_invalid');
}
