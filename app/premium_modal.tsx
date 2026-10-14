import React, { Profiler, useEffect, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { openPremiumPaywall } from './paywall_navigation';
// зачем (владелец 2026-09-30, D78): пейволы A–G и их A/B-распределение удалены.
// Любой вход вне онбординга ведёт сюда и показывает ЕДИНСТВЕННЫЙ пейвол Plus.
import PaywallPlusScreen from '../components/paywall/PaywallPlusScreen';
import { usePremium } from '../components/PremiumContext';
import { dismissPaywallModal } from './navigation_back';
import { paywallEntryAccessInputs, resolvePremiumModalEntry, type CachedPaywallEntitlement } from './paywall_entry_contract';
import { PAYWALL_ENTRY_WAIT_CEILING_MS } from './load_gate_config';
import { getAppSnapshot } from './app_snapshot_store';
import { createTapLatencyProfilerHandler } from './tap_latency_trace';

// зачем (координатор 14.10, [PAYWALL-CLOSE-JS]; TAP-LAT Сверки: закрытие пейвола из Настроек — корневой «stack» рендерится 2× по 1,1–1,7 с,
// а панели вкладок дешёвые): отдельный замер экрана пейвола в том же [TAP-LAT]. Без флага EXPO_PUBLIC_TAP_LATENCY_TRACE=1 обработчика нет.
const paywallScreenProfilerOnRender = createTapLatencyProfilerHandler();

/** §141: последний известный доступ из снимка профиля (тот же источник, что засевает PremiumContext). */
function cachedEntitlementFromSnapshot(): CachedPaywallEntitlement {
  const profile = getAppSnapshot().profile;
  if (!profile) return 'unknown';
  return profile.premiumActive === true || profile.vipActive === true ? 'premium' : 'free';
}

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
  const params = useLocalSearchParams<RouteParams>();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [paywallImpressionId] = useState(() => Crypto.randomUUID());
  // Снимок читается один раз на открытие окна: решение «показать сразу» не должно прыгать между кадрами.
  const [cachedEntitlement] = useState(cachedEntitlementFromSnapshot);
  const cachedShowLoggedRef = useRef(false);
  // зачем (PM-214, D158): без кэша профиля окно ждало резолва доступа без потолка — без сети пустой экран
  // висел вечно. После PAYWALL_ENTRY_WAIT_CEILING_MS решаем по кэшу (paywallEntryAccessInputs).
  const [waitCeilingPassed, setWaitCeilingPassed] = useState(false);
  useEffect(() => {
    if (accessResolved || waitCeilingPassed) return;
    const timer = setTimeout(() => {
      console.log('[PAYWALL] потолок ожидания доступа', JSON.stringify({ cached: cachedEntitlement, ceilingMs: PAYWALL_ENTRY_WAIT_CEILING_MS })); // guard-ok: один раз на открытие окна
      setWaitCeilingPassed(true);
    }, PAYWALL_ENTRY_WAIT_CEILING_MS);
    return () => clearTimeout(timer);
  }, [accessResolved, cachedEntitlement, waitCeilingPassed]);
  const accessInputs = paywallEntryAccessInputs({ accessResolved, hasPremiumAccess, cachedEntitlement, waitCeilingPassed });

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
        accessResolved: accessInputs.accessResolved,
        hasPremiumAccess: accessInputs.hasPremiumAccess,
        impressionId: paywallImpressionId,
        cachedEntitlement,
      });
  // зачем (владелец 11.10: «пейвол почему-то не открывается»): решение окна со ВСЕМИ значениями, которые его приняли.
  // Раньше «dismiss по Plus» был немым — у человека с доступом окно закрывалось само, и в журнале не было ни строки.
  // Пишем один раз на смену решения, не на каждый кадр.
  const decision = isManageContext ? 'manage' : (entryResolution?.decision ?? 'none');
  const loggedDecisionRef = useRef<string | null>(null);
  useEffect(() => {
    if (loggedDecisionRef.current === decision) return;
    loggedDecisionRef.current = decision;
    const reason = decision === 'dismiss'
      ? (accessInputs.hasPremiumAccess ? 'plus_access' : 'unknown_context_or_source')
      : decision === 'wait' ? 'access_unresolved' : decision;
    const log = decision === 'dismiss' ? console.warn : console.log;
    log('[PAYWALL-OPEN] решение окна', JSON.stringify({ // guard-ok: одна строка на смену решения
      decision,
      reason,
      context: firstParam(params.context) || null,
      source: firstParam(params.source) || null,
      shownContext: entryResolution?.decision === 'show' ? entryResolution.entry.context : null,
      accessResolved,
      hasPremiumAccess,
      cachedEntitlement,
      waitCeilingPassed,
      accessFrom: accessInputs.source,
      rootNavReady,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision]);

  if (!accessResolved && entryResolution?.decision === 'show' && !cachedShowLoggedRef.current) {
    cachedShowLoggedRef.current = true;
    // Лёгкий console.log: debug-logger тянет config/Platform в транзитный экран без нужды.
    console.log('[PAYWALL] окно показано сразу по кэшу доступа', JSON.stringify({ cached: cachedEntitlement })); // guard-ok: один раз на открытие окна
  }

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

  // зачем (координатор 14.10, 🔴 «закрыл предложение — всё зависло»): жив ли прозрачный маршрут пейвола после закрытия.
  useEffect(() => {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} route mount context=${firstParam(params.context) || 'none'} source=${firstParam(params.source) || 'none'}`); // guard-ok: временная трассировка
    return () => console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} route UNMOUNT context=${firstParam(params.context) || 'none'}`); // guard-ok: временная трассировка
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: только момент монтирования/размонтирования маршрута
  }, []);

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
      const screen = <PaywallPlusScreen entry={entryResolution.entry} />;
      return paywallScreenProfilerOnRender
        ? <Profiler id="screen:premium_modal" onRender={paywallScreenProfilerOnRender}>{screen}</Profiler>
        : screen;
    }
  }

  // зачем (владелец 11.10, «Шторка»): маршрут прозрачный — пока решается доступ, под ним виден прежний экран, а не сплошной фон.
  return <View pointerEvents="none" style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
