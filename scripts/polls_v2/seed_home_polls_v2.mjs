import { readFile } from 'node:fs/promises';

import { firestoreForProject, hasArg, projectArg } from './firebase_admin.mjs';

const projectId = projectArg();
const apply = hasArg('--apply');
if (apply && !hasArg('--confirm=SEED_HOME_POLLS_V2')) throw new Error('Apply requires --confirm=SEED_HOME_POLLS_V2.');
const catalog = JSON.parse(await readFile(new URL('../../content/polls/home_polls_v2.json', import.meta.url), 'utf8'));
if (!Array.isArray(catalog.sets) || catalog.sets.length !== 100) throw new Error('Expected exactly 100 poll sets.');
const questions = catalog.sets.reduce((sum, set) => sum + (Array.isArray(set.questions) ? set.questions.length : 0), 0);
if (questions !== 230) throw new Error(`Expected 230 questions, got ${questions}.`);

if (!apply) {
  console.log(JSON.stringify({ ok: true, dryRun: true, projectId, sets: catalog.sets.length, questions }));
  process.exit(0);
}

const db = firestoreForProject(projectId);
let created = 0;
let unchanged = 0;
for (const set of catalog.sets) {
  const ref = db.collection('home_polls_v2').doc(set.id);
  const outcome = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    const incomingShape = set.questions.map((question) => ({ id: question.id, options: question.options.map((option) => option.id) }));
    if (existing.exists) {
      const current = existing.data() || {};
      const currentShape = (Array.isArray(current.questions) ? current.questions : []).map((question) => ({
        id: question.id,
        options: (Array.isArray(question.options) ? question.options : []).map((option) => option.id),
      }));
      if (JSON.stringify(currentShape) !== JSON.stringify(incomingShape)) throw new Error(`Existing set ${set.id} has a different immutable question/option shape.`);
      return 'unchanged';
    }
    const counts = Object.fromEntries(set.questions.map((question) => [question.id, Object.fromEntries(question.options.map((option) => [option.id, 0]))]));
    const voteCounts = Object.fromEntries(set.questions.map((question) => [question.id, 0]));
    transaction.create(ref, { ...set, status: 'active', counts, voteCounts, schemaVersion: 2, createdAtMs: Date.now() });
    return 'created';
  });
  if (outcome === 'created') created += 1;
  else unchanged += 1;
}
console.log(JSON.stringify({ ok: true, dryRun: false, projectId, created, unchanged, sets: catalog.sets.length, questions }));
