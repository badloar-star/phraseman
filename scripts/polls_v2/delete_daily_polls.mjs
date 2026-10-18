import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { firestoreForProject, hasArg, projectArg } from './firebase_admin.mjs';

const projectId = projectArg();
const apply = hasArg('--apply');
const exportArg = process.argv.slice(2).find((arg) => arg.startsWith('--export='))?.slice('--export='.length);
if (!exportArg) throw new Error('Pass --export=<path-to-export.json>.');
const exportPath = path.resolve(exportArg);
await access(exportPath);
const archive = JSON.parse(await readFile(exportPath, 'utf8'));
if (archive.schema !== 'phraseman.daily_polls.export.v1' || archive.projectId !== projectId || !Array.isArray(archive.polls)) {
  throw new Error('Export does not match the requested project or schema.');
}
if (apply && !hasArg('--confirm=DELETE_DAILY_POLLS_AFTER_EXPORT')) throw new Error('Apply requires --confirm=DELETE_DAILY_POLLS_AFTER_EXPORT.');

const db = firestoreForProject(projectId);
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const sameData = (left, right) => JSON.stringify(canonical(JSON.parse(JSON.stringify(left)))) === JSON.stringify(canonical(right));
const exportedById = new Map(archive.polls.map((poll) => [poll.id, poll]));

async function readAndVerifyExact() {
  const snapshot = await db.collection('daily_polls').orderBy('__name__').get();
  const currentIds = snapshot.docs.map((document) => document.id);
  const exportedIds = archive.polls.map((poll) => poll.id).sort();
  if (JSON.stringify(currentIds) !== JSON.stringify(exportedIds)) throw new Error(`Current daily_polls ids differ from export; current=${currentIds.length}, export=${exportedIds.length}. Re-export before deletion.`);
  let votes = 0;
  for (const document of snapshot.docs) {
    const exported = exportedById.get(document.id);
    if (!exported || !sameData(document.data(), exported.data)) throw new Error(`Poll ${document.id} changed after export. Re-export before deletion.`);
    const voteSnapshot = await document.ref.collection('votes').orderBy('__name__').get();
    const currentVotes = voteSnapshot.docs.map((vote) => ({ id: vote.id, data: vote.data() }));
    const exportedVotes = [...exported.votes].sort((a, b) => a.id.localeCompare(b.id));
    if (currentVotes.length !== exportedVotes.length || currentVotes.some((vote, index) => vote.id !== exportedVotes[index]?.id || !sameData(vote.data, exportedVotes[index]?.data))) {
      throw new Error(`Votes for ${document.id} changed after export. Re-export before deletion.`);
    }
    votes += currentVotes.length;
  }
  return { snapshot, votes };
}

const verified = await readAndVerifyExact();
const summary = { projectId, dryRun: !apply, documents: verified.snapshot.size, votes: verified.votes, verifiedExport: exportPath };
if (!apply) {
  console.log(JSON.stringify({ ok: true, ...summary }));
  process.exit(0);
}

// Fence every exported poll first. dailyPollVote updates the parent counter in
// the same transaction, so this write conflicts with an in-flight vote; its retry
// then sees archived and cannot create an unexported vote during deletion.
for (const document of verified.snapshot.docs) {
  const exported = exportedById.get(document.id);
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(document.ref);
    const votes = await transaction.get(document.ref.collection('votes').orderBy('__name__'));
    if (!current.exists || !sameData(current.data(), exported.data)) throw new Error(`Poll ${document.id} changed before fencing.`);
    const currentVotes = votes.docs.map((vote) => ({ id: vote.id, data: vote.data() }));
    const exportedVotes = [...exported.votes].sort((a, b) => a.id.localeCompare(b.id));
    if (currentVotes.length !== exportedVotes.length || currentVotes.some((vote, index) => vote.id !== exportedVotes[index]?.id || !sameData(vote.data, exportedVotes[index]?.data))) {
      throw new Error(`Votes for ${document.id} changed before fencing.`);
    }
    transaction.update(document.ref, { status: 'archived', pollsV2DeletionFenceAtMs: Date.now() });
  });
}

// Delete only the exported votes. Never recursiveDelete: an unknown/new
// subcollection is outside this migration's authority and must survive untouched.
for (const document of verified.snapshot.docs) {
  const exported = exportedById.get(document.id);
  const votes = await document.ref.collection('votes').orderBy('__name__').get();
  const exportedVotes = [...exported.votes].sort((a, b) => a.id.localeCompare(b.id));
  if (votes.size !== exportedVotes.length || votes.docs.some((vote, index) => vote.id !== exportedVotes[index]?.id || !sameData(vote.data(), exportedVotes[index]?.data))) {
    throw new Error(`Votes for ${document.id} changed after fencing; deletion stopped.`);
  }
  for (let index = 0; index < votes.docs.length; index += 400) {
    const batch = db.batch();
    for (const vote of votes.docs.slice(index, index + 400)) batch.delete(vote.ref, { lastUpdateTime: vote.updateTime });
    await batch.commit();
  }
  const remaining = await document.ref.collection('votes').limit(1).get();
  if (!remaining.empty) throw new Error(`Unexpected vote remained under ${document.id}; parent retained.`);
  const fenced = await document.ref.get();
  if (!fenced.exists || fenced.data()?.status !== 'archived' || !fenced.data()?.pollsV2DeletionFenceAtMs) throw new Error(`Fence missing for ${document.id}; parent retained.`);
  await document.ref.delete({ lastUpdateTime: fenced.updateTime });
}
const remainingParents = await db.collection('daily_polls').limit(1).get();
if (!remainingParents.empty) throw new Error('daily_polls still contains documents; deletion stopped with evidence retained.');
console.log(JSON.stringify({ ok: true, ...summary, dryRun: false, deleted: verified.snapshot.size }));
