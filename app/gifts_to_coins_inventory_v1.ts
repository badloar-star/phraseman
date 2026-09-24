/**
 * D51: опись неиспользованных спинов и подарков — ТОЛЬКО чтение сырых ключей.
 *
 * зачем (спецификация GIFTS_TO_COINS_MIGRATION.md §5.2 п.3, риск «истечение при
 * чтении»): штатный loadPendingLevelGiftInventory удаляет просроченное прямо в
 * момент чтения, а normalizeState спинов бросает на битом состоянии. Миграции
 * нужна честная опись того, что лежит на телефоне, поэтому здесь свой
 * бережный разбор тех же ключей. Модуль ничего не пишет.
 *
 * Источники (§1): п.1 кредиты спинов, п.2 незабранные призы спина, п.3 платный
 * спин с незабранным призом, п.4 подарки уровня, п.5 «Дневной путь» (передаётся
 * снаружи — его читает штатный проверенный путь без побочных эффектов).
 * Реферальная рулетка (D52) сюда НЕ входит: у неё отдельное хранилище.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX } from '../constants/daily_journey_gift_storage_keys';
import { LOCAL_LEVEL_SPIN_STATE_KEY } from '../constants/local_level_spin_storage_keys';
import {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
} from './level_up_storage_keys';
import {
  FREE_SPIN_CAP,
  FREE_SPIN_COINS,
  isPlusGiftId,
  valueDailyJourneyReward,
  valueGiftForCoins,
  valuePaidSpinPrize,
  type DailyJourneyRewardKind,
  type GiftCoinValuation,
  type PlusGiftId,
} from './gifts_to_coins_table_v1';

/** 72 ч — тот же срок, что GIFT_TTL_MS/LOCAL_RESULT_TTL_MS; импорт не тянем ради константы. */
export const GIFTS_TO_COINS_GIFT_TTL_MS = 72 * 60 * 60 * 1000;

export type GiftsToCoinsSource =
  | 'spin_credit'
  | 'spin_prize'
  | 'paid_spin'
  | 'level_gift'
  | 'daily_journey';

export type GiftsToCoinsRetireRef =
  | Readonly<{ kind: 'spin_credit'; creditId: string; level: number; synthetic: boolean }>
  | Readonly<{ kind: 'journal'; requestId: string; lane: string; paid: boolean }>
  | Readonly<{ kind: 'receipt'; requestId: string; paid: boolean }>
  | Readonly<{ kind: 'level_gift'; level: number; part: 'single' | 'f2p' | 'prem'; giftId: string }>
  | Readonly<{
    kind: 'daily_journey';
    operationId: string;
    payloadFingerprint: string;
    reward: Readonly<{ kind: DailyJourneyRewardKind; amount: number }>;
    createdAtMs: number;
  }>;

export type GiftsToCoinsItem = Readonly<{
  key: string;
  source: GiftsToCoinsSource;
  giftId: string;
  coins: number;
  plus?: PlusGiftId;
  retire: GiftsToCoinsRetireRef;
}>;

export type GiftsToCoinsCorruptSource = 'spin_state' | 'spin_journal' | 'level_gifts' | 'daily_journey';

export type GiftsToCoinsInventory = Readonly<{
  items: readonly GiftsToCoinsItem[];
  expired: Readonly<Record<'spin_prize' | 'level_gift', number>>;
  corruptSources: readonly GiftsToCoinsCorruptSource[];
  /** Бесплатные спины сверх потолка 20: списаны без оплаты (D53). */
  cappedSpins: number;
  unknownGiftIds: readonly string[];
  spinCreditsFrom: 'state_key' | 'balance_cache' | 'none' | 'corrupt';
}>;

/** Незабранный подарок «Дневного пути» в том виде, в каком его отдаёт штатное чтение. */
export type GiftsToCoinsDailyJourneyPending = Readonly<{
  operationId: string;
  ownerStableId: string;
  payloadFingerprint: string;
  createdAtMs: number;
  reward: Readonly<{ kind: DailyJourneyRewardKind; amount: number }>;
}>;

const LOG = '[GIFTS-TO-COINS]';
const LOCAL_SPIN_CREDIT_ID_RE = /^[A-Za-z0-9_:.-]{4,120}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{16,96}$/;

export function localLevelSpinStateStorageKey(owner: string): string {
  return `${LOCAL_LEVEL_SPIN_STATE_KEY}:${encodeURIComponent(owner)}`;
}

