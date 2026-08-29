/**
 * energy_peek_cache.ts — синхронный «последний известный заряд» энергии.
 *
 * зачем (владелец, 2026-08-24, «энергия на Главной ждёт подгрузки»): значение
 * энергии живёт в `components/EnergyContext.tsx`, но нужно оно ДВУМ сторонам —
 * самому провайдеру (в useState-инициализаторе, чтобы первый кадр не показывал
 * выдуманную полную шкалу) и стартовой гидратации `app_snapshot_bootstrap.ts`,
 * которая читает диск раньше, чем провайдер вообще монтируется.
 *
 * Кэш вынесен в отдельный модуль намеренно: если бы загрузчик импортировал
 * `EnergyContext` напрямую, холодный старт тянул бы за собой весь React-провайдер
 * со всеми его зависимостями (премиум, уведомления, подарки уровня) — ровно то,
 * от чего бережёт Performance Bible. Здесь нет ни React, ни хранилища: только
 * число в памяти процесса.
 *
 * Память процесса переживает маунты/ремаунты провайдера (навигация, возврат из
 * фона, Fast Refresh), но НЕ переживает перезапуск приложения — на холодном старте
 * её заполняет загрузчик, см. `primeEnergyPeekFromBoot`.
 */

import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { DebugLogger } from './debug-logger';

export type EnergyPeekState = Readonly<{ energy: number; maxEnergy: number }>;

/** Тот же ключ, что пишет EnergyContext — читаем ровно его состояние. */
const ENERGY_PEEK_STORAGE_KEY = 'energy_state';

let peekEnergyState: EnergyPeekState | null = null;
/**
 * Чей заряд лежит в кэше. `energy_state` — ключ БЕЗ имени аккаунта: на диске его
 * чистит cloud_sync при смене пользователя, но эта переменная живёт в памяти JS и
 * о смене сама не узнает. Без владельца новый аккаунт увидел бы чужой заряд.
 */
let peekOwnerStableId: string | null = null;

/** Последний известный заряд или `null`, если в этой сессии ещё не читали. */
export function peekEnergy(): EnergyPeekState | null {
  return peekEnergyState;
}

/** Запомнить заряд после успешного чтения/записи. */
export function writePeekEnergy(energy: number, maxEnergy: number): void {
  peekEnergyState = Object.freeze({ energy, maxEnergy });
  peekOwnerStableId = captureAccountGeneration().stableId?.trim() || null;
}

/** Сброс на смене аккаунта и в тестах: чужой заряд показывать нельзя. */
export function resetEnergyPeek(): void {
  peekEnergyState = null;
  peekOwnerStableId = null;
}

// зачем (аудит 2026-08-25): кэш обязан забыть заряд, когда сменился ВЛАДЕЛЕЦ.
//
// Безусловный сброс здесь был бы багом: это событие летит не только при смене
// аккаунта — cloud_sync зовёт beginInitialAccountGeneration(uid) и на обычном
// старте, уже после первого кадра. Главная на этом уже обжигалась с рунами
// (правильный баланс отрисовывался, затем падал в 0 и возвращался). Поэтому
// сбрасываем ровно тогда, когда прежний владелец известен и он ДРУГОЙ.
subscribeAccountGeneration((token) => {
  const nextOwner = token.stableId?.trim() || null;
  if (nextOwner !== null && nextOwner === peekOwnerStableId) return;
  // Владелец кэша ещё не известен (прогрев при импорте успел прочитать диск до
  // того, как аккаунт установился) — считаем заряд принадлежащим тому, кто пришёл
  // первым, и присваиваем его, а не выбрасываем: это тот же самый пользователь,
  // диск-то был его. Выбросить пришлось бы ровно тот кадр, ради которого всё
  // затевалось.
  if (peekOwnerStableId === null && peekEnergyState !== null && token.phase === 'active') {
    peekOwnerStableId = nextOwner;
    return;
  }
  resetEnergyPeek();
});

/**
 * Интервал восстановления с учётом активных ускорителей — зеркало
 * `readRecoveryIntervalMs` из EnergyContext (сундук лиги и weekly-boon
 * turbo_regen; берём наименьший, то есть самое быстрое восстановление).
 * Дублируется здесь, а не импортируется, чтобы модуль остался без React.
 */
