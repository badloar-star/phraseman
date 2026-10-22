// ═════════════════════════════════════════════════════════════════════
// dialogs_hub_model.ts — чистая модель хаба Диалогов: счётчики «пройдено / всего» по темам и в целом, выбор строк темы.
//
// зачем (владелец 22.10, «Да, переносить», макет dialogs-hub-v4.html): на хабе — плитки тем 2 × 2 с «k из n» и широкая «Все диалоги»; тема открывается отдельным экраном со строками.
// Счётчики и строки — из той же проекции каталога, что видит хаб (статусы done / available / locked приходят готовыми от projectAuthorizedDialogueV2Catalogue), новых чтений нет.
// ═════════════════════════════════════════════════════════════════════
import type { DialogueV2CatalogueLearnerItem, DialogueV2CatalogueWorld } from '../DialogueV2CatalogueSection';

/** Особое значение выбора на экране темы: все миры сразу. */
export const DIALOGS_HUB_ALL = 'all';

export type DialogsHubWorldCount = Readonly<{ id: string; title: string; done: number; total: number }>;
export type DialogsHubTotals = Readonly<{ done: number; total: number }>;

export function dialogsHubWorldCounts(worlds: readonly DialogueV2CatalogueWorld[], items: readonly DialogueV2CatalogueLearnerItem[]): readonly DialogsHubWorldCount[] {
  return worlds
    .map((world) => {
      const own = items.filter((item) => item.worldId === world.id);
      return { id: world.id, title: world.title, done: own.filter((item) => item.status === 'done').length, total: own.length };
    })
    // мир без диалогов на хабе не рисуется (как в прежних секциях)
    .filter((world) => world.total > 0);
}

export function dialogsHubTotals(items: readonly DialogueV2CatalogueLearnerItem[]): DialogsHubTotals {
  return { done: items.filter((item) => item.status === 'done').length, total: items.length };
}

/** Строки выбранной темы; неизвестный id мира даёт пустой список, а не «все» (молчаливая подмена скрыла бы ошибку навигации). */
export function dialogsHubItemsOf(items: readonly DialogueV2CatalogueLearnerItem[], worldId: string): readonly DialogueV2CatalogueLearnerItem[] {
  return worldId === DIALOGS_HUB_ALL ? items : items.filter((item) => item.worldId === worldId);
}

/** Положение точки на дорожке: доля пройденных 0…1 (0, если диалогов нет). */
export function dialogsHubProgress(done: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
}
