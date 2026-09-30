import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('friends batch and selected player carry only the projected coin rank', () => {
  const batch = read('app/friends_profiles_batch.ts');
  const friends = read('app/(tabs)/friends.tsx');

  assert.match(batch, /coinRank\?: number \| null/);
  assert.match(friends, /coinRank: isValidCoinRank\(rec\.coinRank\) \? rec\.coinRank : null/);
  assert.match(friends, /coinRank: profile\.coinRank/);
});

test('friends callable reads public_profiles and fail-closes hidden or deleted targets', () => {
  const server = read('functions/src/friends_profiles.ts');
  const authorization = server.slice(
    server.indexOf('async function authorizedProfileUids'),
    server.indexOf('function responseForRequestedUids'),
  );

  assert.match(server, /collection\('public_profiles'\)\.doc\(uid\)/);
  assert.match(server, /collection\('account_deletion_tombstones'\)\.doc\(uid\)/);
  assert.match(server, /identityHidden === true/);
  assert.match(server, /coinRank/);
  assert.match(authorization, /collection\('users'\)\.doc\(friendUid\)/);
  assert.match(authorization, /collection\('account_deletion_tombstones'\)\.doc\(friendUid\)/);
  assert.match(authorization, /identityHidden !== true/);
});
