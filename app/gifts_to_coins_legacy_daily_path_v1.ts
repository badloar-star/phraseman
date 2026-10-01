// ═══════════════════════════════════════════════════════════════════════════
// gifts_to_coins_legacy_daily_path_v1.ts — сырые ключи удалённого «Дневного пути».
//
// зачем (D49, владелец 2026-10-01: «удалить фичу и весь код»): «Дневной путь»
// (бонус дня, подарки 50-дневной серии) удалён целиком вместе с модулями
// app/daily_journey_*. Но Q12-миграция «Подарки → монеты» обязана выплатить
// компенсацию за НЕЗАБРАННЫЕ подарки этого пути (g2cdj_/g2c1_). Поэтому сюда
// перенесено минимально нужное: имена ключей хранилища и ЧТЕНИЕ незабранных
// подарков из сырого журнала (без записи, без UI, без серии).
//
//  • readLegacyDailyPathPending — то, что раньше отдавал
//    readDailyJourneyGiftProjection(...).pending: проверенные (sha256) записи
//    журнала минус квитанции «забрано». Битая запись → бросаем, миграция
//    помечает источник corrupt (так было и раньше).
//  • purgeRetiredDailyPathPresentationKeys — разовая очистка ключей ПОКАЗА
//    (квитанция «окно показано», намерение выдачи) — ценности в них нет.
//  • purgeRetiredDailyPathAccountKeys — полная очистка журнала подарков и
//    щитов серии для владельца; зовётся ТОЛЬКО после того, как миграция
//    дошла до done: до этого журнал — это деньги человека.
//
// Логи — префикс [DAILY-PATH-RETIRED].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { DailyJourneyRewardKind } from './gifts_to_coins_table_v1';

const LOG = '[DAILY-PATH-RETIRED]';

// Имена ключей прежнего модуля constants/daily_journey_gift_storage_keys.ts —
// менять НЕЛЬЗЯ: под ними лежат данные уже установленных приложений.
export const LEGACY_DAILY_PATH_GIFT_OCCURRENCE_PREFIX = 'daily_journey_gift_occurrence_v1:';
export const LEGACY_DAILY_PATH_GIFT_PREPARED_PREFIX = 'daily_journey_gift_prepared_v1:';
export const LEGACY_DAILY_PATH_GIFT_PROJECTION_PREFIX = 'daily_journey_gift_projection_v1:';
export const LEGACY_DAILY_PATH_GIFT_CLAIM_RECEIPT_PREFIX = 'daily_journey_gift_claim_receipt_v1:';
export const LEGACY_DAILY_PATH_PRESENTED_PREFIX = 'daily_journey_production_presented_v1:';
export const LEGACY_DAILY_PATH_INTENT_PREFIX = 'daily_journey_production_intent_v1:';
// Прежний constants/daily_journey_freeze_storage_keys.ts.
export const LEGACY_DAILY_PATH_FREEZE_PREFIXES = Object.freeze([
  'daily_journey_freeze_operation_v1:',
  'daily_journey_freeze_prepared_v1:',
  'daily_journey_freeze_projection_v1:',
  'daily_journey_protected_day_prepared_v1:',
]);

/** Ключи, которые путешествуют и стираются вместе с аккаунтом (cloud_sync). */
export const LEGACY_DAILY_PATH_ACCOUNT_LOCAL_PREFIXES = Object.freeze([
  LEGACY_DAILY_PATH_GIFT_OCCURRENCE_PREFIX,
  LEGACY_DAILY_PATH_GIFT_PREPARED_PREFIX,
  LEGACY_DAILY_PATH_GIFT_PROJECTION_PREFIX,
  LEGACY_DAILY_PATH_GIFT_CLAIM_RECEIPT_PREFIX,
  LEGACY_DAILY_PATH_PRESENTED_PREFIX,
  LEGACY_DAILY_PATH_INTENT_PREFIX,
  ...LEGACY_DAILY_PATH_FREEZE_PREFIXES,
]);

export type LegacyDailyPathPending = Readonly<{
  operationId: string;
  ownerStableId: string;
  payloadFingerprint: string;
  createdAtMs: number;
  reward: Readonly<{ kind: DailyJourneyRewardKind; amount: number }>;
}>;

type Occurrence = LegacyDailyPathPending & Readonly<{
  source: string;
  cycle: number;
  day: number;
  revision: number;
}>;

