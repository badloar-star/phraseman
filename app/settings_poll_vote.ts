import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

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
const voteSubmissionQueue = new Map<string, Promise<SettingsPollVoteState>>();

const storageKey = (owner: string) => `${PREFIX}:${encodeURIComponent(owner)}`;

async function readVotes(owner: string): Promise<SettingsPollVoteState[]> {
  if (!owner) return [];
  try {
    const parsed = JSON.parse(await AsyncStorage.getItem(storageKey(owner)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => (
      item && typeof item.messageId === 'string' && typeof item.optionId === 'string'
    )).slice(-CAP) : [];
  } catch {
    return [];
  }
}

async function writeVotes(owner: string, votes: SettingsPollVoteState[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(owner), JSON.stringify(votes.slice(-CAP)));
}

export async function readSettingsPollVote(owner: string, messageId: string): Promise<SettingsPollVoteState | null> {
  return (await readVotes(owner)).find((vote) => vote.messageId === messageId) ?? null;
}

async function defaultTransport(input: { messageId: string; optionId: string; requestId: string; stableId: string }): Promise<SettingsPollVoteResponse> {
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
    }).catch(() => {});
    return pending;
  })();
  voteSubmissionQueue.set(queueKey, operation);
  try {
    return await operation;
  } finally {
    if (voteSubmissionQueue.get(queueKey) === operation) voteSubmissionQueue.delete(queueKey);
  }
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
