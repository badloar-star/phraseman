// video_full_reward.ts — награда +500 монет за полный просмотр видео (один раз навсегда на (uid, videoId)).
// зачем (владелец 05.11: «за каждое видео за фулл просмотр давать 500 монеток, при завершении иконка и начисление +500 сразу»; без дневного
// предела; без воскресного ×2; повторный просмотр не даёт): монеты выдаёт ТЕЛЕФОН через тот же журнал кошелька, что экзамен главы
// (enqueueLevelSpinStarGrant, giftId stars_500, requestId = videofull_<sha1(uid|videoId)> — один ключ на пару = идемпотентность на телефоне и на сервере,
// Ядро 05.11). Баланс растёт сразу (оптимистично), сервер догоняет фоном. Локальный список «уже получено» (uid) отдаёт плашкам «монета с галочкой».
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';

const LOG = '[VIDEO-FULL]';
export const VIDEO_FULL_REWARD_COINS = 500;
export const VIDEO_FULL_GIFT_ID = 'stars_500';
export const VIDEO_FULL_REQUEST_PREFIX = 'videofull_';
/** Ключ в семействе story_events_v1: — стирается при выходе/удалении аккаунта вместе с остальным локальным состоянием. */
export const videoFullRewardedKey = (owner: string): string => `story_events_v1:video_full_rewarded:${owner}`;

export type VideoFullGrantOutcome = 'granted' | 'repeat' | 'skipped' | 'failed';
export type VideoFullRewardEvent = Readonly<{ videoId: string; amount: number }>;

const EMPTY_SET: ReadonlySet<string> = new Set();
const rewarded = new Map<string, Set<string>>();
const inflight = new Set<string>();
const eventListeners = new Set<(e: VideoFullRewardEvent) => void>();
const changeListeners = new Set<() => void>();
let watching = false;

function notifyChange(): void {
  changeListeners.forEach((l) => { try { l(); } catch (e) { console.warn(LOG, 'change_listener_failed', String((e as Error)?.message ?? e).slice(0, 80)); } });
}

function watchAccount(): void {
  if (watching) return;
  watching = true;
  subscribeAccountGeneration(() => { rewarded.clear(); inflight.clear(); console.log(LOG, 'rewarded_memory_reset account_changed'); notifyChange(); }); // guard-ok: смена аккаунта
}

/** requestId награды: videofull_ + 40 hex sha1(uid|videoId). */
export async function videoFullRequestId(owner: string, videoId: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, `${owner}|${videoId}`);
  return `${VIDEO_FULL_REQUEST_PREFIX}${hex.toLowerCase()}`;
}

async function hydrate(owner: string): Promise<Set<string>> {
  const cached = rewarded.get(owner);
  if (cached) return cached;
  let ids: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(videoFullRewardedKey(owner));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    console.log(LOG, 'rewarded_read', JSON.stringify({ owner: owner.slice(0, 6), count: ids.length, source: raw ? 'disk' : 'empty' })); // guard-ok: одна строка на чтение
  } catch (error: unknown) {
    console.warn(LOG, 'rewarded_read_failed → пусто', String((error as Error)?.message ?? error).slice(0, 120));
  }
  const set = rewarded.get(owner) ?? new Set(ids); // память, изменённая за время чтения, свежее диска
  rewarded.set(owner, set);
  notifyChange();
  return set;
}

function persist(owner: string, set: ReadonlySet<string>, reason: string): void {
  void AsyncStorage.setItem(videoFullRewardedKey(owner), JSON.stringify([...set])).catch((error: unknown) => {
    console.warn(LOG, 'rewarded_write_failed', reason, String((error as Error)?.message ?? error).slice(0, 120));
  });
  notifyChange();
}

/** Идентификаторы роликов, за которые награда уже получена (для плашек «монета с галочкой»). Пусто, пока список не прочитан. */
export function peekVideoFullRewarded(owner: string | null): ReadonlySet<string> {
  watchAccount();
  return (owner ? rewarded.get(owner) : null) ?? EMPTY_SET;
}

