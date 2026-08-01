import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { prefetchShardsShopOfferings } from './shards_shop_cache';
import { getCanonicalUserId } from './user_id_policy';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatCustomerInfoHasPremiumAccess,
  revenueCatPremiumMetadata,
  type PremiumStorePlan,
} from './premium_revenuecat_state';
import { invalidatePremiumCache } from './premium_guard';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
} from './account_generation';
import { readVipSnapshotForGeneration, writeVipSnapshotForAccount } from './premium_vip_storage';

const RC_ACCOUNT_STORAGE_LOCK_TIMEOUT_MS = 1_500;

// Мгновенная доставка премиума: RevenueCat шлёт CustomerInfo при покупке/RENEWAL/
// восстановлении. Без слушателя клиент узнаёт о продлении только через 5-мин кэш или
// рестарт (риск «оплатил/продлилось, а премиум виден с задержкой»). Вешаем ОДИН раз.
let _customerInfoListenerAttached = false;

/**
 * Из общего `availablePackages` возвращает monthly + yearly + (опционально) lifetime.
 * Один источник правды для premium_modal и PremiumContext.
 *
 * lifetime — это non-consumable (`$rc_lifetime` / `phraseman_lifetime`), который
 * появляется в Offering только после того, как продукт заведён в RevenueCat
 * (см. docs/guides/LIFETIME_SETUP_GUIDE.md). Пока продукта нет — `lifetime`
 * просто `undefined`, и кнопка Phraseman Pro на пейволах не показывается.
 */
export function resolvePremiumPackages(
  availablePackages: PurchasesPackage[],
): { monthly?: PurchasesPackage; yearly?: PurchasesPackage; lifetime?: PurchasesPackage } {
  const byType = (needle: string) =>
    availablePackages.find((p: any) => String(p?.packageType || '').toUpperCase() === needle);
  const byId = (rx: RegExp) => availablePackages.find(p => rx.test(p.product.identifier));

  const monthly =
    byType('MONTHLY') ??
    byType('$RC_MONTHLY') ??
    byId(/month|monthly|1.?month/i);
  const yearly =
    byType('ANNUAL') ??
    byType('$RC_ANNUAL') ??
    byType('YEARLY') ??
    byId(/year|yearly|annual|12.?month/i);
  const lifetime =
    byType('LIFETIME') ??
    byType('$RC_LIFETIME') ??
    byId(/lifetime|forever|one.?time|onetime|perpetual/i);

  return { monthly, yearly, lifetime };
}

function trimKey(raw: unknown): string {
  return String(raw ?? '').trim();
}

/**
 * RevenueCat public keys are platform-specific. Using Android (`goog_`) on iOS (or vice versa)
 * yields backend error 7810: "The API key is not intended for the Platform."
 * We refuse to configure in that case — the fix is EAS: `EXPO_PUBLIC_RC_IOS` must be the iOS
 * public key from RevenueCat (prefix `appl_`), not the Google Play key.
 */
function matchPlatformRevenueCatKey(key: string): boolean {
  if (!key) return false;
  if (Platform.OS === 'ios') {
    // iOS / App Store / Mac App Store use appl_
    return key.startsWith('appl_');
  }
  if (Platform.OS === 'android') {
    return key.startsWith('goog_');
  }
  return false;
}

function resolveRevenueCatPublicApiKey(): string {
  const fromEnv = Platform.select({
    ios:     trimKey(process.env.EXPO_PUBLIC_RC_IOS),
    android: trimKey(process.env.EXPO_PUBLIC_RC_ANDROID),
    default: '',
  })!;
  let key = fromEnv;
  if (!key) {
    const ex = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    if (ex) {
      key = Platform.select({
        ios:     trimKey(ex.EXPO_PUBLIC_RC_IOS),
        android: trimKey(ex.EXPO_PUBLIC_RC_ANDROID),
        default: '',
      })!;
    }
  }
  if (!key) return '';
  if (!matchPlatformRevenueCatKey(key)) {
    const hint =
      Platform.OS === 'ios'
        ? 'Проверь Expo/EAS: переменная EXPO_PUBLIC_RC_IOS должна быть iOS public key (префикс appl_) из RevenueCat, не goog_.'
        : 'Проверь Expo/EAS: EXPO_PUBLIC_RC_ANDROID должен начинаться с goog_.';
    if (__DEV__) console.error('[RevenueCat]', hint, 'Сейчас ключ не подходит платформе — инициализация пропущена.');
    return '';
  }
  return key;
}