export function paidLevelSpinEnvelopeStoragePrefix(owner: string): string {
  return `paid_level_spin_envelope_v1:${encodeURIComponent(owner)}:`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type RawSpinState = Readonly<{
  credits: readonly Readonly<{ id: string; level: number }>[];
  activeReceipt: Readonly<{
    requestId: string; baseGiftId: string; expiresAtMs: number; paid: boolean;
  }> | null;
  closedRequestIds: readonly string[];
}>;

/** Бережный разбор состояния спинов: битое НЕ превращаем в ноль (§5.6). */
export function parseRawSpinState(raw: string, owner: string): RawSpinState {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.owner !== owner || !Array.isArray(parsed.credits)) {
    throw new Error('spin_state_shape_invalid');
  }
  const credits = parsed.credits.map((credit) => {
    if (!isRecord(credit) || typeof credit.id !== 'string' || !LOCAL_SPIN_CREDIT_ID_RE.test(credit.id)
      || !Number.isInteger(credit.level)) {
      throw new Error('spin_state_credit_invalid');
    }
    return Object.freeze({ id: credit.id, level: Number(credit.level) });
  });
  const closed = Array.isArray(parsed.closedRequestIds)
    ? parsed.closedRequestIds.filter((id): id is string => typeof id === 'string')
    : [];
  const receipt = isRecord(parsed.activeReceipt) ? parsed.activeReceipt : null;
  const activeReceipt = receipt && typeof receipt.requestId === 'string'
    && typeof receipt.baseGiftId === 'string'
    ? Object.freeze({
      requestId: receipt.requestId,
      baseGiftId: receipt.baseGiftId,
      expiresAtMs: Number(receipt.expiresAtMs),
      paid: receipt.schemaVersion === 3,
    })
    : null;
  return Object.freeze({ credits, activeReceipt, closedRequestIds: closed });
}

type SpinCreditRead = Readonly<{
  from: GiftsToCoinsInventory['spinCreditsFrom'];
  credits: readonly Readonly<{ id: string; level: number; synthetic: boolean }>[];
  state: RawSpinState | null;
}>;

async function readSpinCredits(owner: string): Promise<SpinCreditRead> {
  const raw = await AsyncStorage.getItem(localLevelSpinStateStorageKey(owner));
  if (raw !== null) {
    try {
      const state = parseRawSpinState(raw, owner);
      return Object.freeze({
        from: 'state_key' as const,
        credits: state.credits.map((credit) => Object.freeze({ ...credit, synthetic: false })),
        state,
      });
    } catch (error) {
      console.warn(`${LOG} catch step=inventory_spin_state error=${String(error)}`);
      return Object.freeze({ from: 'corrupt' as const, credits: [], state: null });
    }
  }
  // Кэш баланса — только когда основного ключа нет (§1: иначе задвоение).
  const cacheRaw = await AsyncStorage.getItem(LEVEL_SPIN_BALANCE_CACHE_KEY);
  if (cacheRaw === null) return Object.freeze({ from: 'none' as const, credits: [], state: null });
  try {
    const cache: unknown = JSON.parse(cacheRaw);
    if (!isRecord(cache) || cache.owner !== owner) {
      return Object.freeze({ from: 'none' as const, credits: [], state: null });
    }
    const balance = Number(cache.balance);
    if (!Number.isSafeInteger(balance) || balance < 0 || balance > 59) throw new Error('balance_cache_invalid');
    // Те же id, что чеканит migrateCachedBalanceToLocalCredits в local_level_spins.
    const credits = Array.from({ length: balance }, (_, index) => {
      const level = index + 2;
      return Object.freeze({ id: `local_spin_v1_${String(level).padStart(3, '0')}`, level, synthetic: true });
    });
    return Object.freeze({ from: 'balance_cache' as const, credits, state: null });
  } catch (error) {
    console.warn(`${LOG} catch step=inventory_balance_cache error=${String(error)}`);
    return Object.freeze({ from: 'corrupt' as const, credits: [], state: null });
  }
}

type RawJournalEntry = Readonly<{
  requestId: string;
  creditId: string;
  expiresAtMs: number;
  occurrences: readonly Readonly<{ lane: string; giftId: string; claimed: boolean }>[];
}>;

