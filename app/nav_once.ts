// ═══════════════════════════════════════════════════════════════════════════
// nav_once.ts — защита навигации от двойного тапа.
//
// зачем (аудит Optimistic UI «Профиль и Уроки», координатор 13.10; критерий в): `router.push` без замка при двух быстрых тапах открывает ДВА одинаковых экрана
// (меню урока, сам урок, теория). Состояние кнопки обновляется после рендера, а второй тап приходит раньше — нужен синхронный замок. Здесь он на память процесса:
// один и тот же ключ второй раз в окне `windowMs` не пускаем. Не очередь и не хранилище: ничего не живёт дольше окна, ничего не показывается «потом».
// СПЕРВА ЛОГИ: отказ пишется в журнал [NAV-ONCE] с ключом и возрастом предыдущего тапа.
// ═══════════════════════════════════════════════════════════════════════════
import { DebugLogger } from './debug-logger';

/** Окно, в течение которого повторный тап по тому же ключу считается двойным. Возврат назад с экрана занимает заметно дольше. */
export const NAV_ONCE_WINDOW_MS = 700;

const lastTapAt = new Map<string, number>();

/** true — навигацию выполнять; false — это двойной тап по тому же ключу (в журнал пишется). */
export function navOnce(key: string, windowMs: number = NAV_ONCE_WINDOW_MS, nowMs: number = Date.now()): boolean {
  const prev = lastTapAt.get(key);
  if (prev !== undefined && nowMs - prev >= 0 && nowMs - prev < windowMs) {
    DebugLogger.info('[NAV-ONCE]', `${key}: повторный тап через ${nowMs - prev} мс (окно ${windowMs} мс) — второй экран не открываем`);
    return false;
  }
  lastTapAt.set(key, nowMs);
  return true;
}

/** Только для тестов. */
export function __resetNavOnceForTests(): void {
  lastTapAt.clear();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