const RC_TIMEOUT_MS = 8000; // увеличен с 3000 для аудитории СНГ
const RC_IDENTITY_SYNC_TTL_MS = 60_000;

const DEV_STORE_BILLING_OPTIONAL =
  typeof __DEV__ !== 'undefined' && __DEV__ && !IS_STORE_RELEASE;

let configurePromise: Promise<void> | null = null;
let revenueCatLoggingConfigured = false;
let lastIdentitySyncUserId = '';
let lastIdentitySyncAt = 0;

function configureRevenueCatLogging(): void {
  if (revenueCatLoggingConfigured) return;
  revenueCatLoggingConfigured = true;

  try {
    if (DEV_STORE_BILLING_OPTIONAL) {
      Purchases.setLogHandler(() => {});
      void Purchases.setLogLevel(LOG_LEVEL.ERROR).catch(() => {});
      return;
    }

    void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR).catch(() => {});
  } catch {
    // RevenueCat native module can be absent in Expo Go; init already no-ops there.
  }
}

/**
 * Безопасная инициализация RevenueCat.
 * - Идемпотентна: повторные вызовы возвращают тот же Promise.
 * - Вызывает configure() только если SDK ещё не сконфигурирован.
 * - Таймаут 8 секунд на getCustomerInfo().
 * - Логирует ошибки, не блокирует запуск приложения.
 */
export async function initRevenueCat(isCurrent?: () => boolean): Promise<void> {
  if (!configurePromise) {
    configurePromise = _doInit();
  }
  await configurePromise;
  await syncRevenueCatIdentity(isCurrent);
}

function isRevenueCatAnonymousId(raw: unknown): boolean {
  const id = String(raw ?? '').trim();
  return id.startsWith('$RCAnonymousID:') || id.startsWith('$RCA');
}

export async function syncRevenueCatIdentity(callerIsCurrent?: () => boolean): Promise<boolean> {
  const syncAccount = captureAccountGeneration();
  const isCurrent = () => (
    (callerIsCurrent?.() ?? true) && isCurrentAccountGeneration(syncAccount)
  );
  if (IS_EXPO_GO) return false;
  if (!(await Purchases.isConfigured().catch(() => false))) return false;
  if (!isCurrent()) return false;

  const canonicalUserId = await getCanonicalUserId().catch(() => null);
  if (!isCurrent()) return false;
  if (!canonicalUserId) return false;

  const currentAppUserId = await Purchases.getAppUserID().catch(() => '');
  if (!isCurrent()) return false;
  if (!currentAppUserId) return false;
  const now = Date.now();
  if (
    currentAppUserId === canonicalUserId
    && lastIdentitySyncUserId === canonicalUserId
    && now - lastIdentitySyncAt < RC_IDENTITY_SYNC_TTL_MS
  ) {
    return true;
  }

  let loginCustomerInfo: unknown = null;
  if (currentAppUserId !== canonicalUserId) {
    if (!isCurrent()) return false;
    const loginResult = await Purchases.logIn(canonicalUserId).catch(() => null);
    if (!isCurrent() || !loginResult) return false;
    loginCustomerInfo = (loginResult as { customerInfo?: unknown } | null)?.customerInfo ?? null;
  }

  // logIn resolving is not proof that the SDK actually moved from A to B.
  // Verify the SDK identity before attributes, CustomerInfo, or local persistence.
  const verifiedAppUserId = await Purchases.getAppUserID().catch(() => '');
  if (!isCurrent() || verifiedAppUserId !== canonicalUserId) return false;

  const attributes: Record<string, string> = { phraseman_uid: canonicalUserId };
  if (currentAppUserId !== canonicalUserId && isRevenueCatAnonymousId(currentAppUserId)) {
    attributes.phraseman_previous_rc_app_user_id = currentAppUserId;
  }
  if (!isCurrent()) return false;
  await Purchases.setAttributes(attributes).catch(() => {});
  if (!isCurrent()) return false;

  if (revenueCatCustomerInfoHasPremiumAccess(loginCustomerInfo as any)) {
    const metadata = revenueCatPremiumMetadata(loginCustomerInfo as any);
    const plan = inferPremiumPlanFromProductId(
      metadata.productId ?? (loginCustomerInfo as { activeSubscriptions?: string[] } | null)?.activeSubscriptions?.[0],
      'monthly',
    );
    if (!isCurrent()) return false;
    const persisted = await withAccountTransitionLockWithDeadline(async () => {
      if (!isCurrent()) return false;
      return persistStorePremiumLocally(plan, metadata, isCurrent, false, true);
    }, RC_ACCOUNT_STORAGE_LOCK_TIMEOUT_MS);
    if (!persisted.completed || !persisted.value || !isCurrent()) {
      return false;
    }
  }

  if (!isCurrent()) return false;
  lastIdentitySyncUserId = canonicalUserId;
  lastIdentitySyncAt = now;
  return true;
}

