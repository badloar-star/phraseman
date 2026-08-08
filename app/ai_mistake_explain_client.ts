import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withExplainCallableTimeout } from './explain_callable_timeout';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';
import { readExplainLocalCache, writeExplainLocalCache } from './explain_local_cache';
import { warmAiFunction, withAiCallableRetry, aiAttemptTimeoutMs } from './ai_callable_resilience';
import { EXPLAIN_CALLABLE_TIMEOUT_MS } from './explain_callable_timeout';

const FUNCTIONS_REGION = 'us-central1';
const explainMistakeInFlight = new Map<string, Promise<ExplainMistakeResponse>>();

export type MistakeExplainVariant = 'full' | 'eli5';

export interface MistakeDiffPair {
  expected: string;
  picked: string;
}

export interface ExplainMistakeRequest {
  lessonId: number;
  phraseId: string;
  studyTarget: string;
  interfaceLang: string;
  prompt?: string;
  userAnswer: string;
  targetAnswer: string;
  phraseMeaning?: string;
  selectedWrongWord?: string;
  expectedWord?: string;
  /** Every mismatched word pair, not just the first — lets the AI explain the WHOLE error. */
  diffPairs?: MistakeDiffPair[];
  /** 'full' = inline breakdown (default), 'eli5' = explain-like-I'm-five modal text. */
  variant?: MistakeExplainVariant;
}

export interface ExplainMistakeResponse {
  ok: true;
  text: string;
  remainingQuota: number;
  model: string;
  fromCache?: boolean;
  variant?: MistakeExplainVariant;
}

function explainMistakeRequestKey(req: ExplainMistakeRequest): string {
  return JSON.stringify({
    lessonId: req.lessonId,
    phraseId: req.phraseId,
    studyTarget: req.studyTarget,
    interfaceLang: req.interfaceLang,
    prompt: req.prompt,
    userAnswer: req.userAnswer,
    targetAnswer: req.targetAnswer,
    phraseMeaning: req.phraseMeaning,
    selectedWrongWord: req.selectedWrongWord,
    expectedWord: req.expectedWord,
    diffPairs: req.diffPairs,
    variant: req.variant,
  });
}

/** Необязательные крючки вызова: UI подменяет подпись под скелетоном на повторе. */
export interface CallExplainMistakeOptions {
  /** Дёргается, когда первый вызов не удался и пошёл тихий повтор. */
  onRetryStart?: () => void;
}

/**
 * Прогрев инстанса explainMistake. Зовётся В МОМЕНТ ОШИБКИ пользователя — пока
 * он смотрит на свой неверный ответ, инстанс просыпается, и разбор приходит
 * без паузы.
 *
 * зачем: у функции minInstances: 0 (владелец не платит за тёплый инстанс,
 * сторож ai_functions_warm_instance_contract). Здесь окно прогрева самое
 * надёжное: между ошибкой и появлением разбора всегда есть пара секунд.
 *
 * Никогда не бросает — вызывать через `void`.
 */
export function warmExplainMistake(): void {
  void warmAiFunction('explainMistake', async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'explainMistake');
    return fn({ warmupPing: true });
  });
}

export async function callExplainMistake(
  req: ExplainMistakeRequest,
  options?: CallExplainMistakeOptions,
): Promise<ExplainMistakeResponse> {
  const key = explainMistakeRequestKey(req);
  const localCached = await readExplainLocalCache({ kind: 'mistake', key });
  if (localCached?.status === 'ok') {
    return {
      ok: true,
      text: localCached.text,
      remainingQuota: 0,
      model: 'local-cache',
      fromCache: true,
      variant: req.variant ?? 'full',
    };
  }
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const existing = explainMistakeInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<ExplainMistakeRequest, ExplainMistakeResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'explainMistake',
    );
    // зачем: холодный старт (minInstances: 0) изредка отбивается Cloud Run как
    // «no available instance». Повтор идемпотентен: неудавшийся разбор ничего
    // не списал (серверный кап считается уже после входа в тело функции).
    // Вторая попытка ждёт вдвое меньше — см. aiAttemptTimeoutMs.
    const res = await withAiCallableRetry(
      (attempt) => withExplainCallableTimeout(
        fn(req),
        'explainMistake',
        aiAttemptTimeoutMs(EXPLAIN_CALLABLE_TIMEOUT_MS, attempt),
      ),
      { label: 'explainMistake', onRetryStart: options?.onRetryStart },
    );
    if (res.data.ok && res.data.text.trim()) {
      void writeExplainLocalCache({ kind: 'mistake', key }, {
        text: res.data.text,
        status: 'ok',
      });
    }
    return res.data;
  })().finally(() => {
    explainMistakeInFlight.delete(key);
  });

  explainMistakeInFlight.set(key, request);
  return request;
}
