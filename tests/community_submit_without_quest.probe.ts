import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'community_packs', 'functionsClient.ts'), 'utf8');
const start = source.indexOf('export async function callCommunitySubmitPackForReview');
const end = source.indexOf('export async function callCommunityAuthorRemovePack', start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);
const submit = source.slice(start, end);

assert.equal(submit.includes("await callFunction<typeof data, { submissionId: string }>('communitySubmitPackForReview', data)"), true);
assert.equal(submit.includes("import('../quests_client')"), false);
assert.equal(submit.includes('reportQuestProgress'), false);
assert.equal(submit.includes('return result;'), true);