function parseJournal(raw: string | null, owner: string): RawJournalEntry[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('spin_journal_not_array');
  return parsed.flatMap((entry): RawJournalEntry[] => {
    if (!isRecord(entry) || entry.owner !== owner) return [];
    if (typeof entry.requestId !== 'string' || !Array.isArray(entry.occurrences)) {
      throw new Error('spin_journal_entry_invalid');
    }
    return [Object.freeze({
      requestId: entry.requestId,
      creditId: typeof entry.creditId === 'string' ? entry.creditId : '',
      expiresAtMs: Number(entry.expiresAtMs),
      occurrences: entry.occurrences.map((occurrence) => {
        if (!isRecord(occurrence) || typeof occurrence.giftId !== 'string'
          || typeof occurrence.lane !== 'string' || typeof occurrence.claimed !== 'boolean') {
          throw new Error('spin_journal_occurrence_invalid');
        }
        return Object.freeze({
          lane: occurrence.lane, giftId: occurrence.giftId, claimed: occurrence.claimed,
        });
      }),
    })];
  });
}

type EnvelopeRead = Readonly<{ requestId: string; baseGiftId: string; expiresAtMs: number }>;

async function readOrphanEnvelopes(owner: string): Promise<EnvelopeRead[]> {
  const prefix = paidLevelSpinEnvelopeStoragePrefix(owner);
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
  if (keys.length === 0) return [];
  const rows = await AsyncStorage.multiGet(keys);
  return rows.flatMap(([key, raw]): EnvelopeRead[] => {
    try {
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (!isRecord(value) || value.ownerStableId !== owner || typeof value.requestId !== 'string'
        || !isRecord(value.receipt) || typeof value.receipt.baseGiftId !== 'string') {
        console.warn(`${LOG} skip envelope reason=shape_invalid key=${key.slice(-12)}`);
        return [];
      }
      return [Object.freeze({
        requestId: value.requestId,
        baseGiftId: value.receipt.baseGiftId,
        expiresAtMs: Number(value.receipt.expiresAtMs),
      })];
    } catch (error) {
      console.warn(`${LOG} catch step=inventory_envelope key=${key.slice(-12)} error=${String(error)}`);
      return [];
    }
  });
}

/** operationId подарка, чей штатный клейм «Дневного пути» начат и не закончен. */
async function readDailyJourneyClaimInFlight(owner: string): Promise<string | null> {
  const key = `${DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX}${encodeURIComponent(owner)}:__prepared__:`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    const operationId = isRecord(value) && isRecord(value.occurrence) ? value.occurrence.operationId : null;
    return typeof operationId === 'string' ? operationId : null;
  } catch (error) {
    console.warn(`${LOG} catch step=inventory_dj_claim_prepared error=${String(error)} action=ignore`);
    return null;
  }
}

function isExpired(expiresAtMs: number, nowMs: number): boolean {
  return Number.isFinite(expiresAtMs) && expiresAtMs > 0 && nowMs >= expiresAtMs;
}

type GiftLike = Readonly<{ id: string; choices?: readonly string[] }>;

function giftLike(value: unknown): GiftLike | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const choices = Array.isArray(value.choices)
    ? value.choices.flatMap((choice) => (isRecord(choice) && typeof choice.id === 'string' ? [choice.id] : []))
    : undefined;
  return Object.freeze({ id: value.id, ...(choices ? { choices } : {}) });
}

function parseRecord(raw: string | null): Record<string, unknown> {
  if (raw === null || raw === '') return {};
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('record_invalid');
  return parsed;
}

class ItemCollector {
  readonly items: GiftsToCoinsItem[] = [];
  readonly unknownGiftIds = new Set<string>();

  add(
    source: GiftsToCoinsSource,
    key: string,
    giftId: string,
    valuation: GiftCoinValuation,
    retire: GiftsToCoinsRetireRef,
  ): void {
    if (valuation.kind === 'unknown') {
      this.unknownGiftIds.add(giftId);
      console.warn(`${LOG} branch unknown_gift source=${source} giftId=${giftId} coins=${valuation.coins}`);
    }
    this.items.push(Object.freeze({
      key,
      source,
      giftId,
      coins: valuation.coins,
      ...(valuation.kind === 'plus' && isPlusGiftId(giftId) ? { plus: giftId } : {}),
      retire,
    }));
  }
}

/**
 * Опись на момент nowMs. Просроченное (>72 ч) не платим (D53), но считаем.
 * Потолок 20 бесплатных спинов общий для кредитов и спинов «Дневного пути».
 */
