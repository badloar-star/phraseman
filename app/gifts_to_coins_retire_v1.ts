/**
 * D51: списание уже оплаченных монетами предметов (шаг 6 спецификации §5.2).
 *
 * зачем: миграция зовёт это ТОЛЬКО после того, как монеты легли в кошелёк.
 * Модуль не пишет сам — он готовит набор записей, а миграция кладёт их одним
 * multiSet ВМЕСТЕ с меткой журнала `retired`. Так крах между «списали» и
 * «отметили» невозможен, а повтор просто пересоберёт те же записи
 * (каждое правило идемпотентно: фильтр по id, claimed=true, удаление ключа).
 *
 * Чего здесь НЕТ намеренно:
 * - outbox платных спинов, конверты `paid_level_spin_envelope_v1:*` и
 *   `level_spin_star_operation_v1:*` не трогаем — это запись о списании 300
 *   рун (§5.2 п.6). зачем (Q12): модуль спинов (acknowledgeLocalLevelSpin)
 *   удалён, а кошелёк (level_spin_star_grants.storedOperationsForOwner) и
 *   сейчас считает трату прямо из конверта — удалить конверт = вернуть 300 рун;
 * - `issuedLevels/issuedCreditIds` спинов СОХРАНЯЕМ (иначе старый код
 *   заново начеканит спины за те же уровни).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  LEVEL_SPIN_PENDING_REVEAL_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
} from './level_up_storage_keys';
import {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  localLevelSpinStateStorageKey,
  seasonPassUsedMarkerKey,
  type GiftsToCoinsItem,
} from './gifts_to_coins_inventory_v1';

export type GiftsToCoinsRetirePlan = Readonly<{
  writes: readonly (readonly [string, string])[];
  removals: readonly string[];
  paidRequestIds: readonly string[];
  log: readonly string[];
}>;

/** closedRequestIds в local_level_spins принимает только такой вид (normalizeState). */
const CLOSED_REQUEST_ID_RE = /^[a-f0-9-]{16,}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value === 'string' && !seen.has(value)) { seen.add(value); out.push(value); }
  }
  return out;
}

function uniqueLevels(values: readonly unknown[]): number[] {
  return [...new Set(values.map(Number).filter((level) => Number.isInteger(level) && level >= 2 && level <= 60))]
    .sort((left, right) => left - right);
}

type SpinRetire = Readonly<{
  creditIds: ReadonlySet<string>;
  syntheticCredits: readonly Readonly<{ id: string; level: number }>[];
  closeRequestIds: ReadonlySet<string>;
}>;

async function retireSpinState(
  owner: string,
  spin: SpinRetire,
  out: { writes: [string, string][]; log: string[] },
): Promise<void> {
  if (spin.creditIds.size === 0 && spin.closeRequestIds.size === 0) return;
  const key = localLevelSpinStateStorageKey(owner);
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) {
    if (spin.syntheticCredits.length === 0) return;
    // Источником был кэш баланса: пишем пустое состояние, но С выданными
    // уровнями — иначе migrateCachedBalanceToLocalCredits начеканит их снова.
    const state = {
      owner,
      credits: [],
      issuedLevels: uniqueLevels(spin.syntheticCredits.map((credit) => credit.level)),
      issuedCreditIds: uniqueStrings(spin.syntheticCredits.map((credit) => credit.id)),
      activeReceipt: null,
      closedRequestIds: [],
      lessonSpinMisses: 0,
    };
    out.writes.push([key, JSON.stringify(state)]);
    out.writes.push([LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner, balance: 0 })]);
    out.log.push(`retire source=spin_credits from=balance_cache removed=${spin.syntheticCredits.length}`);
    return;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.owner !== owner || !Array.isArray(parsed.credits)) {
    throw new Error('gifts_to_coins_spin_state_changed_shape');
  }
  const credits = parsed.credits.filter((credit) => !(isRecord(credit) && spin.creditIds.has(String(credit.id))));
  const removed = parsed.credits.length - credits.length;
  const issuedLevels = uniqueLevels([
    ...(Array.isArray(parsed.issuedLevels) ? parsed.issuedLevels : []),
    ...parsed.credits.map((credit) => (isRecord(credit) ? credit.level : null)),
  ]);
  const issuedCreditIds = uniqueStrings([
    ...(Array.isArray(parsed.issuedCreditIds) ? parsed.issuedCreditIds : []),
    ...parsed.credits.map((credit) => (isRecord(credit) ? credit.id : null)),
  ]);
  const activeReceipt = isRecord(parsed.activeReceipt) ? parsed.activeReceipt : null;
  const closeActive = !!activeReceipt && spin.closeRequestIds.has(String(activeReceipt.requestId));
  const toClose = [...spin.closeRequestIds].filter((id) => {
    if (CLOSED_REQUEST_ID_RE.test(id)) return true;
    out.log.push(`retire skip close req=${id.slice(0, 8)} reason=request_id_shape`);
    return false;
  });
  const closedRequestIds = uniqueStrings([
    ...(Array.isArray(parsed.closedRequestIds) ? parsed.closedRequestIds : []),
    ...toClose,
  ]).slice(-80);
  const next = {
    ...parsed,
    credits,
    issuedLevels,
    issuedCreditIds,
    activeReceipt: closeActive ? null : parsed.activeReceipt ?? null,
    closedRequestIds,
  };
  out.writes.push([key, JSON.stringify(next)]);
  out.writes.push([LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner, balance: credits.length })]);
  out.log.push(`retire source=spin_credits removed=${removed} left=${credits.length} closedReceipts=${toClose.length} activeClosed=${closeActive}`);
}

