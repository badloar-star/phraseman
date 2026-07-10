import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  assertPublishedArtifactMatchesPointer,
  publishedArtifactDocId,
  validatePublishedLessonArtifact,
  type PublishedArtifactPointer,
  type PublishedLessonArtifact,
} from './content_factory/published_artifact';

const REGION = 'us-central1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface PublishedLessonRequest {
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly lessonId: number;
}

export function parsePublishedLessonRequest(data: unknown): PublishedLessonRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request required');
  const studyTarget = String(data.studyTarget ?? '').trim();
  const sourceLocale = String(data.sourceLocale ?? '').trim();
  const lessonId = Number(data.lessonId);
  if (!/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(sourceLocale) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) {
    throw new HttpsError('invalid-argument', 'studyTarget, sourceLocale and lessonId are invalid');
  }
  return Object.freeze({ studyTarget, sourceLocale, lessonId });
}

export const getPublishedLessonArtifact = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
    const input = parsePublishedLessonRequest(request.data);
    const db = admin.firestore();
    const catalogSnapshot = await db.collection('content_factory_catalog').doc(input.studyTarget).get();
    if (!catalogSnapshot.exists) throw new HttpsError('not-found', 'language_catalog_not_found');
    const catalog = catalogSnapshot.data() ?? {};
    const activeSurfaces = isRecord(catalog.activeSurfaces) ? catalog.activeSurfaces : {};
    const rawPointer = activeSurfaces.lessons;
    if (!isRecord(rawPointer)) throw new HttpsError('not-found', 'published_lessons_not_found');
    const pointer: PublishedArtifactPointer = {
      packId: String(rawPointer.packId ?? ''),
      studyTarget: String(rawPointer.studyTarget ?? ''),
      sourceLocale: String(rawPointer.sourceLocale ?? ''),
      revision: Number(rawPointer.revision),
      contentHash: String(rawPointer.contentHash ?? ''),
    };
    if (pointer.studyTarget !== input.studyTarget || pointer.sourceLocale !== input.sourceLocale) {
      throw new HttpsError('not-found', 'published_lessons_source_mismatch');
    }
    const artifactSnapshot = await db.collection('content_factory_published_artifacts').doc(publishedArtifactDocId(pointer.packId, input.lessonId)).get();
    if (!artifactSnapshot.exists) throw new HttpsError('not-found', 'published_lesson_not_found');
    const artifact = artifactSnapshot.data() as PublishedLessonArtifact;
    const validation = validatePublishedLessonArtifact(artifact);
    if (!validation.ok) throw new HttpsError('failed-precondition', `published_lesson_invalid:${validation.errors.join(',')}`);
    try {
      assertPublishedArtifactMatchesPointer(artifact, pointer);
    } catch {
      throw new HttpsError('failed-precondition', 'published_lesson_identity_mismatch');
    }
    return artifact;
  },
);
