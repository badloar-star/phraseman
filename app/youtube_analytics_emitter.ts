import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { trackEvent } from './analytics';
import { getAnalyticsConsentState } from './analytics_consent';
import { getProductAnalyticsSessionId } from './product_analytics_session_context';
import {
  buildYoutubeAnalyticsEvent,
  type YoutubeAnalyticsEventInput,
} from './youtube_analytics_contract';

type GeneratedContext = 'eventId' | 'sessionId' | 'platform' | 'appVersion' | 'buildNumber' | 'occurredAtMs';
export type YoutubeAnalyticsEmission = YoutubeAnalyticsEventInput extends infer Event
  ? Event extends YoutubeAnalyticsEventInput ? Omit<Event, GeneratedContext> : never
  : never;

let lastCatalogOpenKey: string | null = null;

function validSessionId(value: string | null): value is string {
  return value != null
    && value === value.trim()
    && value.length > 0
    && value.length <= 80
    && /[A-Za-z0-9]/.test(value)
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

export function emitYoutubeAnalyticsEvent(event: YoutubeAnalyticsEmission): boolean {
  if (getAnalyticsConsentState() !== 'granted') return false;
  const sessionId = getProductAnalyticsSessionId();
  if (!validSessionId(sessionId)) return false;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;

  const catalogKey = event.eventName === 'youtube_catalog_open'
    ? `${sessionId}:${event.channelId}`
    : null;
  if (catalogKey && catalogKey === lastCatalogOpenKey) return false;

  try {
    const built = buildYoutubeAnalyticsEvent({
      ...event,
      eventId: Crypto.randomUUID(),
      sessionId,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown',
      buildNumber: Constants.nativeBuildVersion ?? 'unknown',
      occurredAtMs: Date.now(),
    } as YoutubeAnalyticsEventInput);
    if (catalogKey) lastCatalogOpenKey = catalogKey;
    void trackEvent(built.eventName, built.payload).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export function resetYoutubeCatalogOpenDedupeForTests(): void {
  lastCatalogOpenKey = null;
}

export default function __RouteShim() { return null; }
