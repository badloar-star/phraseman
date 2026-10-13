/**
 * Монеты за диалог (решение владельца 13.10: «Да, как в макете»).
 *
 * зачем: на итоге диалога в образце dialogs.html D1–D4 — «+30 монет» (без ошибок), «+25» (с ошибками), «+10» (разговор
 * завершён вручную), а в коде монет за диалог не было вовсе. Начисление идёт ТЕМ ЖЕ путём, что у уроков и слов (копилка
 * practice_rune_earnings → одна серверная расписка practiceRuneGrant), без новых функций и без выкладки: активность
 * `lesson` (не speaking_practice: та засчитала бы элементы в задание дня «карточки»), цена 1 за элемент (repeatPriceOnly) → ровно N монет. Один раз на сессию диалога: отметка по аккаунту и
 * id сессии ставится ДО начисления, возврат на экран итога ничего не начисляет. Журнал — [COINS-EARN].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DIALOGUE_COINS_CLEAN = 30;
export const DIALOGUE_COINS_WITH_MISTAKES = 25;
export const DIALOGUE_COINS_ENDED_MANUALLY = 10;

export type DialogueCoinEndedBy = 'manual' | 'bot' | 'limit';

/** Сумма по образцу: вручную — 10; дошёл до конца — 30 без ошибок, 25 с ошибками. */
export function dialogueV2CoinAward(input: Readonly<{ endedBy: DialogueCoinEndedBy; mistakes: number }>): number {
  if (input.endedBy === 'manual') return DIALOGUE_COINS_ENDED_MANUALLY;
  return Number.isFinite(input.mistakes) && input.mistakes > 0 ? DIALOGUE_COINS_WITH_MISTAKES : DIALOGUE_COINS_CLEAN;
}

/** Ключ копилки на сервере: только [A-Za-z0-9_-], до 72 знаков (копилка сама укоротит хвост хэшем). */
export function dialogueV2CoinSessionKey(sessionId: string): string {
  return `dialogue_${sessionId.trim().replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

const AWARDED_PREFIX = 'dialogue_v2_coins_awarded_v1';

export function dialogueV2CoinAwardedKey(ownerStableId: string, sessionId: string): string {
  return `${AWARDED_PREFIX}:${ownerStableId}:${sessionId}`;
}

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

/** Было ли уже начисление за эту сессию. Сбой чтения — считаем «было» (не начислять дважды), с причиной в журнале. */
export async function readDialogueV2CoinsAwarded(ownerStableId: string, sessionId: string, storage: Storage = AsyncStorage): Promise<boolean> {
  try {
    return (await storage.getItem(dialogueV2CoinAwardedKey(ownerStableId, sessionId))) !== null;
  } catch (error: unknown) {
    console.warn(`[COINS-EARN] dialog: отметка не прочиталась — начисление пропущено (без риска двойного) session=${sessionId.slice(0, 12)}`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return true;
  }
}

/** Поставить отметку ДО начисления. false — не записалась (начислять нельзя: при повторе было бы дважды). */
export async function markDialogueV2CoinsAwarded(ownerStableId: string, sessionId: string, amount: number, storage: Storage = AsyncStorage): Promise<boolean> {
  try {
    await storage.setItem(dialogueV2CoinAwardedKey(ownerStableId, sessionId), JSON.stringify({ amount, atMs: Date.now() }));
    return true;
  } catch (error: unknown) {
    console.warn(`[COINS-EARN] dialog: отметка не записалась — начисление отменено session=${sessionId.slice(0, 12)}`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return false;
  }
}

/** Откат отметки, если начисление не легло в копилку (монеты не показаны — можно попробовать при следующем входе). */
export async function clearDialogueV2CoinsAwarded(ownerStableId: string, sessionId: string, storage: Storage = AsyncStorage): Promise<void> {
  try {
    await storage.removeItem(dialogueV2CoinAwardedKey(ownerStableId, sessionId));
  } catch (error: unknown) {
    console.warn(`[COINS-EARN] dialog: откат отметки не удался session=${sessionId.slice(0, 12)}`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
