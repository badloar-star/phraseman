/**
 * Стриминговый транспорт диалога (SSE поверх XMLHttpRequest).
 *
 * зачем: владелец сообщил, что «ИИ очень долго думает и отвечает». Реальная
 * причина не в модели: callable-функция ждала последний токен и отдавала текст
 * целиком. Сервер теперь буферизует короткий provider-черновик до repeat/safety
 * проверки и затем выпускает только принятый ответ несколькими SSE-дельтами.
 *
 * Почему XMLHttpRequest, а не fetch: в React Native (0.81) fetch НЕ поддерживает
 * потоковое чтение тела — `response.body` не даёт ReadableStream, весь ответ
 * приходит одним куском. XHR же отдаёт растущий `responseText` в onprogress —
 * это единственный доступный способ читать поток на устройстве.
 *
 * Транспорт умышленно тонкий: он ничего не решает про UI и не знает про экраны.
 * Вся защита (лимиты, safety, языковой замок) живёт на сервере — здесь только
 * доставка кадров.
 */

import { getApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import { DebugLogger } from './debug-logger';
import type { DialogQualityMeta } from './ai_dialog_client';
import { parseAiDialogQuotaObservation, type AiDialogQuotaObservation } from './ai_dialog_daily_quota';

const FUNCTIONS_REGION = 'us-central1';

/** Кадр, который присылает сервер. */
type StreamFrame =
  | { type: 'started' }
  | { type: 'delta'; text?: unknown }
  /**
   * Сервер отверг уже напечатанный черновик (анти-повтор) и печатает заново.
   * зачем (2026-09-14): дельты теперь идут ЖИВЬЁМ, с первого токена модели, а не
   * после полной проверки — поэтому редкий отвергнутый черновик нужно стереть.
   */
  | { type: 'reset' }
  | { type: 'done'; assistantMessage?: unknown; turnState?: unknown; coach?: unknown; remainingQuota?: unknown; resetAtMs?: unknown; quotaVersion?: unknown; model?: unknown; quality?: unknown }
  | { type: 'error'; code?: unknown };

export interface DialogStreamResult {
  assistantMessage: string;
  turnState: unknown;
  /**
   * Поля тренера («почему так», перевод, готовые ответы, поправка) из ТОГО ЖЕ
   * вызова — шторка открывается мгновенно, без второй генерации. Тип `unknown`:
   * контракт защищает парсер на экране, а не структура транспорта.
   */
  coach: unknown;
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
  model: string;
  quality?: DialogQualityMeta;
}

export function parseDialogStreamDoneFrame(input: unknown): DialogStreamResult | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const frame = input as Extract<StreamFrame, { type: 'done' }>;
  if (frame.type !== 'done') return null;
  const quota = parseAiDialogQuotaObservation(frame);
  if (!quota) return null;
  return {
    assistantMessage: String(frame.assistantMessage ?? ''),
    turnState: frame.turnState ?? null,
    coach: frame.coach ?? null,
    remainingQuota: quota.remainingQuota,
    resetAtMs: quota.resetAtMs,
    quotaVersion: quota.quotaVersion,
    model: String(frame.model ?? ''),
    quality:
      frame.quality && typeof frame.quality === 'object'
        ? frame.quality as DialogQualityMeta
        : undefined,
  };
}

export interface DialogStreamCallbacks {
  /** Зовётся на каждый новый кусочек текста — для «печати» реплики в UI. */
  onDelta: (chunk: string) => void;
  /** Сервер стёр напечатанный черновик и начинает заново — UI обязан очистить пузырь. */
  onReset?: () => void;
}

/**
 * Ошибка стриминга с кодом сервера. Коды совпадают с callable-версией
 * (dialog_plus_required, dialog_free_limit, …), чтобы UI разбирал их одинаково.
 */
export class DialogStreamError extends Error {
  readonly code: string;
  /**
   * true — сервер гарантированно НЕ начал работу (не списал квоту, не звал OpenAI).
   * Только такие сбои безопасно повторять: см. разбор идемпотентности в
   * ai_dialog_client.ts — повтор после списания снял бы вторую единицу квоты.
   */
  readonly notStarted: boolean;
  readonly quota: AiDialogQuotaObservation | null;

  constructor(code: string, notStarted: boolean, quota: AiDialogQuotaObservation | null = null) {
    super(code);
    this.name = 'DialogStreamError';
    this.code = code;
    this.notStarted = notStarted;
    this.quota = quota;
  }
}

