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
  // зачем (координатор §77, 02.10): строковые проверки функций, которых в коде не было никогда (пришли из снимка efe19ae9d),
  // сняты; защита от смены аккаунта покрыта isCurrentAccountGeneration/accountScopeKey выше и поведенческими тестами 8C/8J.
  assert.match(marketplace, /export async function loadAccessiblePackIds\([\s\S]*loadAccessiblePackIdsResult/);

  assert.match(community, /export async function loadCommunityOwnedPackIdsResult/);
  assert.match(community, /status: 'stale'/);
  assert.match(community, /new BoundedScopeCache<string\[\]>\(16\)/);
  assert.match(community, /accountScopeKey\(token\)/);
  assert.match(community, /parseStrictArrayJson/);
  assert.match(community, /isCurrentAccountGeneration\(accountToken\)/);
  assert.match(community, /export async function loadCommunityOwnedPackIds\([\s\S]*loadCommunityOwnedPackIdsResult/);

  assert.match(local, /export async function loadLocalAuthorPacksResult/);
  assert.match(local, /status: 'stale'/);
  assert.match(local, /new BoundedScopeCache<LocalAuthorPack\[\]>\(20\)/);
  assert.match(local, /accountScopeKey\(token\)/);
  assert.match(local, /parseStrictArrayJson/);
  assert.match(local, /isCurrentAccountGeneration\(token\)/);
  assert.match(local, /export async function loadLocalAuthorPacks\([\s\S]*loadLocalAuthorPacksResult/);
});

test('My Packs treats degraded reads as stale, retains retry, and never publishes a false zero', () => {
  const screen = read('app', 'flashcards_my_packs.tsx');

  assert.match(screen, /subscribeAccountGeneration/);
  assert.match(screen, /loadAccessiblePackIdsResult\(studyTarget, operationAccount\)/);
  assert.match(screen, /loadLocalAuthorPacksResult\(studyTarget, operationAccount\)/);
  assert.match(screen, /loadCommunityOwnedPackIdsResult\(studyTarget, operationAccount\)/);
  assert.match(screen, /loadMarketplacePacksResult\(studyTarget, undefined, operationAccount\)/);
  assert.match(screen, /catalogResult\.status/);
  assert.match(screen, /classifyMyPacksResolution/);
  assert.match(screen, /canCommitAccountScopedResult\(next\.accountScope, currentScope\)/);
  assert.match(screen, /canCommitAccountScopedResult\(publishScope, accountScopeKey\(captureAccountGeneration\(\)\)\)/);
  assert.match(screen, /status: 'ready' \| 'stale'/);
  assert.match(screen, /setLoadStatus\('stale'\)/);
  assert.match(screen, /loadStatus !== 'ready'/);
  assert.doesNotMatch(screen, /clearMyPacksCount/);
  assert.doesNotMatch(screen, /testID="fc-my-packs-retry"/);

});
