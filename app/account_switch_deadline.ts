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

export function awaitWithStillRunningNotice<T>(
  operation: Promise<T>,
  deadlineMs: number,
  onStillRunning: () => void,
): Promise<T> {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
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
  });
}

export type AccountSwitchStillRunningCopy = Readonly<{ key: 'account_switch_still_running'; title: string; body: string }>;

/**
 * ЧЕРНОВИК текста для «Дизайна» (ключ account_switch_still_running) — только ru/en;
 * остальные языки берут ближайший (uk → ru, прочие → en) до финального текста.
 */
export function accountSwitchStillRunningDraft(lang: string): AccountSwitchStillRunningCopy {
  const ru = lang === 'ru' || lang === 'uk';
  return ru
    ? {
      key: 'account_switch_still_running',
      title: 'Смена аккаунта ещё идёт',
      body: 'Связь медленная. Прогресс в безопасности — закончим сами, даже если закрыть приложение.',
    }
    : {
      key: 'account_switch_still_running',
      title: 'Account switch is still in progress',
      body: 'The connection is slow. Your progress is safe — we will finish on our own, even if you close the app.',
    };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
