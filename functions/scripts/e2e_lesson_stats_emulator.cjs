/**
 * END-TO-END emulator check: lesson_stats aggregate written by the REAL
 * progressSubmitEvent callable (not a parallel reimplementation).
 *
 * зачем отдельный скрипт: e2e_progress_events_emulator.cjs строит свою
 * собственную упрощённую копию транзакции — она не вызывает
 * progressSubmitEvent и потому не проверяет мою правку внутри него.
 * Здесь вызывается настоящий экспортированный callable через .run(),
 * доступный у onCall()-обёрток firebase-functions v2, минуя HTTP-слой.
 *
 * Runs against a live Firestore emulator only.
 *
 * Usage:
 *   npm --prefix functions run build
 *   firebase emulators:exec --only firestore "node functions/scripts/e2e_lesson_stats_emulator.cjs"
 */
const admin = require('firebase-admin');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set.');
  process.exit(2);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'phraseman-lesson-stats-emu' });

const { progressSubmitEvent } = require('../lib/functions/src/progress_events');
const db = admin.firestore();

let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}`);
    if (detail !== undefined) console.log('        detail:', JSON.stringify(detail));
  }
}

async function call(authUid, data) {
  return progressSubmitEvent.run({ data, auth: { uid: authUid } });
}

async function main() {
  const authUid = 'auth-lesson-stats-emu';
  // зачем: progressSubmitEvent зовёт resolveStableUidForAuth(requireKnownIdentity: true) —
  // требует существующего users/{authUid}, иначе честно бросает stable_id_required.
  // Реальный клиент создаёт этот документ на регистрации; здесь эмулируем то же самое.
  await db.collection('users').doc(authUid).set({ createdAtTest: true, firebaseAuthUid: authUid });

  await call(authUid, {
    eventId: 'lesson:9:complete:1',
    type: 'lesson_complete',
    clientLocalDate: '2026-08-02',
    payload: { lessonId: 9, studyTarget: 'en', score: 4, passed: true, xpDelta: 0 },
  });

  let stats = (await db.collection('lesson_stats').doc('en_lesson9').get()).data();
  check('lesson_stats doc created after first lesson_complete', !!stats, stats);
  check('sampleCount is 1 after first sample', stats?.stats?.sampleCount === 1, stats);
  check('averageScore equals the single sample', stats?.stats?.averageScore === 4, stats);

  await call(authUid, {
    eventId: 'lesson:9:complete:2',
    type: 'lesson_complete',
    clientLocalDate: '2026-08-02',
    payload: { lessonId: 9, studyTarget: 'en', score: 2, passed: true, xpDelta: 0 },
  });

  stats = (await db.collection('lesson_stats').doc('en_lesson9').get()).data();
  check('sampleCount accumulates across calls', stats?.stats?.sampleCount === 2, stats);
  check('averageScore is the mean of both samples', stats?.stats?.averageScore === 3, stats);

  // Другой тип события (quiz_answer) не должен трогать lesson_stats вообще.
  await call(authUid, {
    eventId: 'quiz:answer:1',
    type: 'quiz_answer',
    clientLocalDate: '2026-08-02',
    payload: { lessonId: 9, score: 0, xpDelta: 0 },
  });
  stats = (await db.collection('lesson_stats').doc('en_lesson9').get()).data();
  check('non-lesson_complete events do not touch the aggregate', stats?.stats?.sampleCount === 2, stats);

  // Повтор того же eventId (идемпотентность ledger) не должен задвоить sampleCount.
  await call(authUid, {
    eventId: 'lesson:9:complete:1',
    type: 'lesson_complete',
    clientLocalDate: '2026-08-02',
    payload: { lessonId: 9, studyTarget: 'en', score: 4, passed: true, xpDelta: 0 },
  });
  stats = (await db.collection('lesson_stats').doc('en_lesson9').get()).data();
  check('duplicate eventId does not double-count the aggregate', stats?.stats?.sampleCount === 2, stats);

  // Разный studyTarget — разный документ, не смешивается.
  await call(authUid, {
    eventId: 'lesson:9:complete:fr:1',
    type: 'lesson_complete',
    clientLocalDate: '2026-08-02',
    payload: { lessonId: 9, studyTarget: 'fr', score: 5, passed: true, xpDelta: 0 },
  });
  const frStats = (await db.collection('lesson_stats').doc('fr_lesson9').get()).data();
  check('fr target writes a separate doc from en', frStats?.stats?.sampleCount === 1, frStats);
  const enStatsUnchanged = (await db.collection('lesson_stats').doc('en_lesson9').get()).data();
  check('en doc unaffected by fr write', enStatsUnchanged?.stats?.sampleCount === 2, enStatsUnchanged);

  console.log(`\n${failures === 0 ? 'ALL LESSON STATS E2E CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('E2E crashed:', error);
  process.exit(3);
});
