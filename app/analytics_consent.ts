/**
 * analytics_consent.ts — единый источник правды для согласия пользователя на
 * НЕОБЯЗАТЕЛЬНУЮ продуктовую аналитику (PostHog + non-essential Firebase Analytics).
 *
 * Юридический смысл (GDPR / ePrivacy):
 *  - До явного согласия non-essential аналитику собирать НЕЛЬЗЯ → дефолт `false`.
 *  - Строго необходимая телеметрия (Crashlytics, security, fraud) НЕ зависит от
 *    этого флага и продолжает работать всегда — она гейтится отдельно (вернее,
 *    вообще не гейтится здесь).
 *  - Пользователь может отозвать согласие в настройках в любой момент.
 *
 * Паттерн скопирован с `notif_settings_v2` в notifications.ts: снапшот в памяти
 * + гидрация из AsyncStorage в bootstrap, чтобы гейт читался СИНХРОННО и не
 * превращал каждый вызов аналитики в async-await.
 *
 * Состояние:
 *  - 'granted'  — согласие дано, собираем всё.
 *  - 'denied'   — пользователь отказался (нажал «Позже»/«Не сейчас»), не собираем.
 *  - 'unset'    — выбор ещё не сделан → ведём себя как 'denied' (ничего не шлём).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsConsentState = 'granted' | 'denied' | 'unset';

const CONSENT_KEY = 'analytics_consent_v1';

/** Снапшот в памяти. До гидрации — 'unset' (безопасный дефолт: ничего не шлём). */
let consentMemory: AnalyticsConsentState = 'unset';
let hydrated = false;
const consentListeners = new Set<(state: AnalyticsConsentState) => void>();

function notifyConsentListeners(): void {
  consentListeners.forEach((listener) => {
    try { listener(consentMemory); } catch { /* analytics listeners must not break consent updates */ }
  });
}

function normalize(raw: string | null): AnalyticsConsentState {
  if (raw === 'granted' || raw === 'denied' || raw === 'unset') return raw;
  return 'unset';
}

/**
 * Донести согласие до НАТИВНОГО автосбора Firebase Analytics
 * (setAnalyticsCollectionEnabled). Динамический import — firebase.ts статически
 * импортирует этот модуль, статический импорт в обратную сторону дал бы цикл.
 */
function syncNativeCollection(): void {
  void import('./firebase')
    .then((m) => m.applyAnalyticsCollectionConsent())
    .catch(() => {});
}

/**
 * Синхронный геттер для гейта в analytics.ts / firebase.ts / posthog_client.ts.
 * true ТОЛЬКО при явном согласии. Любое другое состояние (denied/unset/до гидрации)
 * = false → non-essential аналитика не отправляется.
 */
export function isAnalyticsConsentGranted(): boolean {
  return consentMemory === 'granted';
}

/** Текущее состояние согласия (для UI настроек / онбординга / модала). */
export function getAnalyticsConsentState(): AnalyticsConsentState {
  return consentMemory;
}

export function subscribeAnalyticsConsent(
  listener: (state: AnalyticsConsentState) => void,
): () => void {
  consentListeners.add(listener);
  return () => { consentListeners.delete(listener); };
}

/** Сделан ли уже выбор (нужно ли показывать запрос согласия). */
export function hasAnalyticsConsentDecision(): boolean {
  return consentMemory === 'granted' || consentMemory === 'denied';
}

/**
 * Вызывать в app bootstrap ДО первого события аналитики (рядом с
 * hydrateNotifSettingsFromStorage), чтобы гейт работал с первого кадра.
 */
export async function hydrateAnalyticsConsentFromStorage(): Promise<void> {
  const previous = consentMemory;
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    consentMemory = normalize(raw);
  } catch {
    consentMemory = 'unset';
  } finally {
    hydrated = true;
    syncNativeCollection();
    if (consentMemory !== previous) notifyConsentListeners();
  }
}

export function isAnalyticsConsentHydrated(): boolean {
  return hydrated;
}

/** Записать выбор пользователя (онбординг, модал, настройки). */
export async function setAnalyticsConsent(state: AnalyticsConsentState): Promise<void> {
  const previous = consentMemory;
  consentMemory = state;
  if (consentMemory !== previous) notifyConsentListeners();
  syncNativeCollection();
  try {
    await AsyncStorage.setItem(CONSENT_KEY, state);
  } catch {
    /* no-op: в памяти уже обновлено, перезапишется при следующей попытке */
  }
}
