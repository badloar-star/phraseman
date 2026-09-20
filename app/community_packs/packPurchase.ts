/**
 * Покупка набора сообщества за руны.
 *
 * зачем (владелец, 2026-09-17, экран 8 макета docs/design/runes/MAKET.html):
 * автор ставит набору цену ползунком, покупатель платит рунами. Это ОТМЕНЯЕТ
 * решение Cards 2.1 §1.2 «наборы сообщества бесплатны».
 *
 * ⚠️ СТАРЫЕ И БЕСПЛАТНЫЕ НАБОРЫ НЕ ЗАТРОНУТЫ: цена 0 — путь остаётся прежним,
 * одно нажатие «Добавить себе» без всякой оплаты (прямое решение владельца:
 * те, кто уже опубликовал и уже пользуется, не должны пострадать).
 *
 * ТЕЛЕФОН АВТОРИТЕТЕН — тот же закон, что у диалогов и подсказок: списываем
 * локально и мгновенно, набор добавляется в том же кадре. Ни «идёт списание»,
 * ни «отказ сервера», ни «нет сети» не существует.
 *
 * Идемпотентность: ключ владения — id набора. Повторная покупка уже купленного
 * набора невозможна: владение проверяется ДО списания под общим замком.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../account_generation';
import { DebugLogger } from '../debug-logger';
import {
  prepareRuneSpend,
  publishRuneSpend,
  readUnifiedLevelSpinStars,
} from '../level_spin_star_grants';
import { withStorageLock } from '../storage_mutex';

/** Ключ купленных наборов. Отдельный от «добавленных»: добавить можно и бесплатный. */
function paidPacksKey(stableId: string): string {
  return `community_pack_paid_ids_v1:${stableId}`;
}

function parseIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id !== ''));
  } catch (error) {
    // Немой catch запрещён: пустой список молча потребовал бы вторую оплату
    // за уже купленный набор.
    DebugLogger.error(
      'packPurchase:parse',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return new Set();
  }
}

/** Наборы, купленные за руны. */
export async function getPaidPackIds(stableId: string): Promise<Set<string>> {
  if (!stableId) return new Set();
  const raw = await AsyncStorage.getItem(paidPacksKey(stableId)).catch((error: unknown) => {
    DebugLogger.error(
      'packPurchase:read',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return null;
  });
  return parseIds(raw);
}

export type PackPurchaseResult =
  | { ok: true; alreadyOwned: boolean; balance: number }
  | { ok: false; reason: 'insufficient_runes' | 'identity_changed' | 'invalid_price' };

/**
 * Купить набор за руны. Всё решается локально и мгновенно — вызывающий экран
 * добавляет набор сразу после `ok`, не дожидаясь сети.
 */
export async function buyCommunityPackLocally(
  token: AccountGenerationToken,
  packId: string,
  priceRunes: number,
): Promise<PackPurchaseResult> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    DebugLogger.info('[PACK-BUY] denied', 'identity_changed');
    return { ok: false, reason: 'identity_changed' };
  }
  if (!packId || !Number.isFinite(priceRunes) || priceRunes <= 0) {
    DebugLogger.info('[PACK-BUY] denied', `invalid_price pack=${packId} price=${priceRunes}`);
    return { ok: false, reason: 'invalid_price' };
  }

  // зачем обе аренды (владелец 2026-09-20): здесь был ТОТ ЖЕ самозахват, что
  // убил покупку диалога. Держим оба замка и внутри читаем баланс, который
  // берёт их заново — вызов ждал сам себя, покупка набора висела навсегда.
  // Найдено аудитом всех вызовов чтения баланса, а не жалобой: экран
  // покупки наборов молчал ровно так же.
  return withAccountTransitionLock(async (lease) => withStorageLock(async (storageLease) => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      return { ok: false, reason: 'identity_changed' } as const;
    }
    const owned = await getPaidPackIds(ownerStableId);
    if (owned.has(packId)) {
      // Повторный тап или возврат на экран — не вторая оплата.
      const { balance } = await readUnifiedLevelSpinStars(token, lease, storageLease);
      DebugLogger.info('[PACK-BUY] already_owned', `pack=${packId}`);
      return { ok: true, alreadyOwned: true, balance } as const;
    }
    const { balance } = await readUnifiedLevelSpinStars(token, lease, storageLease);
    if (balance < priceRunes) {
      DebugLogger.info('[PACK-BUY] denied', `insufficient balance=${balance} price=${priceRunes}`);
      return { ok: false, reason: 'insufficient_runes' } as const;
    }
    // СНАЧАЛА списываем, ПОТОМ открываем набор: откажи списание после записи
    // владения — человек получил бы набор бесплатно.
    // зачем spendRunesLocally, а не merge (владелец 2026-09-20): merge —
    // канал серверных снапшотов, без нового starsSeq он молча НЕ списывал.
    const spend = await prepareRuneSpend({
      token, operationId: `card_pack:${ownerStableId}:${packId}`,
      kind: 'card_pack', subjectId: packId, price: priceRunes,
    }, lease, storageLease);
    if (!spend.ok) {
      DebugLogger.info('[PACK-BUY] denied', `spend_failed reason=${spend.reason}`);
      return { ok: false, reason: 'insufficient_runes' } as const;
    }
    const balanceAfter = spend.balanceAfter;
    // ОДНА запись: трата + владение набором. Разорвись она пополам — человек
    // остался бы без рун и без набора. Иммутабельно: новый список, не мутация.
    await AsyncStorage.multiSet([
      ...spend.durableWrites.map(([key, value]) => [key, value] as [string, string]),
      [paidPacksKey(ownerStableId), JSON.stringify([...owned, packId])],
    ]);
    publishRuneSpend(token, spend);
    DebugLogger.info('[PACK-BUY] ok', `pack=${packId} price=${priceRunes} balance ${balance}→${balanceAfter}`);
    return { ok: true, alreadyOwned: false, balance: balanceAfter } as const;
  }));
}
