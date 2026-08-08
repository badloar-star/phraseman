import AsyncStorage from '@react-native-async-storage/async-storage';
import type { YoutubeVideoState } from '../shared/youtube_catalog_contract';

const STORAGE_KEY = 'youtube_premiere_reminders_v1';
const TEN_MINUTES_MS = 10 * 60_000;
export const MAX_YOUTUBE_PREMIERE_REMINDERS = 20;

export type StoredPremiereReminder = {
  videoId: string;
  channelId: string;
  scheduledStartTime: string;
  notificationId: string;
};

export type YoutubePremiereNotificationDependencies = {
  isMasterEnabled(): Promise<boolean>;
  requestPermission(): Promise<{ granted: boolean; blocked: boolean }>;
  schedule(input: {
    type: 'youtube_premiere';
    videoId: string;
    channelId: string;
    title: string;
    triggerAtMs: number;
  }): Promise<string | null>;
  cancel(notificationId: string): Promise<void>;
  openSettings(): Promise<void>;
};

export type YoutubePremiereReminderInput = {
  videoId: string;
  channelId: string;
  title: string;
  scheduledStartTime: string;
};

export type YoutubePremiereReminderEvent = YoutubePremiereReminderInput & {
  state: YoutubeVideoState;
  hidden?: boolean;
};

const defaultDependencies: YoutubePremiereNotificationDependencies = {
  isMasterEnabled: async () => (await import('./notifications')).isNotifMasterEnabled(),
  requestPermission: async () => {
    const result = await (await import('./notifications')).requestNotificationPermissionWithFallback({
      openSettingsIfBlocked: false,
    });
    return { granted: result.granted, blocked: result.blocked };
  },
  schedule: async (input) => (
    (await import('./notifications')).scheduleYoutubePremiereLocalNotification(input)
  ),
  cancel: async (notificationId) => {
    await (await import('./notifications')).cancelYoutubePremiereLocalNotification(notificationId);
  },
  openSettings: async () => {
    await (await import('react-native')).Linking.openSettings();
  },
};

function validText(value: unknown, max = 160): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= max ? text : '';
}

function parseReminder(value: unknown): StoredPremiereReminder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const videoId = validText(source.videoId, 100);
  const channelId = validText(source.channelId, 80);
  const scheduledStartTime = validText(source.scheduledStartTime, 64);
  const notificationId = validText(source.notificationId, 300);
  if (!videoId || !channelId || !notificationId || !Number.isFinite(Date.parse(scheduledStartTime))) return null;
  return { videoId, channelId, scheduledStartTime, notificationId };
}

async function readStoredReminders(): Promise<StoredPremiereReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseReminder).filter((item): item is StoredPremiereReminder => !!item);
  } catch {
    return [];
  }
}

async function saveReminders(value: StoredPremiereReminder[], nowMs: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruneYoutubePremiereReminders(value, nowMs)));
}

export function buildYoutubePremiereReminderTrigger(
  scheduledStartTime: string,
  nowMs = Date.now(),
): { triggerAtMs: number; mode: 'ten_minutes_before' | 'at_start' } | null {
  const startMs = Date.parse(String(scheduledStartTime ?? ''));
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || startMs <= nowMs) return null;
  if (startMs - nowMs > TEN_MINUTES_MS) {
    return { triggerAtMs: startMs - TEN_MINUTES_MS, mode: 'ten_minutes_before' };
  }
  return { triggerAtMs: startMs, mode: 'at_start' };
}

export function pruneYoutubePremiereReminders(
  value: StoredPremiereReminder[],
  nowMs = Date.now(),
): StoredPremiereReminder[] {
  if (!Array.isArray(value) || !Number.isFinite(nowMs)) return [];
  const byVideoId = new Map<string, StoredPremiereReminder>();
  for (const item of value) {
    const parsed = parseReminder(item);
    if (!parsed || Date.parse(parsed.scheduledStartTime) <= nowMs) continue;
    byVideoId.set(parsed.videoId, parsed);
  }
  return [...byVideoId.values()]
    .sort((left, right) => Date.parse(left.scheduledStartTime) - Date.parse(right.scheduledStartTime))
    .slice(0, MAX_YOUTUBE_PREMIERE_REMINDERS);
}

export async function loadYoutubePremiereReminders(
  nowMs = Date.now(),
): Promise<StoredPremiereReminder[]> {
  return pruneYoutubePremiereReminders(await readStoredReminders(), nowMs);
}

