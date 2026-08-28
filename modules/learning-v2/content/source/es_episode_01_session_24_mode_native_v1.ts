import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from '../generator_course_contract';
import type {
  LearningV2ModeChoiceFeedbackV1,
  LearningV2ModeNativePayloadV1,
} from '../../contracts/mode_native_payload_v1';
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
} from './session_shard_from_source_v1';
import { ES_EPISODE_01_SESSION_24_CHECKPOINT_PHRASES } from './es_episode_01_session_24_phrases_v1';

// зачем этот файл (владелец, 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// + СТАРТ ES §0/§10 + Rules §4.1, Глава 3 "Он, она, оно: предметы и
// ситуации" финал): испанская checkpoint-сессия 24 переписывается в
// mode-native формат, зеркаля КОД (не данные) сессий 8/16 — та же
// checkpoint-механика. Как и voice-сессия 23, checkpoint НЕ вводит новых
// слов и не имеет newVocabulary — переиспользует РОВНО тот же набор 15 фраз,
// что и сессия 23 (ES_EPISODE_01_SESSION_24_CHECKPOINT_PHRASES = алиас на
// ES_EPISODE_01_SESSION_23_VOICE_PHRASES). Разница между voice и checkpoint —
// не в материале, а в families и в support/promptNovelty: voice отрабатывает
// произношение вслух (scripted_repeat_compare), checkpoint проверяет
// применение вразнобой без подсказки (speed_match/listen_build_dictation/
// context_gap_grammar/phrase_builder), support:'none', promptNovelty:'novel'
// (см. supportFor() в lesson1_session_choreography_v1.ts).
//
// зачем легаси checkpointSteps() не нужно чинить так же, как voiceSteps()
// (владелец, 2026-08-28, тот же вывод, что и в сессиях 8/16): checkpointSteps()
// уже использует только утверждённые families (speed_match/
// listen_build_dictation/context_gap_grammar/phrase_builder) — sound_contrast
// там нет. Единственная правка — learningStage: 'independent_assessment' не
// входит в допустимый набор SessionModeNativePracticeSourceV1.learningStage
// (только recognize/retrieve_meaning/build_form/apply_in_phrase/
// speak_with_model) — заменено на 'apply_in_phrase'.
const phrases = ES_EPISODE_01_SESSION_24_CHECKPOINT_PHRASES;
if (phrases.length !== 15) {
  throw new Error('es_session_24_mode_native_phrase_count_invalid');
}

const L = (source: LocalizedSource): LearningV2Localized<string> => expandLocalized(source);

// зачем эта функция (владелец, 2026-08-28, тот же класс бага сессий 5/6/8-23):
// runtime-валидатор ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u — без
// диакритики. Фразы этой сессии переиспользуют reasonCode с диакритикой
// (fácil/único/rápido) из сессий 17/18/20.
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

// зачем 'en' вместо 'es' здесь (как в испанских сессиях 1-23): в испанском
// контуре 'es' — изучаемый язык, поэтому набор локалей ОБЪЯСНЕНИЯ —
// ru/uk/en/pt-BR/vi/id/tr/pl (без 'es'). localizedDetails у испанских фраз
// хранит объяснение под ключом 'en', не 'es' — читаем под явным алиасом.
function localizedPhraseField(
  phraseIndex: number,
  field: 'meaning' | 'explanation',
): LearningV2Localized<string> {
  const phrase = phrases[phraseIndex];
  if (!phrase?.localizedDetails) throw new Error(`es_session_24_phrase_details_missing:${phraseIndex}`);
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const englishExplanationLocale = locale === 'es' ? 'en' : locale;
    const detail = phrase.localizedDetails?.[englishExplanationLocale as typeof locale];
    if (!detail) throw new Error(`es_session_24_phrase_locale_missing:${phraseIndex}:${locale}`);
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
    if (!reason) throw new Error(`es_session_24_phrase_distractor_missing:${phraseIndex}:${locale}:${value}`);
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
    referenceAudio: { audioTargetId: `es-e01-s24-phrase-${phraseIndex + 1}`, transcript: phrase.english },
    slowReferenceAudio: { audioTargetId: `es-e01-s24-phrase-${phraseIndex + 1}-slow`, transcript: phrase.english },
    hiddenTargetPhrase: phrase.english,
    orderedTokens: Object.freeze(phrase.english.split(' ')),
    authoredDistractorTokens: Object.freeze([...new Set(phrase.words.flatMap((word) => word.distractors.map((entry) => entry.value)))]),
    slotFeedback: phraseBuilderFeedback(phraseIndex),
  });
}

