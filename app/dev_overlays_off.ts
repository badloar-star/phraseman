/**
 * DEV-подмена «модальные окна рассылок/объявлений/личных сообщений не показываются»: `dev_state?overlays=off` / `overlays=on`.
 *
 * зачем (координатор 12.10, cards-009/cards-010): у тестового гостя поверх кадра всплывало «Замочки ушли в отпуск!» и портило съёмку. Для кадров, где окна не нужны,
 * ссылка гасит ВСЕ очередные окна корневого экрана (обновление, восстановление входа, «что нового», рассылка, сообщение приложения, личное сообщение, подсказка уведомлений,
 * окно полного доступа). Только память процесса: ничего не пишется ни в хранилище, ни в облако, не помечает сообщения прочитанными. Перезапуск приложения сбрасывает.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда false, а установка отклоняется. Лог: [DEV-STATE] overlays.
 *
 * Второе назначение — сигнал «перепроверь ворота окон»: фикстура `onboarding=done` ставит отметку завершения онбординга уже ПОСЛЕ старта приложения, а рассылка могла
 * быть считана раньше; корневой экран подписан и повторно сверяет её с воротами свежей установки (app/fresh_install_gate.ts).
 */
import { IS_STORE_RELEASE } from './config';

let off = false;
let recheckTick = 0;
const listeners = new Set<() => void>();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Подписка корневого экрана (useSyncExternalStore): вызывается при смене флага и при запросе повторной сверки. */
export function subscribeDevOverlays(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Включить/выключить гашение окон. В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevOverlaysOff(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] overlays: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  off = next;
  console.log(next ? '[DEV-STATE] overlays=off (окна рассылок/объявлений/сообщений гасятся, только память)' : '[DEV-STATE] overlays=on (окна как обычно)'); // guard-ok: единичный лог на ссылку
  notify();
  return true;
}

/** true — окна погашены. В стор-сборке всегда false. */
export function isDevOverlaysOff(): boolean {
  return devAvailable() && off;
}

/** Попросить корневой экран заново сверить уже считанную рассылку с воротами свежей установки. Счётчик меняется — подписчик перерисуется. */
export function requestDevOverlayRecheck(reason: string): void {
  if (!devAvailable()) return;
  recheckTick += 1;
  console.log(`[DEV-STATE] overlays: повторная сверка окон запрошена tick=${recheckTick} reason=${reason}`); // guard-ok: единичный лог на запрос
  notify();
}

/** Снимок для useSyncExternalStore: меняется при смене флага или запросе сверки. */
export function getDevOverlaysSnapshot(): string {
  return devAvailable() ? `${off ? 1 : 0}:${recheckTick}` : '0:0';
}
