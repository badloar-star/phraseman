// Клиентская часть «Сокровищницы»: локальная копия инвентаря + вызов серверного
// движка дропов. ЕДИНСТВЕННЫЙ источник выдачи — CF collectiblesClaimDrop:
// ключи collectibles_owned_v1 / collectibles_state_v1 в blocklist firestore.rules,
// клиент их в облако не пишет (cloud_sync SERVER_OWNED_PROGRESS_KEYS). Локальная
// копия — кэш для UI; при переустановке восстанавливается restoreFromCloud.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { isCollectiblesEnabled } from '../remote_flags';
import { commitConfirmedExternalShardEvent } from '../shards_system';
import { emitAppEvent } from '../events';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import {
  CollectibleRarity,
  collectibleSets,
  collectiblesTotalCount,
  findCollectibleCard,
} from './catalog';
import { DebugLogger } from '../debug-logger';

export const COLLECTIBLES_OWNED_KEY = 'collectibles_owned_v1';
/** Локальный (не синкается): какие карточки юзер уже видел в Сокровищнице. */
const COLLECTIBLES_SEEN_KEY = 'collectibles_seen_local_v1';

const FUNCTIONS_REGION = 'us-central1';

export type CollectiblesOwnedMap = Record<string, number>;

export type CollectibleDropOutcome = {
  cardId: string;
  setId: string;
  rarity: CollectibleRarity;
  setCompleted: boolean;
  secretCardId: string | null;
  bonusShards: number;
};

type ClaimResponse = {
  ok?: boolean;
  dropped?: boolean;
  alreadyClaimed?: boolean;
  reason?: string;
  card?: { id?: string; setId?: string; rarity?: string } | null;
  setCompleted?: boolean;
  secretCardId?: string | null;
  bonusShards?: number;
};

function parseOwnedMap(raw: unknown): CollectiblesOwnedMap {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: CollectiblesOwnedMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(value);
      out[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
    }
    return out;
  } catch {
    return {};
  }
}

// Синхронный кэш в памяти: чтение AsyncStorage асинхронно, поэтому экран при
// КАЖДОМ открытии мелькал пустым состоянием до прихода данных. После первой
// загрузки держим карту в памяти → повторные открытия рисуют сразу правильно,
// без вспышки. Кэш обновляется на каждом успешном чтении/записи инвентаря.
const ownedMapCacheByAccount = new Map<string, CollectiblesOwnedMap>();
const OWNED_CACHE_MAX_ACCOUNT_GENERATIONS = 4;

function setOwnedMapCache(key: string, value: CollectiblesOwnedMap): void {
  ownedMapCacheByAccount.delete(key);
  ownedMapCacheByAccount.set(key, value);
  while (ownedMapCacheByAccount.size > OWNED_CACHE_MAX_ACCOUNT_GENERATIONS) {
    const oldest = ownedMapCacheByAccount.keys().next().value as string | undefined;
    if (!oldest) break;
    ownedMapCacheByAccount.delete(oldest);
  }
}

function accountOperationKey(token: AccountGenerationToken): string | null {
  return token.stableId ? accountScopeKey(token) : null;
}

function isAccountOperationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

/** Синхронный снимок инвентаря (или null, если ещё ни разу не читали). */
export function getCollectiblesOwnedMapSync(): CollectiblesOwnedMap | null {
  const cacheKey = accountOperationKey(captureAccountGeneration());
  return cacheKey ? (ownedMapCacheByAccount.get(cacheKey) ?? null) : null;
}

export async function getCollectiblesOwnedMap(): Promise<CollectiblesOwnedMap> {
  const accountToken = captureAccountGeneration();
  const cacheKey = accountOperationKey(accountToken);
  if (!cacheKey || !isAccountOperationCurrent(accountToken)) return {};
  try {
    const map = parseOwnedMap(await AsyncStorage.getItem(COLLECTIBLES_OWNED_KEY));
    if (!isAccountOperationCurrent(accountToken)) return {};
    setOwnedMapCache(cacheKey, map);
    return map;
  } catch {
    return isAccountOperationCurrent(accountToken)
      ? (ownedMapCacheByAccount.get(cacheKey) ?? {})
      : {};
  }
}

/** Сколько собрано из известных каталогу позиций (чужие/будущие id не считаем). */
export async function getCollectiblesProgress(): Promise<{ owned: number; total: number }> {
  const map = await getCollectiblesOwnedMap();
  let owned = 0;
  for (const id of Object.keys(map)) {
    if (findCollectibleCard(id)) owned += 1;
  }
  return { owned, total: collectiblesTotalCount() };
}