// зачем контекстный гейт стоит на ПОСЛЕДНЕМ содержательном слове фразы
// (владелец, 2026-08-28, checkpoint-специфика, как и сессии 8/16): checkpoint
// вразнобой проверяет ЛЮБОЙ признак — поэтому гейт универсально ставится на
// последнее содержательное слово каждой фразы (последний элемент words[]),
// с его собственными authored-дистракторами из phrases-файла.
function contextGapLastWord(phraseIndex: number): LearningV2ModeNativePayloadV1 {
  const phrase = phrases[phraseIndex]!;
  const lastWord = phrase.words[phrase.words.length - 1]!;
  const precedingTokens = phrase.english.split(' ').slice(0, -1).join(' ');
  return Object.freeze({
    family: 'context_gap_grammar',
    localizedScene: localizedPhraseField(phraseIndex, 'meaning'),
    gappedTargetPhrase: precedingTokens.length > 0 ? `${precedingTokens} ___` : '___',
    gapOptions: Object.freeze([
      { responseId: `${phrase.id}:checkpoint:correct`, text: lastWord.correct },
      ...lastWord.distractors.map((entry) => ({ responseId: `${phrase.id}:checkpoint:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`, text: entry.value })),
    ]),
    testedDimension: `checkpoint_apply:${asciiId(phrase.id)}`,
    choiceFeedback: Object.freeze([
      feedback(`${phrase.id}:checkpoint:correct`, true, 'apply_in_phrase', localizedPhraseField(phraseIndex, 'explanation')),
      ...lastWord.distractors.map((entry) => feedback(
        `${phrase.id}:checkpoint:${asciiId(entry.reasonCode)}:${asciiId(entry.value)}`,
        false,
        `checkpoint_apply:${asciiId(entry.reasonCode)}`,
        localizedPhraseDistractorFeedback(phraseIndex, entry.value),
      )),
    ]),
  });
}

