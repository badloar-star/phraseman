/**
 * Клиент фичи «ИИ-объяснение вариантов» упражнения «Выбери фразу» (explainChoice).
 * Паттерн скопирован с app/explain_phrase_client.ts (тот же httpsCallable + App Check init).
 *
 * ИНВАРИАНТ: клиент шлёт correctEn + дистракторы СЫРЫМИ — хэш и нормализацию считает СЕРВЕР.
 * Клиент НЕ решает «годен/не годен»: вызывает CF и показывает текст как есть. Один батч-вызов
 * прогревает весь кэш (подтверждение + объяснение каждого дистрактора).
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withExplainCallableTimeout } from './explain_callable_timeout';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';

const FUNCTIONS_REGION = 'us-central1';
const explainChoiceInFlight = new Map<string, Promise<ExplainChoiceResponse>>();

function explainChoiceRequestKey(req: ExplainChoiceRequest): string {
  return JSON.stringify({
    usageId: req.usageId,
    correctEn: req.correctEn,
    phraseMeaning: req.phraseMeaning,
    distractors: req.distractors,
    lang: req.lang,
    studyTarget: req.studyTarget ?? 'en',
  });
}

export interface ExplainChoiceRequest {
  /** Stable across retries of one logical answer action; quota idempotency key. */
  usageId?: string;
  /** Правильный вариант на изучаемом языке (как показан пользователю). */
  correctEn: string;
  /** Смысл фразы на родном языке (для понимания моделью; не пересказывается в ответе). */
  phraseMeaning: string;
  /** Неправильные варианты (дистракторы), как показаны пользователю. */
  distractors: string[];
  /** Язык пользователя. */
  lang: string;
  /** Изучаемый язык (StudyTarget 'en'|'fr'). Отсутствие ⇒ сервер по умолчанию 'en'. */
  studyTarget?: string;
}

/**
 * Контракт ответа (explain_choice.ts) — единый источник правды для CF и клиента.
 *  - status 'ok'        — батч готов (свежий или из кэша)
 *  - status 'rejected'  — judge отклонил, тексты пустые
 *  - status 'exhausted' — бюджет/кап исчерпан, тексты пустые
 *  - status 'pending'   — другой запрос генерирует, тексты пустые
 */
export interface ExplainChoiceResponse {
  ok: true;
  /** Подтверждение при правильном выборе. */
  confirm: string;
  /** Карта: точная строка дистрактора → короткое «почему этот не подходит». */
  distractors: Record<string, string>;
  status: 'ok' | 'rejected' | 'exhausted' | 'pending';
  fromCache: boolean;
  reason?: 'free_limit' | 'system' | 'pending' | 'rejected';
}

/**
 * Запросить (и прогреть кэш) объяснений вариантов. Вызывается fire-and-forget сразу после
 * ответа пользователя — генерация идёт в фоне, текущий юзер её не ждёт; следующий, кто
 * откроет этот вопрос, увидит готовый текст мгновенно.
 */
export async function callExplainChoice(req: ExplainChoiceRequest): Promise<ExplainChoiceResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const key = explainChoiceRequestKey(req);
  const existing = explainChoiceInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<ExplainChoiceRequest, ExplainChoiceResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'explainChoice',
    );
    const res = await withExplainCallableTimeout(fn(req), 'explainChoice');
    return res.data;
  })().finally(() => {
    explainChoiceInFlight.delete(key);
  });

  explainChoiceInFlight.set(key, request);
  return request;
}
