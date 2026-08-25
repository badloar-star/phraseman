/**
 * DEV-only демо-данные для полноэкранной витрины 7 одобренных режимов.
 * Источник — docs/v2/mockups/index.html, раздел "Режимы".
 *
 * зачем: владелец потребовал ОТДЕЛЬНЫЙ подраздел DEV Hub (не встроенный
 * списком внутрь «Движение · все поверхности»), где каждый режим открывается
 * ПОЛНОЭКРАННЫМ работающим экраном — той же геометрии, что боевой урок
 * (app/learning_v2_direct_session_player_v1.tsx), а не мелкой карточкой в
 * скролле. Этот модуль — только данные (никакого JSX/React Native здесь),
 * чтобы список-меню и полноэкранный runner читали ОДИН источник фикстур и не
 * расходились.
 */

import type { LearningV2ActivityFamilyCode } from "../telemetry";
import type { LearningV2ModeOptionV1 } from "./mode_contract_v1";

export type LearningV2ModeShowcaseInputModeV1 = "single_choice" | "ordered_tokens";

/** Семьи, у которых уже есть полноэкранный демо-runner. scripted_repeat_compare
 * не входит — рендерится отдельным маршрутом (см. runner), т.к. пропсы шире
 * общего контракта (voiceStatus/transcript/instruction). */
export const LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1 = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
] as const satisfies readonly LearningV2ActivityFamilyCode[];

export type LearningV2ModeShowcaseTextFamilyV1 =
  (typeof LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1)[number];

export interface LearningV2ModeShowcaseFixtureV1 {
  readonly family: LearningV2ActivityFamilyCode;
  readonly title: string;
  readonly mockupSource: string;
  readonly prompt: string;
  readonly options: readonly LearningV2ModeOptionV1[];
  readonly correctResponseId: string;
  readonly inputMode: LearningV2ModeShowcaseInputModeV1;
  readonly explanation: string;
}

/** Демо-фразы намеренно повторяют реальные фразы из episode_01 (урок 1,
 * "to be") — сверка с макетом должна идти на знакомом материале, не на
 * придуманной лексике, которой в курсе не будет. */
export const LEARNING_V2_MODE_SHOWCASE_FIXTURES_V1: Readonly<
  Record<LearningV2ModeShowcaseTextFamilyV1, LearningV2ModeShowcaseFixtureV1>
> = Object.freeze({
  phrase_builder: {
    family: "phrase_builder",
    title: "Сборка фразы (эталон)",
    mockupSource: "docs/v2/mockups/02-phrase-builder.html",
    prompt: "Приятно познакомиться",
    options: [
      { responseId: "nice", text: "Nice" },
      { responseId: "to", text: "to" },
      { responseId: "meet", text: "meet" },
      { responseId: "you", text: "you" },
      { responseId: "meets", text: "meets" },
      { responseId: "meeting", text: "meeting" },
    ],
    correctResponseId: "nice to meet you",
    inputMode: "ordered_tokens",
    explanation: "meets — форма для he/she/it, а не для you. Nice to meet you.",
  },
  listen_choose: {
    family: "listen_choose",
    title: "Выбор на слух",
    mockupSource: "docs/v2/mockups/03-listen-choose.html",
    prompt: "Прослушай фразу",
    options: [
      { responseId: "nice-to-meet-you", text: "Nice to meet you" },
      { responseId: "my-name-is-anna", text: "My name is Anna" },
      { responseId: "see-you-later", text: "See you later" },
    ],
    correctResponseId: "nice-to-meet-you",
    inputMode: "single_choice",
    explanation: "Прозвучало приветствие при знакомстве — Nice to meet you.",
  },
  sound_contrast: {
    family: "sound_contrast",
    title: "Пары звуков",
    mockupSource: "docs/v2/mockups/04-sound-contrast.html",
    prompt: "Различи короткий /ɪ/ и длинный /iː/",
    options: [
      { responseId: "ship", text: "ship  /ʃɪp/" },
      { responseId: "sheep", text: "sheep  /ʃiːp/" },
    ],
    correctResponseId: "sheep",
    inputMode: "single_choice",
    explanation: "ship — короткий /ɪ/, sheep — длинный /iː/. Прозвучал именно sheep.",
  },
  listen_build_dictation: {
    family: "listen_build_dictation",
    title: "Диктант",
    mockupSource: "docs/v2/mockups/05-listen-build.html",
    prompt: "Послушай и собери фразу",
    options: [
      { responseId: "my", text: "My" },
      { responseId: "name", text: "name" },
      { responseId: "is", text: "is" },
      { responseId: "anna", text: "Anna" },
      { responseId: "names", text: "names" },
      { responseId: "am", text: "am" },
    ],
    correctResponseId: "my name is anna",
    inputMode: "ordered_tokens",
    explanation: "names — множественное число, здесь нужна форма is: My name is Anna.",
  },
  context_gap_grammar: {
    family: "context_gap_grammar",
    title: "Контекстный пропуск",
    mockupSource: "docs/v2/mockups/06-context-gap.html",
    prompt: "Ты устал? ___ you tired?",
    options: [
      { responseId: "is", text: "Is" },
      { responseId: "are", text: "Are" },
      { responseId: "do", text: "Do" },
    ],
    correctResponseId: "are",
    inputMode: "single_choice",
    explanation: "you всегда идёт со связкой are, не is и не do.",
  },
  speed_match: {
    family: "speed_match",
    title: "Пары на скорость",
    mockupSource: "docs/v2/mockups/07-speed-match.html",
    prompt: "Выбери грамматически верный вариант",
    options: [
      { responseId: "are-you-tired", text: "Are you tired?" },
      { responseId: "is-you-tired", text: "Is you tired?" },
      { responseId: "do-you-tired", text: "Do you tired?" },
    ],
    correctResponseId: "are-you-tired",
    inputMode: "single_choice",
    explanation: "you требует are, а не is или do.",
  },
});

/** Голосовой режим — отдельная фикстура (пропсы шире общего контракта). */
export const LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1 = Object.freeze({
  family: "scripted_repeat_compare" as const,
  title: "Повтор за моделью (голос)",
  mockupSource: "docs/v2/mockups/14-repeat-compare.html",
  prompt: "Скажи вслух: Nice to meet you",
  instruction: "Сначала послушай, потом повтори",
});

export function isLearningV2ModeShowcaseTextFamilyV1(
  family: string,
): family is LearningV2ModeShowcaseTextFamilyV1 {
  return (LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1 as readonly string[]).includes(family);
}
