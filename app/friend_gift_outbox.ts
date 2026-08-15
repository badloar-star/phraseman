import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import {
  classifyFriendGiftError,
  makeFriendGiftIdempotencyKey,
  sendFriendGiftWithShards,
  type FriendGiftId,
  type FriendGiftSendResponse,
} from './friend_gifts';

const PREFIX = 'friend_gift_send_outbox_v1::';
const MAX_PENDING = 16;
type Storage = Pick<typeof AsyncStorage, 'getAllKeys' | 'getItem' | 'setItem' | 'removeItem'>;

export type FriendGiftOutboxEntry = Readonly<{
  schemaVersion: 'friend-gift-send-outbox.v1';
  stableId: string;
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName: string;
  idempotencyKey: string;
  createdAtMs: number;
}>;

export type FriendGiftOutboxDependencies = Readonly<{
  storage?: Storage;
  accountToken?: AccountGenerationToken;
  send?: typeof sendFriendGiftWithShards;
  now?: () => number;
  createIdempotencyKey?: () => string;
  notifyFailure?: (entry: FriendGiftOutboxEntry, error: unknown) => void;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const activeToken = (provided?: AccountGenerationToken): AccountGenerationToken & { stableId: string } => {
  const token = provided ?? captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId || !isCurrentAccountGeneration(token, token.stableId)) {
    throw new Error('friend_gift_outbox_account_inactive');
  }
  return token as AccountGenerationToken & { stableId: string };
};

const keyFor = (entry: Pick<FriendGiftOutboxEntry, 'stableId' | 'idempotencyKey'>): string =>
  `${PREFIX}${encodeURIComponent(entry.stableId)}::${entry.idempotencyKey}`;

function parseEntry(raw: string): FriendGiftOutboxEntry {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('friend_gift_outbox_corrupt'); }
  if (!isRecord(value)
    || value.schemaVersion !== 'friend-gift-send-outbox.v1'
    || typeof value.stableId !== 'string' || value.stableId.length < 1 || value.stableId.length > 160
    || typeof value.friendStableId !== 'string' || value.friendStableId.length < 1 || value.friendStableId.length > 160
    || (value.giftId !== 'chain_shield_1' && value.giftId !== 'xp_boost_2x_24h')
    || typeof value.senderDisplayName !== 'string' || value.senderDisplayName.length > 160
    || typeof value.idempotencyKey !== 'string' || !/^fg_[A-Za-z0-9_:-]{8,76}$/.test(value.idempotencyKey)
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) <= 0) {
    throw new Error('friend_gift_outbox_corrupt');
  }
  return Object.freeze({
    schemaVersion: 'friend-gift-send-outbox.v1',
    stableId: value.stableId,
    friendStableId: value.friendStableId,
    giftId: value.giftId,
    senderDisplayName: value.senderDisplayName,
    idempotencyKey: value.idempotencyKey,
    createdAtMs: Number(value.createdAtMs),
  });
}

