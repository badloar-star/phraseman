import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent, onAppEvent } from './events';
import { getCanonicalUserId } from './user_id_policy';
import { VIP_SURVEY_ID } from './vip_survey_content';
import type { Lang } from '../constants/i18n';

export type AppMessageReaction = 'like' | 'dislike';
export type AppMessageAudience = 'all' | 'free' | 'premium';
export type AppMessageLang = Lang;
export type AppMessageKind = 'message' | 'poll' | 'vip_survey';

export const APP_MESSAGES_COLLECTION = 'app_messages';
export const APP_MESSAGE_STATES_COLLECTION = 'app_message_states';
export const APP_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const APP_MESSAGES_CACHE_KEY = 'app_messages_cache_v1';
const LOCAL_APP_MESSAGES_KEY = 'app_messages_local_preview_v1';
const LOCAL_APP_MESSAGE_STATES_KEY = 'app_message_local_preview_states_v1';

export type AppMessagePollOption = {
  id: string;
  textRu: string;
  textUk: string;
  textEs: string;
  textPtBr: string;
  textVi: string;
  textId: string;
  textTr: string;
  textPl: string;
};

export type AppMessagePoll = {
  questionRu: string;
  questionUk: string;
  questionEs: string;
  questionPtBr: string;
  questionVi: string;
  questionId: string;
  questionTr: string;
  questionPl: string;
  options: AppMessagePollOption[];
  optionIds: string[];
  counts: Record<string, number>;
  voteCount: number;
};

export type AppMessageVipSurvey = {
  surveyId: string;
  rewardDays: number;
  reviewUrlIos: string;
  reviewUrlAndroid: string;
};

export type AppMessage = {
  id: string;
  kind: AppMessageKind;
  active: boolean;
  audience: AppMessageAudience;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  titlePtBr: string;
  titleVi: string;
  titleId: string;
  titleTr: string;
  titlePl: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
  messagePtBr: string;
  messageVi: string;
  messageId: string;
  messageTr: string;
  messagePl: string;
  createdAt: string;
  createdAtMs: number;
  updatedAt: string;
  updatedAtMs: number;
  expiresAt: string;
  expiresAtMs: number;
  priority: number;
  poll: AppMessagePoll | null;
  vipSurvey: AppMessageVipSurvey | null;
};

export type AppMessageState = {
  messageId: string;
  readAtMs: number | null;
  dismissedAtMs: number | null;
  reaction: AppMessageReaction | null;
  pollOptionId?: string | null;
  updatedAtMs: number;
};

export type AppMessageWithState = AppMessage & {
  readAtMs: number | null;
  dismissedAtMs: number | null;
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

function toMs(value: unknown, backup = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : backup;
  }
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    const n = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(n) ? Math.floor(n) : backup;
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const n = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(n) ? Math.floor(n) : backup;
  }
  return backup;
}

function cleanText(value: unknown, backup = ''): string {
  return String(value ?? backup).trim();
}

