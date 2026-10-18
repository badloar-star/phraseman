import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');

test('Saved route preserves the live feature-access decision and wires loading separately', () => {
  const source = read('app/flashcards_collection.tsx');
  assert.ok(source.includes("useFeatureAccess('flashcards')"));
  assert.ok(source.includes('<SavedCollectionLoading'));
  // перепин 18.10 (cards-039, Сверка 46232ea76; D158): условие «скелетон» живёт в чистой savedLoadBranch (ошибка важнее скелетона) — экран берёт ветку оттуда
  assert.ok(source.includes("savedBranch.branch === 'skeleton'"));
  assert.ok(source.includes('savedLoadBranch({'));
  assert.ok(source.includes('loadError={loadError}'));
  assert.ok(source.includes('searchActive={searchActive}'));
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(source.includes('colors={[glass.bgTop, glass.bg, glass.bgBottom]}'));
  assert.ok(source.includes('const isEmpty = !loading && !packCardsPending && listCards.length === 0'), 'empty search uses rendered cards, not pre-search collection');
});

test('Saved loading has four glass skeleton rows and error/search/empty are distinct', () => {
  const source = read('app/flashcards/SavedCollectionStates.tsx');
  assert.ok(source.includes('Array.from({ length: 4 }'));
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'));
  // зачем (Тень 12.10): скелетон — плашки PlateFill с тенью, без блюра-блика и кромки
  assert.ok(source.includes('<PlateFill g={g} radius={16} />') && source.includes('plateBoxShadow(g)'));
  assert.ok(!/borderColor|borderWidth|glassEdge/.test(source), 'skeleton rows have no outline');
  for (const text of ['Пока пусто', 'Ничего не найдено']) {
    assert.ok(source.includes(text), `missing state copy: ${text}`);
  }
  assert.ok(!source.includes('Не удалось загрузить карточки'), 'экрана ошибки загрузки нет');
  assert.ok(source.includes('searchActive ?'));
});

test('Saved action menu has explicit List and Deck destinations with live actions', () => {
  const source = read('app/flashcards/CollectionHeader.tsx');
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(source.includes('fc-saved-view-list'));
  assert.ok(source.includes('fc-saved-view-deck'));
  assert.ok(source.includes('onEnterSelection?.()'));
  assert.ok(source.includes('onDeleteSelected?.()'));
  assert.ok(source.includes('<SavedHeaderGlass'), 'Saved search, chips and menu diffuse the background');
  // зачем (Тень 12.10): блюр-блик шапки заменён заливкой плашки (PlateFill) с тенью темы — кромки и блюра на Android нет
  assert.ok(source.includes('<PlateFill g={g} radius={radius} />') && source.includes('boxShadow: plateBoxShadow(g)'), 'Saved controls are shadow plates');
  assert.ok(source.includes('testID={`fc-saved-content-label-${key}`}'), 'FlowText content labels satisfy required text identity');
  assert.ok(read('app/flashcards_collection.tsx').includes('savedGlass={activeCat === \'saved\' && !packDeeplink}'));
  assert.ok(read('app/flashcards/FlashcardsFilterDropdown.tsx').includes('<BlurView'), 'Saved filter popup diffuses its backdrop');
});

test('Saved selection actions are horizontal, safe-area anchored, and preserve disabled rules', () => {
  const source = read('app/flashcards/CollectionListView.tsx');
  assert.ok(source.includes('useStableSafeAreaInsets()'));
  assert.ok(source.includes("testID=\"fc-selection-action-bar\""));
  assert.ok(source.includes("position: 'absolute'"));
  assert.ok(source.includes('bottom: 0'));
  assert.ok(source.includes('flexDirection: \'row\''));
  assert.ok(source.includes('disabled={!canCreatePack}'));
  assert.ok(source.includes('disabled={selectedCount === 0}'));
  assert.ok(source.includes('g.cta'));
  assert.ok(source.includes('<SavedListGlass'), 'selection rows, dock and undo toast use material layers');
});

