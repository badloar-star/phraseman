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
import { ES_EPISODE_01_SESSION_05_VOCABULARY_V1 } from './es_episode_01_session_05_vocabulary_v1';
import { ES_EPISODE_01_SESSION_06_VOCABULARY_V1 } from './es_episode_01_session_06_vocabulary_v1';
import { ES_EPISODE_01_SESSION_06_PHRASES } from './es_episode_01_session_06_phrases_v1';

// зачем этот файл (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10): испанская сессия 6 переписывается в mode-native формат,
// повторяя КОД (не данные) es_episode_01_session_04_mode_native_v1.ts — тот
// же класс сессии, ровно ОДНО новое слово (único), полностью авторенное в
// es_episode_01_session_06_vocabulary_v1.ts тремя контактами (recognize/
// retrieve_meaning/build_form). Освободившийся бюджет 17 шагов уходит на
// более глубокую отработку "único" (доп. интеракции на recognize и
// retrieve_meaning каждая другой family на тот же target — разрешено, т.к.
// "target+family не повторяется") и на расширенное применение двух фраз
// сессии (Es único / Es única), каждая из которых использует только уже
// изученные слова: es (сессия 1), único/única (эта сессия). Ни одно новое
// слово не вводится внутри фраз — word-first правило соблюдено.
//
// зачем combined review-словарь берёт сессии 1 И 5 (владелец, 2026-08-27,
// карта es_episode_01_session_map_v1.ts: builtOn: [1, 5], recalls: [1, 5]):
// карта явно recalls fácil (сессия 1) и rápido (сессия 5) — оба слова с тем
// же ритмическим рисунком ударения на á первого слога, что и único с
// ударением на ú, поэтому speed_match сочетает review сессий 1+5 + новое
// слово этой сессии.
//
// зачем asciiId (владелец, 2026-08-27, найдено при верификации сборки мока
// сессии 5, тот же класс бага): único/única содержат диакритику (ú), а
// context_gap_grammar передаёт сырой responseId напрямую в runtime без
// позиционного переприсвоения (в отличие от phrase_builder/
// listen_build_dictation). ID_RE в course_session_client_children_v1.ts не
// допускает символы вне [A-Za-z0-9._:-] — без сатинизации сборка мока падает
// с learning_v2_course_session_client_child_invalid.
const vocabulary = ES_EPISODE_01_SESSION_06_VOCABULARY_V1;
const reviewVocabularySession01 = ES_EPISODE_01_SESSION_01_VOCABULARY_V1;
const reviewVocabularySession05 = ES_EPISODE_01_SESSION_05_VOCABULARY_V1;
const phrases = ES_EPISODE_01_SESSION_06_PHRASES;
if (phrases.length !== 2) {
  throw new Error('es_session_06_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

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
      `${item.id}:${stage}:${entry.reasonCode}`,
      false,
      `${entry.trapType}:${entry.reasonCode}`,
      expandLocalized(entry.feedback),
    )),
  ]);
}

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-5): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом,
// чтобы не перепутать с целевым испанским текстом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_06_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_06_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_06_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
const UNICO_AUDIO = authoredAudio('es-e01-s06-word-unico', 'único');
const UNICO_SLOW_AUDIO = authoredAudio('es-e01-s06-word-unico-slow', 'único');
const ES_UNICO_PHRASE_AUDIO = authoredAudio('es-e01-s06-phrase-es-unico', 'Es único');
const ES_UNICO_PHRASE_SLOW_AUDIO = authoredAudio('es-e01-s06-phrase-es-unico-slow', 'Es único');
const ES_UNICA_PHRASE_AUDIO = authoredAudio('es-e01-s06-phrase-es-unica', 'Es única');
const ES_UNICA_PHRASE_SLOW_AUDIO = authoredAudio('es-e01-s06-phrase-es-unica-slow', 'Es única');