function cleanPollOptionId(value: unknown, backup: string): string {
  const raw = cleanText(value, backup).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return raw || backup;
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

function normalizeAppMessageVipSurvey(data: Record<string, unknown>): AppMessageVipSurvey {
  const rawVipSurvey = data.vipSurvey;
  const vipSurveyData =
    rawVipSurvey && typeof rawVipSurvey === 'object' && !Array.isArray(rawVipSurvey)
      ? rawVipSurvey as Record<string, unknown>
      : {};
  const rewardDays = Math.floor(Number(vipSurveyData.rewardDays ?? data.vipSurveyRewardDays ?? 30));
  return {
    surveyId: cleanPollOptionId(vipSurveyData.surveyId ?? data.vipSurveyId, VIP_SURVEY_ID),
    rewardDays: Number.isFinite(rewardDays) && rewardDays > 0 ? Math.min(365, rewardDays) : 30,
    reviewUrlIos: cleanText(vipSurveyData.reviewUrlIos ?? data.reviewUrlIos, ''),
    reviewUrlAndroid: cleanText(vipSurveyData.reviewUrlAndroid ?? data.reviewUrlAndroid, ''),
  };
}

function normalizeAppMessagePoll(
  data: Record<string, unknown>,
  titleBackup: string,
  messageBackup: string,
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
    const backupId = `opt_${options.length + 1}`;
    const id = cleanPollOptionId(optionData.id, backupId);
    if (options.some((option) => option.id === id)) return;
    options.push({
      id,
      textRu,
      textUk: cleanText(optionData.textUk ?? optionData.labelUk, textRu),
      textEs: cleanText(optionData.textEs ?? optionData.labelEs, textRu),
      textPtBr: cleanText(optionData.textPtBr ?? optionData.textPtBR ?? optionData.labelPtBr ?? optionData.labelPtBR, ''),
      textVi: cleanText(optionData.textVi ?? optionData.labelVi, ''),
      textId: cleanText(optionData.textId ?? optionData.labelId, ''),
      textTr: cleanText(optionData.textTr ?? optionData.labelTr, ''),
      textPl: cleanText(optionData.textPl ?? optionData.labelPl, ''),
    });
  });

  if (options.length < 2) return null;

  const counts = cleanPollCounts(data.pollCounts ?? pollData.counts);
  const countSum = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const rawVoteCount = Math.floor(Number(data.pollVoteCount ?? pollData.voteCount ?? countSum));
  const voteCount = Number.isFinite(rawVoteCount) && rawVoteCount > 0 ? rawVoteCount : countSum;
  const questionRu = cleanText(
    pollData.questionRu ?? pollData.question ?? data.pollQuestionRu,
    titleBackup || messageBackup || 'Poll',
  );

  return {
    questionRu,
    questionUk: cleanText(pollData.questionUk ?? data.pollQuestionUk, questionRu),
    questionEs: cleanText(pollData.questionEs ?? data.pollQuestionEs, questionRu),
    questionPtBr: cleanText(pollData.questionPtBr ?? pollData.questionPtBR ?? data.pollQuestionPtBr ?? data.pollQuestionPtBR, ''),
    questionVi: cleanText(pollData.questionVi ?? data.pollQuestionVi, ''),
    questionId: cleanText(pollData.questionId ?? data.pollQuestionId, ''),
    questionTr: cleanText(pollData.questionTr ?? data.pollQuestionTr, ''),
    questionPl: cleanText(pollData.questionPl ?? data.pollQuestionPl, ''),
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
  const backupExpiresMs = createdAtMs + APP_MESSAGE_TTL_MS;
  const expiresAtMs = toMs(data.expiresAtMs ?? data.expiresAt, backupExpiresMs);
  const expiresAt = cleanText(data.expiresAt, new Date(expiresAtMs).toISOString());
  const audienceRaw = cleanText(data.audience, 'all') as AppMessageAudience;
  const audience: AppMessageAudience =
    audienceRaw === 'free' || audienceRaw === 'premium' ? audienceRaw : 'all';
  const titleRu = cleanText(data.titleRu, 'Message from the team');
  const messageRu = cleanText(data.messageRu, '');
  const poll = normalizeAppMessagePoll(data, titleRu, messageRu);
  const kindRaw = cleanText(data.kind, poll ? 'poll' : 'message');
  const kind: AppMessageKind =
    kindRaw === 'poll' && poll ? 'poll' : kindRaw === 'vip_survey' ? 'vip_survey' : 'message';
  const vipSurvey = kind === 'vip_survey' ? normalizeAppMessageVipSurvey(data) : null;

  return {
    id,
    kind,
    active: data.active !== false,
    audience,
    titleRu,
    titleUk: cleanText(data.titleUk, titleRu),
    titleEs: cleanText(data.titleEs, titleRu),
    titlePtBr: cleanText(data.titlePtBr ?? data.titlePtBR, ''),
    titleVi: cleanText(data.titleVi, ''),
    titleId: cleanText(data.titleId, ''),
    titleTr: cleanText(data.titleTr, ''),
    titlePl: cleanText(data.titlePl, ''),
    messageRu,
    messageUk: cleanText(data.messageUk, messageRu),
    messageEs: cleanText(data.messageEs, messageRu),
    messagePtBr: cleanText(data.messagePtBr ?? data.messagePtBR, ''),
    messageVi: cleanText(data.messageVi, ''),
    messageId: cleanText(data.messageId, ''),
    messageTr: cleanText(data.messageTr, ''),
    messagePl: cleanText(data.messagePl, ''),
    createdAt,
    createdAtMs,
    updatedAt,
    updatedAtMs,
    expiresAt,
    expiresAtMs,
    priority: Math.max(0, Math.floor(Number(data.priority ?? 0) || 0)),
    poll,
    vipSurvey,
  };
}

