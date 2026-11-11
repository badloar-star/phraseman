import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { EXPLAIN_CALLABLE_TIMEOUT_MS, withExplainCallableTimeout } from './explain_callable_timeout';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';
import { readExplainLocalCache, writeExplainLocalCache } from './explain_local_cache';
import { pendingAiWarm, warmAiFunction, withAiCallableRetry, aiAttemptTimeoutMs } from './ai_callable_resilience';
import { getNetStatus } from './net_status';
import {
  coerceMistakeBreakdown,
  parseStoredMistakeBreakdown,
  serializeMistakeBreakdown,
  type MistakeBreakdown,
} from './mistake_breakdown_model';

const FUNCTIONS_REGION = 'us-central1';
/** Потолок ожидания идущего прогрева перед настоящим запросом (холодный старт по журналу сервера — 7–11 с). */
const WARM_WAIT_MAX_MS = 12_000;
const explainMistakeInFlight = new Map<string, Promise<ExplainMistakeResponse>>();

export const MISTAKE_EXPLAIN_OFFLINE_ERROR_CODE = 'mistake_explain_offline';

/** Expected cache-miss result while connectivity is not confirmed online. */
export class MistakeExplainOfflineError extends Error {
  constructor() {
    super(MISTAKE_EXPLAIN_OFFLINE_ERROR_CODE);
    this.name = 'MistakeExplainOfflineError';
  }
}

export function isMistakeExplainOfflineError(error: unknown): error is MistakeExplainOfflineError {
  if (error instanceof MistakeExplainOfflineError) return true;
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return message.includes(MISTAKE_EXPLAIN_OFFLINE_ERROR_CODE);
}

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
  /**
   * зачем (владелец 11.11): разбор «по полям» — слово-промах, нужное слово, правило, пояснение.
   * Есть только у новых ответов сервера; нет поля — экран показывает `text`, как раньше.
   */
  breakdown?: MistakeBreakdown;
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
  if (getNetStatus() !== 'online') return;
  void warmAiFunction('explainMistake', async () => {
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'explainMistake');
    return fn({ warmupPing: true });
  });
}

/**
 * Reads the local cache first. On a cache miss, rejects with the typed
 * MistakeExplainOfflineError until connectivity is confirmed online. Callable
 * failures may also reject and must be handled by UI orchestration.
 */
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
  // зачем: поля разбора лежат в том же локальном кэше отдельной записью — повторный показ той же
  // ошибки (и офлайн) рисует новую карточку без сети, а не откатывается к сплошному тексту.
  const breakdownKey = variant === 'full' ? `${key}#breakdown` : null;
  const [localCached, pairedEli5Cached, breakdownCached] = await Promise.all([
    readExplainLocalCache({ kind: 'mistake', key }),
    pairedEli5Key
      ? readExplainLocalCache({ kind: 'mistake', key: pairedEli5Key })
      : Promise.resolve(null),
    breakdownKey
      ? readExplainLocalCache({ kind: 'mistake', key: breakdownKey })
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
      breakdown: (breakdownCached?.status === 'ok' ? parseStoredMistakeBreakdown(breakdownCached.text) : null) ?? undefined,
      remainingQuota: 0,
      model: 'local-cache',
      fromCache: true,
      variant,
    };
  }
  // Локальный кэш уже проверен выше. Пока сеть не подтверждена как online,
  // нельзя ни будить Cloud Function, ни входить в её retry-цепочку.
  if (getNetStatus() !== 'online') throw new MistakeExplainOfflineError();
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const existing = explainMistakeInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    const fn = httpsCallable<ExplainMistakeRequest, ExplainMistakeResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'explainMistake',
    );
    // зачем (владелец 11.11: «разбор готовится очень долго»): если сервер ещё просыпается от прогрева, ждём его,
    // а не шлём запрос параллельно — иначе Cloud Run будит второй инстанс, и ждать приходится дольше.
    const startedAtMs = Date.now();
    const warming = pendingAiWarm('explainMistake');
    if (warming) {
      // зачем: у прогрева нет своего таймаута — зависший пинг не должен держать настоящий запрос. Холодный старт
      // по журналу сервера занимает 7–11 с; ждём не дольше WARM_WAIT_MAX_MS и уходим в сеть в любом случае.
      let waitTimer: ReturnType<typeof setTimeout> | null = null;
      const outcome = await Promise.race([
        warming.then(() => 'warm_done' as const),
        new Promise<'wait_timeout'>((resolve) => { waitTimer = setTimeout(() => resolve('wait_timeout'), WARM_WAIT_MAX_MS); }),
      ]);
      if (waitTimer) clearTimeout(waitTimer);
      console.log(`[AI-EXPLAIN] call:waited_for_warm outcome=${outcome} ms=${Date.now() - startedAtMs}`); // guard-ok: видно, сколько ждали прогрев и чем кончилось
    }
    const callStartedAtMs = Date.now();
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
    console.log(`[AI-EXPLAIN] call:server_answered ms=${Date.now() - callStartedAtMs} totalMs=${Date.now() - startedAtMs} fromCache=${res.data.fromCache === true} variant=${variant}`); // guard-ok: длительность платного вызова
    const breakdown = variant === 'full' ? coerceMistakeBreakdown(res.data.breakdown) : null;
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
      if (breakdownKey && breakdown) {
        cacheWrites.push(writeExplainLocalCache({ kind: 'mistake', key: breakdownKey }, {
          text: serializeMistakeBreakdown(breakdown),
          status: 'ok',
        }));
      }
      await Promise.all(cacheWrites);
    }
    // Ответ сервера — граница системы: наружу уходят только проверенные поля.
    return { ...res.data, breakdown: breakdown ?? undefined };
  })().finally(() => {
    explainMistakeInFlight.delete(key);
  });

  explainMistakeInFlight.set(key, request);
  return request;
}
