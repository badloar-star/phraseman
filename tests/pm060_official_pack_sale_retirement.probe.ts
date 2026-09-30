import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

assert.ok(!existsSync('app/flashcards/cardPackShardPurchase.ts'), 'retired official pearl purchase code must be removed');
assert.ok(!existsSync('app/flashcards/useCardPackShardPaywall.tsx'), 'retired pearl-purchase hook must be removed');
assert.ok(!existsSync('app/shards_shop_catalog.ts'), 'retired pearl product catalog must be removed');
assert.ok(!existsSync('app/shards_purchase_reconcile.ts'), 'orphaned pearl-purchase reconciliation must be removed');
const communityPurchase = readFileSync('app/community_packs/purchaseCommunityPack.ts', 'utf8');
assert.ok(!communityPurchase.includes("from '../flashcards/cardPackShardPurchase'"), 'community purchase must not depend on retired official purchase');
assert.ok(!communityPurchase.includes('purchaseCommunityPackWithShards('), 'retired pearl-priced community purchase must be removed');
const serverCommunity = readFileSync('functions/src/community_packs.ts', 'utf8');
const functionIndex = readFileSync('functions/src/index.ts', 'utf8');
const functionClient = readFileSync('app/community_packs/functionsClient.ts', 'utf8');
const functionPackage = readFileSync('functions/package.json', 'utf8');
assert.ok(!serverCommunity.includes('export const communityPurchasePack = onCall('), 'server must not accept new pearl-priced community sales');
assert.ok(!functionIndex.includes('  communityPurchasePack,'), 'retired server sale must not be exported');
assert.ok(!functionClient.includes("'communityPurchasePack'"), 'client must not call retired server sale');
assert.ok(!functionPackage.includes('functions:communityPurchasePack'), 'safe deployment target must not include retired sale');
// зачем: D110 — админ-возврат покупки набора удалён решением владельца.
assert.ok(!serverCommunity.includes('adminRefundCommunityPackPurchase'), 'D110: removed admin refund callable must stay removed');
assert.ok(serverCommunity.includes("const COMMUNITY_PURCHASES = 'community_pack_purchases'"), 'community purchase receipts must remain readable');
assert.ok(serverCommunity.includes('export const communityFetchPackCardsIfAccessible = onCall('), 'community buyers must retain their content access endpoint');
assert.ok(serverCommunity.includes("if (packType === 'official') throw new HttpsError('not-found', 'pack_not_found')"), 'server must reject new official gifts');

const marketplace = readFileSync('app/flashcards/marketplace.ts', 'utf8');
assert.ok(marketplace.includes('export const BUNDLED_MARKETPLACE_PACKS: FlashcardMarketPack[] = [];'), 'official catalog must be empty');
assert.ok(!marketplace.includes("require('./bundles/"), 'official card data must not be imported by runtime');
assert.ok(!existsSync('app/flashcards/bundles/bundled_marketplace_manifest.json'), 'official catalog manifest must be removed');
assert.ok(!existsSync('app/flashcards/bundles/official_peaky_blinders_en.json'), 'official card JSON must be removed');
assert.deepEqual(readdirSync('app/flashcards/bundles', { recursive: true }).filter((name) => /\.(?:ts|json)$/.test(name)), [], 'all official bundle source files must be removed');
assert.ok(!readdirSync('assets/images/flashcard_backs').some((name) => name.startsWith('official_')), 'official card-back images must be removed');
assert.ok(!marketplace.includes('ensureFrenchRemoteMarketplacePacks('), 'French official packs must not be fetched');
assert.ok(!marketplace.includes(".collection('card_packs')"), 'official catalog must not query Firestore');
const targetGate = readFileSync('app/flashcards_target_gate.ts', 'utf8');
assert.ok(targetGate.includes('export function flashcardsOfficialPacksAvailableForTarget'), 'official source gate must remain callable');
assert.ok(targetGate.includes('return false;'), 'official source gate must be closed for every study target');
const giftSync = readFileSync('app/flashcards/pack_gift_sync.ts', 'utf8');
assert.ok(!giftSync.includes('addOwnedPackId('), 'gift sync must not restore retired official ownership');
const giftTrial = readFileSync('app/flashcards/pack_trial_gift.ts', 'utf8');
assert.ok(!giftTrial.includes('bundled_marketplace_manifest.json'), 'trial gifts must not load official catalog');

const retiredShop = readFileSync('app/shards_shop.tsx', 'utf8');
assert.ok(!retiredShop.includes('MarketPackCard'), 'retired pearl shop must not bundle official merchandise cards');
assert.ok(!retiredShop.includes('priceShards'), 'retired pearl shop must not render official pearl prices');
assert.ok(retiredShop.includes('flashcards_my_packs'), 'old shop links must preserve access to owned packs');
const myPacks = readFileSync('app/flashcards_my_packs.tsx', 'utf8');
assert.ok(myPacks.includes('loadCommunityOwnedPackIdsResult(studyTarget, operationAccount)'), 'My Packs must retain community ownership reads');

console.log('PM-060 official pack sale retirement: PASS');
