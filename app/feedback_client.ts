// Клиент отправки обобщённого отзыва (звёзды + текст) с любого экрана
// завершения. Паттерн — копия max_voice_feedback_client.ts.
//
// зачем (владелец 2026-08-25): «такой же блок [звёзды+текст] на экране
// завершения везде: уроки, словарь, диалог, арена».

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';

const FUNCTIONS_REGION = 'us-central1';

export const FEEDBACK_TEXT_MAX = 2000;

/** Держать в синхроне с FEEDBACK_KINDS на сервере (functions/src/feedback_entries.ts). */
export type FeedbackKind = 'lesson' | 'vocab' | 'dialogue' | 'arena_blitz' | 'arena_rating';

export interface FeedbackEntryInput {
  kind: FeedbackKind;
  /** id урока/сессии словаря/диалога/матча — один отзыв на попытку. */
  entityId: string;
  /** Человекочитаемое имя (напр. «Урок 5: Прошедшее время») — показывается в админке. */
  entityLabel?: string | null;
  message: string;
  /** 1–5; 0 — оценку не поставили (допустимо, если есть текст). */
  rating: number;
  lang: string;
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
    submitCallable = callable<SubmitRequest, SubmitResult>('submitFeedbackEntry');
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
 * Отправить отзыв. Бросает при сбое сети (вызывающий код кладёт запись в
 * очередь и досылает позже). null — только когда облако недоступно вовсе.
 */
export async function submitFeedbackEntry(input: FeedbackEntryInput): Promise<SubmitResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  await warmAppCheck();
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  const fn = getSubmitCallable();
  const res = await withCallableTimeout(
    fn({
      payload: {
        kind: input.kind,
        entityId: input.entityId,
        entityLabel: input.entityLabel ?? null,
        message: input.message.slice(0, FEEDBACK_TEXT_MAX),
        rating: input.rating,
        lang: input.lang,
        userName: input.userName ?? null,
        platform: Platform.OS,
        appVersion,
      },
    }),
    'submitFeedbackEntry',
  );
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
