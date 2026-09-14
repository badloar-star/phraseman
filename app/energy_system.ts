import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { readLeagueChestEnergyOverrideMs } from './services/league_chest_rewards';
import { getMaxEnergy, getEnergyRecoveryIntervalMs } from './remote_flags';
import { readBoonEnergyOverrideMs } from './boons/boon_effects_energy';
import { withStorageLock } from './storage_mutex';
import { emitAppEvent } from './events';
import {
  coerceEnergyStateV2,
  createFullEnergyState,
  settleEnergyState,
  timeUntilEnergyAtLeast,
  type EnergyStateV2,
} from './energy_state_v2';
import { ENERGY_PASSIVE_UNIT_MS, permanentEnergyCapacity } from './energy_contract';
import { getCachedLeagueIdSync } from './league_open_cache_policy';
import { BONUS_ENERGY_KEY, readBonusEnergyForMutation } from './bonus_energy_store';
import { requireGiftAccountStorageKey } from './gift_account_storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

export type EnergyState = EnergyStateV2;

const ENERGY_STORAGE_KEY = 'energy_state';
/** Build-time default; runtime uses remote-tunable getEnergyRecoveryIntervalMs(). */
// Numeric energy: +1 every 6 minutes = +10/hour, so 0→100 takes 10 hours.
export const ENERGY_RECOVERY_INTERVAL_MS = ENERGY_PASSIVE_UNIT_MS;

/** Remote-tunable max energy (cap). Read at call time so admin changes apply live. */
function MAX_ENERGY_VALUE(): number {
  return getMaxEnergy();
}

/**
 * Same profile-card-aware permanent capacity used by EnergyContext.
 *
 * зачем лига здесь (владелец, 2026-09-14): «каждая новая лига даёт +10 к общему
 * запасу энергии». Номер лиги берём из синхронного снимка — лишнего чтения диска
 * в этом пути не появляется.
 */
async function readLevelAwareBaseMaxEnergy(): Promise<number> {
  const rawProfileCardLevel = await AsyncStorage.getItem('profile_card_level');
  return permanentEnergyCapacity({
    profileCardLevel: rawProfileCardLevel,
    leagueId: getCachedLeagueIdSync(),
    base: MAX_ENERGY_VALUE(),
  });
}

/**
 * Постоянный потолок базовой энергии. Временная ёмкость хранится отдельно;
 * EnergyContext объединяет оба пула для восстановления и знаменателя UI.
 */
export async function getEffectiveMaxEnergyValue(): Promise<number> {
  return readLevelAwareBaseMaxEnergy();
}

// Время восстановления 1 единицы энергии фиксированное:
// цепочка дней влияет на XP, но не ускоряет энергию.
export function getRecoveryIntervalMs(_streakDays: number = 0): number {
  return getEnergyRecoveryIntervalMs();
}

async function getCurrentRecoveryIntervalMs(): Promise<number> {
  try {
    // Активные override-ы интервала: league-chest и weekly-boon (turbo_regen).
    // Берём наименьший (быстрейшее восстановление), чтобы один не перетирал другой.
    const [leagueChestMs, boonMs] = await Promise.all([
      readLeagueChestEnergyOverrideMs(),
      readBoonEnergyOverrideMs(),
    ]);
    const overrides = [leagueChestMs, boonMs].filter(
      (v): v is number => typeof v === 'number' && v > 0,
    );
    return Math.min(getRecoveryIntervalMs(), ...overrides);
  } catch {
    return getEnergyRecoveryIntervalMs();
  }
}

const DEFAULT_STATE: EnergyState = createFullEnergyState(Date.now());

/**
 * Получить текущее состояние энергии из хранилища.
 * Если данные отсутствуют, инициализирует с максимальной энергией.
 */
/**
 * Разовая команда админки на изменение энергии.
 * Админка пишет в облако users/{uid}.progress.admin_energy_command (в SYNC_KEYS),
 * оттуда ключ 'admin_energy_command' доезжает на устройство. Клиент применяет команду
 * РОВНО ОДИН РАЗ — по метке `at`: если at новее применённого, меняет energy_state и
 * запоминает applied at. Так энергия остаётся client-owned, а команда — одноразовый
 * триггер (обнулить / налить до максимума), который не повторяется при каждом синке.
 */
