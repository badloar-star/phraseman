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
import { ES_EPISODE_01_SESSION_12_VOCABULARY_V1 } from './es_episode_01_session_12_vocabulary_v1';
import { ES_EPISODE_01_SESSION_12_PHRASES } from './es_episode_01_session_12_phrases_v1';

// зачем этот файл (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10, Глава 2 "Ты: вопрос"): испанская сессия 12 переписывается
// в mode-native формат, повторяя КОД (не данные) es_episode_01_session_09_mode_native_v1.ts —
// тот же класс сессии (words_then_phrases, ровно одно новое слово), полностью
// авторенное в es_episode_01_session_12_vocabulary_v1.ts тремя контактами
// (recognize/retrieve_meaning/build_form; данные сохранены из легаси-черновика
// 2026-08-25 без изменений — уже качественные ловушки, research-подтверждённое
// teaches). Освободившийся бюджет 17 шагов уходит на более глубокую отработку
// "segura" (доп. интеракции на recognize/retrieve_meaning/build_form другой
// family на тот же target — разрешено правилом "target+family не повторяется")
// и на расширенное применение ДВУХ фраз сессии (¿Eres segura?/¿Es segura? —
// карта фиксирует builtOn: [3, 10], recalls: [3, 10]; gender_agreement_full
// переносится с сессии 3, question_marks — с сессии 10, ни одно новое слово
// внутри фраз не вводится).
const vocabulary = ES_EPISODE_01_SESSION_12_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_12_PHRASES;
if (phrases.length !== 2) {
  throw new Error('es_session_12_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-27, тот же класс бага сессий 5/6/8/9/10/11):
// runtime-валидатор course_session_client_children_v1.ts принимает responseId
// только по ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без диакритики.
// Эта сессия не вводит диакритику в новом слове (segura/seguro без accent),
// но context_gap_grammar использует reasonCode из сессии 3 (bonito recall) —
// защита применена проактивно на все reasonCode.
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-11): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_12_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_12_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_12_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
const WORD_AUDIO = authoredAudio('es-e01-s12-word-segura', 'segura');
const WORD_SLOW_AUDIO = authoredAudio('es-e01-s12-word-segura-slow', 'segura');
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s12-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s12-phrase-${phraseIndex + 1}-slow`, phrase.english);
}

const item = vocabulary[0]!;

// зачем эта извлекаемая доп.-ловушка на build_form (владелец, 2026-08-27,
// тот же класс, что сессии 3/4/5/6/9): build_form-контакт словаря содержит
// только seguro/seguraa; дополнительная третья опция для расширенной
// интеракции — recall bonita (уже изученный признак другой категории,
// сессия 3), доказывающий, что segura — не про внешность.
const BUILD_FORM_EXTRA = Object.freeze({
  value: 'bonita',
  reasonCode: 'segura_form_bonita_wrong_quality_extra',
  feedback: L({
    ru: 'Bonita означает «красивая» — про внешность, не про уверенность в себе. Нужно именно segura.',
    uk: 'Bonita означає «красива» — про зовнішність, не про впевненість у собі. Потрібно саме segura.',
    es: 'Bonita means "pretty" — about looks, not self-confidence. Exactly segura is needed.',
    'pt-BR': 'Bonita significa "bonita" — sobre aparência, não autoconfiança. Precisa exatamente de segura.',
    vi: 'Bonita nghĩa là "đẹp" — về ngoại hình, không phải sự tự tin. Cần chính xác segura.',
    id: 'Bonita berarti "cantik" — tentang penampilan, bukan kepercayaan diri. Perlu tepat segura.',
    tr: 'Bonita "güzel" demektir — görünüm hakkında, kendine güven değil. Tam olarak segura gerekir.',
    pl: 'Bonita znaczy „ładna” — o wyglądzie, nie o pewności siebie. Potrzebne dokładnie segura.',
  }),
});

function listenChooseSegura(): LearningV2ModeNativePayloadV1 {
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

function listenBuildSegura(): LearningV2ModeNativePayloadV1 {
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

function contextGapSeguraMeaning(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.retrieve_meaning;
  const phrase = phrases[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: '¿Eres ___?',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: 'segura' },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}`,
        text: entry.value,
      })),
    ]),
    testedDimension: 'meaning:segura_confidence_not_looks',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:retrieve_meaning:correct`, true, 'retrieve_meaning', localizedPhraseField(0, 'explanation')),
      ...vocabularyFeedback(item, 'retrieve_meaning').filter((row) => !row.correct),
    ]),
  });
}

function listenChooseSeguraMeaning(): LearningV2ModeNativePayloadV1 {
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
        meaningByLocale: entry.value === 'rápida'
          ? L({ ru: 'быстрая', uk: 'швидка', es: 'fast', 'pt-BR': 'rápida', vi: 'nhanh', id: 'cepat', tr: 'hızlı', pl: 'szybka' })
          : L({ ru: 'красивая', uk: 'красива', es: 'pretty', 'pt-BR': 'bonita', vi: 'đẹp', id: 'cantik', tr: 'güzel', pl: 'ładna' }),
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'retrieve_meaning'),
  });
}

function seguraFormBuilder(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  return Object.freeze({
    family: 'phrase_builder',
    targetPhrase: item.target,
    localizedMeaning: expandLocalized(item.meaning),
    orderedTokens: Object.freeze([item.target]),
    authoredDistractorTokens: Object.freeze([...build.distractors.map((entry) => entry.value), BUILD_FORM_EXTRA.value]),
    slotFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'build_form'),
      feedback(
        `${item.id}:build_form:${asciiId(BUILD_FORM_EXTRA.reasonCode)}`,
        false,
        `semantic_neighbor:${asciiId(BUILD_FORM_EXTRA.reasonCode)}`,
        BUILD_FORM_EXTRA.feedback,
      ),
    ]),
  });
}

function seguraContextGapForm(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  const phrase = phrases[1]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(1, 'meaning'),
    gappedTargetPhrase: '¿Es ___?',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct`, text: 'segura' },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${asciiId(entry.reasonCode)}`, text: entry.value })),
    ]),
    testedDimension: 'build_form:segura_gender_agreement',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:build_form:correct`, true, 'build_form', localizedPhraseField(1, 'explanation')),
      ...vocabularyFeedback(item, 'build_form').filter((row) => !row.correct),
    ]),
  });
}

