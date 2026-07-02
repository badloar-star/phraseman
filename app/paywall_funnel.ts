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

import { isAnalyticsConsentGranted } from './analytics_consent';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId } from './stable_id';
import { hashToUnit, type PaywallAbVariant } from './paywall_variant';
import { DebugLogger } from './debug-logger';

export type PaywallFunnelStep =
  | 'shown'
  | 'cta_click'
  | 'trial_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_cancelled'
  | 'restore_completed'
  | 'close';

const COLLECTION = 'paywall_funnel';
const FUNNEL_DUPLICATE_WINDOW_MS = 750;
const FUNNEL_DEDUPE_CACHE_LIMIT = 64;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 дней — дашборду хватает, мусор сгорает

/** 'shown' шлём один раз на маунт экрана — страховка от ре-рендеров/повторов. */
const _shownOnce = new Set<string>();
const _recentFunnelEvents = new Map<string, number>();

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
  obColor?: 'main';
}

function paywallFunnelEventKey(step: PaywallFunnelStep, payload: PaywallFunnelPayload): string {
  return [
    step,
    payload.variant,
    String(payload.context || 'generic'),
    payload.plan ?? '',
    payload.obColor ?? '',
  ].join(':');
}

function shouldDropDuplicateFunnelEvent(step: PaywallFunnelStep, payload: PaywallFunnelPayload, nowMs: number): boolean {
  const key = paywallFunnelEventKey(step, payload);
  if (step === 'shown') {
    if (_shownOnce.has(key)) return true;
    _shownOnce.add(key);
    return false;
  }

  const lastAt = _recentFunnelEvents.get(key) ?? 0;
  if (nowMs - lastAt < FUNNEL_DUPLICATE_WINDOW_MS) return true;
  _recentFunnelEvents.set(key, nowMs);
  if (_recentFunnelEvents.size > FUNNEL_DEDUPE_CACHE_LIMIT) {
    const oldestKey = _recentFunnelEvents.keys().next().value as string | undefined;
    if (oldestKey) _recentFunnelEvents.delete(oldestKey);
  }
  return false;
}

/**
 * Fire-and-forget запись шага воронки. Никогда не бросает и не блокирует UI.
 */
export function logPaywallFunnel(step: PaywallFunnelStep, payload: PaywallFunnelPayload): void {
  // GDPR: воронка — non-essential продуктовая аналитика; без явного согласия не пишем,
  // как и trackEvent/PostHog (см. analytics_consent.ts).
  if (!isAnalyticsConsentGranted()) return;
  if (shouldDropDuplicateFunnelEvent(step, payload, Date.now())) return;
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
      // permission-denied — ожидаемый сценарий, когда задеплоенные Firestore-правила
      // отстают от клиента (новый context/obColor ещё не в allow-листе). Воронка
      // чисто аналитическая и fire-and-forget — не шумим в консоль/дев-оверлей,
      // чтобы не выглядело как поломка приложения. Прочие ошибки логируем.
      const code = (error as { code?: string } | null)?.code;
      const message = error instanceof Error ? error.message : String(error ?? '');
      if (code === 'firestore/permission-denied' || message.includes('permission-denied')) {
        return;
      }
      DebugLogger.error('paywall_funnel:log', error, 'warning');
    }
  })();
}

/** Сброс session-дедупа 'shown' — для повторного открытия пейвола в одной сессии. */
export function resetPaywallFunnelShownDedup(): void {
  _shownOnce.clear();
  _recentFunnelEvents.clear();
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