const ADMIN_ENERGY_COMMAND_KEY = 'admin_energy_command';
const ADMIN_ENERGY_COMMAND_APPLIED_KEY = 'admin_energy_command_applied_at';

type AdminEnergyCommand = { op?: 'drain' | 'fill'; at?: number };

/** Применяет разовую админ-команду к energy_state, если она новее уже применённой. */
// зачем export (аудит 2026-08-23, третий проход): единственным вызывающим был
// getEnergyState, а его боевые вызовы исчезли задолго до переделки энергии —
// команда админки drain/fill доезжала до телефона и НИКОГДА не применялась.
// Теперь её зовёт EnergyContext.runLoad — живой путь каждой загрузки.
// Функция идемпотентна по метке `at`, повторные вызовы безопасны.
export async function applyAdminEnergyCommand(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_ENERGY_COMMAND_KEY);
    if (!raw) return;
    const cmd = JSON.parse(raw) as AdminEnergyCommand;
    const at = Number(cmd?.at) || 0;
    if (!at || (cmd?.op !== 'drain' && cmd?.op !== 'fill')) return;

    const appliedRaw = await AsyncStorage.getItem(ADMIN_ENERGY_COMMAND_APPLIED_KEY);
    const appliedAt = Number(appliedRaw) || 0;
    if (at <= appliedAt) return; // уже применена — не повторяем

    const maxEnergy = await readLevelAwareBaseMaxEnergy();
    await withStorageLock(async () => {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      let parsed: unknown = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch { parsed = null; }
      }
      const prev = coerceEnergyStateV2(parsed, now);
      const next: EnergyState = {
        schemaVersion: 2,
        current: cmd.op === 'fill' ? maxEnergy : 0,
        // Both commands settle the clock now. A drain cannot replay offline
        // time, and a full state must not retain stale fractional credit.
        lastSettledAt: now,
        recoveryCreditMicrounits: 0,
        recoveryDivisionRemainder: 0,
      };
      // Keep this reference intentional: parsing first performs any one-time
      // migration before the authoritative admin operation replaces the value.
      void prev;
      await AsyncStorage.multiSet([
        [ENERGY_STORAGE_KEY, JSON.stringify(next)],
        [ADMIN_ENERGY_COMMAND_APPLIED_KEY, String(at)],
      ]);
    });
  } catch (error) {
    DebugLogger.error('energy_system.ts:applyAdminEnergyCommand', error, 'warning');
  }
}

export async function getEnergyState(): Promise<EnergyState> {
  try {
    await applyAdminEnergyCommand();
    const maxEnergy = await readLevelAwareBaseMaxEnergy();
    return withStorageLock(async () => {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      let parsed: unknown = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch { parsed = null; }
      }
      const state = stored
        ? coerceEnergyStateV2(parsed, now)
        : createFullEnergyState(now, maxEnergy);
      // Always persist the normalized payload. For a legacy payload this is
      // the one-time schema marker that prevents a second ×20 migration.
      if (stored !== JSON.stringify(state)) {
        await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
      }
      return state;
    });
  } catch (error) {
    DebugLogger.error('energy_system.ts:getEnergyState', error, 'critical');
    return DEFAULT_STATE;
  }
}

/**
 * Проверить и применить восстановление энергии (автоматически).
 * Скорость восстановления фиксированная; цепочка дней не влияет на энергию.
 * Возвращает обновленное состояние.
 */
export async function checkAndRecover(): Promise<EnergyState> {
  try {
    await applyAdminEnergyCommand();
    const [recoveryIntervalMs, maxEnergy] = await Promise.all([
      getCurrentRecoveryIntervalMs(),
      readLevelAwareBaseMaxEnergy(),
    ]);
    return withStorageLock(async () => {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      let parsed: unknown = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch { parsed = null; }
      }
      const opening = coerceEnergyStateV2(parsed, now);
      const settled = settleEnergyState(opening, {
        nowMs: now,
        unitMs: recoveryIntervalMs,
        bonusEnergy: 0,
        bonusCapacity: 0,
        bonusExpiresAt: 0,
        maxEnergy,
      }).state;
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(settled));
      return settled;
    });
  } catch (error) {
    DebugLogger.error('energy_system.ts:checkAndRecover', error, 'critical');
    return await getEnergyState();
  }
}

