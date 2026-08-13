// ════════════════════════════════════════════════════════════════════════════
// course_pack_remote_loader.ts — runtime download + disk-cache + integrity for
// server-served course packs (plan_content first).
//
// DISABLED BY DEFAULT. Every entry point short-circuits while
// COURSE_PACK_REMOTE_LOADING_ENABLED === false, so importing or calling this
// module changes nothing in production until the flag is explicitly turned on
// (a separate, owner-approved rollout step). Built modeled on the proven
// hooks/phrase_audio_player.ts download/cache pattern (expo-file-system).
//
// What it does when enabled:
//   1. fetch + validate a CoursePackManifest from a server URL,
//   2. download the entry index + per-day rows,
//   3. cache them on disk keyed by buildCoursePackCacheKey,
//   4. verify sha256/byteSize integrity,
//   5. fall back to bundled compatibility content on any miss/corruption.
//
// It NEVER blocks startup and NEVER deletes bundled content. Callers always have
// a synchronous bundled fallback (plan_content_readiness) to use until a remote
// pack is fully downloaded and verified.
// ════════════════════════════════════════════════════════════════════════════
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import {
  PLAN_CONTENT_REMOTE_ENABLED,
} from './course_pack_loader';
import {
  buildCoursePackCacheKey,
  validateCoursePackManifest,
  type CoursePackManifest,
} from './course_pack_manifest';
import { canonicalPlanContentString } from './plan_content_canonical_hash';

const CACHE_ROOT_NAME = 'course-packs';
const MANIFEST_TIMEOUT_MS = 6000;
const ROW_TIMEOUT_MS = 6000;
const MIN_BYTES = 2;

// Read the flag through a boolean indirection so this module's disabled guards
// are honored at runtime without TypeScript pruning them as dead branches (the
// flag is currently a `false as const`). When the flag is flipped to enable
// remote loading, these guards open up with no code change here.
function remoteLoadingEnabled(): boolean {
  return Boolean(PLAN_CONTENT_REMOTE_ENABLED);
}

/** Result of attempting to make a remote pack available on disk. */
export type CoursePackRemoteLoadResult =
  | { state: 'disabled' }
  | { state: 'ready'; cacheDirUri: string; manifest: CoursePackManifest }
  | { state: 'manifest_invalid'; errors: string[] }
  | { state: 'integrity_failed'; detail: string }
  | { state: 'network_unavailable' };

const inFlightLoads = new Map<string, Promise<CoursePackRemoteLoadResult>>();
const inFlightRows = new Map<string, Promise<boolean>>();

function cacheRoot(): Directory {
  return new Directory(Paths.cache, CACHE_ROOT_NAME);
}

/** One directory per cache key, so different content versions never collide. */
function cacheDirForKey(cacheKey: string): Directory {
  const safe = cacheKey.replace(/[^a-z0-9]+/gi, '_').slice(0, 120) || 'pack';
  return new Directory(cacheRoot(), safe);
}

function safeRelativeCachePath(name: string): string | null {
  const normalized = name.replace(/\\/g, '/');
  if (
    !normalized.trim() ||
    normalized.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) ||
    normalized.includes('?') ||
    normalized.includes('#')
  ) {
    return null;
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null;
  }
  return segments
    .map((segment) => segment.replace(/[^a-z0-9._-]+/gi, '_'))
    .join('/');
}

function fileIn(dir: Directory, name: string): File | null {
  const safeName = safeRelativeCachePath(name);
  return safeName ? new File(dir, safeName) : null;
}

