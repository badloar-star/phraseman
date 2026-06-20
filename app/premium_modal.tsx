import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';

import {
  refreshPaywallAbConfigInBackground,
  resolvePaywallAbVariantSync,
  type PaywallAbVariant,
} from './paywall_variant';
import { safeRouterBack } from './navigation_back';
import { getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from './personal_plan_activation';
import { emitAppEvent } from './events';

type RouteParams = Record<string, string | string[]>;

const PAYWALL_ROUTES: Record<PaywallAbVariant, '/paywall_a' | '/paywall_b' | '/paywall_c'> = {
  A: '/paywall_a',
  B: '/paywall_b',
  C: '/paywall_c',
};

const ACCESS_CHECK_TIMEOUT_MS = 700;

function firstParam(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
}

function withFallback<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function finishPersonalPlanActivation(router: ReturnType<typeof useRouter>): Promise<void> {
  await activatePendingPersonalPlanAfterPremium();
  invalidatePremiumCache();
  emitAppEvent('premium_activated');

  const pendingNickname = await AsyncStorage
    .getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY)
    .catch(() => null);
  if (pendingNickname === '1') {
    await AsyncStorage.multiSet([
      ['onboarding_step', 'name'],
      [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
    ]).catch(() => {});
    await AsyncStorage.removeItem('onboarding_done').catch(() => {});
    emitAppEvent('personal_plan_onboarding_nickname_ready');
    router.replace('/(tabs)/home' as any);
    return;
  }

  router.replace('/personal_plan_thank_you' as any);
}

async function maybeFinishAlreadyPremiumPersonalPlan(
  params: RouteParams,
  router: ReturnType<typeof useRouter>,
): Promise<boolean> {
  if (firstParam(params.context) !== 'personal_plan') return false;
  const hasAccess = await withFallback(
    getVerifiedPremiumAccessStatus().catch(() => false),
    false,
    ACCESS_CHECK_TIMEOUT_MS,
  );
  if (!hasAccess) return false;
  await finishPersonalPlanActivation(router);
  return true;
}

export default function PremiumModalDispatcher() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();

  // Готов ли корневой навигатор. При холодном старте прямо на /premium_modal (deep-link,
  // первый экран) Root Layout ещё НЕ смонтирован — навигация в этот момент бросает
  // «Attempted to navigate before mounting the Root Layout». Ждём, пока появится key.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);
  const dispatchedRef = useRef(false);

  // Replace на целевой пейвол — РОВНО ОДИН раз и только после монтирования рут-навигатора.
  // Вариант решается синхронно из кэша; A/B-конфиг обновляется в фоне. Подложка прозрачная,
  // поэтому лишний кадр до replace не виден.
  useEffect(() => {
    if (!rootNavReady || dispatchedRef.current) return;
    dispatchedRef.current = true;
    if (firstParam(params.manage) === '1') {
      router.replace('/manage_subscription' as any);
      return;
    }
    refreshPaywallAbConfigInBackground();
    const { variant } = resolvePaywallAbVariantSync();
    router.replace({
      pathname: PAYWALL_ROUTES[variant],
      params: { ...params },
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNavReady]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (firstParam(params.manage) === '1') return;
      // Редкая ветка: для контекста personal_plan, если юзер УЖЕ премиум, доводим активацию
      // плана и уходим с пейвола. Не блокирует показ — пейвол уже открылся выше.
      if (cancelled) return;
      await maybeFinishAlreadyPremiumPersonalPlan(params, router);
    };
    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Прозрачная подложка на один кадр до replace — без тёмного экрана и спиннера.
  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
