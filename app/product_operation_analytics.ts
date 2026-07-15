import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { trackEvent } from './analytics';

export type ProductOperationFeature = 'paywall' | 'audio' | 'content' | 'sync';
export type ProductOperation = 'offerings_load' | 'audio_load' | 'content_load' | 'cloud_sync';
export type ProductFailureCode = 'store_unavailable' | 'network_unavailable' | 'timeout' | 'invalid_payload' | 'unknown_bounded';

export function buildProductOperationFailurePayload(input: {
  eventId: string;
  feature: ProductOperationFeature;
  operation: ProductOperation;
  failureCode: ProductFailureCode;
  retryable: boolean;
  appVersion: string;
  buildNumber: string;
  occurredAtMs: number;
}) {
  return {
    schema_version: 1,
    event_id: String(input.eventId).slice(0, 80),
    feature: input.feature,
    operation: input.operation,
    failure_code: input.failureCode,
    retryable: input.retryable,
    app_version: String(input.appVersion).slice(0, 40),
    build_number: String(input.buildNumber).slice(0, 40),
    occurred_at_ms: Math.max(0, Math.round(input.occurredAtMs)),
  };
}

export function trackProductOperationFailure(
  feature: ProductOperationFeature,
  operation: ProductOperation,
  failureCode: ProductFailureCode,
  retryable: boolean,
): void {
  void trackEvent('product_operation_failure', buildProductOperationFailurePayload({
    eventId: Crypto.randomUUID(),
    feature,
    operation,
    failureCode,
    retryable,
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown',
    buildNumber: Constants.nativeBuildVersion ?? 'unknown',
    occurredAtMs: Date.now(),
  }));
}

export default function __RouteShim() { return null; }
