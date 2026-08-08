import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { trackEvent } from './analytics';
import {
  getAnalyticsConsentState,
  subscribeAnalyticsConsent,
} from './analytics_consent';
import {
  createProductAnalyticsRuntime,
  type ProductAnalyticsRuntimeDeps,
} from './product_analytics_runtime';
import { productAnalyticsScreenId } from './product_analytics_screen_registry';
import {
  clearProductAnalyticsSessionId,
  setProductAnalyticsSessionId,
} from './product_analytics_session_context';

interface ProductAnalyticsRuntimeObserverProps {
  studyTarget: string;
}

function analyticsContext(studyTarget: string): ReturnType<ProductAnalyticsRuntimeDeps['context']> {
  return {
    platform: Platform.OS === 'android' ? 'android' : 'ios',
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown',
    buildNumber: Constants.nativeBuildVersion ?? 'unknown',
    studyTarget,
  };
}

/**
 * One root-level bridge from navigation/AppState into consent-gated analytics.
 * It emits canonical screen IDs only; raw paths and route parameters never leave the app.
 */
export function ProductAnalyticsRuntimeObserver({
  studyTarget,
}: ProductAnalyticsRuntimeObserverProps) {
  const pathname = usePathname();
  const contextRef = useRef(analyticsContext(studyTarget));
  contextRef.current = analyticsContext(studyTarget);

  const runtimeRef = useRef<ReturnType<typeof createProductAnalyticsRuntime> | null>(null);
  if (runtimeRef.current == null) {
    runtimeRef.current = createProductAnalyticsRuntime({
      emit(event) {
        void trackEvent(event.eventName, {
          schema_version: event.schemaVersion,
          event_id: event.eventId,
          session_id: event.sessionId,
          screen_id: event.screenId,
          platform: event.platform,
          app_version: event.appVersion,
          build_number: event.buildNumber,
          study_target: event.studyTarget,
          occurred_at_ms: event.occurredAtMs,
          duration_ms: event.durationMs,
          leave_reason: event.leaveReason,
        });
      },
      now: Date.now,
      createId: Crypto.randomUUID,
      context: () => contextRef.current,
      onSessionIdChanged(sessionId) {
        if (sessionId) setProductAnalyticsSessionId(sessionId);
        else clearProductAnalyticsSessionId();
      },
    });
  }
  const runtime = runtimeRef.current;

  useEffect(() => {
    runtime.setCurrentScreen(productAnalyticsScreenId(pathname));
  }, [pathname, runtime]);

  useEffect(() => {
    runtime.setAppActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (nextState) => {
      runtime.setAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, [runtime]);

  useEffect(() => {
    runtime.setConsent(getAnalyticsConsentState() === 'granted');
    const unsubscribe = subscribeAnalyticsConsent((state) => {
      runtime.setConsent(state === 'granted');
    });
    return () => {
      unsubscribe();
      clearProductAnalyticsSessionId();
    };
  }, [runtime]);

  return null;
}

export default function __RouteShim() { return null; }
