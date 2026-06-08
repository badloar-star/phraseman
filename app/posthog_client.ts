/**
 * posthog_client.ts — тонкая обёртка над PostHog для продуктовой аналитики.
 *
 * Активируется ТОЛЬКО когда заданы env-переменные:
 *   EXPO_PUBLIC_POSTHOG_KEY  — project API key (phc_...)
 *   EXPO_PUBLIC_POSTHOG_HOST — host (по умолчанию https://eu.i.posthog.com)
 *
 * Если ключа нет ИЛИ пакет `posthog-react-native` не установлен — все функции
 * становятся no-op, приложение и сборка не ломаются. Это позволяет влить
 * инструментацию воронки СЕЙЧАС, а ключ/пакет добавить отдельным шагом:
 *
 *   1) npm i posthog-react-native
 *   2) В .env / eas.json:  EXPO_PUBLIC_POSTHOG_KEY=phc_xxx
 *   3) Пересобрать dev-client / прод-билд.
 *
 * До этого вся аналитика всё равно пишется в Firebase (см. analytics.ts).
 */

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

type PostHogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

let client: PostHogLike | null = null;
let initTried = false;

function ensureClient(): PostHogLike | null {
  if (client || initTried) return client;
  initTried = true;
  if (!POSTHOG_KEY) return null;
  try {
    // Динамический require: если пакет не установлен — тихо остаёмся no-op.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('posthog-react-native');
    const PostHog = mod?.PostHog ?? mod?.default;
    if (!PostHog) return null;
    client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST }) as PostHogLike;
    return client;
  } catch {
    return null;
  }
}

export function isPostHogEnabled(): boolean {
  return !!POSTHOG_KEY;
}

export function capturePostHog(event: string, properties?: Record<string, unknown>): void {
  const c = ensureClient();
  if (!c) return;
  try {
    c.capture(event, properties);
  } catch {
    /* no-op */
  }
}

export function identifyPostHog(distinctId: string, properties?: Record<string, unknown>): void {
  const c = ensureClient();
  if (!c) return;
  try {
    c.identify(distinctId, properties);
  } catch {
    /* no-op */
  }
}

export function resetPostHog(): void {
  const c = ensureClient();
  if (!c) return;
  try {
    c.reset();
  } catch {
    /* no-op */
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
