// ════════════════════════════════════════════════════════════════════════════
// survey_client.ts — клиент опросов за осколки (callable-обёртки).
// Модель по образцу community_packs/functionsClient.ts.
// ════════════════════════════════════════════════════════════════════════════
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

export type SurveyQuestionClient = {
  id: string;
  type: 'single_choice' | 'text';
  text: string;
  options: { id: string; label: string }[];
};

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
  balanceAfter: number;
  shardsUpdatedAtMs: number | null;
};

export function isSurveyCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
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
 * Auth linking and Firebase App Check can finish just after a focused screen
 * starts its first request. Retry the read briefly so a newly enabled survey
 * does not disappear until the user leaves and re-enters the screen.
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
      if (lastResult.survey || lastResult.completion) return lastResult;
    } catch (error) {
      lastError = error;
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

// ── Админ (in-app админ-экран «Задания») ────────────────────────────────────
// Требует custom claim admin у пользователя (проверка на сервере). Доступно
// только из dev-хаба (ENABLE_DEV_TOOLS), поэтому обычные юзеры сюда не попадают.

/** Конфиг опроса в форме, которую принимает adminWriteShardSurvey. */
export type ShardSurveyConfigInput = {
  surveyId: string;
  enabled: boolean;
  title: Record<string, string>;
  subtitle?: Record<string, string>;
  rewardShards: number;
  minDaysBetweenSurveys?: number;
  audience?: { tier?: 'free' | 'premium' | 'any' };
  accentColor?: string;
  finalScreen?: { title?: Record<string, string>; subtitle?: Record<string, string> };
  questions: Array<{
    id: string;
    type: 'single_choice' | 'text';
    text: Record<string, string>;
    options?: Array<{ id: string; label: Record<string, string> }>;
  }>;
};

export type AdminSurveyRow = ShardSurveyConfigInput & {
  totalResponses?: number;
};

export async function adminWriteShardSurvey(
  survey: ShardSurveyConfigInput,
): Promise<{ ok: boolean; surveyId: string }> {
  return callFunction<{ survey: ShardSurveyConfigInput }, { ok: boolean; surveyId: string }>(
    'adminWriteShardSurvey',
    { survey },
  );
}

export async function adminDeleteShardSurvey(
  surveyId: string,
): Promise<{ ok: boolean; surveyId: string }> {
  return callFunction<{ surveyId: string }, { ok: boolean; surveyId: string }>(
    'adminDeleteShardSurvey',
    { surveyId },
  );
}

// ИИ-перевод русских строк на все языки приложения (reuse adminTranslateMessage).
// Вход: массив строк на русском. Выход: langKey (Uk/Es/PtBr/Vi/Id/Tr/Pl) → массив
// той же длины. Ключи маппим на суффиксы LocalizedString (uk/es/pt-BR/...).
const TRANSLATE_KEY_TO_LOCALE: Record<string, string> = {
  Uk: 'uk', Es: 'es', PtBr: 'pt-BR', Vi: 'vi', Id: 'id', Tr: 'tr', Pl: 'pl',
};

export async function adminTranslateFields(
  ruFields: string[],
): Promise<Record<string, string[]>> {
  const res = await callFunction<
    { fields: string[]; context: string },
    { ok: boolean; translations: Record<string, string[]> }
  >('adminTranslateMessage', { fields: ruFields, context: 'Опрос в приложении: задание за осколки' });
  return res.translations ?? {};
}

/**
 * Собрать LocalizedString-объекты для набора русских строк одним ИИ-вызовом.
 * Возвращает массив той же длины: [{ ru, uk, es, ... }, ...].
 */
export async function localizeRuStrings(ruFields: string[]): Promise<Record<string, string>[]> {
  const clean = ruFields.map((s) => String(s ?? ''));
  const out: Record<string, string>[] = clean.map((ru) => ({ ru }));
  try {
    const translations = await adminTranslateFields(clean);
    for (const [key, arr] of Object.entries(translations)) {
      const locale = TRANSLATE_KEY_TO_LOCALE[key];
      if (!locale || !Array.isArray(arr)) continue;
      arr.forEach((v, i) => {
        if (out[i] && typeof v === 'string' && v.trim()) out[i][locale] = v;
      });
    }
  } catch {
    // Перевод не критичен: без него останется только ru (fallback в приложении).
  }
  return out;
}

/**
 * Список опросов + число ответов для админ-экрана. Читает Firestore напрямую
 * (как _admin_settings_testers): shard_surveys + shard_survey_stats. Никогда
 * не бросает — при ошибке вернёт [].
 */
export async function adminListShardSurveys(): Promise<AdminSurveyRow[]> {
  if (!isSurveyCloudEnabled()) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firestore = require('@react-native-firebase/firestore').default;
    const db = firestore();
    const [surveysSnap, statsSnap] = await Promise.all([
      db.collection('shard_surveys').get(),
      db.collection('shard_survey_stats').get(),
    ]);
    const stats: Record<string, number> = {};
    statsSnap.forEach((d: { id: string; data: () => { totalResponses?: number } }) => {
      stats[d.id] = Number(d.data()?.totalResponses ?? 0) || 0;
    });
    const rows: AdminSurveyRow[] = [];
    surveysSnap.forEach((d: { id: string; data: () => Record<string, unknown> }) => {
      const data = d.data() as unknown as ShardSurveyConfigInput;
      rows.push({ ...data, surveyId: d.id, totalResponses: stats[d.id] ?? 0 });
    });
    return rows;
  } catch {
    return [];
  }
}

