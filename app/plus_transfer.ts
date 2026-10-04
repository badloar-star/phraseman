/*
 * Перенос Plus при смене аккаунта — тихое восстановление покупок (AA S2d 🔴1, §127, вариант B).
 *
 * зачем: см. plus_transfer_hold.ts. Здесь — сетевая часть: после ЛЮБОЙ смены
 * stable_id запускаем тихий Purchases.syncPurchasesForResult() (раунд 3; не во
 * время открытого потока покупки) (раунд 2, H-S2d-3: restorePurchases на iOS может спросить Apple ID — он
 * остаётся только за кнопкой «Восстановить покупки»; RevenueCat переносит покупку
 * стора этого устройства на текущий appUserID по настройке «Transfer», её
 * проверяет владелец вне кода), и повторяем на старте / возврате из фона, пока
 * ответ RevenueCat не сойдётся с локальным решением:
 *   - entitlement есть      → записать store-Plus текущему аккаунту, снять удержание;
 *   - entitlement ПОДТВЕРЖДЁННО нет → снять удержание (откат удержанного Plus);
 *   - сбой / нет связи / личность RC не та → удержание остаётся, повтор позже.
 * Частота ограничена: не чаще раза в RETRY_MIN_INTERVAL_MS и не больше
 * MAX_ATTEMPTS попыток, окно удержания — PLUS_TRANSFER_HOLD_TTL_MS.
 *
 * Покупки здесь НЕ создаются и НЕ отменяются — только восстановление существующих.
 * Логи [PLUS-TRANSFER]: appUserID только хешем (identityTag), имена entitlements,
 * причина и результат; без чеков и токенов.
 */
import { AppState, type AppStateStatus } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { IS_EXPO_GO } from './config';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { identityErrorCode, identityTag, identityTrace } from './identity_trace';
import { revenueCatCustomerInfoHasPremiumAccess } from './revenuecat_premium_access';
import { invalidatePremiumCache } from './premium_guard';
import { emitAppEvent } from './events';
import { onStableIdChanged, type StableIdChange } from './stable_id';
import { isPurchaseFlowActive } from './purchase_flow_activity';
import {
  beginPlusTransferHold,
  clearPlusTransferHold,
  readPlusTransferHold,
  writePlusTransferHold,
} from './plus_transfer_hold';

export const PLUS_TRANSFER_RETRY_MIN_INTERVAL_MS = 10 * 60 * 1000;
export const PLUS_TRANSFER_MAX_ATTEMPTS = 12;
const RESTORE_TIMEOUT_MS = 20_000;
/** Пауза после смены: даём logIn RevenueCat на новый appUserID завершиться. */
const AFTER_SWITCH_DELAY_MS = 3_000;

export type PlusTransferTrigger = 'after_switch' | 'startup' | 'foreground';
export type PlusTransferCheckResult =
  | 'no_hold'
  | 'not_installed'
  | 'no_account'
  | 'account_changed'
  | 'expired'
  | 'attempts_exhausted'
  | 'rate_limited'
  | 'retry'
  | 'confirmed'
  | 'absent'
  | 'deferred_purchase_flow';

export type PlusTransferDeps = Readonly<{
  /** Привести appUserID RevenueCat к текущему аккаунту (logIn). true — совпал. */
  syncIdentity: () => Promise<boolean>;
  /** Записать подтверждённый store-Plus текущему аккаунту (под замком перехода). */
  persistConfirmedPremium: (info: CustomerInfo, isCurrent: () => boolean) => Promise<void>;
}>;

