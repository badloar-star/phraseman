// зачем (владелец 04.11: «зачем убрали из строк сердце и число лайков?»; OWNER_LOCKS «лайки и комментарии в строках наборов видимы»):
// rev8-строка PackCatalogRow обязана нести сердце (тап = лайк), число лайков и «💬 N» при N>0 — в «Сообщество», «Из видео» (пользовательские), «Мои наборы».
// Живые цифры без новых чтений Firestore: вариант rowHeart пропускает fetchCommunityPackSocialState, как sceneTileHeart.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('в строках наборов есть сердце, лайки и комментарии', () => {
  const bar = read('app/community_packs/CommunityPackSocialBar.tsx');
  const row = read('components/packs/PackRow.tsx');
  it('PackCatalogRow держит все слоты: ♥/💬 справа внизу, монета и Plus автора, спиннер opening, подсветка, приглушение, ▶ действия', () => {
    expect(row).toContain('trailing?: React.ReactNode;');
    expect(row).toContain('action?: React.ReactNode;');
    expect(row).toContain('opening?: boolean;');
    expect(row).toContain('highlight?: string;');
    expect(row).toContain('emphasis?: PackRowEmphasis;');
    expect(row).toContain('<DeckAvatar g={g} coinRank={authorMeta.coinRank} plus={authorMeta.isPremium} />');
    expect(row).toContain('<ActivityIndicator size="small" color={g.secondary} />');
    expect(row).toContain("emphasis === 'dimmed'");
    expect(row).toContain('{action}');
  });
  it('вариант rowHeart: сердце-кнопка ≥44 dp, число лайков, счётчик комментариев, остановка всплытия тапа', () => {
    const branch = bar.slice(bar.indexOf("if (mode === 'rowHeart') {"), bar.indexOf("if (isList) {"));
    expect(branch).toContain('minHeight: 44');
    expect(branch).toContain('event.stopPropagation(); void onLikePress();');
    expect(branch).toContain('snapshot.likesCount');
    expect(branch).toContain('renderCommentsCount(20, 15, 5)');
    expect(branch).toContain('likePop');
  });
  it('rowHeart не читает Firestore на каждую строку (💸): в списке пропуска и в каталожных вариантах', () => {
    expect(bar).toContain("mode === 'sceneTileHeart' || mode === 'rowHeart'");
    expect(bar).toContain("isSetHeart || mode === 'rowHeart'");
  });
  it('лайкнутое сердце и число — красным токеном темы (эталон), не g.text', () => {
    const branch = bar.slice(bar.indexOf("if (mode === 'rowHeart') {"), bar.indexOf('if (isList) {'));
    expect(branch).toContain('semanticInk(g).badText');
  });
  it('«Мои наборы»: круглая ▶ «Тренировать» в строке; «Из видео»: крупные карточки; Сообщество: «+» создать набор и лупа', () => {
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('action={<PackDeckPlayButton');
    expect(read('app/flashcards_video_packs.tsx')).toContain("variant={embedded ? 'plain' : 'card'}");
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(hub).toContain('testID="social-catalog-create"');
    expect(hub).toContain('authorMeta={{ coinRank: author.coinRank, isPremium: author.isPremium }}');
    expect(hub).toContain('opening={opening}');
  });
  it('чипы слов вторым рядом: два чипа и «+N» (решение владельца 04.11 «ничего не терять»); Сообщество и «Мои наборы» их передают', () => {
    expect(row).toContain('words?: readonly string[];');
    expect(row).toContain('words.slice(0, 2).map((word, index) => <DeckWordChip');
    expect(row).toContain('`+${words.length - 2}`');
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('words={deckWords}');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('words={packDeckWords(pack)}');
  });
  it('на embedded-вкладке «Сообщество» есть вход «Создать набор»: «+» в шапке сцены ведёт на /community_pack_create', () => {
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    const header = hub.slice(hub.indexOf('{sceneMode ? <><View style={{ flexDirection'), hub.indexOf('</View>{sceneSearchOpen ? <>'));
    expect(header).toContain('testID="social-catalog-create"');
    expect(header).toContain("pathname: '/community_pack_create'");
    expect(read('app/flashcards_packs.tsx')).toContain('sceneMode={embedded}');
  });
  it('крупный шрифт: чип слов растёт (minHeight 38, не height), текст кнопки комментариев сжимается (flexShrink)', () => {
    expect(row).toMatch(/deckChip: {[^}]*minHeight: 38/);
    expect(row).not.toMatch(/deckChip: {[^}]*height: 38/);
    expect(read('components/packs/CommunityPackScene.tsx')).toMatch(/fontWeight: '600', flexShrink: 1, textAlign: 'center'/);
  });
  it('три списка передают trailing с rowHeart', () => {
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('variant="rowHeart"');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('variant="rowHeart"');
    expect(read('app/flashcards/VideoPackRow.tsx')).toContain('variant="rowHeart"');
  });
});
