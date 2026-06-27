/**
 * Клиент фичи «ИИ-разбор тематического квиза» (explainQuiz).
 * Паттерн скопирован с app/explain_choice_client.ts (тот же httpsCallable + App Check init).
 *
 * ИЗОЛЯЦИЯ: эта фича работает ТОЛЬКО для тематических квизов (Кухня/Дом/…). Квизы
 * легко/средне/сложно используют свои статичные разборы и сюда НЕ ходят.
 *
 * ИНВАРИАНТ: клиент шлёт correctEn + варианты СЫРЫМИ — хэш и нормализацию считает СЕРВЕР.
 * Клиент НЕ решает «годен/не годен»: вызывает CF и показывает текст как есть. Один батч-вызов
 * прогревает весь кэш (разбор правильного + по строке на каждый неверный вариант).
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withExplainCallableTimeout } from './explain_callable_timeout';

const FUNCTIONS_REGION = 'us-central1';
const explainQuizInFlight = new Map<string, Promise<ExplainQuizResponse>>();

function explainQuizRequestKey(req: ExplainQuizRequest): string {
  return JSON.stringify({
    correctEn: req.correctEn,
    questionPrompt: req.questionPrompt,
    wrongOptions: req.wrongOptions,
    lang: req.lang,
  });
}

export interface ExplainQuizRequest {
  /** Правильный английский вариант (как показан пользователю). */
  correctEn: string;
  /** Смысл вопроса на родном языке (для понимания моделью; не пересказывается в ответе). */
  questionPrompt: string;
  /** Неправильные варианты, как показаны пользователю. */
  wrongOptions: string[];
  /** Язык пользователя. */
  lang: string;
}

/**
 * Контракт ответа (explain_quiz.ts) — единый источник правды для CF и клиента.
 *  - status 'ok'        — батч готов (свежий или из кэша)
 *  - status 'rejected'  — judge отклонил, тексты пустые
 *  - status 'exhausted' — бюджет/кап исчерпан, тексты пустые
 *  - status 'pending'   — другой запрос генерирует, тексты пустые
 */
export interface ExplainQuizResponse {
  ok: true;
  /** Разбор правильного варианта (похвала + почему это естественный английский). */
  confirm: string;
  /** Карта: точная строка неверного варианта → короткое «почему этот не тот». */
  options: Record<string, string>;
  status: 'ok' | 'rejected' | 'exhausted' | 'pending';
  fromCache: boolean;
}

/**
 * Запросить (и прогреть кэш) ИИ-разбор тематического квиза. Вызывается сразу после ответа
 * пользователя — первый игрок ждёт генерацию (~2с, под шиммером), следующий, кто откроет тот же
 * вопрос, видит готовый текст мгновенно ($0).
 */
export async function callExplainQuiz(req: ExplainQuizRequest): Promise<ExplainQuizResponse> {
  const key = explainQuizRequestKey(req);
  const existing = explainQuizInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<ExplainQuizRequest, ExplainQuizResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'explainQuiz',
    );
    const res = await withExplainCallableTimeout(fn(req), 'explainQuiz');
    return res.data;
  })().finally(() => {
    explainQuizInFlight.delete(key);
  });

  explainQuizInFlight.set(key, request);
  return request;
}