/*
 * spendEnergy УДАЛЁН (владелец 2026-08-23).
 *
 * зачем: функция не вызывалась НИОТКУДА — весь боевой UI ходит через
 * EnergyContext.spendOne/spendAmount. При этом она дублировала логику трат и уже
 * разошлась с ней: в EnergyContext есть проверка isTesterNoLimitsActive(),
 * которой здесь не было. Живой дубль-источник истины про деньги игрока — прямой
 * путь к расхождению балансов, поэтому ветка снята целиком, а не оставлена
 * «на всякий случай». Нужна трата энергии — бери
 * useEnergy().confirmActivityStart(activity, intent).
 */

/**
 * Восстановить энергию вручную (например, при покупке в премиум или за достижения).
 */
export async function addEnergy(amount: number = 1): Promise<EnergyState> {
  try {
    // зачем (аудит 2026-08-24): раньше read-modify-write шёл БЕЗ замка, тогда как
    // EnergyContext все свои записи energy_state держит под withStorageLock. Подарок
    // энергии, пришедший одновременно с тратой или восстановлением, читал старое
    // состояние и перетирал свежее — единицы игрока пропадали. Читаем и пишем под
    // тем же замком, что и остальные писатели, — гонка закрыта.
    const maxEnergy = await readLevelAwareBaseMaxEnergy();
    const state = await withStorageLock(async () => {
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      const now = Date.now();
      const prev: EnergyState = stored
        ? coerceEnergyStateV2(JSON.parse(stored), now)
        : createFullEnergyState(now, maxEnergy);
      const prevCurrent = Number.isFinite(prev.current) && prev.current >= 0
        ? Math.min(prev.current, maxEnergy)
        : maxEnergy;
      const next: EnergyState = {
        ...prev,
        current: Math.min(prevCurrent + Math.max(0, Math.floor(amount)), maxEnergy),
        lastSettledAt: Number.isFinite(prev.lastSettledAt) && prev.lastSettledAt > 0
          ? prev.lastSettledAt
          : now,
      };
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    // зачем: подарок пишет energy_state напрямую, мимо EnergyContext. Без события
    // счётчики на уже открытых экранах врали до следующего фокуса, а запланированный
    // пуш «энергия восстановлена» не пересчитывался. Тот же приём, что в
    // energy_shard_refill.ts и season_reward_apply.ts.
    emitAppEvent('energy_reload');
    return state;
  } catch (error) {
    DebugLogger.error('energy_system.ts:addEnergy', error, 'critical');
    return await getEnergyState();
  }
}

/**
 * Сбросить энергию на максимум (для тестирования или специальных ситуаций).
 */
export async function resetEnergyToMax(): Promise<EnergyState> {
  try {
    const token = captureAccountGeneration();
    return await withAccountTransitionLock(async () => withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token)) throw new Error('energy_account_changed_before_full_refill');
      const now = Date.now();
      const [maxEnergy, bonus] = await Promise.all([
        readLevelAwareBaseMaxEnergy(),
        readBonusEnergyForMutation(token),
      ]);
      const state = createFullEnergyState(now, maxEnergy);
      const writes: [string, string][] = [[ENERGY_STORAGE_KEY, JSON.stringify(state)]];
      if (bonus && bonus.capacity > 0 && bonus.expiresAt > now) {
        writes.push([
          requireGiftAccountStorageKey(BONUS_ENERGY_KEY, token),
          JSON.stringify({ ...bonus, amount: bonus.capacity }),
        ]);
      }
      await AsyncStorage.multiSet(writes);
      return state;
    }));
  } catch (error) {
    DebugLogger.error('energy_system.ts:resetEnergyToMax', error, 'critical');
    throw error;
  }
}

/**
 * Вычислить время до следующего восстановления энергии (в миллисекундах).
 * Возвращает 0, если энергия уже на максимуме.
 */
export async function getTimeUntilNextRecovery(): Promise<number> {
  try {
    const [state, recoveryIntervalMs, maxEnergy] = await Promise.all([
      checkAndRecover(),
      getCurrentRecoveryIntervalMs(),
      readLevelAwareBaseMaxEnergy(),
    ]);

    if (state.current >= maxEnergy) {
      return 0;
    }
    return timeUntilEnergyAtLeast({
      current: state.current,
      required: state.current + 1,
      unitMs: recoveryIntervalMs,
      recoveryCreditMicrounits: state.recoveryCreditMicrounits,
      recoveryDivisionRemainder: state.recoveryDivisionRemainder,
    });
  } catch (error) {
    DebugLogger.error('energy_system.ts:getTimeUntilNextRecovery', error, 'warning');
    return 0;
  }
}

