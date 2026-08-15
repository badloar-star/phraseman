import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  exchangeCoinsForStars,
  newCoinExchangeIdempotencyKey,
  type CoinExchangeResult,
} from './coin_exchange_client';
import { commitLearningV2CoinExchangeReward } from './learning_v2_owner_repository_runtime';

const PREFIX = 'learning_v2_coin_exchange_outbox:v1:';
const MAX_PENDING = 8;
type Storage = Pick<typeof AsyncStorage, 'getAllKeys' | 'getItem' | 'setItem' | 'removeItem'>;

interface CoinExchangeWalletOutboxEntryV1 {
  readonly schemaVersion: 'learning-v2-coin-exchange-outbox.v1';
  readonly stableId: string;
  readonly localGeneration: number;
  readonly coins: number;
  readonly idempotencyKey: string;
  readonly result: CoinExchangeResult | null;
}

export interface CoinExchangeWalletOutboxDependencies {
  readonly storage?: Storage;
  readonly accountToken?: AccountGenerationToken;
  readonly exchange?: (coins: number, idempotencyKey: string) => Promise<CoinExchangeResult>;
  readonly commitReward?: (request: NonNullable<CoinExchangeResult['walletRewardRequest']>) => Promise<unknown>;
  readonly createIdempotencyKey?: () => string;
}

const keyFor = (entry: Pick<CoinExchangeWalletOutboxEntryV1, 'stableId' | 'localGeneration' | 'idempotencyKey'>) =>
  `${PREFIX}${entry.stableId}:g${entry.localGeneration}:${entry.idempotencyKey}`;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validResult = (value: unknown): value is CoinExchangeResult => {
  if (!isRecord(value) ||
    ![2, 3, 4, 5].includes(Object.keys(value).length) ||
    Object.keys(value).some((key) => ![
      'starsGranted', 'rateUsed', 'eventId', 'coinsDebited', 'walletRewardRequest',
    ].includes(key)) ||
    !Number.isSafeInteger(value.starsGranted) ||
    Number(value.starsGranted) < 0 || !Number.isFinite(value.rateUsed) ||
    Number(value.rateUsed) <= 0) return false;
  if (value.eventId !== undefined && (typeof value.eventId !== 'string' || !/^[A-Za-z0-9_:-]{8,80}$/.test(value.eventId))) return false;
  if (value.coinsDebited !== undefined && (!Number.isSafeInteger(value.coinsDebited) || Number(value.coinsDebited) <= 0)) return false;
  if (value.walletRewardRequest === undefined) return true;
  const request = value.walletRewardRequest;
  return isRecord(request) &&
    request.schemaVersion === 'learning-v2-server-wallet-reward-request.v1' &&
    typeof request.rewardId === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(request.rewardId) &&
    typeof request.rewardFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(request.rewardFingerprint);
};
const parseEntry = (raw: string): CoinExchangeWalletOutboxEntryV1 => {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('coin_exchange_outbox_corrupt'); }
  if (!isRecord(value) || Object.keys(value).length !== 6 ||
    value.schemaVersion !== 'learning-v2-coin-exchange-outbox.v1' ||
    typeof value.stableId !== 'string' || !/^[A-Za-z0-9._-]{1,160}$/.test(value.stableId) ||
    !Number.isSafeInteger(value.localGeneration) || Number(value.localGeneration) < 1 ||
    !Number.isSafeInteger(value.coins) || Number(value.coins) < 1 ||
    typeof value.idempotencyKey !== 'string' || !/^[A-Za-z0-9_:-]{8,80}$/.test(value.idempotencyKey) ||
    (value.result !== null && !validResult(value.result))) {
    throw new Error('coin_exchange_outbox_corrupt');
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    stableId: value.stableId,
    localGeneration: Number(value.localGeneration),
    coins: Number(value.coins),
    idempotencyKey: value.idempotencyKey,
    result: value.result as CoinExchangeResult | null,
  });
};

const activeToken = (input?: AccountGenerationToken) => {
  const token = input ?? captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId ||
    !isCurrentAccountGeneration(token, token.stableId)) {
    throw new Error('coin_exchange_outbox_account_inactive');
  }
  return token;
};

