// ═══════════════════════════════════════════════════════════════════════════
// theme_shard_purchase.ts — списание жемчуга за тему оформления.
//
// зачем (владелец 2026-08-24): темы, кроме бесплатных/«Оливы»/«Золота», стоят
// 200 жемчужин и подпиской НЕ открываются. Покупка идёт тем же каноническим
// путём, что наборы карточек (commitShardCompositeOperation): списание и запись
// «тема куплена» происходят в ОДНОЙ операции журнала, поэтому невозможен ни
// «списали, но не выдали», ни «выдали бесплатно».
//
// Идентификатор операции — семантический (kind+тема), а не случайный: повторный
// тап по кнопке и ретрай после обрыва попадают в ту же операцию и не списывают
// жемчуг второй раз (класс бага, который уже ловили на сундуке друзей).
// ═══════════════════════════════════════════════════════════════════════════

import { DebugLogger } from './debug-logger';
import { emitAppEvent } from './events';
import {
  commitShardCompositeOperation,
  semanticShardOperationId,
} from './shards_system';
import { OWNED_THEMES_KEY, loadOwnedThemeModes, mergeThemeModeLists } from './theme_ownership_store';
import { isThemeShardPurchasable, themePriceShards } from './theme_access_policy';

export type ThemePurchaseResult = 'ok' | 'already_owned' | 'insufficient' | 'not_purchasable' | 'failed';

function emitPurchaseFailedToast(): void {
  // зачем: отказ обязан быть слышен. Немой отказ уже был багом покупки наборов —
  // кнопка «не работала», и человек не понимал почему.
  emitAppEvent('action_toast', {
    type: 'info',
    messageRu: 'Не получилось открыть тему. Попробуй ещё раз.',
    messageUk: 'Не вдалося відкрити тему. Спробуй ще раз.',
    messageEs: 'No se pudo desbloquear el tema. Inténtalo de nuevo.',
  });
}

/**
 * Купить тему за жемчуг.
 *
 * Возврат `'insufficient'` — не ошибка, а штатная ветка: вызывающий экран
 * переключает модалку в режим «не хватает жемчуга».
 */
export async function purchaseThemeWithShards(themeMode: string): Promise<ThemePurchaseResult> {
  if (!isThemeShardPurchasable(themeMode)) return 'not_purchasable';
  const price = themePriceShards(themeMode);
  if (price <= 0) return 'not_purchasable';

  try {
    const owned = await loadOwnedThemeModes();
    if (owned.includes(themeMode)) return 'already_owned';
    const nextOwned = mergeThemeModeLists(owned, [themeMode]);

    const result = await commitShardCompositeOperation({
      amount: price,
      reason: 'theme_purchase',
      operationId: await semanticShardOperationId('theme_purchase', themeMode),
      grant: { kind: 'theme', subjectId: themeMode },
      // Список купленных тем пишется ВНУТРИ той же операции, что и списание.
      localWrites: [[OWNED_THEMES_KEY, JSON.stringify(nextOwned)]],
    });

    if (result.status === 'applied' || result.status === 'already-applied' || result.status === 'already-satisfied') {
      return 'ok';
    }
    // 'insufficient' — отдельный статус журнала, а не reason у 'failed'.
    if (result.status === 'insufficient') return 'insufficient';
    emitPurchaseFailedToast();
    return 'failed';
  } catch (error) {
    DebugLogger.error('theme_shard_purchase.ts:purchaseThemeWithShards', error, 'warning');
    emitPurchaseFailedToast();
    return 'failed';
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
