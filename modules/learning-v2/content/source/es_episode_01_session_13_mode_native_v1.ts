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
} from './session_shard_from_source_v1';
import { ES_EPISODE_01_SESSION_13_PHRASES } from './es_episode_01_session_13_phrases_v1';

// зачем этот файл (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10, Глава 2 "Ты: вопрос"): испанская сессия 13 переписывается
// в mode-native формат. Как и сессии 10/11, НЕ вводит новых слов — все 15
// фраз применения повторяют уже известную грамматику (eres/es/soy + признаки
// из сессий 1/3/4/5/6/9/12). Тема pro-drop раскрывается только в трёх
// intro-страницах (EpisodeSourceWord.correct не может быть пустой строкой —
// "пропуск местоимения" нельзя смоделировать как позицию), карточки-практика
// используют обычную уже известную грамматику.
//
// зачем именно этот набор families и порядок (владелец, 2026-08-27, зеркало
// легаси generic phraseSteps() по составу и индексам — та же логика, что и
// в сессиях 10/11): phraseSteps() уже использует только утверждённые families
// (listen_choose/phrase_builder/context_gap_grammar/speed_match/
// listen_build_dictation), каждый шаг получает реальный mode-native payload.
const phrases = ES_EPISODE_01_SESSION_13_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_13_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-27, тот же класс бага сессий 5/6/8/9/10/11/12):
// runtime-валидатор course_session_client_children_v1.ts принимает responseId
// только по ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без диакритики.
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-12): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_13_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_13_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_13_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
  return authoredAudio(`es-e01-s13-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s13-phrase-${phraseIndex + 1}-slow`, phrase.english);
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
        `grammar:person_mismatch:${asciiId(distractor.words[0]!.correct)}`,
        localizedPhraseField(distractorIndex, 'explanation'),
      ),
    ]),
  });
}

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

// зачем responseId включает entry.value, а не только asciiId(reasonCode)
// (владелец, 2026-08-27, класс бага, найденный в сессии 12): легаси-данные
// нескольких сессий дают ОБОИМ дистракторам первого слова один и тот же
// reasonCode (agreement_person_mismatch:* — класс ошибки, не конкретное
// слово). responseId, построенный только из reasonCode, коллизирует —
// добавление entry.value в ключ делает id уникальным, не трогая данные.
function contextGapPhraseFirstWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const firstWord = phrase.words[0]!;
  const followingTokens = phrase.english.split(' ').slice(1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: `___ ${followingTokens}`,
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:apply:correct`, text: firstWord.correct },
      ...firstWord.distractors.map((entry) => ({ responseId: `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`, text: entry.value })),
    ]),
    testedDimension: `person_agreement:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:apply:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...firstWord.distractors.map((entry) => feedback(
        `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `person_agreement:${asciiId(entry.reasonCode)}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

// зачем speed_match сочетает эти пять фраз (владелец, 2026-08-27): пять
// фраз, разбросанных по всей сессии (индексы 3/6/9/12/14) — широкий срез
// уже изученной грамматики, а не смежный блок.
function speedMatchPhrases(pairIndices: readonly number[]): LearningV2ModeNativePayloadV1 {
  const selected = pairIndices.map((index) => phrases[index]!);
  const ids = pairIndices.map((index) => `es-e01-s13-pair-${index + 1}`);
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

// зачем именно эта раскладка 12 шагов (владелец, 2026-08-27, зеркало
// легаси generic phraseSteps(), как и в сессиях 10/11): те же 12
// families/purposes/индексов (3-14), реальный mode-native payload вместо
// generic-карточки для каждого шага.
export const ES_EPISODE_01_SESSION_13_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', purpose: 'supported_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: listenChoosePhrase(3, 4) },
  { family: 'phrase_builder', purpose: 'supported_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: phraseBuilder(4) },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: contextGapPhraseFirstWord(5) },
  { family: 'listen_choose', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 6 }, modePayload: listenChoosePhrase(6, 7) },
  { family: 'phrase_builder', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 7 }, modePayload: phraseBuilder(7) },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 8 }, modePayload: contextGapPhraseFirstWord(8) },
  { family: 'speed_match', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: speedMatchPhrases([3, 6, 9, 12, 14]) },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 10 }, modePayload: phraseBuilder(10) },
  { family: 'listen_build_dictation', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 11 }, modePayload: listenBuildPhrase(11) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: contextGapPhraseFirstWord(12) },
  { family: 'listen_build_dictation', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 13 }, modePayload: listenBuildPhrase(13) },
  { family: 'phrase_builder', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: phraseBuilder(14) },
]);

if (ES_EPISODE_01_SESSION_13_MODE_NATIVE_PRACTICE_V1.length !== 12) {
  throw new Error('es_session_13_mode_native_practice_count_invalid');
}