function streamUrl(): string {
  const projectId = getApp().options?.projectId;
  if (!projectId) throw new DialogStreamError('stream_unavailable', true);
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/premiumDialogStream`;
}

/**
 * Разбирает накопленный текст SSE и возвращает целые кадры + непрочитанный хвост.
 *
 * `final` = поток закрыт: тогда последний блок БЕЗ завершающего `\n\n` тоже
 * считается целым кадром.
 *
 * зачем (владелец 2026-09-22, «ответ приходит, а через секунду ошибка, и
 * реплики не считаются»): кадр `done` — последнее, что пишет сервер, и сразу
 * за ним идёт `res.end()`. Если хвост `\n\n` не доехал отдельным пакетом или
 * был срезан при закрытии соединения, разбор молча пропускал ГОТОВЫЙ кадр,
 * ход не засчитывался и человек видел «не удалось отправить» поверх уже
 * прочитанного ответа. Квота при этом на сервере списана: в логах все вызовы
 * `stream ok`, ни одного провала — ломалось только на клиенте.
 */
function drainFrames(raw: string, from: number, final = false): { frames: StreamFrame[]; nextFrom: number } {
  const frames: StreamFrame[] = [];
  let cursor = from;
  for (;;) {
    let end = raw.indexOf('\n\n', cursor);
    let skip = 2;
    if (end < 0) {
      // Поток ещё идёт — ждём разделитель. Поток закрыт — хвост уже полный.
      if (!final || cursor >= raw.length) break;
      end = raw.length;
      skip = 0;
    }
    const block = raw.slice(cursor, end);
    cursor = end + skip;
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        frames.push(JSON.parse(payload) as StreamFrame);
      } catch (e) {
      // Битый кадр не должен рушить весь поток.
      DebugLogger.error('ai_dialog_stream_client:payload', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
  }
  return { frames, nextFrom: cursor };
}

/**
 * Прогрев стримингового инстанса. Тот же приём, что и у callable-версии:
 * ping бесплатный и выходит из функции до любых чтений Firestore.
 */
/** Не чаще раза в 30 минут на цель обучения (зачем: расходы, координатор 17.10 — каждый прогрев поток-инстанса стоит как вызов на полном ядре). */
const STREAM_WARM_TTL_MS = 30 * 60 * 1000;
const streamWarmedAt = new Map<string, number>();

export function warmPremiumDialogStream(studyTarget: string): void {
  const nowMs = Date.now();
  const last = streamWarmedAt.get(studyTarget);
  if (last !== undefined && nowMs - last >= 0 && nowMs - last < STREAM_WARM_TTL_MS) {
    console.log('[COST-CUT] premium_dialog_stream_warm skipped reason=ttl_not_expired', JSON.stringify({ studyTarget, ageMs: nowMs - last, ttlMs: STREAM_WARM_TTL_MS })); // guard-ok: ранний выход называет причину
    return;
  }
  streamWarmedAt.set(studyTarget, nowMs); // guard-ok: Map в памяти процесса, не Firestore
  void (async () => {
    try {
      const token = await auth().currentUser?.getIdToken();
      if (!token) return;
      await fetch(streamUrl(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warmupPing: true, studyTarget }),
      });
    } catch (e) {
      // Прогрев — best-effort: его провал не должен ничего ломать.
      DebugLogger.error('ai_dialog_stream_client:token', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  })();
}

/**
 * Отправляет реплику и отдаёт ответ потоком.
 *
 * Возвращает финальный результат: сервер в последнем кадре присылает
 * АВТОРИТЕТНЫЙ текст (после постфильтров языка и регулируемых советов).
 * Вызывающий обязан заменить им накопленное из onDelta — иначе на экране остался
 * бы неотфильтрованный черновик.
 */
export function callPremiumDialogStream(
  body: Record<string, unknown>,
  callbacks: DialogStreamCallbacks,
  timeoutMs = 45000,
): Promise<DialogStreamResult> {
  return new Promise<DialogStreamResult>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };

    void (async () => {
      let token: string | undefined;
      try {
        token = await auth().currentUser?.getIdToken();
      } catch {
        token = undefined;
      }
      if (!token) {
        finish(() => reject(new DialogStreamError('auth_required', true)));
        return;
      }

      let url: string;
      try {
        url = streamUrl();
      } catch (e) {
        finish(() => reject(e as Error));
        return;
      }

      const xhr = new XMLHttpRequest();
      let cursor = 0;
      let result: DialogStreamResult | null = null;
      // Замеры задержки на клиенте — та же метка [DIALOG-LAT], что и на сервере,
      // чтобы владелец одним grep видел, где ушло время: сеть/сервер/модель.
      const sentAtMs = Date.now();
      let startedAtMs = 0;
      let firstDeltaAtMs = 0;
      let resets = 0;
      let deltaCount = 0;
      // Текст, который человек УЖЕ прочитал на экране. Нужен как запасной
      // источник ответа, если финальный кадр потерялся (см. onload).
      let streamedText = '';

      const handleChunk = (final = false): void => {
        const raw = xhr.responseText ?? '';
        const { frames, nextFrom } = drainFrames(raw, cursor, final);
        cursor = nextFrom;
        for (const frame of frames) {
          if (frame.type === 'started') {
            // Служебный ack: quota/provider pipeline уже начались. Данных UI нет.
            if (!startedAtMs) startedAtMs = Date.now();
          } else if (frame.type === 'delta') {
            const piece = typeof frame.text === 'string' ? frame.text : '';
            if (piece) {
              if (!firstDeltaAtMs) firstDeltaAtMs = Date.now();
              deltaCount += 1;
              streamedText += piece;
              callbacks.onDelta(piece);
            }
          } else if (frame.type === 'reset') {
            resets += 1;
            // Сервер отверг черновик — забываем и накопленное, иначе запасной
            // ответ склеил бы отвергнутый текст с новым.
            streamedText = '';
            callbacks.onReset?.();
          } else if (frame.type === 'done') {
            DebugLogger.info('[DIALOG-LAT] client stream', JSON.stringify({
              startedMs: startedAtMs ? startedAtMs - sentAtMs : null,
              firstDeltaMs: firstDeltaAtMs ? firstDeltaAtMs - sentAtMs : null,
              doneMs: Date.now() - sentAtMs,
              deltaCount,
              resets,
            }));
            const parsed = parseDialogStreamDoneFrame(frame);
            if (!parsed) {
              // зачем (владелец 2026-09-22): раньше отказ разбора выбрасывал
              // ВЕСЬ ответ — человек читал реплику и получал ошибку. Печатаем
              // фактические значения служебных полей: без них не понять, какое
              // именно не прошло (это уже стоило круга поисков).
              DebugLogger.info('[DIALOG-SEND] done frame rejected', JSON.stringify({
                remainingQuota: (frame as Record<string, unknown>).remainingQuota,
                remainingQuotaType: typeof (frame as Record<string, unknown>).remainingQuota,
                resetAtMs: (frame as Record<string, unknown>).resetAtMs,
                resetAtMsType: typeof (frame as Record<string, unknown>).resetAtMs,
                quotaVersion: (frame as Record<string, unknown>).quotaVersion,
                quotaVersionType: typeof (frame as Record<string, unknown>).quotaVersion,
                assistantChars: String((frame as Record<string, unknown>).assistantMessage ?? '').length,
              }));
              // Ответ УЖЕ у человека на экране и квота на сервере списана —
              // бухгалтерия не имеет права его отменять. Берём текст как есть,
              // а квоту помечаем «неизвестно» (-1): парсер такую метку
              // отвергает сам, счётчик не затрётся, авторитетное значение
              // придёт следующим ходом.
              const salvaged = String((frame as Record<string, unknown>).assistantMessage ?? '').trim()
                || streamedText.trim();
              if (salvaged) {
                result = {
                  assistantMessage: salvaged,
                  turnState: (frame as Record<string, unknown>).turnState ?? null,
                  coach: (frame as Record<string, unknown>).coach ?? null,
                  remainingQuota: -1,
                  resetAtMs: 0,
                  quotaVersion: 0,
                  model: String((frame as Record<string, unknown>).model ?? ''),
                };
                continue;
              }
              finish(() => reject(new DialogStreamError('dialog_quota_observation_invalid', false)));
              return;
            }
            result = parsed;
          } else if (frame.type === 'error') {
            const code = String(frame.code ?? 'dialog_provider_failed');
            // зачем (диагностика 2026-09-22, «ответ пришёл, через секунду ошибка»):
            // печатаем КОД и сколько текста человек уже увидел. Ошибка после
            // дельт выглядит для него как сбой на пустом месте.
            DebugLogger.info('[DIALOG-SEND] stream error frame', JSON.stringify({
              code,
              deltaCount,
              resets,
              sawStarted: startedAtMs > 0,
              msSinceSent: Date.now() - sentAtMs,
            }));
            // Поток уже шёл → сервер точно начал работу, повтор небезопасен.
            finish(() => reject(new DialogStreamError(code, false)));
          }
        }
      };

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.timeout = timeoutMs;

      // onprogress: поток ещё идёт, незакрытый хвост дожидается следующего пакета.
      xhr.onprogress = () => handleChunk(false);

      xhr.onload = () => {
        // Поток закрыт — дочитываем хвост, даже если у него нет '\n\n'.
        handleChunk(true);
        if (xhr.status >= 400) {
          // Ошибка ДО стрима приходит обычным JSON-телом, а не кадром SSE.
          let code = 'dialog_provider_failed';
          let quota: AiDialogQuotaObservation | null = null;
          try {
            const parsed = JSON.parse(xhr.responseText ?? '{}') as { error?: unknown };
            if (typeof parsed.error === 'string' && parsed.error) code = parsed.error;
            quota = parseAiDialogQuotaObservation(parsed);
          } catch (e) {
      // Тело не JSON (например, HTML-страница 404 от хостинга) — общий код.
      DebugLogger.error('ai_dialog_stream_client:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
          // Развилка по смыслу статуса, а не «любой >=400 — это конец».
          //
          // зачем: 404/501 означает, что стриминговой функции на сервере просто
          // НЕТ (ещё не задеплоена или откачена). Сервер её не выполнял, квоту
          // не трогал — значит фолбэк на обычный callable безопасен и
          // обязателен, иначе диалог падает с «сервис недоступен» на ровном
          // месте. Именно так и случилось при первом выкате: клиент уехал
          // раньше функций.
          //
          // 401/403/429 — отказ ПО ПРАВИЛАМ (доступ, Plus-гейт, лимит). Его
          // повторять бессмысленно: старый callable ответит тем же самым.
          const functionMissing = xhr.status === 404 || xhr.status === 501;
          // 5xx (кроме 501) — инстанс поднялся и упал уже внутри. Мог успеть
          // списать квоту, поэтому фолбэк запрещён: повтор снял бы вторую
          // единицу и отправил сообщение дважды.
          finish(() => reject(new DialogStreamError(code, functionMissing, quota)));
          return;
        }
        if (result) {
          const done = result;
          finish(() => resolve(done));
        } else {
          // зачем (диагностика 2026-09-22): ИМЕННО эта ветка выглядит как
          // «ответ пришёл, а через секунду ошибка» — дельты человек уже прочитал,
          // а финальный кадр не доехал, и ход не засчитался. Печатаем всё, что
          // отличает обрыв сети от молчания сервера: сколько дельт дошло, был ли
          // 'started', статус HTTP и ХВОСТ сырого тела (в нём видно, оборвался
          // ли поток на полкадра).
          const raw = xhr.responseText ?? '';
          const recovered = streamedText.trim();
          DebugLogger.info('[DIALOG-SEND] stream ended without done', JSON.stringify({
            httpStatus: xhr.status,
            deltaCount,
            resets,
            sawStarted: startedAtMs > 0,
            msSinceSent: Date.now() - sentAtMs,
            rawLength: raw.length,
            unreadFrom: cursor,
            recoveredChars: recovered.length,
            rawTail: raw.slice(-300),
          }));
          if (recovered) {
            // зачем (владелец 2026-09-22): ответ человек УЖЕ прочитал, а сервер
            // уже списал квоту — выбрасывать ход нельзя. Ответ авторитетен ровно
            // настолько, насколько его успел напечатать сервер: постфильтры он
            // применяет ДО публикации дельт (publishAcceptedDialogReply), так что
            // накопленный текст — это принятая реплика, а не сырой черновик.
            // Квоту отдаём как «неизвестно» (-1): экран не тронет счётчик, а
            // авторитетное значение придёт следующим ходом.
            finish(() => resolve({
              assistantMessage: recovered,
              turnState: null,
              coach: null,
              remainingQuota: -1,
              resetAtMs: 0,
              quotaVersion: 0,
              model: '',
            }));
            return;
          }
          // Ни одной дельты — спасать нечего: сервер мог принять запрос и списать
          // квоту, даже если ни один кадр не доехал.
          finish(() => reject(new DialogStreamError('dialog_stream_incomplete', false)));
        }
      };

      xhr.onerror = () => {
        // Асинхронный network error после xhr.send() никогда не доказывает, что
        // сервер не начал работу. Callable fallback здесь мог бы списать дважды.
        finish(() => reject(new DialogStreamError('network', false)));
      };
      xhr.ontimeout = () => {
        // Таймаут = «мы не знаем, что там». Никогда не считаем это notStarted.
        finish(() => reject(new DialogStreamError('timeout', false)));
      };

      try {
        xhr.send(JSON.stringify(body));
      } catch {
        finish(() => reject(new DialogStreamError('network', true)));
      }
    })();
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
