import React, { useEffect, useRef } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';

import { LinearGradient } from '../components/SafeLinearGradient';
import {
  openPremiumPaywall,
  resolveCurrentPaywallRoute,
} from './paywall_navigation';
import PaywallA from './paywall_a';
import PaywallB from './paywall_b';
import PaywallC from './paywall_c';
import PaywallD from './paywall_d';
import PaywallE from './paywall_e';
import PaywallF from './paywall_f';
import PaywallG from './paywall_g';

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

function renderPaywallRoute(route: ReturnType<typeof resolveCurrentPaywallRoute>) {
  if (route === '/paywall_a') return <PaywallA />;
  if (route === '/paywall_b') return <PaywallB />;
  if (route === '/paywall_d') return <PaywallD />;
  if (route === '/paywall_e') return <PaywallE />;
  if (route === '/paywall_f') return <PaywallF />;
  if (route === '/paywall_g') return <PaywallG />;
  return <PaywallC />;
}

export default function PremiumModalDispatcher() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const paywallRouteRef = useRef<ReturnType<typeof resolveCurrentPaywallRoute> | null>(null);

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

  // Manage-режим (manage=1) оставляем на подложке: он ведёт не на пейвол, а на
  // /manage_subscription, и рисовать там пейвол было бы обманом кадра.
  if (!isManageContext) {
    if (paywallRouteRef.current === null) {
      paywallRouteRef.current = resolveCurrentPaywallRoute();
    }
    return renderPaywallRoute(paywallRouteRef.current);
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
