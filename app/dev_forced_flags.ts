/**
 * DEV-принудительное включение remote-флагов во время работы: `dev_state?devFlags=section_openings_enabled,rank_gates_enabled` / `devFlags=off`.
 *
 * зачем (координатор 05.11, инвентарь окон наград: «14 окон без dev-способа показа»; «Открытие разделов» живым не поднять — оно за remote-флагом): раньше флаги принудительно включались только
 * переменной EXPO_PUBLIC_DEV_FORCE_FLAGS при старте Metro (нужен рестарт). Теперь — ссылкой, без рестарта: Сверка/Ревизор включают флаг, затем `coinRank=N` и т.п., и окно поднимается.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда пуст, установка отклоняется. Перезапуск приложения сбрасывает. Лог: [DEV-STATE] devFlags.
 */
import { IS_STORE_RELEASE } from './config';

let forced: ReadonlySet<string> = new Set();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Разбор списка имён флагов: латиница/цифры/подчёркивание, через запятую; мусор отбрасывается с логом. */
export function parseDevForcedFlags(raw: string): readonly string[] {
  const names = raw.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
  const ok = names.filter((name) => /^[a-z][a-z0-9_]{2,63}$/.test(name));
  if (ok.length !== names.length) console.warn('[DEV-STATE] devFlags: отброшены неверные имена', JSON.stringify(names.filter((n) => !ok.includes(n)))); // guard-ok: причина отброса
  return ok;
}

/** Включить перечисленные флаги (пусто/null — снять). В стор-сборке — отказ с логом. true — применено. */
export function setDevForcedFlags(names: readonly string[] | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] devFlags: отклонено — не dev-сборка', { count: names?.length ?? 0 }); // guard-ok: ранний выход логируется
    return false;
  }
  forced = new Set(names ?? []);
  console.log(`[DEV-STATE] devFlags ${forced.size === 0 ? 'off' : `on=${[...forced].join(',')}`}`); // guard-ok: итог
  return true;
}

/** Флаг принудительно включён ссылкой? В стор-сборке всегда false. */
export function isDevForcedFlag(key: string): boolean {
  return devAvailable() && forced.has(key);
}
