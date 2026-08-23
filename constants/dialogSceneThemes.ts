/**
 * Палитры «кинематографичных сцен» раздела Диалогов.
 *
 * зачем: владелец заказал фулл-редизайн Диалогов — каждый сценарий подаётся как
 * «место» со своей световой атмосферой (кафе — тёплый янтарь, аэропорт — лазурь,
 * люди — розовый вечер, жёсткие «Ситуации» — неоновый виолет). Цвета сцены
 * НИКОГДА не используются заливкой в полную силу — только альфа-слоями поверх
 * токенов темы (как `accent + '18'`), поэтому одинаково живут и на тёмных
 * кино-темах, и на светлой sagePorcelain: тёмные получают глубокий тинт,
 * светлая — пастельный. Текст и поверхности остаются токенами темы.
 *
 * Чистый модуль без RN-импортов — безопасен для jest и серверных скриптов.
 */

import type { DialogScenarioCategory } from '../app/ai_dialog_scenarios';

export interface DialogSceneTheme {
  /** Основной свет сцены (иконки, свечение, чипы). */
  hue: string;
  /** Глубокий край градиента сцены (нижний/дальний тон). */
  hueDeep: string;
}

const SCENE_BY_CATEGORY: Record<DialogScenarioCategory, DialogSceneTheme> = {
  // «Каждый день»: лампы кафе, утренний свет — тёплый янтарь.
  everyday: { hue: '#D9A44A', hueDeep: '#8A5E1E' },
  // «Путешествия»: небо, море, табло аэропорта — лазурь.
  travel: { hue: '#4FB6D9', hueDeep: '#1E5E7A' },
  // «Общение»: вечер, люди, тёплый неон — розовый.
  social: { hue: '#D97087', hueDeep: '#7A2E42' },
};

/** «Ситуации» (challenge-сцены): драматичный неон-виолет — отдельный мир. */
const SCENE_CHALLENGE: DialogSceneTheme = { hue: '#9B7FD9', hueDeep: '#452E7A' };

/**
 * Сцена для сценария: challenge-коллекция всегда виолет, остальные — по
 * категории. Принимает узкий срез полей, чтобы не тянуть весь тип сценария.
 */
export function sceneThemeFor(scenario: {
  category: DialogScenarioCategory;
  collection?: 'course' | 'challenge';
}): DialogSceneTheme {
  if (scenario.collection === 'challenge') return SCENE_CHALLENGE;
  return SCENE_BY_CATEGORY[scenario.category] ?? SCENE_BY_CATEGORY.everyday;
}

/** Сцена группы курса (шапки полок списка). */
export function sceneThemeForCategory(category: DialogScenarioCategory): DialogSceneTheme {
  return SCENE_BY_CATEGORY[category] ?? SCENE_BY_CATEGORY.everyday;
}

/** Сцена мира «Ситуации» — для заголовка секции и hero-карточки. */
export const CHALLENGE_SCENE_THEME: DialogSceneTheme = SCENE_CHALLENGE;