/**
 * Применяет CustomerInfo, пришедший пушем от RevenueCat (покупка/RENEWAL/restore).
 * Лёгкий путь: при активном премиуме — записываем store-премиум и сбрасываем кэш,
 * чтобы UI мгновенно показал доступ. При неактивном — только инвалидируем кэш (не
 * снимаем агрессивно: фактическое снятие проходит штатную проверку в premium_guard
 * с grace-окнами, чтобы не отобрать оплаченное из-за гонки). Тестерский kill-switch
 * tester_no_premium уважаем — не воскрешаем премиум.
 */
async function applyPushedCustomerInfo(
  info: unknown,
  isCurrent: () => boolean,
): Promise<void> {
  try {
    if (!isCurrent()) return;
    const noPremium = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
    if (!isCurrent() || noPremium === 'true') return;
    const subs = (info as any)?.activeSubscriptions;
    if (revenueCatCustomerInfoHasPremiumAccess(info as any)) {
      const metadata = revenueCatPremiumMetadata(info as any);
      // Не понижаем уже сохранённый lifetime до monthly при пуш-апдейте без productId:
      // lifetime (non-consumable) RC может прислать без productId в активных подписках,
      // а inferPremiumPlanFromProductId без сигнала вернёт дефолт 'monthly'.
      const existingPlan = String(await AsyncStorage.getItem('premium_plan').catch(() => '') ?? '').trim().toLowerCase();
      if (!isCurrent()) return;
      const inferred = inferPremiumPlanFromProductId(metadata.productId ?? subs?.[0], 'monthly');
      const plan = existingPlan === 'lifetime' && inferred === 'monthly' ? 'lifetime' : inferred;
      await persistStorePremiumLocally(plan, metadata, isCurrent, false, true); // внутри invalidatePremiumCache + RC_LAST_SEEN
    } else {
      if (!isCurrent()) return;
      invalidatePremiumCache();
    }
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] applyPushedCustomerInfo error:', e);
  }
}

async function readCurrentRevenueCatCustomerInfo(
  isCurrent: () => boolean,
): Promise<unknown | null> {
  if (!isCurrent()) return null;
  const canonicalUserId = await getCanonicalUserId().catch(() => null);
  if (!isCurrent() || !canonicalUserId) return null;
  const appUserIdBefore = await Purchases.getAppUserID().catch(() => '');
  if (!isCurrent() || appUserIdBefore !== canonicalUserId) return null;
  const currentInfo = await Purchases.getCustomerInfo().catch(() => null);
  if (!isCurrent() || !currentInfo) return null;
  const appUserIdAfter = await Purchases.getAppUserID().catch(() => '');
  if (!isCurrent() || appUserIdAfter !== canonicalUserId) return null;
  return currentInfo;
}

