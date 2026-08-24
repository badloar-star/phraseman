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

export type EnergyPeekState = Readonly<{ energy: number; maxEnergy: number }>;

/** Тот же ключ, что пишет EnergyContext — читаем ровно его состояние. */
const ENERGY_PEEK_STORAGE_KEY = 'energy_state';

let peekEnergyState: EnergyPeekState | null = null;

/** Последний известный заряд или `null`, если в этой сессии ещё не читали. */
export function peekEnergy(): EnergyPeekState | null {
  return peekEnergyState;
}

/** Запомнить заряд после успешного чтения/записи. */
export function writePeekEnergy(energy: number, maxEnergy: number): void {
  peekEnergyState = Object.freeze({ energy, maxEnergy });
}

/** Сброс на смене аккаунта и в тестах: чужой заряд показывать нельзя. */
export function resetEnergyPeek(): void {
  peekEnergyState = null;
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
 * `maxEnergy` передаёт вызывающий (загрузчик уже посчитал уровень из профиля) —
 * так сюда не тянется чтение XP и старт не становится длиннее.
 */
export async function primeEnergyPeekFromBoot(maxEnergy?: number): Promise<void> {
  if (peekEnergyState) return; // уже читали в этой сессии — свежее значение важнее
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    // Потолок зависит от уровня. Вызывающий обычно уже знает его из профиля; если
    // нет (самозапуск при импорте) — считаем сами из того же XP, что читает
    // EnergyContext, чтобы шкала «X/Y» сошлась с той, что придёт из load().
    let dynMax = Number.isFinite(maxEnergy ?? NaN) && (maxEnergy ?? 0) > 0
      ? Math.floor(maxEnergy as number)
      : 0;
    if (dynMax <= 0) {
      const [{ getLevelFromXP, getMaxEnergyForLevel }, { getMaxEnergy }] = await Promise.all([
        import('../constants/theme'),
        import('./remote_flags'),
      ]);
      const xpRaw = await AsyncStorage.getItem('user_total_xp');
      const xp = Math.max(0, Number.parseInt(xpRaw || '0', 10) || 0);
      dynMax = getMaxEnergyForLevel(getLevelFromXP(xp), getMaxEnergy());
    }
    if (dynMax <= 0 || peekEnergyState) return;
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
      const { getRecoveryIntervalMs } = await import('./energy_system');
      const recoveryMs = getRecoveryIntervalMs(0);
      if (recoveryMs > 0) {
        const recovered = Math.floor((Date.now() - lastRecoveryTime) / recoveryMs);
        if (recovered > 0) current = Math.min(current + recovered, dynMax);
      }
    }
    if (peekEnergyState) return;
    writePeekEnergy(current, dynMax);
  } catch {
    // Нет доступа к хранилищу или битый JSON — оставляем кэш пустым: провайдер
    // отработает как раньше, а не покажет выдуманное число.
  }
}

// зачем (владелец, 2026-08-24): прогрев запускается САМ при первом импорте модуля,
// а не только из загрузчика снапшота. `EnergyProvider` монтируется в дереве ВЫШЕ
// `AppContent`, внутри которого зовётся `primeAppSnapshotFromStorage` — то есть на
// холодном старте провайдер успевал отрисовать первый кадр раньше загрузчика, и
// прогрев из него опаздывал ровно к тому кадру, ради которого затевался.
// Обещание намеренно не ожидается: чтение диска не должно задерживать импорт.
void primeEnergyPeekFromBoot();
