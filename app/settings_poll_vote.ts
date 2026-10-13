import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type SettingsPollVoteState = {
  messageId: string;
  optionId: string;
  requestId: string;
  status: 'pending' | 'synced';
  updatedAtMs: number;
};

export type SettingsPollVoteResponse = {
  accepted: boolean;
  alreadyVoted: boolean;
  optionId: string;
};

export type SettingsPollVoteTransport = (
  input: { messageId: string; optionId: string; requestId: string; stableId: string },
) => Promise<SettingsPollVoteResponse>;

const PREFIX = 'settings_poll_votes_v1';
const CAP = 100;
const SYNCED_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const voteSubmissionQueue = new Map<string, Promise<SettingsPollVoteState>>();

const storageKey = (owner: string) => `${PREFIX}:${encodeURIComponent(owner)}`;

async function readVotes(owner: string): Promise<SettingsPollVoteState[]> {
  if (!owner) return [];
  try {
    const parsed = JSON.parse(await AsyncStorage.getItem(storageKey(owner)) || '[]');
    const syncedCutoffMs = Date.now() - SYNCED_TTL_MS;
    return Array.isArray(parsed) ? parsed.filter((item) => (
      item && typeof item.messageId === 'string' && typeof item.optionId === 'string'
      && typeof item.requestId === 'string'
      && (item.status === 'pending' || item.status === 'synced')
      && Number.isFinite(Number(item.updatedAtMs))
      && (item.status === 'pending' || Number(item.updatedAtMs) >= syncedCutoffMs)
    )).slice(-CAP) : [];
  } catch (error) {
    // зачем (правило владельца: немой catch запрещён): битое/недоступное хранилище голосов = карточка опроса без голоса — причина должна быть в журнале.
    console.warn(`[SETTINGS-POLL] readVotes: хранилище голосов не прочитано owner=${ownerTail(owner)} — считаем «голосов нет»: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/** Хвост владельца для журнала: длина и 4 последних знака — сравнить сид и экран, не печатая id целиком. */
export function ownerTail(owner: string): string {
  return owner ? `…${owner.slice(-4)}(${owner.length})` : 'пусто';
}

async function writeVotes(owner: string, votes: SettingsPollVoteState[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(owner), JSON.stringify(votes.slice(-CAP)));
}

export async function readSettingsPollVote(owner: string, messageId: string): Promise<SettingsPollVoteState | null> {
  return (await readVotes(owner)).find((vote) => vote.messageId === messageId) ?? null;
}

/** Префикс id dev-кампаний слота сообщений (app_messages.ts → devSeedSettingsMessageSlot): такие голоса в сеть не уходят никогда. */
export const DEV_SETTINGS_CAMPAIGN_ID_PREFIX = 'dev-state-';

async function defaultTransport(input: { messageId: string; optionId: string; requestId: string; stableId: string }): Promise<SettingsPollVoteResponse> {
  // зачем (координатор 14.10, dev-кампании для съёмки): голос за выдуманную кампанию не должен писаться на сервер.
  if (input.messageId.startsWith(DEV_SETTINGS_CAMPAIGN_ID_PREFIX)) {
    console.warn(`[DEV-STATE] settings_poll_vote: голос за dev-кампанию ${input.messageId} в сеть не отправляется`);
    throw new Error('dev_state_campaign_no_network');
  }
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('settings_poll_vote_unavailable');
  const functions = (await import('@react-native-firebase/functions')).default;
  const result = await functions().httpsCallable('submitSettingsPollVote')(input);
  return result.data as SettingsPollVoteResponse;
}

export async function submitSettingsPollVoteOptimistically(
  owner: string,
  messageId: string,
  optionId: string,
  transport: SettingsPollVoteTransport = defaultTransport,
): Promise<SettingsPollVoteState> {
  const queueKey = `${encodeURIComponent(owner)}:${encodeURIComponent(messageId)}`;
  const inFlight = voteSubmissionQueue.get(queueKey);
  if (inFlight) return inFlight;
  const operation = (async () => {
    const votes = await readVotes(owner);
    const existing = votes.find((vote) => vote.messageId === messageId);
    if (existing) return existing;
    const now = Date.now();
    const pending: SettingsPollVoteState = {
      messageId,
      optionId,
      requestId: `${now.toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
      status: 'pending',
      updatedAtMs: now,
    };
    await writeVotes(owner, [...votes, pending]);
    void transport({ messageId, optionId, requestId: pending.requestId, stableId: owner }).then(async (response) => {
      const current = await readVotes(owner);
      await writeVotes(owner, current.map((vote) => vote.messageId === messageId ? {
        ...vote,
        optionId: response.optionId,
        status: 'synced',
        updatedAtMs: Date.now(),
      } : vote));
    }).catch(noteSwallowedHandler('settings_poll_vote:promise_1'));
    return pending;
  })();
  voteSubmissionQueue.set(queueKey, operation);
  try {
    return await operation;
  } finally {
    if (voteSubmissionQueue.get(queueKey) === operation) voteSubmissionQueue.delete(queueKey);
  }
}

/**
 * DEV (R1-съёмка): выставить локальный голос dev-кампании («Спасибо, выбор сохранён» + проценты) или снять его (optionId = null).
 * Только dev-сборка и только id с префиксом dev-state-; пишет один локальный ключ, в сеть ничего не уходит. Лог [DEV-STATE].
 */
export async function devSetSettingsPollVote(owner: string, messageId: string, optionId: string | null): Promise<boolean> {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE)) {
    console.warn('[DEV-STATE] settings_poll_vote: отказ, не dev-сборка');
    return false;
  }
  if (!owner || !messageId.startsWith(DEV_SETTINGS_CAMPAIGN_ID_PREFIX)) {
    console.warn(`[DEV-STATE] settings_poll_vote: отказ owner=${owner ? 'есть' : 'нет'} messageId=${messageId}`);
    return false;
  }
  const votes = await readVotes(owner);
  const rest = votes.filter((vote) => vote.messageId !== messageId);
  const next = optionId === null
    ? rest
    : [...rest, { messageId, optionId, requestId: `dev-${Date.now().toString(36)}`, status: 'synced' as const, updatedAtMs: Date.now() }];
  await writeVotes(owner, next);
  console.log(`[DEV-STATE] settings_poll_vote: ${messageId} → ${optionId === null ? 'голос снят' : `голос ${optionId} (synced, локально)`}; всего записей ${next.length} owner=${ownerTail(owner)}`);
  return true;
}

export async function flushSettingsPollVotes(owner: string, transport: SettingsPollVoteTransport = defaultTransport): Promise<void> {
  const votes = await readVotes(owner);
  for (const vote of votes.filter((item) => item.status === 'pending')) {
    try {
      const response = await transport({ ...vote, stableId: owner });
      const current = await readVotes(owner);
      await writeVotes(owner, current.map((item) => item.messageId === vote.messageId ? {
        ...item, optionId: response.optionId, status: 'synced', updatedAtMs: Date.now(),
      } : item));
    } catch {
      return;
    }
  }
}

export default function __RouteShim() {
  return null;
}