// зачем speed_match сочетает ВСЕ 15 фраз этой сессии в один grid (владелец,
// 2026-08-28, как и сессии 8/16): checkpoint — единственная сессия главы,
// где цель — проверить владение ЦЕЛОЙ главой сразу, без разбивки. pairGrid
// сопоставляет target испанский текст фразы с её точным переводом; ни одно
// новое слово не вводится — все 15 фраз уже честно изучены в сессиях 17/18/20
// и повторены в сессии 23.
const SPEED_IDS = phrases.map((_phrase, index) => `es-e01-s24-pair-${index + 1}`);
function speedMatchAllPhrases(pairIndices: readonly number[]): LearningV2ModeNativePayloadV1 {
  const selected = pairIndices.map((index) => phrases[index]!);
  const ids = pairIndices.map((index) => SPEED_IDS[index]!);
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

const INSTRUCTION = Object.freeze({
  speedMatch: {
    ru: 'Соедините испанские фразы с их точными переводами.', uk: 'З’єднайте іспанські фрази з їхніми точними перекладами.',
    es: 'Une las frases españolas con sus traducciones exactas.', 'pt-BR': 'Ligue as frases em espanhol às suas traduções exatas.',
    vi: 'Ghép các câu tiếng Tây Ban Nha với bản dịch chính xác.', id: 'Pasangkan kalimat bahasa Spanyol dengan terjemahan yang tepat.',
    tr: 'İspanyolca cümleleri tam çevirileriyle eşleştirin.', pl: 'Połącz hiszpańskie zdania z ich dokładnymi tłumaczeniami.',
  },
  listenBuildPhrase: {
    ru: 'Послушайте целую фразу и соберите её в услышанном порядке.', uk: 'Послухайте цілу фразу й складіть її в почутому порядку.',
    es: 'Escucha la frase completa y constrúyela en el orden que oyes.', 'pt-BR': 'Ouça a frase inteira e monte-a na ordem ouvida.',
    vi: 'Nghe cả câu và ghép lại theo đúng thứ tự đã nghe.', id: 'Dengarkan seluruh kalimat dan susun sesuai urutan yang terdengar.',
    tr: 'Cümlenin tamamını dinleyin ve duyduğunuz sırayla kurun.', pl: 'Posłuchaj całego zdania i ułóż je w usłyszanej kolejności.',
  },
  contextGap: {
    ru: 'Выберите точное слово, которое завершает смысл этой фразы.', uk: 'Виберіть точне слово, яке завершує зміст цієї фрази.',
    es: 'Elige la palabra exacta que completa el sentido de esta frase.', 'pt-BR': 'Escolha a palavra exata que completa o sentido desta frase.',
    vi: 'Chọn đúng từ hoàn thành ý nghĩa của câu này.', id: 'Pilih kata yang tepat untuk melengkapi makna kalimat ini.',
    tr: 'Bu cümlenin anlamını tamamlayan doğru sözcüğü seçin.', pl: 'Wybierz dokładne słowo, które dopełnia sens tego zdania.',
  },
  buildPhrase: {
    ru: 'Соберите полную фразу без подсказки.', uk: 'Складіть повну фразу без підказки.',
    es: 'Construye la frase completa sin ayuda.', 'pt-BR': 'Monte a frase completa sem ajuda.',
    vi: 'Ghép một câu đầy đủ mà không có gợi ý.', id: 'Susun kalimat lengkap tanpa petunjuk.',
    tr: 'Tam bir cümleyi ipucu olmadan kurun.', pl: 'Ułóż pełne zdanie bez podpowiedzi.',
  },
} satisfies Readonly<Record<string, LocalizedSource>>);

// зачем именно эти 12 шагов на индексах 3-14 (владелец, 2026-08-28, зеркало
// es_episode_01_session_08/16_mode_native_v1.ts по составу families и
// индексов, но с исправленным learningStage): три первые фразы (0-2) уже
// отработаны в интро-carousel. Оставшиеся 12 (3-14) чередуют families в том
// же порядке, что и легаси checkpointSteps(): speed_match/
// listen_build_dictation/context_gap_grammar/phrase_builder ×3, с
// нарастающей сложностью purpose (retrieval → near_transfer →
// independent_check).
export const ES_EPISODE_01_SESSION_24_MODE_NATIVE_PRACTICE_V1 = Object.freeze<readonly SessionModeNativePracticeSourceV1[]>([
  { family: 'speed_match', instruction: INSTRUCTION.speedMatch, purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 3 }, modePayload: speedMatchAllPhrases([0, 1, 2, 3, 4]) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 4 }, modePayload: listenBuildPhrase(4) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextGap, purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 5 }, modePayload: contextGapLastWord(5) },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'retrieval_practice', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 6 }, modePayload: fullPhraseBuilder(6) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 7 }, modePayload: listenBuildPhrase(7) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextGap, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 8 }, modePayload: contextGapLastWord(8) },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 9 }, modePayload: fullPhraseBuilder(9) },
  { family: 'speed_match', instruction: INSTRUCTION.speedMatch, purpose: 'near_transfer', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 10 }, modePayload: speedMatchAllPhrases([5, 6, 7, 8, 9]) },
  { family: 'listen_build_dictation', instruction: INSTRUCTION.listenBuildPhrase, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 11 }, modePayload: listenBuildPhrase(11) },
  { family: 'context_gap_grammar', instruction: INSTRUCTION.contextGap, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 12 }, modePayload: contextGapLastWord(12) },
  { family: 'phrase_builder', instruction: INSTRUCTION.buildPhrase, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 13 }, modePayload: fullPhraseBuilder(13) },
  { family: 'speed_match', instruction: INSTRUCTION.speedMatch, purpose: 'independent_check', learningStage: 'apply_in_phrase', target: { kind: 'phrase', sourceIndex: 14 }, modePayload: speedMatchAllPhrases([10, 11, 12, 13, 14]) },
]);

if (ES_EPISODE_01_SESSION_24_MODE_NATIVE_PRACTICE_V1.length !== 12) {
  throw new Error('es_session_24_mode_native_practice_count_invalid');
}