async function retireJournal(
  owner: string,
  refs: ReadonlySet<string>,
  out: { writes: [string, string][]; log: string[] },
): Promise<void> {
  if (refs.size === 0) return;
  const raw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
  if (raw === null) { out.log.push('retire source=spin_prizes journal=absent'); return; }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('gifts_to_coins_journal_changed_shape');
  let marked = 0;
  const next = parsed.map((entry) => {
    if (!isRecord(entry) || entry.owner !== owner || !Array.isArray(entry.occurrences)) return entry;
    const occurrences = entry.occurrences.map((occurrence) => {
      if (!isRecord(occurrence) || occurrence.claimed === true) return occurrence;
      if (!refs.has(`${String(entry.requestId)}:${String(occurrence.lane)}`)) return occurrence;
      marked += 1;
      return { ...occurrence, claimed: true };
    });
    return { ...entry, occurrences };
  });
  if (marked > 0) out.writes.push([LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(next)]);
  out.log.push(`retire source=spin_prizes removed=${marked} expected=${refs.size}`);
}

async function retireLevelGifts(
  items: readonly GiftsToCoinsItem[],
  out: { writes: [string, string][]; log: string[] },
): Promise<void> {
  const refs = items.flatMap((item) => (item.retire.kind === 'level_gift' ? [item.retire] : []));
  if (refs.length === 0) return;
  const [[, singleRaw], [, dualRaw], [, stampsRaw]] = await AsyncStorage.multiGet([
    UNCLAIMED_GIFTS_KEY, UNCLAIMED_DUAL_GIFTS_KEY, UNCLAIMED_GIFT_RECEIVED_AT_KEY,
  ]);
  const parse = (raw: string | null): Record<string, unknown> => {
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? { ...value } : {};
  };
  const single = parse(singleRaw);
  const dual = parse(dualRaw);
  let stamps: Record<string, unknown> = {};
  try { stamps = parse(stampsRaw); } catch (error) {
    out.log.push(`retire level_gift_stamps unreadable error=${String(error)} action=keep_as_is`);
    stamps = {};
  }
  const idOf = (value: unknown): string | null => (isRecord(value) && typeof value.id === 'string' ? value.id : null);
  let removed = 0;
  let mismatched = 0;
  for (const ref of refs) {
    const level = String(ref.level);
    if (ref.part === 'single') {
      if (idOf(single[level]) === ref.giftId) { delete single[level]; removed += 1; } else mismatched += 1;
      continue;
    }
    const pair = dual[level];
    if (!isRecord(pair)) { mismatched += 1; continue; }
    if (idOf(pair[ref.part]) !== ref.giftId) { mismatched += 1; continue; }
    const other = ref.part === 'f2p' ? 'prem' : 'f2p';
    const otherMigrated = refs.some((candidate) => candidate.level === ref.level
      && candidate.part === other && idOf(pair[other]) === candidate.giftId);
    if (otherMigrated) delete dual[level];
    removed += 1;
  }
  const pendingLevels = new Set([...Object.keys(single), ...Object.keys(dual)]);
  const nextStamps = Object.fromEntries(Object.entries(stamps).filter(([level]) => pendingLevels.has(level)));
  out.writes.push([UNCLAIMED_GIFTS_KEY, JSON.stringify(single)]);
  out.writes.push([UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dual)]);
  out.writes.push([UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify(nextStamps)]);
  out.writes.push([PENDING_LEVEL_GIFT_COUNT_CACHE_KEY, String(pendingLevels.size)]);
  out.log.push(`retire source=level_gifts removed=${removed} mismatched=${mismatched} left=${pendingLevels.size}`);
}