// зачем именно эта ловушка (владелец, 2026-08-27): третья фонетическая
// ловушка для recognize/build_form "único", не входящая в исходный
// словарный файл (там уже две — única, unido), нужна как самостоятельный
// дополнительный контакт для listen_build_dictation-повтора recognize.
// "rápido" уже authored в испанской сессии 5 как честный испанский сосед той
// же морфологической формы (-o, мужской род прилагательного, ударение перед
// концовкой), не выдумываем новое слово.
const UNICO_EXTRA_RECOGNIZE_TRAP = Object.freeze({
  value: 'rápido',
  reasonCode: 'unico_recognize_rapido_different_word',
  feedback: L({
    ru: 'Rápido означает «быстрый» — совсем другое слово и признак, хоть и с той же концовкой -o. Нужное слово — único, «единственный».',
    uk: 'Rápido означає «швидкий» — зовсім інше слово й ознака, хоч і з тим самим закінченням -o. Потрібне слово — único, «єдиний».',
    es: 'Rápido means "fast" — a completely different word and quality, even though it shares the -o ending. The word here is único, "unique".',
    'pt-BR': 'Rápido significa "rápido" — uma palavra e qualidade completamente diferentes, mesmo com a mesma terminação -o. A palavra aqui é único, "único".',
    vi: 'Rápido nghĩa là "nhanh" — một từ và đặc điểm hoàn toàn khác, dù có cùng đuôi -o. Từ cần dùng là único, "duy nhất".',
    id: 'Rápido berarti "cepat" — kata dan sifat yang sama sekali berbeda, meskipun berbagi akhiran -o yang sama. Kata di sini adalah único, "unik".',
    tr: 'Rápido "hızlı" demektir — aynı -o son ekini paylaşsa da tamamen farklı bir kelime ve nitelik. Buradaki kelime único, "eşsiz"dir.',
    pl: 'Rápido znaczy „szybki” — zupełnie inne słowo i cecha, mimo tej samej końcówki -o. Potrzebne słowo to único, „jedyny”.',
  }),
});

// Meaning-choice labels are authored for the learner's own language, exactly
// as the English precedent and Spanish sessions 1-5 do — showing the raw
// Spanish trap tokens under "meaning" would turn a meaning task into another
// spelling task. Covers every trap value used anywhere in this file,
// including session-1/5 review words pulled in as distractors.
const VOCABULARY_TRAP_MEANINGS = Object.freeze({
  única: L({ ru: 'единственная — женский род признака', uk: 'єдина — жіночий рід ознаки', es: 'unique (feminine form)', 'pt-BR': 'única (forma feminina)', vi: 'duy nhất (dạng giống cái)', id: 'unik (bentuk feminin)', tr: 'eşsiz (dişil biçim)', pl: 'jedyna (forma żeńska)' }),
  unido: L({ ru: '(другое слово, не по теме)', uk: '(інше слово, не по темі)', es: '(a different, unrelated word)', 'pt-BR': '(uma palavra diferente, sem relação)', vi: '(một từ khác, không liên quan)', id: '(kata lain, tidak terkait)', tr: '(farklı, ilgisiz bir kelime)', pl: '(inne, niepowiązane słowo)' }),
  fácil: L({ ru: 'лёгкий', uk: 'легкий', es: 'easy', 'pt-BR': 'fácil', vi: 'dễ', id: 'mudah', tr: 'kolay', pl: 'łatwy' }),
  rápido: L({ ru: 'быстрый', uk: 'швидкий', es: 'fast', 'pt-BR': 'rápido', vi: 'nhanh', id: 'cepat', tr: 'hızlı', pl: 'szybki' }),
  es: L({ ru: 'является (он/она/оно)', uk: 'є (він/вона/воно)', es: 'is (he/she/it)', 'pt-BR': 'é (ele/ela)', vi: 'là (anh ấy/cô ấy/nó)', id: 'adalah (dia)', tr: '-dir (o)', pl: 'jest (on/ona/ono)' }),
  soy: L({ ru: 'я есть', uk: 'я є', es: 'I am', 'pt-BR': 'eu sou', vi: 'tôi là', id: 'saya adalah', tr: 'benim', pl: 'jestem' }),
} as const satisfies Readonly<Record<string, LearningV2Localized<string>>>);

function vocabularyTrapMeaning(value: string): LearningV2Localized<string> {
  const localized = VOCABULARY_TRAP_MEANINGS[value as keyof typeof VOCABULARY_TRAP_MEANINGS];
  if (!localized) throw new Error(`es_session_06_trap_meaning_missing:${value}`);
  return localized;
}

