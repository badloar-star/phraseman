// learning_v2_dev_unlock_memory.ts — dev-переключатель «Разблокировать все сессии» общий для всех экземпляров вкладки «Уроки».
// зачем (эмулятор 17.10, Моменты): диплинк на занятие монтировал вторую копию LessonsTab (/learning-v2/course) — её useState(false)
// сбрасывал переключатель, и занятие снова считалось закрытым. Память процесса, только __DEV__-инструмент; на диск не пишется.
let devUnlockAll = false;

export function peekLearningV2DevUnlockAll(): boolean {
  return devUnlockAll;
}

export function rememberLearningV2DevUnlockAll(next: boolean): void {
  if (devUnlockAll !== next) console.log('[V2-DEEPLINK] dev_unlock_all', JSON.stringify({ from: devUnlockAll, to: next })); // guard-ok: строка на переключение
  devUnlockAll = next;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
