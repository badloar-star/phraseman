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
import { ES_EPISODE_01_SESSION_01_VOCABULARY_V1 } from './es_episode_01_session_01_vocabulary_v1';
import { ES_EPISODE_01_SESSION_02_VOCABULARY_V1 } from './es_episode_01_session_02_vocabulary_v1';
import { ES_EPISODE_01_SESSION_02_PHRASES } from './es_episode_01_session_02_phrases_v1';

// зачем этот файл (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10): испанская сессия 2 переписывается в mode-native формат,
// повторяя КОД (не данные) английского эталона episode_01_session_02_mode_native_v1.ts
// и структурные приёмы испанской сессии 1 (es_episode_01_session_01_mode_native_v1.ts).
// Ключевое отличие от английского эталона: там 4 новых слова, здесь ровно
// ОДНО — no (отрицание), уже полностью авторенное в
// es_episode_01_session_02_vocabulary_v1.ts тремя контактами (recognize/
// retrieve_meaning/build_form). Освободившийся бюджет 17 шагов уходит на
// более глубокую отработку "no" (две доп. интеракции на recognize и
// retrieve_meaning каждая, разные families на тот же target — это разрешено,
// т.к. "target+family не повторяется", а family здесь всегда разная) и на
// расширенное применение двух фраз сессии (No es fácil / No es verdad),
// каждая из которых использует только слова, уже изученные к этому моменту:
// no (эта сессия) + es/fácil/verdad (сессия 1). Ни одно новое слово не
// вводится внутри фраз — word-first правило соблюдено полностью.
const vocabulary = ES_EPISODE_01_SESSION_02_VOCABULARY_V1;
const reviewVocabulary = ES_EPISODE_01_SESSION_01_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_02_PHRASES;
if (phrases.length !== 2) {
  throw new Error('es_session_02_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

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
      `${item.id}:${stage}:${entry.reasonCode}`,
      false,
      `${entry.trapType}:${entry.reasonCode}`,
      expandLocalized(entry.feedback),
    )),
  ]);
}

// зачем 'en' вместо 'es' здесь (как в испанской сессии 1): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом,
// чтобы не перепутать с целевым испанским текстом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_02_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_02_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_02_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
    return [locale, reason];
  })) as LearningV2Localized<string>;
}