/**
 * Секунд до момента, когда энергия достигнет максимума (чистая функция, для тестов и пушей).
 * = (полных интервалов на недостающие единицы) − (уже прошедший остаток текущего интервала).
 * Возвращает 0, если энергия уже на максимуме.
 */
export function secondsUntilEnergyFull(
  current: number,
  maxEnergy: number,
  recoveryIntervalMs: number,
  lastRecoveryTime: number,
  now: number = Date.now(),
): number {
  if (current >= maxEnergy) return 0;
  if (recoveryIntervalMs <= 0) return 0;
  const missing = maxEnergy - current;
  const elapsedInCurrent = Math.max(0, now - lastRecoveryTime) % recoveryIntervalMs;
  const msUntilFull = missing * recoveryIntervalMs - elapsedInCurrent;
  return Math.max(1, Math.ceil(msUntilFull / 1000));
}

export type ActiveEnergyRecoveryInput = Readonly<{
  baseEnergy: number;
  maxEnergy: number;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
  lastRecoveryTime: number;
  recoveryIntervalMs: number;
  now?: number;
}>;

export type ActiveEnergyRecoveryProjection = Readonly<{
  baseEnergy: number;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
  lastRecoveryTime: number;
}>;

/**
 * Projects timer recovery across the permanent and currently active temporary
 * pools. Permanent slots fill first; any remaining recovered units refill the
 * temporary capacity without ever increasing that capacity.
 */
export function planActiveEnergyRecovery(
  input: ActiveEnergyRecoveryInput,
): ActiveEnergyRecoveryProjection {
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now();
  const maxEnergy = Math.max(0, Math.floor(Number(input.maxEnergy) || 0));
  const baseEnergy = Math.min(maxEnergy, Math.max(0, Math.floor(Number(input.baseEnergy) || 0)));
  const bonusIsActive = Number.isFinite(input.bonusExpiresAt) && input.bonusExpiresAt > now;
  const bonusCapacity = bonusIsActive
    ? Math.max(0, Math.floor(Number(input.bonusCapacity) || 0))
    : 0;
  const bonusEnergy = Math.min(
    bonusCapacity,
    Math.max(0, Math.floor(Number(input.bonusEnergy) || 0)),
  );
  const lastRecoveryTime = Number.isFinite(input.lastRecoveryTime) && input.lastRecoveryTime > 0
    ? input.lastRecoveryTime
    : now;
  const recoveryIntervalMs = Math.max(0, Number(input.recoveryIntervalMs) || 0);
  const missing = (maxEnergy - baseEnergy) + (bonusCapacity - bonusEnergy);
  if (missing <= 0 || recoveryIntervalMs <= 0 || now <= lastRecoveryTime) {
    return { baseEnergy, bonusEnergy, bonusCapacity, bonusExpiresAt: bonusIsActive ? input.bonusExpiresAt : 0, lastRecoveryTime };
  }

  const completedIntervals = Math.floor((now - lastRecoveryTime) / recoveryIntervalMs);
  if (completedIntervals <= 0) {
    return { baseEnergy, bonusEnergy, bonusCapacity, bonusExpiresAt: bonusIsActive ? input.bonusExpiresAt : 0, lastRecoveryTime };
  }
  const recoveredUnits = Math.min(missing, completedIntervals);
  const nextBase = Math.min(maxEnergy, baseEnergy + recoveredUnits);
  const recoveredBonus = recoveredUnits - (nextBase - baseEnergy);
  return {
    baseEnergy: nextBase,
    bonusEnergy: Math.min(bonusCapacity, bonusEnergy + recoveredBonus),
    bonusCapacity,
    bonusExpiresAt: bonusIsActive ? input.bonusExpiresAt : 0,
    // Consume every completed interval while the pool was not full. Otherwise
    // a long offline period would be replayed again immediately after a spend.
    lastRecoveryTime: lastRecoveryTime + completedIntervals * recoveryIntervalMs,
  };
}

/**
 * Форматировать время до восстановления в читаемый формат (e.g., "1ч 30м 0с", "45с").
 */
export function formatTimeUntilRecovery(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м ${seconds}с`;
  }
  if (minutes > 0) {
    return `${minutes}м ${seconds}с`;
  }
  return `${seconds}с`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
