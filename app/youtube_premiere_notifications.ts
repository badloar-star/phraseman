import AsyncStorage from '@react-native-async-storage/async-storage';
import type { YoutubeVideoState } from '../shared/youtube_catalog_contract';

import { reportSwallowed, swallowError } from './debug-logger';
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
    // зачем (баг тестера 21.10, правило «сперва логи»): статус разрешения ДО и ПОСЛЕ запроса — видно, дошёл ли человек до системного окна
    const notifications = await import('./notifications');
    const before = await notifications.getNotificationPermissionStatus();
    console.warn('[VIDEO-REMINDER] permission: до запроса', before); // guard-ok: трассировка бага напоминания
    const result = await notifications.requestNotificationPermissionWithFallback({
      openSettingsIfBlocked: false,
    });
    const after = await notifications.getNotificationPermissionStatus();
    console.warn('[VIDEO-REMINDER] permission: после запроса', JSON.stringify({ before, after, granted: result.granted, blocked: result.blocked })); // guard-ok: итог
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
  } catch (error) {
    // зачем: немой catch прятал битое хранилище напоминаний — без следа «ничего не сохранилось»
    console.warn('[VIDEO-REMINDER] storage: чтение сохранённых напоминаний упало → пустой список', error instanceof Error ? error.message : String(error)); // guard-ok: причина
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
  // зачем (баг тестера 21.10): вход и КАЖДЫЙ ранний выход пишут причину — окно «Не удалось поставить напоминание» собирается из трёх разных веток
  console.warn('[VIDEO-REMINDER] request: вход', JSON.stringify({ // guard-ok: трассировка бага напоминания
    videoId: input.videoId, channelId: input.channelId, titleLen: String(input.title ?? '').length, scheduledStartTime: input.scheduledStartTime,
    nowMs, nowIso: Number.isFinite(nowMs) ? new Date(nowMs).toISOString() : 'NaN',
    trigger: trigger ? { triggerAtMs: trigger.triggerAtMs, triggerIso: new Date(trigger.triggerAtMs).toISOString(), mode: trigger.mode } : null,
  }));
  if (!trigger || !videoId || !channelId || !title) {
    console.warn('[VIDEO-REMINDER] request: отказ invalid_or_past', JSON.stringify({ hasTrigger: !!trigger, hasVideoId: !!videoId, hasChannelId: !!channelId, hasTitle: !!title })); // guard-ok: причина
    return { ok: false, reason: 'invalid_or_past' };
  }
  const permission = await dependencies.requestPermission();
  if (!permission.granted) {
    const reason = permission.blocked ? 'permission_blocked' : 'permission_denied';
    console.warn('[VIDEO-REMINDER] request: отказ', reason, JSON.stringify(permission)); // guard-ok: причина
    return { ok: false, reason };
  }
  const masterEnabled = await dependencies.isMasterEnabled();
  console.warn('[VIDEO-REMINDER] request: общий тумблер уведомлений в приложении', String(masterEnabled)); // guard-ok: значение, решившее ветку
  if (!masterEnabled) return { ok: false, reason: 'master_disabled' };

  const reminders = await readStoredReminders();
  const previous = reminders.find((item) => item.videoId === videoId);
  if (previous) await dependencies.cancel(previous.notificationId).catch(swallowError('youtube_premiere_notifications:requestYoutubePremiereReminderFromTap'));
  const notificationId = await dependencies.schedule({
    type: 'youtube_premiere',
    videoId,
    channelId,
    title,
    triggerAtMs: trigger.triggerAtMs,
  });
  if (!notificationId) {
    console.warn('[VIDEO-REMINDER] request: отказ schedule_failed — планировщик вернул пустой id (причину см. строки «schedule:» выше)', JSON.stringify({ videoId, previous: !!previous })); // guard-ok: причина
    await saveReminders(reminders.filter((item) => item.videoId !== videoId), nowMs).catch(swallowError('youtube_premiere_notifications:requestYoutubePremiereReminderFromTap'));
    return { ok: false, reason: 'schedule_failed' };
  }
  const reminder = { videoId, channelId, scheduledStartTime: input.scheduledStartTime, notificationId };
  await saveReminders([...reminders.filter((item) => item.videoId !== videoId), reminder], nowMs);
  console.warn('[VIDEO-REMINDER] request: готово', JSON.stringify({ videoId, notificationId, mode: trigger.mode })); // guard-ok: итог
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
    await Promise.all(stored.map((item) => dependencies.cancel(item.notificationId).catch(swallowError('youtube_premiere_notifications:reconcileYoutubePremiereReminders'))));
    await saveReminders([], nowMs).catch(swallowError('youtube_premiere_notifications:reconcileYoutubePremiereReminders'));
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
      await dependencies.cancel(reminder.notificationId).catch(swallowError('youtube_premiere_notifications:reconcileYoutubePremiereReminders'));
      continue;
    }
    if (event.scheduledStartTime === reminder.scheduledStartTime && event.channelId === reminder.channelId) {
      next.push(reminder);
      continue;
    }
    await dependencies.cancel(reminder.notificationId).catch(swallowError('youtube_premiere_notifications:reconcileYoutubePremiereReminders'));
    const notificationId = await dependencies.schedule({
      type: 'youtube_premiere',
      videoId: event.videoId,
      channelId: event.channelId,
      title: event.title,
      triggerAtMs: trigger.triggerAtMs,
    }).catch((error: unknown) => { reportSwallowed('youtube_premiere_notifications:reconcileYoutubePremiereReminders', error); return null; });
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
