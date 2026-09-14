import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('functions/src/community_packs.ts', 'utf8');
const client = fs.readFileSync('app/community_packs/functionsClient.ts', 'utf8');
const mine = fs.readFileSync('app/flashcards_my_packs.tsx', 'utf8');

assert.match(server, /export const communityAuthorRemovePack/);
assert.match(server, /authorStableId/);
assert.match(server, /listingStatus: LISTING_ADMIN_REMOVED/);
assert.match(server, /syncFlashcardRegistryPackMutation/);
assert.match(client, /communityAuthorRemovePack/);
assert.match(mine, /ThemedConfirmModal/);
assert.match(mine, /removeLocalAuthorPack/);
assert.match(mine, /callCommunityAuthorRemovePack/);
assert.match(mine, /deletePackTarget/);
assert.match(mine, /fc-my-packs-pack-delete/);
