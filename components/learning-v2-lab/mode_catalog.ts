// зачем: владелец попросил раздел, где видно и можно потрогать КАЖДЫЙ режим Learning V2.
// Каталог — единственный источник правды лаборатории: все 17 семей из контракта
// V2_ACTIVITY_FAMILIES, русские самодостаточные названия (без подписей-расшифровок),
// группа для тона и примитив взаимодействия для плеера. Полнота закреплена тестом.
import type Ionicons from '@expo/vector-icons/Ionicons';
import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from '../../modules/learning-v2/contracts/activity';

export type LabInteraction = 'choice' | 'assemble' | 'speak' | 'listen';

export type LabGroupId = 'understand' | 'sound' | 'build' | 'transfer';

export interface LabGroup {
  readonly id: LabGroupId;
  readonly title: string;
}

export interface LabModeEntry {
  readonly family: V2ActivityFamily;
  readonly title: string;
  readonly group: LabGroupId;
  readonly interaction: LabInteraction;
  readonly icon: keyof typeof Ionicons.glyphMap;
  // зачем: describe_scene снят владельцем с направления — показываем честно, но не даём запускать.
  readonly removedByOwner?: true;
}

export const LAB_GROUPS: readonly LabGroup[] = Object.freeze([
  { id: 'understand', title: 'Понимание' },
  { id: 'sound', title: 'Звук и произношение' },
  { id: 'build', title: 'Сборка и грамматика' },
  { id: 'transfer', title: 'Речь и перенос' },
]);

export const LAB_MODE_CATALOG: readonly LabModeEntry[] = Object.freeze([
  { family: 'visual_discovery', title: 'Визуальное открытие', group: 'understand', interaction: 'choice', icon: 'eye-outline' },
  { family: 'listen_choose', title: 'Слушай и выбирай', group: 'understand', interaction: 'listen', icon: 'ear-outline' },
  { family: 'microstory_radio', title: 'Микроистория', group: 'understand', interaction: 'listen', icon: 'radio-outline' },
  { family: 'branching_scene', title: 'Сцена с выбором', group: 'understand', interaction: 'choice', icon: 'git-branch-outline' },
  { family: 'sound_contrast', title: 'Контраст звуков', group: 'sound', interaction: 'listen', icon: 'pulse-outline' },
  { family: 'sound_syllable_lab', title: 'Лаборатория слогов', group: 'sound', interaction: 'listen', icon: 'analytics-outline' },
  { family: 'scripted_repeat_compare', title: 'Повтори и сравни', group: 'sound', interaction: 'speak', icon: 'repeat-outline' },
  { family: 'shadowing_prosody', title: 'Шэдоуинг', group: 'sound', interaction: 'speak', icon: 'mic-outline' },
  { family: 'phrase_builder', title: 'Собери фразу', group: 'build', interaction: 'assemble', icon: 'construct-outline' },
  { family: 'listen_build_dictation', title: 'Диктант на сборку', group: 'build', interaction: 'assemble', icon: 'headset-outline' },
  { family: 'context_gap_grammar', title: 'Пропуск в контексте', group: 'build', interaction: 'choice', icon: 'extension-puzzle-outline' },
  { family: 'speed_match', title: 'Скоростное совпадение', group: 'build', interaction: 'choice', icon: 'flash-outline' },
  { family: 'quick_spoken_response', title: 'Быстрый ответ вслух', group: 'transfer', interaction: 'speak', icon: 'chatbubble-ellipses-outline' },
  { family: 'scripted_dialogue', title: 'Диалог по сценарию', group: 'transfer', interaction: 'speak', icon: 'people-outline' },
  { family: 'personalized_review', title: 'Личное повторение', group: 'transfer', interaction: 'choice', icon: 'refresh-circle-outline' },
  { family: 'describe_scene', title: 'Опиши сцену', group: 'transfer', interaction: 'speak', icon: 'image-outline', removedByOwner: true },
]);

export function labCatalogCoversAllFamilies(): boolean {
  const catalogued = new Set(LAB_MODE_CATALOG.map((entry) => entry.family));
  return V2_ACTIVITY_FAMILIES.every((family) => catalogued.has(family))
    && catalogued.size === V2_ACTIVITY_FAMILIES.length;
}
