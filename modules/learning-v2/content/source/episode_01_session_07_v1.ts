// Voice rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2,
  EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2,
  EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2,
} from './episode_01_session_04_exact_v2';
import { EPISODE_01_SESSION_07_EXACT_GOAL_V2, EPISODE_01_SESSION_07_EXACT_SUMMARY_V2, EPISODE_01_SESSION_07_EXACT_TITLE_V2, EPISODE_01_SESSION_07_EXACT_WORDS_V2 } from './episode_01_session_07_content_v2';
import { LESSON1_SESSION_07_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[6]!;
const oldStates = ['hungry', 'thirsty', 'sick'] as const;
const wordStates = ['angry', 'scared', 'calm'] as const;
const phraseStates = ['calm', 'nervous', 'excited'] as const;
const replaceStates = (value: string, next: readonly string[]): string => oldStates.reduce((result, oldState, index) => {
  const replacement = next[index]!;
  return result
    .replaceAll(oldState, replacement)
    .replaceAll(`${oldState[0]!.toUpperCase()}${oldState.slice(1)}`, `${replacement[0]!.toUpperCase()}${replacement.slice(1)}`);
}, value);
const replaceLocalizedStates = <T extends Readonly<Record<string, string>>>(value: T, next: readonly string[]): T =>
  Object.fromEntries(Object.entries(value).map(([locale, text]) => [locale, replaceStates(text, next)])) as T;
const feedbackFor = (wrong: string, correct: string) => ({
  ru: `${wrong} называет другое состояние. Здесь нужно ${correct}.`, uk: `${wrong} називає інший стан. Тут потрібне ${correct}.`, es: `${wrong} nombra otro estado. Aquí se necesita ${correct}.`, 'pt-BR': `${wrong} nomeia outro estado. Aqui é preciso ${correct}.`, vi: `${wrong} gọi một trạng thái khác. Ở đây cần ${correct}.`, id: `${wrong} menyebut keadaan lain. Di sini perlu ${correct}.`, tr: `${wrong} başka bir durumu adlandırır. Burada ${correct} gerekir.`, pl: `${wrong} nazywa inny stan. Tutaj potrzebne jest ${correct}.`,
});
const wordGuidance = (target: string, meaning: typeof EPISODE_01_SESSION_07_EXACT_WORDS_V2[number]['meaning']) => ({
  recognize: {
    ru: `Услышьте ${target}: это «${meaning.ru}».`, uk: `Почуйте ${target}: це «${meaning.uk}».`, es: `Escucha ${target}: significa «${meaning.es}».`, 'pt-BR': `Ouça ${target}: significa «${meaning['pt-BR']}».`, vi: `Nghe ${target}: nghĩa là «${meaning.vi}».`, id: `Dengarkan ${target}: artinya «${meaning.id}».`, tr: `${target} sözcüğünü duyun: «${meaning.tr}» demektir.`, pl: `Usłysz ${target}: to znaczy „${meaning.pl}”.`,
  },
  retrieve_meaning: {
    ru: `Выберите ${target} для значения «${meaning.ru}».`, uk: `Оберіть ${target} для значення «${meaning.uk}».`, es: `Elige ${target} para «${meaning.es}».`, 'pt-BR': `Escolha ${target} para «${meaning['pt-BR']}».`, vi: `Chọn ${target} cho nghĩa «${meaning.vi}».`, id: `Pilih ${target} untuk arti «${meaning.id}».`, tr: `«${meaning.tr}» için ${target} sözcüğünü seçin.`, pl: `Wybierz ${target} dla znaczenia „${meaning.pl}”.`,
  },
  build_form: {
    ru: `Выберите целое слово ${target}.`, uk: `Оберіть ціле слово ${target}.`, es: `Elige la palabra completa ${target}.`, 'pt-BR': `Escolha a palavra inteira ${target}.`, vi: `Chọn cả từ ${target}.`, id: `Pilih kata lengkap ${target}.`, tr: `${target} sözcüğünün tamamını seçin.`, pl: `Wybierz całe słowo ${target}.`,
  },
});
const sameAcrossLocales = (text: string) => ({ ru: text, uk: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text });
const voiceVocabulary = EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2.slice(0, 2).map((entry, index) => ({
  ...entry,
  id: EPISODE_01_SESSION_07_EXACT_WORDS_V2[index]!.id,
  target: EPISODE_01_SESSION_07_EXACT_WORDS_V2[index]!.target,
  meaning: EPISODE_01_SESSION_07_EXACT_WORDS_V2[index]!.meaning,
  contacts: Object.fromEntries(Object.entries(entry.contacts).map(([stage, contact]) => [stage, {
    ...contact,
    guidance: wordGuidance(EPISODE_01_SESSION_07_EXACT_WORDS_V2[index]!.target, EPISODE_01_SESSION_07_EXACT_WORDS_V2[index]!.meaning)[stage as 'recognize' | 'retrieve_meaning' | 'build_form'],
    distractors: contact.distractors.map((distractor) => ({
      ...distractor,
      value: replaceStates(distractor.value, wordStates),
      feedback: feedbackFor(replaceStates(distractor.value, wordStates), EPISODE_01_SESSION_07_EXACT_WORDS_V2[index]!.target),
    })),
  }])) as typeof entry.contacts,
}));
const voicePhrases = EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2.slice(0, 4).map((entry) => ({
  ...entry,
  id: entry.id.replace('s06', 's07'),
  english: replaceStates(entry.english, phraseStates),
  russian: replaceStates(entry.russian, phraseStates),
  words: entry.words.map((word, index) => index === 2 ? {
    ...word,
    correct: replaceStates(word.correct, phraseStates),
    distractors: word.distractors.map((distractor) => {
      const value = replaceStates(distractor.value, phraseStates);
      const correct = replaceStates(word.correct, phraseStates);
      return { ...distractor, value, why: `${value} is a different state; the correct word is ${correct}, not ${value}.` };
    }),
  } : word),
}));
const exactStep = (index: number, states: readonly string[]) => JSON.parse(
  replaceStates(JSON.stringify(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[index]!), states),
);
const wordPractice = [
  { ...exactStep(0, ['calm', 'angry', 'scared']), target: { kind: 'vocabulary', sourceIndex: 0 } },
  { ...exactStep(1, ['calm', 'angry', 'scared']), target: { kind: 'vocabulary', sourceIndex: 1 } },
];
const phrasePractice = [
  { ...exactStep(2, ['excited', 'nervous', 'calm']), target: { kind: 'phrase', sourceIndex: 2 } },
  { ...exactStep(3, phraseStates), target: { kind: 'phrase', sourceIndex: 3 } },
  { ...exactStep(4, phraseStates), target: { kind: 'vocabulary_grid', sourceIndices: [0, 1] } },
  {
    ...JSON.parse(replaceStates(JSON.stringify(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2[5]!), phraseStates).replaceAll('ready', 'nervous')),
    target: { kind: 'phrase', sourceIndex: 1 },
    purpose: 'independent_check',
    learningStage: 'speak_independently',
  },
];
const voicePractice = [...wordPractice, ...phrasePractice];

export const EPISODE_01_SESSION_07_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'full-b1-exact-i-am-voice-emotions-e01-s07-v2',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  reviewConstructIds: ['affirmative_self_statement'],
  title: EPISODE_01_SESSION_07_EXACT_TITLE_V2,
  summary: EPISODE_01_SESSION_07_EXACT_SUMMARY_V2,
  learningGoal: EPISODE_01_SESSION_07_EXACT_GOAL_V2,
  introPages: EPISODE_01_SESSION_04_EXACT_INTRO_V2.map((page, index) => {
    const exact = JSON.parse(replaceStates(JSON.stringify(page), wordStates));
    const distinctCorrect = ['calm', 'I am scared', 'I am calm'][index]!;
    const explanation = index === 0 ? {
      ru: 'Calm правильно, потому что это уже знакомое состояние после I am.', uk: 'Calm правильно, бо це вже знайомий стан після I am.', es: 'Calm es correcto porque es un estado conocido después de I am.', 'pt-BR': 'Calm está correto porque é um estado conhecido depois de I am.', vi: 'Calm đúng vì đây là trạng thái đã biết sau I am.', id: 'Calm benar karena ini keadaan yang sudah dikenal setelah I am.', tr: 'Calm doğrudur, çünkü I am sonrasında bilinen bir durumdur.', pl: 'Calm jest poprawne, ponieważ to znany stan po I am.',
    } : exact.question.explanation;
    return { ...exact, question: { ...exact.question, choices: [sameAcrossLocales(distinctCorrect), exact.question.choices[1], exact.question.choices[2]], explanation } };
  }),
  newVocabulary: voiceVocabulary,
  phrases: voicePhrases,
  modeNativePlanId: LESSON1_SESSION_07_MODE_NATIVE_PLAN_ID_V2,
  modeNativePractice: voicePractice,
});
