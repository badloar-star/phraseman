import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
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
import { BONUS_ENERGY_KEY, readBonusEnergyForMutation } from './bonus_energy_store';
import { requireGiftAccountStorageKey } from './gift_account_storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

export type EnergyState = EnergyStateV2;

export const ENERGY_STORAGE_KEY = 'energy_state'; // зачем: экспорт нужен dev-инструментам Dev Hub (app/dev_energy_tools.ts) — один ключ, без копии строки
/** Локальный интервал восстановления: серверный конфиг больше не управляет энергией. */
// PM-083 (BIBLE «+1 за 10 минут»): 0→5 занимает 50 минут.
export const ENERGY_RECOVERY_INTERVAL_MS = ENERGY_PASSIVE_UNIT_MS;

/** Fixed local max-energy value; remote/admin changes are not consulted. */
function MAX_ENERGY_VALUE(): number { return permanentEnergyCapacity({ base: 5 }); }

/**
 * Постоянный потолок энергии — тот же, что в EnergyContext.
 *
 * зачем (PM-081, D06/D07): потолок ровно 5; оформление профиля его больше
 * не меняет, поэтому чтение `profile_card_level` с диска убрано —
 * на каждом пересчёте энергии на одно обращение к хранилищу меньше.
 * Функция осталась async, чтобы не трогать сигнатуры вызывающих.
 */
async function readLevelAwareBaseMaxEnergy(): Promise<number> {
  return permanentEnergyCapacity({ base: MAX_ENERGY_VALUE() });
}

/**
 * Постоянный потолок базовой энергии. Временная ёмкость хранится отдельно;
 * EnergyContext объединяет оба пула для восстановления и знаменателя UI.
 */
export async function getEffectiveMaxEnergyValue(): Promise<number> {
  return readLevelAwareBaseMaxEnergy();
}

// Время восстановления 1 единицы энергии фиксированное:
// цепочка дней влияет на legacy reward, но не ускоряет энергию.
export function getRecoveryIntervalMs(_streakDays: number = 0): number {
  return ENERGY_PASSIVE_UNIT_MS;
}

async function getCurrentRecoveryIntervalMs(): Promise<number> {
  return getRecoveryIntervalMs();
}

const DEFAULT_STATE: EnergyState = createFullEnergyState(Date.now());

/**
 * Получить текущее состояние энергии из хранилища.
 * Если данные отсутствуют, инициализирует с максимальной энергией.
 */
/** Compatibility export retained for old callers; intentionally does nothing. */
export async function applyAdminEnergyCommand(): Promise<void> {
  // Server-side drain/fill commands are retired: energy is local-only and
  // cannot be changed by a remote product decision.
  return;
}

export async function getEnergyState(): Promise<EnergyState> {
  try {
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

// зачем (владелец 12.10, реестр п.76: английский интерфейс в R1): «29м 12с» показывался буквами по-русски на любом языке
// интерфейса — в пилюле энергии, окне «Нет энергии» и подсказке. Короткие единицы по языку; неизвестный язык — латиница h/m/s.
const RECOVERY_TIME_UNITS: Readonly<Record<string, Readonly<{ h: string; m: string; s: string }>>> = {
  ru: { h: 'ч', m: 'м', s: 'с' },
  uk: { h: 'год', m: 'хв', s: 'с' },
  en: { h: 'h', m: 'm', s: 's' },
  tr: { h: 'sa', m: 'dk', s: 'sn' },
};
const LATIN_RECOVERY_TIME_UNITS = { h: 'h', m: 'm', s: 's' } as const;

/**
 * Форматировать время до восстановления в читаемый формат (e.g., "1ч 30м 0с", "45с"; en — "1h 30m 0s").
 * lang по умолчанию 'ru' — прежнее поведение для вызовов без языка.
 */
export function formatTimeUntilRecovery(ms: number, lang: string = 'ru'): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const u = RECOVERY_TIME_UNITS[lang] ?? LATIN_RECOVERY_TIME_UNITS;

  if (hours > 0) {
    return `${hours}${u.h} ${minutes}${u.m} ${seconds}${u.s}`;
  }
  if (minutes > 0) {
    return `${minutes}${u.m} ${seconds}${u.s}`;
  }
  return `${seconds}${u.s}`;
}

// зачем (Макеты c0cd6e2ae, energy-modes-004; координатор 18.10): в образце окна остановки время «через 9 мин 41 с» — единицы с пробелом и словом «мин»;
// сжатая запись «9м 41с» остаётся для пилюли энергии и окна «Нет энергии». Один форматтер на 9 языков, единицы — в таблице ниже.
// ⚠ ЖДУТ УТВЕРЖДЕНИЯ ПЕРЕВОДЧИКА (до 07:45): en/es/pt-BR/pl/vi/id — сокращения предложены, в работу НЕ включены: пока не утверждены, эти языки получают сжатый формат (решение координатора 18.10).
// ru (образец макета), uk/tr (уже принятые сжатые единицы) — включены. Утвердили язык — добавь его в RECOVERY_LONG_APPROVED и сними пометку.
const RECOVERY_TIME_UNITS_LONG: Readonly<Record<string, Readonly<{ h: string; m: string; s: string }>>> = {
  ru: { h: 'ч', m: 'мин', s: 'с' },
  uk: { h: 'год', m: 'хв', s: 'с' },
  en: { h: 'h', m: 'min', s: 's' },
  es: { h: 'h', m: 'min', s: 's' },
  'pt-BR': { h: 'h', m: 'min', s: 's' },
  pl: { h: 'godz.', m: 'min', s: 's' },
  vi: { h: 'giờ', m: 'phút', s: 'giây' },
  id: { h: 'jam', m: 'mnt', s: 'dtk' },
  tr: { h: 'sa', m: 'dk', s: 'sn' },
};

const RECOVERY_LONG_APPROVED: ReadonlySet<string> = new Set(['ru', 'uk', 'tr']);

/** «9 мин 41 с» / «1 ч 30 мин 0 с» / «45 с» — как в образце окна остановки; ноль в старшем разряде не печатается. Язык без утверждённых сокращений — сжатый формат. */
export function formatTimeUntilRecoveryLong(ms: number, lang: string = 'ru'): string {
  if (!RECOVERY_LONG_APPROVED.has(lang)) return formatTimeUntilRecovery(ms, lang);
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const u = RECOVERY_TIME_UNITS_LONG[lang] ?? RECOVERY_TIME_UNITS_LONG.en!;
  if (hours > 0) return `${hours} ${u.h} ${minutes} ${u.m} ${seconds} ${u.s}`;
  if (minutes > 0) return `${minutes} ${u.m} ${seconds} ${u.s}`;
  return `${seconds} ${u.s}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
