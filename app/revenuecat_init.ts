import Purchases from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { IS_EXPO_GO } from './config';
import { prefetchShardsShopOfferings } from './shards_shop_cache';

const RC_API_KEY = Platform.select({
  ios:     process.env.EXPO_PUBLIC_RC_IOS ?? '',
  android: process.env.EXPO_PUBLIC_RC_ANDROID ?? '',
  default: '',
})!;

const RC_TIMEOUT_MS = 8000; // увеличен с 3000 для аудитории СНГ

let configurePromise: Promise<void> | null = null;

/**
 * Безопасная инициализация RevenueCat.
 * - Идемпотентна: повторные вызовы возвращают тот же Promise.
 * - Проверяет Purchases.isConfigured перед configure().
 * - Таймаут 8 секунд на getCustomerInfo().
 * - Логирует ошибки, не блокирует запуск приложения.
 */
export function initRevenueCat(): Promise<void> {
  if (configurePromise) return configurePromise;

  configurePromise = _doInit();
  return configurePromise;
}

async function _doInit(): Promise<void> {
  if (IS_EXPO_GO || !RC_API_KEY) return;

  try {
    Purchases.configure({ apiKey: RC_API_KEY });
    // Параллельно с getCustomerInfo: прогрев getOfferings → кэш цен для мгновенного магазина
    void prefetchShardsShopOfferings().catch(() => {});

    const info = await Promise.race([
      Purchases.getCustomerInfo(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
    ]);

    if (info) {
      const isActive =
        Object.keys((info as any).entitlements.active).length > 0 ||
        (info as any).activeSubscriptions.length > 0;
      if (isActive) {
        // Тестер «Снять премиум» — не перезаписывать локальное «без премиума» флагом из RC
        const noPremium = await AsyncStorage.getItem('tester_no_premium');
        if (noPremium === 'true') {
          if (__DEV__) console.log('[RevenueCat] init: skip sync premium_active (tester_no_premium)');
        } else {
          await AsyncStorage.setItem('premium_active', 'true');
        }
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] init error:', e);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