export async function requestYoutubePremiereReminderFromTap(
  input: YoutubePremiereReminderInput,
  options: { nowMs?: number; dependencies?: YoutubePremiereNotificationDependencies } = {},
): Promise<
  | { ok: true; reminder: StoredPremiereReminder; mode: 'ten_minutes_before' | 'at_start' }
  | { ok: false; reason: 'invalid_or_past' | 'master_disabled' | 'permission_blocked' | 'permission_denied' | 'schedule_failed' }
> {
  const nowMs = options.nowMs ?? Date.now();
  const dependencies = options.dependencies ?? defaultDependencies;
  const trigger = buildYoutubePremiereReminderTrigger(input.scheduledStartTime, nowMs);
  const videoId = validText(input.videoId, 100);
  const channelId = validText(input.channelId, 80);
  const title = validText(input.title, 300);
  if (!trigger || !videoId || !channelId || !title) return { ok: false, reason: 'invalid_or_past' };
  if (!(await dependencies.isMasterEnabled())) return { ok: false, reason: 'master_disabled' };

  const permission = await dependencies.requestPermission();
  if (!permission.granted) {
    return { ok: false, reason: permission.blocked ? 'permission_blocked' : 'permission_denied' };
  }

  const reminders = await readStoredReminders();
  const previous = reminders.find((item) => item.videoId === videoId);
  if (previous) await dependencies.cancel(previous.notificationId).catch(() => {});
  const notificationId = await dependencies.schedule({
    type: 'youtube_premiere',
    videoId,
    channelId,
    title,
    triggerAtMs: trigger.triggerAtMs,
  });
  if (!notificationId) {
    await saveReminders(reminders.filter((item) => item.videoId !== videoId), nowMs).catch(() => {});
    return { ok: false, reason: 'schedule_failed' };
  }
  const reminder = { videoId, channelId, scheduledStartTime: input.scheduledStartTime, notificationId };
  await saveReminders([...reminders.filter((item) => item.videoId !== videoId), reminder], nowMs);
  return { ok: true, reminder, mode: trigger.mode };
}

export async function reconcileYoutubePremiereReminders(
  events: YoutubePremiereReminderEvent[],
  options: { nowMs?: number; dependencies?: YoutubePremiereNotificationDependencies } = {},
): Promise<StoredPremiereReminder[]> {
  const nowMs = options.nowMs ?? Date.now();
  const dependencies = options.dependencies ?? defaultDependencies;
  const stored = await readStoredReminders();
  if (!(await dependencies.isMasterEnabled())) {
    await Promise.all(stored.map((item) => dependencies.cancel(item.notificationId).catch(() => {})));
    await saveReminders([], nowMs).catch(() => {});
    return [];
  }

  const upcoming = new Map(events
    .filter((event) => event.state === 'upcoming' && !event.hidden)
    .map((event) => [event.videoId, event]));
  const next: StoredPremiereReminder[] = [];
  for (const reminder of stored) {
    const event = upcoming.get(reminder.videoId);
    const trigger = event
      ? buildYoutubePremiereReminderTrigger(event.scheduledStartTime, nowMs)
      : null;
    if (!event || !trigger) {
      await dependencies.cancel(reminder.notificationId).catch(() => {});
      continue;
    }
    if (event.scheduledStartTime === reminder.scheduledStartTime && event.channelId === reminder.channelId) {
      next.push(reminder);
      continue;
    }
    await dependencies.cancel(reminder.notificationId).catch(() => {});
    const notificationId = await dependencies.schedule({
      type: 'youtube_premiere',
      videoId: event.videoId,
      channelId: event.channelId,
      title: event.title,
      triggerAtMs: trigger.triggerAtMs,
    }).catch(() => null);
    if (notificationId) {
      next.push({
        videoId: event.videoId,
        channelId: event.channelId,
        scheduledStartTime: event.scheduledStartTime,
        notificationId,
      });
    }
  }
  const pruned = pruneYoutubePremiereReminders(next, nowMs);
  await saveReminders(pruned, nowMs);
  return pruned;
}

export async function openYoutubePremiereNotificationSettings(
  dependencies: YoutubePremiereNotificationDependencies = defaultDependencies,
): Promise<void> {
  await dependencies.openSettings();
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