const REWARD_KINDS: readonly string[] = ['pearls', 'runes', 'spins', 'energy_full', 'energy_plus', 'freeze'];
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function occurrenceShape(value: unknown, owner: string): Occurrence | null {
  if (!isRecord(value) || !isRecord(value.reward)) return null;
  const { operationId, ownerStableId, source, cycle, day, revision, createdAtMs, payloadFingerprint } = value;
  const kind = value.reward.kind;
  const amount = value.reward.amount;
  if (value.schemaVersion !== 'daily-journey-gift-occurrence.v1'
    || ownerStableId !== owner
    || typeof operationId !== 'string' || operationId.length < 8
    || (source !== 'daily_journey' && source !== 'daily_journey_dev')
    || !Number.isSafeInteger(cycle) || !Number.isSafeInteger(day)
    || !Number.isSafeInteger(revision) || Number(revision) < 1
    || !Number.isSafeInteger(createdAtMs) || Number(createdAtMs) < 0
    || typeof payloadFingerprint !== 'string' || !FINGERPRINT_RE.test(payloadFingerprint)
    || typeof kind !== 'string' || !REWARD_KINDS.includes(kind)
    || !Number.isSafeInteger(amount) || Number(amount) < 1) return null;
  return Object.freeze({
    operationId, ownerStableId: owner, source, cycle: Number(cycle), day: Number(day),
    revision: Number(revision), createdAtMs: Number(createdAtMs), payloadFingerprint,
    reward: Object.freeze({ kind: kind as DailyJourneyRewardKind, amount: Number(amount) }),
  });
}

/** Тот же канонический вид, что подписывал прежний журнал (иначе sha не сойдётся). */
async function fingerprintMatches(o: Occurrence): Promise<boolean> {
  const canonical = JSON.stringify({
    schemaVersion: 'daily-journey-gift-occurrence.v1',
    operationId: o.operationId,
    ownerStableId: o.ownerStableId,
    source: o.source,
    cycle: o.cycle,
    day: o.day,
    reward: { kind: o.reward.kind, amount: o.reward.amount },
    revision: o.revision,
    createdAtMs: o.createdAtMs,
  });
  const expected = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
  return expected === o.payloadFingerprint;
}

