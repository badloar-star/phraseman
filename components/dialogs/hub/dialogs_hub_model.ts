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

/**
 * Вес плитки темы в строке 2 × 2: ширина делится пропорционально длине названия + запас.
 *
 * зачем (Переводчик 22.10, fit-report-360dp: «Повседневное» 118 dp, «Повсякденне» 108, «Gündelik hayat» 117 не влезали в 106 dp при равных колонках): названия — решение владельца («как в приложении»), шрифт не ужимаем (запрет владельца),
 * одно слово посреди не рвём — поэтому запас подобран замером (4: при 10 «Gündelik hayat» не влезало на 360 dp, при 2 не влезали «Поездки» и «Yolculuklar»);  длинное название получает плитку пошире, короткое — поуже; сумма строки та же. Сторож: tests/dialogs_hub_tile_fit_contract.test.ts (9 языков при 360 dp).
 */
export const DIALOGS_HUB_TILE_WEIGHT_PAD = 4;
export function dialogsHubTileWeight(title: string): number {
  return title.length + DIALOGS_HUB_TILE_WEIGHT_PAD;
}
