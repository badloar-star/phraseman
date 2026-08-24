import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { readLeagueChestEnergyOverrideMs } from './services/league_chest_rewards';
import { getMaxEnergy, getEnergyRecoveryIntervalMs } from './remote_flags';
import { readBoonEnergyOverrideMs } from './boons/boon_effects_energy';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { captureAccountGeneration } from './account_generation';
import { readGiftAccountValue, removeGiftAccountValue } from './gift_account_storage';
import { withStorageLock } from './storage_mutex';
import { emitAppEvent } from './events';

export interface EnergyState {
  current: number;
  lastRecoveryTime: number;
}

const ENERGY_STORAGE_KEY = 'energy_state';
/** Build-time default; runtime uses remote-tunable getEnergyRecoveryIntervalMs(). */
// зачем: владелец 2026-08-23 — 30 минут за единицу. Энергия теперь тратится
// только за СТАРТ активности (не за ошибки), поэтому трата редкая и медленное
// восстановление не наказывает за учёбу.
export const ENERGY_RECOVERY_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Подарок «Энергия +N до полуночи» (level_gift_system: BONUS_ENERGY_KEY).
 * Пока бонус активен — потолок энергии временно поднят на bonus.amount, а сами
 * слоты сразу заполняются при выдаче (см. applyEnergyBonusN). Читаем ключ напрямую,
 * чтобы не тянуть level_gift_system и не создавать циклический импорт.
 */
const BONUS_ENERGY_KEY = 'energy_gift_bonus';

/** Активный доп-запас слотов от подарка (0, если бонуса нет или он истёк). Чистит протухший. */
async function readBonusEnergyExtra(): Promise<number> {
  try {
    const accountToken = captureAccountGeneration();
    const raw = await readGiftAccountValue(BONUS_ENERGY_KEY, accountToken);
    if (!raw) return 0;
    const b = JSON.parse(raw) as { amount?: number; expiresAt?: number };
    const expiresAt = Number(b?.expiresAt) || 0;
    if (Date.now() >= expiresAt) {
      await removeGiftAccountValue(BONUS_ENERGY_KEY, accountToken).catch(() => {});
      return 0;
    }
    return Math.max(0, Math.floor(Number(b?.amount) || 0));
  } catch {
    return 0;
  }
}

/** Remote-tunable max energy (cap). Read at call time so admin changes apply live. */
function MAX_ENERGY_VALUE(): number {
  return getMaxEnergy();
}

/** Same local level-aware base capacity used by EnergyContext; no network read. */
async function readLevelAwareBaseMaxEnergy(): Promise<number> {
  try {
    const xpRaw = await AsyncStorage.getItem('user_total_xp');
    const xp = Math.max(0, parseInt(xpRaw || '0', 10) || 0);
    return getMaxEnergyForLevel(getLevelFromXP(xp), MAX_ENERGY_VALUE());
  } catch {
    return MAX_ENERGY_VALUE();
  }
}

/**
 * Эффективный потолок энергии = базовый максимум + активные бонусные слоты подарка.
 * Используется везде, где раньше стоял голый MAX_ENERGY_VALUE(), чтобы подарочные
 * слоты реально давали запас и восстанавливались, а после полуночи срезались.
 */
export async function getEffectiveMaxEnergyValue(): Promise<number> {
  const base = await readLevelAwareBaseMaxEnergy();
  const bonus = await readBonusEnergyExtra();
  return base + bonus;
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
    if (overrides.length > 0) return Math.min(...overrides);
    return getRecoveryIntervalMs();
  } catch {
    return getEnergyRecoveryIntervalMs();
  }
}

