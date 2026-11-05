/**
 * Dev-ключ «новичок» без выхода из аккаунта и без стирания данных (запрос Сверки 06.11: на 5554 боевой сервер и аккаунт владельца).
 *
 * зачем: «новый» = аккаунт создан после среза И метка онбординга после среза. На уже залогиненном старом аккаунте этого не получить без
 * выхода/очистки — а выход меняет состояние аккаунта владельца. Ключ подменяет ТОЛЬКО вердикт «новый» на чтении: серия, опыт, монеты,
 * липкая когорта и облако не трогаются. Бонус +500 при ключе не выдаётся (first_lesson_bonus), иначе монеты ушли бы на настоящий аккаунт.
 *
 * Только __DEV__ и не стор-сборка: в релизе функции — ранний выход, ключ не читается и не пишется. Журнал: [NEWBIE-SIM].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';

export const DEV_FORCE_NEWBIE_KEY = 'dev_force_newbie_v1';

function devBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

export async function isDevForceNewbie(): Promise<boolean> {
  if (!devBuild()) return false;
  try {
    return (await AsyncStorage.getItem(DEV_FORCE_NEWBIE_KEY)) === '1';
  } catch (error) {
    console.warn('[NEWBIE-SIM] read_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
    return false;
  }
}

export async function setDevForceNewbie(enabled: boolean): Promise<boolean> {
  if (!devBuild()) {
    console.warn('[NEWBIE-SIM] set refused: not a dev build'); // guard-ok: ранний выход логируется
    return false;
  }
  console.warn('[NEWBIE-SIM] set', JSON.stringify({ enabled })); // guard-ok: dev-ключ виден в логе
  try {
    if (enabled) await AsyncStorage.setItem(DEV_FORCE_NEWBIE_KEY, '1');
    else await AsyncStorage.removeItem(DEV_FORCE_NEWBIE_KEY);
    return true;
  } catch (error) {
    console.warn('[NEWBIE-SIM] set_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
    return false;
  }
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __DevForceNewbieRouteShim() { return null; }
