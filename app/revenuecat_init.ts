import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { revenueCatCustomerInfoHasPremiumAccess, type PremiumStorePlan } from './premium_revenuecat_state';
import { invalidatePremiumCache } from './premium_guard';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
} from './account_generation';
import { DebugLogger, reportSwallowed, swallowError } from './debug-logger';

// зачем: PM-229 — на денежном пути (личность RevenueCat, CustomerInfo) сбой чтения раньше превращался
// в «нет данных» без следа; теперь причина пишется, а возвращаемое значение прежнее.
const rcFallback = <T>(tag: string, fallback: T) => (error: unknown): T => {
  reportSwallowed(`revenuecat_init:${tag}`, error);
  return fallback;
};

const RC_ACCOUNT_STORAGE_LOCK_TIMEOUT_MS = 1_500;

export function resolveRevenueCatStorePlan(
  existingStorePlan: PremiumStorePlan | null,
  inferredPlan: PremiumStorePlan,
): PremiumStorePlan {
  return existingStorePlan ?? inferredPlan;
}

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
      void Purchases.setLogLevel(LOG_LEVEL.ERROR).catch(swallowError('revenuecat_init:setLogLevel_1'));
      return;
    }

    void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR).catch(swallowError('revenuecat_init:setLogLevel_2'));
  } catch (e) {
      // RevenueCat native module can be absent in Expo Go; init already no-ops there.
      DebugLogger.error('revenuecat_init:configureRevenueCatLogging', e instanceof Error ? e : new Error(String(e)), 'warning');
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

// зачем (D158, M4): Plus-окно бросает по тайм-ауту ожидание init/sync, но сам вызов живёт дальше. Без
// дедупликации каждый новый тап/повтор запускал бы ещё один Purchases.logIn параллельно брошенному.
// Параллельные вызовы ОДНОГО аккаунта делят один промис; другой аккаунт (смена поколения) — отдельный.
let identitySyncInFlight: { key: string; promise: Promise<boolean> } | null = null;

export function syncRevenueCatIdentity(callerIsCurrent?: () => boolean): Promise<boolean> {
  const token = captureAccountGeneration();
  const key = `${token.generation}|${token.stableId ?? ''}|${token.phase}`;
  if (identitySyncInFlight && identitySyncInFlight.key === key) {
    DebugLogger.info('[RC-IDENTITY]', 'syncRevenueCatIdentity: параллельный вызов присоединён к идущему');
    return awaitSharedIdentitySync(identitySyncInFlight.promise, callerIsCurrent);
  }
  // зачем (D158, M-B): в ОБЩИЙ промис callerIsCurrent НЕ передаём — иначе устаревшая проверка первого
  // вызывающего (например reload премиума по эпохам) дала бы ложный false оплате Plus. Внутри — только
  // проверка поколения аккаунта; своё callerIsCurrent каждый проверяет сам после await.
  const promise = syncRevenueCatIdentityOnce(undefined).finally(() => {
    if (identitySyncInFlight?.promise === promise) identitySyncInFlight = null;
  });
  identitySyncInFlight = { key, promise };
  return awaitSharedIdentitySync(promise, callerIsCurrent);
}

async function awaitSharedIdentitySync(shared: Promise<boolean>, callerIsCurrent?: () => boolean): Promise<boolean> {
  const ok = await shared;
  if (!ok) return false;
  if (callerIsCurrent && !callerIsCurrent()) {
    DebugLogger.info('[RC-IDENTITY]', 'syncRevenueCatIdentity: вызывающий уже не актуален — false только ему');
    return false;
  }
  return true;
}

/**
 * зачем (Блиц 04.10, accessResolved ~94 с на эмуляторе — «сперва логи»): нативные вызовы RevenueCat
 * (isConfigured/getAppUserID/logIn/setAttributes) идут без потолка. Медленная синхронизация (> 1,5 с)
 * пишет одну строку с длительностью каждого вызова.
 */
async function syncRevenueCatIdentityOnce(callerIsCurrent?: () => boolean): Promise<boolean> {
  const startedAt = Date.now();
  const steps: Record<string, number> = {};
  let stepAt = startedAt;
  const mark = (name: string): void => {
    const now = Date.now();
    steps[name] = now - stepAt;
    stepAt = now;
  };
  let result = false;
  try {
    result = await syncRevenueCatIdentityOnceTraced(callerIsCurrent, mark);
    return result;
  } finally {
    const totalMs = Date.now() - startedAt;
    if (totalMs > 1500) console.warn('[RC-IDENTITY] sync:slow', JSON.stringify({ totalMs, result, steps }));
  }
}

async function syncRevenueCatIdentityOnceTraced(
  callerIsCurrent: (() => boolean) | undefined,
  mark: (name: string) => void,
): Promise<boolean> {
  const syncAccount = captureAccountGeneration();
  const isCurrent = () => (
    (callerIsCurrent?.() ?? true) && isCurrentAccountGeneration(syncAccount)
  );
  if (IS_EXPO_GO) return false;
  const configured = await Purchases.isConfigured().catch(rcFallback('isConfigured_3', false));
  mark('is_configured');
  if (!configured) return false;
  if (!isCurrent()) return false;

  const canonicalUserId = await getCanonicalUserId().catch(rcFallback('getCanonicalUserId_4', null));
  mark('canonical_user_id');
  if (!isCurrent()) return false;
  if (!canonicalUserId) return false;

  const currentAppUserId = await Purchases.getAppUserID().catch(rcFallback('getAppUserID_5', ''));
  mark('get_app_user_id');
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

  // зачем: тип CustomerInfo здесь НЕ стираем в unknown. Раньше стирали, а ниже
  // восстанавливали через `as any` — компилятор переставал проверять денежный
  // путь (премиум/план/метаданные). Purchases.logIn уже отдаёт типизированный
  // customerInfo, ему и доверяем; проверка полей всё равно живёт в
  // revenuecat_premium_access.ts (?., clean, typeof), она никуда не делась.
  if (currentAppUserId !== canonicalUserId) {
    if (!isCurrent()) return false;
    const loginResult = await Purchases.logIn(canonicalUserId).catch(rcFallback('logIn_6', null));
    mark(`log_in:${loginResult ? 'ok' : 'null'}`);
    if (!isCurrent() || !loginResult) return false;
  }

  // logIn resolving is not proof that the SDK actually moved from A to B.
  // Verify the SDK identity before attributes, CustomerInfo, or local persistence.
  const verifiedAppUserId = await Purchases.getAppUserID().catch(rcFallback('getAppUserID_7', ''));
  mark('verify_app_user_id');
  if (!isCurrent() || verifiedAppUserId !== canonicalUserId) return false;

  const attributes: Record<string, string> = { phraseman_uid: canonicalUserId };
  if (currentAppUserId !== canonicalUserId && isRevenueCatAnonymousId(currentAppUserId)) {
    attributes.phraseman_previous_rc_app_user_id = currentAppUserId;
  }
  if (!isCurrent()) return false;
  await Purchases.setAttributes(attributes).catch(swallowError('revenuecat_init:setAttributes_8'));
  mark('set_attributes');
  if (!isCurrent()) return false;

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
 * tester_no_premium уважаем только в dev/preview; store-релиз игнорирует и
 * best-effort удаляет старый QA-флаг, чтобы не отобрать оплаченный доступ.
 */
async function applyPushedCustomerInfo(
  // зачем: единственный вызывающий (слушатель RC) передаёт результат
  // readCurrentRevenueCatCustomerInfo — уже типизированный CustomerInfo.
  // Приём `unknown` заставлял восстанавливать тип через `as any` внутри.
  info: CustomerInfo,
  isCurrent: () => boolean,
): Promise<void> {
  if (!isCurrent()) return;
  // Passive SDK CustomerInfo is not owner-binding evidence. It may reflect a
  // receipt transferred by RevenueCat policy or a previously cached identity.
  // Explicit purchase/restore flows own local persistence; passive updates only
  // invalidate the decision cache so account-scoped cloud projection can win.
  if (revenueCatCustomerInfoHasPremiumAccess(info)) {
    DebugLogger.info('[RC-LISTENER]', 'active CustomerInfo ignored until explicit/account-scoped confirmation');
  }
  invalidatePremiumCache();
}

// зачем: возвращаем настоящий CustomerInfo, а не `unknown`. Тип стирался тут,
// и каждый вызывающий восстанавливал его через `as any` — на денежном пути
// (премиум, план, expiry) компилятор молчал. Purchases.getCustomerInfo уже
// типизирован; сужение до null делают проверки поколения аккаунта ниже.
async function readCurrentRevenueCatCustomerInfo(
  isCurrent: () => boolean,
): Promise<CustomerInfo | null> {
  if (!isCurrent()) return null;
  const canonicalUserId = await getCanonicalUserId().catch(rcFallback('getCanonicalUserId_11', null));
  if (!isCurrent() || !canonicalUserId) return null;
  const appUserIdBefore = await Purchases.getAppUserID().catch(rcFallback('getAppUserID_12', ''));
  if (!isCurrent() || appUserIdBefore !== canonicalUserId) return null;
  const currentInfo = await Purchases.getCustomerInfo().catch(rcFallback('getCustomerInfo_13', null));
  if (!isCurrent() || !currentInfo) return null;
  const appUserIdAfter = await Purchases.getAppUserID().catch(rcFallback('getAppUserID_14', ''));
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
            if (!currentInfo || !isEventAccountCurrent()) {
              // зачем (ревью 12.10 п.7): ранний выход слушателя называет причину
              DebugLogger.info('[RC-LISTENER]', `событие customerInfo отброшено: info=${currentInfo ? 'есть' : 'нет'} аккаунтТот=${String(isEventAccountCurrent())}`);
              return;
            }
            await withAccountTransitionLockWithDeadline(
              () => applyPushedCustomerInfo(currentInfo, isEventAccountCurrent),
              RC_ACCOUNT_STORAGE_LOCK_TIMEOUT_MS,
            );
          })().catch((e: unknown) => {
            DebugLogger.error('[RC-LISTENER] событие customerInfo: сбой обработки', e instanceof Error ? e : new Error(String(e)), 'warning');
          });
        });
      } catch (e) {
        _customerInfoListenerAttached = false;
        // зачем (ревью 12.10 п.7): в проде ошибка подписки на customerInfo не логировалась (только в __DEV__) — Plus-доступ после покупки на другом устройстве молча не приходил бы
        DebugLogger.error('[RC-LISTENER] addCustomerInfoUpdateListener failed', e instanceof Error ? e : new Error(String(e)), 'warning');
      }
    }
    // зачем (PM-057): прогрев getOfferings для магазина жемчуга убран вместе с
    // самим магазином — это был лишний сетевой запрос к RevenueCat на КАЖДОМ
    // старте. Подписка Plus грузит свои offerings сама, в paywall.
    if (DEV_STORE_BILLING_OPTIONAL) {
      return;
    }
    if (!identityReady || !isInitAccountCurrent()) return;

    const info = await Promise.race([
      readCurrentRevenueCatCustomerInfo(isInitAccountCurrent),
      new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
    ]);

    if (info && isInitAccountCurrent()) {
      // Startup CustomerInfo is passive SDK state, not proof that the receipt
      // belongs to this stable account. Explicit purchase/restore persists;
      // account-scoped cloud projection restores other-device access.
      invalidatePremiumCache();
    }
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] init error:', e);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
