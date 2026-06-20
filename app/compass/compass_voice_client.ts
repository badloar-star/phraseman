/**
 * Компас — клиент ИИ-голоса (тёплый комментарий дня). Клон explain_choice_client.
 *
 * Зовёт CF compassGenerate. Кэш-прогрев: один вызов готовит комментарий для всей
 * подписи дня, дальше у всех учеников с тем же днём — мгновенно из кэша ($0).
 *
 * ИЗОЛЯЦИЯ: вызывается только при compass_ai_voice. При любой ошибке/выключении
 * вызывающий хук берёт текст Библии (fallback), ИИ — необязательное украшение.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './../app_check_init';

const FUNCTIONS_REGION = 'us-central1';

export interface CompassVoiceRequest {
  /** Тип дня: easy | deep_dive | repair | comeback. */
  dayType: string;
  /** Темы дня (ключи/слабые темы) — сервер по ним строит подпись и текст. */
  topics: string[];
  /** Грубый уровень (для подписи кэша). */
  level: number;
  /** Язык пользователя. */
  lang: string;
}

export interface CompassVoiceResponse {
  ok: true;
  comment: string;
  status: 'ok' | 'rejected' | 'exhausted' | 'pending';
  fromCache: boolean;
}

export async function callCompassVoice(req: CompassVoiceRequest): Promise<CompassVoiceResponse> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<CompassVoiceRequest, CompassVoiceResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'compassGenerate',
  );
  const res = await fn(req);
  return res.data;
}
