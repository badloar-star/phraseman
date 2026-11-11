import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// зачем (владелец 11.11: «надо чтобы везде был край размыт и нигде жёсткий»; «в наборах… при скролле верхняя часть просто накладывается»):
// сторож мягкого верхнего края в разделах «Сообщества». В покое экраны прежние, эффект включает только прокрутка.
describe('Soft top edge on scroll: Friends, Packs, Peak', () => {
  it('switches on the shared scroll flag only, with the same threshold and timings as the tab top mask', () => {
    const hook = read('components/useTopFadeScrolled.ts');
    expect(hook).toContain("import { useTopFadeScroll } from './TopFadeScrollContext';");
    expect(hook).toContain('const SHOW_THRESHOLD = 6;');
    expect(hook).toContain('const SHOW_MS = 180;');
    expect(hook).toContain('const HIDE_MS = 260;');
    // появившийся позже слой начинает с верного вида
    expect(hook).toContain('topFade?.isMaskShown() ?? false');
    // только смена порога, без работы на каждый кадр прокрутки
    expect(hook).toContain('if (scrolled === scrolledRef.current) return;');
    expect(hook).toContain('useNativeDriver: true');
    expect(hook).toContain('return () => scrollY.removeListener(id);');
  });

  it('fades the list through an alpha mask and keeps the top fully visible at rest', () => {
    const fade = read('components/ScrollTopEdgeFade.tsx');
    expect(fade).toContain("colors={['transparent', 'black']}");
    expect(fade).toContain("useTopFadeScrolled({ rest: 1, stepOnAndroid: true })");
    expect(fade).toMatch(/<Animated\.View style=\{\[styles\.restCover, \{ opacity: restCover \}\]\} \/>/);
    expect(fade).toMatch(/<\/MaskedView>/);
    expect(fade).not.toContain('borderWidth');
  });

  it('wraps the Friends list, not the whole screen', () => {
    const friends = read('app/(tabs)/friends.tsx');
    const open = friends.indexOf('<ScrollTopEdgeFade>');
    const list = friends.indexOf('testID="friends-list"', open);
    const close = friends.indexOf('</ScrollTopEdgeFade>', list);
    const modal = friends.indexOf('<AddFriendModal', close);
    expect(open).toBeGreaterThan(-1);
    expect(list).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(list);
    // окна и шторки остаются вне маски
    expect(modal).toBeGreaterThan(close);
  });

  it('wraps the Videos lists under the feed chips, leaving the header, chips and sheets outside the mask', () => {
    const videos = read('app/lingman_videos.tsx');
    const chips = videos.indexOf('<VideoFeedChips value=');
    const open = videos.indexOf('<ScrollTopEdgeFade>', chips);
    const list = videos.indexOf('ref={homeListRef}', open);
    const close = videos.indexOf('</ScrollTopEdgeFade>', list);
    const sheet = videos.indexOf('<StudyLanguageSheet', close);
    expect(chips).toBeGreaterThan(-1);
    expect(open).toBeGreaterThan(chips);
    expect(list).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(list);
    expect(sheet).toBeGreaterThan(close);
    // обёртка одна и постоянная — списки не перемонтируются при смене состояний экрана
    expect(videos.split('<ScrollTopEdgeFade>').length).toBe(2);
    // растворение включает прокрутка, которую вкладка уже сообщает в общий признак
    expect(videos).toContain('topFadeScroll?.onScroll?.(e);');
  });

  it('draws the scene-colored band under the Community tabs only when the header lies over a scene', () => {
    const community = read('app/(tabs)/community.tsx');
    expect(community).toContain("const scrimTint = !overScene ? null : section === 'packs' ? packsSceneTop : sceneTint;");
    const scrim = community.indexOf('<CommunityHeaderScrim headerHeight={headerH} tint={scrimTint} />');
    const body = community.indexOf('<View style={overScene ? s.bodyUnder : s.body}>');
    expect(scrim).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(scrim);

    const band = read('components/CommunityHeaderScrim.tsx');
    // в покое полосы нет — замок «верх цельный» (25.10)
    expect(band).toContain('useTopFadeScrolled({ rest: 0 })');
    expect(band).toContain('pointerEvents="none"');
    expect(band).toContain('colors={[tint, tint, transparentOf(tint)]}');
    // между телом и шапкой (headerOver: zIndex 2)
    expect(band).toContain('zIndex: 1');
    expect(community).toMatch(/headerOver: \{[^}]*zIndex: 2/);
  });

  it('embedded Packs report scroll to the shared flag without collapsing the tab bar', () => {
    const packs = read('app/flashcards_packs.tsx');
    expect(packs).toContain('topFadeScroll?.onScrollMaskOnly(e);');
    expect(packs).toContain('listener: embedded ? reportHubScroll : undefined,');
    expect(packs).toContain('onScroll={reduceMotion && !embedded ? undefined : onHubScroll}');
    // при показе раздел сообщает своё место заново — общий признак помнит прошлый раздел
    expect(packs).toContain("const hubShown = embedded && runtimeOwnerId === 'packs';");
    expect(packs).toContain('topFadeScroll.onScrollMaskOnly({ nativeEvent: { contentOffset: { y: hubLastYRef.current } } });');
    expect(packs).not.toMatch(/reportHubScroll[\s\S]{0,200}topFadeScroll\?\.onScroll\(/);
  });
});
