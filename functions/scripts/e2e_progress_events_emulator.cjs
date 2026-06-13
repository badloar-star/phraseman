/**
 * END-TO-END emulator check for server-authoritative progress events.
 *
 * Runs against a live Firestore emulator only. This intentionally refuses to run
 * without FIRESTORE_EMULATOR_HOST, so it cannot touch production by accident.
 *
 * Usage:
 *   npm --prefix functions run build
 *   firebase emulators:exec --only firestore "node functions/scripts/e2e_progress_events_emulator.cjs"
 */
const admin = require('firebase-admin');
const {
  applyProgressEvent,
  buildMigrationPatch,
  normalizeProgressEvent,
} = require('../lib/progress_events');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set.');
  process.exit(2);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'phraseman-progress-emu' });
const db = admin.firestore();

let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

async function deleteCollection(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  if (!snap.empty) await batch.commit();
}

async function wipe() {
  await deleteCollection('users');
}

async function migrateSnapshot(stableUid, authUid, snapshot) {
  const userRef = db.collection('users').doc(stableUid);
  const migrationRef = userRef.collection('progress_migrations').doc('client_snapshot_v1');
  return db.runTransaction(async (tx) => {
    const [userSnap, migrationSnap] = await Promise.all([tx.get(userRef), tx.get(migrationRef)]);
    if (migrationSnap.exists) return { ok: true, migrated: false };
    const existing = userSnap.data()?.progress || {};
    const patch = buildMigrationPatch(snapshot, existing, new Date('2026-06-13T12:00:00.000Z'));
    tx.set(userRef, {
      progress: patch,
      firebaseAuthUid: authUid,
      progressServerAuthoritative: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(migrationRef, {
      migrated: true,
      keys: Object.keys(patch).sort(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, migrated: true, keys: Object.keys(patch).sort() };
  });
}

async function submitEvent(stableUid, authUid, rawEvent) {
  const event = normalizeProgressEvent(rawEvent);
  const userRef = db.collection('users').doc(stableUid);
  const ledgerRef = userRef.collection('progress_events').doc(event.eventId.replace(/[^\w.:-]/g, '_').slice(0, 180));
  return db.runTransaction(async (tx) => {
    const [userSnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)]);
    if (ledgerSnap.exists) {
      return { ...ledgerSnap.data().result, duplicate: true };
    }
    const progress = userSnap.data()?.progress || {};
    const applied = applyProgressEvent(progress, event, new Date('2026-06-13T12:00:00.000Z'));
    const result = {
      ok: true,
      stableUid,
      eventId: applied.eventId,
      type: applied.type,
      duplicate: false,
      xpDelta: applied.xpDelta,
      totalXp: applied.totalXp,
      level: applied.level,
      streakCount: applied.streakCount,
      activeDate: applied.activeDate,
      weekKey: applied.weekKey,
      weekXp: applied.weekXp,
    };
    tx.set(userRef, {
      progress: applied.progressPatch,
      firebaseAuthUid: authUid,
      progressServerAuthoritative: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(ledgerRef, {
      eventId: event.eventId,
      type: event.type,
      payload: event.payload,
      result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return result;
  });
}

async function scenarioMigrationIsMonotonicAndIdempotent() {
  console.log('\n[1] migration: monotonic + idempotent');
  await wipe();
  await db.collection('users').doc('stable-progress').set({
    firebaseAuthUid: 'auth-progress',
    progress: {
      user_total_xp: '1000',
      streak_count: '6',
      unlocked_lessons: '[1,4]',
      lesson4_best_score: '5',
      lesson4_progress: JSON.stringify(['correct']),
    },
  });

  const first = await migrateSnapshot('stable-progress', 'auth-progress', {
    user_total_xp: '900',
    weekly_xp: '55',
    streak_count: '4',
    last_active_date: '2026-06-13',
    unlocked_lessons: '[1,2,3]',
    lesson4_best_score: '4',
    lesson4_progress: JSON.stringify(['correct', 'correct']),
  });
  const second = await migrateSnapshot('stable-progress', 'auth-progress', {
    user_total_xp: '9999',
    weekly_xp: '9999',
  });
  const data = (await db.collection('users').doc('stable-progress').get()).data();
  const progress = data.progress || {};

  check('first migration writes once', first.migrated === true, first);
  check('second migration is skipped', second.migrated === false, second);
  check('XP was not lowered or overwritten by second migration', progress.user_total_xp === '1000', progress.user_total_xp);
  check('weekly XP migrated', progress.weekly_xp === '55', progress.weekly_xp);
  check('lesson progress used better local snapshot', progress.lesson4_progress === JSON.stringify(['correct', 'correct']), progress.lesson4_progress);
  check('best score stayed max', progress.lesson4_best_score === '5', progress.lesson4_best_score);
}

async function scenarioLedgerPreventsDuplicateXp() {
  console.log('\n[2] event ledger: duplicate event does not double XP');
  await wipe();
  await db.collection('users').doc('stable-ledger').set({
    firebaseAuthUid: 'auth-ledger',
    progress: { user_total_xp: '100' },
  });

  const event = {
    eventId: 'lesson:answer:dedupe-1',
    type: 'lesson_answer',
    clientLocalDate: '2026-06-13',
    payload: { xpDelta: 10 },
  };
  const [first, second] = await Promise.all([
    submitEvent('stable-ledger', 'auth-ledger', event),
    submitEvent('stable-ledger', 'auth-ledger', event),
  ]);
  const progress = (await db.collection('users').doc('stable-ledger').get()).data().progress;
  const duplicates = [first, second].filter((r) => r.duplicate).length;

  check('one call reports duplicate', duplicates === 1, [first, second]);
  check('XP increased once only', progress.user_total_xp === '110', progress.user_total_xp);
}

async function scenarioConcurrentDistinctEventsAccumulate() {
  console.log('\n[3] concurrent events: distinct eventIds accumulate');
  await wipe();
  await db.collection('users').doc('stable-concurrent').set({
    firebaseAuthUid: 'auth-concurrent',
    progress: { user_total_xp: '0' },
  });

  await Promise.all([
    submitEvent('stable-concurrent', 'auth-concurrent', {
      eventId: 'quiz:answer:concurrent-a',
      type: 'quiz_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 10 },
    }),
    submitEvent('stable-concurrent', 'auth-concurrent', {
      eventId: 'review:answer:concurrent-b',
      type: 'review_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 15 },
    }),
  ]);
  const progress = (await db.collection('users').doc('stable-concurrent').get()).data().progress;
  const events = await db.collection('users').doc('stable-concurrent').collection('progress_events').get();

  check('both ledger rows exist', events.size === 2, events.size);
  check('XP accumulated from both events', progress.user_total_xp === '25', progress.user_total_xp);
  check('weekly XP accumulated from both events', progress.weekly_xp === '25', progress.weekly_xp);
}

async function scenarioCompletionFieldsAreServerOwned() {
  console.log('\n[4] completion fields: lesson/exam written by event');
  await wipe();
  await db.collection('users').doc('stable-complete').set({
    firebaseAuthUid: 'auth-complete',
    progress: {},
  });

  await submitEvent('stable-complete', 'auth-complete', {
    eventId: 'lesson:fr:7:complete:emu',
    type: 'lesson_complete',
    clientLocalDate: '2026-06-13',
    payload: {
      studyTarget: 'fr',
      lessonId: 7,
      score: 4.5,
      passed: true,
      progress: ['correct', 'correct'],
      xpDelta: 0,
    },
  });
  await submitEvent('stable-complete', 'auth-complete', {
    eventId: 'exam:en:a1:complete:emu',
    type: 'exam_complete',
    clientLocalDate: '2026-06-13',
    payload: {
      studyTarget: 'en',
      level: 'A1',
      pct: 88,
      passed: true,
      xpDelta: 0,
    },
  });

  const progress = (await db.collection('users').doc('stable-complete').get()).data().progress;
  check('French lesson pass count written', progress['lesson_progress_v2::fr::lesson7_pass_count'] === '1', progress);
  check('French lesson progress written', progress['lesson_progress_v2::fr::7'] === JSON.stringify(['correct', 'correct']), progress);
  check('English exam passed written', progress.level_exam_A1_passed === 'true', progress);
  check('English exam pass count written', progress.level_exam_A1_pass_count === '1', progress);
}

async function main() {
  await scenarioMigrationIsMonotonicAndIdempotent();
  await scenarioLedgerPreventsDuplicateXp();
  await scenarioConcurrentDistinctEventsAccumulate();
  await scenarioCompletionFieldsAreServerOwned();

  console.log(`\n${failures === 0 ? 'ALL PROGRESS E2E CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('E2E crashed:', error);
  process.exit(3);
});