async function listEntries(storage: Storage, token: AccountGenerationToken & { stableId: string }): Promise<FriendGiftOutboxEntry[]> {
  const prefix = `${PREFIX}${encodeURIComponent(token.stableId)}::`;
  const keys = (await storage.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
  if (keys.length > MAX_PENDING) throw new Error('friend_gift_outbox_capacity');
  const entries: FriendGiftOutboxEntry[] = [];
  for (const key of keys) {
    const raw = await storage.getItem(key);
    if (raw === null) continue;
    const entry = parseEntry(raw);
    if (entry.stableId !== token.stableId || keyFor(entry) !== key) throw new Error('friend_gift_outbox_corrupt');
    entries.push(entry);
  }
  return entries;
}

function notifyDefinitiveFailure(): void {
  emitAppEvent('action_toast', {
    type: 'error',
    messageRu: 'Подарок не отправлен. Жемчуг не списан.',
    messageUk: 'Подарунок не надіслано. Перлини не списані.',
    messageEs: 'El regalo no se envió. No se descontaron perlas.',
    messagePtBr: 'O presente não foi enviado. Nenhuma pérola foi descontada.',
    messageVi: 'Quà chưa được gửi. Ngọc trai không bị trừ.',
    messageId: 'Hadiah tidak terkirim. Mutiara tidak dipotong.',
    messageTr: 'Hediye gönderilmedi. İnci düşülmedi.',
    messagePl: 'Prezent nie został wysłany. Perły nie zostały pobrane.',
  });
}

async function processEntry(
  entry: FriendGiftOutboxEntry,
  token: AccountGenerationToken & { stableId: string },
  dependencies: FriendGiftOutboxDependencies,
): Promise<FriendGiftSendResponse> {
  const storage = dependencies.storage ?? AsyncStorage;
  const send = dependencies.send ?? sendFriendGiftWithShards;
  try {
    const response = await send({
      friendStableId: entry.friendStableId,
      giftId: entry.giftId,
      senderDisplayName: entry.senderDisplayName,
      idempotencyKey: entry.idempotencyKey,
    });
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('friend_gift_outbox_account_stale');
    await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('friend_gift_outbox_account_stale');
      await storage.removeItem(keyFor(entry));
    });
    return response;
  } catch (error) {
    if (!isCurrentAccountGeneration(token, token.stableId)) throw error;
    const kind = classifyFriendGiftError(error);
    // Unknown/network outcomes may already be committed on the server. Keep the
    // exact request + idempotency key and retry instead of double-spending.
    if (kind === 'network' || kind === 'unknown') throw error;
    await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(token, token.stableId)) return;
      await storage.removeItem(keyFor(entry));
    });
    (dependencies.notifyFailure ?? notifyDefinitiveFailure)(entry, error);
    throw error;
  }
}

export async function enqueueFriendGiftSend(
  request: Readonly<{ friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string }>,
  dependencies: FriendGiftOutboxDependencies = {},
): Promise<{ entry: FriendGiftOutboxEntry; completion: Promise<FriendGiftSendResponse> }> {
  const token = activeToken(dependencies.accountToken);
  const storage = dependencies.storage ?? AsyncStorage;
  const entry: FriendGiftOutboxEntry = Object.freeze({
    schemaVersion: 'friend-gift-send-outbox.v1',
    stableId: token.stableId,
    friendStableId: String(request.friendStableId || '').trim().slice(0, 160),
    giftId: request.giftId,
    senderDisplayName: String(request.senderDisplayName ?? '').trim().slice(0, 160),
    idempotencyKey: (dependencies.createIdempotencyKey ?? makeFriendGiftIdempotencyKey)(),
    createdAtMs: (dependencies.now ?? Date.now)(),
  });
  if (!entry.friendStableId) throw new Error('friend_gift_outbox_recipient_invalid');

  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('friend_gift_outbox_account_stale');
    const pending = await listEntries(storage, token);
    if (pending.length >= MAX_PENDING) throw new Error('friend_gift_outbox_capacity');
    await storage.setItem(keyFor(entry), JSON.stringify(entry));
  });
  const completion = processEntry(entry, token, dependencies);
  return { entry, completion };
}

export async function resumePendingFriendGiftSends(
  dependencies: FriendGiftOutboxDependencies = {},
): Promise<{ completed: number; pending: number; failed: number }> {
  const token = activeToken(dependencies.accountToken);
  const storage = dependencies.storage ?? AsyncStorage;
  const entries = await withAccountTransitionLock(() => listEntries(storage, token));
  let completed = 0;
  let pending = 0;
  let failed = 0;
  for (const entry of entries) {
    try {
      await processEntry(entry, token, dependencies);
      completed += 1;
    } catch (error) {
      const kind = classifyFriendGiftError(error);
      if (kind === 'network' || kind === 'unknown') pending += 1;
      else failed += 1;
      if (!isCurrentAccountGeneration(token, token.stableId)) break;
    }
  }
  return { completed, pending, failed };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