export async function readVideoFullRewarded(owner: string): Promise<ReadonlySet<string>> {
  watchAccount();
  return hydrate(owner);
}

export function subscribeVideoFullRewarded(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => { changeListeners.delete(listener); };
}

export function subscribeVideoFullRewardEvents(listener: (e: VideoFullRewardEvent) => void): () => void {
  eventListeners.add(listener);
  return () => { eventListeners.delete(listener); };
}

/**
 * Выдаёт +500 за ролик ОДИН раз. Порядок: «получено» пишем в память СРАЗУ (повтор/двойной тап/гонка → 'repeat'), затем монеты в журнал кошелька
 * (баланс растёт сразу); при ошибке журнала — откат отметки и 'failed' (следующий порог/повторный заход попробует снова).
 */
export async function grantVideoFullReward(videoId: string): Promise<VideoFullGrantOutcome> {
  watchAccount();
  const token = captureAccountGeneration();
  const owner = token.phase === 'active' ? token.stableId?.trim() ?? null : null;
  console.log(LOG, 'grant:enter', JSON.stringify({ videoId, phase: token.phase, hasOwner: owner !== null })); // guard-ok: вход
  if (!owner || !videoId) {
    console.warn(LOG, 'grant:skip', JSON.stringify({ reason: !owner ? 'no_active_account' : 'no_video_id', phase: token.phase })); // guard-ok: ранний выход
    return 'skipped';
  }
  const flightKey = `${owner}|${videoId}`;
  if (inflight.has(flightKey)) { console.log(LOG, 'grant:repeat_skip', JSON.stringify({ videoId, why: 'in_flight' })); return 'repeat'; } // guard-ok: двойной вызов
  inflight.add(flightKey);
  try {
    const set = await hydrate(owner);
    if (set.has(videoId)) { console.log(LOG, 'grant:repeat_skip', JSON.stringify({ videoId, why: 'already_rewarded' })); return 'repeat'; } // guard-ok: повтор не награждается
    // зачем: копия при записи — подписчики (useSyncExternalStore) видят новую ссылку и перерисовывают плашки сразу
    const marked = new Set(set);
    marked.add(videoId);
    rewarded.set(owner, marked);
    persist(owner, marked, 'mark');
    try {
      const requestId = await videoFullRequestId(owner, videoId);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const wallet = require('./level_spin_star_grants') as typeof import('./level_spin_star_grants');
      await wallet.enqueueLevelSpinStarGrant({ token, requestId, lane: 'base', giftId: VIDEO_FULL_GIFT_ID, promotionEligibility: 'gameplay' }, { syncNow: false });
      console.log(LOG, 'grant:result', JSON.stringify({ videoId, requestId, outcome: 'granted', amount: VIDEO_FULL_REWARD_COINS, source: 'local_journal' })); // guard-ok: итог — начислено на телефоне
      eventListeners.forEach((l) => { try { l({ videoId, amount: VIDEO_FULL_REWARD_COINS }); } catch (e) { console.warn(LOG, 'event_listener_failed', String((e as Error)?.message ?? e).slice(0, 80)); } });
      void wallet.syncPendingLevelSpinStarGrants(token).then((sync) => {
        console.log(LOG, 'grant:synced', JSON.stringify({ videoId, synced: sync.synced, pending: sync.pending })); // guard-ok: что сохранил сервер
      }, (error: unknown) => {
        console.warn(LOG, 'grant:sync_failed', JSON.stringify({ videoId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: причина; операция остаётся в очереди
      });
      return 'granted';
    } catch (error: unknown) {
      const rolled = new Set(rewarded.get(owner) ?? marked);
      rolled.delete(videoId);
      rewarded.set(owner, rolled);
      persist(owner, rolled, 'rollback');
      console.warn(LOG, 'grant:failed', JSON.stringify({ videoId, reason: error instanceof Error ? error.message : String(error), rolledBack: true })); // guard-ok: откат отметки
      return 'failed';
    }
  } finally {
    inflight.delete(flightKey);
  }
}

export function __resetVideoFullRewardForTests(): void { rewarded.clear(); inflight.clear(); eventListeners.clear(); changeListeners.clear(); }

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