async function parseVerified(raw: string | null, owner: string, where: string): Promise<Occurrence> {
  let value: unknown;
  try {
    value = raw === null ? null : JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} catch step=parse_${where} error=${String(error)} action=mark_corrupt`);
    throw new Error('daily_journey_occurrence_corrupt');
  }
  const occurrence = occurrenceShape(value, owner);
  if (!occurrence || !(await fingerprintMatches(occurrence))) {
    console.warn(`${LOG} corrupt where=${where} shape=${occurrence ? 'ok' : 'bad'} action=mark_corrupt`);
    throw new Error('daily_journey_occurrence_corrupt');
  }
  return occurrence;
}

function receiptKey(owner: string, operationId: string): string {
  return `${LEGACY_DAILY_PATH_GIFT_CLAIM_RECEIPT_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(operationId)}`;
}

function isClaimedReceipt(raw: string | null, o: Occurrence): boolean {
  if (raw === null) return false;
  try {
    const value: unknown = JSON.parse(raw);
    if (isRecord(value)
      && value.schemaVersion === 'daily-journey-gift-claim-receipt.v1'
      && value.operationId === o.operationId
      && value.ownerStableId === o.ownerStableId) return true;
  } catch (error) {
    console.warn(`${LOG} catch step=parse_receipt op=${o.operationId.slice(0, 12)} error=${String(error)}`);
  }
  console.warn(`${LOG} corrupt where=receipt op=${o.operationId.slice(0, 12)} action=mark_corrupt`);
  throw new Error('daily_journey_claim_receipt_corrupt');
}

/**
 * Незабранные подарки «Дневного пути» владельца — только чтение.
 * Бросает на битых данных (миграция пометит источник corrupt и не заплатит дважды).
 */
export async function readLegacyDailyPathPending(owner: string): Promise<readonly LegacyDailyPathPending[]> {
  const ownerPart = encodeURIComponent(owner);
  const occurrencePrefix = `${LEGACY_DAILY_PATH_GIFT_OCCURRENCE_PREFIX}${ownerPart}:`;
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter((key) => key.startsWith(occurrencePrefix)).sort();
  const rows = keys.length > 0 ? await AsyncStorage.multiGet(keys) : [];
  const occurrences: Occurrence[] = [];
  for (const [, raw] of rows) occurrences.push(await parseVerified(raw, owner, 'occurrence'));
  // Подарок, чья запись была начата и не закончена (раньше дописывался при чтении).
  const preparedRaw = await AsyncStorage.getItem(`${LEGACY_DAILY_PATH_GIFT_PREPARED_PREFIX}${ownerPart}`);
  let preparedAdded = false;
  if (preparedRaw !== null) {
    let prepared: unknown;
    try {
      prepared = JSON.parse(preparedRaw);
    } catch (error) {
      console.warn(`${LOG} catch step=parse_prepared error=${String(error)} action=mark_corrupt`);
      throw new Error('daily_journey_prepared_corrupt');
    }
    if (!isRecord(prepared) || prepared.schemaVersion !== 'daily-journey-gift-prepared.v1') {
      console.warn(`${LOG} corrupt where=prepared action=mark_corrupt`);
      throw new Error('daily_journey_prepared_corrupt');
    }
    const occurrence = await parseVerified(JSON.stringify(prepared.occurrence), owner, 'prepared');
    if (!occurrences.some((o) => o.operationId === occurrence.operationId)) {
      occurrences.push(occurrence);
      preparedAdded = true;
    }
  }
  const pending: LegacyDailyPathPending[] = [];
  for (const o of occurrences) {
    if (isClaimedReceipt(await AsyncStorage.getItem(receiptKey(owner, o.operationId)), o)) continue;
    pending.push(Object.freeze({
      operationId: o.operationId,
      ownerStableId: o.ownerStableId,
      payloadFingerprint: o.payloadFingerprint,
      createdAtMs: o.createdAtMs,
      reward: o.reward,
    }));
  }
  console.log(`${LOG} read owner=${owner.slice(0, 6)} occurrences=${occurrences.length} preparedAdded=${preparedAdded} pending=${pending.length}`);
  return Object.freeze(pending);
}

async function removeByPrefixes(prefixes: readonly string[], scope: string): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const doomed = allKeys.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
  if (doomed.length > 0) await AsyncStorage.multiRemove(doomed);
  console.log(`${LOG} purge scope=${scope} removed=${doomed.length}`);
  return doomed.length;
}

const PRESENTATION_PURGED_MARKER = 'daily_path_retired_presentation_purged_v1';

/** Разово: ключи ПОКАЗА окна «бонус дня» (ценности нет). Никогда не бросает. */
export async function purgeRetiredDailyPathPresentationKeys(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(PRESENTATION_PURGED_MARKER) === '1') {
      console.log(`${LOG} purge scope=presentation skip reason=already_done`);
      return;
    }
    await removeByPrefixes([LEGACY_DAILY_PATH_PRESENTED_PREFIX, LEGACY_DAILY_PATH_INTENT_PREFIX], 'presentation');
    await AsyncStorage.setItem(PRESENTATION_PURGED_MARKER, '1');
  } catch (error) {
    console.warn(`${LOG} catch step=purge_presentation error=${String(error)} action=retry_next_start`);
  }
}

/**
 * Журнал подарков и щитов серии владельца. Только после done миграции Q12:
 * до этого журнал — источник компенсации. Никогда не бросает.
 */
export async function purgeRetiredDailyPathAccountKeys(owner: string): Promise<void> {
  try {
    const ownerPart = encodeURIComponent(owner);
    // Точное совпадение владельца: «abc» не должен зацепить ключи «abcd».
    const allKeys = await AsyncStorage.getAllKeys();
    const doomed = allKeys.filter((key) => LEGACY_DAILY_PATH_ACCOUNT_LOCAL_PREFIXES.some((prefix) => (
      key === `${prefix}${ownerPart}` || key.startsWith(`${prefix}${ownerPart}:`)
    )));
    if (doomed.length > 0) await AsyncStorage.multiRemove(doomed);
    console.log(`${LOG} purge scope=account owner=${owner.slice(0, 6)} removed=${doomed.length}`);
  } catch (error) {
    console.warn(`${LOG} catch step=purge_account owner=${owner.slice(0, 6)} error=${String(error)} action=retry_next_run`);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
