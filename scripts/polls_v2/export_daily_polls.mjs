import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { firestoreForProject, projectArg } from './firebase_admin.mjs';

const projectId = projectArg();
const outArg = process.argv.slice(2).find((arg) => arg.startsWith('--out='))?.slice(6);
const output = path.resolve(outArg || 'docs/work/polls-export-1018/daily_polls.json');
const db = firestoreForProject(projectId);
const snapshot = await db.collection('daily_polls').orderBy('__name__').get();
const polls = [];

for (const document of snapshot.docs) {
  const votes = await document.ref.collection('votes').orderBy('__name__').get();
  polls.push({ id: document.id, data: document.data(), votes: votes.docs.map((vote) => ({ id: vote.id, data: vote.data() })) });
}

const payload = { schema: 'phraseman.daily_polls.export.v1', projectId, exportedAt: new Date().toISOString(), polls };
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ok: true, projectId, polls: polls.length, votes: polls.reduce((sum, poll) => sum + poll.votes.length, 0), output }));
