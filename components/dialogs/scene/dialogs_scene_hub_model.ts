// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_hub_model.ts — что хаб «Диалоги» знает для «Сцены»: сколько пройдено, какой диалог следующий, кто собеседник и сколько целей.
//
// зачем (координатор 22.10: «подними следующий диалог и счётчики без второго чтения каталога: один источник, общий кэш»): чистая сборка из тех же строк,
// что уже показывает каталог (projectAuthorizedDialogueV2Catalogue → items со статусом available/done/locked) и снимка текстов интерфейса
// (dialogueV2UiCopy: перечень целей и собеседники). Ни сети, ни хранилища; каталог читает только контейнер хаба и кэш клиента каталога.
// Собеседник и цели — подробности внутри карточки диалога («выбирается ДИАЛОГ, а не собеседник»), на сцене они только в строке «с Милой».
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import type { DialogsSceneCardData } from './DialogsScenePanel';
import { dialogsSceneGoalsLabel, dialogsSceneText, dialogsSceneWhoName, type DialogsSceneDialogInfo } from './dialogs_scene_copy';

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

export type DialogsSceneCatalogueItem = DialogsSceneHubItem & Readonly<{ rankRequired: number }>;

/**
 * Карточки панели под сценой из строк каталога (эталон dialogs-scene-concepts.html v2): мир, название, «N целей · первая: …», собеседник внутри.
 * зачем (координатор 22.10: «без новых чтений: тот же источник каталога»): только строки проекции и снимок текстов; закрытый по рангу диалог — со своей строкой «Откроется на ранге N».
 */
export function buildDialogsSceneCards(args: Readonly<{
  lang: Lang;
  items: readonly DialogsSceneCatalogueItem[];
  worldTitle: (worldId: string) => string;
  worldIcon: (worldId: string) => DialogsSceneCardData['worldIcon'];
  uiCopy: (scenarioId: string) => DialogsSceneHubUiCopy | null;
  lockedAtRank: (rank: number) => string;
}>): readonly DialogsSceneCardData[] {
  const [before = '', after = ''] = dialogsSceneText(args.lang, 'withWho', { who: '\u0000' }).split('\u0000');
  return args.items.map((item) => {
    const ui = args.uiCopy(item.id);
    const personaKey = ui ? (Object.keys(ui.personas)[0] ?? null) : null;
    const name = ui && personaKey ? dialogsSceneWhoName(args.lang, ui.personas[personaKey].displayName) : '';
    const goalTexts = ui ? Object.values(ui.objectiveLabels) : [];
    const goalsLine = goalTexts.length > 0 ? `${dialogsSceneGoalsLabel(args.lang, goalTexts.length)} · ${dialogsSceneText(args.lang, 'firstGoal', { goal: goalTexts[0] })}` : '';
    return {
      id: item.id,
      worldId: item.worldId,
      world: args.worldTitle(item.worldId),
      worldIcon: args.worldIcon(item.worldId),
      title: item.title,
      goalsLine,
      lockLine: item.status === 'locked' ? args.lockedAtRank(item.rankRequired) : null,
      initials: name ? [name.charAt(0).toUpperCase()] : [],
      whoBefore: name ? before : '',
      whoName: name,
      whoAfter: name ? after : '',
      status: item.status === 'done' ? 'done' : item.status === 'locked' ? 'locked' : 'new',
      ring: null,
    } satisfies DialogsSceneCardData;
  });
}
