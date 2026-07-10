import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { assertCourseRelease } from './content_factory/course_release_contract';
import { parseCourseSurfaceEntryRequest, parseHashedJsonBytes, resolveIndexedCourseUnit } from './content_factory/release_surface_delivery';
import { courseCatalogId } from './language_release';

const REGION = 'us-central1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readImmutableJson(path: string, expectedHash: string, expectedGeneration: string): Promise<unknown> {
  const file = admin.storage().bucket().file(path);
  const [metadata] = await file.getMetadata();
  if (String(metadata.generation ?? '') !== expectedGeneration) throw new HttpsError('data-loss', 'course_surface_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  try { return parseHashedJsonBytes(bytes, expectedHash); } catch (error) { throw new HttpsError('data-loss', error instanceof Error ? error.message : 'course_surface_payload_invalid'); }
}

export const getPublishedCourseSurfaceEntry = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
    let input;
    try { input = parseCourseSurfaceEntryRequest(request.data); } catch { throw new HttpsError('invalid-argument', 'course_surface_request_invalid'); }
    const db = admin.firestore();
    const catalogId = courseCatalogId(input.studyTarget, input.learnerSourceLocale);
    const catalogSnap = await db.collection('content_factory_catalog').doc(catalogId).get();
    const active = catalogSnap.data()?.activeRelease;
    if (!isRecord(active) || active.releaseId !== input.releaseId || active.studyTarget !== input.studyTarget || active.learnerSourceLocale !== input.learnerSourceLocale) throw new HttpsError('failed-precondition', 'course_release_is_not_active');
    const releaseSnap = await db.collection('content_factory_releases').doc(input.releaseId).get();
    if (!releaseSnap.exists) throw new HttpsError('data-loss', 'active_course_release_missing');
    let release;
    try { release = assertCourseRelease(releaseSnap.data()); } catch { throw new HttpsError('data-loss', 'active_course_release_invalid'); }
    if (release.studyTarget !== input.studyTarget || release.learnerSourceLocale !== input.learnerSourceLocale || release.releaseId !== input.releaseId) throw new HttpsError('data-loss', 'active_course_release_identity_mismatch');
    const artifact = release.artifacts[input.surface];
    const index = await readImmutableJson(artifact.entryIndex, artifact.contentHash, artifact.objectGeneration);
    let unit;
    try { unit = resolveIndexedCourseUnit(index, input); } catch (error) {
      const message = error instanceof Error ? error.message : 'course_surface_index_invalid';
      throw new HttpsError(message === 'course_surface_entry_not_found' ? 'not-found' : 'data-loss', message);
    }
    const payload = await readImmutableJson(unit.objectPath, unit.contentHash, unit.objectGeneration);
    return { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, surface: input.surface, lessonId: input.lessonId, contentHash: unit.contentHash, payload };
  },
);
