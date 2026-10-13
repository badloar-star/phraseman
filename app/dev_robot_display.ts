/**
 * DEV-подмены вида для робот-съёмки: пустые входящие и время напоминания (dev_state?inbox=empty / reminderTime=HH:MM).
 *
 * зачем (координатор 13.10, system-015 и settings-gap-028): у гостя во входящих закреплено серверное «Замочки ушли в отпуск!»,
 * а образец — «Сообщений нет»; крестик пишет dismissAppMessage в облако, поэтому закрывать его нельзя. Время напоминания в
 * образце 20:00, в приложении 19:00. Подменяется только то, что ВИДИТ экран: хранилище, облако и расписание уведомлений
 * не трогаются. Только `__DEV__ && !IS_STORE_RELEASE`; перезапуск сбрасывает. Лог: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';

let inboxEmpty = false;
let reminderTime: Readonly<{ hour: number; minute: number }> | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

export function setDevInboxEmpty(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] inbox: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  inboxEmpty = next;
  console.log(`[DEV-STATE] inbox=${next ? 'empty (входящие пусты, только память; dismiss в облако не уходит)' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevInboxEmpty(): boolean {
  return devAvailable() && inboxEmpty;
}

/** «HH:MM» → {hour, minute} или null, если формат неверный. */
export function parseDevReminderTime(value: string): Readonly<{ hour: number; minute: number }> | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Object.freeze({ hour: Number(m[1]), minute: Number(m[2]) }) : null;
}

export function setDevReminderTime(next: Readonly<{ hour: number; minute: number }> | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] reminderTime: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  reminderTime = next;
  console.log(`[DEV-STATE] reminderTime=${next ? `${String(next.hour).padStart(2, '0')}:${String(next.minute).padStart(2, '0')} (только показ на экране; расписание и хранилище не меняются)` : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevReminderTime(): Readonly<{ hour: number; minute: number }> | null {
  return devAvailable() ? reminderTime : null;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() { return null; }
