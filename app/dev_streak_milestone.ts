// ═══════════════════════════════════════════════════════════════════════════
// dev_streak_milestone.ts — dev-подмена streak=N: «сегодня засчитан день, серия стала N» (только __DEV__).
//
// зачем (координатор 15.10): Сверка снимает окна рубежей серии (d1…d1000) на эмуляторе, а настоящую серию в 100/365 дней
// не набрать. Подмена имитирует событие роста серии: стирает метки «уже праздновали» (память и диск) и зовёт ту же
// markStreakDayCounted, что и настоящий урок — дальше рубеж ждёт показа на итоге урока/разговора/карточек/«Моих ошибок»
// (при включённом moments_v3: dev_state ?moments=v3). Вне __DEV__ ничего не делает. Журнал: [DEV-STREAK-MILESTONE].
// ═══════════════════════════════════════════════════════════════════════════
import { getLocalDayKey } from './local_date';

const MAX_DEV_STREAK_DAYS = 5000;

/** «streak=100» → 100; не целое или вне 1…5000 → null. */
export function parseDevStreakMilestone(raw: unknown): number | null {
  const text = String(raw ?? '').trim();
  if (!/^\d{1,4}$/.test(text)) return null;
  const days = Number(text);
  return days >= 1 && days <= MAX_DEV_STREAK_DAYS ? days : null;
}

export async function runDevStreakMilestone(days: number): Promise<boolean> {
  if (typeof __DEV__ === 'undefined' || __DEV__ !== true) {
    console.warn(`[DEV-STREAK-MILESTONE] отказ: не dev-сборка days=${days}`); // guard-ok: ранний выход логируется
    return false;
  }
  const today = getLocalDayKey();
  console.log(`[DEV-STREAK-MILESTONE] старт days=${days} today=${today}`); // guard-ok: журнал dev-подмены
  const { resetStreakMilestoneForDev } = await import('./streak_milestone_pending');
  const { clearStreakMilestoneShownOnDisk } = await import('./streak_milestone_shown_store');
  const { markStreakDayCounted } = await import('./streak_day_signal');
  resetStreakMilestoneForDev();
  await clearStreakMilestoneShownOnDisk();
  markStreakDayCounted({ wasCountedBefore: false, days, source: 'dev_state_streak', today });
  console.log(`[DEV-STREAK-MILESTONE] готово: серия=${days}, рубеж покажет следующий итог при moments_v3`); // guard-ok: итог dev-подмены
  return true;
}
