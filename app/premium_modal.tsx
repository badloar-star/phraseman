import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  refreshPaywallAbConfigInBackground,
  resolvePaywallAbVariant,
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

  useEffect(() => {
    let cancelled = false;
    refreshPaywallAbConfigInBackground();

    const run = async () => {
      if (firstParam(params.manage) === '1') {
        // Внутренний экран управления подпиской (раньше — прямой переход в стор).
        if (!cancelled) router.replace('/manage_subscription' as any);
        return;
      }

      if (await maybeFinishAlreadyPremiumPersonalPlan(params, router)) return;

      const resolved = await resolvePaywallAbVariant().catch(() => ({
        variant: 'C' as PaywallAbVariant,
        stableId: 'fallback',
      }));
      if (cancelled) return;
      router.replace({
        pathname: PAYWALL_ROUTES[resolved.variant],
        params: { ...params },
      } as any);
    };

    void run();
    return () => { cancelled = true; };
    // This route is a one-shot dispatcher; changing params means opening it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#34d399" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d11',
  },
});
