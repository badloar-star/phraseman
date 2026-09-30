import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (...parts) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

test('storage readers expose additive ready/stale results and keep legacy array APIs', () => {
  const marketplace = read('app', 'flashcards', 'marketplace.ts');
  const community = read('app', 'community_packs', 'communityOwnedStorage.ts');
  const local = read('app', 'community_packs', 'localAuthorPacks.ts');

  assert.match(marketplace, /export async function loadAccessiblePackIdsResult/);
  assert.match(marketplace, /export async function loadMarketplacePacksResult/);
  assert.match(marketplace, /export async function loadMarketplacePacks\([\s\S]*loadMarketplacePacksResult/);
  assert.match(marketplace, /status: 'stale'/);
  assert.match(marketplace, /Promise\.all\(\[readOwnedIds\(ownedKey\), readOwnedIds\(devOwnedKey\)\]\)/);
  assert.match(marketplace, /new BoundedScopeCache<string\[\]>\(16\)/);
  assert.match(marketplace, /accountScopeKey\(token\)/);
  assert.match(marketplace, /parseStrictArrayJson/);
  assert.match(marketplace, /mergeOwnedIdReads\(\[ownedRead, legacyRead\], warmOwnedPackIdsByTarget\.get\(cacheKey\)/);
  assert.match(marketplace, /runAccountScopedStorageTransaction/);
  assert.match(marketplace, /withAccountTransitionLock/);
  assert.match(marketplace, /export async function saveOwnedPackIds[\s\S]*runAccountScopedStorageTransaction/);
  assert.match(marketplace, /export async function addOwnedPackId[\s\S]*runAccountScopedStorageTransaction/);
  assert.match(marketplace, /export async function loadAccessiblePackIds\([\s\S]*loadAccessiblePackIdsResult/);

  assert.match(community, /export async function loadCommunityOwnedPackIdsResult/);
  assert.match(community, /status: 'stale'/);
  assert.match(community, /new BoundedScopeCache<string\[\]>\(16\)/);
  assert.match(community, /accountScopeKey\(token\)/);
  assert.match(community, /parseStrictArrayJson/);
  assert.match(community, /isCurrentAccountGeneration\(accountToken\)/);
  assert.match(community, /runAccountScopedStorageTransaction/);
  assert.match(community, /withAccountTransitionLock/);
  assert.match(community, /export async function loadCommunityOwnedPackIds\([\s\S]*loadCommunityOwnedPackIdsResult/);

  assert.match(local, /export async function loadLocalAuthorPacksResult/);
  assert.match(local, /status: 'stale'/);
  assert.match(local, /new BoundedScopeCache<LocalAuthorPack\[\]>\(20\)/);
  assert.match(local, /accountScopeKey\(token\)/);
  assert.match(local, /parseStrictArrayJson/);
  assert.match(local, /isValidLocalAuthorPackStorageItem/);
  assert.match(local, /isCurrentAccountGeneration\(token\)/);
  assert.match(local, /export async function loadLocalAuthorPacks\([\s\S]*loadLocalAuthorPacksResult/);
});

test('My Packs treats degraded reads as stale, retains retry, and never publishes a false zero', () => {
  const screen = read('app', 'flashcards_my_packs.tsx');
  const communityFirestore = read('app', 'community_packs', 'communityFirestore.ts');

  assert.match(screen, /subscribeAccountGeneration/);
  assert.match(screen, /loadAccessiblePackIdsResult\(studyTarget, operationAccount\)/);
  assert.match(screen, /loadLocalAuthorPacksResult\(studyTarget, operationAccount\)/);
  assert.match(screen, /loadCommunityOwnedPackIdsResult\(studyTarget, operationAccount\)/);
  assert.match(screen, /loadAuthorCommunityPacksPendingUpdateResult/);
  assert.match(screen, /authoredCloudResult\.status/);
  assert.match(screen, /loadMarketplacePacksResult\(studyTarget, undefined, operationAccount\)/);
  assert.match(screen, /catalogResult\.status/);
  assert.match(screen, /classifyMyPacksResolution/);
  assert.match(screen, /canCommitAccountScopedResult\(next\.accountScope, currentScope\)/);
  assert.match(screen, /canCommitAccountScopedResult\(publishScope, accountScopeKey\(captureAccountGeneration\(\)\)\)/);
  assert.match(screen, /status: 'ready' \| 'stale'/);
  assert.match(screen, /setLoadStatus\('stale'\)/);
  assert.match(screen, /loadStatus !== 'ready'/);
  assert.doesNotMatch(screen, /clearMyPacksCount/);
  assert.match(screen, /testID="fc-my-packs-retry"/);

  assert.match(communityFirestore, /export async function loadAuthorCommunityPacksPendingUpdateResult/);
  assert.match(communityFirestore, /readArrayWithStatus/);
  assert.match(communityFirestore, /export async function loadAuthorCommunityPacksPendingUpdate\([\s\S]*loadAuthorCommunityPacksPendingUpdateResult/);
});
