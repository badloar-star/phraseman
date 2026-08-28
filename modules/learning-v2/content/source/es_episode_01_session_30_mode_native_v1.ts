import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from '../generator_course_contract';
import type {
  LearningV2ModeAudioReferenceV1,
  LearningV2ModeChoiceFeedbackV1,
  LearningV2ModeNativePayloadV1,
} from '../../contracts/mode_native_payload_v1';
import type {
  SessionModeNativePracticeSourceV1,
} from './session_shard_from_source_v1';
import { ES_EPISODE_01_SESSION_30_PHRASES } from './es_episode_01_session_30_phrases_v1';

// зачем этот файл (владелец, 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md,
// закрывает основной корпус Главы 4 "Мы и они" перед voice-сессией 31 и
// checkpoint-сессией 32): испанская recall-сессия 30 переписывается в
// mode-native формат, зеркаля КОД (не данные) сессий 25/27/29 — kind:
// 'recall', новых слов нет. Все 15 фраз сохранены из легаси-черновика без
// изменений содержания — пять утвердительных (по одной на каждое лицо
// связки ser: soy/eres/es/somos/son), пять отрицательных (recall no
// soy/eres/es/somos/son) и пять диалоговых/вопросительных фраз, смешивающих
// разные лица на одной карточке. Проверка охвата по CRITICAL rule 3
// (владелец, задание): rápido/rápida/rápidos/rápidas — единственное
// прилагательное, дословно встречающееся во всех пяти опорных сессиях
// (1, 9, 17, 25, 27) — подтверждено grep по фактическим фразовым файлам
// этих сессий. Пробела в покрытии recalls: [1, 9, 17, 25, 27] НЕ найдено.
//
// зачем НЕ все фразы идут через phrase_builder/listen_build_dictation:
// пять диалоговых/вопросительных фраз (индексы 10-14) дают больше 8
// уникальных дистракторов, превышая предел responseFeedbackById в
// course_session_client_children_v1.ts — эти пять идут только через
// listen_choose/context_gap_grammar/speed_match.
function asciiId(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/gu, '');
}

const phrases = ES_EPISODE_01_SESSION_30_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_30_mode_native_phrase_count_invalid');
}

function feedback(
  responseId: string,
  correct: boolean,
  testedDimension: string,
  feedbackByLocale: LearningV2Localized<string>,
): LearningV2ModeChoiceFeedbackV1 {
  return Object.freeze({ responseId, correct, testedDimension, feedbackByLocale });
}

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-29): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails хранит объяснение
// под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_30_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_30_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_30_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s30-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s30-phrase-${phraseIndex + 1}-slow`, phrase.english);
}

function fullPhraseBuilder(phraseIndex: number): LearningV2ModeNativePayloadV1 {
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
        `semantic_neighbor:${asciiId(phrase.id)}_vs_${asciiId(distractor.id)}`,
        localizedPhraseField(distractorIndex, 'explanation'),
      ),
    ]),
  });
}

// зачем гейт стоит на ПЕРВОМ слове (связке) каждой фразы (владелец,
// 2026-08-28): recall-сессия проверяет именно выбор нужной формы ser среди
// всех пяти — связка несёт всю грамматическую тему сессии.
function contextGapFirstWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const firstWord = phrase.words[0]!;
  const remainingTokens = phrase.english.split(' ').slice(1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: `___ ${remainingTokens}`,
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:gap:correct`, text: firstWord.correct },
      ...firstWord.distractors.map((entry) => ({ responseId: `${phrase.id}:gap:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`, text: entry.value })),
    ]),
    testedDimension: `recall_ser_paradigm:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:gap:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...firstWord.distractors.map((entry) => feedback(
        `${phrase.id}:gap:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `recall_ser_paradigm:${asciiId(entry.reasonCode)}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

// зачем speed_match сочетает все пять утвердительных форм этой сессии
// (владелец, 2026-08-28): единственная сессия, где цель — сопоставить
// целиком всю парадигму связки ser сразу, без разбивки по главам, как и
// предполагает kind: 'recall'.
function speedMatchPhrases(pairIndices: readonly number[]): LearningV2ModeNativePayloadV1 {
  const selected = pairIndices.map((index) => phrases[index]!);
  const ids = pairIndices.map((index) => `es-e01-s30-pair-${index + 1}`);
  return Object.freeze({
    family: 'speed_match',
    pairGrid: Object.freeze(selected.map((phrase, position) => ({
      pairId: ids[position]!,
      target: phrase.english,
      meaningByLocale: localizedPhraseField(pairIndices[position]!, 'meaning'),
    }))),
    leftColumn: Object.freeze([ids[0]!, ids[2]!, ids[4]!, ids[1]!, ids[3]!]),
    rightColumn: Object.freeze([ids[3]!, ids[1]!, ids[4]!, ids[2]!, ids[0]!]),
    pairingKey: 'pair_id',
    timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
    finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
  });
}

// зачем именно эта раскладка 12 шагов на индексах 3-14 (владелец,
// 2026-08-28, зеркало es_episode_01_session_17/19/20/25/27/29_mode_native_v1.ts
// по общей форме kind: 'recall'): индексы 10-14 (диалоговые/вопросительные
// фразы, >8 уникальных дистракторов) идут только через context_gap_grammar/
// listen_choose/speed_match; индексы 3-9 (утвердительные и отрицательные
// формы, ≤8 уникальных дистракторов) используют phrase_builder/
// listen_build_dictation. Каждый индекс 3-14 используется как
// target.sourceIndex ровно один раз.
export const ES_EPISODE_01_SESSION_30_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'phrase_builder', purpose: 'supported_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: fullPhraseBuilder(3) },
  { family: 'context_gap_grammar', purpose: 'supported_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: contextGapFirstWord(4) },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: listenBuildPhrase(5) },
  { family: 'phrase_builder', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 6 }, modePayload: fullPhraseBuilder(6) },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 7 }, modePayload: contextGapFirstWord(7) },
  { family: 'listen_build_dictation', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 8 }, modePayload: listenBuildPhrase(8) },
  { family: 'phrase_builder', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: fullPhraseBuilder(9) },
  { family: 'speed_match', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 10 }, modePayload: speedMatchPhrases([3, 4, 6, 7, 9]) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 11 }, modePayload: listenChoosePhrase(11, 10) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: contextGapFirstWord(12) },
  { family: 'listen_choose', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 13 }, modePayload: listenChoosePhrase(13, 12) },
  { family: 'context_gap_grammar', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: contextGapFirstWord(14) },
]);

if (ES_EPISODE_01_SESSION_30_MODE_NATIVE_PRACTICE_V1.length !== 12) {
  throw new Error('es_session_30_mode_native_practice_count_invalid');
}
