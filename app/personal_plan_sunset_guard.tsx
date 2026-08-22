import React, { type ComponentType, useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

import { useFeatureAccess, usePremium } from '../components/PremiumContext';
import { shouldGateFeature } from './feature_gates';
import { markNextNavigationAsReplace } from './navigation_back';
import { getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';
import { readAnyPersonalPlanState } from './personal_plan_state';
import {
  PERSONAL_PLAN_SUNSET_AT_MS,
  PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE,
  hasPersonalPlanRouteMarker,
  resolvePersonalPlanPremiumProbe,
  resolvePersonalPlanSunsetAccess,
} from './personal_plan_sunset';
import { readPersonalPlanSunsetEffectiveNow } from './personal_plan_sunset_clock';

export type PersonalPlanSunsetGuardMode = 'premium-required' | 'grandfathered-only';

type PersonalPlanSunsetGuardState = 'checking' | 'allowed' | 'redirecting';

function usePersonalPlanSunsetGuard(
  mode: PersonalPlanSunsetGuardMode,
): PersonalPlanSunsetGuardState {
  const router = useRouter();
  const originalFeatureAccess = useFeatureAccess('personal_plan');
  const { accessResolved } = usePremium();
  const featureRequiresPremium = shouldGateFeature('personal_plan', false);
  const [guardState, setGuardState] = useState<PersonalPlanSunsetGuardState>('checking');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let deadlineTimer: ReturnType<typeof setTimeout> | null = null;

      const redirectToFallback = (): void => {
        if (!alive) return;
        setGuardState('redirecting');
        markNextNavigationAsReplace();
        router.replace(PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE as never);
      };

      const check = async (): Promise<void> => {
        try {
          const savedState = await readAnyPersonalPlanState();
          const effectiveNowMs = await readPersonalPlanSunsetEffectiveNow();
          if (!alive) return;
          const eligibility = resolvePersonalPlanSunsetAccess({
            hasOriginalFeatureAccess: true,
            savedState,
            nowMs: effectiveNowMs,
          });
          if (eligibility.status === 'not_grandfathered' || eligibility.status === 'expired') {
            redirectToFallback();
            return;
          }

          const premiumProbe = resolvePersonalPlanPremiumProbe({
            mode,
            accessResolved,
            featureRequiresPremium,
            featureAccess: originalFeatureAccess,
          });
          let verifiedAccess = premiumProbe === 'allowed';
          if (!verifiedAccess) {
            invalidatePremiumCache();
            verifiedAccess = await getVerifiedPremiumAccessStatus().catch(() => false);
          }
          const decisionNowMs = await readPersonalPlanSunsetEffectiveNow();
          if (!alive) return;
          const finalEligibility = resolvePersonalPlanSunsetAccess({
            hasOriginalFeatureAccess: true,
            savedState,
            nowMs: decisionNowMs,
          });
          if (finalEligibility.status === 'not_grandfathered' || finalEligibility.status === 'expired') {
            redirectToFallback();
            return;
          }
          if (!verifiedAccess) {
            setGuardState('redirecting');
            markNextNavigationAsReplace();
            router.replace({
              pathname: '/premium_modal',
              params: { context: 'personal_plan' },
            } as never);
            return;
          }
          setGuardState('allowed');

          const remainingMs = PERSONAL_PLAN_SUNSET_AT_MS - decisionNowMs;
          if (remainingMs > 0) {
            deadlineTimer = setTimeout(() => {
              void check();
            }, Math.min(remainingMs, 60_000));
          }
        } catch {
          redirectToFallback();
        }
      };

      setGuardState('checking');
      void check();
      return () => {
        alive = false;
        if (deadlineTimer !== null) clearTimeout(deadlineTimer);
      };
    }, [accessResolved, featureRequiresPremium, mode, originalFeatureAccess, router]),
  );

  return guardState;
}

type SharedRouteParams = Record<string, string | string[]>;

// зачем (аудит 2026-08-22, владелец: «пустых экранов быть не должно»): guard
// возвращал null на время проверки доступа (при промахе 5-минутного кэша —
// сетевой), и все обёрнутые экраны плана мигали пустым кадром при каждом
// возврате. Скелетон повторяет общую геометрию экранов плана (шапка + карточка
// + кнопка) — первый кадр держит финальную геометрию, как требует Performance
// Bible. Он же рендерится и в состоянии 'redirecting', чтобы не было пустого
// кадра между решением и router.replace.
function PersonalPlanGuardSkeleton(): React.JSX.Element {
  const insets = useStableSafeAreaInsets();
  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top + 24, paddingHorizontal: 24, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <SkeletonBlock width={64} height={64} borderRadius={32} />
          <SkeletonBlock width="62%" height={20} borderRadius={10} />
          <SkeletonBlock width="44%" height={14} borderRadius={7} />
        </View>
        <SkeletonBlock width="100%" height={92} borderRadius={18} />
        <SkeletonBlock width="100%" height={54} borderRadius={16} />
      </View>
    </ScreenGradient>
  );
}

export function withOptionalPersonalPlanSunsetGuard<Props extends object>(
  Screen: ComponentType<Props>,
  markerNames: readonly string[],
): ComponentType<Props> {
  function GuardedSharedPersonalPlanRoute(props: Props): React.JSX.Element | null {
    const guardState = usePersonalPlanSunsetGuard('premium-required');
    if (guardState !== 'allowed') return <PersonalPlanGuardSkeleton />;
    return <Screen {...props} />;
  }

  function OptionallyGuardedPersonalPlanRoute(props: Props): React.JSX.Element | null {
    const params = useLocalSearchParams<SharedRouteParams>();
    const isPersonalPlanRoute = hasPersonalPlanRouteMarker(params, markerNames);
    if (!isPersonalPlanRoute) return <Screen {...props} />;
    return <GuardedSharedPersonalPlanRoute {...props} />;
  }

  OptionallyGuardedPersonalPlanRoute.displayName =
    `OptionalPersonalPlanSunsetGuard(${Screen.displayName ?? Screen.name ?? 'Route'})`;
  return OptionallyGuardedPersonalPlanRoute;
}

export function withPersonalPlanSunsetGuard<Props extends object>(
  Screen: ComponentType<Props>,
  mode: PersonalPlanSunsetGuardMode = 'premium-required',
): ComponentType<Props> {
  function GuardedPersonalPlanRoute(props: Props): React.JSX.Element | null {
    const guardState = usePersonalPlanSunsetGuard(mode);
    if (guardState !== 'allowed') return <PersonalPlanGuardSkeleton />;
    return <Screen {...props} />;
  }

  GuardedPersonalPlanRoute.displayName = `PersonalPlanSunsetGuard(${Screen.displayName ?? Screen.name ?? 'Route'})`;
  return GuardedPersonalPlanRoute;
}
