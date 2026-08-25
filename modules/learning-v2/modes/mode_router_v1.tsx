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
});

/** Семьи, у которых уже есть собственный компонент режима. Остальные идут
 * через default branch роутера (см. LearningV2DirectSessionPlayerV1),
 * который рендерит прежнее поведение — недостроенный режим никогда не даёт
 * сломанный экран. */
export const MODE_ROUTER_IMPLEMENTED_FAMILIES_V1: readonly LearningV2ActivityFamilyCode[] =
  Object.freeze(["phrase_builder", "listen_choose"]);

const MODE_COMPONENT_BY_FAMILY_V1: Partial<
  Record<
    LearningV2ActivityFamilyCode,
    React.ComponentType<LearningV2ModeCommonPropsV1>
  >
> = {
  phrase_builder: PhraseBuilderModeV1,
  listen_choose: ListenChooseModeV1,
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
 * Роутер. Рендерит компонент режима под family. Если режим ещё не
 * реализован (этап 2), возвращает null — вызывающий код (player) обязан
 * проверить isLearningV2ModeRoutedV1 ДО рендера и в этом случае показать
 * прежнюю универсальную карточку, а не пустой экран.
 */
export function LearningV2ModeRouterV1(
  props: LearningV2ModeCommonPropsV1,
): React.ReactElement | null {
  const Component = MODE_COMPONENT_BY_FAMILY_V1[props.family];
  if (!Component) return null;
  return <Component {...props} />;
}

export default LearningV2ModeRouterV1;