function repeatWord(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: UNICO_AUDIO,
    slowReferenceAudio: UNICO_SLOW_AUDIO,
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
    referenceAudio: UNICO_AUDIO,
    slowReferenceAudio: UNICO_SLOW_AUDIO,
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
    referenceAudio: UNICO_AUDIO,
    slowReferenceAudio: UNICO_SLOW_AUDIO,
    hiddenTargetPhrase: item.target,
    orderedTokens: Object.freeze([item.target]),
    // Only real, authored neighbouring words are offered — no misspelled
    // pseudo-words, matching the English precedent's spelling-CAPTCHA guard.
    authoredDistractorTokens: Object.freeze([
      ...contact.distractors.map((entry) => entry.value),
      UNICO_EXTRA_RECOGNIZE_TRAP.value,
    ]),
    slotFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'recognize'),
      feedback(
        `${item.id}:recognize:${UNICO_EXTRA_RECOGNIZE_TRAP.reasonCode}`,
        false,
        `phonetic:${UNICO_EXTRA_RECOGNIZE_TRAP.reasonCode}`,
        UNICO_EXTRA_RECOGNIZE_TRAP.feedback,
      ),
    ]),
  });
}

// зачем именно этот extra-value для retrieve_meaning (владелец, 2026-08-27):
// rápido уже используется как встроенный word-level дистрактор внутри
// словарного файла (es_episode_01_session_06_vocabulary_v1.ts). Второй
// retrieve_meaning-контакт нужен под другой family (context_gap_grammar
// вместо listen_choose) с честной новой ловушкой — берём "fácil", реальное
// review-прилагательное из сессии 1, чтобы контакт заодно тренировал
// различение признака единственности от признака сложности.
function contextMeaningUnico(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const contact = item.contacts.retrieve_meaning;
  const extraValue = 'fácil';
  const options = [item.target, ...contact.distractors.map((entry) => entry.value), extraValue];
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: 'Es ___',
    gapOptions: Object.freeze(options.map((text, optionIndex) => ({
      responseId: optionIndex === 0
        ? `${item.id}:retrieve_meaning:correct`
        : optionIndex <= contact.distractors.length
        ? `${item.id}:retrieve_meaning:${asciiId(contact.distractors[optionIndex - 1]!.reasonCode)}`
        : `${item.id}:retrieve_meaning:extra_${asciiId(extraValue)}`,
      text,
    }))),
    testedDimension: `meaning:${asciiId(item.target)}_describes_uniqueness`,
    choiceFeedback: Object.freeze([
      ...vocabularyFeedback(item, 'retrieve_meaning'),
      feedback(
        `${item.id}:retrieve_meaning:extra_${asciiId(extraValue)}`,
        false,
        `semantic_neighbor:extra_${asciiId(extraValue)}`,
        L({
          ru: 'Fácil — про сложность, «лёгкий». Про единственность нужно другое слово — único.',
          uk: 'Fácil — про складність, «легкий». Про єдиність потрібне інше слово — único.',
          es: 'Fácil is about difficulty, "easy". For uniqueness, a different word is needed — único.',
          'pt-BR': 'Fácil é sobre dificuldade, "fácil". Para singularidade, é preciso outra palavra — único.',
          vi: 'Fácil nói về độ khó, "dễ". Về sự duy nhất cần một từ khác — único.',
          id: 'Fácil tentang kesulitan, "mudah". Untuk keunikan diperlukan kata lain — único.',
          tr: 'Fácil zorlukla ilgilidir, "kolay". Eşsizlik için başka bir kelime gerekir — único.',
          pl: 'Fácil dotyczy trudności, „łatwy”. O wyjątkowości mówi inne słowo — único.',
        }),
      ),
    ]),
  });
}

function listenChooseMeaningUnico(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const contact = item.contacts.retrieve_meaning;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: UNICO_AUDIO,
    slowReferenceAudio: UNICO_SLOW_AUDIO,
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

function buildFormUnicoBuilder(): LearningV2ModeNativePayloadV1 {
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
// 2026-08-27): та же орфографическая проверка "único" (тильда над ú и
// концовка -o), но внутри видимого контекста фразы "Es ___" вместо
// изолированной плитки — держит правило "target+family не повторяется" и
// готовит к настоящему gender-agreement-применению фраз ниже.
function buildFormUnicoContext(): LearningV2ModeNativePayloadV1 {
  const item = vocabulary[0]!;
  const build = item.contacts.build_form;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(0, 'meaning'),
    gappedTargetPhrase: 'Es ___',
    gapOptions: Object.freeze([
      { responseId: `${item.id}:build_form:correct`, text: item.target },
      ...build.distractors.map((entry) => ({ responseId: `${item.id}:build_form:${asciiId(entry.reasonCode)}`, text: entry.value })),
    ]),
    testedDimension: 'orthography:unico_tilde_masculine_ending',
    choiceFeedback: Object.freeze([
      feedback(`${item.id}:build_form:correct`, true, 'build_form', expandLocalized(build.guidance)),
      ...build.distractors.map((entry) => feedback(
        `${item.id}:build_form:${asciiId(entry.reasonCode)}`,
        false,
        `${entry.trapType}:${entry.reasonCode}`,
        expandLocalized(entry.feedback),
      )),
    ]),
  });
}

