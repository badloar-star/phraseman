import React, { useEffect, useRef, useState } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { openPremiumPaywall } from './paywall_navigation';
// зачем (владелец 2026-09-30, D78): пейволы A–G и их A/B-распределение удалены.
// Любой вход вне онбординга ведёт сюда и показывает ЕДИНСТВЕННЫЙ пейвол Plus.
import PaywallPlusScreen from '../components/paywall/PaywallPlusScreen';
import { usePremium } from '../components/PremiumContext';
import { dismissPaywallModal } from './navigation_back';
import { resolvePremiumModalEntry } from './paywall_entry_contract';

type RouteParams = Record<string, string | string[]>;

type ScheduledNavigation = {
  cancel: () => void;
};

function firstParam(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
}

function scheduleAfterRootNavigationReady(navigate: () => void): ScheduledNavigation {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const task = InteractionManager.runAfterInteractions(() => {
    timer = setTimeout(() => {
      if (!cancelled) navigate();
    }, 0);
  });

  return {
    cancel: () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      task.cancel?.();
    },
  };
}

/** Replace на целевой экран управления подпиской. */
function replaceToPaywall(params: RouteParams, router: ReturnType<typeof useRouter>): void {
  openPremiumPaywall(router, params, 'replace');
}

export default function PremiumModalDispatcher() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams<RouteParams>();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [paywallImpressionId] = useState(() => Crypto.randomUUID());

  // Готов ли корневой навигатор. При холодном старте прямо на /premium_modal (deep-link,
  // первый экран) Root Layout ещё НЕ смонтирован — навигация в этот момент бросает
  // «Attempted to navigate before mounting the Root Layout». Ждём, пока появится key.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);
  const dispatchedRef = useRef(false);

  // Manage-режим: replace на экран управления подпиской — РОВНО ОДИН раз и только
  // после монтирования рут-навигатора (на холодном deep-link key появляется раньше,
  // чем Expo Router принимает навигацию).
  const isManageContext = firstParam(params.manage) === '1';
  const entryResolution = isManageContext
    ? null
    : resolvePremiumModalEntry({
        params,
        accessResolved,
        hasPremiumAccess,
        impressionId: paywallImpressionId,
      });

  useEffect(() => {
    if (!rootNavReady || dispatchedRef.current) return;
    if (!isManageContext) return;
    dispatchedRef.current = true;
    const scheduled = scheduleAfterRootNavigationReady(() => {
      replaceToPaywall(params, router);
    });
    return () => scheduled.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNavReady]);

  const entitlementDismissedRef = useRef(false);
  useEffect(() => {
    if (!rootNavReady || isManageContext || entryResolution?.decision !== 'dismiss') return;
    if (entitlementDismissedRef.current) return;
    entitlementDismissedRef.current = true;
    const scheduled = scheduleAfterRootNavigationReady(() => {
      dismissPaywallModal(router);
    });
    return () => scheduled.cancel();
  }, [entryResolution?.decision, isManageContext, rootNavReady, router]);

  // Manage-режим (manage=1) оставляем на подложке: он ведёт не на пейвол, а на
  // /manage_subscription, и рисовать там пейвол было бы обманом кадра.
  if (!isManageContext) {
    // Entitlement is the live source of truth. While hydration is unresolved,
    // or when Plus is already active, keep the neutral backing instead of
    // flashing an acquisition screen to a paid user.
    if (entryResolution?.decision === 'show') {
      return <PaywallPlusScreen entry={entryResolution.entry} />;
    }
  }

  return (
    <LinearGradient
      colors={[theme.bgPrimary, theme.bgSurface, theme.bgPrimary]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.root, { backgroundColor: theme.bgPrimary }]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
