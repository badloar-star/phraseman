/** Read-only CLI. Do not import into deployed index.ts. No builder/publisher invocation. */
import * as admin from 'firebase-admin';
import { inspectStepRecordReadiness } from './spire_floor_record_readiness';
import { loadListenDraftPool, loadMultilingualPool, loadPool, spirePublicationForLang, spirePackWeekIdAt } from './spire_pack_build';
import { floorRecordServerEnabled } from './spire_floor_record_gate';
import { SPIRE_LANGS, type SpireLang } from './spire_progress_contract';
import { SPIRE_FLOOR_RECORD_ENABLED } from '../../app/spire/spire_floor_record_flag';
import type { TournamentTask } from './tournament_core';
import type { SpirePackSource } from './spire_pack_contract';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const option = (key: string, fallback: string): string => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1] ?? fallback; };
  const projectId = option('--project', 'phraseman-ea0b3');
  const bucketName = option('--bucket', 'phraseman-ea0b3.firebasestorage.app');
  const weekId = option('--week', spirePackWeekIdAt(Date.now()));
  const langsText = option('--langs', 'en,es,de,fr,it');
  const langs = langsText.split(',').filter((s): s is SpireLang => SPIRE_LANGS.includes(s as SpireLang));
  const tiers = option('--tiers', 'all') === 'all' ? Array.from({ length: 12 }, (_, i) => i)
    : option('--tiers', 'all').split(',').map(Number).filter(t => Number.isInteger(t) && t >= 0 && t <= 11);
  if (!/^\d{4}-W\d{2}$/.test(weekId) || !langs.length || !tiers.length) throw new Error('readiness_args_invalid');
  const app = admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId, storageBucket: bucketName }, 'spire-record-readiness');
  const db = app.firestore();
  db.settings({ preferRest: true });
  const bucket = app.storage().bucket();
  try {
    const [config, arena] = await Promise.all([db.doc('config/spire_v1').get(), db.doc('arena_v2_config/current').get()]);
    console.log(JSON.stringify({ mode: 'READ_ONLY', projectId, bucket: bucketName, weekId,
      sourceAuthorityReady: floorRecordServerEnabled({ floorRecordsEnabled: true }), clientSourceEnabled: SPIRE_FLOOR_RECORD_ENABLED,
      remoteEnabled: config.data()?.floorRecordsEnabled === true, networkWrites: 0,
      firestoreEmulator: !!process.env.FIRESTORE_EMULATOR_HOST, storageEmulator: !!process.env.STORAGE_EMULATOR_HOST }));
    type Canonical = { source: Omit<SpirePackSource, 'poolTaskCount'>; tasks: readonly TournamentTask[] };
    // Bounded to at most the five requested languages; one verified pool load per language.
    const pools = new Map<SpireLang, Promise<Canonical>>();
    const readCanonical = (lang: SpireLang): Promise<Canonical> => {
      let entry = pools.get(lang);
      if (!entry) {
        entry = (async () => {
          const resolved = spirePublicationForLang(arena.data(), lang);
          if (resolved.ok) {
            const pool = await loadPool(db, resolved.publication, lang);
            return { source: { poolVersion: resolved.publication.poolVersion, publicationFingerprint: resolved.publication.publicationFingerprint,
              legacyPool: resolved.publication.legacy === true }, tasks: [...pool.tasks, ...loadListenDraftPool(lang).tasks] };
          }
          if (lang === 'en') throw new Error('canonical_publication_unavailable');
          const pool = loadMultilingualPool(lang);
          if (!pool.tasks.length) throw new Error('canonical_publication_unavailable');
          return { source: { poolVersion: `spire-multilingual-direct-${lang}`, publicationFingerprint: 'spire-multilingual-direct', legacyPool: false }, tasks: pool.tasks };
        })();
        pools.set(lang, entry);
      }
      return entry;
    };
    const readObject = async (path: string): Promise<Buffer | null> => {
      try { const [bytes] = await bucket.file(path).download(); return bytes; }
      catch (error) { if (Number((error as { code?: unknown })?.code) === 404) return null; throw error; }
    };
    const counts: Record<string, number> = {};
    for (const lang of langs) for (const tier of tiers) {
      const row = await inspectStepRecordReadiness({ lang, tier, weekId }, {
        readPublic: readObject, readPrivate: readObject, readCanonical: () => readCanonical(lang),
      });
      // Don't print arbitrary provider error messages, credentials or task contents.
      if (row.reason && !/^(record_verifier_|canonical_)[a-z_]+$/.test(row.reason)) {
        console.log(JSON.stringify({ ...row, reason: 'read_failed' }));
      } else console.log(JSON.stringify(row));
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    console.log(JSON.stringify({ summary: counts, networkWrites: 0, canonicalLanguagesRead: pools.size }));
  } finally {
    await app.delete();
  }
}

if (require.main === module) main().catch(() => {
  console.log(JSON.stringify({ mode: 'READ_ONLY', status: 'AUTH_OR_READ_UNAVAILABLE', networkWrites: 0 }));
  process.exitCode = 1;
});