async function retireDailyJourney(
  owner: string,
  items: readonly GiftsToCoinsItem[],
  options: Readonly<{ claimedAtMs: number; dailyJourneyReceiptPrefix: string }>,
  out: { writes: [string, string][]; log: string[] },
): Promise<void> {
  const refs = items.flatMap((item) => (item.retire.kind === 'daily_journey' ? [item.retire] : []));
  if (refs.length === 0) return;
  let written = 0;
  for (const ref of refs) {
    // Тот же ключ и та же форма, что у штатной квитанции daily_journey_gift_inbox:
    // экран «Подарков» увидит подарок забранным и не выдаст его второй раз.
    const key = `${options.dailyJourneyReceiptPrefix}${encodeURIComponent(owner)}:${encodeURIComponent(ref.operationId)}`;
    if (await AsyncStorage.getItem(key) !== null) continue;
    const receipt = {
      schemaVersion: 'daily-journey-gift-claim-receipt.v1',
      claimOperationId: `daily-journey-gift-claim:${ref.operationId}`,
      operationId: ref.operationId,
      ownerStableId: owner,
      occurrenceFingerprint: ref.payloadFingerprint,
      reward: { kind: ref.reward.kind, amount: ref.reward.amount },
      claimedAtMs: Math.max(options.claimedAtMs, ref.createdAtMs),
    };
    out.writes.push([key, JSON.stringify(receipt)]);
    written += 1;
  }
  out.log.push(`retire source=daily_journey removed=${written} expected=${refs.length}`);
}

/**
 * Предметы сезонного пропуска: штатная метка «использован» (та же форма ключа,
 * что у удалённого seasonPassGiftUseMarkerStorageKey). Данные не стираем —
 * только помечаем, повтор пишет те же '1'.
 */
function retireSeasonPass(
  owner: string,
  items: readonly GiftsToCoinsItem[],
  out: { writes: [string, string][]; log: string[] },
): void {
  const refs = items.flatMap((item) => (item.retire.kind === 'season_pass' ? [item.retire] : []));
  if (refs.length === 0) return;
  for (const ref of refs) out.writes.push([seasonPassUsedMarkerKey(owner, ref.itemId), '1']);
  out.log.push(`retire source=season_pass marked=${refs.length}`);
}

/**
 * Собрать записи списания. Звать под замком аккаунта (и storage-замком):
 * читает и тут же готовит новые значения тех же ключей.
 */
export async function buildGiftsToCoinsRetireWrites(
  owner: string,
  items: readonly GiftsToCoinsItem[],
  options: Readonly<{ claimedAtMs: number; dailyJourneyReceiptPrefix: string }>,
): Promise<GiftsToCoinsRetirePlan> {
  const out = { writes: [] as [string, string][], log: [] as string[] };
  const removals: string[] = [];
  const creditIds = new Set<string>();
  const syntheticCredits: { id: string; level: number }[] = [];
  const closeRequestIds = new Set<string>();
  const journalRefs = new Set<string>();
  const paidRequestIds = new Set<string>();
  const journalRequestIds = new Set<string>();

  for (const item of items) {
    const ref = item.retire;
    if (ref.kind === 'spin_credit') {
      creditIds.add(ref.creditId);
      if (ref.synthetic) syntheticCredits.push({ id: ref.creditId, level: ref.level });
    } else if (ref.kind === 'journal') {
      journalRefs.add(`${ref.requestId}:${ref.lane}`);
      journalRequestIds.add(ref.requestId);
      if (ref.paid) paidRequestIds.add(ref.requestId);
    } else if (ref.kind === 'receipt') {
      closeRequestIds.add(ref.requestId);
      if (ref.paid) paidRequestIds.add(ref.requestId);
    }
  }
  // Чек активного спина, чей приз мы оплатили через журнал, тоже закрываем:
  // иначе recoverLocalLevelSpin продолжит возвращать уже оплаченный приз.
  const stateRaw = await AsyncStorage.getItem(localLevelSpinStateStorageKey(owner));
  if (stateRaw !== null) {
    try {
      const state: unknown = JSON.parse(stateRaw);
      const active = isRecord(state) && isRecord(state.activeReceipt) ? String(state.activeReceipt.requestId) : '';
      if (active && journalRequestIds.has(active)) closeRequestIds.add(active);
    } catch (error) {
      out.log.push(`retire spin_state unreadable error=${String(error)} action=skip_active_close`);
    }
  }

  await retireSpinState(owner, { creditIds, syntheticCredits, closeRequestIds }, out);
  await retireJournal(owner, journalRefs, out);
  await retireLevelGifts(items, out);
  await retireDailyJourney(owner, items, options, out);
  retireSeasonPass(owner, items, out);

  // Отложенный показ приза спина больше не нужен (экрана спина нет).
  const revealRaw = await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
  if (revealRaw !== null) {
    try {
      const reveal: unknown = JSON.parse(revealRaw);
      if (isRecord(reveal) && reveal.owner === owner) removals.push(LEVEL_SPIN_PENDING_REVEAL_KEY);
    } catch (error) {
      out.log.push(`retire pending_reveal unreadable error=${String(error)} action=remove`);
      removals.push(LEVEL_SPIN_PENDING_REVEAL_KEY);
    }
  }

  return Object.freeze({
    writes: Object.freeze(out.writes.map((write) => Object.freeze(write))),
    removals: Object.freeze(removals),
    paidRequestIds: Object.freeze([...paidRequestIds]),
    log: Object.freeze(out.log),
  });
}

export default function __RouteShim() { return null; }
