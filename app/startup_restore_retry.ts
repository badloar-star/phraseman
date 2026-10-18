// startup_restore_retry.ts — тихий повтор восстановления из облака после переустановки вместо тоста «Облако сейчас недоступно».
//
// зачем (правило владельца 18.10: вход и выход не заканчиваются ошибкой, кроме «нет сети»; матрица Сайта A12): если на старте после переустановки
// облако не ответило (идентичность ещё поднимается, транспорт), человек видел тост «Облако сейчас недоступно… открой позже» — слово разработчика и
// не успех. Теперь приложение само повторяет восстановление в фоне: через 5 с, 30 с и 2 мин; при успехе человек не видит ничего (прогресс
// подтягивается сам). Единственное сообщение — когда интернета действительно нет: одна спокойная строка «Нет интернета. Восстановим прогресс, как только
// он появится», а после возврата сети — ещё одна тихая попытка. Если сеть есть, а восстановление не идёт, — молчим до следующего старта (журнал).
// Firebase-экономия: три попытки с нарастающей паузой на весь запуск, повтор по сети — один раз, без опроса.
import { emitAppEvent } from './events';
import { getNetStatus, subscribeNetStatus } from './net_status';

const LOG = '[STARTUP-RESTORE-RETRY]';

/** Паузы перед повторами восстановления после неудачного старта. */
export const STARTUP_RESTORE_RETRY_DELAYS_MS = [5_000, 30_000, 120_000] as const;

export type StartupRestoreAttemptResult = Readonly<{ status: string; failureReason?: string | null }>;

export type StartupRestoreRetryDeps = Readonly<{
  /** Одна попытка восстановления (та же функция, что на старте). Статус `failed` — неудача. */
  attempt: () => Promise<StartupRestoreAttemptResult>;
  /** Единственное сообщение: интернета нет. По умолчанию — спокойный тост. */
  notifyOffline?: () => void;
  delaysMs?: ReadonlyArray<number>;
  isOffline?: () => boolean;
  /** Подписка на возврат сети; возвращает отписку. */
  onOnline?: (listener: () => void) => () => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}>;

/** Спокойный тост «нет интернета»: 9 языков, без слов разработчика. ЧЕРНОВИК для Переводчика. */
function emitOfflineRestoreNotice(): void {
  emitAppEvent('action_toast', {
    type: 'info',
    messageRu: 'Нет интернета. Восстановим прогресс, как только он появится.',
    messageUk: 'Немає інтернету. Відновимо прогрес, щойно він з’явиться.',
    messageEn: 'No internet. We’ll restore your progress as soon as it’s back.',
    messageEs: 'Sin internet. Restauraremos tu progreso en cuanto vuelva.',
    messagePtBr: 'Sem internet. Vamos restaurar seu progresso assim que ele voltar.',
    messageVi: 'Không có mạng. Chúng tôi sẽ khôi phục tiến độ ngay khi có mạng lại.',
    messageId: 'Tidak ada internet. Progresmu akan dipulihkan begitu internet kembali.',
    messageTr: 'İnternet yok. İnternet gelir gelmez ilerlemeni geri yükleyeceğiz.',
    messagePl: 'Brak internetu. Przywrócimy twój postęp, gdy tylko wróci.',
  });
}

/**
 * Запускает тихие повторы. Возвращает отмену (размонтирование): таймеры и подписка снимаются, незавершённая попытка не ставит новых.
 * Успех (`status !== 'failed'`) останавливает всё.
 */
export function scheduleSilentStartupRestore(deps: StartupRestoreRetryDeps): () => void {
  const delays = deps.delaysMs ?? STARTUP_RESTORE_RETRY_DELAYS_MS;
  const isOffline = deps.isOffline ?? (() => getNetStatus() === 'offline');
  const onOnline = deps.onOnline ?? ((listener: () => void) => subscribeNetStatus((online) => { if (online) listener(); }));
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const notifyOffline = deps.notifyOffline ?? emitOfflineRestoreNotice;

  let cancelled = false;
  let timer: unknown = null;
  let unsubscribeOnline: (() => void) | null = null;

  const tryOnce = async (label: string): Promise<boolean> => {
    try {
      const result = await deps.attempt();
      const ok = result.status !== 'failed';
      console.log(LOG, JSON.stringify({ label, status: result.status, failureReason: result.failureReason ?? null, ok }));
      return ok;
    } catch (error) {
      // зачем: исключение попытки — это неудача попытки, а не сбой запуска; причина в журнал (без текста ошибки: там бывает почта)
      console.warn(LOG, JSON.stringify({ label, threw: error instanceof Error ? error.name : typeof error }));
      return false;
    }
  };

  const finishWithoutSuccess = () => {
    if (cancelled) return;
    if (!isOffline()) {
      console.log(LOG, JSON.stringify({ step: 'gave_up_online', userSees: 'nothing', next: 'next_app_start' }));
      return;
    }
    console.log(LOG, JSON.stringify({ step: 'gave_up_offline', userSees: 'offline_notice', next: 'retry_when_online' }));
    notifyOffline();
    unsubscribeOnline = onOnline(() => {
      if (cancelled) return;
      unsubscribeOnline?.();
      unsubscribeOnline = null;
      void tryOnce('online_again');
    });
  };

  const step = (index: number) => {
    if (cancelled) return;
    if (index >= delays.length) {
      finishWithoutSuccess();
      return;
    }
    timer = setTimer(() => {
      timer = null;
      if (cancelled) return;
      void tryOnce(`retry_${index + 1}`).then((ok) => {
        if (cancelled || ok) return;
        step(index + 1);
      });
    }, delays[index]!);
  };

  console.log(LOG, JSON.stringify({ step: 'scheduled', delaysMs: delays }));
  step(0);

  return () => {
    cancelled = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
    unsubscribeOnline?.();
    unsubscribeOnline = null;
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __StartupRestoreRetryRouteShim() {
  return null;
}
