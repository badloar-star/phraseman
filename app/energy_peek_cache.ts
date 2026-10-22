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
import { coerceEnergyStateV2, settleEnergyState } from './energy_state_v2';

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
 * Интервал восстановления — зеркало `readRecoveryIntervalMs` из EnergyContext.
 * Дублируется здесь, а не импортируется, чтобы модуль остался без React.
 */
async function readRecoveryIntervalMsForPeek(): Promise<number> {
  const { getRecoveryIntervalMs } = await import('./energy_system');
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
  // зачем (координатор 22.10, Сверка «чип энергии на старте "—"», «сперва логи»): каждый выход прогрева
  // говорит причину и время — иначе не понять, был ли у первого кадра Главной заряд.
  const startedAt = Date.now();
  const chipLog = (outcome: string, fields: Readonly<Record<string, unknown>> = {}): void => {
    console.warn('[ENERGY-CHIP] peek_prime', JSON.stringify({ outcome, ms: Date.now() - startedAt, ...fields }));
  };
  if (peekEnergyState) {
    chipLog('skip_already_primed', { energy: peekEnergyState.energy });
    return; // уже читали в этой сессии — свежее значение важнее
  }
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    // Значение берётся из локального energy contract; удалённые/устаревшие
    // progress-поля не участвуют в расчёте.
    const { permanentEnergyCapacity } = await import('./energy_contract');
    // зачем (PM-081, D06/D07): потолок ровно 5 — оформление его не меняет,
    // поэтому чтение profile_card_level на холодном старте убрано.
    // Формула та же, что в readDynMax EnergyContext: знаменатель не прыгнет.
    const dynMax = permanentEnergyCapacity({ base: 5 });
    if (!Number.isFinite(dynMax) || dynMax <= 0 || peekEnergyState) {
      chipLog(peekEnergyState ? 'skip_primed_meanwhile' : 'skip_invalid_capacity', { dynMax });
      return;
    }
    const raw = await AsyncStorage.getItem(ENERGY_PEEK_STORAGE_KEY);
    if (!raw) chipLog('skip_no_energy_state_on_disk');
    else if (peekEnergyState) chipLog('skip_primed_meanwhile');
    if (!raw || peekEnergyState) return;
    const parsed: unknown = JSON.parse(raw);
    const now = Date.now();
    const opening = coerceEnergyStateV2(parsed, now);
    const recoveryMs = await readRecoveryIntervalMsForPeek();
    const settled = settleEnergyState(opening, {
      nowMs: now,
      unitMs: recoveryMs,
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
      maxEnergy: dynMax,
    });
    const current = Math.min(settled.state.current, dynMax);
    // зачем (30.09): страж «не писать выдуманное число» потерялся при переходе на ёмкость 5 —
    // нечисловой заряд оставляет кэш пустым, провайдер посчитает сам.
    if (!Number.isFinite(current) || current < 0) {
      console.warn('[ENERGY-PEEK] prime:skip invalid_current', JSON.stringify({ current, dynMax }));
      return;
    }
    if (peekEnergyState) {
      chipLog('skip_primed_meanwhile', { computed: current });
      return;
    }
    writePeekEnergy(current, dynMax);
    chipLog('primed', { energy: current, maxEnergy: dynMax });
  } catch (e) {
    chipLog('catch', { message: e instanceof Error ? e.message.slice(0, 120) : String(e) });
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