const list = async (storage: Storage, token: AccountGenerationToken) => {
  const prefix = `${PREFIX}${token.stableId}:g${token.generation}:`;
  const keys = (await storage.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
  if (keys.length > MAX_PENDING) throw new Error('coin_exchange_outbox_capacity');
  const entries: CoinExchangeWalletOutboxEntryV1[] = [];
  for (const key of keys) {
    const raw = await storage.getItem(key);
    if (raw === null) continue;
    const entry = parseEntry(raw);
    if (keyFor(entry) !== key || entry.stableId !== token.stableId ||
      entry.localGeneration !== token.generation) throw new Error('coin_exchange_outbox_corrupt');
    entries.push(entry);
  }
  return entries;
};

const processEntry = async (
  entry: CoinExchangeWalletOutboxEntryV1,
  token: AccountGenerationToken,
  dependencies: CoinExchangeWalletOutboxDependencies,
): Promise<CoinExchangeResult> => {
  const storage = dependencies.storage ?? AsyncStorage;
  const exchange = dependencies.exchange ?? exchangeCoinsForStars;
  const commit = dependencies.commitReward ?? ((request) =>
    commitLearningV2CoinExchangeReward(request, { accountToken: token }));
  let result = entry.result;
  if (result === null) {
    result = await exchange(entry.coins, entry.idempotencyKey);
    if (!isCurrentAccountGeneration(token, token.stableId))
      throw new Error('coin_exchange_outbox_account_stale');
    const next = { ...entry, result };
    await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(token, token.stableId))
        throw new Error('coin_exchange_outbox_account_stale');
      await storage.setItem(keyFor(entry), JSON.stringify(next));
    });
  }
  if (result.walletRewardRequest) await commit(result.walletRewardRequest);
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, token.stableId))
      throw new Error('coin_exchange_outbox_account_stale');
    await storage.removeItem(keyFor(entry));
  });
  return result;
};

export async function resumePendingCoinExchangeWalletRewards(
  dependencies: CoinExchangeWalletOutboxDependencies = {},
): Promise<number> {
  const token = activeToken(dependencies.accountToken);
  const storage = dependencies.storage ?? AsyncStorage;
  const entries = await withAccountTransitionLock(() => list(storage, token));
  let completed = 0;
  for (const entry of entries) {
    await processEntry(entry, token, dependencies);
    completed += 1;
  }
  return completed;
}

export async function exchangeCoinsForStarsDurably(
  coins: number,
  dependencies: CoinExchangeWalletOutboxDependencies = {},
): Promise<CoinExchangeResult> {
  if (!Number.isSafeInteger(coins) || coins < 1 || coins > 100_000)
    throw new Error('coin_exchange_outbox_amount_invalid');
  const token = activeToken(dependencies.accountToken);
  const storage = dependencies.storage ?? AsyncStorage;
  const processForUser = async (entry: CoinExchangeWalletOutboxEntryV1) => {
    try {
      return await processEntry(entry, token, dependencies);
    } catch (error) {
      // The server exchange may already be committed while only local wallet
      // projection is offline. Show the confirmed exchange as success and keep
      // the durable entry for background replay; lost server responses still
      // surface as retryable errors because no result was persisted.
      const raw = await storage.getItem(keyFor(entry));
      if (raw !== null) {
        const persisted = parseEntry(raw);
        if (persisted.result !== null) return persisted.result;
      }
      throw error;
    }
  };
  const existing = await withAccountTransitionLock(() => list(storage, token));
  if (existing[0]) return processForUser(existing[0]);
  const idempotencyKey = (dependencies.createIdempotencyKey ??
    newCoinExchangeIdempotencyKey)();
  const entry: CoinExchangeWalletOutboxEntryV1 = Object.freeze({
    schemaVersion: 'learning-v2-coin-exchange-outbox.v1',
    stableId: token.stableId!,
    localGeneration: token.generation,
    coins,
    idempotencyKey,
    result: null,
  });
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, token.stableId))
      throw new Error('coin_exchange_outbox_account_stale');
    const pending = await list(storage, token);
    if (pending.length >= MAX_PENDING) throw new Error('coin_exchange_outbox_capacity');
    await storage.setItem(keyFor(entry), JSON.stringify(entry));
  });
  return processForUser(entry);
}
