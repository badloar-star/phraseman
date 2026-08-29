// зачем (аудит 2026-08-29): обратный индекс исходящих заявок никогда не
// записывался — маркер `__index__` был зарезервированным id и падал ещё в
// .doc(). Из-за пустого индекса каждое удаление аккаунта шло аварийным полным
// перебором: 4 923 users × 4 getAll ≈ 20 142 запроса и ~6 минут.
//
// Скрипт разово достраивает индекс по живым данным: входящая заявка лежит в
// users/{toUid}/friend_requests/{fromUid} — значит отправителю кладём
// users/{fromUid}/friend_requests_sent/{toUid} и маркер marker.index.
// Маркер ставится ВСЕМ пользователям: после этого collect_peers всегда верит
// узкому пути, а страховочный полный перебор больше не нужен.
//
// Идемпотентно: set с merge, повторный прогон ничего не ломает.
// Запуск: node scripts/backfill_friend_requests_sent_index.cjs [--dry]
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('../service-account.json')) });
const db = admin.firestore();

const MARKER_ID = 'marker.index'; // shared/friend_requests_index_contract.ts
const DRY = process.argv.includes('--dry');
const log = (s, d) => console.log(`[BACKFILL-SENT] ${s} ${JSON.stringify(d)}`);

async function main() {
  const startedAt = Date.now();
  let usersSeen = 0, requestsSeen = 0, sentWritten = 0, markersWritten = 0, batchOps = 0;
  let batch = db.batch();
  const flush = async (force = false) => {
    if (batchOps === 0) return;
    if (!force && batchOps < 400) return;
    if (!DRY) await batch.commit();
    batch = db.batch(); batchOps = 0;
  };

  let last = null;
  for (;;) {
    let q = db.collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(300);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;

    for (const userDoc of page.docs) {
      usersSeen += 1;
      const toUid = userDoc.id;

      // Маркер владельцу страницы: «индекс ведётся» — теперь это правда,
      // потому что этот же прогон достраивает все его исходящие ниже.
      batch.set(
        db.collection('users').doc(toUid).collection('friend_requests_sent').doc(MARKER_ID),
        { createdAt: Date.now() },
        { merge: true },
      );
      batchOps += 1; markersWritten += 1;

      const requests = await userDoc.ref.collection('friend_requests').get();
      for (const reqDoc of requests.docs) {
        const fromUid = String(reqDoc.id || '').trim();
        if (!fromUid || fromUid === MARKER_ID || fromUid === toUid) continue;
        requestsSeen += 1;
        const createdAtRaw = reqDoc.data()?.createdAt;
        const createdAt = typeof createdAtRaw === 'number' && Number.isFinite(createdAtRaw)
          ? createdAtRaw : Date.now();
        batch.set(
          db.collection('users').doc(fromUid).collection('friend_requests_sent').doc(toUid),
          { toUid, createdAt },
          { merge: true },
        );
        batchOps += 1; sentWritten += 1;
        // Отправитель тоже получает маркер — его страница могла идти раньше.
        batch.set(
          db.collection('users').doc(fromUid).collection('friend_requests_sent').doc(MARKER_ID),
          { createdAt: Date.now() },
          { merge: true },
        );
        batchOps += 1; markersWritten += 1;
      }
      await flush();
    }
    last = page.docs[page.docs.length - 1].id;
    log('page', { usersSeen, requestsSeen, sentWritten, cursor: last.slice(0, 8) });
  }
  await flush(true);
  log('done', {
    dry: DRY, usersSeen, requestsSeen, sentWritten, markersWritten,
    tookMs: Date.now() - startedAt,
  });
}

main().catch((e) => { console.error('[BACKFILL-SENT] FATAL', e.message); process.exit(1); });
