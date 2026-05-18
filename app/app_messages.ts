import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';

export type AppMessageReaction = 'like' | 'dislike';
export type AppMessageAudience = 'all' | 'free' | 'premium';
export type AppMessageLang = 'ru' | 'uk' | 'es';
export type AppMessageKind = 'message' | 'poll';

export const APP_MESSAGES_COLLECTION = 'app_messages';
export const APP_MESSAGE_STATES_COLLECTION = 'app_message_states';
export const APP_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const APP_MESSAGES_CACHE_KEY = 'app_messages_cache_v1';

export type AppMessagePollOption = {
  id: string;
  textRu: string;
  textUk: string;
  textEs: string;
};

export type AppMessagePoll = {
  questionRu: string;
  questionUk: string;
  questionEs: string;
  options: AppMessagePollOption[];
  optionIds: string[];
  counts: Record<string, number>;
  voteCount: number;
};

export type AppMessage = {
  id: string;
  kind: AppMessageKind;
  active: boolean;
  audience: AppMessageAudience;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
  createdAt: string;
  createdAtMs: number;
  updatedAt: string;
  updatedAtMs: number;
  expiresAt: string;
  expiresAtMs: number;
  priority: number;
  poll: AppMessagePoll | null;
};

export type AppMessageState = {
  messageId: string;
  readAtMs: number | null;
  reaction: AppMessageReaction | null;
  pollOptionId?: string | null;
  updatedAtMs: number;
};

export type AppMessageWithState = AppMessage & {
  readAtMs: number | null;
  reaction: AppMessageReaction | null;
  pollOptionId: string | null;
  unread: boolean;
};

export type AppMessagesSnapshot = {
  messages: AppMessageWithState[];
  unreadCount: number;
};

type FirestoreFactory = {
  (): any;
  FieldValue?: {
    serverTimestamp?: () => unknown;
  };
};

function toMs(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    const n = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const n = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }
  return fallback;
}

function cleanText(value: unknown, fallback = ''): string {
  return String(value ?? fallback).trim();
}

function cleanPollOptionId(value: unknown, fallback: string): string {
  const raw = cleanText(value, fallback).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return raw || fallback;
}

function cleanPollCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const optionId = cleanPollOptionId(key, '');
    if (!optionId) return;
    const n = Math.floor(Number(raw ?? 0));
    out[optionId] = Number.isFinite(n) && n > 0 ? n : 0;
  });
  return out;
}

function normalizeAppMessagePoll(
  data: Record<string, unknown>,
  titleFallback: string,
  messageFallback: string,
): AppMessagePoll | null {
  const rawPoll = data.poll;
  if (!rawPoll || typeof rawPoll !== 'object' || Array.isArray(rawPoll)) return null;

  const pollData = rawPoll as Record<string, unknown>;
  const rawOptions = Array.isArray(pollData.options) ? pollData.options : [];
  const options: AppMessagePollOption[] = [];

  rawOptions.forEach((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return;
    const optionData = row as Record<string, unknown>;
    const textRu = cleanText(optionData.textRu ?? optionData.labelRu ?? optionData.text, '');
    if (!textRu) return;
    const fallbackId = `opt_${options.length + 1}`;
    const id = cleanPollOptionId(optionData.id, fallbackId);
    if (options.some((option) => option.id === id)) return;
    options.push({
      id,
      textRu,
      textUk: cleanText(optionData.textUk ?? optionData.labelUk, textRu),
      textEs: cleanText(optionData.textEs ?? optionData.labelEs, textRu),
    });
  });

  if (options.length < 2) return null;

  const counts = cleanPollCounts(data.pollCounts ?? pollData.counts);
  const countSum = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const rawVoteCount = Math.floor(Number(data.pollVoteCount ?? pollData.voteCount ?? countSum));
  const voteCount = Number.isFinite(rawVoteCount) && rawVoteCount > 0 ? rawVoteCount : countSum;
  const questionRu = cleanText(
    pollData.questionRu ?? pollData.question ?? data.pollQuestionRu,
    titleFallback || messageFallback || 'Poll',
  );

  return {
    questionRu,
    questionUk: cleanText(pollData.questionUk ?? data.pollQuestionUk, questionRu),
    questionEs: cleanText(pollData.questionEs ?? data.pollQuestionEs, questionRu),
    options,
    optionIds: options.map((option) => option.id),
    counts,
    voteCount,
  };
}