const DEFAULT_STATE: EnergyState = {
  current: getMaxEnergy(),
  lastRecoveryTime: Date.now(),
};

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

    const maxE = await getEffectiveMaxEnergyValue();
    const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
    const prev = stored ? (JSON.parse(stored) as EnergyState) : { ...DEFAULT_STATE, lastRecoveryTime: Date.now() };
    const next: EnergyState = {
      ...prev,
      current: cmd.op === 'fill' ? maxE : 0,
      // При обнулении сбрасываем отсчёт восстановления от текущего момента,
      // чтобы юзер не получил «пачку» энергии за прошедшее время сразу же.
      lastRecoveryTime: cmd.op === 'drain' ? Date.now() : prev.lastRecoveryTime,
    };
    await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(next));
    await AsyncStorage.setItem(ADMIN_ENERGY_COMMAND_APPLIED_KEY, String(at));
  } catch (error) {
    DebugLogger.error('energy_system.ts:applyAdminEnergyCommand', error, 'warning');
  }
}

export async function getEnergyState(): Promise<EnergyState> {
  try {
    await applyAdminEnergyCommand();
    const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
    if (!stored) {
      // Инициализация: первый раз у пользователя
      const initialState: EnergyState = {
        current: await getEffectiveMaxEnergyValue(),
        lastRecoveryTime: Date.now(),
      };
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(initialState));
      return initialState;
    }
    const parsed = JSON.parse(stored) as EnergyState;
    const maxE = await getEffectiveMaxEnergyValue();
    if (!Number.isFinite(parsed.current) || parsed.current < 0) parsed.current = maxE;
    else if (parsed.current > maxE) parsed.current = maxE;
    return parsed;
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
    let state = await getEnergyState();
    const now = Date.now();
    const [recoveryIntervalMs, effectiveMax] = await Promise.all([
      getCurrentRecoveryIntervalMs(),
      getEffectiveMaxEnergyValue(),
    ]);
    const timeSinceLastRecovery = now - state.lastRecoveryTime;

    if (timeSinceLastRecovery >= recoveryIntervalMs) {
      const recoveryCount = Math.floor(timeSinceLastRecovery / recoveryIntervalMs);
      const newCurrent = Math.min(state.current + recoveryCount, effectiveMax);

      state = {
        ...state,
        current: newCurrent,
        lastRecoveryTime: state.lastRecoveryTime + recoveryCount * recoveryIntervalMs,
      };

      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
    }

    return state;
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
 * «на всякий случай». Нужна трата энергии — бери useEnergy().spendOne().
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
    const state = await withStorageLock(async () => {
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      const maxE = await getEffectiveMaxEnergyValue();
      const prev: EnergyState = stored
        ? (JSON.parse(stored) as EnergyState)
        : { current: maxE, lastRecoveryTime: Date.now() };
      const prevCurrent = Number.isFinite(prev.current) && prev.current >= 0
        ? Math.min(prev.current, maxE)
        : maxE;
      const next: EnergyState = {
        ...prev,
        current: Math.min(prevCurrent + amount, maxE),
        lastRecoveryTime: Number.isFinite(prev.lastRecoveryTime) && prev.lastRecoveryTime > 0
          ? prev.lastRecoveryTime
          : Date.now(),
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
    const state: EnergyState = {
      current: await getEffectiveMaxEnergyValue(),
      lastRecoveryTime: Date.now(),
    };

    await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch (error) {
    DebugLogger.error('energy_system.ts:resetEnergyToMax', error, 'critical');
    return DEFAULT_STATE;
  }
}

/**
 * Вычислить время до следующего восстановления энергии (в миллисекундах).
 * Возвращает 0, если энергия уже на максимуме.
 */
export async function getTimeUntilNextRecovery(): Promise<number> {
  try {
    const [state, recoveryIntervalMs, effectiveMax] = await Promise.all([
      checkAndRecover(),
      getCurrentRecoveryIntervalMs(),
      getEffectiveMaxEnergyValue(),
    ]);

    if (state.current >= effectiveMax) {
      return 0;
    }

    const timeSinceLastRecovery = Date.now() - state.lastRecoveryTime;
    return Math.max(0, recoveryIntervalMs - timeSinceLastRecovery);
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
