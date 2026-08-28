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
import { ES_EPISODE_01_SESSION_21_VOCABULARY_V1 } from './es_episode_01_session_21_vocabulary_v1';
import { ES_EPISODE_01_SESSION_21_PHRASES } from './es_episode_01_session_21_phrases_v1';

// зачем этот файл (владелец, 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10): испанская сессия 21 переписывается в mode-native
// формат, повторяя КОД (не данные) es_episode_01_session_12_mode_native_v1.ts —
// тот же класс сессии (words_then_phrases, ровно одно новое слово), полностью
// авторенное в es_episode_01_session_21_vocabulary_v1.ts тремя контактами
// (recognize/retrieve_meaning/build_form; данные сохранены из легаси-черновика
// без изменений). ВАЖНОЕ ОТЛИЧИЕ от сессий 9/12/18: каждая из 15 легаси-фраз
// этой сессии состоит из 4-6 слов (El/libro/es/no/de/acuerdo/признак) —
// каждое слово несёт 2 дистрактора, что даёт 9-15 уникальных значений на
// фразу. Runtime-валидатор course_session_client_children_v1.ts
// (learning_v2_course_session_client_child_invalid) отклоняет
// responseFeedbackById длиннее 8 записей — phraseBuilderFeedback()
// (используется в phrase_builder и listen_build_dictation) строит
// 1 + все уникальные дистракторы фразы, что превышает предел на КАЖДОЙ
// из 15 фраз этой сессии без исключения (проверено скриптом на этапе
// авторинга — все 15 индексов дают 9-15 записей). Поэтому phrase_builder и
// listen_build_dictation здесь НЕ используются на фразах вообще — только
// listen_choose (2 варианта), context_gap_grammar (дистракторы только
// последнего слова, максимум 2 везде) и speed_match. word-first контакты
// (одно слово libro) этому пределу не подвержены — используют оба family
// как обычно.
const vocabulary = ES_EPISODE_01_SESSION_21_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_21_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_21_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-28, тот же класс бага сессий 5/6/8-20):
// runtime-валидатор ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без
// диакритики. Эта сессия не вводит диакритику в новом слове (libro без
// accent), но фразы переиспользуют reasonCode из fácil/único (recall) —
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-20): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_21_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_21_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_21_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
    return [locale, reason];
  })) as LearningV2Localized<string>;
}

function authoredAudio(audioTargetId: string, transcript: string): LearningV2ModeAudioReferenceV1 {
  return Object.freeze({ audioTargetId, transcript });
}

