// Клиент отправки отзыва о звонке с MAX.
//
// зачем (владелец 2026-08-23): «на экране результатов в самом верху добавь окно
// ввода фидбека с кнопкой отправить». Один отзыв на звонок: повторная отправка
// правит свой же (id документа детерминированный на сервере), поэтому клиенту
// не нужен ни счётчик, ни отдельная защита от повторного тапа.
//
// Паттерн (ленивая callable, прогрев, таймаут) — копия ideas_client.ts.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';

const FUNCTIONS_REGION = 'us-central1';

/** Тот же предел, что и на сервере: длиннее просто отрежется. */
export const VOICE_FEEDBACK_TEXT_MAX = 2000;

export interface VoiceFeedbackInput {
  sessionId: string;
  message: string;
  /** 1–5; 0 — оценку не поставили (допустимо, если есть текст). */
  rating: number;
  lang: string;
  cefr?: string | null;
  format?: string | null;
  callSeconds?: number;
  userName?: string | null;
}

type SubmitResult = { ok: boolean; id?: string };
type SubmitRequest = { payload: Record<string, unknown> };
type SubmitCallable = (data: SubmitRequest) => Promise<{ data: SubmitResult }>;

let submitCallable: SubmitCallable | null = null;
let appCheckWarmupInFlight: Promise<void> | null = null;

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

function getSubmitCallable(): SubmitCallable {
  if (!submitCallable) {
    submitCallable = callable<SubmitRequest, SubmitResult>('submitMaxVoiceFeedback');
  }
  return submitCallable;
}

function warmAppCheck(): Promise<void> {
  if (!appCheckWarmupInFlight) {
    appCheckWarmupInFlight = initFirebaseAppCheckIfAvailable()
      .catch(() => false)
      .then(() => undefined)
      .finally(() => {
        appCheckWarmupInFlight = null;
      });
  }
  return appCheckWarmupInFlight;
}

/**
 * Отправить отзыв о звонке. Бросает при сбое сети (экран откатывает состояние
 * и предлагает повторить). null — только когда облако недоступно вовсе.
 */
export async function submitMaxVoiceFeedback(input: VoiceFeedbackInput): Promise<SubmitResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  await warmAppCheck();
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  const fn = getSubmitCallable();
  const res = await withCallableTimeout(
    fn({
      payload: {
        sessionId: input.sessionId,
        message: input.message.slice(0, VOICE_FEEDBACK_TEXT_MAX),
        rating: input.rating,
        lang: input.lang,
        cefr: input.cefr ?? null,
        format: input.format ?? null,
        callSeconds: input.callSeconds ?? 0,
        userName: input.userName ?? null,
        platform: Platform.OS,
        appVersion,
      },
    }),
    'submitMaxVoiceFeedback',
  );
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
