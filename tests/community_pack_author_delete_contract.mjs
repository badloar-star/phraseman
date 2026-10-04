import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('functions/src/community_packs.ts', 'utf8');
const client = fs.readFileSync('app/community_packs/functionsClient.ts', 'utf8');
// зачем: разметка списка вынесена в MyPacksV2 (макет cards-section), логика осталась в экране — читаем оба
const mine = fs.readFileSync('app/flashcards_my_packs.tsx', 'utf8') + fs.readFileSync('app/flashcards/MyPacksV2.tsx', 'utf8');

assert.match(server, /export const communityAuthorRemovePack/);
assert.match(server, /authorStableId/);
assert.match(server, /listingStatus: LISTING_ADMIN_REMOVED/);
assert.match(server, /syncFlashcardRegistryPackMutation/);
assert.match(client, /communityAuthorRemovePack/);
// зачем: efe19ae9d (редизайн карточек 2.0) — подтверждение удаления стало своим стеклянным Modal вместо ThemedConfirmModal.
assert.match(mine, /<Modal visible={!!deletePackTarget}/);
assert.match(mine, /removeLocalAuthorPack/);
assert.match(mine, /callCommunityAuthorRemovePack/);
assert.match(mine, /deletePackTarget/);
assert.match(mine, /fc-my-packs-pack-delete/);
