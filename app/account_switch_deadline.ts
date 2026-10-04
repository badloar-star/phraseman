/*
 * Потолок времени для оверлея «стираю» при смене аккаунта (AA S2d, §139 аудит Optimistic UI).
 *
 * зачем: оверлей 'wiping' в Настройках висел без ограничения — при зависшей сети человек
 * смотрел на «Не закрывай приложение» бесконечно. Обрывать саму смену НЕЛЬЗЯ и не нужно:
 * обещание не отменяется, а стирание идёт через маркер/карантин смены аккаунта и
 * возобновляется на следующем старте (resumePendingAccountSwitchQuarantine). Поэтому по
 * потолку только снимаем оверлей и показываем статус «ещё идёт» — результат смены
 * обрабатывается как обычно, когда придёт.
 *
 * Почему 45 с: обычная смена (принудительная выгрузка + стирание) укладывается в
 * несколько секунд; 45 с — больше типичной медленной сети (ожидание идущей синхронизации
 * до 25 с), но меньше худшего случая (25 с ожидания + до 35 с записи), когда человеку
 * уже нужно сказать, что происходит, а не держать экран.
 */
import { identityTrace } from './identity_trace';

export const ACCOUNT_SWITCH_UI_DEADLINE_MS = 45_000;

/**
 * Смена аккаунта пережила потолок и ещё идёт (память процесса).
 * зачем (AA S2d раунд 4, L-R3-5): после потолка оверлей снят, и повторный тап
 * запускал новую попытку, которая упиралась в замок смены и показывала ОТКАЗ. С меткой
 * Настройки отвечают тем же статусом «ещё идёт»; метка снимается, когда смена закончилась.
 */
let stillRunningCount = 0;

export function isAccountSwitchStillRunning(): boolean {
  return stillRunningCount > 0;
}

export function awaitWithStillRunningNotice<T>(
  operation: Promise<T>,
  deadlineMs: number,
  onStillRunning: () => void,
): Promise<T> {
  let settled = false;
  let markedStillRunning = false;
  const timer = setTimeout(() => {
    if (settled) return;
    markedStillRunning = true;
    stillRunningCount += 1;
    identityTrace('[ACC-SWITCH-WIPE]', 'ui_deadline still_running', { deadlineMs });
    try {
      onStillRunning();
    } catch (error) {
      // зачем: сбой показа статуса не должен трогать саму смену аккаунта.
      identityTrace('[ACC-SWITCH-WIPE]', 'ui_deadline notice_failed', {
        kind: error instanceof Error ? error.name : typeof error,
      });
    }
  }, deadlineMs);
  return operation.finally(() => {
    settled = true;
    clearTimeout(timer);
    if (markedStillRunning) {
      stillRunningCount = Math.max(0, stillRunningCount - 1);
      identityTrace('[ACC-SWITCH-WIPE]', 'ui_deadline finished_after_deadline', { deadlineMs });
    }
  });
}

// Текст статуса — app/account_switch_still_running_copy.ts («Дизайн», 9 языков); черновик удалён.

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
