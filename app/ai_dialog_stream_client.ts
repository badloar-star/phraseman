/**
 * Стриминговый транспорт диалога (SSE поверх XMLHttpRequest).
 *
 * зачем: владелец сообщил, что «ИИ очень долго думает и отвечает». Реальная
 * причина не в модели: callable-функция ждала последний токен и отдавала текст
 * целиком, поэтому человек 3-6 секунд смотрел на пустой пузырь. Здесь текст
 * приходит по мере генерации, и первое слово появляется почти сразу.
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

const FUNCTIONS_REGION = 'us-central1';

/** Кадр, который присылает сервер. */
type StreamFrame =
  | { type: 'delta'; text?: unknown }
  | { type: 'done'; assistantMessage?: unknown; turnState?: unknown; remainingQuota?: unknown; model?: unknown }
  | { type: 'error'; code?: unknown };

export interface DialogStreamResult {
  assistantMessage: string;
  turnState: unknown;
  remainingQuota: number;
  model: string;
}

export interface DialogStreamCallbacks {
  /** Зовётся на каждый новый кусочек текста — для «печати» реплики в UI. */
  onDelta: (chunk: string) => void;
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

  constructor(code: string, notStarted: boolean) {
    super(code);
    this.name = 'DialogStreamError';
    this.code = code;
    this.notStarted = notStarted;
  }
}

function streamUrl(): string {
  const projectId = getApp().options?.projectId;
  if (!projectId) throw new DialogStreamError('stream_unavailable', true);
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/premiumDialogStream`;
}

/** Разбирает накопленный текст SSE и возвращает целые кадры + непрочитанный хвост. */
function drainFrames(raw: string, from: number): { frames: StreamFrame[]; nextFrom: number } {
  const frames: StreamFrame[] = [];
  let cursor = from;
  for (;;) {
    const end = raw.indexOf('\n\n', cursor);
    if (end < 0) break;
    const block = raw.slice(cursor, end);
    cursor = end + 2;
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        frames.push(JSON.parse(payload) as StreamFrame);
      } catch {
        // Битый кадр не должен рушить весь поток.
      }
    }
  }
  return { frames, nextFrom: cursor };
}

/**
 * Прогрев стримингового инстанса. Тот же приём, что и у callable-версии:
 * ping бесплатный и выходит из функции до любых чтений Firestore.
 */
export function warmPremiumDialogStream(): void {
  void (async () => {
    try {
      const token = await auth().currentUser?.getIdToken();
      if (!token) return;
      await fetch(streamUrl(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warmupPing: true }),
      });
    } catch {
      // Прогрев — best-effort: его провал не должен ничего ломать.
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
      let sawAnyFrame = false;
      let result: DialogStreamResult | null = null;

      const handleChunk = (): void => {
        const raw = xhr.responseText ?? '';
        const { frames, nextFrom } = drainFrames(raw, cursor);
        cursor = nextFrom;
        for (const frame of frames) {
          sawAnyFrame = true;
          if (frame.type === 'delta') {
            const piece = typeof frame.text === 'string' ? frame.text : '';
            if (piece) callbacks.onDelta(piece);
          } else if (frame.type === 'done') {
            result = {
              assistantMessage: String(frame.assistantMessage ?? ''),
              turnState: frame.turnState ?? null,
              remainingQuota: Number(frame.remainingQuota ?? 0),
              model: String(frame.model ?? ''),
            };
          } else if (frame.type === 'error') {
            const code = String(frame.code ?? 'dialog_provider_failed');
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

      xhr.onprogress = handleChunk;

      xhr.onload = () => {
        handleChunk();
        if (xhr.status >= 400) {
          // Ошибка ДО стрима приходит обычным JSON-телом, а не кадром SSE.
          let code = 'dialog_provider_failed';
          try {
            const parsed = JSON.parse(xhr.responseText ?? '{}') as { error?: unknown };
            if (typeof parsed.error === 'string' && parsed.error) code = parsed.error;
          } catch {
            // тело не JSON — оставляем общий код
          }
          // Отказ до начала генерации (доступ/лимит/валидация): квота либо не
          // списана, либо уже возвращена сервером. Повтор такого запроса всё
          // равно бессмысленен — это отказ по правилам, а не сбой связи.
          finish(() => reject(new DialogStreamError(code, false)));
          return;
        }
        if (result) {
          const done = result;
          finish(() => resolve(done));
        } else {
          // Соединение закрылось без финального кадра. Если поток уже шёл —
          // сервер начал работу, повторять нельзя.
          finish(() => reject(new DialogStreamError('dialog_stream_incomplete', !sawAnyFrame)));
        }
      };

      xhr.onerror = () => {
        // Сеть не поднялась и ни одного кадра не пришло → сервер не начинал.
        finish(() => reject(new DialogStreamError('network', !sawAnyFrame)));
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
