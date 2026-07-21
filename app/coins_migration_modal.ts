/**
 * coins_migration_modal.ts — одноразовый флаг + серверный клиент миграции
 * «Осколки → Монеты».
 *
 * Миграция — РЕАЛЬНАЯ одноразовая серверная конверсия по курсу 20 осколков =
 * 1 монета (округление вверх, минимум 1 монета при балансе > 0). Курс считает
 * ТОЛЬКО сервер (callable claimCoinMigration); клиент ничего не конвертирует.
 * Флаг seen ставится ТОЛЬКО после успешного claim — при офлайне/ошибке модал
 * покажется снова при следующем запуске.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getShardsBalance } from './shards_system';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

export const COINS_MIGRATION_MODAL_SEEN_KEY = 'coins_migration_modal_seen_v1';

/** Курс миграции (спека владельца): 20 осколков = 1 монета, округление вверх. */
export const COINS_MIGRATION_RATE = 20;

export type CoinMigrationClaimResult = {
  alreadyMigrated: boolean;
  shardsBefore: number;
  coinsGranted: number;
  newBalance: number;
};

const parseClaimResult = (raw: unknown): CoinMigrationClaimResult | null => {
  const r = raw as Partial<CoinMigrationClaimResult> | null | undefined;
  if (!r) return null;
  const shardsBefore = Math.floor(Number(r.shardsBefore));
  const coinsGranted = Math.floor(Number(r.coinsGranted));
  const newBalance = Math.floor(Number(r.newBalance));
  if (!Number.isFinite(shardsBefore) || shardsBefore < 0) return null;
  if (!Number.isFinite(coinsGranted) || coinsGranted < 0) return null;
  if (!Number.isFinite(newBalance) || newBalance < 0) return null;
  return { alreadyMigrated: r.alreadyMigrated === true, shardsBefore, coinsGranted, newBalance };
};

/**
 * Серверный claim миграции. Идемпотентен на сервере: повторный вызов возвращает
 * alreadyMigrated=true без двойного начисления. null — облако недоступно
 * (офлайн/ callable ещё не задеплоен) — вызывающий показывает retry-состояние.
 */
export const claimCoinMigration = async (): Promise<CoinMigrationClaimResult | null> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
      getFunctions: (...args: unknown[]) => unknown;
      httpsCallable: (fns: unknown, name: string) => (data: unknown) => Promise<{ data: unknown }>;
    };
    const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
    const cfCall = httpsCallable(getFunctions(getApp(), 'us-central1'), 'claimCoinMigration');
    const cfResult = await cfCall({});
    return parseClaimResult(cfResult.data);
  } catch {
    return null;
  }
};

/** Локальная оценка для ДЕМО-анимации тестерского превью (без сервера). */
export const demoCoinsForShards = (shards: number): number => {
  const safe = Math.max(0, Math.floor(Number(shards) || 0));
  return safe > 0 ? Math.max(1, Math.ceil(safe / COINS_MIGRATION_RATE)) : 0;
};

export const readCoinsMigrationModalSeen = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(COINS_MIGRATION_MODAL_SEEN_KEY)) === '1';
  } catch {
    return false;
  }
};

export const markCoinsMigrationModalSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(COINS_MIGRATION_MODAL_SEEN_KEY, '1');
  } catch {
    // best-effort: в худшем случае модал покажется ещё раз
  }
};

/** Тестерский сброс флага (превью из настроек тестировщика). */
export const resetCoinsMigrationModalSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COINS_MIGRATION_MODAL_SEEN_KEY);
  } catch {
    // best-effort
  }
};

/**
 * Показывать ли модал при старте приложения:
 * онбординг завершён, флаг «уже мигрирован» не стоит, баланс осколков > 0.
 */
export const shouldShowCoinsMigrationModal = async (): Promise<boolean> => {
  try {
    const onboardingDone = await AsyncStorage.getItem('onboarding_done').catch(() => null);
    if (onboardingDone !== '1') return false;
    if (await readCoinsMigrationModalSeen()) return false;
    const balance = await getShardsBalance().catch(() => 0);
    return balance > 0;
  } catch {
    return false;
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