// Stable logical targets exist before immutable clips are published. The DEV
// owner-preview reads their exact transcripts through on-device TTS; release
// audio later binds to the same ids without changing authored interactions.
const WORD_AUDIO = authoredAudio('es-e01-s21-word-libro', 'libro');
const WORD_SLOW_AUDIO = authoredAudio('es-e01-s21-word-libro-slow', 'libro');
function phraseAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s21-phrase-${phraseIndex + 1}`, phrase.english);
}
function phraseSlowAudio(phraseIndex: number): LearningV2ModeAudioReferenceV1 {
  const phrase = phrases[phraseIndex]!;
  return authoredAudio(`es-e01-s21-phrase-${phraseIndex + 1}-slow`, phrase.english);
}

const item = vocabulary[0]!;

// зачем эта извлекаемая доп.-ловушка на build_form (владелец, 2026-08-28,
// тот же класс, что сессии 3/4/5/6/9/12/18): build_form-контакт словаря
// содержит только близкие орфографические/семантические ловушки;
// дополнительная третья опция — recall caro (уже изученный признак,
// доказывающий, что libro — не признак, а существительное).
const BUILD_FORM_EXTRA = Object.freeze({
  value: 'caro',
  reasonCode: 'libro_form_caro_wrong_category_extra',
  feedback: L({
    ru: 'Caro — это признак «дорого», он описывает предмет, но не называет его. Нужно именно существительное libro.',
    uk: 'Caro — це ознака «дорого», вона описує предмет, але не називає його. Потрібно саме іменник libro.',
    es: 'Caro is the quality "expensive" — it describes a thing but does not name it. Exactly the noun libro is needed.',
    'pt-BR': 'Caro é a qualidade "caro" — descreve uma coisa, mas não a nomeia. Precisa exatamente do substantivo libro.',
    vi: 'Caro là đặc điểm "đắt" — nó mô tả một vật nhưng không gọi tên nó. Cần chính xác danh từ libro.',
    id: 'Caro adalah sifat "mahal" — menggambarkan suatu benda tetapi tidak menyebutnya. Perlu tepat kata benda libro.',
    tr: 'Caro "pahalı" niteliğidir — bir şeyi tanımlar ama adlandırmaz. Tam olarak libro ismi gerekir.',
    pl: 'Caro to cecha „drogi” — opisuje rzecz, ale jej nie nazywa. Potrzebny dokładnie rzeczownik libro.',
  }),
});

function listenChooseLibro(): LearningV2ModeNativePayloadV1 {
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

function listenBuildLibro(): LearningV2ModeNativePayloadV1 {
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

function contextGapLibroMeaning(): LearningV2ModeNativePayloadV1 {
  const contact = item.contacts.retrieve_meaning;
  const phrase = phrases[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: 'El ___ es caro',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, text: 'libro' },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${asciiId(entry.reasonCode)}`,
        text: entry.value,
      })),
    ]),
    testedDimension: 'meaning:libro_noun_not_quality',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:retrieve_meaning:correct`, true, 'retrieve_meaning', localizedPhraseField(0, 'explanation')),
      ...vocabularyFeedback(item, 'retrieve_meaning').filter((row) => !row.correct),
    ]),
  });
}

function listenChooseLibroMeaning(): LearningV2ModeNativePayloadV1 {
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
        meaningByLocale: L({ ru: 'дорого', uk: 'дорого', es: 'expensive', 'pt-BR': 'caro', vi: 'đắt', id: 'mahal', tr: 'pahalı', pl: 'drogo' }),
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'retrieve_meaning'),
  });
}

function libroFormBuilder(): LearningV2ModeNativePayloadV1 {
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

function libroContextGapForm(): LearningV2ModeNativePayloadV1 {
  const build = item.contacts.build_form;
  const phrase = phrases[1]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(1, 'meaning'),
    gappedTargetPhrase: 'El ___ es barato',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct`, text: 'libro' },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${asciiId(entry.reasonCode)}`, text: entry.value })),
    ]),
    testedDimension: 'build_form:libro_noun_spelling',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:build_form:correct`, true, 'build_form', localizedPhraseField(1, 'explanation')),
      ...vocabularyFeedback(item, 'build_form').filter((row) => !row.correct),
    ]),
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

function contextGapLastWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const lastWord = phrase.words[phrase.words.length - 1]!;
  const precedingTokens = phrase.english.split(' ').slice(0, -1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: `${precedingTokens} ___`,
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:apply:correct`, text: lastWord.correct },
      ...lastWord.distractors.map((entry) => ({ responseId: `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`, text: entry.value })),
    ]),
    testedDimension: `noun_gender_agreement:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:apply:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...lastWord.distractors.map((entry) => feedback(
        `${phrase.id}:apply:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `noun_gender_agreement:${asciiId(entry.reasonCode)}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

// зачем speed_match сочетает review-словарь сессий 3+18+21 (владелец,
// 2026-08-28): карта фиксирует recalls: [3, 18] — согласование рода
// (сессия 3, bonito/bonita) и price_adjective (сессия 18, caro/barato).
// Grid комбинирует libro (эта сессия, существительное) с caro/barato/
// bonito (recall, прилагательные) — контраст "предмет со своим родом" vs
// "признак, подстраивающийся под чужой род".
const SPEED_MATCH_VOCABULARY = Object.freeze([
  { id: 'libro', target: 'libro', meaning: L({ ru: 'книга', uk: 'книга', es: 'book', 'pt-BR': 'livro', vi: 'sách', id: 'buku', tr: 'kitap', pl: 'książka' }) },
  { id: 'caro', target: 'caro', meaning: L({ ru: 'дорого', uk: 'дорого', es: 'expensive', 'pt-BR': 'caro', vi: 'đắt', id: 'mahal', tr: 'pahalı', pl: 'drogo' }) },
  { id: 'barato', target: 'barato', meaning: L({ ru: 'дёшево', uk: 'дешево', es: 'cheap', 'pt-BR': 'barato', vi: 'rẻ', id: 'murah', tr: 'ucuz', pl: 'tanio' }) },
  { id: 'bonito', target: 'bonito', meaning: L({ ru: 'красивый', uk: 'красивий', es: 'pretty', 'pt-BR': 'bonito', vi: 'đẹp trai', id: 'tampan', tr: 'yakışıklı', pl: 'przystojny' }) },
] as const);

const speedMatchVocabularyPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_MATCH_VOCABULARY.map((word) => ({
    pairId: `es-e01-s21-pair-${word.id}`,
    target: word.target,
    meaningByLocale: word.meaning,
  }))),
  leftColumn: Object.freeze(['es-e01-s21-pair-bonito', 'es-e01-s21-pair-libro', 'es-e01-s21-pair-barato', 'es-e01-s21-pair-caro']),
  rightColumn: Object.freeze(['es-e01-s21-pair-caro', 'es-e01-s21-pair-barato', 'es-e01-s21-pair-libro', 'es-e01-s21-pair-bonito']),
  pairingKey: 'pair_id',
  timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
  finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
});