export function normalizeAppMessage(id: string, data: Record<string, unknown>, nowMs = Date.now()): AppMessage {
  const createdAt = cleanText(data.createdAt, new Date(nowMs).toISOString());
  const createdAtMs = toMs(data.createdAtMs ?? data.createdAt, Date.parse(createdAt) || nowMs);
  const updatedAt = cleanText(data.updatedAt, createdAt);
  const updatedAtMs = toMs(data.updatedAtMs ?? data.updatedAt, createdAtMs);
  const fallbackExpiresMs = createdAtMs + APP_MESSAGE_TTL_MS;
  const expiresAtMs = toMs(data.expiresAtMs ?? data.expiresAt, fallbackExpiresMs);
  const expiresAt = cleanText(data.expiresAt, new Date(expiresAtMs).toISOString());
  const audienceRaw = cleanText(data.audience, 'all') as AppMessageAudience;
  const audience: AppMessageAudience =
    audienceRaw === 'free' || audienceRaw === 'premium' ? audienceRaw : 'all';
  const titleRu = cleanText(data.titleRu, 'Message from the team');
  const messageRu = cleanText(data.messageRu, '');
  const poll = normalizeAppMessagePoll(data, titleRu, messageRu);
  const kindRaw = cleanText(data.kind, poll ? 'poll' : 'message');
  const kind: AppMessageKind = kindRaw === 'poll' && poll ? 'poll' : 'message';

  return {
    id,
    kind,
    active: data.active !== false,
    audience,
    titleRu,
    titleUk: cleanText(data.titleUk, titleRu),
    titleEs: cleanText(data.titleEs, titleRu),
    messageRu,
    messageUk: cleanText(data.messageUk, messageRu),
    messageEs: cleanText(data.messageEs, messageRu),
    createdAt,
    createdAtMs,
    updatedAt,
    updatedAtMs,
    expiresAt,
    expiresAtMs,
    priority: Math.max(0, Math.floor(Number(data.priority ?? 0) || 0)),
    poll,
  };
}

export function normalizeAppMessageState(messageId: string, data: Record<string, unknown>): AppMessageState {
  const reactionRaw = cleanText(data.reaction, '');
  const pollOptionId = cleanText(data.pollOptionId, '');
  return {
    messageId,
    readAtMs: toMs(data.readAtMs ?? data.readAt, 0) || null,
    reaction: reactionRaw === 'like' || reactionRaw === 'dislike' ? reactionRaw : null,
    pollOptionId: pollOptionId || null,
    updatedAtMs: toMs(data.updatedAtMs ?? data.updatedAt, 0),
  };
}

export function isAppMessageVisible(message: AppMessage, nowMs = Date.now()): boolean {
  return message.active && message.expiresAtMs > nowMs && message.createdAtMs <= nowMs + 60_000;
}

export function isAppMessageAllowedForAudience(
  message: Pick<AppMessage, 'audience'>,
  isPremium: boolean,
): boolean {
  if (message.audience === 'premium') return isPremium;
  if (message.audience === 'free') return !isPremium;
  return true;
}

export function pickAppMessageText(
  message: Pick<AppMessage, 'titleRu' | 'titleUk' | 'titleEs' | 'messageRu' | 'messageUk' | 'messageEs'>,
  lang: AppMessageLang,
): { title: string; body: string } {
  if (lang === 'uk') {
    return { title: message.titleUk || message.titleRu, body: message.messageUk || message.messageRu };
  }
  if (lang === 'es') {
    return { title: message.titleEs || message.titleRu, body: message.messageEs || message.messageRu };
  }
  return { title: message.titleRu, body: message.messageRu };
}

export function pickAppMessagePollQuestion(poll: AppMessagePoll, lang: AppMessageLang): string {
  if (lang === 'uk') return poll.questionUk || poll.questionRu;
  if (lang === 'es') return poll.questionEs || poll.questionRu;
  return poll.questionRu;
}

export function pickAppMessagePollOptionText(option: AppMessagePollOption, lang: AppMessageLang): string {
  if (lang === 'uk') return option.textUk || option.textRu;
  if (lang === 'es') return option.textEs || option.textRu;
  return option.textRu;
}

export function buildAppMessagePreview(body: string, maxChars = 120): string {
  const compact = String(body || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) return compact;
  if (maxChars <= 3) return '.'.repeat(Math.max(0, maxChars));
  const raw = compact.slice(0, maxChars - 3).trimEnd();
  const lastSpace = raw.lastIndexOf(' ');
  const head = lastSpace >= Math.floor((maxChars - 3) * 0.55) ? raw.slice(0, lastSpace) : raw;
  return `${head}...`;
}

export function mergeAppMessagesWithStates(
  messages: AppMessage[],
  states: AppMessageState[],
  nowMs = Date.now(),
): AppMessagesSnapshot {
  const stateByMessage = new Map(states.map((state) => [state.messageId, state]));
  const merged = messages
    .filter((message) => isAppMessageVisible(message, nowMs))
    .sort((a, b) => (b.priority - a.priority) || (b.createdAtMs - a.createdAtMs))
    .map((message) => {
      const state = stateByMessage.get(message.id);
      const readAtMs = state?.readAtMs ?? null;
      return {
        ...message,
        readAtMs,
        reaction: state?.reaction ?? null,
        pollOptionId: state?.pollOptionId ?? null,
        unread: !readAtMs,
      };
    });
  return {
    messages: merged,
    unreadCount: merged.reduce((n, message) => n + (message.unread ? 1 : 0), 0),
  };
}

export function filterAppMessagesSnapshotForAudience(
  snapshot: AppMessagesSnapshot,
  isPremium: boolean,
): AppMessagesSnapshot {
  const messages = snapshot.messages.filter((message) => isAppMessageAllowedForAudience(message, isPremium));
  return {
    messages,
    unreadCount: messages.reduce((n, message) => n + (message.unread ? 1 : 0), 0),
  };
}

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    return mod.default as unknown as FirestoreFactory;
  } catch {
    return null;
  }
}

