import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../../app/account_generation';
import {
  createDefaultDailyJourneyProductionHostController,
  millisecondsUntilNextLocalDay,
} from '../../app/daily_journey_production_host';
import type { DailyJourneyGiftOccurrenceV1 } from '../../app/daily_journey_gift_inbox';
import { DebugLogger } from '../../app/debug-logger';
import { onAppEvent } from '../../app/events';
import { useOverlayVisible } from '../OverlayArbiter';
import DailyJourneyRewardPreviewModal from '../dev/DailyJourneyRewardPreviewModal';

type Delivery = Readonly<{
  occurrence: DailyJourneyGiftOccurrenceV1;
  token: AccountGenerationToken;
  run: number;
}>;

/** App-scoped owner of production eligibility and reveal presentation. */
export default function DailyJourneyProductionModalHost() {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [localDayWake, setLocalDayWake] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const deliveryRef = useRef<Delivery | null>(null);
  const presentationEpochRef = useRef(0);
  const runRef = useRef(0);
  const mountedRef = useRef(true);
  const visible = useOverlayVisible('dailyJourney', appActive && delivery != null);

  const productionHost = useMemo(() => createDefaultDailyJourneyProductionHostController(
    (scope, error) => DebugLogger.error(
      `daily_journey:production_host:${scope}`,
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    ),
  ), []);

  const clearDelivery = useCallback((release: boolean) => {
    presentationEpochRef.current += 1;
    const current = deliveryRef.current;
    deliveryRef.current = null;
    setDelivery(null);
    if (release && current) productionHost.releasePresentation(current.occurrence.operationId);
  }, [productionHost]);

  const runPresentation = useCallback(() => {
    if (!mountedRef.current || deliveryRef.current || AppState.currentState !== 'active') return;
    const presentationEpoch = presentationEpochRef.current;
    const token = captureAccountGeneration();
    if (token.phase !== 'active' || !token.stableId || !isCurrentAccountGeneration(token, token.stableId)) return;
    void productionHost.run().then((result) => {
      if (!mountedRef.current
        || presentationEpoch !== presentationEpochRef.current
        || result.status !== 'ready'
        || deliveryRef.current) {
        if (result.status === 'ready') productionHost.releasePresentation(result.occurrence.operationId);
        return;
      }
      const resultStableId = result.token.stableId;
      if (!resultStableId || !isCurrentAccountGeneration(result.token, resultStableId)) {
        productionHost.releasePresentation(result.occurrence.operationId);
        return;
      }
      const next = Object.freeze({ occurrence: result.occurrence, token: result.token, run: ++runRef.current });
      deliveryRef.current = next;
      setDelivery(next);
    }).catch((error) => DebugLogger.error(
      'daily_journey:production_host:unhandled',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    ));
  }, [productionHost]);

  const completeDelivery = useCallback(() => {
    // Native-driver callbacks may arrive while React is processing an
    // inactive/background transition. Never consume the presentation receipt
    // off-screen: retaining this delivery makes foreground replay the same
    // already-committed occurrence.
    if (AppState.currentState !== 'active') return;
    const current = deliveryRef.current;
    if (!current) return;
    clearDelivery(false);
    void productionHost.markPresented(current.occurrence, current.token).then((presented) => {
      if (!presented) productionHost.releasePresentation(current.occurrence.operationId);
      runPresentation();
    }).catch((error) => {
      productionHost.releasePresentation(current.occurrence.operationId);
      DebugLogger.error(
        'daily_journey:production_host:presented_unhandled',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
      runPresentation();
    });
  }, [clearDelivery, productionHost, runPresentation]);

  useEffect(() => {
    mountedRef.current = true;
    runPresentation();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setAppActive(active);
      if (active) runPresentation();
    });
    const accountSubscription = subscribeAccountGeneration((token) => {
      clearDelivery(true);
      if (token.phase === 'active' && token.stableId) runPresentation();
    });
    const onboardingCompletedSubscription = onAppEvent('onboarding_completed', () => {
      runPresentation();
    });
    const onboardingRestartSubscription = onAppEvent('dev_onboarding_restart', () => {
      clearDelivery(true);
    });
    const onboardingPaywallSubscription = onAppEvent('onboarding_paywall_completed', () => {
      clearDelivery(true);
    });
    return () => {
      mountedRef.current = false;
      appStateSubscription.remove();
      accountSubscription.remove();
      onboardingCompletedSubscription.remove();
      onboardingRestartSubscription.remove();
      onboardingPaywallSubscription.remove();
      clearDelivery(true);
    };
  }, [clearDelivery, runPresentation]);

  useEffect(() => {
    const timer = setTimeout(() => setLocalDayWake((value) => value + 1), millisecondsUntilNextLocalDay());
    return () => clearTimeout(timer);
  }, [localDayWake]);

  useEffect(() => {
    runPresentation();
  }, [localDayWake, runPresentation]);

  return delivery ? (
    <DailyJourneyRewardPreviewModal
      visible={visible}
      day={delivery.occurrence.day}
      cycle={delivery.occurrence.cycle}
      run={delivery.run}
      occurrence={delivery.occurrence}
      targetRect={null}
      onDeliveryComplete={completeDelivery}
    />
  ) : null;
}
