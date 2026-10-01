/**
 * D51: включение выигранных, но не забранных Plus-дней при миграции
 * «Подарки → монеты».
 *
 * зачем (Q12, 2026-10-01): прежний путь (applyGift → applySpinPlusForOccurrence
 * в level_gift_system) выключен — applyGift теперь всегда отвечает
 * success:false. Возвращать удалённую механику подарков нельзя, поэтому здесь
 * та же запись, что делал старый путь (локальный VIP-снимок аккаунта через
 * premium_vip_storage), но со своей квитанцией:
 *
 *  1. квитанция `gifts_to_coins_v1:plus:<owner>:<occurrence>` с ЗАМОРОЖЕННЫМ
 *     сроком пишется ДО изменения VIP (повтор после краха берёт тот же срок);
 *  2. VIP: vip_until = max(замороженный срок, текущий) — повтор ничего не
 *     продлевает второй раз; пожизненный доступ не трогаем вовсе;
 *  3. квитанция → applied.
 *
 * Ключ лежит под account-local префиксом `gifts_to_coins_v1:` (cloud_sync) и
 * путешествует вместе с журналом миграции.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import { plusGiftDays, type PlusGiftId } from './gifts_to_coins_table_v1';
import { prepareVipSnapshotWritesForAccount, readVipSnapshotForAccount } from './premium_vip_storage';

const LOG = '[GIFTS-TO-COINS]';
const DAY_MS = 24 * 60 * 60 * 1_000;

type PlusReceipt = Readonly<{
  schemaVersion: 'gifts-to-coins-plus.v1';
  owner: string;
  giftId: PlusGiftId;
  days: number;
  fromMs: number;
  untilMs: number;
  lifetime: boolean;
  status: 'prepared' | 'applied';
}>;

export function giftsToCoinsPlusReceiptKey(owner: string, occurrenceId: string): string {
  return `gifts_to_coins_v1:plus:${encodeURIComponent(owner)}:${encodeURIComponent(occurrenceId)}`;
}

function isLifetime(values: Readonly<Record<string, string>> | null): boolean {
  if (!values || values.vip_active !== 'true') return false;
  const until = Math.max(0, Number(values.vip_until) || 0);
  const plan = String(values.vip_plan ?? '').trim().toLowerCase();
  return until <= 0 || plan === 'lifetime' || plan === 'pro_lifetime' || plan === 'promo_lifetime';
}

function parseReceipt(raw: string | null, owner: string, giftId: PlusGiftId): PlusReceipt | null {
  if (raw === null) return null;
  const value = JSON.parse(raw) as PlusReceipt;
  if (!value || value.schemaVersion !== 'gifts-to-coins-plus.v1' || value.owner !== owner
    || value.giftId !== giftId || !Number.isSafeInteger(value.untilMs)) {
    throw new Error('gifts_to_coins_plus_receipt_corrupt');
  }
  return value;
}

/** Включить Plus-дни один раз на occurrenceId. true — включено (или уже было). */
export async function applyGiftsToCoinsPlusDays(
  giftId: PlusGiftId,
  occurrenceId: string,
  token: AccountGenerationToken,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const owner = token.stableId?.trim() ?? '';
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    console.log(`${LOG} plus skip reason=identity_not_current giftId=${giftId}`);
    return false;
  }
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) {
      console.log(`${LOG} plus skip reason=account_changed_in_lock giftId=${giftId}`);
      return false;
    }
    const key = giftsToCoinsPlusReceiptKey(owner, occurrenceId);
    let receipt = parseReceipt(await AsyncStorage.getItem(key), owner, giftId);
    if (receipt?.status === 'applied') {
      console.log(`${LOG} plus replay giftId=${giftId} occ=${occurrenceId.slice(0, 24)} status=applied`);
      return true;
    }
    const before = await readVipSnapshotForAccount(owner);
    if (!receipt) {
      const days = plusGiftDays(giftId);
      const lifetime = isLifetime(before);
      const previousUntil = Math.max(0, Number(before?.vip_until) || 0);
      receipt = Object.freeze({
        schemaVersion: 'gifts-to-coins-plus.v1',
        owner, giftId, days, fromMs: nowMs,
        untilMs: lifetime ? 0 : Math.max(nowMs, previousUntil) + days * DAY_MS,
        lifetime,
        status: 'prepared',
      });
      await AsyncStorage.setItem(key, JSON.stringify(receipt));
      console.log(`${LOG} plus prepared giftId=${giftId} days=${days} lifetime=${lifetime} prevUntil=${previousUntil} until=${receipt.untilMs}`);
    }
    if (!isCurrentAccountGeneration(token, owner)) {
      console.log(`${LOG} plus skip reason=account_changed_after_prepare giftId=${giftId}`);
      return false;
    }
    const currentLifetime = isLifetime(before);
    const currentUntil = Math.max(0, Number(before?.vip_until) || 0);
    const writes: [string, string][] = currentLifetime || receipt.lifetime
      ? []
      : prepareVipSnapshotWritesForAccount(owner, {
        vip_active: 'true',
        vip_plan: 'level_spin',
        vip_from: String(receipt.fromMs),
        vip_until: String(Math.max(receipt.untilMs, currentUntil)),
        vip_admin_override: 'true',
        vip_admin_grant_at: String(receipt.fromMs),
      });
    console.log(`${LOG} plus apply giftId=${giftId} branch=${writes.length === 0 ? 'lifetime_keep' : 'extend'} currentUntil=${currentUntil} until=${Math.max(receipt.untilMs, currentUntil)}`);
    await AsyncStorage.multiSet([...writes, [key, JSON.stringify({ ...receipt, status: 'applied' })]]);
    try {
      emitAppEvent('vip_activated');
      emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
    } catch (error) {
      console.warn(`${LOG} catch step=plus_emit error=${String(error)} action=ignore_vip_already_written`);
    }
    return true;
  });
}

export default function __RouteShim() { return null; }