export function normalizeAppMessageState(messageId: string, data: Record<string, unknown>): AppMessageState {
  const reactionRaw = cleanText(data.reaction, '');
  const pollOptionId = cleanText(data.pollOptionId, '');
  return {
    messageId,
    readAtMs: toMs(data.readAtMs ?? data.readAt, 0) || null,
    dismissedAtMs: toMs(data.dismissedAtMs ?? data.dismissedAt, 0) || null,
    reaction: reactionRaw === 'like' || reactionRaw === 'dislike' ? reactionRaw : null,
    pollOptionId: pollOptionId || null,
    updatedAtMs: toMs(data.updatedAtMs ?? data.updatedAt, 0),
  };
}

export function isAppMessageVisible(message: AppMessage, nowMs = Date.now()): boolean {
  return message.active && message.expiresAtMs > nowMs && message.createdAtMs <= nowMs + 60_000;
}

export function isAppMessageAllowedForAudience(
  message: Pick<AppMessage, 'audience'> & Partial<Pick<AppMessage, 'kind'>>,
  hasPremiumAccess: boolean,
): boolean {
  if (message.kind === 'vip_survey') return !hasPremiumAccess;
  if (message.audience === 'premium') return hasPremiumAccess;
  if (message.audience === 'free') return !hasPremiumAccess;
  return true;
}

export function pickAppMessageText(
  message: Pick<AppMessage,
    | 'titleRu' | 'titleUk' | 'titleEs' | 'titlePtBr' | 'titleVi' | 'titleId' | 'titleTr' | 'titlePl'
    | 'messageRu' | 'messageUk' | 'messageEs' | 'messagePtBr' | 'messageVi' | 'messageId' | 'messageTr' | 'messagePl'
  >,
  lang: AppMessageLang,
): { title: string; body: string } {
  const byLang: Record<AppMessageLang, { title: string; body: string }> = {
    ru: { title: message.titleRu, body: message.messageRu },
    uk: { title: message.titleUk || message.titleRu, body: message.messageUk || message.messageRu },
    es: { title: message.titleEs || message.titleRu, body: message.messageEs || message.messageRu },
    'pt-BR': { title: message.titlePtBr, body: message.messagePtBr },
    vi: { title: message.titleVi, body: message.messageVi },
    id: { title: message.titleId, body: message.messageId },
    tr: { title: message.titleTr, body: message.messageTr },
    pl: { title: message.titlePl, body: message.messagePl },
  };
  return byLang[lang];
}

export function pickAppMessagePollQuestion(poll: AppMessagePoll, lang: AppMessageLang): string {
  const byLang: Record<AppMessageLang, string> = {
    ru: poll.questionRu,
    uk: poll.questionUk || poll.questionRu,
    es: poll.questionEs || poll.questionRu,
    'pt-BR': poll.questionPtBr,
    vi: poll.questionVi,
    id: poll.questionId,
    tr: poll.questionTr,
    pl: poll.questionPl,
  };
  return byLang[lang];
}

