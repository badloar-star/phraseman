import assert from 'node:assert/strict';
import fs from 'node:fs';

const packsScreen = fs.readFileSync('app/flashcards_packs.tsx', 'utf8');
const hub = fs.readFileSync('app/flashcards/FlashcardsCategoryHub.tsx', 'utf8');
// зачем: выбор языка наборов переехал в шторку «⋯» MyPacksV2 (макет cards-section)
const myPacks = fs.readFileSync('app/flashcards_my_packs.tsx', 'utf8') + fs.readFileSync('app/flashcards/MyPacksV2.tsx', 'utf8');
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
// перепин 18.10 (Сайт, координатор): filterPacksByLanguage убран НАМЕРЕННО в 7d3ff1c50 (15.10, R06/R27/R29/R30) — «Мои наборы» грузят все
// наборы, язык фильтруется на клиенте через applyMyPacksLanguageView (my_packs_language_view.ts; пустой по языку — показываем все + «Скрыто N»).
assert.match(myPacks, /applyMyPacksLanguageView/);

assert.match(editor, /stage\?: string/);
assert.match(editor, /consumeSavedCardSetStage/);
assert.match(editor, /packLanguage/);
assert.match(editor, /PackLanguagePicker/);
assert.match(editor, /const \[publishToCommunity,/);

assert.match(listItem, /buildSourceLabel/);
// зачем (владелец 22.09, 1896c797a): плашка «ИСТОЧНИК: …» на карточке убрана навсегда — карточка
// подпись источника не рисует. Подпись жива в CollectionListView: по ней идёт поиск, с тем же
// приоритетом origin → поля карточки.
assert.doesNotMatch(listItem, /buildSourceLabel\(/);
const collectionList = fs.readFileSync('app/flashcards/CollectionListView.tsx', 'utf8');
assert.match(collectionList, /buildSourceLabel\(item\.origin \?\? \{ source: item\.source, sourceId: item\.sourceId, sourceTitle: item\.sourceTitle \}, lang\)/);
assert.doesNotMatch(listItem, /\{item\.sourceId \? ` \$\{item\.sourceId\}` : ''\}/);
