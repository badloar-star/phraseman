/**
 * Тонкий роутер: family → компонент режима. Заменяет прежний единый рендер
 * "MODE_ICONS + одна карточка" в app/learning_v2_direct_session_player_v1.tsx.
 *
 * зачем: владелец одобрил 7 конкретных макетов (docs/v2/mockups/index.html,
 * раздел "Режимы") с собственной вёрсткой и анимациями вместо одной
 * универсальной карточки, где тип режима влиял только на иконку. Технический
 * аудит (Advisor, Opus) настоял на архитектуре "7 отдельных файлов-компонентов
 * + тонкий роутер" вместо switch внутри одного компонента и вместо более
 * широкой спецификации из docs/v2/04-activity-catalog-and-storyboards.md
 * (17 семейств, владелец одобрил только эти 7).
 *
 * ВАЖНО: имена family ("listen_choose", "sound_contrast" и т.д.) — контракт
 * телеметрии (modules/learning-v2/telemetry.ts, LearningV2ActivityFamilyCode)
 * и контента (SESSION_KIND_FAMILIES в
 * modules/learning-v2/content/source/episode_01_session_map_v1.ts).
 * Переименовывать их нельзя — здесь только маппинг family → русская подпись
 * макета для читаемости кода, сами строковые значения не меняются.
 */

import React from "react";

import type { LearningV2ActivityFamilyCode } from "../telemetry";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import PhraseBuilderModeV1 from "./phrase_builder_mode_v1";
import ListenChooseModeV1 from "./listen_choose_mode_v1";
import SoundContrastModeV1 from "./sound_contrast_mode_v1";
import ListenBuildDictationModeV1 from "./listen_build_dictation_mode_v1";
import ContextGapGrammarModeV1 from "./context_gap_grammar_mode_v1";
import SpeedMatchModeV1 from "./speed_match_mode_v1";
// зачем: scripted_repeat_compare НЕ идёт через этот универсальный роутер —
// ему нужны voiceStatus/transcript/instruction поверх общего контракта
// (голосовой hold-to-talk жест живёт в player'е и не унифицируется с
// остальными 6 режимами). Player рендерит его отдельной явной веткой рядом
// с вызовом LearningV2ModeRouterV1 — см. scripted_repeat_compare_mode_v1.tsx.

/** Русская подпись макета-источника для каждой family — только для
 * дев-инструментов/логов, не для UI ученика (UI-копирайт живёт в
 * learning_v2_session_copy.ts и не трогается этим роутером). */
export const MODE_MOCKUP_LABEL_BY_FAMILY_V1: Readonly<
  Record<LearningV2ActivityFamilyCode, string>
> = Object.freeze({
  phrase_builder: "Сборка фразы (эталон)",
  listen_choose: "Выбор на слух",
  sound_contrast: "Пары звуков",
  listen_build_dictation: "Диктант",
  context_gap_grammar: "Контекстный пропуск",
  speed_match: "Пары на скорость",
  scripted_repeat_compare: "Повтор за моделью (голос, WIP)",
  // зачем: intro_check — код телеметрии интро-экранов (LearningV2SessionIntro),
  // НЕ одна из 7 практик. Он никогда не попадает в этот роутер (интро рендерится
  // отдельным компонентом до practice-стадии), но LearningV2ActivityFamilyCode
  // — общий тип на оба употребления, поэтому маппинг обязан быть исчерпывающим.
  intro_check: "Интро-проверка (не режим практики)",
});

/** Семьи, у которых уже есть собственный компонент режима. Остальные идут
 * через default branch роутера (см. LearningV2DirectSessionPlayerV1),
 * который рендерит прежнее поведение — недостроенный режим никогда не даёт
 * сломанный экран. */
export const MODE_ROUTER_IMPLEMENTED_FAMILIES_V1: readonly LearningV2ActivityFamilyCode[] =
  Object.freeze([
    "phrase_builder",
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
    // scripted_repeat_compare: НЕ здесь — рендерится player'ом напрямую
    // (см. комментарий у импортов выше), isLearningV2ModeRoutedV1 остаётся
    // false для него, поэтому default branch player'а НЕ используется —
    // player сам решает между роутером/voice-веткой/default по family.
  ]);

const MODE_COMPONENT_BY_FAMILY_V1: Partial<
  Record<
    LearningV2ActivityFamilyCode,
    React.ComponentType<LearningV2ModeCommonPropsV1>
  >
> = {
  phrase_builder: PhraseBuilderModeV1,
  listen_choose: ListenChooseModeV1,
  sound_contrast: SoundContrastModeV1,
  listen_build_dictation: ListenBuildDictationModeV1,
  context_gap_grammar: ContextGapGrammarModeV1,
  speed_match: SpeedMatchModeV1,
};

/** true когда family уже имеет собственный одобренный режим (не default
 * branch/старую карточку). Используется player'ом, чтобы решить — рендерить
 * ModeRouter или прежний универсальный блок. */
export function isLearningV2ModeRoutedV1(
  family: LearningV2ActivityFamilyCode,
): boolean {
  return MODE_COMPONENT_BY_FAMILY_V1[family] !== undefined;
}

/**
 * Роутер. Рендерит компонент режима под family. Возвращает null для family
 * без собственного компонента (scripted_repeat_compare — рендерится
 * player'ом отдельно; intro_check — сюда не попадает вовсе) — вызывающий
 * код (player) обязан проверить isLearningV2ModeRoutedV1 ДО рендера и в
 * этом случае показать прежнюю универсальную карточку, а не пустой экран.
 */
export function LearningV2ModeRouterV1(
  props: LearningV2ModeCommonPropsV1,
): React.ReactElement | null {
  const Component = MODE_COMPONENT_BY_FAMILY_V1[props.family];
  if (!Component) return null;
  return <Component {...props} />;
}

export default LearningV2ModeRouterV1;