let deps: PlusTransferDeps | null = null;
let checkInFlight: Promise<PlusTransferCheckResult> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let lastAppState: AppStateStatus | null = null;
let afterSwitchTimer: ReturnType<typeof setTimeout> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timeout_${label}_${ms}ms`)), ms);
    }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

function activeEntitlementNames(info: CustomerInfo | null): string {
  const active = info?.entitlements?.active;
  if (!active || typeof active !== 'object') return '';
  return Object.keys(active).sort().join(',').slice(0, 80);
}

/** Слушатель смены stable_id: любой переход аккаунта → удержание + проверка. */
function handleStableIdChange(change: StableIdChange): void {
  beginPlusTransferHold(change.previous, change.next, change.kind === 'cleared' ? 'stable_id_cleared' : 'stable_id_set');
  if (!deps) {
    // Раннер ещё не установлен (RevenueCat не сконфигурирован) — удержание на
    // диске, проверка пройдёт на старте после установки.
    identityTrace('[PLUS-TRANSFER]', 'check deferred', { reason: 'not_installed' });
    return;
  }
  if (afterSwitchTimer) clearTimeout(afterSwitchTimer);
  afterSwitchTimer = setTimeout(() => {
    afterSwitchTimer = null;
    void runPlusTransferCheck('after_switch');
  }, AFTER_SWITCH_DELAY_MS);
  (afterSwitchTimer as { unref?: () => void })?.unref?.();
}

onStableIdChanged(handleStableIdChange);

/**
 * Ставится из revenuecat_init после configure: передаёт RC-зависимости без
 * циклического импорта, вешает повтор на возврат из фона и делает проверку старта.
 */
export function installPlusTransferRunner(nextDeps: PlusTransferDeps): void {
  deps = nextDeps;
  if (!appStateSubscription) {
    try {
      lastAppState = AppState?.currentState ?? null;
      appStateSubscription = AppState.addEventListener('change', (state) => {
        const wasBackground = lastAppState !== null && lastAppState !== 'active';
        lastAppState = state;
        if (state === 'active' && wasBackground) void runPlusTransferCheck('foreground');
      });
    } catch (error) {
      identityTrace('[PLUS-TRANSFER]', 'appstate subscribe_failed', { code: identityErrorCode(error) });
    }
  }
  void runPlusTransferCheck('startup');
}

export function runPlusTransferCheck(trigger: PlusTransferTrigger): Promise<PlusTransferCheckResult> {
  if (checkInFlight) return checkInFlight;
  const run = runPlusTransferCheckOnce(trigger)
    .catch((error: unknown): PlusTransferCheckResult => {
      identityTrace('[PLUS-TRANSFER]', 'check crashed', { trigger, code: identityErrorCode(error) }, { persist: true });
      return 'retry';
    })
    .finally(() => { if (checkInFlight === run) checkInFlight = null; });
  checkInFlight = run;
  return run;
}

async function runPlusTransferCheckOnce(trigger: PlusTransferTrigger): Promise<PlusTransferCheckResult> {
  const hold = await readPlusTransferHold();
  if (!hold) return 'no_hold';
  const activeDeps = deps;
  if (!activeDeps || IS_EXPO_GO) {
    identityTrace('[PLUS-TRANSFER]', 'check skipped', { trigger, reason: 'not_installed' });
    return 'not_installed';
  }
  const generation = captureAccountGeneration();
  const current = generation.stableId;
  if (!current || generation.phase !== 'active') {
    identityTrace('[PLUS-TRANSFER]', 'check skipped', { trigger, reason: 'no_active_account', phase: generation.phase });
    return 'no_account';
  }
  const isCurrent = () => isCurrentAccountGeneration(generation, current);
  if (hold.target !== null && hold.target !== current) {
    await clearPlusTransferHold('account_changed');
    invalidatePremiumCache();
    return 'account_changed';
  }
  const now = Date.now();
  if (now >= hold.until) {
    await clearPlusTransferHold('expired');
    invalidatePremiumCache();
    if (hold.heldPlus) emitAppEvent('premium_deactivated');
    return 'expired';
  }
  if (hold.attempts >= PLUS_TRANSFER_MAX_ATTEMPTS) {
    await clearPlusTransferHold('attempts_exhausted');
    invalidatePremiumCache();
    if (hold.heldPlus) emitAppEvent('premium_deactivated');
    return 'attempts_exhausted';
  }
  if (trigger !== 'after_switch' && hold.lastAttemptAt > 0 && now - hold.lastAttemptAt < PLUS_TRANSFER_RETRY_MIN_INTERVAL_MS) {
    identityTrace('[PLUS-TRANSFER]', 'check rate_limited', {
      trigger,
      sinceLastMs: now - hold.lastAttemptAt,
      attempts: hold.attempts,
    });
    return 'rate_limited';
  }
  if (isPurchaseFlowActive()) {
    // зачем (AA S2d раунд 3, §135): открыт поток покупки (paywall / «Управление
    // подпиской») — синхронизация покупок спорила бы с ним. Откладываем до
    // следующего повода (старт, возврат из фона): попытка не тратится, Plus держится.
    identityTrace('[PLUS-TRANSFER]', 'check deferred', { trigger, reason: 'purchase_flow_active', attempts: hold.attempts });
    return 'deferred_purchase_flow';
  }
  const attempt = hold.attempts + 1;
  await writePlusTransferHold({ ...hold, target: current, attempts: attempt, lastAttemptAt: now });
  const appUserTag = identityTag(current);
  identityTrace('[PLUS-TRANSFER]', 'restore start', {
    trigger,
    attempt,
    appUserID: appUserTag,
    reason: hold.reason,
    heldPlus: hold.heldPlus,
  });

  const identityOk = await activeDeps.syncIdentity().catch((error: unknown) => {
    identityTrace('[PLUS-TRANSFER]', 'identity sync_failed', { code: identityErrorCode(error) });
    return false;
  });
  if (!identityOk || !isCurrent()) {
    identityTrace('[PLUS-TRANSFER]', 'restore result', { result: 'retry', reason: identityOk ? 'stale_account' : 'identity_not_synced', attempt });
    return 'retry';
  }

  let info: CustomerInfo;
  try {
    const before = await Purchases.getAppUserID();
    if (before !== current || !isCurrent()) {
      identityTrace('[PLUS-TRANSFER]', 'restore result', { result: 'retry', reason: 'app_user_mismatch_before', attempt, rcUser: identityTag(before) });
      return 'retry';
    }
    // зачем (AA S2d раунд 2, H-S2d-3): на автоматическом пути — syncPurchases, а не
    // restorePurchases. На iOS (StoreKit 2) restorePurchases вызывает AppStore.sync()
    // и может показать системный запрос Apple ID — фоновая проверка обязана быть
    // тихой. restorePurchases остаётся только за кнопкой «Восстановить покупки».
    // Перенос на текущий appUserID делает та же настройка Transfer RevenueCat.
    info = await withTimeout(
      // Раунд 3 (§135): syncPurchasesForResult вместо устаревшего syncPurchases +
      // getCustomerInfo — «подтверждённое отсутствие» решается по ответу самой
      // синхронизации, а не по отдельному (возможно кэшированному) чтению.
      Purchases.syncPurchasesForResult().then((synced) => synced.customerInfo),
      RESTORE_TIMEOUT_MS,
      'sync_purchases',
    );
    const after = await Purchases.getAppUserID();
    if (after !== current || !isCurrent()) {
      identityTrace('[PLUS-TRANSFER]', 'restore result', { result: 'retry', reason: 'app_user_mismatch_after', attempt, rcUser: identityTag(after) });
      return 'retry';
    }
  } catch (error) {
    identityTrace('[PLUS-TRANSFER]', 'restore result', {
      result: 'retry',
      reason: 'restore_failed',
      code: identityErrorCode(error),
      attempt,
      appUserID: appUserTag,
    }, { persist: true });
    return 'retry';
  }

  const entitlements = activeEntitlementNames(info);
  if (revenueCatCustomerInfoHasPremiumAccess(info)) {
    try {
      await activeDeps.persistConfirmedPremium(info, isCurrent);
    } catch (error) {
      identityTrace('[PLUS-TRANSFER]', 'restore result', {
        result: 'retry',
        reason: 'persist_failed',
        code: identityErrorCode(error),
        attempt,
        entitlements,
      }, { persist: true });
      return 'retry';
    }
    if (!isCurrent()) return 'retry';
    await clearPlusTransferHold('entitlement_confirmed');
    invalidatePremiumCache();
    identityTrace('[PLUS-TRANSFER]', 'restore result', {
      result: 'confirmed',
      attempt,
      appUserID: appUserTag,
      entitlements,
      heldPlus: hold.heldPlus,
    }, { persist: true });
    return 'confirmed';
  }

  // Подтверждённое отсутствие: RevenueCat ответил для ЭТОГО appUserID, Plus нет.
  // Только здесь удержанный Plus откатывается.
  if (!isCurrent()) return 'retry';
  await clearPlusTransferHold('entitlement_absent');
  invalidatePremiumCache();
  if (hold.heldPlus) emitAppEvent('premium_deactivated');
  identityTrace('[PLUS-TRANSFER]', 'restore result', {
    result: 'absent',
    attempt,
    appUserID: appUserTag,
    entitlements,
    heldPlus: hold.heldPlus,
  }, { persist: hold.heldPlus });
  return 'absent';
}

export function __resetPlusTransferRunnerForTests(): void {
  deps = null;
  checkInFlight = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  lastAppState = null;
  if (afterSwitchTimer) clearTimeout(afterSwitchTimer);
  afterSwitchTimer = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
