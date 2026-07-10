import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';

export const getActiveLanguageCatalog = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
    const snapshot = await admin.firestore().collection('content_factory_catalog').get();
    return {
      entries: snapshot.docs
        .flatMap((doc) => {
          const data = doc.data();
          const surfaces = data.activeSurfaces && typeof data.activeSurfaces === 'object' ? data.activeSurfaces as Record<string, unknown> : {};
          return Object.entries(surfaces).flatMap(([surface, value]) => {
            const active = value as Record<string, unknown>;
            if (!active || typeof active.studyTarget !== 'string' || typeof active.packId !== 'string' || typeof active.revision !== 'number' || typeof active.contentHash !== 'string') return [];
            return [{ surface, studyTarget: active.studyTarget, packId: active.packId, revision: active.revision, contentHash: active.contentHash, sourceLocale: typeof active.sourceLocale === 'string' ? active.sourceLocale : null }];
          });
        })
        .filter((entry) => entry !== null),
      fetchedAt: new Date().toISOString(),
    };
  },
);
