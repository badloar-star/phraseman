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
import { DebugLogger } from './debug-logger';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type AnalyticsConsentState = 'granted' | 'denied' | 'unset';

const CONSENT_KEY = 'analytics_consent_v1';

/** Снапшот в памяти. До гидрации — 'unset' (безопасный дефолт: ничего не шлём). */
let consentMemory: AnalyticsConsentState = 'unset';
let hydrated = false;
const consentListeners = new Set<(state: AnalyticsConsentState) => void>();

function notifyConsentListeners(): void {
  consentListeners.forEach((listener) => {
    try { listener(consentMemory); } catch (e) {
      // analytics listeners must not break consent updates
      DebugLogger.error('analytics_consent:notifyConsentListeners', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
async function syncNativeCollection(enabled: boolean): Promise<void> {
  await import('./firebase')
    .then((m) => m.applyAnalyticsCollectionConsent(enabled))
    .catch(noteSwallowedHandler('analytics_consent:promise_1'));
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
  let next: AnalyticsConsentState = 'unset';
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    next = normalize(raw);
  } catch {
    next = 'unset';
  } finally {
    await syncNativeCollection(next === 'granted');
    consentMemory = next;
    hydrated = true;
    if (consentMemory !== previous) notifyConsentListeners();
  }
}

export function isAnalyticsConsentHydrated(): boolean {
  return hydrated;
}

/** Записать выбор пользователя (онбординг, модал, настройки). */
// зачем (аудит Optimistic UI, Авторизация 13.10): «включить» ждёт нативный сбор и лишь потом пишет память и диск. Быстрое «вкл → выкл» давало
// позднее «granted» поверх «denied» — отзыв согласия терялся, нативный сбор мог остаться включённым. Все записи идут одной очередью с номером:
// перебитый более новым выбором вызов ничего не применяет; отказ действует в памяти сразу, как и раньше.
let consentWriteSeq = 0;
let consentWriteChain: Promise<void> = Promise.resolve();

export async function setAnalyticsConsent(state: AnalyticsConsentState): Promise<void> {
  const seq = ++consentWriteSeq;
  if (state !== 'granted') {
    // Revocation is immediate in memory; disabling native collection can finish after.
    const previous = consentMemory;
    consentMemory = state;
    if (state !== previous) notifyConsentListeners();
  }
  const run = async (): Promise<void> => {
    if (seq !== consentWriteSeq) {
      DebugLogger.info('[ANALYTICS-CONSENT]', `запись ${state} seq=${seq} пропущена — уже есть выбор seq=${consentWriteSeq}`);
      return;
    }
    if (state === 'granted') {
      // Keep the in-memory gate closed until the native Firebase SDK is enabled,
      // otherwise the first session events can be dropped before BigQuery sees them.
      await syncNativeCollection(true);
      if (seq !== consentWriteSeq) {
        // следующий в очереди (отказ) сам выключит нативный сбор
        DebugLogger.info('[ANALYTICS-CONSENT]', `granted seq=${seq} перебит выбором seq=${consentWriteSeq} во время включения сбора — не применяю`);
        return;
      }
      const previous = consentMemory;
      consentMemory = state;
      if (state !== previous) notifyConsentListeners();
    } else {
      await syncNativeCollection(false);
    }
    if (seq !== consentWriteSeq) return;
    try {
      await AsyncStorage.setItem(CONSENT_KEY, state);
    } catch (e) {
      // зачем: сбой записи больше не глотается — Настройки откатят тумблер с тостом; после перезапуска иначе вернулось бы старое значение
      DebugLogger.error('analytics_consent:persist', e instanceof Error ? e : new Error(String(e)), 'warning');
      throw e;
    }
  };
  const op = consentWriteChain.then(run);
  // ошибка уже в журнале и уходит вызывающему; очередь не должна застрять на ней
  consentWriteChain = op.catch((e: unknown) => DebugLogger.info('[ANALYTICS-CONSENT]', `очередь продолжена после сбоя seq=${seq}: ${e instanceof Error ? e.message : String(e)}`));
  return op;
}