function phraseBuilderFeedback(phraseIndex: number): readonly LearningV2ModeChoiceFeedbackV1[] {
  const phrase = phrases[phraseIndex]!;
  const values = [...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))];
  return Object.freeze([
    feedback(`${phrase.id}:builder:correct`, true, 'phrase_assembly', localizedPhraseField(phraseIndex, 'explanation')),
    ...values.map((value) => feedback(
      `${phrase.id}:builder:${value}`,
      false,
      `phrase_assembly:${value}`,
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
const NO_AUDIO = authoredAudio('es-e01-s02-word-no', 'no');
const NO_SLOW_AUDIO = authoredAudio('es-e01-s02-word-no-slow', 'no');
const FACIL_PHRASE_AUDIO = authoredAudio('es-e01-s02-phrase-no-es-facil', 'No es fácil');
const FACIL_PHRASE_SLOW_AUDIO = authoredAudio('es-e01-s02-phrase-no-es-facil-slow', 'No es fácil');
const VERDAD_PHRASE_AUDIO = authoredAudio('es-e01-s02-phrase-no-es-verdad', 'No es verdad');
const VERDAD_PHRASE_SLOW_AUDIO = authoredAudio('es-e01-s02-phrase-no-es-verdad-slow', 'No es verdad');

// зачем именно эта ловушка (владелец, 2026-08-27): третья фонетическая
// ловушка для recognize/build_form "no", не входящая в исходный словарный
// файл (там их уже две — nada, non), нужна как самостоятельный дополнительный
// контакт для listen_build_dictation-повтора recognize. "nunca" уже
// используется как дистрактор внутри фразы "No es verdad" (см.
// es_episode_01_session_02_phrases_v1.ts), поэтому переиспользуем её здесь
// как честный, уже авторенный испанский сосед, а не выдумываем новое слово.
const NO_EXTRA_RECOGNIZE_TRAP = Object.freeze({
  value: 'nunca',
  reasonCode: 'no_recognize_nunca_different_word',
  feedback: L({
    ru: 'Nunca означает «никогда» — совсем другое слово, про частоту во времени. No короче и звучит одним слогом.',
    uk: 'Nunca означає «ніколи» — зовсім інше слово, про частоту в часі. No коротше й звучить одним складом.',
    es: 'Nunca means "never" — a completely different word, about frequency in time. No is shorter and one syllable.',
    'pt-BR': 'Nunca significa "nunca" — uma palavra completamente diferente, sobre frequência no tempo. No é mais curto e tem uma sílaba.',
    vi: 'Nunca nghĩa là "không bao giờ" — một từ hoàn toàn khác, về tần suất theo thời gian. No ngắn hơn và chỉ có một âm tiết.',
    id: 'Nunca berarti "tidak pernah" — kata yang sama sekali berbeda, tentang frekuensi waktu. No lebih pendek dan satu suku kata.',
    tr: 'Nunca "asla" demektir — zamandaki sıklıkla ilgili, tamamen farklı bir kelime. No daha kısadır ve tek hecelidir.',
    pl: 'Nunca znaczy „nigdy” — zupełnie inne słowo, o częstotliwości w czasie. No jest krótsze i ma jedną sylabę.',
  }),
});

// Meaning-choice labels are authored for the learner's own language, exactly
// as the English precedent and Spanish session 1 do — showing the raw
// Spanish trap tokens under "meaning" would turn a meaning task into another
// spelling task. Covers every trap value used anywhere in this file,
// including session-1 review words pulled in as retrieve_meaning distractors.
const VOCABULARY_TRAP_MEANINGS = Object.freeze({
  nada: L({ ru: 'ничего', uk: 'нічого', es: 'nothing', 'pt-BR': 'nada', vi: 'không có gì', id: 'tidak ada apa-apa', tr: 'hiçbir şey', pl: 'nic' }),
  non: L({ ru: '(не испанское слово)', uk: '(не іспанське слово)', es: '(not a Spanish word)', 'pt-BR': '(não é palavra do espanhol)', vi: '(không phải từ tiếng Tây Ban Nha)', id: '(bukan kata bahasa Spanyol)', tr: '(İspanyolca bir kelime değil)', pl: '(nie jest hiszpańskim słowem)' }),
  nunca: L({ ru: 'никогда', uk: 'ніколи', es: 'never', 'pt-BR': 'nunca', vi: 'không bao giờ', id: 'tidak pernah', tr: 'asla', pl: 'nigdy' }),
  verdad: L({ ru: 'правда', uk: 'правда', es: 'truth', 'pt-BR': 'verdade', vi: 'sự thật', id: 'kebenaran', tr: 'gerçek', pl: 'prawda' }),
  es: L({ ru: 'является (он/она/оно)', uk: 'є (він/вона/воно)', es: 'is (he/she/it)', 'pt-BR': 'é (ele/ela)', vi: 'là (anh ấy/cô ấy/nó)', id: 'adalah (dia)', tr: '-dir (o)', pl: 'jest (on/ona/ono)' }),
  eres: L({ ru: 'ты есть', uk: 'ти є', es: 'you are', 'pt-BR': 'você é', vi: 'bạn là', id: 'kamu adalah', tr: 'sensin', pl: 'jesteś' }),
  soy: L({ ru: 'я есть', uk: 'я є', es: 'I am', 'pt-BR': 'eu sou', vi: 'tôi là', id: 'saya adalah', tr: 'benim', pl: 'jestem' }),
  fácil: L({ ru: 'лёгкий', uk: 'легкий', es: 'easy', 'pt-BR': 'fácil', vi: 'dễ', id: 'mudah', tr: 'kolay', pl: 'łatwy' }),
  fácilmente: L({ ru: 'легко (при действии)', uk: 'легко (при дії)', es: 'easily (with an action)', 'pt-BR': 'facilmente (com uma ação)', vi: 'dễ dàng (khi hành động)', id: 'dengan mudah (saat bertindak)', tr: 'kolayca (bir eylemle)', pl: 'łatwo (przy czynności)' }),
  facilidad: L({ ru: 'лёгкость (предмет)', uk: 'легкість (предмет)', es: 'ease (a thing)', 'pt-BR': 'facilidade (uma coisa)', vi: 'sự dễ dàng (sự vật)', id: 'kemudahan (benda)', tr: 'kolaylık (bir şey)', pl: 'łatwość (rzecz)' }),
  verdadero: L({ ru: 'истинный (признак предмета)', uk: 'істинний (ознака предмета)', es: 'true (a quality of a thing)', 'pt-BR': 'verdadeiro (qualidade de uma coisa)', vi: 'đúng thật (đặc tính sự vật)', id: 'benar (sifat suatu benda)', tr: 'doğru (bir şeyin niteliği)', pl: 'prawdziwy (cecha rzeczy)' }),
  mentira: L({ ru: 'ложь', uk: 'брехня', es: 'lie', 'pt-BR': 'mentira', vi: 'lời nói dối', id: 'kebohongan', tr: 'yalan', pl: 'kłamstwo' }),
} as const satisfies Readonly<Record<string, LearningV2Localized<string>>>);

function vocabularyTrapMeaning(value: string): LearningV2Localized<string> {
  const localized = VOCABULARY_TRAP_MEANINGS[value as keyof typeof VOCABULARY_TRAP_MEANINGS];
  if (!localized) throw new Error(`es_session_02_trap_meaning_missing:${value}`);
  return localized;
}

function repeatWord(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: NO_AUDIO,
    slowReferenceAudio: NO_SLOW_AUDIO,
    targetPhrase: item.target,
    recordControlPolicy: 'hold_press_release_with_accessible_toggle',
    modelPlayback: 'reference_and_slow',
    learnerPlayback: 'available_after_capture',
    honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const),
  });
}

function listenChooseWord(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const contact = item.contacts.recognize;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: NO_AUDIO,
    slowReferenceAudio: NO_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:recognize:correct`, targetText: item.target, meaningByLocale: null },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:recognize:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: null,
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'recognize'),
  });
}

function listenBuildWord(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const contact = item.contacts.recognize;
  return Object.freeze({
    family: 'listen_build_dictation',
    referenceAudio: NO_AUDIO,
    slowReferenceAudio: NO_SLOW_AUDIO,
    hiddenTargetPhrase: item.target,
    orderedTokens: Object.freeze([item.target]),
    // Only real, authored neighbouring words are offered — no misspelled
    // pseudo-words, matching the English precedent's spelling-CAPTCHA guard.
    authoredDistractorTokens: Object.freeze([
      ...contact.distractors.map((entry) => entry.value),
      NO_EXTRA_RECOGNIZE_TRAP.value,
    ]),
    slotFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'recognize'),
      feedback(
        `${item.id}:recognize:${NO_EXTRA_RECOGNIZE_TRAP.reasonCode}`,
        false,
        `phonetic:${NO_EXTRA_RECOGNIZE_TRAP.reasonCode}`,
        NO_EXTRA_RECOGNIZE_TRAP.feedback,
      ),
    ]),
  });
}

// зачем именно этот extra-value для retrieve_meaning (владелец, 2026-08-27):
// verdad уже используется как встроенный word-level дистрактор внутри
// словарного файла (es_episode_01_session_02_vocabulary_v1.ts). Второй
// contextMeaning-контакт нужен под другой family (context_gap_grammar вместо
// listen_choose) с честной новой ловушкой — берём es из сессии 1, реальное
// review-слово, чтобы контакт заодно тренировал узнавание изученной связки.
function contextMeaningNo(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const contact = item.contacts.retrieve_meaning;
  const extraValue = 'es';
  const options = [item.target, ...contact.distractors.map((entry) => entry.value), extraValue];
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: '___ es fácil',
    gapOptions: Object.freeze(options.map((text, optionIndex) => ({
      responseId: optionIndex === 0
        ? `${item.id}:retrieve_meaning:correct`
        : optionIndex <= contact.distractors.length
        ? `${item.id}:retrieve_meaning:${contact.distractors[optionIndex - 1]!.reasonCode}`
        : `${item.id}:retrieve_meaning:extra_${extraValue}`,
      text,
    }))),
    testedDimension: `meaning:${item.target}_negates_es_fácil`,
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(
        `${item.id}:retrieve_meaning:extra_${extraValue}`,
        false,
        `semantic_neighbor:extra_${extraValue}`,
        L({
          ru: 'Es — это связка «является», а не отрицание. Она уже стоит во фразе; отрицание перед ней добавляет no.',
          uk: 'Es — це зв’язка «є», а не заперечення. Вона вже стоїть у фразі; заперечення перед нею додає no.',
          es: 'Es is the linking word "is", not a negation. It is already in the phrase; the negation before it is no.',
          'pt-BR': 'Es é a palavra de ligação "é", não uma negação. Ela já está na frase; a negação antes dela é no.',
          vi: 'Es là từ nối "là", không phải phủ định. Nó đã có sẵn trong câu; phủ định đứng trước nó là no.',
          id: 'Es adalah kata penghubung "adalah", bukan penyangkalan. Kata itu sudah ada dalam kalimat; penyangkalan sebelumnya adalah no.',
          tr: 'Es "-dir" bağlacıdır, olumsuzlama değildir. Zaten cümlede var; ondan önceki olumsuzlama no\'dur.',
          pl: 'Es to łącznik „jest”, nie przeczenie. Już stoi w zdaniu; przeczenie przed nim to no.',
        }),
      ),
    ]),
  });
}

function listenChooseMeaningNo(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const contact = item.contacts.retrieve_meaning;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: NO_AUDIO,
    slowReferenceAudio: NO_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze([
      { responseId: `${item.id}:retrieve_meaning:correct`, targetText: item.target, meaningByLocale: expandLocalized(item.meaning) },
      ...contact.distractors.map((entry) => ({
        responseId: `${item.id}:retrieve_meaning:${entry.reasonCode}`,
        targetText: entry.value,
        meaningByLocale: vocabularyTrapMeaning(entry.value),
      })),
    ]),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: vocabularyFeedback(item, 'retrieve_meaning'),
  });
}

function buildFormNoBuilder(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
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

// зачем второй build_form контакт под context_gap_grammar (владелец,
// 2026-08-27): та же орфографическая проверка "no" (n-o, без изменений), но
// внутри видимого контекста фразы вместо изолированной плитки — держит
// правило "target+family не повторяется" и готовит к настоящему
// context_gap_grammar-применению фраз ниже.
function buildFormNoContext(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const build = item.contacts.build_form;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(1, 'meaning'),
    gappedTargetPhrase: '___ es verdad',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct`, text: item.target },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${entry.reasonCode}`, text: entry.value })),
    ]),
    testedDimension: 'orthography:no_in_es_verdad_frame',
    choiceFeedback: vocabularyFeedback(item, 'build_form'),
  });
}

// зачем именно эти пять слов и такой порядок колонок (владелец, 2026-08-27):
// combined SPEED_WORDS = session-1 review (es/soy/fácil/verdad) + session-2
// "no", ровно как английский эталон комбинирует
// EPISODE_01_SESSION_01_VOCABULARY_V1 + свой vocabulary. Choreography-шаг
// видит только sourceVocabularyIndices: [0] — позицию "no" внутри ЭТОЙ
// сессии, как того требует session_shard_from_source_v1.ts (сверка идёт
// позиционно по шагам, не по итоговому payload).
const SPEED_WORDS = Object.freeze([...reviewVocabulary, ...vocabulary]);
const SPEED_IDS = SPEED_WORDS.map((word) => `es-e01-s02-pair-${word.target.toLowerCase()}`);
const speedMatchPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_WORDS.map((word, index) => ({
    pairId: SPEED_IDS[index]!, target: word.target, meaningByLocale: expandLocalized(word.meaning),
  }))),
  leftColumn: Object.freeze([SPEED_IDS[2]!, SPEED_IDS[4]!, SPEED_IDS[0]!, SPEED_IDS[3]!, SPEED_IDS[1]!]),
  rightColumn: Object.freeze([SPEED_IDS[3]!, SPEED_IDS[1]!, SPEED_IDS[4]!, SPEED_IDS[0]!, SPEED_IDS[2]!]),
  pairingKey: 'pair_id',
  timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
  finishStats: Object.freeze(['speed', 'accuracy', 'personal_best'] as const),
});

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
    referenceAudio: phraseIndex === 0 ? FACIL_PHRASE_AUDIO : VERDAD_PHRASE_AUDIO,
    slowReferenceAudio: phraseIndex === 0 ? FACIL_PHRASE_SLOW_AUDIO : VERDAD_PHRASE_SLOW_AUDIO,
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

function contextPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const negationWord = phrase.words[0]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: phraseIndex === 0 ? '___ es fácil' : '___ es verdad',
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:context:correct`, text: negationWord.correct },
      ...negationWord.distractors.map((entry) => ({
        responseId: `${phrase.id}:context:${entry.reasonCode}`,
        text: entry.value,
      })),
    ]),
    testedDimension: `phrase_negation:${phrase.id}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:context:correct`, true, 'phrase_negation', localizedPhraseField(phraseIndex, 'explanation')),
      ...negationWord.distractors.map((entry) => feedback(
        `${phrase.id}:context:${entry.reasonCode}`,
        false,
        `phrase_negation:${entry.reasonCode}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

function listenChoosePhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: phraseIndex === 0 ? FACIL_PHRASE_AUDIO : VERDAD_PHRASE_AUDIO,
    slowReferenceAudio: phraseIndex === 0 ? FACIL_PHRASE_SLOW_AUDIO : VERDAD_PHRASE_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze(phrases.map((candidate, index) => ({
      responseId: `${phrase.id}:listen:${index === phraseIndex ? 'correct' : `phrase_${index}`}`,
      targetText: candidate.english,
      meaningByLocale: localizedPhraseField(index, 'meaning'),
    }))),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze(phrases.map((candidate, index) => feedback(
      `${phrase.id}:listen:${index === phraseIndex ? 'correct' : `phrase_${index}`}`,
      index === phraseIndex,
      index === phraseIndex ? 'listening_exact_phrase' : `semantic_neighbor:last_word:${candidate.english.split(' ').at(-1)}`,
      index === phraseIndex ? localizedPhraseField(phraseIndex, 'explanation') : localizedPhraseField(index, 'explanation'),
    ))),
  });
}

function repeatPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: phraseIndex === 0 ? FACIL_PHRASE_AUDIO : VERDAD_PHRASE_AUDIO,
    slowReferenceAudio: phraseIndex === 0 ? FACIL_PHRASE_SLOW_AUDIO : VERDAD_PHRASE_SLOW_AUDIO,
    targetPhrase: phrase.english,
    recordControlPolicy: 'hold_press_release_with_accessible_toggle',
    modelPlayback: 'reference_and_slow',
    learnerPlayback: 'available_after_capture',
    honestOutcomeStates: Object.freeze(['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] as const),
  });
}

const INSTRUCTION = Object.freeze({
  repeatWord: {
    ru: 'Послушайте слово, затем произнесите его вслух.', uk: 'Послухайте слово, потім вимовте його вголос.',
    es: 'Escucha la palabra y luego repítela en voz alta.', 'pt-BR': 'Ouça a palavra e depois repita em voz alta.',
    vi: 'Nghe từ rồi đọc to từ đó.', id: 'Dengarkan katanya, lalu ucapkan dengan lantang.',
    tr: 'Sözcüğü dinleyin, sonra sesli söyleyin.', pl: 'Posłuchaj słowa, a potem powiedz je na głos.',
  },
  listenWord: {
    ru: 'Послушайте и выберите именно то слово, которое прозвучало.', uk: 'Послухайте й виберіть саме те слово, яке прозвучало.',
    es: 'Escucha y elige exactamente la palabra que suena.', 'pt-BR': 'Ouça e escolha exatamente a palavra que foi dita.',
    vi: 'Nghe và chọn đúng từ vừa được phát.', id: 'Dengarkan dan pilih tepat kata yang terdengar.',
    tr: 'Dinleyin ve tam olarak duyduğunuz sözcüğü seçin.', pl: 'Posłuchaj i wybierz dokładnie to słowo, które padło.',
  },
  listenBuildWord: {
    ru: 'Послушайте и соберите слово по буквам.', uk: 'Послухайте і складіть слово по буквах.',
    es: 'Escucha y construye la palabra letra por letra.', 'pt-BR': 'Ouça e monte a palavra letra por letra.',
    vi: 'Nghe rồi ghép từ theo từng chữ cái.', id: 'Dengarkan lalu susun kata huruf demi huruf.',
    tr: 'Dinleyin ve sözcüğü harf harf oluşturun.', pl: 'Posłuchaj i ułóż słowo litera po literze.',
  },
  contextMeaning: {
    ru: 'Дополните сообщение словом, которое точно подходит по смыслу.', uk: 'Доповніть повідомлення словом, яке точно пасує за змістом.',
    es: 'Completa el mensaje con la palabra que encaja exactamente por el sentido.', 'pt-BR': 'Complete a mensagem com a palavra que combina exatamente com o sentido.',
    vi: 'Hoàn thành lời nói bằng từ khớp chính xác với nghĩa.', id: 'Lengkapi pesan dengan kata yang paling tepat maknanya.',
    tr: 'İletiyi, anlama tam uyan sözcükle tamamlayın.', pl: 'Uzupełnij wypowiedź słowem, które dokładnie pasuje znaczeniem.',
  },
  listenMeaning: {
    ru: 'Послушайте слово и выберите его точное значение.', uk: 'Послухайте слово й виберіть його точне значення.',
    es: 'Escucha la palabra y elige su significado exacto.', 'pt-BR': 'Ouça a palavra e escolha o significado exato.',
    vi: 'Nghe từ và chọn đúng nghĩa của nó.', id: 'Dengarkan katanya dan pilih arti yang tepat.',
    tr: 'Sözcüğü dinleyin ve tam anlamını seçin.', pl: 'Posłuchaj słowa i wybierz jego dokładne znaczenie.',
  },
  buildWord: {
    ru: 'Соберите слово-отрицание.', uk: 'Складіть слово-заперечення.',
    es: 'Construye la palabra de negación.', 'pt-BR': 'Monte a palavra de negação.',
    vi: 'Ghép từ phủ định.', id: 'Susun kata penyangkalan.',
    tr: 'Olumsuzlama sözcüğünü oluşturun.', pl: 'Ułóż słowo przeczące.',
  },
  contextBuild: {
    ru: 'Выберите точное слово, которое завершает смысл этой фразы.', uk: 'Виберіть точне слово, яке завершує зміст цієї фрази.',
    es: 'Elige la palabra exacta que completa el sentido de esta frase.', 'pt-BR': 'Escolha a palavra exata que completa o sentido desta frase.',
    vi: 'Chọn đúng từ hoàn thành ý nghĩa của câu này.', id: 'Pilih kata yang tepat untuk melengkapi makna kalimat ini.',
    tr: 'Bu cümlenin anlamını tamamlayan doğru sözcüğü seçin.', pl: 'Wybierz dokładne słowo, które dopełnia sens tego zdania.',
  },
  speedMatch: {
    ru: 'Соедините пять испанских слов с их точными значениями.', uk: 'З’єднайте п’ять іспанських слів із їхніми точними значеннями.',
    es: 'Une las cinco palabras españolas con sus significados exactos.', 'pt-BR': 'Ligue as cinco palavras em espanhol aos significados exatos.',
    vi: 'Ghép năm từ tiếng Tây Ban Nha với nghĩa chính xác.', id: 'Pasangkan lima kata bahasa Spanyol dengan arti yang tepat.',
    tr: 'Beş İspanyolca sözcüğü tam anlamlarıyla eşleştirin.', pl: 'Połącz pięć hiszpańskich słów z ich dokładnymi znaczeniami.',
  },
  buildPhrase: {
    ru: 'Соберите полную фразу-возражение.', uk: 'Складіть повну фразу-заперечення.',
    es: 'Construye la frase completa de objeción.', 'pt-BR': 'Monte a frase completa de objeção.',
    vi: 'Ghép một câu phản đối đầy đủ.', id: 'Susun kalimat sanggahan lengkap.',
    tr: 'Tam bir itiraz cümlesi kurun.', pl: 'Ułóż pełne zdanie sprzeciwu.',
  },
  listenBuildPhrase: {
    ru: 'Послушайте целую фразу и соберите её в услышанном порядке.', uk: 'Послухайте цілу фразу й складіть її в почутому порядку.',
    es: 'Escucha la frase completa y constrúyela en el orden que oyes.', 'pt-BR': 'Ouça a frase inteira e monte-a na ordem ouvida.',
    vi: 'Nghe cả câu và ghép lại theo đúng thứ tự đã nghe.', id: 'Dengarkan seluruh kalimat dan susun sesuai urutan yang terdengar.',
    tr: 'Cümlenin tamamını dinleyin ve duyduğunuz sırayla kurun.', pl: 'Posłuchaj całego zdania i ułóż je w usłyszanej kolejności.',
  },
  listenPhrase: {
    ru: 'Послушайте и выберите целую фразу, которая прозвучала.', uk: 'Послухайте й виберіть цілу фразу, яка прозвучала.',
    es: 'Escucha y elige la frase completa que suena.', 'pt-BR': 'Ouça e escolha a frase inteira que foi dita.',
    vi: 'Nghe và chọn đúng cả câu vừa được phát.', id: 'Dengarkan dan pilih seluruh kalimat yang terdengar.',
    tr: 'Dinleyin ve duyduğunuz tam cümleyi seçin.', pl: 'Posłuchaj i wybierz całe zdanie, które padło.',
  },
  repeatPhrase: {
    ru: 'Послушайте полную фразу, произнесите её и сравните с образцом.', uk: 'Послухайте повну фразу, вимовте її та порівняйте зі зразком.',
    es: 'Escucha la frase completa, repítela y compárala con el modelo.', 'pt-BR': 'Ouça a frase inteira, repita e compare com o modelo.',
    vi: 'Nghe cả câu, đọc lại rồi so sánh với mẫu.', id: 'Dengarkan kalimat lengkap, ucapkan, lalu bandingkan dengan contoh.',
    tr: 'Tam cümleyi dinleyin, söyleyin ve örnekle karşılaştırın.', pl: 'Posłuchaj pełnego zdania, powiedz je i porównaj ze wzorem.',
  },
} satisfies Readonly<Record<string, LocalizedSource>>);

export const ES_EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: repeatWord() },
  { family: 'listen_choose', instruction: INSTRUCTION.listenWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseWord() },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildWord, purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildWord() },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextMeaningNo() },
  { family: 'listen_choose', instruction: INSTRUCTION.listenMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseMeaningNo() },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildWord, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buildFormNoBuilder() },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextBuild, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buildFormNoContext() },
  { family: 'speed_match', instruction: INSTRUCTION.speedMatch, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'vocabulary_grid', sourceIndices: [0] }, modePayload: speedMatchPayload },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: fullPhraseBuilder(0) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'guided_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenBuildPhrase(0) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextBuild, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: contextPhrase(1) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: listenChoosePhrase(1) },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: fullPhraseBuilder(1) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextBuild, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: contextPhrase(0) },
  { family: 'listen_choose', instruction: INSTRUCTION.listenPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: listenChoosePhrase(0) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 0 }, modePayload: repeatPhrase(0) },
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatPhrase, purpose: 'independent_check', learningStage: 'speak_with_model', target: { kind: 'phrase', sourceIndex: 1 }, modePayload: repeatPhrase(1) },
]);

if (ES_EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_02_mode_native_practice_count_invalid');
}
