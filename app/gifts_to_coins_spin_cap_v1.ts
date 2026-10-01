/**
 * D51/D53: общий учёт компенсации спинов (потолок 20 на человека) и общие
 * idempotency-ключи для спинов «Дневного пути».
 *
 * зачем (владелец 2026-09-24): спин «Дневного пути» закрывается в двух местах —
 * штатной активацией подарка (daily_journey_gift_activation.ts, в момент
 * выдачи дня или автозакрытия старой плитки) и миграцией «Подарки → монеты».
 * Если каждое место считает сумму и ключи само, человек получит дважды (гонка
 * «миграция описала → человек забрал плитку») или переберёт потолок 20.
 * Поэтому:
 *  - сколько спинов оплачено за конкретный подарок — пишется ОДИН раз в общий
 *    журнал и дальше только читается (оба пути получают одно и то же число);
 *  - requestId зависит только от владельца и operationId подарка, поэтому
 *    кошелёк схлопывает повтор, кто бы из двоих ни пришёл вторым.
 *
 * Ключ `gifts_to_coins_v1:spin_cap:<owner>` лежит под account-local префиксом
 * `gifts_to_coins_v1:` (cloud_sync) и путешествует вместе с журналом миграции.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  withAccountTransitionLock,
  type AccountTransitionLockLease,
} from './account_generation';
import {
  coinDenominationGiftIds,
  FREE_SPIN_CAP,
  FREE_SPIN_COINS,
} from './gifts_to_coins_table_v1';

const LOG = '[GIFTS-TO-COINS]';

export type SpinCapLedger = Readonly<{
  schemaVersion: 'gifts-to-coins-spin-cap.v1';
  owner: string;
  /** ключ выдачи → сколько спинов оплачено (0 = сверх потолка). */
  grants: Readonly<Record<string, number>>;
}>;

export function spinCapLedgerKey(owner: string): string {
  return `gifts_to_coins_v1:spin_cap:${encodeURIComponent(owner)}`;
}

export function dailyJourneySpinGrantKey(operationId: string): string {
  return `dj:${operationId}`;
}

/** Бережное чтение: битый журнал НЕ превращаем в «ничего не оплачено». */
export function parseSpinCapLedger(raw: string | null, owner: string): SpinCapLedger {
  if (raw === null) return Object.freeze({ schemaVersion: 'gifts-to-coins-spin-cap.v1', owner, grants: {} });
  const value = JSON.parse(raw) as SpinCapLedger;
  if (!value || value.schemaVersion !== 'gifts-to-coins-spin-cap.v1' || value.owner !== owner
    || !value.grants || typeof value.grants !== 'object'
    || Object.values(value.grants).some((count) => !Number.isSafeInteger(count) || count < 0)) {
    throw new Error('gifts_to_coins_spin_cap_corrupt');
  }
  return value;
}

export function spinCapUsed(ledger: SpinCapLedger): number {
  return Object.values(ledger.grants).reduce((sum, count) => sum + count, 0);
}

/**
 * Резерв оплаты спинов «Дневного пути» (штатная активация).
 * Повтор с тем же operationId возвращает уже записанное число.
 */
export async function reserveDailyJourneySpinCompensation(
  owner: string,
  operationId: string,
  requestedSpins: number,
  lease?: AccountTransitionLockLease,
): Promise<Readonly<{ paidSpins: number; cappedSpins: number; replayed: boolean }>> {
  return withAccountTransitionLock(async () => {
    const key = spinCapLedgerKey(owner);
    const ledger = parseSpinCapLedger(await AsyncStorage.getItem(key), owner);
    const grantKey = dailyJourneySpinGrantKey(operationId);
    const requested = Number.isSafeInteger(requestedSpins) && requestedSpins > 0 ? requestedSpins : 0;
    const existing = ledger.grants[grantKey];
    if (existing !== undefined) {
      console.log(`${LOG} spin_cap replay op=${operationId.slice(0, 16)} paid=${existing}`);
      return Object.freeze({ paidSpins: existing, cappedSpins: Math.max(0, requested - existing), replayed: true });
    }
    const left = Math.max(0, FREE_SPIN_CAP - spinCapUsed(ledger));
    const paidSpins = Math.min(requested, left);
    await AsyncStorage.setItem(key, JSON.stringify({
      ...ledger, grants: { ...ledger.grants, [grantKey]: paidSpins },
    }));
    console.log(`${LOG} spin_cap reserve op=${operationId.slice(0, 16)} requested=${requested} left=${left} paid=${paidSpins}`);
    return Object.freeze({ paidSpins, cappedSpins: requested - paidSpins, replayed: false });
  }, lease);
}

/** Номиналы и requestId компенсации одного подарка-спина «Дневного пути». */
export async function dailyJourneySpinCompensationGrants(
  owner: string,
  operationId: string,
  paidSpins: number,
): Promise<readonly Readonly<{ requestId: string; giftId: string }>[]> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({ schemaVersion: 'g2c-dj-spin.v1', owner, operationId }),
  );
  return coinDenominationGiftIds(Math.max(0, paidSpins) * FREE_SPIN_COINS)
    .map((giftId, index) => Object.freeze({ requestId: `g2cdj_${hash.slice(0, 32)}_${index + 1}`, giftId }));
}

export default function __RouteShim() { return null; }
