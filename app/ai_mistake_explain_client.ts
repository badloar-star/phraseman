import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withExplainCallableTimeout } from './explain_callable_timeout';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';
import { readExplainLocalCache, writeExplainLocalCache } from './explain_local_cache';
import { warmAiFunction, withAiCallableRetry, aiAttemptTimeoutMs } from './ai_callable_resilience';
import { EXPLAIN_CALLABLE_TIMEOUT_MS } from './explain_callable_timeout';
import { getNetStatus } from './net_status';

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
  /** Present on new full responses so both UI variants can be prepared together. */
  fullText?: string;
  /** Present on new full responses; cached under the existing ELI5 request identity. */
  eli5Text?: string;
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
  if (getNetStatus() === 'offline') return;
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
  const normalizedReq: ExplainMistakeRequest = { ...req, variant: req.variant ?? 'full' };
  const variant = normalizedReq.variant!;
  const key = explainMistakeRequestKey(normalizedReq);
  const pairedEli5Key = variant === 'full'
    ? explainMistakeRequestKey({ ...normalizedReq, variant: 'eli5' })
    : null;
  const [localCached, pairedEli5Cached] = await Promise.all([
    readExplainLocalCache({ kind: 'mistake', key }),
    pairedEli5Key
      ? readExplainLocalCache({ kind: 'mistake', key: pairedEli5Key })
      : Promise.resolve(null),
  ]);
  if (localCached?.status === 'ok') {
    const pairedEli5Text = pairedEli5Cached?.status === 'ok'
      ? pairedEli5Cached.text.trim() || undefined
      : undefined;
    return {
      ok: true,
      text: localCached.text,
      fullText: variant === 'full' ? localCached.text : undefined,
      eli5Text: pairedEli5Text,
      remainingQuota: 0,
      model: 'local-cache',
      fromCache: true,
      variant,
    };
  }
  // Локальный кэш уже проверен выше. При подтверждённом offline нельзя ни
  // будить Cloud Function, ни входить в её retry-цепочку.
  if (getNetStatus() === 'offline') throw new Error('mistake_explain_offline');
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
        fn(normalizedReq),
        'explainMistake',
        aiAttemptTimeoutMs(EXPLAIN_CALLABLE_TIMEOUT_MS, attempt),
      ),
      { label: 'explainMistake', onRetryStart: options?.onRetryStart },
    );
    if (res.data.ok && res.data.text.trim()) {
      const cacheWrites: Promise<void>[] = [
        writeExplainLocalCache({ kind: 'mistake', key }, {
          text: res.data.text,
          status: 'ok',
        }),
      ];
      const bundledEli5 = variant !== 'eli5' ? res.data.eli5Text?.trim() : '';
      if (bundledEli5) {
        const eli5Key = explainMistakeRequestKey({ ...normalizedReq, variant: 'eli5' });
        cacheWrites.push(writeExplainLocalCache({ kind: 'mistake', key: eli5Key }, {
          text: bundledEli5,
          status: 'ok',
        }));
      }
      await Promise.all(cacheWrites);
    }
    return res.data;
  })().finally(() => {
    explainMistakeInFlight.delete(key);
  });

  explainMistakeInFlight.set(key, request);
  return request;
}
