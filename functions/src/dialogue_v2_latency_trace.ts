/**
 * [DLG-V2-LATENCY] — пошаговая трассировка длительности хода ИИ-диалога (dialogueV2TextTurn).
 *
 * зачем (координатор 18.10, R139: ответ ≈13,3 с, сервер 12,98 с; «СПЕРВА ЛОГИ, ПОТОМ ПОЧИНКА»): без разбивки по шагам
 * нельзя сказать, где теряются секунды — в чтениях Firestore, в квотах или у модели. Каждый шаг пишет строку со своей
 * длительностью, в конце — одна сводка со всеми шагами по порядку. Трасса живёт в AsyncLocalStorage, чтобы глубокие
 * зависимости (ядро хода, вызов модели) писали в неё без протаскивания параметра через чистое ядро.
 *
 * Приватность: ни текста пользователя, ни ответа модели, ни промпта — только длины, числа токенов, модель и коды ошибок.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const TAG = '[DLG-V2-LATENCY]';

type StepRecord = { step: string; ms: number; ok: boolean; atMs: number };

export type DialogueV2LatencyTrace = Readonly<{
  /** Одна строка про шаг с длительностью и полями; шаг попадает в итоговую сводку. */
  record(step: string, ms: number, fields?: Readonly<Record<string, unknown>>, ok?: boolean): void;
  /** Замер обещания: длительность пишется и при успехе, и при отказе (с кодом ошибки), ошибка пробрасывается дальше. */
  span<T>(step: string, operation: () => Promise<T>, fields?: Readonly<Record<string, unknown>>): Promise<T>;
  /** Добавить поля в итоговую сводку (модель, токены, число ходов истории). */
  note(fields: Readonly<Record<string, unknown>>): void;
  /** Итог хода: сводка всех шагов, общее время и исход. */
  finish(outcome: string, fields?: Readonly<Record<string, unknown>>): void;
  /** Миллисекунды от начала хода. */
  elapsedMs(): number;
}>;

const storage = new AsyncLocalStorage<DialogueV2LatencyTrace>();

function errorCode(error: unknown): string {
  const value = error as { code?: unknown; message?: unknown } | null;
  if (typeof value?.code === 'string') return value.code.slice(0, 80);
  if (typeof value?.message === 'string') return value.message.slice(0, 80);
  return 'unknown';
}

export function createDialogueV2LatencyTrace(
  base: Readonly<Record<string, unknown>>,
  nowMs: () => number = Date.now,
): DialogueV2LatencyTrace {
  const startedAt = nowMs();
  const steps: StepRecord[] = [];
  const notes: Record<string, unknown> = {};
  let finished = false;
  const trace: DialogueV2LatencyTrace = {
    record(step, ms, fields = {}, ok = true) {
      const atMs = nowMs() - startedAt;
      steps.push({ step, ms, ok, atMs });
      console.log(TAG, JSON.stringify({ ...base, step, ms, ok, atMs, ...fields }));
    },
    async span(step, operation, fields = {}) {
      const t0 = nowMs();
      try {
        const value = await operation();
        trace.record(step, nowMs() - t0, fields, true);
        return value;
      } catch (error) {
        trace.record(step, nowMs() - t0, { ...fields, error: errorCode(error) }, false);
        throw error;
      }
    },
    note(fields) {
      Object.assign(notes, fields);
    },
    finish(outcome, fields = {}) {
      if (finished) return;
      finished = true;
      const totalMs = nowMs() - startedAt;
      const accountedMs = steps.reduce((sum, s) => sum + s.ms, 0);
      console.log(TAG, JSON.stringify({
        ...base,
        step: 'summary',
        outcome,
        totalMs,
        // шаги вложены (ledger содержит produce), поэтому сумма — справочно; порядок и atMs показывают картину
        steps: steps.map((s) => `${s.step}:${s.ms}${s.ok ? '' : '!'}@${s.atMs}`).join(' '),
        accountedMs,
        ...notes,
        ...fields,
      }));
    },
    elapsedMs: () => nowMs() - startedAt,
  };
  return Object.freeze(trace);
}

/** Выполнить ход внутри трассы: всё, что вызывается из него, видит её через currentDialogueV2LatencyTrace(). */
export function runWithDialogueV2LatencyTrace<T>(trace: DialogueV2LatencyTrace, operation: () => Promise<T>): Promise<T> {
  return storage.run(trace, operation);
}

/** Текущая трасса хода или null (вне хода, в модульных тестах ядра). */
export function currentDialogueV2LatencyTrace(): DialogueV2LatencyTrace | null {
  return storage.getStore() ?? null;
}

/** Замер, если трасса есть; иначе просто выполнить. */
export function timedDialogueV2Step<T>(
  step: string,
  operation: () => Promise<T>,
  fields?: Readonly<Record<string, unknown>>,
): Promise<T> {
  const trace = currentDialogueV2LatencyTrace();
  return trace ? trace.span(step, operation, fields) : operation();
}
