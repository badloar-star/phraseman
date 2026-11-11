// Open the contextual renewal paywall once a previously active subscription expires.
import React, { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { openPremiumPaywall } from '../app/paywall_navigation';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { actionToastTri, emitAppEvent, onAppEvent } from '../app/events';
import {
  getVerifiedPremiumAccessStatus,
  getVerifiedRealPremiumStatus,
  getVerifiedVipStatus,
  invalidatePremiumCache,
} from '../app/premium_guard';
import { useLang } from './LangContext';
import { useOverlayVisible } from './OverlayArbiter';
import { DebugLogger } from '../app/debug-logger';
import { getDevOverlaysSnapshot, subscribeDevOverlays } from '../app/dev_overlays_off';
import { readRealPremiumSnapshotForGeneration } from '../app/premium_real_storage';

import { noteSwallowedHandler, noteSwallowedAs } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type Kind = 'premium' | 'vip';

const WAS_ACTIVE_KEY: Record<Kind, string> = {
  premium: 'entitlement_was_active_premium',
  vip: 'entitlement_was_active_vip',
};
const LAST_SHOWN_KEY: Record<Kind, string> = {
  premium: 'entitlement_expired_shown_premium',
  vip: 'entitlement_expired_shown_vip',
};
/** Одна и та же деактивация не должна долбить карточкой каждый старт. */
const SHOW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function accountEntitlementStorageKey(baseKey: string, stableId: string): string {
  return `${baseKey}::${encodeURIComponent(stableId)}`;
}

function entitlementAccountIsCurrent(token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return token.phase === 'active'
    && !!token.stableId
    && isCurrentAccountGeneration(token, token.stableId);
}

function EntitlementExpiredHost() {
  const { lang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<{ kind: Kind; account: AccountGenerationToken } | null>(null);
  const opened = useRef<typeof pending>(null);
  const [accountGeneration, setAccountGeneration] = useState(captureAccountGeneration);
  // зачем (координатор 12.10, settings-gap-008: holder=entitlementExpired закрыл экран и шаг робота не нашёл строку): dev_state?overlays=off гасит и это окно — только dev, в памяти
  const devOverlaysSnapshot = useSyncExternalStore(subscribeDevOverlays, getDevOverlaysSnapshot, getDevOverlaysSnapshot);
  const devOverlaysOff = devOverlaysSnapshot.startsWith('1');
  const billingOpen = pathname === '/premium_modal' || pathname === '/manage_subscription' || pathname === '/promo_code_entry';
  const overlayVisible = useOverlayVisible('entitlementExpired', pending !== null && !devOverlaysOff && !billingOpen);

  const maybeShow = useCallback(async (k: Kind, expectedAccount: AccountGenerationToken) => {
    if (!entitlementAccountIsCurrent(expectedAccount)) return;
    const stableId = expectedAccount.stableId;
    const wasActiveKey = accountEntitlementStorageKey(WAS_ACTIVE_KEY[k], stableId);
    const lastShownKey = accountEntitlementStorageKey(LAST_SHOWN_KEY[k], stableId);
    try {
      invalidatePremiumCache();
      const hasAnyPlusAccess = await getVerifiedPremiumAccessStatus().catch(noteSwallowedAs('EntitlementExpiredHost:promise_1', null));
      if (!entitlementAccountIsCurrent(expectedAccount) || hasAnyPlusAccess == null) return;
      if (hasAnyPlusAccess) {
        // A source can deactivate while another source still keeps Plus active
        // (for example: promo VIP active, real premium inactive on startup).
        await AsyncStorage.removeItem(wasActiveKey).catch(noteSwallowedHandler('EntitlementExpiredHost:promise_2'));
        return;
      }
      const wasActive = await AsyncStorage.getItem(wasActiveKey);
      if (!entitlementAccountIsCurrent(expectedAccount)) return;
      if (wasActive !== '1') return;
      await AsyncStorage.removeItem(wasActiveKey);
      if (!entitlementAccountIsCurrent(expectedAccount)) return;
      const lastShownRaw = await AsyncStorage.getItem(lastShownKey);
      if (!entitlementAccountIsCurrent(expectedAccount)) return;
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
      if (Number.isFinite(lastShown) && Date.now() - lastShown < SHOW_COOLDOWN_MS) return;
      // prev ?? k: premium-карточка приоритетнее, второй кандидат не перетирает первого.
      setPending((prev) => prev ?? { kind: k, account: expectedAccount });
    } catch (e) {
      // Состояние недоступно — лучше промолчать, чем спамить ложной карточкой.
      DebugLogger.error('EntitlementExpiredHost:lastShown', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }, []);

  useEffect(() => {
    const acceptAccount = (next: AccountGenerationToken) => {
      // Any visible decision belongs to the previous account. Close it before
      // adopting the next generation, including direct active A → active B swaps.
      setPending(null);
      // зачем (аудит скорости R1_PERF_FIRST_FRAME, координатор 12.10): captureAccountGeneration() каждый раз отдаёт новый объект —
      // на монтировании это был лишний рендер хоста и повторный прогон проверки истечения. Новый объект — только при смене полей
      // (как app/(tabs)/home.tsx); смена аккаунта по-прежнему принимается.
      setAccountGeneration((prev) => (
        prev.generation === next.generation && prev.stableId === next.stableId && prev.phase === next.phase ? prev : next
      ));
    };
    acceptAccount(captureAccountGeneration());
    const subscription = subscribeAccountGeneration(acceptAccount);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const markWasActive = (k: Kind) => {
      const token = captureAccountGeneration();
      if (!entitlementAccountIsCurrent(token)) return;
      const key = accountEntitlementStorageKey(WAS_ACTIVE_KEY[k], token.stableId);
      void AsyncStorage.setItem(key, '1').catch(noteSwallowedHandler('EntitlementExpiredHost:promise_3'));
    };
    const checkDeactivated = (k: Kind) => {
      const token = captureAccountGeneration();
      if (!entitlementAccountIsCurrent(token)) return;
      void maybeShow(k, token);
    };
    const subs = [
      onAppEvent('premium_activated', () => {
        markWasActive('premium');
      }),
      onAppEvent('vip_activated', () => {
        markWasActive('vip');
      }),
      onAppEvent('premium_deactivated', () => {
        checkDeactivated('premium');
      }),
      onAppEvent('vip_deactivated', () => {
        checkDeactivated('vip');
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [maybeShow]);

  /**
   * Детекция ЕСТЕСТВЕННОГО истечения: premium_guard при RC-expiry пишет
   * premium_active=false БЕЗ события (premium_guard.ts:158), а события
   * *_deactivated стреляют только из QA-панели/снапшотов. Поэтому диффаем
   * по хранилищу на каждом старте: статус активен → поддерживаем флаг
   * «был активен»; статус неактивен при стоящем флаге → показываем карточку.
   */
  useEffect(() => {
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    let cancelled = false;
    const checkedAccount = accountGeneration;
    const stableId = accountGeneration.stableId;
    const isCurrent = () => !cancelled && entitlementAccountIsCurrent(checkedAccount);
    (async () => {
      try {
        const [isPrem, isVip] = await Promise.all([
          getVerifiedRealPremiumStatus(),
          getVerifiedVipStatus(),
        ]);
        if (!isCurrent()) return;
        if (isPrem) {
          await AsyncStorage.setItem(
            accountEntitlementStorageKey(WAS_ACTIVE_KEY.premium, stableId),
            '1',
          );
        } else {
          await maybeShow('premium', checkedAccount);
        }
        if (!isCurrent()) return;
        if (isVip) {
          await AsyncStorage.setItem(
            accountEntitlementStorageKey(WAS_ACTIVE_KEY.vip, stableId),
            '1',
          );
        } else if (!isPrem) {
          // VIP-карточку не дублируем поверх premium-кейса в одной сессии.
          await maybeShow('vip', checkedAccount);
        }
      } catch (e) {
      // Guard недоступен (ранний старт) — попробуем в следующей сессии.
      DebugLogger.error('EntitlementExpiredHost:isCurrent', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountGeneration, maybeShow]);

  /** #3 немое место: предупреждение «триал кончается через 2 ч» (только тост, без модалки). */
  useEffect(() => {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const WARN_SHOWN_KEY = 'entitlement_trial_ending_shown';
    (async () => {
      try {
        const token = captureAccountGeneration();
        const snapshot = await readRealPremiumSnapshotForGeneration(token)
          .catch(noteSwallowedAs('EntitlementExpiredHost:promise_4', null));
        if (!entitlementAccountIsCurrent(token)) return;
        const rcExpiry = snapshot?.active ? snapshot.rcExpiryMs : 0;
        if (!Number.isFinite(rcExpiry) || rcExpiry <= 0) return;
        const remaining = rcExpiry - Date.now();
        if (remaining <= 0 || remaining > TWO_HOURS_MS) return;
        const shownKey = accountEntitlementStorageKey(WARN_SHOWN_KEY, token.stableId);
        const alreadyShown = await AsyncStorage.getItem(shownKey).catch(noteSwallowedAs('EntitlementExpiredHost:promise_5', null));
        if (!entitlementAccountIsCurrent(token)) return;
        if (alreadyShown === '1') return;
        await AsyncStorage.setItem(shownKey, '1').catch(noteSwallowedHandler('EntitlementExpiredHost:promise_6'));
        if (!entitlementAccountIsCurrent(token)) return;
        // зачем (сторож непереведённых строк, 11.11): тост о конце пробного периода шёл по-русски всем, кроме испанского.
        const soon = remaining < 30 * 60 * 1000;
        emitAppEvent('action_toast', actionToastTri('info', soon ? {
          ru: 'Триал заканчивается менее чем через 30 мин ⏳', uk: 'Пробний період закінчується менш ніж за 30 хв ⏳',
          en: 'Your trial ends in less than 30 min ⏳', es: 'El trial termina en menos de 30 min ⏳',
          'pt-BR': 'Seu teste termina em menos de 30 min ⏳', vi: 'Bản dùng thử kết thúc sau chưa đầy 30 phút ⏳',
          id: 'Masa uji coba berakhir kurang dari 30 menit lagi ⏳', tr: 'Deneme süren 30 dakikadan kısa sürede bitiyor ⏳',
          pl: 'Okres próbny kończy się za mniej niż 30 min ⏳',
        } : {
          ru: 'Триал заканчивается менее чем через 2 ч ⏳', uk: 'Пробний період закінчується менш ніж за 2 год ⏳',
          en: 'Your trial ends in less than 2 h ⏳', es: 'El trial termina en menos de 2 h ⏳',
          'pt-BR': 'Seu teste termina em menos de 2 h ⏳', vi: 'Bản dùng thử kết thúc sau chưa đầy 2 giờ ⏳',
          id: 'Masa uji coba berakhir kurang dari 2 jam lagi ⏳', tr: 'Deneme süren 2 saatten kısa sürede bitiyor ⏳',
          pl: 'Okres próbny kończy się za mniej niż 2 godz. ⏳',
        }));
      } catch (e) {
      // ignore
      DebugLogger.error('EntitlementExpiredHost:msgRu', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    })();
  }, [lang]);

  useEffect(() => {
    if (!pending || !overlayVisible || billingOpen || devOverlaysOff || opened.current === pending) return;
    if (!entitlementAccountIsCurrent(pending.account)) {
      setPending(null);
      return;
    }

    opened.current = pending;
    const key = accountEntitlementStorageKey(LAST_SHOWN_KEY[pending.kind], pending.account.stableId);
    void AsyncStorage.setItem(key, String(Date.now())).catch(noteSwallowedHandler('EntitlementExpiredHost:promise_7'));
    setPending(null);
    openPremiumPaywall(router, {
      context: pending.kind === 'premium' ? 'premium_expired' : 'vip_expired',
      source: 'entitlement_expired',
    });
  }, [billingOpen, devOverlaysOff, overlayVisible, pending, router]);

  return null;
}

export default memo(EntitlementExpiredHost);
