import React, { useEffect, useRef, useState } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { LinearGradient } from '../components/SafeLinearGradient';
import {
  openPremiumPaywall,
  resolveCurrentPaywallRoute,
} from './paywall_navigation';
import { PaywallAView as PaywallA } from './paywall_a';
import { PaywallBView as PaywallB } from './paywall_b';
import { PaywallCView as PaywallC } from './paywall_c';
import { PaywallDView as PaywallD } from './paywall_d';
import { PaywallEView as PaywallE } from './paywall_e';
import { PaywallFView as PaywallF } from './paywall_f';
import { PaywallGView as PaywallG } from './paywall_g';
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

function renderPaywallRoute(
  route: ReturnType<typeof resolveCurrentPaywallRoute>,
  entry: Extract<ReturnType<typeof resolvePremiumModalEntry>, { decision: 'show' }>['entry'],
) {
  if (route === '/paywall_a') return <PaywallA entry={entry} />;
  if (route === '/paywall_b') return <PaywallB entry={entry} />;
  if (route === '/paywall_d') return <PaywallD entry={entry} />;
  if (route === '/paywall_e') return <PaywallE entry={entry} />;
  if (route === '/paywall_f') return <PaywallF entry={entry} />;
  if (route === '/paywall_g') return <PaywallG entry={entry} />;
  return <PaywallC entry={entry} />;
}

export default function PremiumModalDispatcher() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const paywallRouteRef = useRef<ReturnType<typeof resolveCurrentPaywallRoute> | null>(null);
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [paywallImpressionId] = useState(() => Crypto.randomUUID());

  // Готов ли корневой навигатор. При холодном старте прямо на /premium_modal (deep-link,
  // первый экран) Root Layout ещё НЕ смонтирован — навигация в этот момент бросает
  // «Attempted to navigate before mounting the Root Layout». Ждём, пока появится key.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);
  const dispatchedRef = useRef(false);

  // Replace на целевой пейвол — РОВНО ОДИН раз и только после монтирования рут-навигатора.
  // Вариант решается синхронно из кэша; A/B-конфиг обновляется в фоне.
  // Replace is scheduled after interactions; the root-state key can appear before
  // Expo Router accepts navigation on cold deep links.
  //
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
      if (paywallRouteRef.current === null) {
        paywallRouteRef.current = resolveCurrentPaywallRoute();
      }
      return renderPaywallRoute(paywallRouteRef.current, entryResolution.entry);
    }
  }

  return (
    <LinearGradient
      colors={['#111827', '#18233D', '#101827']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
  },
});
