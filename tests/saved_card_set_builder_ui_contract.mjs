import assert from 'node:assert/strict';
import fs from 'node:fs';

const packsScreen = fs.readFileSync('app/flashcards_packs.tsx', 'utf8');
const hub = fs.readFileSync('app/flashcards/FlashcardsCategoryHub.tsx', 'utf8');
const myPacks = fs.readFileSync('app/flashcards_my_packs.tsx', 'utf8');
const editor = fs.readFileSync('app/community_pack_create.tsx', 'utf8');
const listItem = fs.readFileSync('app/flashcards/FlashcardListItem.tsx', 'utf8');

assert.match(packsScreen, /PackLanguagePicker/);
assert.match(packsScreen, /packLanguage/);
assert.match(packsScreen, /defaultPackLanguageForStudyTarget/);
assert.match(packsScreen, /packLanguage=\{packLanguage\}/);

assert.match(hub, /packLanguage\?: PackLanguage/);
assert.match(hub, /applyCommunityPacksFilter\(catalogCommunityPacks, communityQuery, communitySort, packLanguage\)/);
assert.match(hub, /PACK_LANGUAGE_META/);

assert.match(myPacks, /PackLanguagePicker/);
assert.match(myPacks, /filterPacksByLanguage/);

assert.match(editor, /stage\?: string/);
assert.match(editor, /consumeSavedCardSetStage/);
assert.match(editor, /packLanguage/);
assert.match(editor, /PackLanguagePicker/);
assert.match(editor, /const \[publishToCommunity,/);

assert.match(listItem, /buildSourceLabel/);
assert.match(listItem, /activeCat === 'saved' && isMarketplaceBundleCard/);
assert.match(listItem, /source: item\.origin\?\.source \?\? \(activeCat === 'saved' && isMarketplaceBundleCard \? 'community' : item.source\)/);
assert.match(listItem, /sourceId: item\.origin\?\.sourceId \?\? item.sourceId/);
assert.doesNotMatch(listItem, /\{item\.sourceId \? ` \$\{item\.sourceId\}` : ''\}/);
