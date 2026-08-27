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
import { ES_EPISODE_01_SESSION_09_VOCABULARY_V1 } from './es_episode_01_session_09_vocabulary_v1';
import { ES_EPISODE_01_SESSION_09_PHRASES } from './es_episode_01_session_09_phrases_v1';

// зачем этот файл (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10): испанская сессия 9 переписывается в mode-native формат,
// повторяя КОД (не данные) es_episode_01_session_04_mode_native_v1.ts — тот
// же класс сессии, ровно ОДНО новое слово (eres), полностью авторенное в
// es_episode_01_session_09_vocabulary_v1.ts тремя контактами (recognize/
// retrieve_meaning/build_form; данные сохранены из легаси-черновика 2026-08-24
// без изменений — уже качественные фонетические/грамматические ловушки).
// Освободившийся бюджет 17 шагов уходит на более глубокую отработку "eres"
// (доп. интеракции на recognize и retrieve_meaning другой family на тот же
// target — разрешено правилом "target+family не повторяется") и на
// расширенное применение ЧЕТЫРЁХ фраз сессии (Eres bonito/Eres bonita/
// Eres rápido/Eres rápida — карта фиксирует builtOn: [1], recalls: [3];
// gender_agreement_full переносится с bonito/bonita сессии 3 и rápido/rápida
// сессии 5 на новую связку eres, ни одно новое слово внутри фраз не вводится).
//
// зачем данные фраз и локализаций взяты из легаси без изменений (владелец,
// 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md §7): es_episode_01_session_09_phrases_v1.ts
// и es_episode_01_session_09_localized_details_v1.ts уже содержат корректные
// ручные переводы/разборы на 8 объяснительных локалях для всех 4 фраз —
// единственная причина отклонения легаси-версии сессии была generic-choreography
// без mode-native payload, а не качество данных.
const vocabulary = ES_EPISODE_01_SESSION_09_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_09_PHRASES;
if (phrases.length !== 4) {
  throw new Error('es_session_09_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-27, тот же класс бага сессий 5/6/8):
// runtime-валидатор course_session_client_children_v1.ts принимает responseId
// только по ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без диакритики.
// context_gap_grammar передаёт сырой responseId напрямую в runtime без
// позиционного переприсвоения; эта сессия использует rápido/rápida (с á) в
// context_gap_grammar responseId. Заменяет диакритику на ASCII только в ключе
// responseId; отображаемый text остаётся с диакритикой без изменений.
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-8): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом,
// чтобы не перепутать с целевым испанским текстом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_09_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_09_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_09_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
const WORD_AUDIO = authoredAudio('es-e01-s09-word-eres', 'eres');
const WORD_SLOW_AUDIO = authoredAudio('es-e01-s09-word-eres-slow', 'eres');
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s09-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s09-phrase-${phraseIndex + 1}-slow`, phrase.english);
}

const item = vocabulary[0]!;

// зачем именно эта извлекаемая доп.-ловушка (владелец, 2026-08-27, тот же
// класс, что и сессии 3/4/5/6): recognize-контакт содержит две фонетические
// ловушки (es, soy), retrieve_meaning содержит их же как грамматические
// ловушки. Для дополнительной interaction на build_form (третья опция помимо
// двух authored-дистракторов) используется третья форма-сосед, уже
// упомянутая как distractor в самих фразах: 'es'/'soy' покрыты словарём,
// здесь берётся третья независимая ловушка на письмо — Erés (лишнее
// ударение, частая ошибка новичка при письме, т.к. eres не имеет ударения).
const BUILD_FORM_EXTRA = Object.freeze({
  value: 'Erés',
  reasonCode: 'eres_form_wrong_accent_extra',
  feedback: L({
    ru: 'Eres пишется без ударения на письме — обычное слово из двух слогов с ударением на первом, но без графического акцента. Erés с акцентом — не существующее написание.',
    uk: 'Eres пишеться без наголосу на письмі — звичайне слово з двох складів із наголосом на першому, але без графічного акценту. Erés з акцентом — неіснуюче написання.',
    es: 'Eres is written with no accent mark — a regular two-syllable word stressed on the first syllable, but with no graphic accent. Erés with an accent mark is not a real spelling.',
    'pt-BR': 'Eres é escrito sem acento gráfico — uma palavra regular de duas sílabas com acento na primeira, mas sem sinal gráfico. Erés com acento não é uma grafia real.',
    vi: 'Eres được viết không có dấu — một từ hai âm tiết bình thường có trọng âm ở âm tiết đầu, nhưng không có dấu đồ họa. Erés có dấu không phải là cách viết có thật.',
    id: 'Eres ditulis tanpa tanda aksen — kata dua suku kata biasa dengan tekanan pada suku kata pertama, tetapi tanpa aksen grafis. Erés dengan aksen bukan ejaan yang nyata.',
    tr: 'Eres vurgu işareti olmadan yazılır — ilk hecede vurgulu, sıradan iki heceli bir kelime, ama grafik aksan yok. Aksanlı Erés gerçek bir yazım değildir.',
    pl: 'Eres pisze się bez akcentu graficznego — zwykłe dwusylabowe słowo z akcentem na pierwszej sylabie, ale bez znaku graficznego. Erés z akcentem to nieistniejący zapis.',
  }),
});

function listenChooseEres(): LearningV2ModeNativePayloadV1 {
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

function listenBuildEres(): LearningV2ModeNativePayloadV1 {
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

function contextGapEresMeaning(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.retrieve_meaning;
  const phrase = phrases[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: '___ bonito',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: 'Eres' },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}`,
        text: entry.value === 'es' ? 'Es' : 'Soy',
      })),
    ]),
    testedDimension: 'grammar:es_second_person_before_bonito',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:retrieve_meaning:correct`, true, 'retrieve_meaning', localizedPhraseField(0, 'explanation')),
      ...vocabularyFeedback(item, 'retrieve_meaning').filter((row) => !row.correct),
    ]),
  });
}

function listenChooseEresMeaning(): LearningV2ModeNativePayloadV1 {
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
        meaningByLocale: entry.value === 'es'
          ? L({ ru: 'является (он/она/оно)', uk: 'є (він/вона/воно)', es: 'is (he/she/it)', 'pt-BR': 'é (ele/ela)', vi: 'là (anh ấy/cô ấy/nó)', id: 'adalah (dia)', tr: '-dir (o)', pl: 'jest (on/ona/ono)' })
          : L({ ru: 'я есть', uk: 'я є', es: 'I am', 'pt-BR': 'eu sou', vi: 'tôi là', id: 'saya adalah', tr: 'benim', pl: 'jestem' }),
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'retrieve_meaning'),
  });
}

function eresFormBuilder(): LearningV2ModeNativePayloadV1 {
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
        `orthographic:${asciiId(BUILD_FORM_EXTRA.reasonCode)}`,
        BUILD_FORM_EXTRA.feedback,
      ),
    ]),
  });
}

function eresContextGapForm(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  const phrase = phrases[2]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(2, 'meaning'),
    gappedTargetPhrase: '___ rápido',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct`, text: 'Eres' },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${asciiId(entry.reasonCode)}`, text: entry.value === 'es' ? 'Es' : 'Soy' })),
    ]),
    testedDimension: 'grammar:es_second_person_before_rapido',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:build_form:correct`, true, 'build_form', localizedPhraseField(2, 'explanation')),
      ...vocabularyFeedback(item, 'build_form').filter((row) => !row.correct),
    ]),
  });
}

