import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const isPublishedVideoPack = (id, data) => /^video_[A-Za-z0-9_-]{11}$/.test(id)
  && /^[A-Za-z0-9_-]{11}$/.test(String(data?.videoId ?? ''))
  && id === `video_${data.videoId}` && data.listingStatus === 'published';

export async function migrateVideoPackListingStatus({ apply = false, exportPath } = {}) {
  const require = createRequire(import.meta.url);
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'phraseman-ea0b3' }, `video-status-${Date.now()}`);
  try {
    const db = app.firestore();
    const field = admin.firestore.FieldPath.documentId();
    const docs = [];
    let cursor;
    do {
      let query = db.collection('community_packs').orderBy(field).startAt('video_').endBefore('video`').limit(250);
      if (cursor) query = db.collection('community_packs').orderBy(field).startAfter(cursor).endBefore('video`').limit(250);
      const page = await query.get();
      docs.push(...page.docs);
      cursor = page.size === 250 ? page.docs[page.size - 1] : null;
    } while (cursor);
    const output = path.resolve(exportPath ?? `docs/work/video-packs-export-1018/export-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const backup = { projectId: 'phraseman-ea0b3', exportedAt: new Date().toISOString(), documents: docs.map((doc) => ({ path: doc.ref.path, updateTime: doc.updateTime.toDate().toISOString(), data: doc.data() })) };
    fs.writeFileSync(output, JSON.stringify(backup, null, 2) + '\n', { flag: 'wx' });
    const verified = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (verified.documents.length !== docs.length) throw new Error('export verification failed');
    const eligible = docs.filter((doc) => isPublishedVideoPack(doc.id, doc.data()));
    console.log(`[VIDEO-STATUS] exported=${docs.length} eligible=${eligible.length} apply=${apply} file=${output}`);
    let changed = 0;
    if (apply) {
      for (const doc of eligible) {
        // Update-time precondition prevents changing a pack edited after export.
        await doc.ref.update({ listingStatus: 'published_video' }, { lastUpdateTime: doc.updateTime });
        const actual = await doc.ref.get();
        if (actual.data()?.listingStatus !== 'published_video') throw new Error(`readback failed: ${doc.id}`);
        changed += 1;
      }
    }
    console.log(`[VIDEO-STATUS] complete changed=${changed}`);
    return { exported: docs.length, eligible: eligible.length, changed, exportPath: output };
  } finally {
    await app.delete();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  migrateVideoPackListingStatus({ apply: process.argv.includes('--apply') }).catch((error) => {
    console.error('[VIDEO-STATUS] failed', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