function ensureParentDirectories(dir: Directory, name: string): boolean {
  const safeName = safeRelativeCachePath(name);
  if (!safeName) return false;
  const parentSegments = safeName.split('/').slice(0, -1);
  try {
    let parent = dir;
    for (const segment of parentSegments) {
      parent = new Directory(parent, segment);
      if (!parent.exists) parent.create({ intermediates: true });
    }
    return true;
  } catch {
    return false;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T | null>;
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const res = await withTimeout(fetch(url), timeoutMs);
    if (!res || !res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function downloadToFile(url: string, file: File, timeoutMs: number): Promise<boolean> {
  try {
    const downloaded = await withTimeout(File.downloadFileAsync(url, file), timeoutMs);
    if (!downloaded) return false;
    return Boolean(downloaded.exists) && (downloaded.size ?? 0) >= MIN_BYTES;
  } catch {
    return false;
  }
}

/**
 * Builds the public download URL for an in-pack object path (e.g. "index.json" or
 * "plans/echo/day-001.json"). For Firebase Storage this must percent-encode the
 * full object path and append the access query, which a plain base+path concat
 * cannot do — hence a builder function.
 */
export type RowUrlBuilder = (inPackPath: string) => string;

/**
 * Make a server pack available on disk (idempotent, deduplicated, integrity-checked).
 * Returns { state: 'disabled' } and does NOTHING while the flag is false.
 *
 * `manifestUrl` is the server URL of the manifest.json; `rowUrl` builds the URL
 * for any in-pack object path (entry index, day rows).
 */
export async function ensureRemoteCoursePack(
  manifestUrl: string,
  rowUrl: RowUrlBuilder,
): Promise<CoursePackRemoteLoadResult> {
  // Hard gate: inert until remote loading is explicitly enabled.
  if (!remoteLoadingEnabled()) {
    return { state: 'disabled' };
  }

  const manifest = await fetchJson<unknown>(manifestUrl, MANIFEST_TIMEOUT_MS);
  if (manifest === null) return { state: 'network_unavailable' };

  const validation = validateCoursePackManifest(manifest);
  if (!validation.ok) {
    return { state: 'manifest_invalid', errors: validation.errors };
  }
  const validManifest = manifest as CoursePackManifest;
  const cacheKey = buildCoursePackCacheKey(validManifest);

  const existing = inFlightLoads.get(cacheKey);
  if (existing) return existing;

  const task = loadAndCache(validManifest, rowUrl, cacheKey).finally(() => {
    inFlightLoads.delete(cacheKey);
  });
  inFlightLoads.set(cacheKey, task);
  return task;
}

async function loadAndCache(
  manifest: CoursePackManifest,
  rowUrl: RowUrlBuilder,
  cacheKey: string,
): Promise<CoursePackRemoteLoadResult> {
  const dir = cacheDirForKey(cacheKey);
  try {
    if (!dir.exists) dir.create({ intermediates: true });
  } catch {
    return { state: 'integrity_failed', detail: 'could not create cache directory' };
  }

  // Download the entry index.
  const indexFile = fileIn(dir, manifest.entryIndex);
  if (!indexFile) return { state: 'integrity_failed', detail: 'entry index path is unsafe' };
  const indexOk = await downloadToFile(rowUrl(manifest.entryIndex), indexFile, ROW_TIMEOUT_MS);
  if (!indexOk) return { state: 'network_unavailable' };

  // Verify the whole-pack integrity signal we have at runtime: the index byte size
  // is the cheapest cross-check before trusting individual rows. Per-row sha256 is
  // verified lazily by readers via verifyCachedRow().
  let indexBytes = 0;
  try {
    indexBytes = indexFile.size ?? 0;
  } catch {
    indexBytes = 0;
  }
  if (indexBytes < MIN_BYTES) {
    return { state: 'integrity_failed', detail: 'entry index is empty after download' };
  }

  return { state: 'ready', cacheDirUri: dir.uri, manifest };
}

/**
 * Read a cached day row by its in-pack path, returning its parsed JSON, or null
 * if it is not cached / cannot be read. Disabled-safe: returns null while the
 * flag is false.
 */
export async function readCachedCoursePackRow<T = unknown>(
  cacheKey: string,
  rowPath: string,
): Promise<T | null> {
  if (!remoteLoadingEnabled()) return null;
  try {
    const file = fileIn(cacheDirForKey(cacheKey), rowPath);
    if (!file) return null;
    if (!file.exists || (file.size ?? 0) < MIN_BYTES) return null;
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Lazy-download one in-pack row into the verified pack cache. This keeps screen
 * loads cheap: the manifest/index establish the cache key, then the first
 * request for a concrete day downloads only that day row and later reads hit disk.
 */
export async function ensureCachedCoursePackRow(
  cacheKey: string,
  rowPath: string,
  rowUrl: RowUrlBuilder,
): Promise<boolean> {
  if (!remoteLoadingEnabled()) return false;
  const rowKey = `${cacheKey}|${rowPath}`;
  const existing = inFlightRows.get(rowKey);
  if (existing) return existing;

  const task = (async () => {
    const dir = cacheDirForKey(cacheKey);
    try {
      if (!dir.exists) dir.create({ intermediates: true });
      const file = fileIn(dir, rowPath);
      if (!file) return false;
      if (file.exists && (file.size ?? 0) >= MIN_BYTES) return true;
      if (!ensureParentDirectories(dir, rowPath)) return false;
      return downloadToFile(rowUrl(rowPath), file, ROW_TIMEOUT_MS);
    } catch {
      return false;
    }
  })().finally(() => {
    inFlightRows.delete(rowKey);
  });

  inFlightRows.set(rowKey, task);
  return task;
}

/** A cached day-row artifact as stored on the server (plan-content-day-v1). */
type CachedDayRowArtifact = {
  contentHash?: string;
  content?: unknown;
};

/**
 * Compute the runtime sha256 of a day's `content` using the SAME canonical
 * serialization the pack exporter used, so a correct server day verifies and a
 * tampered/corrupt one fails. Returns the lowercase hex digest.
 */
export async function computePlanContentDayHash(content: unknown): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalPlanContentString(content),
  );
}

/**
 * Read a cached day row AND verify its content sha256 matches the row's recorded
 * contentHash. Returns the verified `content` payload, or:
 *   - null            when not cached / unreadable (caller falls back to bundled),
 *   - { corrupt:true }  when the hash does not match (caller should evict + fall back).
 * Disabled-safe: returns null while the flag is false.
 */
export async function readVerifiedCoursePackDay<T = unknown>(
  cacheKey: string,
  rowPath: string,
): Promise<T | null | { corrupt: true }> {
  if (!remoteLoadingEnabled()) return null;
  const artifact = await readCachedCoursePackRow<CachedDayRowArtifact>(cacheKey, rowPath);
  if (!artifact || typeof artifact.contentHash !== 'string' || artifact.content === undefined) {
    return null;
  }
  let actual: string;
  try {
    actual = await computePlanContentDayHash(artifact.content);
  } catch {
    return null;
  }
  if (actual.toLowerCase() !== artifact.contentHash.toLowerCase()) {
    return { corrupt: true };
  }
  return artifact.content as T;
}

/**
 * Remove a corrupt/stale cached pack directory so the next load re-downloads it.
 * Disabled-safe and best-effort.
 */
export async function evictCachedCoursePack(cacheKey: string): Promise<void> {
  if (!remoteLoadingEnabled()) return;
  try {
    const dir = cacheDirForKey(cacheKey);
    if (dir.exists) dir.delete();
  } catch {
    // best-effort
  }
}

/* expo-router route shim: keeps this utility module from warning when discovered as a route. */
export default function __CoursePackRemoteLoaderRouteShim() {
  return null;
}