test('Saved Free20 footer and undo use live Plus copy and tinted glass', () => {
  const source = read('app/flashcards/CollectionListView.tsx');
  assert.ok(source.includes('hiddenByLimitCount > 0'));
  assert.ok(source.includes('Открыть все с Plus'));
  assert.ok(source.includes('backgroundColor: g.plateFillFrom')); // зачем (Тень 12.10): плашка «скрыто лимитом» — заливка плашки темы
  assert.ok(source.includes('fc-undo-delete'));
  assert.ok(source.includes('onUndo={undoDelete}') || read('app/flashcards_collection.tsx').includes('onUndo={undoDelete}'));
});

test('Saved card faces retain live gestures while using the approved translucent glass', () => {
  const source = read('app/flashcards/FlashcardListItem.tsx');
  assert.ok(source.includes('savedCollectionSurface && !usePackFace'));
  assert.ok(read('app/flashcards/CollectionListView.tsx').includes("savedCollectionSurface={activeCat === 'saved' && !packDeeplink}"));
  assert.ok(source.includes('backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g)')); // зачем (Тень 12.10): грань — плашка без кромки
  assert.ok(source.includes('onFlipCard(item.id)'));
  assert.ok(source.includes('onOpenDelete(item.id)'));
  assert.ok(source.includes('<ScrollView nestedScrollEnabled showsVerticalScrollIndicator'));
  assert.ok(source.includes('maxHeight: frontTextMaxH'));
  assert.ok(source.includes('<PlateFill g={g} radius={20} />'), 'saved faces use the shadow-style plate fill (без блюра и кромки)');
  assert.ok(source.includes('FlowText'));
  assert.ok(!source.includes('numberOfLines='), 'saved card content and actions must not be truncated');
  for (const token of ['fc-saved-row-number-', 'fc-saved-row-translation-', 'fc-saved-row-play-', 'fc-saved-row-menu-', 'WordStrengthDots strength={strength}']) {
    assert.ok(source.includes(token), `compact Saved row is missing ${token}`);
  }
  assert.ok(source.includes('testID={`fc-saved-row-word-${item.id}`}'));
  assert.ok(source.includes('testID={`fc-saved-row-ipa-${item.id}`}'));
  assert.ok(read('app/flashcards/CollectionListView.tsx').includes('cardHeight={activeCat === \'saved\' && !packDeeplink ? 112 : cardHeight}'));
});

test('Saved one-time delete hint stays a bottom glass toast and bulk confirmation stays real', () => {
  const list = read('app/flashcards/CollectionListView.tsx');
  const route = read('app/flashcards_collection.tsx');
  assert.ok(list.includes('Зажми карточку, чтобы удалить её'));
  assert.ok(list.includes('bottom: 14'));
  assert.ok(list.includes('backgroundColor: g.sheet'));
  assert.ok(route.includes('visible={batchDeleteConfirmOpen}'));
  assert.ok(route.includes('performDeleteSelected()'));
});

test('all approved Saved interaction states still resolve to live handlers and content', () => {
  const route = read('app/flashcards_collection.tsx');
  const header = read('app/flashcards/CollectionHeader.tsx');
  const list = read('app/flashcards/CollectionListView.tsx');
  const item = read('app/flashcards/FlashcardListItem.tsx');
  const deck = read('app/flashcards/CollectionDeckView.tsx');
  const checks = [
    [route, 'SavedCollectionLoading'], [route, 'SavedCollectionState'],
    [route, 'searchQuery.trim().length > 0'], [route, 'visible={batchDeleteConfirmOpen}'],
    [route, 'onUndo={undoDelete}'], [route, 'onDeleteCardById={deleteCardById}'],
    [route, 'hiddenByLimitCount={hiddenByLimitCount}'], [route, 'isPremium = useFeatureAccess'],
    [header, 'fc-saved-actions-menu'], [header, 'fc-saved-view-list'], [header, 'fc-saved-view-deck'],
    [header, 'fc-saved-selection-count'], [list, 'showDeleteHint'], [list, 'longPressedId'],
    [list, '<ReanimatedSwipeable'], [list, 'fc-selection-action-bar'],
    [item, 'onOpenDelete(item.id)'], [item, 'onFlipCard(item.id)'],
    [deck, 'testID="fc-deck-card"'], [deck, 'onFlip={handleFlip}'],
  ];
  for (const [source, token] of checks) assert.ok(source.includes(token), `missing live Saved state/handler: ${token}`);
});