/** 3 готовых тестовых опроса. Создаются ВЫКЛЮЧЕННЫМИ — включаешь тумблером. */
export const TEST_SHARD_SURVEYS: ShardSurveyConfigInput[] = [
  {
    surveyId: 'test_first_impression',
    enabled: false, rewardShards: 3, minDaysBetweenSurveys: 7,
    title: { ru: 'Первое впечатление' },
    subtitle: { ru: 'Пара вопросов — и жемчужина твоя' },
    audience: { tier: 'any' },
    questions: [
      { id: 'most_useful', type: 'single_choice', text: { ru: 'Что показалось самым полезным?' }, options: [
        { id: 'lessons', label: { ru: 'Уроки' } }, { id: 'quizzes', label: { ru: 'Квизы' } },
        { id: 'flashcards', label: { ru: 'Карточки' } }, { id: 'nothing', label: { ru: 'Пока ничего' } },
      ] },
      { id: 'confusing', type: 'single_choice', text: { ru: 'Что было непонятно вначале?' }, options: [
        { id: 'what_next', label: { ru: 'Что делать дальше' } }, { id: 'how_lesson', label: { ru: 'Как проходить урок' } },
        { id: 'all_clear', label: { ru: 'Всё было ясно' } },
      ] },
      { id: 'improve', type: 'text', text: { ru: 'Одна вещь, которую бы улучшил?' } },
    ],
  },
  {
    surveyId: 'test_engagement',
    enabled: false, rewardShards: 3, minDaysBetweenSurveys: 7,
    title: { ru: 'Почему не занимаешься чаще' },
    subtitle: { ru: 'Помоги сделать приложение лучше' },
    audience: { tier: 'any' },
    questions: [
      { id: 'blocker', type: 'single_choice', text: { ru: 'Что мешает заниматься каждый день?' }, options: [
        { id: 'no_time', label: { ru: 'Нет времени' } }, { id: 'forget', label: { ru: 'Забываю' } },
        { id: 'boring', label: { ru: 'Скучно' } }, { id: 'hard', label: { ru: 'Сложно' } },
        { id: 'none', label: { ru: 'Ничего, занимаюсь' } },
      ] },
      { id: 'bring_back', type: 'single_choice', text: { ru: 'Что вернуло бы тебя в приложение?' }, options: [
        { id: 'reminders', label: { ru: 'Напоминания' } }, { id: 'topics', label: { ru: 'Новые темы' } },
        { id: 'friends', label: { ru: 'Челлендж с друзьями' } }, { id: 'rewards', label: { ru: 'Награды' } },
      ] },
      { id: 'missing', type: 'text', text: { ru: 'Чего не хватает в приложении?' } },
    ],
  },
  {
    surveyId: 'test_monetization',
    enabled: false, rewardShards: 3, minDaysBetweenSurveys: 7,
    title: { ru: 'Оценка Plus' },
    subtitle: { ru: 'Что думаешь о платной версии' },
    audience: { tier: 'any' },
    questions: [
      { id: 'considered', type: 'single_choice', text: { ru: 'Задумывался о покупке Plus?' }, options: [
        { id: 'bought', label: { ru: 'Уже купил' } }, { id: 'thinking', label: { ru: 'Думаю' } },
        { id: 'expensive', label: { ru: 'Нет, дорого' } }, { id: 'enough_free', label: { ru: 'Хватает бесплатного' } },
      ] },
      { id: 'trigger', type: 'single_choice', text: { ru: 'Что заставило бы купить Plus?' }, options: [
        { id: 'more_lessons', label: { ru: 'Больше уроков' } }, { id: 'no_ai_limit', label: { ru: 'Без лимитов ИИ' } },
        { id: 'no_ads', label: { ru: 'Убрать рекламу' } }, { id: 'nothing', label: { ru: 'Ничего' } },
      ] },
      { id: 'fair_price', type: 'text', text: { ru: 'Справедливая цена за месяц?' } },
    ],
  },
];