export function pickAppMessagePollOptionText(option: AppMessagePollOption, lang: AppMessageLang): string {
  const byLang: Record<AppMessageLang, string> = {
    ru: option.textRu,
    uk: option.textUk || option.textRu,
    es: option.textEs || option.textRu,
    'pt-BR': option.textPtBr,
    vi: option.textVi,
    id: option.textId,
    tr: option.textTr,
    pl: option.textPl,
  };
  return byLang[lang];
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
    .filter((message) => {
      const state = stateByMessage.get(message.id);
      return !state?.dismissedAtMs && isAppMessageVisible(message, nowMs);
    })
    .sort((a, b) => (b.priority - a.priority) || (b.createdAtMs - a.createdAtMs))
    .map((message) => {
      const state = stateByMessage.get(message.id);
      const readAtMs = state?.readAtMs ?? null;
      const dismissedAtMs = state?.dismissedAtMs ?? null;
      return {
        ...message,
        readAtMs,
        dismissedAtMs,
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
  hasPremiumAccess: boolean,
): AppMessagesSnapshot {
  const messages = snapshot.messages.filter((message) => isAppMessageAllowedForAudience(message, hasPremiumAccess));
  return {
    messages,
    unreadCount: messages.reduce((n, message) => n + (message.unread ? 1 : 0), 0),
  };
}

async function readJsonArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

async function readLocalPreviewMessages(): Promise<AppMessage[]> {
  const rows = await readJsonArray<Record<string, unknown> & { id?: string }>(LOCAL_APP_MESSAGES_KEY);
  return rows
    .map((row) => {
      const id = cleanPollOptionId(row.id, '');
      return id ? normalizeAppMessage(id, row) : null;
    })
    .filter((row): row is AppMessage => !!row);
}

async function readLocalPreviewStates(): Promise<AppMessageState[]> {
  const rows = await readJsonArray<Record<string, unknown> & { messageId?: string }>(LOCAL_APP_MESSAGE_STATES_KEY);
  return rows
    .map((row) => {
      const messageId = cleanPollOptionId(row.messageId, '');
      return messageId ? normalizeAppMessageState(messageId, row) : null;
    })
    .filter((row): row is AppMessageState => !!row);
}

async function writeLocalPreviewMessages(messages: AppMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_APP_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // Local preview is best-effort only.
  }
}

async function writeLocalPreviewStates(states: AppMessageState[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_APP_MESSAGE_STATES_KEY, JSON.stringify(states));
  } catch {
    // Local preview is best-effort only.
  }
}

async function updateLocalPreviewState(
  messageId: string,
  patch: Partial<AppMessageState>,
): Promise<boolean> {
  const cleanMessageId = cleanPollOptionId(messageId, '');
  if (!cleanMessageId) return false;
  const localMessages = await readLocalPreviewMessages();
  if (!localMessages.some((message) => message.id === cleanMessageId)) return false;

  const nowMs = Date.now();
  const localStates = await readLocalPreviewStates();
  const nextState: AppMessageState = {
    messageId: cleanMessageId,
    readAtMs: patch.readAtMs ?? null,
    dismissedAtMs: patch.dismissedAtMs ?? null,
    reaction: patch.reaction ?? null,
    pollOptionId: patch.pollOptionId ?? null,
    updatedAtMs: patch.updatedAtMs ?? nowMs,
  };
  const nextStates = [
    ...localStates.filter((state) => state.messageId !== cleanMessageId),
    nextState,
  ];
  await writeLocalPreviewStates(nextStates);
  emitAppEvent('app_messages_local_changed');
  return true;
}

function isLocalVipSurveyTestMessageId(id: string): boolean {
  return id.startsWith('admin_test_vip_survey_') || id.startsWith('admin_preview_vip_survey_');
}

export async function seedLocalVipSurveyTestMessage(nowMs = Date.now()): Promise<string> {
  const id = `admin_test_vip_survey_${nowMs}`;
  const createdAt = new Date(nowMs).toISOString();
  const expiresAtMs = nowMs + APP_MESSAGE_TTL_MS;
  const preview = normalizeAppMessage(id, {
    id,
    active: true,
    kind: 'vip_survey',
    audience: 'free',
    priority: 80,
    titleRu: 'Хотите получить месяц VIP?',
    titleUk: 'Хочете отримати місяць VIP?',
    titleEs: 'Want one month of VIP?',
    titlePtBr: 'Want one month of VIP?',
    titleVi: 'Want one month of VIP?',
    titleId: 'Want one month of VIP?',
    titleTr: 'Want one month of VIP?',
    titlePl: 'Want one month of VIP?',
    messageRu: 'Пройдите короткий опрос о приложении и активируйте 30 дней VIP.',
    messageUk: 'Пройдіть коротке опитування про застосунок і активуйте 30 днів VIP.',
    messageEs: 'Take a short in-app survey and activate 30 days of VIP.',
    messagePtBr: 'Take a short in-app survey and activate 30 days of VIP.',
    messageVi: 'Take a short in-app survey and activate 30 days of VIP.',
    messageId: 'Take a short in-app survey and activate 30 days of VIP.',
    messageTr: 'Take a short in-app survey and activate 30 days of VIP.',
    messagePl: 'Take a short in-app survey and activate 30 days of VIP.',
    vipSurvey: {
      surveyId: VIP_SURVEY_ID,
      rewardDays: 30,
    },
    createdAt,
    createdAtMs: nowMs,
    updatedAt: createdAt,
    updatedAtMs: nowMs,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  }, nowMs);
  const existing = await readLocalPreviewMessages();
  await writeLocalPreviewMessages([
    preview,
    ...existing.filter((message) => !isLocalVipSurveyTestMessageId(message.id)),
  ]);
  const states = await readLocalPreviewStates();
  await writeLocalPreviewStates(states.filter((state) => !isLocalVipSurveyTestMessageId(state.messageId)));
  emitAppEvent('app_messages_local_changed');
  return id;
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
  let localMessages: AppMessage[] = [];
  let localStates: AppMessageState[] = [];

  const emit = () => {
    const snapshot = mergeAppMessagesWithStates([...messages, ...localMessages], [...states, ...localStates]);
    onChange(snapshot);
    void writeCachedSnapshot(snapshot);
  };

  const reloadLocal = () => {
    void Promise.all([readLocalPreviewMessages(), readLocalPreviewStates()]).then(([nextMessages, nextStates]) => {
      if (disposed) return;
      localMessages = nextMessages;
      localStates = nextStates;
      emit();
    });
  };

  void readCachedSnapshot().then((snapshot) => {
    if (!disposed && snapshot.messages.length) onChange(snapshot);
  });
  reloadLocal();
  const localSub = onAppEvent('app_messages_local_changed', reloadLocal);

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
      localSub.remove();
      unsubscribeMessages?.();
      unsubscribeStates?.();
    },
  };
}

export async function dismissAppMessage(messageId: string): Promise<void> {
  const nowMs = Date.now();
  const localHandled = await updateLocalPreviewState(messageId, {
    readAtMs: nowMs,
    dismissedAtMs: nowMs,
    updatedAtMs: nowMs,
  });
  if (localHandled) return;
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch(() => null);
  if (!firestoreFactory || !uid || !messageId) return;
  const db = firestoreFactory();
  await db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId).set(
    {
      messageId,
      readAtMs: nowMs,
      dismissedAtMs: nowMs,
      updatedAtMs: nowMs,
    },
    { merge: true },
  );
}

export async function markAppMessageRead(messageId: string): Promise<void> {
  const nowMs = Date.now();
  const localHandled = await updateLocalPreviewState(messageId, {
    readAtMs: nowMs,
    updatedAtMs: nowMs,
  });
  if (localHandled) return;
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch(() => null);
  if (!firestoreFactory || !uid || !messageId) return;
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