// зачем именно этот комбинированный словарь и порядок колонок (владелец,
// 2026-08-27): combined SPEED_WORDS = session-1 review (es/soy/fácil/verdad)
// + session-5 review (rápido) + session-6 "único" — ровно словам,
// перечисленным картой как builtOn/recalls этой сессии ([1, 5]), плюс новое
// слово этой сессии. Choreography-шаг видит только sourceVocabularyIndices:
// [0] — позицию "único" внутри ЭТОЙ сессии, как того требует
// session_shard_from_source_v1.ts (сверка идёт позиционно по шагам, не по
// итоговому payload).
const SPEED_WORDS = Object.freeze([
  ...reviewVocabularySession01,
  ...reviewVocabularySession05,
  ...vocabulary,
]);
const SPEED_IDS = SPEED_WORDS.map((word, index) => `es-e01-s06-pair-${index + 1}`);
const speedMatchPayload: LearningV2ModeNativePayloadV1 = Object.freeze({
  family: 'speed_match',
  pairGrid: Object.freeze(SPEED_WORDS.map((word, index) => ({
    pairId: SPEED_IDS[index]!, target: word.target, meaningByLocale: expandLocalized(word.meaning),
  }))),
  leftColumn: Object.freeze([SPEED_IDS[3]!, SPEED_IDS[0]!, SPEED_IDS[5]!, SPEED_IDS[1]!, SPEED_IDS[4]!, SPEED_IDS[2]!]),
  rightColumn: Object.freeze([SPEED_IDS[1]!, SPEED_IDS[5]!, SPEED_IDS[2]!, SPEED_IDS[0]!, SPEED_IDS[3]!, SPEED_IDS[4]!]),
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
    referenceAudio: phraseIndex === 0 ? ES_UNICO_PHRASE_AUDIO : ES_UNICA_PHRASE_AUDIO,
    slowReferenceAudio: phraseIndex === 0 ? ES_UNICO_PHRASE_SLOW_AUDIO : ES_UNICA_PHRASE_SLOW_AUDIO,
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

// зачем "gapOptions" на признак, а не на связку (владелец, 2026-08-27, тот же
// приём, что и в испанских сессиях 3/4): предмет согласования — сам признак
// (único/única), связка Es неизменна и уже видна в сцене. Гейт стоит на
// позиции признака: "Es ___", варианты — único/única/rápido (третий вариант
// из этой же сессии, wrong_word). asciiId защищает responseId от тильды над
// ú в reasonCode фраз этой сессии (gender_mismatch:único и т.п.).
function contextPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const qualityWord = phrase.words[1]!;
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: 'Es ___',
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:context:correct`, text: qualityWord.correct },
      ...qualityWord.distractors.map((entry) => ({
        responseId: `${phrase.id}:context:${asciiId(entry.reasonCode)}`,
        text: entry.value,
      })),
    ]),
    testedDimension: `gender_agreement:${phrase.id}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:context:correct`, true, 'gender_agreement', localizedPhraseField(phraseIndex, 'explanation')),
      ...qualityWord.distractors.map((entry) => feedback(
        `${phrase.id}:context:${asciiId(entry.reasonCode)}`,
        false,
        `gender_agreement:${asciiId(entry.reasonCode)}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

function listenChoosePhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'listen_choose',
    referenceAudio: phraseIndex === 0 ? ES_UNICO_PHRASE_AUDIO : ES_UNICA_PHRASE_AUDIO,
    slowReferenceAudio: phraseIndex === 0 ? ES_UNICO_PHRASE_SLOW_AUDIO : ES_UNICA_PHRASE_SLOW_AUDIO,
    localizedMeaningChoices: Object.freeze(phrases.map((candidate, index) => ({
      responseId: `${phrase.id}:listen:${index === phraseIndex ? 'correct' : `phrase_${index}`}`,
      targetText: candidate.english,
      meaningByLocale: localizedPhraseField(index, 'meaning'),
    }))),
    transcriptRevealPolicy: 'after_first_attempt',
    choiceFeedback: Object.freeze(phrases.map((candidate, index) => feedback(
      `${phrase.id}:listen:${index === phraseIndex ? 'correct' : `phrase_${index}`}`,
      index === phraseIndex,
      index === phraseIndex ? 'listening_exact_phrase' : `gender_agreement:last_word:${asciiId(candidate.english.split(' ').at(-1)!)}`,
      index === phraseIndex ? localizedPhraseField(phraseIndex, 'explanation') : localizedPhraseField(index, 'explanation'),
    ))),
  });
}

