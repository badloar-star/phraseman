#!/usr/bin/env node

const MAX_MODES = new Set(['voice_tutor', 'voice_call']);
const PRIVATE_FIELDS = Object.freeze([
  'uid', 'authUid', 'stableUid', 'ageBracket', 'ageEvidence', 'matched',
  'userText', 'historyContext', 'transcript', 'note', 'message', 'context',
  'sessionId', 'retainUntilMs', 'retentionReason',
  'handledBy', 'handledReason', 'handledOperationId',
]);

export function maxVoiceSafetyScrubPlan(row) {
  const data = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  return {
    applicable: MAX_MODES.has(String(data.mode ?? '')),
    deleteFields: PRIVATE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field)),
  };
}

function argValue(name) {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : '';
}

function printHelp() {
  process.stdout.write(
    'Usage:\n' +
    '  node scripts/scrub_max_voice_safety_flags.mjs --project=<firebase-project>\n' +
    '  node scripts/scrub_max_voice_safety_flags.mjs --project=<firebase-project> --apply --confirm-project=<same-project>\n\n' +
    'Default: DRY RUN. Output contains counts only; document IDs and content are never printed.\n',
  );
}

async function runMigration() {
  const apply = process.argv.includes('--apply');
  const projectId = argValue('--project');
  const confirmedProjectId = argValue('--confirm-project');
  if (!projectId) throw new Error('--project=<firebase-project> is required');
  if (apply && confirmedProjectId !== projectId) {
    throw new Error('--apply requires --confirm-project=<same-project>');
  }

  const [{ initializeApp }, { FieldPath, FieldValue, getFirestore }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore'),
  ]);
  const db = getFirestore(initializeApp({ projectId }));
  let scanned = 0;
  let matched = 0;
  let scrubbed = 0;
  let last = null;

  for (;;) {
    let query = db.collection('safety_flags')
      .where('mode', 'in', [...MAX_MODES])
      .orderBy(FieldPath.documentId())
      .limit(250);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    scanned += snapshot.size;
    const updates = [];
    for (const document of snapshot.docs) {
      const plan = maxVoiceSafetyScrubPlan(document.data());
      if (!plan.applicable) continue;
      matched += 1;
      if (plan.deleteFields.length === 0) continue;
      scrubbed += 1;
      updates.push({ ref: document.ref, fields: plan.deleteFields });
    }
    if (apply && updates.length > 0) {
      const batch = db.batch();
      for (const update of updates) {
        batch.update(update.ref, Object.fromEntries(update.fields.map((field) => [field, FieldValue.delete()])));
      }
      await batch.commit();
    }
    last = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 250) break;
  }

  process.stdout.write(`${apply ? 'APPLY' : 'DRY RUN'} complete: scanned=${scanned} maxRows=${matched} rowsToScrub=${scrubbed}\n`);
}

const transformIndex = process.argv.indexOf('--transform-json');
if (transformIndex >= 0) {
  const row = JSON.parse(process.argv[transformIndex + 1] ?? '{}');
  process.stdout.write(`${JSON.stringify(maxVoiceSafetyScrubPlan(row))}\n`);
} else if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
} else {
  await runMigration().catch((error) => {
    process.stderr.write(`MAX safety scrub failed: ${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  });
}
