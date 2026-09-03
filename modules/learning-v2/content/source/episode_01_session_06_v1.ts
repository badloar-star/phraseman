// Word-first rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import { EPISODE_01_SESSION_04_EXACT_INTRO_V2, EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2, EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2, EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2 } from './episode_01_session_04_exact_v2';
import { EPISODE_01_SESSION_06_EXACT_GOAL_V2, EPISODE_01_SESSION_06_EXACT_SUMMARY_V2, EPISODE_01_SESSION_06_EXACT_TITLE_V2, EPISODE_01_SESSION_06_EXACT_WORDS_V2 } from './episode_01_session_06_content_v2';
import { LESSON1_SESSION_05_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[5]!;
const oldStates = ['hungry', 'thirsty', 'sick'] as const;
const newStates = ['calm', 'nervous', 'excited'] as const;
const replaceState = (value: string): string => oldStates.reduce((result, oldState, index) => result.replaceAll(oldState, newStates[index]!), value);
const optionFeedback = (wrong: string, correct: string) => ({ ru: `${wrong} называет другое состояние и не передаёт нужный смысл. Здесь правильное слово ${correct}, потому что оно точно называет это состояние.`, uk: `${wrong} називає інший стан і не передає потрібного значення. Тут правильне слово ${correct}, бо воно точно називає цей стан.`, es: `${wrong} nombra otro estado y no expresa el significado necesario. Aquí la palabra correcta es ${correct}, porque nombra exactamente este estado.`, 'pt-BR': `${wrong} nomeia outro estado e não expressa o significado necessário. Aqui a palavra correta é ${correct}, porque ela nomeia exatamente esse estado.`, vi: `${wrong} gọi một trạng thái khác và không diễn đạt nghĩa cần thiết. Từ đúng ở đây là ${correct}, vì nó gọi đúng trạng thái này.`, id: `${wrong} menyebut keadaan lain dan tidak menyampaikan makna yang diperlukan. Kata yang benar di sini adalah ${correct}, karena kata itu tepat menyebut keadaan ini.`, tr: `${wrong} başka bir durumu adlandırır ve gereken anlamı vermez. Burada doğru sözcük ${correct} olur, çünkü bu durumu tam olarak o adlandırır.`, pl: `${wrong} nazywa inny stan i nie przekazuje potrzebnego znaczenia. Poprawne słowo to ${correct}, ponieważ dokładnie nazywa ten stan.` });
const vocabulary = EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2.map((entry, index) => ({ ...entry, id: EPISODE_01_SESSION_06_EXACT_WORDS_V2[index]!.id, target: EPISODE_01_SESSION_06_EXACT_WORDS_V2[index]!.target, meaning: EPISODE_01_SESSION_06_EXACT_WORDS_V2[index]!.meaning, contacts: Object.fromEntries(Object.entries(entry.contacts).map(([stage, contact]) => [stage, { ...contact, distractors: contact.distractors.map((distractor) => ({ ...distractor, feedback: optionFeedback(distractor.value, EPISODE_01_SESSION_06_EXACT_WORDS_V2[index]!.target) })) }])) as typeof entry.contacts }));
const phrases = EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2.map((entry) => { const stateIndex = oldStates.indexOf(entry.english.split(' ').at(-1)! as typeof oldStates[number]); if (stateIndex < 0) return entry; const next = newStates[stateIndex]!; return { ...entry, id: entry.id.replace('s04', 's06').replace(oldStates[stateIndex]!, next), english: replaceState(entry.english), russian: EPISODE_01_SESSION_06_EXACT_WORDS_V2[stateIndex]!.meaning.ru, words: entry.words.map((word, wordIndex) => wordIndex === 2 ? { ...word, correct: next, distractors: word.distractors.map((distractor) => ({ ...distractor, why: `${distractor.value} is a different state; the exact word here is ${next}, not ${distractor.value}.` })) } : word) }; });
const practice = JSON.parse(replaceState(JSON.stringify(EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2))) as typeof EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2;

export const EPISODE_01_SESSION_06_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'full-b1-exact-i-am-feelings-e01-s06-v2',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  reviewConstructIds: ['affirmative_self_statement'],
  title: EPISODE_01_SESSION_06_EXACT_TITLE_V2,
  summary: EPISODE_01_SESSION_06_EXACT_SUMMARY_V2,
  learningGoal: EPISODE_01_SESSION_06_EXACT_GOAL_V2,
  introPages: EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  newVocabulary: vocabulary,
  phrases,
  modeNativePlanId: LESSON1_SESSION_05_MODE_NATIVE_PLAN_ID_V2,
  modeNativePractice: practice,
});
