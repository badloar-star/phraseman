/**
 * Клиент фичи «Объясни как для 5-летнего» (explainPhrase + submitExplainReport).
 * Паттерн скопирован с app/ai_dialog_client.ts (тот же httpsCallable + App Check init).
 *
 * ИНВАРИАНТ: клиент шлёт phraseEn СЫРЫМ — хэш считает СЕРВЕР (explain_cache.phraseHashFor).
 * Клиент НИКОГДА не вычисляет phraseHash и НЕ содержит логики «годен/не годен»: он лишь
 * вызывает CF и показывает text как есть. Качество решает сервер (judge + репорты).
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withExplainCallableTimeout } from './explain_callable_timeout';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';
import { readExplainLocalCache, writeExplainLocalCache } from './explain_local_cache';
import { warmAiFunction, withAiCallableRetry } from './ai_callable_resilience';

const FUNCTIONS_REGION = 'us-central1';
const explainPhraseInFlight = new Map<string, Promise<ExplainPhraseResponse>>();

function explainPhraseRequestKey(req: ExplainPhraseRequest): string {
  return JSON.stringify({
    phraseEn: req.phraseEn,
    phraseMeaning: req.phraseMeaning,
    lang: req.lang,
    studyTarget: req.studyTarget ?? 'en',
  });
}

export interface ExplainPhraseRequest {
  /** Фраза на изучаемом языке, как показана пользователю (сервер её нормализует и хэширует). */
  phraseEn: string;
  /** Перевод/смысл на родном языке — сервер использует его для fallback-текста. */
  phraseMeaning: string;
  /** Язык пользователя (для генерации/fallback). */
  lang: string;
  /** Изучаемый язык (StudyTarget 'en'|'fr'). Отсутствие ⇒ сервер по умолчанию 'en'. */
  studyTarget?: string;
}

/**
 * Контракт ответа закреплён в plan-02 (explain_phrase.ts) — единый источник правды для
 * CF и клиента. Сервер ВСЕГДА собирает fallback-текст (никогда клиент); клиент рендерит
 * text как есть и не решает качество.
 *  - status 'ok'        — настоящее объяснение (свежее или из кэша)
 *  - status 'rejected'  — judge/репорты отклонили, text = fallback
 *  - status 'exhausted' — упёрлись в глобальный/юзер-бюджет, text = fallback
 *  - status 'pending'   — другой запрос генерирует, text = fallback (v1 показывает fallback)
 */
export interface ExplainPhraseResponse {
  ok: true;
  text: string;
  status: 'ok' | 'rejected' | 'exhausted' | 'pending';
  fromCache: boolean;
}

/** Необязательные крючки вызова: UI подменяет подпись под скелетоном на повторе. */
export interface CallExplainPhraseOptions {
  /** Дёргается, когда первый вызов не удался и пошёл тихий повтор. */
  onRetryStart?: () => void;
}

/**
 * Прогрев инстанса explainPhrase. Зовётся при ОТКРЫТИИ карточки фразы — пока
 * пользователь читает, инстанс просыпается, и нажатие «объясни» попадает на
 * тёплый сервер.
 *
 * зачем: у функции minInstances: 0 (владелец не платит за тёплый инстанс,
 * сторож ai_functions_warm_instance_contract). Прогрев переносит холодный старт
 * в паузу, когда человек и так занят. Ничего не стоит: сервер отвечает на ping
 * до Firestore и OpenAI, инстанс гаснет сам.
 *
 * Никогда не бросает — вызывать через `void`.
 */
export function warmExplainPhrase(): void {
  void warmAiFunction('explainPhrase', async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'explainPhrase');
    return fn({ warmupPing: true });
  });
}

/** Запросить объяснение фразы. App Check инициализируется первым (как в ai_dialog_client). */
export async function callExplainPhrase(
  req: ExplainPhraseRequest,
  options?: CallExplainPhraseOptions,
): Promise<ExplainPhraseResponse> {
  const key = explainPhraseRequestKey(req);
  const localCached = await readExplainLocalCache({ kind: 'phrase', key });
  if (localCached?.status === 'ok') {
    return { ok: true, text: localCached.text, status: 'ok', fromCache: true };
  }
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const existing = explainPhraseInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<ExplainPhraseRequest, ExplainPhraseResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'explainPhrase',
    );
    // зачем: холодный старт (minInstances: 0) изредка отбивается Cloud Run как
    // «no available instance» — пользователь видел ошибку на ровном месте.
    // Повтор идемпотентен: объяснение фразы ничего не списывает при неудаче.
    const res = await withAiCallableRetry(
      () => withExplainCallableTimeout(fn(req), 'explainPhrase'),
      { label: 'explainPhrase', onRetryStart: options?.onRetryStart },
    );
    if (res.data.status === 'ok') {
      void writeExplainLocalCache({ kind: 'phrase', key }, {
        text: res.data.text,
        status: res.data.status,
      });
    }
    return res.data;
  })().finally(() => {
    explainPhraseInFlight.delete(key);
  });

  explainPhraseInFlight.set(key, request);
  return request;
}

export interface SubmitExplainReportRequest {
  /**
   * На какой кэш жалуемся. 'phrase' (дефолт) — объяснение фразы, 'mistake' — разбор ошибки,
   * 'quiz' — ИИ-разбор тематического квиза. Сервер сверяет с белым списком (неизвестное →
   * 'phrase'). От kind зависит кэш-коллекция и схема хэша на сервере.
   */
  kind?: 'phrase' | 'mistake' | 'quiz';
  /**
   * Для kind='phrase' — английская фраза. Для kind='mistake'/'quiz' — ПРАВИЛЬНЫЙ (целевой) ответ.
   * Сервер сам выведет хэш; клиент хэш НЕ шлёт.
   */
  phraseEn: string;
  /**
   * Для kind='mistake' — неправильный ответ юзера (кэш per-(target,userAnswer,lang)).
   * Для kind='quiz' — необязательно: вариант, который выбрал юзер (контекст для админа).
   */
  userAnswer?: string;
  /**
   * Только для kind='quiz': ВСЕ варианты вопроса (правильный + неверные), как показаны юзеру.
   * Кэш квиза per-(correct, option-set, lang) — без набора репорт попал бы не в тот док.
   * Порядок не важен (сервер сортирует); хэш всё равно считает сервер.
   */
  choices?: string[];
  /**
   * Язык объяснения, на которое жалуемся. Кэш per-(…,lang) — без языка репорт попал бы
   * не в тот док. Сервер нормализует тем же резолвером (unknown → ru); хэш всё равно считает он.
   */
  lang: string;
  /** Причина из меню жалобы. Сервер сверяет с белым списком (неизвестное → unclear). */
  reason?: string;
  /** Свободный комментарий юзера. Сервер чистит и режет до 300 символов. */
  comment?: string;
}

export interface SubmitExplainReportResponse {
  ok: boolean;
}

/**
 * Пожаловаться на объяснение фразы («сообщить о баге»). Шлёт ТОЛЬКО phraseEn —
 * сервер выводит phraseHash и инкрементит счётчик репортов (бэкстоп-модерация, уровень 4).
 * UI-кнопку подключает план 04.
 */
export async function callSubmitExplainReport(
  req: SubmitExplainReportRequest,
): Promise<SubmitExplainReportResponse> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<SubmitExplainReportRequest, SubmitExplainReportResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'submitExplainReport',
  );
  const res = await fn(req);
  return res.data;
}
