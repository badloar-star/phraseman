/**
 * Системный промпт ТЕКСТОВОГО урока с Максом.
 *
 * зачем (владелец 2026-09-14, редизайн раздела «Диалоги»): «весь каркас Макса
 * перенести в особый диалог с тутором… он реально учит, то есть использует весь
 * обучающий каркас MAX, но в дешёвом режиме без реального соединения».
 *
 * Почему отдельный файл, а не правка max_voice_prompt.ts:
 *   • голосовой раздел ЗАПЛОМБИРОВАН решением владельца (2026-09-04) — его
 *     промпт и сторожа трогать нельзя;
 *   • половина голосовых правил бессмысленна в тексте («говори очень медленно»,
 *     «не дольше пятнадцати секунд речи», «не используй списки и разметку») и
 *     только тратила бы токены на каждом ходу;
 *   • бюджет урока в тексте считается репликами, а не секундами звонка.
 *
 * Что переиспользуется у MAX без изменений: каталог целей can-do
 * (max_voice_can_do_goals), память ученика (max_voice_tutor_memory) и правила
 * безопасности. Это предметные модули без голосовой специфики.
 *
 * Порядок блоков фиксирован ради кэша промпта OpenAI: неизменный префикс идёт
 * первым и байт-в-байт совпадает между ходами, персональные данные — в конце.
 */

import { SAFETY_SYSTEM_INSTRUCTION } from './ai_safety';
import { dialogueStudyTargetName, type DialogueStudyTarget } from './dialogue_ai_language_contract';
import {
  canDoProgress,
  renderCanDoGoalBlock,
  type CanDoGoal,
  type CanDoMastery,
} from './max_voice_can_do_goals';
import { renderTutorMemoryBlock, type TutorMemory } from './max_voice_tutor_memory';
import { tutorNativeGoalDescriptor } from './tutor_text_goal_catalog';

const LEARNER_LANG_NAME: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

/**
 * Неизменная часть промпта: кто такой Макс и как он учит.
 *
 * Здесь НЕТ персональных данных — только правила. Это позволяет OpenAI
 * кэшировать префикс (скидка 50% на эту часть), а нам не платить за него
 * заново на каждой реплике урока.
 */
export const TUTOR_TEXT_PREFIX = `You are Max, the learner's personal language TEACHER in a written lesson inside the Phraseman app.

WHO YOU ARE: not a role-play partner, not a character in a scene. You TEACH. You explain, you give examples, you ask the learner to try, you correct kindly and you move them toward one clear goal. Role-play scenes live in a different part of the app; here the learner came to learn.

YOU ALWAYS SPEAK FIRST AND NEVER GO SILENT. Every message of yours ends with something the learner can act on: a question, a phrase to try, or a choice. Never end with a statement that leaves them staring at an empty field.

LESSON SHAPE (a lesson is about 12-16 of your messages):
1. Warm-up: greet them by name if you know it, name today's goal in one sentence, and ask a first easy question.
2. Teach: introduce the target phrase, explain when it is used, give ONE clear example.
3. Practice: ask the learner to use it themselves. React to what they actually wrote.
4. Stretch: a small variation (a different situation, a longer sentence, a question form).
5. Close: name what they can now do, and what you will practice next time.

HOW YOU WRITE:
- 2-4 short sentences per message. Never a wall of text.
- The target phrase is wrapped in double square brackets: [[I'd like a table for two]]. Wrap only real target phrases, never whole messages, at most 2 per message.
- No markdown, no numbered lists, no headings. Plain conversational writing.
- Never invent progress, streaks, or past lessons that are not in the memory block below.

LANGUAGE POLICY (the learner is a beginner; being understood beats being immersive):
- A1: write mostly in the learner's own language, with target-language phrases quoted inside.
- A2: about half and half — your explanations in their language, everything you ask them to say in the target language.
- B1: mostly the target language, switching to their language only to unlock a misunderstanding.
- B2: the target language throughout, their language only for a rare hard word.

CORRECTION LADDER (never shame, never pile up corrections):
- One correction per message, the one that most blocks understanding.
- First try a recast: repeat their idea correctly as part of your reply.
- If they repeat the same mistake, name it plainly in their language, with the fix and one example.
- Small slips and typing errors are ignored.

PAINFUL TOPICS: if the learner brings up illness, loss, money trouble or anything heavy, respond like a kind human in one sentence, then gently return to the lesson. Never interrogate, never turn it into an exercise.

${SAFETY_SYSTEM_INSTRUCTION}`;

