/**
 * DEV-подмена «робот съёмки ничего не сохраняет»: `dev_state?robot_no_cloud=1` / `robot_no_cloud=0`.
 *
 * зачем (координатор 12.10, съёмка R1 settings-gap-010/027/017): робот жмёт тумблеры «Уведомлений» и «Приватности», а каждый
 * такой тап в продукте — запись в облако (согласие → recordToCloud, уведомления → users/{id}.pushPrefs, push-токен) и отметка
 * «не доставлено», которая досылается при следующем запуске. Запись в прод с робота — только по слову владельца, поэтому при флаге
 * экраны меняют ТОЛЬКО своё состояние на экране (и «Сохранено») и не вызывают ни сохранения на устройство, ни облака — досылать потом
 * нечего. Каждый пропуск пишет `[ROBOT-NO-CLOUD] skip <что не ушло>`.
 * Только память процесса: флаг живёт до перезапуска. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке модуль подменён заглушкой
 * (store_release_stubs/dev_state/dev_robot_no_cloud_stub.ts), геттер всегда false, установка отклоняется.
 */
import { IS_STORE_RELEASE } from './config';

const LOG = '[ROBOT-NO-CLOUD]';

let enabled = false;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить/выключить флаг. В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevRobotNoCloud(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn(`${LOG} отклонено — не dev-сборка`, { next }); // guard-ok: ранний выход логируется
    return false;
  }
  enabled = next;
  console.log(next
    ? `${LOG} включён: тумблеры Уведомлений и Приватности меняют только экран, без сохранения и облака (только память)`
    : `${LOG} выключен: тумблеры работают как в продукте`); // guard-ok: единичный лог на ссылку
  return true;
}

/** true — сохранение и облако для тумблеров пропускаются. В стор-сборке всегда false. */
export function isDevRobotNoCloud(): boolean {
  return devAvailable() && enabled;
}

/** Записать в журнал, что именно не ушло (одна строка на тап). */
export function noteRobotNoCloudSkip(what: string): void {
  console.log(`${LOG} skip ${what}`); // guard-ok: dev-ветка, одна строка на тап робота
}

/** Только для тестов. */
export function resetDevRobotNoCloudForTests(): void {
  enabled = false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
