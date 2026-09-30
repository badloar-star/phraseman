import { readFileSync } from 'node:fs';

const packs = readFileSync('app/community_packs/localAuthorPacks.ts', 'utf8');
const cards = readFileSync('app/flashcards/custom_card_access.ts', 'utf8');
if (!packs.includes('FREE_AUTHOR_PACK_LIMIT = 3')) throw new Error('Free pack limit is not 3');
if (!cards.includes('FREE_CUSTOM_CARD_LIMIT = 50')) throw new Error('Free card limit is not 50');
// 2026-09-30: у Plus лимита нет (владелец: «не 1500, а безлимит»).
if (!cards.includes('PLUS_CUSTOM_CARD_LIMIT = Number.POSITIVE_INFINITY')) throw new Error('Plus card limit is not unlimited');
if (!cards.includes('hasPremiumAccess ? PLUS_CUSTOM_CARD_LIMIT : FREE_CUSTOM_CARD_LIMIT')) {
  throw new Error('Plus/Free card limit branch missing');
}
console.log('APPROVED FLASHCARD LIMITS: PASS');
