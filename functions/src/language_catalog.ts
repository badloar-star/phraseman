import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { buildActiveLanguageCatalogEntries } from './content_factory/language_catalog_builder';

const REGION = 'us-central1';

export const getActiveLanguageCatalog = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
    const db = admin.firestore();
    const snapshot = await db.collection('content_factory_catalog').get();
    const catalogs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));
    const releaseIds = [...new Set(catalogs.map((doc) => {
      const active = doc.data.activeRelease;
      return active && typeof active === 'object' && !Array.isArray(active) && typeof (active as Record<string, unknown>).releaseId === 'string' ? String((active as Record<string, unknown>).releaseId) : '';
    }).filter(Boolean))];
    const releaseSnaps = releaseIds.length > 0 ? await db.getAll(...releaseIds.map((id) => db.collection('content_factory_releases').doc(id))) : [];
    const releasesById = new Map(releaseSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));
    const canonicalEntries = buildActiveLanguageCatalogEntries(catalogs, releasesById);
    const legacyEntries = snapshot.docs
      .flatMap((doc) => {
        const data = doc.data();
        const surfaces = data.activeSurfaces && typeof data.activeSurfaces === 'object' ? data.activeSurfaces as Record<string, unknown> : {};
        return Object.entries(surfaces).flatMap(([surface, value]) => {
          const active = value as Record<string, unknown>;
          if (!active || typeof active.studyTarget !== 'string' || typeof active.packId !== 'string' || typeof active.revision !== 'number' || typeof active.contentHash !== 'string') return [];
          return [{ surface, studyTarget: active.studyTarget, packId: active.packId, revision: active.revision, contentHash: active.contentHash, sourceLocale: typeof active.sourceLocale === 'string' ? active.sourceLocale : null, canonicalRelease: false }];
        });
      });
    const byIdentity = new Map<string, (typeof canonicalEntries)[number] | (typeof legacyEntries)[number]>();
    legacyEntries.forEach((entry) => byIdentity.set(`${entry.studyTarget}:${entry.sourceLocale ?? ''}:${entry.surface}`, entry));
    canonicalEntries.forEach((entry) => byIdentity.set(`${entry.studyTarget}:${entry.sourceLocale}:${entry.surface}`, entry));
    return {
      entries: [...byIdentity.values()],
      fetchedAt: new Date().toISOString(),
    };
  },
);
