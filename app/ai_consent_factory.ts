/**
 * ai_consent_factory.ts — общая фабрика для локальных opt-in флагов на
 * отдельные AI-фичи (разбор ошибок, AI-диалоги, ...). Каждая AI-фича со своим
 * сетевым вызовом к стороннему провайдеру получает СВОЙ флаг под своим ключом
 * (пользователь может согласиться на одно и отказаться от другого — это разные
 * решения, поэтому не один общий булев флаг на все AI-фичи разом).
 *
 * Паттерн (снапшот в памяти + гидрация из AsyncStorage в bootstrap → синхронный
 * гейт с первого кадра) взят из app/analytics_consent.ts; изначально жил как
 * копипаста в app/ai_explain_consent.ts, вынесен сюда при добавлении второго
 * потребителя (AI-диалоги), чтобы не плодить третью копию для следующей фичи.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { ensureAnonUser, getCurrentUid, waitForAnonAuth } from './cloud_sync';

export type AiConsentState = 'granted' | 'denied' | 'unset';

export interface AiConsentModule {
  isGranted(): boolean;
  getState(): AiConsentState;
  hasDecision(): boolean;
  isHydrated(): boolean;
  subscribe(listener: (state: AiConsentState) => void): () => void;
  hydrateFromStorage(): Promise<void>;
  setConsent(state: AiConsentState): Promise<void>;
  recordToCloud(): Promise<void>;
}

function normalize(raw: string | null): AiConsentState {
  if (raw === 'granted' || raw === 'denied' || raw === 'unset') return raw;
  return 'unset';
}

export function createAiConsentModule(storageKey: string, cloudCallableName: string): AiConsentModule {
  let consentMemory: AiConsentState = 'unset';
  let hydrated = false;
  const listeners = new Set<(state: AiConsentState) => void>();
  let callable: ((data: { state: AiConsentState }) => Promise<unknown>) | null = null;

  function notify(): void {
    listeners.forEach((listener) => {
      try { listener(consentMemory); } catch { /* listeners must not break consent updates */ }
    });
  }

  return {
    isGranted: () => consentMemory === 'granted',
    getState: () => consentMemory,
    hasDecision: () => consentMemory === 'granted' || consentMemory === 'denied',
    isHydrated: () => hydrated,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    hydrateFromStorage: async () => {
      let next: AiConsentState = 'unset';
      try {
        next = normalize(await AsyncStorage.getItem(storageKey));
      } catch {
        next = 'unset';
      } finally {
        consentMemory = next;
        hydrated = true;
        // Уведомляем ВСЕГДА, не только при смене значения: потребители ждут
        // именно факт «гидрация завершилась» — при первом запуске значение
        // остаётся 'unset' → 'unset', и без безусловного notify их gate-эффект
        // никогда не проснулся бы, чтобы решить, показывать модалку или нет.
        notify();
      }
    },
    setConsent: async (state) => {
      const previous = consentMemory;
      consentMemory = state;
      if (state !== previous) notify();
      try {
        await AsyncStorage.setItem(storageKey, state);
      } catch {
        /* no-op: в памяти уже обновлено, перезапишется при следующей попытке */
      }
    },
    recordToCloud: async () => {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
      try {
        await ensureAnonUser();
        if ((await waitForAnonAuth()) !== true || !getCurrentUid()) return;
        if (!callable) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getApp } = require('@react-native-firebase/app');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
          callable = httpsCallable(getFunctions(getApp(), 'us-central1'), cloudCallableName) as typeof callable;
        }
        await callable!({ state: consentMemory });
      } catch {
        /* best-effort: локальный гейт (source of truth) уже обновлён */
      }
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