function repeatPhrase(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  return Object.freeze({
    family: 'scripted_repeat_compare',
    referenceAudio: phraseIndex === 0 ? ES_UNICO_PHRASE_AUDIO : ES_UNICA_PHRASE_AUDIO,
    slowReferenceAudio: phraseIndex === 0 ? ES_UNICO_PHRASE_SLOW_AUDIO : ES_UNICA_PHRASE_SLOW_AUDIO,
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
    ru: 'Соберите слово-признак.', uk: 'Складіть слово-ознаку.',
    es: 'Construye la palabra de la cualidad.', 'pt-BR': 'Monte a palavra da qualidade.',
    vi: 'Ghép từ chỉ đặc điểm.', id: 'Susun kata sifatnya.',
    tr: 'Nitelik sözcüğünü oluşturun.', pl: 'Ułóż słowo-cechę.',
  },
  contextBuild: {
    ru: 'Выберите точное слово, которое завершает смысл этой фразы.', uk: 'Виберіть точне слово, яке завершує зміст цієї фрази.',
    es: 'Elige la palabra exacta que completa el sentido de esta frase.', 'pt-BR': 'Escolha a palavra exata que completa o sentido desta frase.',
    vi: 'Chọn đúng từ hoàn thành ý nghĩa của câu này.', id: 'Pilih kata yang tepat untuk melengkapi makna kalimat ini.',
    tr: 'Bu cümlenin anlamını tamamlayan doğru sözcüğü seçin.', pl: 'Wybierz dokładne słowo, które dopełnia sens tego zdania.',
  },
  speedMatch: {
    ru: 'Соедините испанские слова с их точными значениями.', uk: 'З’єднайте іспанські слова з їхніми точними значеннями.',
    es: 'Une las palabras españolas con sus significados exactos.', 'pt-BR': 'Ligue as palavras em espanhol aos significados exatos.',
    vi: 'Ghép các từ tiếng Tây Ban Nha với nghĩa chính xác.', id: 'Pasangkan kata bahasa Spanyol dengan arti yang tepat.',
    tr: 'İspanyolca sözcükleri tam anlamlarıyla eşleştirin.', pl: 'Połącz hiszpańskie słowa z ich dokładnymi znaczeniami.',
  },
  buildPhrase: {
    ru: 'Соберите полную фразу-оценку.', uk: 'Складіть повну фразу-оцінку.',
    es: 'Construye la frase completa de valoración.', 'pt-BR': 'Monte a frase completa de avaliação.',
    vi: 'Ghép một câu đánh giá đầy đủ.', id: 'Susun kalimat penilaian lengkap.',
    tr: 'Tam bir değerlendirme cümlesi kurun.', pl: 'Ułóż pełne zdanie oceny.',
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

export const ES_EPISODE_01_SESSION_06_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'scripted_repeat_compare', instruction: INSTRUCTION.repeatWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: repeatWord() },
  { family: 'listen_choose', instruction: INSTRUCTION.listenWord, purpose: 'supported_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseWord() },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildWord, purpose: 'guided_practice', learningStage: 'recognize', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenBuildWord() },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: contextMeaningUnico() },
  { family: 'listen_choose', instruction: INSTRUCTION.listenMeaning, purpose: 'retrieval_practice', learningStage: 'retrieve_meaning', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: listenChooseMeaningUnico() },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildWord, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buildFormUnicoBuilder() },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextBuild, purpose: 'guided_practice', learningStage: 'build_form', target: { kind: 'vocabulary', sourceIndex: 0 }, modePayload: buildFormUnicoContext() },
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

if (ES_EPISODE_01_SESSION_06_MODE_NATIVE_PRACTICE_V1.length !== 17) {
  throw new Error('es_session_06_mode_native_practice_count_invalid');
}
