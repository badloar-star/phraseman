import fs from 'node:fs';
import path from 'node:path';

import { PACK_DECK_METRICS, packDeckSkeletonHeight } from '../components/packs/packDeckModel';

// зачем (координатор 18.10, «первый кадр = геометрия готового экрана»): скелетон занимает те же места, что готовый экран, — при подмене ничего не прыгает (> 8 dp — дефект).
// Это расчётный сторож по коду (высоты блоков скелетона против стилей готовых компонентов), а не замер onLayout на устройстве.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('первый кадр = геометрия готового экрана', () => {
  it('стопка набора (Карточки: хаб и «Мои наборы»): скелетон = стопка с рядом чипов слов, 143', () => {
    const m = PACK_DECK_METRICS;
    // 12 (под слои) + 16 + название 26 + отступ 3 + подпись 18 + 16 + чипы 14 + 38
    expect(packDeckSkeletonHeight()).toBe(m.stackTop + m.padTop + (m.titleLine + m.subGap + m.subLine) + m.padBottom + m.chipsTop + m.chipHeight);
    expect(packDeckSkeletonHeight()).toBe(143);
    expect(packDeckSkeletonHeight(false)).toBe(91);
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('const skeletonRowH = packDeckSkeletonHeight();');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('const skeletonH = packDeckSkeletonHeight();');
  });

  it('«Сохранённые»: скелетон = список (поля 16, верх 12, шаг 12, карточка 112 радиусом 20)', () => {
    const states = read('app/flashcards/SavedCollectionStates.tsx');
    expect(states).toContain('loading: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 12 }');
    expect(states).toContain('skeleton: { height: 112, borderRadius: 20');
    const list = read('app/flashcards/CollectionListView.tsx');
    expect(list).toContain('const LIST_PAD_TOP = 12;');
    expect(list).toContain('const LIST_ROW_GAP = 12;');
    expect(list).toContain("cardHeight={activeCat === 'saved' && !packDeeplink ? 112 : cardHeight}");
  });

  it('«Друзья»: скелетон поиска = карточка найденного (14 + 48 + 14 + 48 + 14 = 138, сверху 2)', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain("<View testID=\"friends-search-skeleton\" style={{ marginTop: 2 }}>");
    expect(friends).toContain('height: 138, borderRadius: 14');
    const found = read('components/friends/FriendsFoundCard.tsx');
    expect(found).toContain('gap: 14, padding: 14, marginTop: 2');
    expect(found).toContain('size={48}');
  });

  it('«Диалоги»: скелетон категории = свёрнутая карточка (16 + 55 + 18 + 7 + 18), шаг 13, верх 32', () => {
    const sk = read('components/dialogs/DialogueV2CatalogueSkeleton.tsx');
    const real = read('components/dialogs/DialogueV2CatalogueSection.tsx');
    expect(sk).toContain('{ gap: 13, marginTop: 32 }');
    expect(real).toContain('{ gap: 13, marginTop: 32 }');
    expect(sk).toContain('paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18');
    expect(real).toContain('paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18');
    expect(sk).toContain('minHeight: 55');
    expect(sk).toContain('marginTop: 18, marginHorizontal: 4');
  });
});
