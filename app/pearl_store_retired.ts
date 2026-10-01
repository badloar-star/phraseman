// зачем (PM-057, PhraseMan 2.0, решения D28/D15/D45): жемчуг уходит из
// приложения целиком, и первым шагом закрыта ПОКУПКА жемчуга за реальные
// деньги (пакеты phraseman_shards_30/80/180/420 через RevenueCat).
//
// Что это НЕ трогает (намеренно, это отдельные задачи):
//   - баланс и журнал жемчуга (shards_system.ts) — читается миграцией PM-059;
//   - дотягивание уже оплаченных покупок (shards_pending_grants.ts,
//     resumePendingShardGrants) и серверный вебхук с возвратами
//     (functions/src/revenuecat_shards.ts) — человек, заплативший в старой
//     версии, обязан получить своё (PM-057-A2);
//   - товарные ID в сторах — их деактивирует владелец в App Store Connect /
//     Google Play Console, а не код (иначе рассинхрон с живым каталогом);
//   - вкладку «Карточки» в app/shards_shop.tsx (наборы за жемчуг — PM-060).
//
// Раньше ~8 мест при нехватке жемчуга вели в магазин докупить. Теперь купить
// нельзя, поэтому переход заменён честным сообщением + логом с единым
// префиксом [PM-057], чтобы по одному поиску было видно, откуда человек
// упёрся в нехватку.

import { actionToastTri, emitAppEvent } from './events';

/** Маркер для сторожей и grep: покупка жемчуга за деньги в клиенте закрыта. */
export const PEARL_STORE_PURCHASES_RETIRED_PM057 = true as const;

export type PearlShortageSource =
  | 'friend_gift'
  | 'friend_gift_reply'
  | 'streak_freeze'
  | 'streak_revive'
  | 'card_pack_insufficient';

/** Только лог: вызывающее место уже само показало человеку, чего не хватает. */
export function logPearlStoreEntryBlocked(source: PearlShortageSource, need: number | null): void {
  console.warn('[PM-057] pearl_store_entry_blocked', JSON.stringify({ source, need }));
}

/** Лог + короткое сообщение «не хватает монет» вместо перехода в магазин. */
export function notifyPearlShortageWithoutStore(source: PearlShortageSource, need: number | null): void {
  logPearlStoreEntryBlocked(source, need);
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Не хватает монет',
    uk: 'Не вистачає монет',
    en: 'Not enough coins',
    es: 'No tienes suficientes monedas',
    'pt-BR': 'Moedas insuficientes',
    vi: 'Không đủ xu',
    id: 'Koin tidak cukup',
    tr: 'Jeton yetersiz',
    pl: 'Za mało monet',
  }));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PearlStoreRetiredRouteShim() { return null; }
