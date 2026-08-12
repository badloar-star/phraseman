import AsyncStorage from '@react-native-async-storage/async-storage';

export const WAGER_DISCOUNT_KEY = 'wager_discount';
export const WAGER_DISCOUNT_PERCENT = 0.25;
export const WAGER_DISCOUNT_DURATION_MS = 24 * 60 * 60 * 1000;

export interface WagerDiscountState {
  percent: number;
  expiresAt: number;
}

const normalizeWagerDiscountState = async (raw: string | null): Promise<WagerDiscountState | null> => {
  if (!raw) return null;

  if (raw === String(WAGER_DISCOUNT_PERCENT)) {
    const migrated: WagerDiscountState = {
      percent: WAGER_DISCOUNT_PERCENT,
      expiresAt: Date.now() + WAGER_DISCOUNT_DURATION_MS,
    };
    await AsyncStorage.setItem(WAGER_DISCOUNT_KEY, JSON.stringify(migrated));
    return migrated;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WagerDiscountState>;
    const percent = Number(parsed.percent);
    const expiresAt = Number(parsed.expiresAt);
    if (!Number.isFinite(percent) || percent <= 0 || percent >= 1 || !Number.isFinite(expiresAt)) {
      await AsyncStorage.removeItem(WAGER_DISCOUNT_KEY);
      return null;
    }
    if (Date.now() >= expiresAt) {
      await AsyncStorage.removeItem(WAGER_DISCOUNT_KEY);
      return null;
    }
    return { percent, expiresAt };
  } catch {
    await AsyncStorage.removeItem(WAGER_DISCOUNT_KEY);
    return null;
  }
};

export const grantWagerDiscount = async (
  percent: number = WAGER_DISCOUNT_PERCENT,
  durationMs: number = WAGER_DISCOUNT_DURATION_MS,
): Promise<WagerDiscountState> => {
  const state = {
    percent,
    expiresAt: Date.now() + durationMs,
  };
  await AsyncStorage.setItem(WAGER_DISCOUNT_KEY, JSON.stringify(state));
  return state;
};

export const readWagerDiscount = async (): Promise<WagerDiscountState | null> => {
  try {
    return await normalizeWagerDiscountState(await AsyncStorage.getItem(WAGER_DISCOUNT_KEY));
  } catch {
    return null;
  }
};

export const consumeWagerDiscount = async (): Promise<WagerDiscountState | null> => {
  const state = await readWagerDiscount();
  if (state) await AsyncStorage.removeItem(WAGER_DISCOUNT_KEY);
  return state;
};

export const discountedWagerCost = (baseCost: number, discount: WagerDiscountState | null): number => {
  const base = Math.max(0, Math.floor(Number(baseCost)));
  if (!discount) return base;
  return Math.max(1, Math.floor(base * (1 - discount.percent)));
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