async function readRecoveryIntervalMsForPeek(): Promise<number> {
  const { getRecoveryIntervalMs } = await import('./energy_system');
  try {
    const [{ readLeagueChestEnergyOverrideMs }, { readBoonEnergyOverrideMs }] = await Promise.all([
      import('./services/league_chest_rewards'),
      import('./boons/boon_effects_energy'),
    ]);
    const [leagueChestMs, boonMs] = await Promise.all([
      readLeagueChestEnergyOverrideMs(),
      readBoonEnergyOverrideMs(),
    ]);
    const overrides = [leagueChestMs, boonMs].filter(
      (value): value is number => typeof value === 'number' && value > 0,
    );
    if (overrides.length > 0) return Math.min(...overrides);
  } catch (e) {
      // Ускорители недоступны — базовый интервал честнее, чем отказ от прогрева.
      DebugLogger.error('energy_peek_cache:overrides', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return getRecoveryIntervalMs();
}

/**
 * Прогреть кэш из хранилища на старте приложения, ДО первого рендера провайдера.
 *
 * зачем: на холодном старте кэш пуст, и `EnergyProvider` честно стартовал с полного
 * заряда (`MAX_ENERGY`) — первый кадр рисовал шкалу заполненной, и она через
 * мгновение падала до настоящей. Для игрока это хуже нуля: он видит заряд,
 * которого у него нет.
 *
 * Применяется та же арифметика восстановления по времени, что и в
 * `readAndRecoverState`, но БЕЗ записи на диск: чинить и досчитывать хранилище —
 * работа обычной загрузки, которая идёт следом. Число совпадает с тем, что
 * покажет загрузка, поэтому «прыжка» после неё не будет.
 *
 * Потолок считается здесь, а не передаётся снаружи: он обязан совпасть с тем,
 * что посчитает `readDynMax` в EnergyContext, иначе знаменатель шкалы «X/Y»
 * разойдётся и прыгнет после `load()` — вернётся ровно тот баг, ради которого
 * прогрев и делался.
 */
export async function primeEnergyPeekFromBoot(): Promise<void> {
  if (peekEnergyState) return; // уже читали в этой сессии — свежее значение важнее
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    // зачем (аудит 2026-08-25): XP берётся из personal_progress_store — ровно как
    // в readDynMax. Прямое чтение ключа `user_total_xp` было бы неверным: у
    // когорты phone_state прогресс живёт в своей базе, и голый ключ отдал бы
    // устаревшее число.
    const [{ getLevelFromXP, getMaxEnergyForLevel }, { getMaxEnergy }, progressStore] =
      await Promise.all([
        import('../constants/theme'),
        import('./remote_flags'),
        import('./personal_progress_store'),
      ]);
    // Читаем прогресс, только если его ещё никто не поднял: hydratePersonalProgress
    // не коалесцирует параллельные вызовы, а загрузчик снапшота зовёт её в те же
    // миллисекунды — без этой проверки холодный старт делал бы лишний поход на диск.
    if (!progressStore.getPersonalProgressSnapshot().hydrated) {
      await progressStore.hydratePersonalProgress().catch(() => null);
      if (peekEnergyState) return;
    }
    const xp = Math.max(0, progressStore.getPersonalProgressSnapshot().totalXp || 0);
    const dynMax = getMaxEnergyForLevel(getLevelFromXP(xp), getMaxEnergy());
    if (!Number.isFinite(dynMax) || dynMax <= 0 || peekEnergyState) return;
    const raw = await AsyncStorage.getItem(ENERGY_PEEK_STORAGE_KEY);
    if (!raw || peekEnergyState) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const stored = parsed as { current?: unknown; lastRecoveryTime?: unknown };
    let current = Number(stored.current);
    if (!Number.isFinite(current) || current < 0) return; // битое значение чинит load()
    if (current > dynMax) current = dynMax;
    const lastRecoveryTime = Number(stored.lastRecoveryTime);
    if (current < dynMax && Number.isFinite(lastRecoveryTime) && lastRecoveryTime > 0) {
      // зачем (аудит 2026-08-25): интервал обязан учитывать ускорители
      // восстановления (сундук лиги, weekly-boon turbo_regen) — ровно как
      // readRecoveryIntervalMs в EnergyContext. Голый getRecoveryIntervalMs()
      // недосчитал бы восстановленную энергию при активном ускорителе, и число
      // подскочило бы вверх после load().
      const recoveryMs = await readRecoveryIntervalMsForPeek();
      if (recoveryMs > 0) {
        const recovered = Math.floor((Date.now() - lastRecoveryTime) / recoveryMs);
        if (recovered > 0) current = Math.min(current + recovered, dynMax);
      }
    }
    if (peekEnergyState) return;
    writePeekEnergy(current, dynMax);
  } catch (e) {
      // Нет доступа к хранилищу или битый JSON — оставляем кэш пустым: провайдер // отработает как раньше, а не покажет выдуманное число.
      DebugLogger.error('energy_peek_cache:recovered', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// зачем (владелец, 2026-08-24): прогрев запускается САМ при первом импорте модуля,
// а не только из загрузчика снапшота. `EnergyProvider` монтируется в дереве ВЫШЕ
// `AppContent`, внутри которого зовётся `primeAppSnapshotFromStorage` — то есть на
// холодном старте провайдер успевал отрисовать первый кадр раньше загрузчика, и
// прогрев из него опаздывал ровно к тому кадру, ради которого затевался.
// Обещание намеренно не ожидается: чтение диска не должно задерживать импорт.
void primeEnergyPeekFromBoot();