// зачем speed_match сочетает review-словарь сессий 3+12 (владелец, 2026-08-27):
// карта фиксирует builtOn: [3, 10] — только сессия 3 несёт новый gender-
// agreement словарь (bonito), сессия 10 — синтаксис без слов. Grid
// комбинирует segura (эта сессия) с bonito (сессия 3) — оба -o/-a признака.
const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: 'segura', target: 'segura', meaning: L({ ru: 'уверенная', uk: 'впевнена', es: 'confident', 'pt-BR': 'confiante', vi: 'tự tin', id: 'percaya diri', tr: 'kendine güvenen', pl: 'pewna siebie' }) },
  { id: 'seguro', target: 'seguro', meaning: L({ ru: 'уверенный', uk: 'впевнений', es: 'confident (masc.)', 'pt-BR': 'confiante (masc.)', vi: 'tự tin (nam)', id: 'percaya diri (pria)', tr: 'kendine güvenen (eril)', pl: 'pewny siebie' }) },
  { id: 'bonito', target: 'bonito', meaning: L({ ru: 'красивый', uk: 'красивий', es: 'pretty', 'pt-BR': 'bonito', vi: 'đẹp trai', id: 'tampan', tr: 'yakışıklı', pl: 'przystojny' }) },
  { id: 'bonita', target: 'bonita', meaning: L({ ru: 'красивая', uk: 'красива', es: 'pretty (fem.)', 'pt-BR': 'bonita', vi: 'xinh đẹp', id: 'cantik', tr: 'güzel', pl: 'ładna' }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_MATCH_VOCABULARY.map((word) => ({
    pairId: `es-e01-s12-pair-${word.id}`,
    target: word.target,
    meaningByLocale: word.meaning,
  }))),
  leftColumn: Object.freeze(['es-e01-s12-pair-bonita', 'es-e01-s12-pair-segura', 'es-e01-s12-pair-seguro', 'es-e01-s12-pair-bonito']),
  rightColumn: Object.freeze(['es-e01-s12-pair-bonito', 'es-e01-s12-pair-seguro', 'es-e01-s12-pair-bonita', 'es-e01-s12-pair-segura']),
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
        `grammar:person_mismatch:${asciiId(distractor.words[0]!.correct)}`,
        localizedPhraseField(distractorIndex, 'explanation'),
      ),
    ]),
  });
}

// зачем responseId включает entry.value, а не только asciiId(reasonCode)
// (владелец, 2026-08-27, найдено при верификации сборки мока сессии 12):
// легаси-данные этой сессии (es_episode_01_session_12_phrases_v1.ts) дают
// ОБОИМ дистракторам первого слова один и тот же reasonCode
// (agreement_person_mismatch:Eres для Es И Soy) — правило "один reasonCode
// на класс ошибки", а не "один на конкретное слово". responseId,
// построенный только из reasonCode, коллизировал бы на два разных gapOptions
// с одинаковым id — course_session_client_children_v1.ts отклоняет
// повторяющийся responseId внутри одной interaction
// (learning_v2_course_session_client_child_invalid). Добавление entry.value
// в ключ делает id уникальным, не трогая сами легаси-данные.
function contextGapPhraseFirstWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const firstWord = phrase.words[0]!;
  const followingTokens = phrase.english.split(' ').slice(1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: `¿___ ${followingTokens}`,
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

// зачем именно этот порядок 17 шагов (владелец, 2026-08-27): 3 обязательных
// word-first контакта (recognize/retrieve_meaning/build_form) + по одной
// дополнительной интеракции другой family на recognize/retrieve_meaning/
// build_form (правило "target+family не повторяется"), затем speed_match на
// review-словарь (segura/seguro + recall bonito/bonita), и восемь
// application-шагов на две фразы (¿Eres segura?/¿Es segura?) плюс два
// independent scripted_repeat_compare.
export const ES_EPISODE_01_SESSION_12_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseSegura() },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildSegura() },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextGapSeguraMeaning() },
  { family: 'listen_choose', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseSeguraMeaning() },
  { family: 'phrase_builder', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: seguraFormBuilder() },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: seguraContextGapForm() },
  { family: 'speed_match', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0] }, modePayload: speedMatchVocabularyPayload },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: phraseBuilder(0) },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenBuildPhrase(0) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: contextGapPhraseFirstWord(1) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: listenChoosePhrase(1, 0) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: contextGapPhraseFirstWord(0) },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: phraseBuilder(1) },
  { family: 'listen_build_dictation', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: listenBuildPhrase(1) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenChoosePhrase(0, 1) },
  { family: 'scripted_repeat_compare', purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: repeatCompare(0) },
  { family: 'scripted_repeat_compare', purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: repeatCompare(1) },
]);

if (ES_EPISODE_01_SESSION_12_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_12_mode_native_practice_count_invalid');
}
