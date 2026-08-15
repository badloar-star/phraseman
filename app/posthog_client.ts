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

import { isAnalyticsConsentGranted } from './analytics_consent';
import { withBackgroundNetworkLease } from './interactive_network_quiet';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const MAX_POSTHOG_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_POSTHOG_RESPONSE_CHUNKS = 8_192;

type PostHogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

type PostHogFetchOptionsLike = RequestInit & {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
};

type PostHogFetchResponseLike = {
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  headers?: { get(name: string): string | null };
  body?: ReadableStream<Uint8Array> | null;
};

const boundedUtf8Length = (value: string): number => {
  if (value.length > MAX_POSTHOG_RESPONSE_BYTES) {
    throw new Error('posthog_response_too_large');
  }
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit <= 0x7f) bytes += 1;
    else if (unit <= 0x7ff) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
    if (bytes > MAX_POSTHOG_RESPONSE_BYTES) {
      throw new Error('posthog_response_too_large');
    }
  }
  return bytes;
};

const consumePostHogResponseBody = async (
  response: Response,
  controller: AbortController,
  assertCurrent: () => void,
  forcedError?: Error,
): Promise<string> => {
  const body = response.body;
  if (!body || typeof body.getReader !== 'function') {
    // React Native's legacy XHR-backed fetch resolves only after buffering the
    // response. text() still belongs inside the lease; the modern streaming
    // path below provides the true incremental allocation bound.
    const text = await response.text();
    if (forcedError) throw forcedError;
    boundedUtf8Length(text);
    return text;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let readCount = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      assertCurrent();
      if (!(next.value instanceof Uint8Array)) throw new Error('posthog_response_invalid');
      readCount += 1;
      if (readCount > MAX_POSTHOG_RESPONSE_CHUNKS) {
        throw new Error('posthog_response_too_many_chunks');
      }
      total += next.value.byteLength;
      if (total > MAX_POSTHOG_RESPONSE_BYTES) {
        throw new Error('posthog_response_too_large');
      }
      chunks.push(next.value);
    }
    if (forcedError) throw forcedError;
  } catch (error) {
    controller.abort(error);
    // Read to an actual terminal result after abort. ReadableStream.cancel()
    // closes the JS reader before an underlying/native cancel has necessarily
    // settled, so a rejected cancel plus reader.closed is not transport proof.
    // If a broken source ignores abort and keeps producing forever, stop doing
    // CPU work after the same bounded read count and deliberately keep the
    // network lease unresolved rather than falsely declaring session quiet.
    let drainReads = 0;
    for (;;) {
      try {
        const tail = await reader.read();
        if (tail.done) break;
        drainReads += 1;
        if (drainReads > MAX_POSTHOG_RESPONSE_CHUNKS) {
          await new Promise<never>(() => {});
        }
      } catch {
        break;
      }
    }
    throw error;
  } finally {
    try { reader.releaseLock(); } catch { /* already terminal */ }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

type PostHogConstructor = new (
  apiKey: string,
  options?: Record<string, unknown>,
) => PostHogLike & {
  fetch(url: string, options: PostHogFetchOptionsLike): Promise<PostHogFetchResponseLike>;
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
    const PostHog = (mod?.PostHog ?? mod?.default) as PostHogConstructor | undefined;
    if (!PostHog) return null;

    // PostHog's public RN class deliberately exposes fetch(). Override only
    // that transport seam: capture/identify remain synchronous local queue
    // operations, while every actual HTTP attempt becomes an abortable global
    // network lease. A protected Learning V2 session therefore defers a flush
    // without disabling analytics consent or dropping the persisted queue.
    class NetworkQuietPostHog extends PostHog {
      override fetch(
        url: string,
        options: PostHogFetchOptionsLike,
      ): Promise<PostHogFetchResponseLike> {
        return withBackgroundNetworkLease('posthog.fetch', async (lease) => {
          lease.assertCurrent();
          const controller = new AbortController();
          const abortFromLease = () => controller.abort(lease.signal.reason);
          const upstreamSignal = options.signal;
          const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

          if (lease.signal.aborted) abortFromLease();
          else lease.signal.addEventListener('abort', abortFromLease, { once: true });
          if (upstreamSignal?.aborted) abortFromUpstream();
          else upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });

          try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const declaredLength = Number(response.headers?.get?.('content-length') ?? '0');
            const forcedError = Number.isFinite(declaredLength) &&
              declaredLength > MAX_POSTHOG_RESPONSE_BYTES
              ? new Error('posthog_response_too_large')
              : undefined;
            if (forcedError) controller.abort(forcedError);

            // PostHog consumes response bodies only after fetch() returns. Keep
            // that body settlement inside this lease so SESSION_READY cannot be
            // reached while a streaming response still transfers bytes.
            const bodyText = await consumePostHogResponseBody(
              response,
              controller,
              lease.assertCurrent,
              forcedError,
            );
            boundedUtf8Length(bodyText);
            lease.assertCurrent();
            return {
              status: response.status,
              headers: response.headers,
              body: null,
              text: async () => bodyText,
              json: async () => JSON.parse(bodyText) as unknown,
            };
          } finally {
            lease.signal.removeEventListener('abort', abortFromLease);
            upstreamSignal?.removeEventListener('abort', abortFromUpstream);
          }
        });
      }
    }

    client = new NetworkQuietPostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
    return client;
  } catch {
    return null;
  }
}

export function isPostHogEnabled(): boolean {
  return !!POSTHOG_KEY;
}

export function capturePostHog(event: string, properties?: Record<string, unknown>): void {
  // PostHog — non-essential аналитика: только при явном согласии (GDPR/ePrivacy).
  if (!isAnalyticsConsentGranted()) return;
  const c = ensureClient();
  if (!c) return;
  try {
    c.capture(event, properties);
  } catch {
    /* no-op */
  }
}

export function identifyPostHog(distinctId: string, properties?: Record<string, unknown>): void {
  // Привязка к стабильному ID — только при согласии.
  if (!isAnalyticsConsentGranted()) return;
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
