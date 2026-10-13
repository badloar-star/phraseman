// ════════════════════════════════════════════════════════════════════════════
// survey_client.ts — клиент опросов за осколки (callable-обёртки).
// Модель по образцу community_packs/functionsClient.ts.
// ════════════════════════════════════════════════════════════════════════════
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';

export type SurveyQuestionClient = {
  id: string;
  type: 'single_choice' | 'text';
  text: string;
  options: {
    id: string;
    label: string;
    action?:
      | { kind: 'store_review'; cta: string }
      | { kind: 'app_route'; route: SurveyAppRoute; cta: string };
  }[];
};

// зачем: PM-171 — маршрут '/ideas_catalog' убран вместе с удалённым разделом «Идеи».
// зачем: Q3 (координатор 01.10) — переход в Арену убран (раздел удалён, D83), а список
// стал значением: сервер с новым белым списком уедет только после релиза, и до тех пор
// живой опрос может прислать переход в Арену/Лигу — клиент отсекает его сам
// (survey_followups.ts). Зеркало functions/src/shard_survey_core.ts SURVEY_APP_ROUTES.
export const SURVEY_APP_ROUTES = [
  '/referrals',
  '/settings_themes',
  '/settings_notifications',
  '/(tabs)/home',
  '/flashcards',
  '/streak_stats',
  '/lingman_videos',
  '/support_report',
  '/flashcards_training_setup?mode=blitz',
  '/achievements_screen',
] as const;

export type SurveyAppRoute = (typeof SURVEY_APP_ROUTES)[number];

export function isSurveyAppRoute(route: unknown): route is SurveyAppRoute {
  return typeof route === 'string' && (SURVEY_APP_ROUTES as readonly string[]).includes(route);
}

export type ActiveSurvey = {
  surveyId: string;
  title: string;
  subtitle: string;
  rewardShards: number;
  accentColor?: string;
  finalTitle?: string;
  finalSubtitle?: string;
  questions: SurveyQuestionClient[];
};

export type ActiveSurveyLookupResult = {
  survey: ActiveSurvey | null;
  completion: { completedAtMs: number } | null;
};

export type SubmitSurveyResult = {
  ok: boolean;
  alreadyGranted: boolean;
  reward: number;
  eventId: string;
};

export function isSurveyCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  const fn = callable<TReq, TRes>(name);
  const res = await fn(data);
  return res.data;
}

export async function fetchActiveSurvey(data: {
  stableId: string;
  platform: string;
  lang: string;
}): Promise<ActiveSurveyLookupResult> {
  if (!isSurveyCloudEnabled()) return { survey: null, completion: null };
  const res = await callFunction<typeof data, ActiveSurveyLookupResult>(
    'getActiveShardSurvey',
    data,
  );
  return { survey: res.survey ?? null, completion: res.completion ?? null };
}

/**
 * Короткий повтор чтения опроса — ТОЛЬКО при ошибке вызова (вход и связка аккаунта могут закончиться сразу после того, как экран
 * отправил первый запрос; холодный старт функции). Ответ «опроса нет» честный (детерминированная ротация) и не повторяется.
 */
export async function fetchActiveSurveyWithRetry(
  data: { stableId: string; platform: string; lang: string },
  options: { attempts?: number; delayMs?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<ActiveSurveyLookupResult> {
  const requestedAttempts = Number(options.attempts ?? 3);
  const attempts = Math.min(5, Math.max(1, Number.isFinite(requestedAttempts)
    ? Math.floor(requestedAttempts)
    : 3));
  const delayMs = Math.min(2000, Math.max(0, Math.floor(Number(options.delayMs ?? 350)) || 0));
  const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  let lastResult: ActiveSurveyLookupResult = { survey: null, completion: null };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      lastResult = await fetchActiveSurvey(data);
      // зачем (смета Firebase R1, п.8): честный ответ «опроса нет» больше не повторяется 3 раза — опрос дня выбирается детерминированной
      // UTC-ротацией сервера, повтор через 350 мс вернёт то же самое. Повторяем только при ОШИБКЕ (сеть, холодный старт функции).
      lastError = undefined;
      if (!lastResult.survey && !lastResult.completion) {
        console.log(`[SURVEY] fetch: опроса нет (attempt=${attempt + 1}/${attempts}) — без повтора`);
      }
      return lastResult;
    } catch (error) {
      lastError = error;
      console.warn(`[SURVEY] fetch: ошибка attempt=${attempt + 1}/${attempts} — ${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)}`);
    }
    if (attempt < attempts - 1 && delayMs > 0) {
      await wait(delayMs);
    }
  }
  if (lastError) throw lastError;
  return lastResult;
}

export async function submitSurvey(data: {
  stableId: string;
  surveyId: string;
  answers: Record<string, { optionId?: string; comment?: string }>;
  platform: string;
  appVersion: string;
}): Promise<SubmitSurveyResult> {
  return callFunction<typeof data, SubmitSurveyResult>('submitShardSurvey', data);
}
