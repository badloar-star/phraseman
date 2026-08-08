import AsyncStorage from '@react-native-async-storage/async-storage';
import type { YoutubeCatalogManifest } from '../shared/youtube_catalog_contract';
import { resolveYoutubeChannelId } from '../shared/youtube_catalog_contract';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

const STORAGE_PREFIX = 'youtube_channel_preference_v1:';
const CHANNEL_ID_RE = /^[0-9A-Za-z_-]{1,80}$/;

export type YoutubeChannelPreference =
  | { mode: 'auto' }
  | { mode: 'manual'; channelId: string };

const AUTO: YoutubeChannelPreference = Object.freeze({ mode: 'auto' });
const preferences = new Map<string, YoutubeChannelPreference>();

function accountId(token: AccountGenerationToken): string | null {
  return token.phase === 'active' ? token.stableId?.trim() || null : null;
}

function storageKey(token: AccountGenerationToken): string | null {
  const id = accountId(token);
  return id ? `${STORAGE_PREFIX}${encodeURIComponent(id)}` : null;
}

function parsePreference(value: unknown): YoutubeChannelPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return AUTO;
  const source = value as Record<string, unknown>;
  if (source.mode !== 'manual') return AUTO;
  const channelId = typeof source.channelId === 'string' ? source.channelId.trim() : '';
  return CHANNEL_ID_RE.test(channelId) ? { mode: 'manual', channelId } : AUTO;
}

export function getYoutubeChannelPreference(
  token: AccountGenerationToken = captureAccountGeneration(),
): YoutubeChannelPreference {
  if (!isCurrentAccountGeneration(token)) return AUTO;
  const id = accountId(token);
  return id ? preferences.get(id) ?? AUTO : AUTO;
}

export async function hydrateYoutubeChannelPreference(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<YoutubeChannelPreference> {
  const key = storageKey(token);
  const id = accountId(token);
  if (!key || !id || !isCurrentAccountGeneration(token)) return AUTO;
  let preference: YoutubeChannelPreference = AUTO;
  try {
    const raw = await AsyncStorage.getItem(key);
    preference = raw ? parsePreference(JSON.parse(raw)) : AUTO;
  } catch {
    preference = AUTO;
  }
  if (!isCurrentAccountGeneration(token)) return AUTO;
  preferences.set(id, preference);
  return preference;
}

export async function setYoutubeChannelPreference(
  value: YoutubeChannelPreference,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  const key = storageKey(token);
  const id = accountId(token);
  if (!key || !id || !isCurrentAccountGeneration(token)) return false;
  const preference = parsePreference(value);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(preference));
  } catch {
    return false;
  }
  if (!isCurrentAccountGeneration(token)) return false;
  preferences.set(id, preference);
  return true;
}

export function resolvePreferredYoutubeChannel(
  manifest: YoutubeCatalogManifest,
  locale: string,
  preference: YoutubeChannelPreference,
): { channelId: string; preference: YoutubeChannelPreference; clearedInvalidManual?: true } {
  if (preference.mode === 'manual') {
    const exists = manifest.channels.some((channel) => channel.id === preference.channelId);
    if (exists) return { channelId: preference.channelId, preference };
    return {
      channelId: resolveYoutubeChannelId(manifest, locale, null),
      preference: AUTO,
      clearedInvalidManual: true,
    };
  }
  return { channelId: resolveYoutubeChannelId(manifest, locale, null), preference: AUTO };
}

export function resetYoutubeChannelPreferenceForTests(): void {
  preferences.clear();
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