async function getCollectiblesSeenSetForAccount(
  accountToken: AccountGenerationToken,
): Promise<Set<string>> {
  if (!accountOperationKey(accountToken) || !isAccountOperationCurrent(accountToken)) return new Set();
  try {
    const raw = await AsyncStorage.getItem(COLLECTIBLES_SEEN_KEY);
    if (!isAccountOperationCurrent(accountToken)) return new Set();
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export async function getCollectiblesSeenSet(): Promise<Set<string>> {
  return getCollectiblesSeenSetForAccount(captureAccountGeneration());
}

export async function markCollectiblesSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const accountToken = captureAccountGeneration();
  if (!accountOperationKey(accountToken) || !isAccountOperationCurrent(accountToken)) return;
  try {
    await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) return;
      const seen = await getCollectiblesSeenSetForAccount(accountToken);
      if (!isAccountOperationCurrent(accountToken)) return;
      for (const id of ids) seen.add(id);
      await AsyncStorage.setItem(COLLECTIBLES_SEEN_KEY, JSON.stringify([...seen]));
    });
  } catch (e) {
      // некритично — бейдж «новое»
      DebugLogger.error('storage:seen', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function getCollectiblesUnseenCount(): Promise<number> {
  const [map, seen] = await Promise.all([getCollectiblesOwnedMap(), getCollectiblesSeenSet()]);
  let unseen = 0;
  for (const id of Object.keys(map)) {
    if (!seen.has(id) && findCollectibleCard(id)) unseen += 1;
  }
  return unseen;
}

function callable<TReq, TRes>(name: string): ((data: TReq) => Promise<{ data: TRes }>) | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as
      (data: TReq) => Promise<{ data: TRes }>;
  } catch {
    return null;
  }
}

async function applyDropLocally(
  outcome: CollectibleDropOutcome,
  accountToken: AccountGenerationToken,
): Promise<boolean> {
  const accountKey = accountOperationKey(accountToken);
  if (!accountKey || !isAccountOperationCurrent(accountToken)) return false;
  try {
    const owned = await getCollectiblesOwnedMap();
    if (!isAccountOperationCurrent(accountToken)) return false;
    const now = Date.now();
    const next: CollectiblesOwnedMap = { ...owned, [outcome.cardId]: now };
    if (outcome.secretCardId) next[outcome.secretCardId] = now;
    const committed = await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) return false;
      await AsyncStorage.setItem(COLLECTIBLES_OWNED_KEY, JSON.stringify(next));
      return isAccountOperationCurrent(accountToken);
    });
    if (!committed) return false;
    setOwnedMapCache(accountKey, next);
    emitAppEvent('collectibles_changed');
    return true;
  } catch {
    /* облако — источник правды, локальный кэш догонит restore */
    return false;
  }
}

/**
 * DEV-ONLY: открыть ВСЕ карточки каталога (все сеты + секретки) в локальном кэше.
 * Гейт __DEV__ — в проде это no-op, чтобы случайно не выдать всё в релизе.
 * Не пишет в облако (collectibles_owned_v1 — server-owned); это чисто локальный
 * UI-кэш для проверки экрана коллекции. Эмитит collectibles_changed → экран перерисуется.
 */
export async function devUnlockAllCollectibles(): Promise<number> {
  if (!__DEV__) return 0;
  const accountToken = captureAccountGeneration();
  const accountKey = accountOperationKey(accountToken);
  if (!accountKey || !isAccountOperationCurrent(accountToken)) return 0;
  try {
    const owned = await getCollectiblesOwnedMap();
    if (!isAccountOperationCurrent(accountToken)) return 0;
    const next: CollectiblesOwnedMap = { ...owned };
    const now = Date.now();
    for (const set of collectibleSets()) {
      for (const card of set.cards) {
        if (!next[card.id]) next[card.id] = now;
      }
      if (!next[set.secret.id]) next[set.secret.id] = now;
    }
    const committed = await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) return false;
      await AsyncStorage.setItem(COLLECTIBLES_OWNED_KEY, JSON.stringify(next));
      return isAccountOperationCurrent(accountToken);
    });
    if (!committed) return 0;
    setOwnedMapCache(accountKey, next);
    emitAppEvent('collectibles_changed');
    return Object.keys(next).length;
  } catch {
    return 0;
  }
}

/** UTC-день — той же формы, что серверный todayStrUtc(). */
function todayKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeRef(ref: string): string {
  return ref.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 60);
}

