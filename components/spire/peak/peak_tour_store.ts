// peak_tour_store.ts — флаг «тур Пика показан» на аккаунт, только на устройстве (Firebase не читается и не пишется).
// зачем (владелец 04.11): тур показывается один раз на аккаунт; ключ лежит в стираемом семействе story_events_v1: — исчезает при выходе/удалении аккаунта.
// Ошибка чтения → тур НЕ показываем (лучше пропустить подсказку, чем показывать каждый раз); ошибка записи логируется, показ уже учтён в памяти.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { peakTourKey } from './peak_tour_core';

const LOG = '[PEAK-TOUR]';
const memory = new Map<string, boolean>();

export function peekPeakTourSeen(owner: string): boolean | null {
  const known = memory.get(owner);
  return known === undefined ? null : known;
}

export async function readPeakTourSeen(owner: string): Promise<boolean> {
  const known = memory.get(owner);
  if (known !== undefined) return known;
  try {
    const seen = (await AsyncStorage.getItem(peakTourKey(owner))) === '1';
    if (!memory.has(owner)) memory.set(owner, seen); // зачем: отметка, сделанная пока шло чтение, свежее прочитанного
    const value = memory.get(owner) === true;
    console.log(LOG, 'flag_read', JSON.stringify({ owner: owner.slice(0, 6), seen: value })); // guard-ok: одна строка на чтение
    return value;
  } catch (error: unknown) {
    console.warn(LOG, 'flag_read_failed → тур не показываем', String((error as Error)?.message ?? error).slice(0, 120));
    memory.set(owner, true);
    return true;
  }
}

export function markPeakTourSeen(owner: string): void {
  memory.set(owner, true); // мгновенно: повторного показа в этой сессии не будет, запись догонит фоном
  void AsyncStorage.setItem(peakTourKey(owner), '1').catch((error: unknown) => {
    console.warn(LOG, 'flag_write_failed', String((error as Error)?.message ?? error).slice(0, 120));
  });
}

export function __resetPeakTourStoreForTests(): void { memory.clear(); }