async function readCachedSnapshot(): Promise<AppMessagesSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(APP_MESSAGES_CACHE_KEY);
    if (!raw) return { messages: [], unreadCount: 0 };
    const parsed = JSON.parse(raw) as AppMessagesSnapshot;
    if (!Array.isArray(parsed.messages)) return { messages: [], unreadCount: 0 };
    return {
      messages: parsed.messages,
      unreadCount: Math.max(0, Math.floor(Number(parsed.unreadCount || 0))),
    };
  } catch {
    return { messages: [], unreadCount: 0 };
  }
}

async function writeCachedSnapshot(snapshot: AppMessagesSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_MESSAGES_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Cache is a comfort feature only.
  }
}

export function subscribeUserAppMessages(
  onChange: (snapshot: AppMessagesSnapshot) => void,
  onError?: (error: unknown) => void,
): { remove: () => void } {
  let disposed = false;
  let unsubscribeMessages: null | (() => void) = null;
  let unsubscribeStates: null | (() => void) = null;
  let messages: AppMessage[] = [];
  let states: AppMessageState[] = [];

  const emit = () => {
    const snapshot = mergeAppMessagesWithStates(messages, states);
    onChange(snapshot);
    void writeCachedSnapshot(snapshot);
  };

  void readCachedSnapshot().then((snapshot) => {
    if (!disposed && snapshot.messages.length) onChange(snapshot);
  });

  void (async () => {
    const firestoreFactory = await getFirestoreModule();
    const uid = await getCanonicalUserId().catch(() => null);
    if (disposed || !firestoreFactory || !uid) {
      if (!disposed) emit();
      return;
    }

    const db = firestoreFactory();
    unsubscribeMessages = db
      .collection(APP_MESSAGES_COLLECTION)
      .orderBy('createdAtMs', 'desc')
      .limit(80)
      .onSnapshot(
        (snap: any) => {
          messages = (snap.docs || []).map((docSnap: any) =>
            normalizeAppMessage(docSnap.id, docSnap.data?.() ?? {}),
          );
          emit();
        },
        (error: unknown) => {
          onError?.(error);
        },
      );

    unsubscribeStates = db
      .collection('users')
      .doc(uid)
      .collection(APP_MESSAGE_STATES_COLLECTION)
      .onSnapshot(
        (snap: any) => {
          states = (snap.docs || []).map((docSnap: any) =>
            normalizeAppMessageState(docSnap.id, docSnap.data?.() ?? {}),
          );
          emit();
        },
        (error: unknown) => {
          onError?.(error);
        },
      );
  })();

  return {
    remove: () => {
      disposed = true;
      unsubscribeMessages?.();
      unsubscribeStates?.();
    },
  };
}

export async function markAppMessageRead(messageId: string): Promise<void> {
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch(() => null);
  if (!firestoreFactory || !uid || !messageId) return;
  const nowMs = Date.now();
  const db = firestoreFactory();
  await db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId).set(
    {
      messageId,
      readAtMs: nowMs,
      updatedAtMs: nowMs,
    },
    { merge: true },
  );
}

export async function setAppMessageReaction(
  messageId: string,
  reaction: AppMessageReaction | null,
): Promise<void> {
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch(() => null);
  if (!firestoreFactory || !uid || !messageId) return;
  const nowMs = Date.now();
  const db = firestoreFactory();
  const stateRef = db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId);
  const reactionRef = db.collection(APP_MESSAGES_COLLECTION).doc(messageId).collection('reactions').doc(uid);

  if (reaction) {
    await Promise.all([
      stateRef.set({ messageId, reaction, updatedAtMs: nowMs }, { merge: true }),
      reactionRef.set({ messageId, userId: uid, reaction, updatedAtMs: nowMs }, { merge: true }),
    ]);
    return;
  }

  await Promise.all([
    stateRef.set({ messageId, reaction: null, updatedAtMs: nowMs }, { merge: true }),
    typeof reactionRef.delete === 'function' ? reactionRef.delete() : Promise.resolve(),
  ]);
}

export async function setAppMessagePollVote(messageId: string, optionId: string): Promise<void> {
  const cleanOptionId = String(optionId || '').trim();
  if (!messageId || !/^[A-Za-z0-9_-]{1,40}$/.test(cleanOptionId)) return;
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch(() => null);
  if (!firestoreFactory || !uid) return;
  const nowMs = Date.now();
  const db = firestoreFactory();
  const stateRef = db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId);
  const voteRef = db.collection(APP_MESSAGES_COLLECTION).doc(messageId).collection('poll_votes').doc(uid);

  await Promise.all([
    stateRef.set({ messageId, pollOptionId: cleanOptionId, updatedAtMs: nowMs }, { merge: true }),
    voteRef.set({ messageId, userId: uid, optionId: cleanOptionId, updatedAtMs: nowMs }, { merge: true }),
  ]);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
