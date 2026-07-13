import * as Crypto from 'expo-crypto';
import { getAnalyticsConsentState, subscribeAnalyticsConsent } from './analytics_consent';

let currentProductAnalyticsSessionId: string | null = null;

function createSessionId(): string {
  return Crypto.randomUUID();
}

export function setProductAnalyticsSessionId(value: string): void {
  const normalized = String(value ?? '').trim();
  currentProductAnalyticsSessionId = normalized.length > 0 && normalized.length <= 80
    ? normalized
    : null;
}

export function clearProductAnalyticsSessionId(): void {
  currentProductAnalyticsSessionId = null;
}

export function getProductAnalyticsSessionId(): string | null {
  if (getAnalyticsConsentState() !== 'granted') return null;
  if (!currentProductAnalyticsSessionId) currentProductAnalyticsSessionId = createSessionId();
  return currentProductAnalyticsSessionId;
}

subscribeAnalyticsConsent((state) => {
  if (state !== 'granted') clearProductAnalyticsSessionId();
});

export default function __RouteShim() { return null; }
