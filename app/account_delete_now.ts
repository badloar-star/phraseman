// account_delete_now.ts — «Удалить навсегда сейчас»: признак немедленного удаления для постановки на сервере.
//
// зачем (владелец 25.10, макет account-delete-variant-b «Да, так»; сервер 713677ddd): по умолчанию аккаунт Google/Apple
// удаляется через 14 дней (можно передумать). По ссылке «Удалить навсегда сейчас» сервер должен удалить сразу — поле запроса
// deleteNow=true. Признак не кладём в замок удаления (у замка и якоря строгая сверка полей): beginAccountDeletion взводит его
// в памяти, функция постановки при первом вызове забирает и сохраняет на диск ПО НОМЕРУ ОПЕРАЦИИ — повторы после перезапуска
// (досылка из замка) читают его оттуда, и «сейчас» не превращается молча в «через 14 дней».
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG = '[ACCOUNT-DELETE-NOW]';
const KEY_PREFIX = 'account_delete_now_v1:';

let armed = false;

/** Взвести для ближайшей постановки (вызывает beginAccountDeletion при «Удалить навсегда сейчас»). */
export function armAccountDeleteNow(): void {
  armed = true;
  console.log(LOG, JSON.stringify({ event: 'armed' })); // guard-ok: одна строка на удаление
}

/** Снять неиспользованный признак (beginAccountDeletion в finally) — чтобы не перетёк в следующее обычное удаление. */
export function disarmAccountDeleteNow(): void {
  if (armed) console.log(LOG, JSON.stringify({ event: 'disarmed_unused' })); // guard-ok: ранний выход называет причину
  armed = false;
}

/** Синхронно забрать взведённый признак в момент постановки (до первого await). */
export function takeArmedAccountDeleteNow(): boolean {
  const value = armed;
  armed = false;
  return value;
}

/**
 * Итог для запроса постановки: взведено сейчас → сохранить по операции и вернуть true; иначе — то, что сохранено по операции.
 * Сбой диска: при взведённом — всё равно true (этот запрос уйдёт верно), причина в журнале.
 */
export async function resolveAccountDeleteNow(operationId: string, armedNow: boolean): Promise<boolean> {
  const key = `${KEY_PREFIX}${operationId}`;
  if (armedNow) {
    try {
      await AsyncStorage.setItem(key, '1');
      console.log(LOG, JSON.stringify({ event: 'persisted' })); // guard-ok: одна строка на удаление
    } catch (error) {
      console.warn(LOG, JSON.stringify({ event: 'persist_failed', message: error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80) })); // guard-ok: catch пишет причину
    }
    return true;
  }
  try {
    const stored = (await AsyncStorage.getItem(key)) === '1';
    if (stored) console.log(LOG, JSON.stringify({ event: 'restored_for_retry' })); // guard-ok: ветка называет решение
    return stored;
  } catch (error) {
    console.warn(LOG, JSON.stringify({ event: 'read_failed', message: error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80) })); // guard-ok: catch пишет причину
    return false;
  }
}

export default function __RouteShim() { return null; }