// зачем: владелец попросил шанс карточки не только за урок. tournament — за
// УЧАСТИЕ в турнире (любое место, как и раньше по правилам общего шанса);
// vocab/verbs/prep — за закрытие словаря / неправильных глаголов / предлогов.
// Шанс, дневной кап и pity — общие с уроком (серверный collectibles.ts), своей
// экономики у новых мест нет: карточек в день по-прежнему максимум 3 (4 premium).
export type CollectibleDropKind =
  | 'lesson' | 'plan' | 'exam'
  | 'tournament' | 'vocab' | 'verbs' | 'prep'
  | 'pronounce' | 'dialog';

const inFlight = new Set<string>();
const COLLECTIBLE_IN_FLIGHT_MAX = 32;

/**
 * Попытка дропа за qualifying-активность. Сервер сам решает: шанс/кап/pity.
 * Возвращает дроп для показа модалки или null (нет дропа / фича выключена /
 * офлайн / ошибка — всё тихо, активность юзера никогда не блокируем).
 *
 * eventId детерминирован (kind:ref[:день]) — повторный вызов за то же событие
 * идемпотентен на сервере и не даёт второй карточки.
 */
export async function maybeRollCollectibleDrop(
  kind: CollectibleDropKind,
  ref: string,
  options?: { dailyScoped?: boolean },
): Promise<CollectibleDropOutcome | null> {
  if (!isCollectiblesEnabled()) return null;
  const accountToken = captureAccountGeneration();
  const accountKey = accountOperationKey(accountToken);
  if (!accountKey || !isAccountOperationCurrent(accountToken)) return null;
  const fn = callable<{ eventId: string }, ClaimResponse>('collectiblesClaimDrop');
  if (!fn) return null;

  const dayPart = options?.dailyScoped === false ? '' : `:${todayKeyUtc()}`;
  const eventId = `${kind}:${sanitizeRef(ref)}${dayPart}`;
  const flightKey = `${accountKey}|${eventId}`;
  if (inFlight.has(flightKey)) return null;
  // A native callable can theoretically stay pending forever. Keep the registry
  // bounded so repeated account generations cannot become a process-lifetime leak.
  if (inFlight.size >= COLLECTIBLE_IN_FLIGHT_MAX) return null;
  inFlight.add(flightKey);
  try {
    const res = await fn({ eventId });
    if (!isAccountOperationCurrent(accountToken)) return null;
    const data = res?.data ?? {};
    if (!data.ok || !data.dropped || !data.card?.id) return null;
    const found = findCollectibleCard(String(data.card.id));
    const rarity = (found && found.kind === 'card' ? found.card.rarity : data.card.rarity) as CollectibleRarity;
    const outcome: CollectibleDropOutcome = {
      cardId: String(data.card.id),
      setId: String(data.card.setId ?? (found?.setId ?? '')),
      rarity: rarity ?? 'common',
      setCompleted: data.setCompleted === true,
      secretCardId: data.secretCardId ? String(data.secretCardId) : null,
      bonusShards: Math.max(0, Math.floor(Number(data.bonusShards) || 0)),
    };
    // A replay may be the first client callback after the server transaction:
    // the app could have crashed before projecting its immutable bonus event.
    // Repair/verify that deterministic event, but do not show the drop twice.
    if (data.alreadyClaimed) {
      if (outcome.bonusShards > 0) {
        const credited = await commitConfirmedExternalShardEvent({
          expectedOwnerStableId: accountToken.stableId!,
          source: 'collectibles',
          eventId,
          delta: outcome.bonusShards,
          reason: 'collectible_set_bonus',
          grant: {
            kind: 'collectible_set_bonus',
            subjectId: outcome.setId,
            payload: { cardId: outcome.cardId, setId: outcome.setId },
          },
        });
        if (credited.status !== 'applied' && credited.status !== 'already-applied') return null;
      }
      return null;
    }
    if (!await applyDropLocally(outcome, accountToken)) return null;
    if (!isAccountOperationCurrent(accountToken)) return null;
    if (outcome.bonusShards > 0) {
      const credited = await commitConfirmedExternalShardEvent({
        expectedOwnerStableId: accountToken.stableId!,
        source: 'collectibles',
        eventId,
        delta: outcome.bonusShards,
        reason: 'collectible_set_bonus',
        grant: {
          kind: 'collectible_set_bonus',
          subjectId: outcome.setId,
          payload: { cardId: outcome.cardId, setId: outcome.setId },
        },
      });
      if (credited.status !== 'applied' && credited.status !== 'already-applied') return null;
    }
    if (!isAccountOperationCurrent(accountToken)) return null;
    return outcome;
  } catch {
    return null;
  } finally {
    inFlight.delete(flightKey);
  }
}