async function _doInit(): Promise<void> {
  configureRevenueCatLogging();

  const RC_API_KEY = resolveRevenueCatPublicApiKey();
  if (IS_EXPO_GO || !RC_API_KEY) {
    if (__DEV__ && !IS_EXPO_GO && !RC_API_KEY) {
      console.warn(
        '[RevenueCat] Публичный ключ не задан для',
        Platform.OS,
        '— для EAS добавьте EXPO_PUBLIC_RC_IOS / EXPO_PUBLIC_RC_ANDROID (секреты проекта или env).',
      );
    }
    return;
  }

  try {
    if (!(await Purchases.isConfigured())) {
      // Do not pass appUserID here. Older builds created trials under RC's
      // anonymous id; configuring anonymously first lets Purchases load that
      // cached id, then logIn(stable_id) below links/transfers it correctly.
      Purchases.configure({ apiKey: RC_API_KEY });
    }
    const initAccount = captureAccountGeneration();
    const isInitAccountCurrent = () => isCurrentAccountGeneration(initAccount);
    const identityReady = await syncRevenueCatIdentity(isInitAccountCurrent);
    // Мгновенная доставка: подхватываем покупки/RENEWAL без ожидания 5-мин кэша/рестарта.
    if (!_customerInfoListenerAttached) {
      _customerInfoListenerAttached = true;
      try {
        Purchases.addCustomerInfoUpdateListener(() => {
          const eventAccount = captureAccountGeneration();
          const isEventAccountCurrent = () => isCurrentAccountGeneration(eventAccount);
          void (async () => {
            const currentInfo = await readCurrentRevenueCatCustomerInfo(isEventAccountCurrent);
            if (!currentInfo || !isEventAccountCurrent()) return;
            await withAccountTransitionLockWithDeadline(
              () => applyPushedCustomerInfo(currentInfo, isEventAccountCurrent),
              RC_ACCOUNT_STORAGE_LOCK_TIMEOUT_MS,
            );
          })();
        });
      } catch (e) {
        _customerInfoListenerAttached = false;
        if (__DEV__) console.warn('[RevenueCat] addCustomerInfoUpdateListener failed:', e);
      }
    }
    // Параллельно с getCustomerInfo: прогрев getOfferings → кэш цен для мгновенного магазина
    if (DEV_STORE_BILLING_OPTIONAL) {
      return;
    }
    void prefetchShardsShopOfferings().catch(() => {});
    if (!identityReady || !isInitAccountCurrent()) return;

    const info = await Promise.race([
      readCurrentRevenueCatCustomerInfo(isInitAccountCurrent),
      new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
    ]);

    if (info && isInitAccountCurrent()) {
      await withAccountTransitionLockWithDeadline(async () => {
      if (!isInitAccountCurrent()) return;
      if (revenueCatCustomerInfoHasPremiumAccess(info as any)) {
        const scopedVip = await readVipSnapshotForGeneration(initAccount);
        if (!isInitAccountCurrent()) return;
        // Тестер «Снять премиум» — не перезаписывать локальное «без премиума» флагом из RC
        const pairs = await AsyncStorage.multiGet([
          'tester_no_premium',
          'admin_premium_override',
          'premium_plan',
          'premium_expiry',
          'premium_admin_grant_at',
        ]);
        if (!isInitAccountCurrent()) return;
        const noPremium = pairs.find(p => p[0] === 'tester_no_premium')?.[1];
        const adminOverride = pairs.find(p => p[0] === 'admin_premium_override')?.[1];
        const existingPlan = String(pairs.find(p => p[0] === 'premium_plan')?.[1] ?? '').trim();
        if (noPremium === 'true') {
          if (__DEV__) console.log('[RevenueCat] init: skip sync premium_active (tester_no_premium)');
        } else {
          const metadata = revenueCatPremiumMetadata(info as any);
          const legacyAdminVip =
            adminOverride === 'true' ||
            (existingPlan.toLowerCase() === 'admin_grant' && adminOverride !== 'false');
          if (legacyAdminVip) {
            const now = Date.now();
            const expiryRaw = Number(pairs.find(p => p[0] === 'premium_expiry')?.[1] ?? 0);
            const expiry = Number.isFinite(expiryRaw) ? Math.max(0, Math.floor(expiryRaw)) : 0;
            const active = expiry <= 0 || expiry > now;
            const grantAt =
              String(scopedVip?.vip_admin_grant_at ?? '').trim() ||
              String(pairs.find(p => p[0] === 'premium_admin_grant_at')?.[1] ?? '').trim() ||
              String(now);
            if (!initAccount.stableId) return;
            await writeVipSnapshotForAccount(initAccount.stableId, {
              vip_active: active ? 'true' : 'false',
              vip_plan: active ? 'admin_vip' : '',
              vip_from: grantAt,
              vip_until: expiry > 0 ? String(expiry) : '0',
              vip_admin_override: active ? 'true' : 'false',
              vip_admin_grant_at: grantAt,
            });
            if (!isInitAccountCurrent()) return;
            await AsyncStorage.setItem('admin_premium_override', 'false');
            if (!isInitAccountCurrent()) return;
          }
          const existingStorePlan =
            !legacyAdminVip && (existingPlan === 'monthly' || existingPlan === 'yearly' || existingPlan === 'lifetime')
              ? existingPlan as PremiumStorePlan
              : null;
          const plan = existingStorePlan ?? inferPremiumPlanFromProductId(
            metadata.productId ?? (info as any).activeSubscriptions?.[0],
            'monthly',
          );
          await persistStorePremiumLocally(plan, metadata, isInitAccountCurrent, false, true);
        }
      }
      }, RC_ACCOUNT_STORAGE_LOCK_TIMEOUT_MS);
    }
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] init error:', e);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
