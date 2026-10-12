export type AccountDeleteEnqueueOperation<T> = {
  dispatchSettled: Promise<void>;
  acknowledgment: Promise<T>;
};

// зачем (координатор 12.10, «сперва логи»: удаление гостя 18:36 — холодный старт accountDeleteEnqueue ≈8 с = клиентский дедлайн 8 с,
// сервер получил запрос уже после него): журнал обязан показать, сколько шёл прогрев, когда ушёл вызов, когда сработал дедлайн и на какой
// стадии, и пришёл ли ответ ПОСЛЕ дедлайна. Только коды ошибок и длительности (сторож aa_auth_error_codes_only) — без текста ошибок.
const LOG = '[ACC-MUT] enqueue';

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code) return code.slice(0, 80);
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('account_delete_')) return message.slice(0, 80);
  return error instanceof Error ? error.name : typeof error;
}

export function startAccountDeleteEnqueueWithDeadline<T>(
  warmup: () => Promise<unknown>,
  invoke: () => Promise<T>,
  timeoutMs: number,
  label = 'enqueue',
): AccountDeleteEnqueueOperation<T> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let markDispatchSettled!: () => void;
  const dispatchSettled = new Promise<void>((resolve) => { markDispatchSettled = resolve; });
  const startedAt = Date.now();
  let stage: 'warmup' | 'invoke' | 'done' = 'warmup';
  console.log(`${LOG}:${label} start deadlineMs=${timeoutMs}`); // guard-ok: один лог на попытку удаления

  const operation = (async () => {
    try {
      await warmup();
      const warmupMs = Date.now() - startedAt;
      if (expired) {
        console.warn(`${LOG}:${label} skip_invoke reason=deadline_during_warmup warmupMs=${warmupMs}`); // guard-ok: ранний выход логируется
        throw new Error('account_delete_enqueue_timeout');
      }
      stage = 'invoke';
      console.log(`${LOG}:${label} dispatched warmupMs=${warmupMs}`); // guard-ok: момент отправки
      const acknowledgment = invoke();
      markDispatchSettled();
      const ack = await acknowledgment;
      stage = 'done';
      // Поздний ответ: дедлайн уже отдал отказ, но сервер ответил — фон этого не видит, журнал видит.
      console.log(`${LOG}:${label} ack=ok totalMs=${Date.now() - startedAt} late=${expired ? 1 : 0}`); // guard-ok: итог вызова
      return ack;
    } catch (error) {
      markDispatchSettled();
      console.warn(`${LOG}:${label} ack=failed totalMs=${Date.now() - startedAt} stage=${stage} late=${expired ? 1 : 0} code=${errorCode(error)}`); // guard-ok: catch логирует код
      stage = 'done';
      throw error;
    }
  })();
  // Исходная операция может завершиться после дедлайна — её отказ уже напечатан выше, здесь только помечаем обработанным.
  operation.catch(() => undefined);

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      expired = true;
      console.warn(`${LOG}:${label} deadline_fired afterMs=${Date.now() - startedAt} deadlineMs=${timeoutMs} stage=${stage}`); // guard-ok: срабатывание дедлайна
      markDispatchSettled();
      reject(new Error('account_delete_enqueue_timeout'));
    }, timeoutMs);
  });

  const acknowledgment = Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
  return { dispatchSettled, acknowledgment };
}

export async function runAccountDeleteEnqueueWithDeadline<T>(
  warmup: () => Promise<unknown>,
  invoke: () => Promise<T>,
  timeoutMs: number,
  label = 'enqueue',
): Promise<T> {
  return startAccountDeleteEnqueueWithDeadline(warmup, invoke, timeoutMs, label).acknowledgment;
}
