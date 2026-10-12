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
import { DebugLogger } from './debug-logger';

export type AiConsentState = 'granted' | 'denied' | 'unset';

export interface AiConsentModule {
  isGranted(): boolean;
  getState(): AiConsentState;
  hasDecision(): boolean;
  isHydrated(): boolean;
  subscribe(listener: (state: AiConsentState) => void): () => void;
  hydrateFromStorage(): Promise<void>;
  /** true — выбор записан на диск; false — сбой записи (в памяти выбор уже применён; Настройки откатывают тумблер с тостом). */
  setConsent(state: AiConsentState): Promise<boolean>;
  /** true — облако подтвердило запись текущего состояния; false — не ушло (отметка «не доставлено» остаётся, досылка при входе). */
  recordToCloud(): Promise<boolean>;
}

const LOG = '[PRIVACY-CONSENT]';
/** Через сколько после гидрации на запуске досылать недоставленное согласие — не мешаем первому кадру и входу. */
export const AI_CONSENT_RESUME_DELAY_MS = 5000;

function normalize(raw: string | null): AiConsentState {
  if (raw === 'granted' || raw === 'denied' || raw === 'unset') return raw;
  return 'unset';
}

export function createAiConsentModule(storageKey: string, cloudCallableName: string): AiConsentModule {
  let consentMemory: AiConsentState = 'unset';
  let hydrated = false;
  const listeners = new Set<(state: AiConsentState) => void>();
  let callable: ((data: { state: AiConsentState }) => Promise<unknown>) | null = null;
  // зачем (Дизайн через координатора 12.10, R1 E-2): ошибка облака глоталась без повтора — отзыв согласия мог так и не дойти
  // до записи подотчётности. Отметка «не доставлено» ставится при каждой смене и снимается только при подтверждённой
  // доставке ТОГО ЖЕ поколения: поздний ответ старой отправки не снимет отметку более свежего выбора.
  const pendingKey = `${storageKey}_cloud_pending_v1`;
  let generation = 0;
  let resumeScheduled = false;

  function notify(): void {
    listeners.forEach((listener) => {
      try { listener(consentMemory); } catch (e) {
      // listeners must not break consent updates
      DebugLogger.error('ai_consent_factory:notify', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    });
  }

  const api: AiConsentModule = {
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
      let pendingRaw: string | null = null;
      try {
        const [stored, pending] = await Promise.all([AsyncStorage.getItem(storageKey), AsyncStorage.getItem(pendingKey)]);
        next = normalize(stored);
        pendingRaw = pending;
      } catch (e) {
        console.warn(`${LOG} ${storageKey}: гидрация не прочитала хранилище reason=${e instanceof Error ? e.message : String(e)} → unset`);
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
      // Досылка при входе: недоставленная смена согласия уходит в облако один раз, после первого кадра и входа.
      if (pendingRaw && (next === 'granted' || next === 'denied') && !resumeScheduled) {
        resumeScheduled = true;
        console.log(`${LOG} ${storageKey}: найдена недоставленная запись (отметка=${pendingRaw}, состояние=${next}) — досылка через ${AI_CONSENT_RESUME_DELAY_MS} мс`);
        setTimeout(() => {
          resumeScheduled = false;
          void api.recordToCloud();
        }, AI_CONSENT_RESUME_DELAY_MS);
      }
    },
    setConsent: async (state) => {
      const previous = consentMemory;
      consentMemory = state;
      generation += 1;
      if (state !== previous) notify();
      try {
        await AsyncStorage.setItem(storageKey, state);
        // Отметка после самого выбора: без локальной записи досылать нечего.
        await AsyncStorage.setItem(pendingKey, state).catch((e: unknown) => {
          console.warn(`${LOG} ${storageKey}: отметка «не доставлено» не записалась reason=${e instanceof Error ? e.message : String(e)} — досылка при входе не сработает`);
        });
        return true;
      } catch (e) {
        // зачем (аудит Optimistic UI 13.10): сбой записи раньше глотался — тумблер «сохранён», а после перезапуска вернулся бы старый выбор.
        // Не бросаем (у шлюзов Диалогов и «Моих ошибок» нет catch), а возвращаем false — Настройки приватности откатывают тумблер с тостом.
        DebugLogger.error('ai_consent_factory:persist', e instanceof Error ? e : new Error(String(e)), 'warning');
        return false;
      }
    },
    recordToCloud: async () => {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
        console.log(`${LOG} ${storageKey}: облако выключено в этой сборке (expoGo=${IS_EXPO_GO} cloudSync=${CLOUD_SYNC_ENABLED}) — не отправляем`);
        return false;
      }
      const sentGeneration = generation;
      const sentState = consentMemory;
      const startedAt = Date.now();
      try {
        await ensureAnonUser();
        const authReady = await waitForAnonAuth();
        const uid = getCurrentUid();
        if (authReady !== true || !uid) {
          console.warn(`${LOG} ${storageKey}: нет входа (authReady=${String(authReady)} uid=${uid ? 'есть' : 'нет'}) — отметка остаётся, досылка при входе`);
          return false;
        }
        if (!callable) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getApp } = require('@react-native-firebase/app');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
          callable = httpsCallable(getFunctions(getApp(), 'us-central1'), cloudCallableName) as typeof callable;
        }
        await callable!({ state: sentState });
        if (generation === sentGeneration) {
          await AsyncStorage.removeItem(pendingKey).catch((e: unknown) => {
            console.warn(`${LOG} ${storageKey}: отметку не снять reason=${e instanceof Error ? e.message : String(e)} — при входе уйдёт лишняя (идемпотентная) запись`);
          });
        }
        console.log(`${LOG} ${storageKey}: облако приняло state=${sentState} за ${Date.now() - startedAt} мс${generation === sentGeneration ? ', отметка снята' : `, выбор сменился (поколение ${sentGeneration}→${generation}) — отметку держим`}`);
        return true;
      } catch (e) {
        // best-effort: локальный гейт (source of truth) уже обновлён, отметка «не доставлено» остаётся → досылка при входе
        console.warn(`${LOG} ${storageKey}: запись в облако не удалась за ${Date.now() - startedAt} мс reason=${e instanceof Error ? e.message : String(e)} — досылка при входе`);
        DebugLogger.error('ai_consent_factory:previous', e instanceof Error ? e : new Error(String(e)), 'warning');
        return false;
      }
    },
  };
  return api;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
