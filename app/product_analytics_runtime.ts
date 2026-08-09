import {
  buildProductRuntimeEvent,
  type ProductRuntimeEvent,
  type ProductRuntimeEventName,
  type ProductScreenLeaveReason,
} from './product_analytics_contract';

const SESSION_CONTINUATION_MS = 30 * 60 * 1000;

type RuntimeContext = Pick<
  ProductRuntimeEvent,
  'platform' | 'appVersion' | 'buildNumber' | 'studyTarget'
>;

export interface ProductAnalyticsRuntimeDeps {
  emit(event: ProductRuntimeEvent): void;
  now(): number;
  createId(): string;
  context(): RuntimeContext;
  onSessionIdChanged?(sessionId: string | null): void;
}

export function createProductAnalyticsRuntime(deps: ProductAnalyticsRuntimeDeps) {
  let consentGranted = false;
  let appActive = true;
  let sessionId: string | null = null;
  let currentScreen = 'unknown_screen';
  let screenViewedAtMs: number | null = null;
  let backgroundedAtMs: number | null = null;

  const emit = (
    eventName: ProductRuntimeEventName,
    options: { leaveReason?: ProductScreenLeaveReason; durationMs?: number } = {},
  ) => {
    if (!consentGranted || !sessionId) return;
    deps.emit(buildProductRuntimeEvent({
      eventId: deps.createId(),
      eventName,
      sessionId,
      screenId: currentScreen,
      occurredAtMs: deps.now(),
      ...deps.context(),
      ...options,
    }));
  };

  const startSession = () => {
    sessionId = deps.createId();
    deps.onSessionIdChanged?.(sessionId);
    emit('product_session_start');
    screenViewedAtMs = deps.now();
    emit('product_screen_view');
  };

  const leaveCurrentScreen = (leaveReason: ProductScreenLeaveReason) => {
    if (screenViewedAtMs == null) return;
    emit('product_screen_leave', {
      leaveReason,
      durationMs: deps.now() - screenViewedAtMs,
    });
    screenViewedAtMs = null;
  };

  return {
    setConsent(granted: boolean) {
      if (granted === consentGranted) return;
      consentGranted = granted;
      if (!granted) {
        sessionId = null;
        deps.onSessionIdChanged?.(null);
        screenViewedAtMs = null;
        backgroundedAtMs = null;
        return;
      }
      if (appActive) startSession();
    },

    setCurrentScreen(screenId: string) {
      if (screenId === currentScreen) return;
      if (consentGranted && appActive && sessionId) leaveCurrentScreen('route_change');
      currentScreen = screenId;
      if (consentGranted && appActive && sessionId) {
        screenViewedAtMs = deps.now();
        emit('product_screen_view');
      }
    },

    setAppActive(active: boolean) {
      if (active === appActive) return;
      appActive = active;
      if (!consentGranted) return;
      if (!active) {
        leaveCurrentScreen('background');
        backgroundedAtMs = deps.now();
        emit('product_session_background');
        return;
      }

      const awayMs = backgroundedAtMs == null ? Number.POSITIVE_INFINITY : deps.now() - backgroundedAtMs;
      backgroundedAtMs = null;
      if (!sessionId || awayMs > SESSION_CONTINUATION_MS) {
        startSession();
        return;
      }
      emit('product_session_resume');
      screenViewedAtMs = deps.now();
      emit('product_screen_view');
    },
  };
}

export default function __RouteShim() { return null; }