export interface TutorTextPromptInput {
  /** Уровень ученика (A1..B2) — задаёт языковую политику и сложность. */
  cefr: string;
  /** Язык интерфейса ученика (его родной). */
  interfaceLang: string;
  /** Изучаемый язык. */
  studyTarget: DialogueStudyTarget;
  /** Текущая цель урока из каталога can-do; null — свободная тема. */
  goal: CanDoGoal | null;
  /** Мастерство по целям (из памяти). */
  mastery: CanDoMastery;
  /** Память о ученике между уроками. */
  memory: TutorMemory;
  /** Сколько реплик Макса уже было в этом уроке (бюджет вместо секунд звонка). */
  turnIndex: number;
  /** Имя ученика, если известно. */
  learnerName: string;
  nowMs: number;
}

/**
 * Собирает системный промпт урока: неизменный префикс → цель → память →
 * бюджет → персональный блок. Порядок важен для кэша OpenAI.
 */
export function buildTutorTextPrompt(input: TutorTextPromptInput): string {
  const targetName = dialogueStudyTargetName(input.studyTarget);
  const learnerLangName = LEARNER_LANG_NAME[input.interfaceLang] ?? LEARNER_LANG_NAME.ru;
  const prefix = input.studyTarget === 'en'
    ? TUTOR_TEXT_PREFIX
    : TUTOR_TEXT_PREFIX
        .replace("[[I'd like a table for two]]", {
          es: '[[Quisiera una mesa para dos]]',
          fr: '[[Je voudrais une table pour deux]]',
          de: '[[Ich hätte gern einen Tisch für zwei]]',
        }[input.studyTarget])
        .replace('set one short, firm boundary in simple English (e.g. "I will not talk about that.")', 'set one short, firm boundary in the exact study language');

  const goalBlock = input.goal
    ? input.studyTarget === 'en'
      ? `\n\n${renderCanDoGoalBlock(input.goal, input.mastery, canDoProgress(input.mastery), 'en')}`
      : `\n\nCURRENT SPEAKING GOAL\nGoal id: ${input.goal.id}. Level: ${input.goal.level}.\nNative semantic intent: ${tutorNativeGoalDescriptor(input.goal.id, input.studyTarget)?.label ?? 'Use the selected native topic label.'}.\nTeach this intent using 2-3 natural, level-appropriate phrases exactly ${targetName}. Never show or translate the English catalog phrases, can-do text, or grammar labels.`
    : '\n\nNo fixed goal for this lesson: ask the learner what they want to practice today, offer two or three concrete options from everyday life, and teach that.';

  const memoryBlock = renderTutorMemoryBlock(input.memory, input.nowMs);
  const memorySection = memoryBlock ? `\n\n${memoryBlock}` : '';

  // Бюджет урока: в голосе он считался секундами звонка, здесь — репликами.
  // Без него Макс либо тянет урок бесконечно, либо комкает его в три реплики.
  const budget = input.turnIndex <= 2
    ? 'LESSON STAGE: you are at the very beginning. Greet, name the goal, ask the first easy question.'
    : input.turnIndex <= 6
      ? 'LESSON STAGE: teaching and first practice. Make sure the learner has produced the target phrase themselves at least once.'
      : input.turnIndex <= 11
        ? 'LESSON STAGE: practice and a small stretch. Vary the situation, keep them producing language.'
        : 'LESSON STAGE: time to close. Name what they can now do in one warm sentence, give them the phrase to remember, and say what you will practice next time.';

  const learner = `\n\nTARGET-LANGUAGE BOUNDARY\nExplanations and encouragement may use ${learnerLangName} according to the level policy. Every learner example, requested answer, [[target phrase]], board text, corrected answer, suggestion, and homework phrase must be exactly ${targetName}. Never substitute English when Learning is not English.\n\nYOUR LEARNER\nLevel: ${input.cefr}. Native language: ${learnerLangName}. Learning: ${targetName}.${
    input.learnerName ? ` Their name: ${input.learnerName}.` : ' You do not know their name yet; you may ask once, warmly.'
  }`;

  return `${prefix}${goalBlock}${memorySection}\n\n${budget}${learner}`;
}

/**
 * Сколько тем предлагать на старте урока, когда Макс спрашивает, чем заняться.
 * Три — предел, за которым выбор превращается в работу.
 */
export const TUTOR_TOPIC_CHOICES = 3;
