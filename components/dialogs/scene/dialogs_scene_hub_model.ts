// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_hub_model.ts — что хаб «Диалоги» знает для «Сцены»: сколько пройдено, какой диалог следующий, кто собеседник и сколько целей.
//
// зачем (координатор 22.10: «подними следующий диалог и счётчики без второго чтения каталога: один источник, общий кэш»): чистая сборка из тех же строк,
// что уже показывает каталог (projectAuthorizedDialogueV2Catalogue → items со статусом available/done/locked) и снимка текстов интерфейса
// (dialogueV2UiCopy: перечень целей и собеседники). Ни сети, ни хранилища; каталог читает только контейнер хаба и кэш клиента каталога.
// Собеседник и цели — подробности внутри карточки диалога («выбирается ДИАЛОГ, а не собеседник»), на сцене они только в строке «с Милой».
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { dialogsSceneWhoName, type DialogsSceneDialogInfo } from './dialogs_scene_copy';

export type DialogsSceneHubItem = Readonly<{
  id: string;
  worldId: string;
  title: string;
  status: 'available' | 'done' | 'locked';
}>;

/** Часть снимка текстов интерфейса, которая нужна сцене. */
export type DialogsSceneHubUiCopy = Readonly<{
  objectiveLabels: Readonly<Record<string, string>>;
  personas: Readonly<Record<string, Readonly<{ displayName: string }>>>;
}>;

export type DialogsSceneHubModel = Readonly<{
  doneCount: number;
  totalCount: number;
  /** Следующий доступный диалог в порядке каталога; null — доступных нет. */
  next: Readonly<{ id: string; personaId: string | null; info: DialogsSceneDialogInfo }> | null;
}>;

const WORLD_ICON: Readonly<Record<string, DialogsSceneDialogInfo['worldIcon']>> = Object.freeze({
  social: 'people-outline', work: 'briefcase-outline', travel: 'airplane-outline', everyday: 'cafe-outline',
});

export function dialogsSceneWorldIcon(worldId: string): DialogsSceneDialogInfo['worldIcon'] {
  return WORLD_ICON[worldId] ?? 'people-outline';
}

export function buildDialogsSceneHubModel(args: Readonly<{
  lang: Lang;
  items: readonly DialogsSceneHubItem[];
  worldTitle: (worldId: string) => string;
  uiCopy: (scenarioId: string) => DialogsSceneHubUiCopy | null;
}>): DialogsSceneHubModel {
  const doneCount = args.items.filter((item) => item.status === 'done').length;
  const nextItem = args.items.find((item) => item.status === 'available') ?? null;
  if (!nextItem) return { doneCount, totalCount: args.items.length, next: null };
  const ui = args.uiCopy(nextItem.id);
  const personaId = ui ? (Object.keys(ui.personas)[0] ?? null) : null;
  const persona = ui && personaId ? ui.personas[personaId] : null;
  return {
    doneCount,
    totalCount: args.items.length,
    next: {
      id: nextItem.id,
      personaId,
      info: {
        world: args.worldTitle(nextItem.worldId),
        worldIcon: dialogsSceneWorldIcon(nextItem.worldId),
        // нет собеседника в снимке — подпись «с …» не выдумываем: имя пустое, в тексте остаётся только мир
        who: persona ? dialogsSceneWhoName(args.lang, persona.displayName) : '',
        title: nextItem.title,
        goals: ui ? Object.keys(ui.objectiveLabels).length : 0,
        goalsDone: null,
      },
    },
  };
}
