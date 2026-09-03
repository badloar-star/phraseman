import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2,
  EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2,
} from './episode_01_session_04_exact_v2';
import { LESSON1_SESSION_08_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import { expandLocalized, type SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[7]!;
const base = EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2;
const asJson = (index: number) => JSON.parse(JSON.stringify(base[index]!));
const phrase = (index: number) => EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2[index]!;
const checkpointPhrase = (state: string, index: number) => {
  const model = EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2[0]!;
  const candidates = checkpointStates.filter((candidate) => candidate !== state);
  const alternatives = [...candidates.slice(index % candidates.length), ...candidates.slice(0, index % candidates.length)].slice(0, 3);
  const reviseWords = (words: readonly any[]) => words.map((word, wordIndex) => wordIndex === 2 ? {
    ...word,
    correct: state,
    distractors: alternatives.map((value, distractorIndex) => ({ ...word.distractors[distractorIndex]!, value, reasonCode: `checkpoint:${state}:not_${value}`, why: `${value} names a different known state, so the exact word needed here is ${state}, not ${value}.`, reason: `${value} names a different known state, so the exact word needed here is ${state}, not ${value}.` })),
  } : word);
  return {
    ...model,
    id: `e01-s08-checkpoint-phrase-${index + 1}`,
    english: `I am ${state}`,
    russian: state,
    words: reviseWords(model.words),
    localizedDetails: Object.fromEntries(Object.entries(model.localizedDetails ?? {}).map(([locale, detail]) => [locale, { ...detail, words: reviseWords(detail.words), explanation: `Use I am ${state}.`, distractors: reviseWords(detail.words).flatMap((word: any) => word.distractors) }])),
  };
};
const checkpointStates = ['hungry', 'thirsty', 'sick', 'here', 'ready', 'happy', 'fine', 'safe', 'home', 'okay', 'busy', 'calm', 'late', 'cold', 'hot'] as const;
const checkpointPhrases = checkpointStates.map(checkpointPhrase);
const audio = (text: string) => ({ audioTargetId: `e01-s08-${text.toLowerCase().replaceAll(' ', '-')}`, transcript: text });
// Runtime-localized feedback includes the internal English projection too.
// Use the canonical expander so a hand-written response cannot omit it.
const L = (text: string) => expandLocalized({ ru: text, uk: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text });

const checkpointPractice = [
  { ...asJson(2), purpose: 'retrieval_practice', learningStage: 'delayed_recall', target: { kind: 'phrase', sourceIndex: 0 } },
  { ...asJson(3), purpose: 'retrieval_practice', learningStage: 'delayed_recall', target: { kind: 'phrase', sourceIndex: 3 } },
  { ...asJson(4), purpose: 'near_transfer', learningStage: 'independent_assessment', target: { kind: 'phrase', sourceIndex: 2 } },
  { ...asJson(5), purpose: 'near_transfer', learningStage: 'independent_assessment', target: { kind: 'phrase', sourceIndex: 4 } },
  {
    family: 'listen_choose', instruction: base[0]!.instruction, purpose: 'independent_check', learningStage: 'independent_assessment', target: { kind: 'phrase', sourceIndex: 5 },
    modePayload: {
      family: 'listen_choose', referenceAudio: audio(phrase(5).english), slowReferenceAudio: audio(`${phrase(5).english}-slow`),
      localizedMeaningChoices: [phrase(5).english, phrase(0).english, phrase(3).english, phrase(6).english].map((targetText, index) => ({ responseId: `s08-listen-${index}`, targetText, meaningByLocale: null })),
      transcriptRevealPolicy: 'after_first_attempt', choiceFeedback: [true, false, false, false].map((correct, index) => ({ responseId: `s08-listen-${index}`, correct, testedDimension: correct ? 'exact_phrase' : 'semantic_neighbor', feedbackByLocale: L(correct ? `${phrase(5).english} is correct.` : `${[phrase(5).english, phrase(0).english, phrase(3).english, phrase(6).english][index]} is a different phrase; ${phrase(5).english} is required here.`) })),
    },
  },
  {
    family: 'scripted_repeat_compare', instruction: base[1]!.instruction, purpose: 'independent_check', learningStage: 'independent_assessment', target: { kind: 'phrase', sourceIndex: 6 },
    modePayload: { family: 'scripted_repeat_compare', referenceAudio: audio(phrase(6).english), slowReferenceAudio: audio(`${phrase(6).english}-slow`), targetPhrase: phrase(6).english, recordControlPolicy: 'hold_press_release_with_accessible_toggle', modelPlayback: 'reference_and_slow', learnerPlayback: 'available_after_capture', honestOutcomeStates: ['PASS_CONFIDENT', 'NEEDS_WORK_CONFIDENT', 'UNCERTAIN', 'INVALID_AUDIO_OR_SYSTEM'] },
  },
];

export const EPISODE_01_SESSION_08_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'full-b1-exact-i-am-checkpoint-e01-s08-v2',
  sessionKindOverride: 'checkpoint',
  distractorAuthorship: 'manual',
  reviewConstructIds: ['affirmative_self_statement'],
  newVocabularyExceptionReason: 'checkpoint_retrieval_only',
  title: { ru: 'Проверь I am', uk: 'Перевір I am', es: 'Comprueba I am', 'pt-BR': 'Confira I am', vi: 'Kiểm tra I am', id: 'Periksa I am', tr: 'I am kontrolü', pl: 'Sprawdź I am' },
  summary: { ru: 'Вспомни знакомые фразы I am в новом порядке.', uk: 'Згадай знайомі фрази I am у новому порядку.', es: 'Recuerda frases conocidas con I am en otro orden.', 'pt-BR': 'Lembre frases conhecidas com I am em outra ordem.', vi: 'Nhớ lại các câu I am quen thuộc theo thứ tự mới.', id: 'Ingat kembali frasa I am yang dikenal dalam urutan baru.', tr: 'Bilinen I am cümlelerini yeni sırayla hatırla.', pl: 'Przypomnij sobie znane zdania I am w nowej kolejności.' },
  learningGoal: { ru: 'Самостоятельно выбрать знакомую фразу I am.', uk: 'Самостійно обрати знайому фразу I am.', es: 'Elegir de forma autónoma una frase conocida con I am.', 'pt-BR': 'Escolher de forma autônoma uma frase conhecida com I am.', vi: 'Tự chọn một câu I am quen thuộc.', id: 'Memilih sendiri frasa I am yang dikenal.', tr: 'Bilinen bir I am cümlesini bağımsız seçmek.', pl: 'Samodzielnie wybrać znane zdanie I am.' },
  introPages: EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  phrases: checkpointPhrases,
  modeNativePlanId: LESSON1_SESSION_08_MODE_NATIVE_PLAN_ID_V2,
  modeNativePractice: checkpointPractice,
});
