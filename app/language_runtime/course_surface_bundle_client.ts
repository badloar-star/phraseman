import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface, type CourseRelease } from './course_release_contract';

const FUNCTIONS_REGION = 'us-central1';
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 8;
const inFlight = new Map<string, Promise<CourseSurfaceBundleEnvelope>>();
const cache = new Map<string, { value: CourseSurfaceBundleEnvelope; expiresAtMs: number }>();

export interface CourseSurfaceBundleEntry {
  readonly lessonId: number;
  readonly contentHash: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface CourseSurfaceBundleEnvelope {
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly surface: CanonicalReleaseSurface;
  readonly entries: readonly CourseSurfaceBundleEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCourseSurfaceBundleEnvelope(value: unknown): CourseSurfaceBundleEnvelope {
  if (!isRecord(value) || typeof value.releaseId !== 'string' || !/^[A-Za-z0-9._-]{1,160}$/.test(value.releaseId) || typeof value.studyTarget !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value.studyTarget) || typeof value.learnerSourceLocale !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value.learnerSourceLocale) || typeof value.surface !== 'string' || !(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(value.surface) || !Array.isArray(value.entries) || value.entries.length < 1 || value.entries.length > 100) throw new Error('course_surface_bundle_invalid');
  const seen = new Set<number>();
  const entries = value.entries.map((entry): CourseSurfaceBundleEntry => {
    if (!isRecord(entry) || !Number.isInteger(entry.lessonId) || Number(entry.lessonId) < 1 || Number(entry.lessonId) > 100 || typeof entry.contentHash !== 'string' || !/^[a-f0-9]{64}$/i.test(entry.contentHash) || !isRecord(entry.payload)) throw new Error('course_surface_bundle_invalid');
    const lessonId = Number(entry.lessonId);
    if (seen.has(lessonId)) throw new Error('course_surface_bundle_duplicate_lesson');
    if (Number(entry.payload.lessonId) !== lessonId) throw new Error('course_surface_bundle_payload_identity_mismatch');
    seen.add(lessonId);
    return Object.freeze({ lessonId, contentHash: entry.contentHash, payload: Object.freeze(entry.payload) });
  }).sort((a, b) => a.lessonId - b.lessonId);
  return Object.freeze({ releaseId: value.releaseId, studyTarget: value.studyTarget, learnerSourceLocale: value.learnerSourceLocale, surface: value.surface as CanonicalReleaseSurface, entries: Object.freeze(entries) });
}

function pruneCache(nowMs: number): void {
  for (const [key, entry] of cache) if (entry.expiresAtMs <= nowMs) cache.delete(key);
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export async function fetchPublishedCourseSurfaceBundle(
  release: CourseRelease,
  surface: CanonicalReleaseSurface,
): Promise<CourseSurfaceBundleEnvelope> {
  if (!release.artifacts[surface]) throw new Error('course_surface_bundle_request_invalid');
  const key = `${release.releaseId}:${release.studyTarget}:${release.learnerSourceLocale}:${surface}`;
  pruneCache(Date.now());
  const cached = cache.get(key);
  if (cached) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'getPublishedCourseSurfaceBundle')({ releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, surface })
    .then((result) => {
      const bundle = parseCourseSurfaceBundleEnvelope(result.data);
      if (bundle.releaseId !== release.releaseId || bundle.studyTarget !== release.studyTarget || bundle.learnerSourceLocale !== release.learnerSourceLocale || bundle.surface !== surface) throw new Error('course_surface_bundle_identity_mismatch');
      cache.set(key, { value: bundle, expiresAtMs: Date.now() + CACHE_TTL_MS });
      pruneCache(Date.now());
      return bundle;
    })
    .finally(() => { inFlight.delete(key); });
  if (inFlight.size >= CACHE_MAX_ENTRIES) inFlight.delete(inFlight.keys().next().value as string);
  inFlight.set(key, request);
  return request;
}
