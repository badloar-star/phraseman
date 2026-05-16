/**
 * Ставка осколками на следующий рейтинг-матч арены (очередь «Найти матч» / бот из очереди).
 * Не применяется к дуэлям с другом и invite-сессиям.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_ARENA_RANKED_WAGER } from './config';
import { getArenaFeatureFlagsOnce } from './services/arena_feature_flags';
import { withStorageLock } from './storage_mutex';
import { spendShards } from './shards_system';

const STORAGE_KEY = 'arena_ranked_next_wager_v1';

/** Множитель выплаты: ставка S → при победе +S×2 осколков вместо стандартных +1 за победу. */
export const ARENA_RANKED_WAGER_WIN_MULT = 2;

/** Допустимые размеры ставки (осколки). */
export const ARENA_RANKED_WAGER_STAKES = [1, 2, 5] as const;

export type ArenaRankedWagerStake = (typeof ARENA_RANKED_WAGER_STAKES)[number];

export type ArenaRankedPendingWager = {
  stake: ArenaRankedWagerStake;
  /** Выплата при победе (= stake * ARENA_RANKED_WAGER_WIN_MULT) */
  winPayout: number;
};

export function winPayoutForStake(stake: ArenaRankedWagerStake): number {
  return stake * ARENA_RANKED_WAGER_WIN_MULT;
}

function parseStored(raw: string | null): ArenaRankedPendingWager | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { stake?: number; winPayout?: number };
    const stake = Number(o.stake);
    if (!ARENA_RANKED_WAGER_STAKES.includes(stake as ArenaRankedWagerStake)) return null;
    const s = stake as ArenaRankedWagerStake;
    const expected = winPayoutForStake(s);
    const rawPayout = o.winPayout;
    const winPayout =
      typeof rawPayout === 'number' && Number.isFinite(rawPayout) ? Math.floor(rawPayout) : expected;
    if (winPayout !== expected) return { stake: s, winPayout: expected };
    return { stake: s, winPayout };
  } catch {
    return null;
  }
}

export async function getPendingArenaRankedWager(): Promise<ArenaRankedPendingWager | null> {
  if (!ENABLE_ARENA_RANKED_WAGER) return null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = parseStored(raw);
    if (raw && !parsed) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setPendingArenaRankedWager(stake: ArenaRankedWagerStake): Promise<void> {
  if (!ENABLE_ARENA_RANKED_WAGER) return;
  const payload: ArenaRankedPendingWager = { stake, winPayout: winPayoutForStake(stake) };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* empty */
  }
}

export async function clearPendingArenaRankedWager(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* empty */
  }
}

/**
 * Снимает ожидающую ставку с диска и возвращает её (один раз на матч).
 * При ничьей деньги не двигаются — ставка просто сбрасывается.
 */
export async function takePendingArenaRankedWager(): Promise<ArenaRankedPendingWager | null> {
  if (!ENABLE_ARENA_RANKED_WAGER) {
    await clearPendingArenaRankedWager();
    return null;
  }
  return withStorageLock(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = parseStored(raw);
      await AsyncStorage.removeItem(STORAGE_KEY);
      return parsed;
    } catch {
      return null;
    }
  });
}

export function shouldApplyArenaRankedWager(
  rankedArenaParam: boolean,
  sessionId: string | undefined,
): boolean {
  if (!ENABLE_ARENA_RANKED_WAGER) return false;
  if (!rankedArenaParam) return false;
  const sid = sessionId ?? '';
  if (!sid || sid.startsWith('invite_')) return false;
  return true;
}

/**
 * Один раз за матч: снимает pending-ставку и при проигрыше списывает stake.
 * При победе возвращает величину выплаты для `onArenaWin({ baseWinShardsOverride })`.
 * При проигре: списание ставки уже выполнено — `wagerLossStake` для анимации в UI.
 * Ничья: ставка сбрасывается без движения баланса.
 */
export async function resolveRankedArenaWagerForMatchOutcome(args: {
  rankedArenaParam: boolean;
  sessionId: string | undefined;
  won: boolean;
  isDraw: boolean;
}): Promise<{ baseWinShardsOverride?: number; wagerLossStake?: number }> {
  const remoteEnabled = ENABLE_ARENA_RANKED_WAGER
    ? (await getArenaFeatureFlagsOnce()).rankedWagerEnabled === true
    : false;
  if (!remoteEnabled) {
    if (args.rankedArenaParam) {
      const sid = args.sessionId ?? '';
      if (sid && !sid.startsWith('invite_')) {
        await clearPendingArenaRankedWager();
      }
    }
    return {};
  }
  if (!shouldApplyArenaRankedWager(args.rankedArenaParam, args.sessionId)) return {};
  const w = await takePendingArenaRankedWager();
  if (!w) return {};
  if (args.isDraw) return {};
  if (!args.won) {
    await spendShards(w.stake, 'arena_match_wager_loss');
    return { wagerLossStake: w.stake };
  }
  return { baseWinShardsOverride: w.winPayout };
}
