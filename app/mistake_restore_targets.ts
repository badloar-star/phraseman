/**
 * Какие языки восстанавливать из облака при старте (события «Моих ошибок») — [MISTAKE-RESTORE].
 *
 * зачем (координатор 11.10; замер: серверная функция list вызывалась по ВСЕМ 5 языкам на каждом холодном старте,
 * ~0,75 с и чтения на сервере за каждый, даже у того, кто учит только en):
 *  - на устройстве/аккаунте без постоянной метки «полное восстановление сделано» — один раз ВСЕ языки (иначе ошибки
 *    по fr, накопленные на старом телефоне, не вернутся); после успешного прохода — метка на диске по uid;
 *  - дальше — только активный язык изучения + языки, по которым на устройстве уже есть журнал событий.
 * Награды за исправления (локальная очередь) это не трогает — их отправка идёт по всем языкам, как раньше.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STUDY_TARGET_STORAGE_KEY } from './study_target';
import { mistakePracticeEventsKey } from './target_storage_keys';

export type MistakeRestoreReason = 'full_first_restore' | 'active_and_local';

export function mistakeRestoreFullDoneKey(uid: string): string {
  return `mistake_restore_full_done_v1:${uid.trim()}`;
}

/** Чистый выбор языков. Порядок — как в общем списке (активный первым не ставим: порядок не важен для итога). */
export function selectMistakeRestoreTargets<T extends string>(input: Readonly<{
  all: readonly T[];
  active: T | null;
  withLocalEvents: readonly T[];
  fullRestoreDone: boolean;
}>): { targets: T[]; reason: MistakeRestoreReason } {
  if (!input.fullRestoreDone) return { targets: [...input.all], reason: 'full_first_restore' };
  const wanted = new Set<T>(input.withLocalEvents);
  if (input.active) wanted.add(input.active); // guard-ok: Set в памяти, не запись данных
  return { targets: input.all.filter((target) => wanted.has(target)), reason: 'active_and_local' };
}

type Storage = Pick<typeof AsyncStorage, 'multiGet' | 'setItem'>;

/** Прочитать метку, активный язык и наличие журналов одним походом в хранилище; выбрать языки и записать в лог. */
export async function resolveMistakeRestoreTargets<T extends string>(
  uid: string,
  all: readonly T[],
  storage: Storage = AsyncStorage,
): Promise<{ targets: T[]; reason: MistakeRestoreReason }> {
  const scope = uid.trim();
  const journalKeys = all.map((target) => mistakePracticeEventsKey(scope, target));
  let pairs: readonly (readonly [string, string | null])[] = [];
  try {
    pairs = await storage.multiGet([mistakeRestoreFullDoneKey(scope), STUDY_TARGET_STORAGE_KEY, ...journalKeys]);
  } catch (error) {
    // Не смогли прочитать — безопасная сторона: полный проход (ничего не теряем, только дольше).
    console.warn('[MISTAKE-RESTORE] чтение метки/журналов не удалось — восстанавливаю все языки', error instanceof Error ? error.message : String(error));
    return { targets: [...all], reason: 'full_first_restore' };
  }
  const values = new Map(pairs.map(([key, value]) => [key, value] as const));
  const fullRestoreDone = values.get(mistakeRestoreFullDoneKey(scope)) === '1';
  const activeRaw = values.get(STUDY_TARGET_STORAGE_KEY);
  const active = (all as readonly string[]).includes(String(activeRaw)) ? (activeRaw as T) : null;
  const withLocalEvents = all.filter((target, i) => values.get(journalKeys[i]) != null);
  const choice = selectMistakeRestoreTargets({ all, active, withLocalEvents, fullRestoreDone });
  console.log('[MISTAKE-RESTORE]', JSON.stringify({
    reason: choice.reason, targets: choice.targets, active, withLocalEvents, fullRestoreDone,
  }));
  return choice;
}

/** После успешного полного прохода — постоянная метка по uid (дальше только нужные языки). */
export async function markMistakeFullRestoreDone(uid: string, storage: Storage = AsyncStorage): Promise<void> {
  try {
    await storage.setItem(mistakeRestoreFullDoneKey(uid), '1');
    console.log('[MISTAKE-RESTORE] метка полного восстановления записана');
  } catch (error) {
    console.warn('[MISTAKE-RESTORE] метку записать не удалось — в следующий раз снова полный проход', error instanceof Error ? error.message : String(error));
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
