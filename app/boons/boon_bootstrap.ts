// Weekly Boons — единая точка применения «write-эффектов» бонусов при открытии
// приложения. Вызывается из home bootstrap. Все эффекты идемпотентны за сутки
// (date-guard ключи), безопасны при повторном вызове и не трогают монетизацию.
//
// Что НЕ здесь: чисто «читаемые» эффекты (energy-free window — проверяется в
// spendEnergy; double-xp/early-bird — множители в xp_manager; speaking-гейт — в
// useFeatureAccess). Здесь только то, что надо ОДИН раз записать на день.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from '../daily_tasks';
import { emitAppEvent } from '../events';
import { addArenaPlaysBonusForToday } from '../arena_daily_limit';
import { getPackGiftTrial, setRandomPackGiftTrial48h } from '../flashcards/pack_trial_gift';
import { applyMonthlyPremiumFreezeAllowance } from '../premium_freeze_allowance';
import { isStreakFreezeActiveToday, parseStreakFreeze } from '../streak_freeze';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { getTodaysBoons } from './boon_engine';
import { applyTurboRegenOverride } from './boon_effects_energy';

/** Сколько доп. попыток арены даёт «Турнирная суббота». */
export const ARENA_SATURDAY_BONUS_PLAYS = 5;

/** Date-guard: ключ «эффект X уже выдан в этот UTC-день». */
function dayGuardKey(boon: string): string {
  return `boon_granted_${boon}_v1`;
}

/** true, если эффект ещё НЕ выдавался сегодня (и помечает выдачу, если grant=true). */
async function notGrantedToday(boon: string, todayKey: string): Promise<boolean> {
  try {
    const prev = await AsyncStorage.getItem(dayGuardKey(boon));
    return prev !== todayKey;
  } catch {
    return false;
  }
}

async function markGrantedToday(boon: string, todayKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dayGuardKey(boon), todayKey);
  } catch {
    // best-effort
  }
}

/**
 * Streak-Saver: бесплатная заморозка серии на сегодня (без траты осколков).
 * НЕ перетираем уже активную заморозку (платную/премиум) — если на сегодня
 * заморозка уже есть, делать нечего. Так бонус не «съедает» купленную заморозку.
 *
 * Date-guard (как у остальных бонусов): помечаем выдачу за UTC-день и больше за этот
 * день не выдаём — даже если заморозка уже потрачена. Иначе после расхода заморозки в
 * тот же день бонус выдавал бы её повторно (мелкий фарм). Ключ зеркалится в облако
 * (cloud_sync), поэтому переустановка не сбрасывает гард (аудит P2 #14).
 */
async function applyStreakSaver(todayKey: string): Promise<void> {
  try {
    if (!(await notGrantedToday('streak_saver', todayKey))) return; // уже выдавали сегодня
    const existing = parseStreakFreeze(await AsyncStorage.getItem('streak_freeze'));
    if (isStreakFreezeActiveToday(existing, todayKey)) {
      // Уже защищён сегодня (платная/премиум заморозка) — не трогаем, но фиксируем день,
      // чтобы бонус не пытался выдать после расхода этой заморозки в тот же день.
      await markGrantedToday('streak_saver', todayKey);
      return;
    }
    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: todayKey }));
    await markGrantedToday('streak_saver', todayKey);
    emitAppEvent('streak_freeze_updated', { active: true });
  } catch {
    // best-effort
  }
}

/** Arena-суббота: +N попыток арены (функция СУММИРУЕТ → строгий date-guard). */
async function applyArenaSaturday(todayKey: string): Promise<void> {
  if (!(await notGrantedToday('arena_saturday', todayKey))) return;
  await addArenaPlaysBonusForToday(ARENA_SATURDAY_BONUS_PLAYS);
  await markGrantedToday('arena_saturday', todayKey);
}

/** Flashcard-пятница: 48ч триал случайного пака. Гард: только если триала нет. */
async function applyFlashcardFriday(todayKey: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  if (!(await notGrantedToday('flashcard_friday', todayKey))) return;
  // setRandomPackGiftTrial48h НЕ идемпотентна (рерандомит + продлевает 48ч), поэтому
  // не вызываем, если уже есть активный ваучер.
  const active = await getPackGiftTrial(studyTarget);
  if (active) {
    await markGrantedToday('flashcard_friday', todayKey);
    return;
  }
  await setRandomPackGiftTrial48h(studyTarget);
  await markGrantedToday('flashcard_friday', todayKey);
}

/** Турбо-регенерация: override интервала восстановления на остаток дня. */
async function applyTurboRegen(todayKey: string): Promise<void> {
  if (!(await notGrantedToday('turbo_regen', todayKey))) return;
  await applyTurboRegenOverride();
  await markGrantedToday('turbo_regen', todayKey);
}

/**
 * Применяет write-эффект текущего primary-бонуса дня. Вызывать на открытии главной.
 * Возвращает сам primary (для возможного показа баннера/модала вызывающим кодом).
 */
export async function applyTodaysBoonsOnAppOpen(
  studyTarget?: RuntimeStudyTarget,
  todayKey: string = getTodayKey(),
): Promise<void> {
  // Plus-перк: месячный лимит бесплатных заморозок стрика. Не boon, но живёт в том
  // же bootstrap-цикле открытия главной (идемпотентен, best-effort внутри).
  await applyMonthlyPremiumFreezeAllowance().catch(() => {});
  const { primary } = getTodaysBoons(todayKey);
  if (!primary) return;
  try {
    switch (primary) {
      case 'streak_saver':
        await applyStreakSaver(todayKey);
        break;
      case 'arena_saturday':
        await applyArenaSaturday(todayKey);
        break;
      case 'flashcard_friday':
        await applyFlashcardFriday(todayKey, studyTarget);
        break;
      case 'turbo_regen':
        await applyTurboRegen(todayKey);
        break;
      // mystery_monday / energy_free_window / double_xp / speaking_saturday —
      // их эффекты применяются в других местах (модал/spendEnergy/xp/gate),
      // здесь write-эффекта нет.
      default:
        break;
    }
  } catch {
    // bootstrap не должен ронять открытие главной
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