const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: 'eres', target: 'eres', meaning: L({ ru: 'ты есть', uk: 'ти є', es: 'you are', 'pt-BR': 'você é', vi: 'bạn là', id: 'kamu adalah', tr: 'sensin', pl: 'jesteś' }) },
  { id: 'es', target: 'es', meaning: L({ ru: 'является', uk: 'є', es: 'is', 'pt-BR': 'é', vi: 'là', id: 'adalah', tr: '-dir', pl: 'jest' }) },
  { id: 'soy', target: 'soy', meaning: L({ ru: 'я есть', uk: 'я є', es: 'I am', 'pt-BR': 'eu sou', vi: 'tôi là', id: 'saya adalah', tr: 'benim', pl: 'jestem' }) },
  { id: 'bonito', target: 'bonito', meaning: L({ ru: 'красивый', uk: 'красивий', es: 'pretty', 'pt-BR': 'bonito', vi: 'đẹp trai', id: 'tampan', tr: 'yakışıklı', pl: 'przystojny' }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_MATCH_VOCABULARY.map((word) => ({
    pairId: `es-e01-s09-pair-${word.id}`,
    target: word.target,
    meaningByLocale: word.meaning,
  }))),
  leftColumn: Object.freeze(['es-e01-s09-pair-bonito', 'es-e01-s09-pair-eres', 'es-e01-s09-pair-soy', 'es-e01-s09-pair-es']),
  rightColumn: Object.freeze(['es-e01-s09-pair-es', 'es-e01-s09-pair-soy', 'es-e01-s09-pair-bonito', 'es-e01-s09-pair-eres']),
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
        `semantic_neighbor:last_word:${asciiId(distractor.english.split(' ').at(-1) ?? '')}`,
        localizedPhraseField(distractorIndex, 'explanation'),
      ),
    ]),
  });
}

function contextGapPhraseLastWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const lastWord = phrase.words[phrase.words.length - 1]!;
  const precedingTokens = phrase.english.split(' ').slice(0, -1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: `${precedingTokens} ___`,
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:apply:correct`, text: lastWord.correct },
      ...lastWord.distractors.map((entry) => ({ responseId: `${phrase.id}:apply:${asciiId(entry.reasonCode)}`, text: entry.value })),
    ]),
    testedDimension: `gender_agreement:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:apply:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...lastWord.distractors.map((entry) => feedback(
        `${phrase.id}:apply:${asciiId(entry.reasonCode)}`,
        false,
        `gender_agreement:${asciiId(entry.reasonCode)}`,
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
// review-словарь (eres + recall es/soy/bonito), и десять application-шагов
// на четыре фразы: Eres bonito (builder+listen), Eres bonita (context+listen),
// Eres rápido (context+builder), Eres rápida (listen_build+context) плюс два
// independent scripted_repeat_compare — по одному на мужскую и женскую пару.
export const ES_EPISODE_01_SESSION_09_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseEres() },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildEres() },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextGapEresMeaning() },
  { family: 'listen_choose', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseEresMeaning() },
  { family: 'phrase_builder', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: eresFormBuilder() },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: eresContextGapForm() },
  { family: 'speed_match', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0] }, modePayload: speedMatchVocabularyPayload },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: phraseBuilder(0) },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenBuildPhrase(0) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: contextGapPhraseLastWord(1) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: listenChoosePhrase(1, 0) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: contextGapPhraseLastWord(2) },
  { family: 'phrase_builder', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: phraseBuilder(2) },
  { family: 'listen_build_dictation', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: listenBuildPhrase(3) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: contextGapPhraseLastWord(3) },
  { family: 'scripted_repeat_compare', purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: repeatCompare(0) },
  { family: 'scripted_repeat_compare', purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: repeatCompare(2) },
]);

if (ES_EPISODE_01_SESSION_09_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_09_mode_native_practice_count_invalid');
}