export async function readGiftsToCoinsInventory(
  owner: string,
  nowMs: number,
  dailyJourneyPending: readonly GiftsToCoinsDailyJourneyPending[] | 'corrupt',
): Promise<GiftsToCoinsInventory> {
  const collector = new ItemCollector();
  const corrupt: GiftsToCoinsCorruptSource[] = [];
  const expired = { spin_prize: 0, level_gift: 0 };
  let freeSpinsLeft = FREE_SPIN_CAP;
  let cappedSpins = 0;

  // п.1 — кредиты спинов.
  const spin = await readSpinCredits(owner);
  if (spin.from === 'corrupt') corrupt.push('spin_state');
  for (const credit of spin.credits) {
    const paid = freeSpinsLeft > 0;
    if (paid) freeSpinsLeft -= 1; else cappedSpins += 1;
    collector.add('spin_credit', `credit:${credit.id}`, 'spin_credit',
      { coins: paid ? FREE_SPIN_COINS : 0, kind: 'coins' },
      { kind: 'spin_credit', creditId: credit.id, level: credit.level, synthetic: credit.synthetic });
  }
  console.log(`${LOG} source=spin_credits count=${spin.credits.length} from=${spin.from} coinsEach=${FREE_SPIN_COINS} capped=${cappedSpins}`);

  // п.2/п.3 — призы спина в журнале (+ активный чек и сиротские конверты).
  let journal: RawJournalEntry[] = [];
  let journalOk = true;
  try {
    journal = parseJournal(await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY), owner);
  } catch (error) {
    journalOk = false;
    corrupt.push('spin_journal');
    console.warn(`${LOG} catch step=inventory_spin_journal error=${String(error)}`);
  }
  const journalRequestIds = new Set(journal.map((entry) => entry.requestId));
  const prizeLog: string[] = [];
  for (const entry of journal) {
    const paid = entry.creditId.startsWith('paid_level_spin:');
    for (const occurrence of entry.occurrences) {
      if (occurrence.claimed) continue;
      if (isExpired(entry.expiresAtMs, nowMs)) { expired.spin_prize += 1; continue; }
      const valuation = paid ? valuePaidSpinPrize(occurrence.giftId) : valueGiftForCoins(occurrence.giftId);
      collector.add(paid ? 'paid_spin' : 'spin_prize', `journal:${entry.requestId}:${occurrence.lane}`,
        occurrence.giftId, valuation,
        { kind: 'journal', requestId: entry.requestId, lane: occurrence.lane, paid });
      prizeLog.push(`${occurrence.giftId}:${valuation.coins}${paid ? ':paid' : ''}`);
    }
  }
  // Чек без записи в журнале: крах между «сняли кредит» и «записали приз».
  // Если журнал битый — чеки не описываем, иначе приз из журнала оплатили бы дважды.
  if (journalOk) {
    const closed = new Set(spin.state?.closedRequestIds ?? []);
    const receipt = spin.state?.activeReceipt ?? null;
    const seen = new Set<string>();
    if (receipt && REQUEST_ID_RE.test(receipt.requestId) && !closed.has(receipt.requestId)
      && !journalRequestIds.has(receipt.requestId)) {
      seen.add(receipt.requestId);
      if (isExpired(receipt.expiresAtMs, nowMs)) expired.spin_prize += 1;
      else {
        const valuation = receipt.paid ? valuePaidSpinPrize(receipt.baseGiftId) : valueGiftForCoins(receipt.baseGiftId);
        collector.add(receipt.paid ? 'paid_spin' : 'spin_prize', `receipt:${receipt.requestId}`,
          receipt.baseGiftId, valuation, { kind: 'receipt', requestId: receipt.requestId, paid: receipt.paid });
        prizeLog.push(`${receipt.baseGiftId}:${valuation.coins}:receipt`);
      }
    }
    if (spin.from === 'state_key') {
      for (const envelope of await readOrphanEnvelopes(owner)) {
        if (closed.has(envelope.requestId) || journalRequestIds.has(envelope.requestId)
          || seen.has(envelope.requestId) || !REQUEST_ID_RE.test(envelope.requestId)) continue;
        if (isExpired(envelope.expiresAtMs, nowMs)) { expired.spin_prize += 1; continue; }
        const valuation = valuePaidSpinPrize(envelope.baseGiftId);
        collector.add('paid_spin', `receipt:${envelope.requestId}`, envelope.baseGiftId, valuation,
          { kind: 'receipt', requestId: envelope.requestId, paid: true });
        prizeLog.push(`${envelope.baseGiftId}:${valuation.coins}:envelope`);
      }
    }
  }
  console.log(`${LOG} source=spin_prizes pending=${prizeLog.length} expired=${expired.spin_prize} items=${prizeLog.join(',') || '-'}`);

  // п.4 — подарки уровня (глобальные ключи активного аккаунта).
  try {
    const [[, singleRaw], [, dualRaw], [, stampsRaw]] = await AsyncStorage.multiGet([
      UNCLAIMED_GIFTS_KEY, UNCLAIMED_DUAL_GIFTS_KEY, UNCLAIMED_GIFT_RECEIVED_AT_KEY,
    ]);
    const single = parseRecord(singleRaw);
    const dual = parseRecord(dualRaw);
    let stamps: Record<string, unknown> = {};
    try { stamps = parseRecord(stampsRaw); } catch (error) {
      // Нет штампа = подарок не просрочен (так же считает экран): не повод блокировать.
      console.warn(`${LOG} catch step=inventory_gift_stamps error=${String(error)} action=treat_as_unstamped`);
    }
    const levelExpired = (level: string): boolean => {
      const stamp = Number(stamps[level]);
      return Number.isFinite(stamp) && stamp > 0 && nowMs >= stamp + GIFTS_TO_COINS_GIFT_TTL_MS;
    };
    const levelLog: string[] = [];
    let singleCount = 0;
    let dualCount = 0;
    const addLevelGift = (level: string, part: 'single' | 'f2p' | 'prem', raw: unknown): void => {
      const gift = giftLike(raw);
      if (!gift || !Number.isInteger(Number(level))) {
        console.warn(`${LOG} skip level_gift reason=shape_invalid level=${level} part=${part}`);
        return;
      }
      const valuation = valueGiftForCoins(gift.id, gift.choices);
      collector.add('level_gift', `level:${level}:${part}`, gift.id, valuation,
        { kind: 'level_gift', level: Number(level), part, giftId: gift.id });
      levelLog.push(`${gift.id}:${valuation.coins}`);
    };
    for (const [level, raw] of Object.entries(single)) {
      if (levelExpired(level)) { expired.level_gift += 1; continue; }
      singleCount += 1;
      addLevelGift(level, 'single', raw);
    }
    for (const [level, pair] of Object.entries(dual)) {
      if (levelExpired(level)) { expired.level_gift += 1; continue; }
      if (!isRecord(pair)) continue;
      dualCount += 1;
      addLevelGift(level, 'f2p', pair.f2p);
      addLevelGift(level, 'prem', pair.prem);
    }
    console.log(`${LOG} source=level_gifts single=${singleCount} dual=${dualCount} expired=${expired.level_gift} items=${levelLog.join(',') || '-'}`);
  } catch (error) {
    corrupt.push('level_gifts');
    console.warn(`${LOG} catch step=inventory_level_gifts error=${String(error)}`);
  }

  // п.5 — «Дневной путь» (без срока).
  if (dailyJourneyPending === 'corrupt') {
    corrupt.push('daily_journey');
  } else {
    const kinds: Record<string, number> = {};
    const inFlightClaim = await readDailyJourneyClaimInFlight(owner);
    for (const occurrence of dailyJourneyPending) {
      if (occurrence.ownerStableId !== owner) continue;
      // зачем: незавершённый штатный клейм сам доведёт выдачу при следующем
      // заходе; оплатить его ещё и монетами = двойная выплата.
      if (inFlightClaim === occurrence.operationId) {
        console.log(`${LOG} skip daily_journey op=${occurrence.operationId.slice(0, 12)} reason=claim_in_flight`);
        continue;
      }
      const { kind, amount } = occurrence.reward;
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      let valuation = valueDailyJourneyReward(kind, amount);
      if (kind === 'spins') {
        const paidSpins = Math.min(Math.max(0, amount), freeSpinsLeft);
        freeSpinsLeft -= paidSpins;
        cappedSpins += Math.max(0, amount - paidSpins);
        valuation = { coins: paidSpins * FREE_SPIN_COINS, kind: 'coins' };
      }
      collector.add('daily_journey', `dj:${occurrence.operationId}`, `dj_${kind}_${amount}`, valuation, {
        kind: 'daily_journey',
        operationId: occurrence.operationId,
        payloadFingerprint: occurrence.payloadFingerprint,
        reward: Object.freeze({ kind, amount }),
        createdAtMs: occurrence.createdAtMs,
      });
    }
    console.log(`${LOG} source=daily_journey pending=${dailyJourneyPending.length} kinds=${Object.entries(kinds).map(([k, n]) => `${k}:${n}`).join(',') || '-'}`);
  }

  return Object.freeze({
    items: Object.freeze(collector.items),
    expired: Object.freeze(expired),
    corruptSources: Object.freeze(corrupt),
    cappedSpins,
    unknownGiftIds: Object.freeze([...collector.unknownGiftIds].sort()),
    spinCreditsFrom: spin.from,
  });
}

export default function __RouteShim() { return null; }
