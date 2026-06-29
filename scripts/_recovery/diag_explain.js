// READ-ONLY diagnostic for the "Не получилось подготовить объяснение" fallback.
// Checks: explain kill-switch + cap, today's global budget usage, and recent rejected phrases.
// Changes NOTHING. Run: node scripts/_recovery/diag_explain.js
const admin = require('firebase-admin');
const path = require('path');
const SA = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(SA) });
const db = admin.firestore();

(async () => {
  // 1. job config (kill-switch + cap)
  const cfg = await db.collection('admin_runtime_config').doc('openai_jobs').get();
  const data = cfg.exists ? cfg.data() : null;
  console.log('=== admin_runtime_config/openai_jobs ===');
  console.log('exists:', cfg.exists);
  if (data) console.log('explain entry:', JSON.stringify(data.explain ?? '(none → defaults: model gpt-4o-mini, cap 3000, enabled true)'));

  // 2. explain cache: counts by status + recent rejected reasons
  const snap = await db.collection('phrase_explanations').get();
  const byStatus = {};
  const rejected = [];
  snap.forEach((d) => {
    const x = d.data();
    byStatus[x.status] = (byStatus[x.status] || 0) + 1;
    if (x.status === 'rejected') rejected.push({ id: d.id, reason: x.reason, lang: x.lang, phraseEn: x.phraseEn, at: x.rejectedAtMs || x.updatedAtMs });
  });
  console.log('\n=== phrase_explanations: total', snap.size, '===');
  console.log('by status:', JSON.stringify(byStatus));
  console.log('rejected count:', rejected.length);
  rejected.sort((a, b) => (b.at || 0) - (a.at || 0));
  console.log('recent rejected (up to 15):');
  for (const r of rejected.slice(0, 15)) {
    console.log(`  [${r.reason}] "${r.phraseEn || r.id}" (${r.lang})`);
  }
  // reason histogram
  const reasons = {};
  rejected.forEach((r) => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
  console.log('rejected reasons histogram:', JSON.stringify(reasons));

  // 3. today's budget docs (best-effort: look for explain budget collection)
  const cols = await db.listCollections();
  const budgetCol = cols.map((c) => c.id).filter((id) => /explain.*budget|budget.*explain/i.test(id));
  console.log('\n=== budget collections found:', JSON.stringify(budgetCol), '===');
  process.exit(0);
})().catch((e) => { console.error('DIAG ERROR:', e.message); process.exit(1); });
