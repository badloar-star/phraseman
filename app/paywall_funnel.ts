// ════════════════════════════════════════════════════════════════════════════
// paywall_funnel.ts — журнал воронки пейвола для админ-дашборда A/B.
//
// Пишет компактные события в Firestore `paywall_funnel` (create-only по rules):
//   { step, variant, context, plan, day (UTC), ts, uidh, dev, expireAt }
//
// Это НЕ замена продуктовой аналитике (trackEvent/PostHog остаётся у экранов) —
// это независимый, читаемый админкой источник для сравнения вариантов:
// показы → клики CTA → триалы → покупки → закрытия, по вариантам и контекстам.
//
// uidh — короткий djb2-хэш stableId: достаточно для счёта уникальных юзеров в
// дашборде, не раскрывает сам id. dev=true у __DEV__-сборок (дашборд фильтрует).
// expireAt — для TTL-политики Firestore (поле expireAt, настроить в консоли).
// ════════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId } from './stable_id';
import { hashToUnit, type PaywallAbVariant } from './paywall_variant';
import { DebugLogger } from './debug-logger';

export type PaywallFunnelStep =
  | 'shown'
  | 'cta_click'
  | 'trial_started'
  | 'purchase_completed'
  | 'close';

const COLLECTION = 'paywall_funnel';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 дней — дашборду хватает, мусор сгорает

/** 'shown' шлём один раз на маунт экрана — страховка от ре-рендеров/повторов. */
const _shownOnce = new Set<string>();

function utcDayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

type FirestoreFactory = () => {
  collection: (name: string) => { add: (data: Record<string, unknown>) => Promise<unknown> };
};

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    return mod.default as unknown as FirestoreFactory;
  } catch {
    return null;
  }
}

export interface PaywallFunnelPayload {
  variant: PaywallAbVariant;
  context: string;
  plan?: 'monthly' | 'yearly' | 'lifetime' | null;
  obColor?: 'blue' | 'green';
}

/**
 * Fire-and-forget запись шага воронки. Никогда не бросает и не блокирует UI.
 */
export function logPaywallFunnel(step: PaywallFunnelStep, payload: PaywallFunnelPayload): void {
  if (step === 'shown') {
    const key = `${payload.variant}:${payload.context}`;
    if (_shownOnce.has(key)) return;
    _shownOnce.add(key);
  }
  void (async () => {
    try {
      const factory = await getFirestoreModule();
      if (!factory) return;
      const stableId = await getStableId();
      const ts = Date.now();
      await factory().collection(COLLECTION).add({
        step,
        variant: payload.variant,
        context: String(payload.context || 'generic').slice(0, 40),
        plan: payload.plan ?? null,
        obColor: payload.obColor ?? null,
        day: utcDayKey(ts),
        ts,
        uidh: Math.round(hashToUnit(`${stableId}:funnel`) * 1e9).toString(36),
        dev: typeof __DEV__ !== 'undefined' && __DEV__,
        expireAt: new Date(ts + TTL_MS),
      });
    } catch (error) {
      DebugLogger.error('paywall_funnel:log', error, 'warning');
    }
  })();
}

/** Сброс session-дедупа 'shown' — для повторного открытия пейвола в одной сессии. */
export function resetPaywallFunnelShownDedup(): void {
  _shownOnce.clear();
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