function speedMatchPhrases(pairIndices: readonly number[]): LearningV2ModeNativePayloadV1 {
  const selected = pairIndices.map((index) => phrases[index]!);
  const ids = pairIndices.map((index) => `es-e01-s21-phrase-pair-${index + 1}`);
  return Object.freeze({
    family: 'speed_match',
    pairGrid: Object.freeze(selected.map((phrase, position) => ({
      pairId: ids[position]!,
      target: phrase.english,
      meaningByLocale: localizedPhraseField(pairIndices[position]!, 'meaning'),
    }))),
    leftColumn: Object.freeze([ids[0]!, ids[2]!, ids[1]!]),
    rightColumn: Object.freeze([ids[1]!, ids[0]!, ids[2]!]),
    pairingKey: 'pair_id',
    timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
    finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
  });
}

// зачем именно этот порядок 17 шагов, БЕЗ phrase_builder/listen_build_dictation
// на фразах (владелец, 2026-08-28, найдено при верификации мок-сборки):
// 3 обязательных word-first контакта (recognize/retrieve_meaning/build_form)
// + по одной дополнительной интеракции другой family на каждый (правило
// "target+family не повторяется"), затем speed_match на review-словарь
// (libro + recall caro/barato/bonito), и десять application-шагов на 15
// фраз — только listen_choose/context_gap_grammar/speed_match, потому что
// phrase_builder/listen_build_dictation превысили бы предел
// responseFeedbackById ≤8 на КАЖДОЙ фразе этой сессии (см. комментарий
// выше файла).
export const ES_EPISODE_01_SESSION_21_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'listen_choose', purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseLibro() },
  { family: 'listen_build_dictation', purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildLibro() },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextGapLibroMeaning() },
  { family: 'listen_choose', purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseLibroMeaning() },
  { family: 'phrase_builder', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: libroFormBuilder() },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: libroContextGapForm() },
  { family: 'speed_match', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0] }, modePayload: speedMatchVocabularyPayload },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenChoosePhrase(0, 1) },
  { family: 'context_gap_grammar', purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: contextGapLastWord(1) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 2 }, modePayload: contextGapLastWord(2) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: listenChoosePhrase(3, 2) },
  { family: 'context_gap_grammar', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: contextGapLastWord(4) },
  { family: 'speed_match', purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 6 }, modePayload: speedMatchPhrases([6, 7, 8]) },
  { family: 'context_gap_grammar', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: contextGapLastWord(9) },
  { family: 'listen_choose', purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: listenChoosePhrase(12, 14) },
  { family: 'context_gap_grammar', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 13 }, modePayload: contextGapLastWord(13) },
  { family: 'context_gap_grammar', purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: contextGapLastWord(14) },
]);

if (ES_EPISODE_01_SESSION_21_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_21_mode_native_practice_count_invalid');
}
