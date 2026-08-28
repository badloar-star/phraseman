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
import { ES_EPISODE_01_SESSION_23_VOICE_PHRASES } from './es_episode_01_session_23_phrases_v1';

// зачем этот файл (владелец, 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10 + Rules §4.1): испанская voice-сессия 23 переписывается
// в mode-native формат, зеркаля КОД (не данные) сессий 7/15 — та же voice-
// механика. Voice-сессия НЕ вводит новых слов и не имеет newVocabulary —
// применяет 15 уже утверждённых оценочных фраз из сессий 17/18/20
// (es_episode_01_session_23_phrases_v1.ts переиспользует их целиком по id
// через findPhrase(), полностью локализованные).
//
// зачем families здесь ТОЛЬКО listen_choose/listen_build_dictation/
// scripted_repeat_compare (владелец, 2026-08-28, КРИТИЧНО, ИМЕННО ТА ошибка,
// которую нашли и исправили сессии 7 и 15 в легаси voiceSteps() —
// 'sound_contrast' была снята с активного authoring решением владельца
// 2026-08-25, MODE_NATIVE_AUTHORING_CONTRACT.ru.md §2, "не может назначаться
// новой learner interaction"): этот файл НИКОГДА не использует
// sound_contrast — только шесть утверждённых families, здесь конкретно три
// голосовые. Это явный override, гарантирующий, что broken generic
// voiceSteps() в lesson1_session_choreography_v1.ts никогда не достигается
// для этой сессии.
const phrases = ES_EPISODE_01_SESSION_23_VOICE_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_23_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-28, тот же класс бага сессий 5/6/8-22):
// runtime-валидатор ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без
// диакритики.
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-22): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). Эти фразы унаследованы из сессий
// 17/18/20 через findPhrase() целиком, включая уже готовый localizedDetails.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_23_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_23_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_23_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
// зачем audio id namespace 's23' даже для переиспользованных фраз сессий
// 17/18/20 (владелец, 2026-08-28, тот же приём, что и сессии 7/15): аудио
// этой сессии — самостоятельные logical targets, а не алиасы на чужие clip id.
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s23-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s23-phrase-${phraseIndex + 1}-slow`, phrase.english);
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

function repeatPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
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

const INSTRUCTION = Object.freeze({
  listenPhrase: {
    ru: 'Послушайте и выберите целую фразу, которая прозвучала.', uk: 'Послухайте й виберіть цілу фразу, яка прозвучала.',
    es: 'Escucha y elige la frase completa que suena.', 'pt-BR': 'Ouça e escolha a frase inteira que foi dita.',
    vi: 'Nghe và chọn đúng cả câu vừa được phát.', id: 'Dengarkan dan pilih seluruh kalimat yang terdengar.',
    tr: 'Dinleyin ve duyduğunuz tam cümleyi seçin.', pl: 'Posłuchaj i wybierz całe zdanie, które padło.',
  },
  listenBuildPhrase: {
    ru: 'Послушайте целую фразу и соберите её в услышанном порядке.', uk: 'Послухайте цілу фразу й складіть її в почутому порядку.',
    es: 'Escucha la frase completa y constrúyela en el orden que oyes.', 'pt-BR': 'Ouça a frase inteira e monte-a na ordem ouvida.',
    vi: 'Nghe cả câu và ghép lại theo đúng thứ tự đã nghe.', id: 'Dengarkan seluruh kalimat dan susun sesuai urutan yang terdengar.',
    tr: 'Cümlenin tamamını dinleyin ve duyduğunuz sırayla kurun.', pl: 'Posłuchaj całego zdania i ułóż je w usłyszanej kolejności.',
  },
  repeatPhrase: {
    ru: 'Послушайте полную фразу, произнесите её и сравните с образцом.', uk: 'Послухайте повну фразу, вимовте її та порівняйте зі зразком.',
    es: 'Escucha la frase completa, repítela y compárala con el modelo.', 'pt-BR': 'Ouça a frase inteira, repita e compare com o modelo.',
    vi: 'Nghe cả câu, đọc lại rồi so sánh với mẫu.', id: 'Dengarkan kalimat lengkap, ucapkan, lalu bandingkan dengan contoh.',
    tr: 'Tam cümleyi dinleyin, söyleyin ve örnekle karşılaştırın.', pl: 'Posłuchaj pełnego zdania, powiedz je i porównaj ze wzorem.',
  },
} satisfies Readonly<Record<string, LocalizedSource>>);

// зачем именно эти 12 шагов на индексах 3-14 (владелец, 2026-08-28, зеркало
// es_episode_01_session_07_mode_native_v1.ts / session_15 по составу и весу
// семей): три первые фразы (0-2) уже отработаны в интро-carousel
// (introSteps() в lesson1_session_choreography_v1.ts использует
// sourcePhraseIndex 0/1/2), оставшиеся 12 (3-14) получают практику здесь.
// Порядок: две поддерживающие listen_choose/listen_build_dictation на
// новых для этой сессии recall-фразах, затем чередование repeat/listen с
// нарастающим near_transfer, и пять финальных independent_check repeat —
// самостоятельное произнесение оценки вслух без опоры, ядро voice-сессии.
export const ES_EPISODE_01_SESSION_23_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', instruction: INSTRUCTION.listenPhrase, purpose: 'retrieval_practice', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: listenChoosePhrase(3, 4) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'retrieval_practice', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: listenBuildPhrase(4) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: repeatPhrase(5) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 6 }, modePayload: repeatPhrase(6) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenPhrase, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 7 }, modePayload: listenChoosePhrase(7, 8) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 8 }, modePayload: repeatPhrase(8) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'near_transfer', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: listenBuildPhrase(9) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 10 }, modePayload: repeatPhrase(10) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 11 }, modePayload: repeatPhrase(11) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: repeatPhrase(12) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 13 }, modePayload: repeatPhrase(13) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: repeatPhrase(14) },
]);

if (ES_EPISODE_01_SESSION_23_MODE_NATIVE_PRACTICE_V1.length !== 12) {
  throw new Error('es_session_23_mode_native_practice_count_invalid');
}
