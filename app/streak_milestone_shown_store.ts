// ═══════════════════════════════════════════════════════════════════════════
// streak_milestone_shown_store.ts — на диске только ФАКТ «этот рубеж уже праздновали» (не очередь долгов на показ).
//
// зачем (координатор 15.10): иначе после перезапуска приложения тот же рубеж показали бы снова. Ключ рубежа — «число:день» (например `30:2026-10-15`), поэтому
// другой аккаунт, дошедший до того же числа в другой день, получает свой рубеж; и список стирания смены аккаунта (ACCOUNT_SWITCH_LEAK_KEYS) трогать не нужно:
// «уже показано» там намеренно не стирают (иначе A при повторном входе увидит поздравление снова). Ожидающий показа рубеж живёт только в памяти (streak_milestone_pending).
// Хранится до MAX_SHOWN последних ключей. Журнал: [STREAK-MILESTONE] shown:read / shown:write.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STREAK_MILESTONE_SHOWN_KEY = 'streak_milestone_shown_v1';
const MAX_SHOWN = 24;

async function readShown(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_MILESTONE_SHOWN_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error: unknown) {
    console.warn(`[STREAK-MILESTONE] shown:read_failed reason=${error instanceof Error ? error.message : String(error)}`); // нельзя глотать: без чтения решение «показан ли» будет «нет»
    return [];
  }
}

/** Праздновали ли рубеж (ключ «число:день»). Сбой чтения = «не праздновали» (лучше показать, чем потерять поздравление), причина в журнале. */
export async function wasStreakMilestoneShown(key: string): Promise<boolean> {
  const list = await readShown();
  const shown = list.includes(key);
  console.log(`[STREAK-MILESTONE] shown:read key=${key} onDisk=${String(shown)} всего=${list.length}`);
  return shown;
}

/** Отметить рубеж показанным (на диск, последние MAX_SHOWN). Сбой записи — в журнал, поздравление не повторится в этом процессе (память pending). */
export async function markStreakMilestoneShownOnDisk(key: string): Promise<void> {
  try {
    const list = await readShown();
    if (list.includes(key)) return;
    const next = [...list, key].slice(-MAX_SHOWN);
    await AsyncStorage.setItem(STREAK_MILESTONE_SHOWN_KEY, JSON.stringify(next));
    console.log(`[STREAK-MILESTONE] shown:write key=${key} всего=${next.length}`);
  } catch (error: unknown) {
    console.warn(`[STREAK-MILESTONE] shown:write_failed key=${key} reason=${error instanceof Error ? error.message : String(error)}`);
  }
}

/** dev-подмена streak=N (только __DEV__): стереть метки «уже праздновали», чтобы рубеж можно было снять повторно. */
export async function clearStreakMilestoneShownOnDisk(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STREAK_MILESTONE_SHOWN_KEY);
    console.log('[STREAK-MILESTONE] dev:shown_cleared');
  } catch (error: unknown) {
    console.warn(`[STREAK-MILESTONE] dev:shown_clear_failed reason=${error instanceof Error ? error.message : String(error)}`);
  }
}
