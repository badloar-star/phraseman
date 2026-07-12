import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface, type CourseRelease } from './course_release_contract';

const FUNCTIONS_REGION = 'us-central1';
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 40;
const inFlight = new Map<string, Promise<CourseSurfaceEntryEnvelope>>();
const cache = new Map<string, { value: CourseSurfaceEntryEnvelope; expiresAtMs: number }>();

export type CourseSurfaceEntryEnvelope = {
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly surface: CanonicalReleaseSurface;
  readonly lessonId: number;
  readonly contentHash: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCourseSurfaceEntryEnvelope(value: unknown): CourseSurfaceEntryEnvelope {
  if (!isRecord(value) || typeof value.releaseId !== 'string' || !/^[A-Za-z0-9._-]{1,160}$/.test(value.releaseId) || typeof value.studyTarget !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value.studyTarget) || typeof value.learnerSourceLocale !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value.learnerSourceLocale) || typeof value.surface !== 'string' || !(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(value.surface) || !Number.isInteger(value.lessonId) || Number(value.lessonId) < 1 || Number(value.lessonId) > 100 || typeof value.contentHash !== 'string' || !/^[a-f0-9]{64}$/i.test(value.contentHash) || !isRecord(value.payload)) throw new Error('course_surface_envelope_invalid');
  if (Number(value.payload.lessonId) !== Number(value.lessonId)) throw new Error('course_surface_payload_identity_mismatch');
  return Object.freeze({ releaseId: value.releaseId, studyTarget: value.studyTarget, learnerSourceLocale: value.learnerSourceLocale, surface: value.surface as CanonicalReleaseSurface, lessonId: Number(value.lessonId), contentHash: value.contentHash, payload: Object.freeze(value.payload) });
}

function pruneCache(nowMs: number): void {
  for (const [key, entry] of cache) if (entry.expiresAtMs <= nowMs) cache.delete(key);
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export async function fetchPublishedCourseSurfaceEntry(
  release: CourseRelease,
  surface: CanonicalReleaseSurface,
  lessonId: number,
): Promise<CourseSurfaceEntryEnvelope> {
  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100 || !release.artifacts[surface]) throw new Error('course_surface_request_invalid');
  const key = `${release.releaseId}:${release.studyTarget}:${release.learnerSourceLocale}:${surface}:${lessonId}`;
  const nowMs = Date.now();
  pruneCache(nowMs);
  const cached = cache.get(key);
  if (cached) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'getPublishedCourseSurfaceEntry')({ releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, surface, lessonId })
    .then((result) => {
      const envelope = parseCourseSurfaceEntryEnvelope(result.data);
      if (envelope.releaseId !== release.releaseId || envelope.studyTarget !== release.studyTarget || envelope.learnerSourceLocale !== release.learnerSourceLocale || envelope.surface !== surface || envelope.lessonId !== lessonId) throw new Error('course_surface_identity_mismatch');
      cache.set(key, { value: envelope, expiresAtMs: Date.now() + CACHE_TTL_MS });
      pruneCache(Date.now());
      return envelope;
    })
    .finally(() => { inFlight.delete(key); });
  if (inFlight.size >= 20) inFlight.delete(inFlight.keys().next().value as string);
  inFlight.set(key, request);
  return request;
}
