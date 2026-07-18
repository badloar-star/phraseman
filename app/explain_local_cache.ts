import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = 'ai_explain_local_cache_v1:';

export type ExplainLocalCacheKind = 'phrase' | 'mistake';

export interface ExplainLocalCacheRequest {
  kind: ExplainLocalCacheKind;
  /** Caller-owned deterministic request identity; never sent to the backend. */
  key: string;
}

export interface ExplainLocalCacheValue {
  text: string;
  status: string;
}

interface StoredExplainLocalCacheValue extends ExplainLocalCacheValue {
  version: number;
}

function storageKey(request: ExplainLocalCacheRequest): string {
  return `${CACHE_KEY_PREFIX}${request.kind}:${request.key}`;
}

function parseStoredValue(raw: string | null): ExplainLocalCacheValue | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredExplainLocalCacheValue>;
    if (
      value.version !== CACHE_VERSION
      || typeof value.text !== 'string'
      || !value.text.trim()
      || typeof value.status !== 'string'
    ) return null;
    return { text: value.text, status: value.status };
  } catch {
    return null;
  }
}

/**
 * Reads a previously displayed, non-personal AI explanation. Cache misses are
 * intentionally quiet: a damaged device cache must never block the server path.
 */
export async function readExplainLocalCache(
  request: ExplainLocalCacheRequest,
): Promise<ExplainLocalCacheValue | null> {
  try {
    return parseStoredValue(await AsyncStorage.getItem(storageKey(request)));
  } catch {
    return null;
  }
}

/** Saves only the finished text already shown to the learner for offline reuse. */
export async function writeExplainLocalCache(
  request: ExplainLocalCacheRequest,
  value: ExplainLocalCacheValue,
): Promise<void> {
  if (!value.text.trim()) return;
  try {
    await AsyncStorage.setItem(storageKey(request), JSON.stringify({
      version: CACHE_VERSION,
      text: value.text,
      status: value.status,
    } satisfies StoredExplainLocalCacheValue));
  } catch {
    // Local caching is an optimisation; the caller already has a valid response.
  }
}
