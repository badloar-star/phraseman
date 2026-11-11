import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// зачем (владелец 11.11: «в разделе статистика тоже надо сделать», «в разделе выбора языка в настройках», «во всех экранах… всё что
// под сейф зону уходит так же должно с размытым фейд краем быть»): сторож мягкого верхнего края на ОТДЕЛЬНЫХ экранах (не вкладках).
describe('Soft top edge on scroll: standalone screens', () => {
  it('counts the scroll flag on the UI thread and crosses to JS only on the threshold change', () => {
    const hook = read('components/useSoftTopEdge.ts');
    expect(hook).toContain('const SHOW_THRESHOLD = 6;');
    expect(hook).toContain('const SHOW_MS = 180;');
    expect(hook).toContain('const HIDE_MS = 260;');
    expect(hook).toContain("'worklet';");
    expect(hook).toContain('if (scrolled !== shown.value) {');
    expect(hook).toContain('runOnJS(setScrolled)(scrolled);');
    expect(hook).toContain('useNativeDriver: true');
    // свой worklet экрана не теряется
    expect(hook).toContain('if (passThrough) passThrough(y);');
    // в покое верх виден целиком
    expect(hook).toContain('new Animated.Value(1)');
  });

  it('lets a screen drive the mask itself, falling back to the shared tab flag', () => {
    const fade = read('components/ScrollTopEdgeFade.tsx');
    expect(fade).toContain('cover?: Animated.Value;');
    expect(fade).toContain('const restCover = cover ?? sharedCover;');
  });

  it('BouncyScrollView: soft edge is opt-in, keeps the screen onScroll and stays unchanged without the prop', () => {
    const bouncy = read('components/BouncyScrollView.tsx');
    expect(bouncy).toContain('softTopEdge = false');
    expect(bouncy).toContain('const onScrollWorklet = softTopEdge ? softEdge.onScrollWorklet : onScrollWorkletProp;');
    expect(bouncy).toContain('const effectiveOnScroll = onScrollWorkletProp ? onAnimatedScroll');
    expect(bouncy).toContain('return softTopEdge ? <ScrollTopEdgeFade cover={softEdge.cover}>{scroll}</ScrollTopEdgeFade> : scroll;');
  });

  it.each([
    'app/settings_language.tsx',
    'app/account_details.tsx',
    'app/privacy_settings.tsx',
    'app/settings_edu.tsx',
    'app/settings_notifications.tsx',
    'app/settings_themes.tsx',
    'app/hint.tsx',
    'app/support_report.tsx',
    'app/community_pack_create.tsx',
    'app/lesson_irregular_verbs.tsx',
  ])('%s turns the soft edge on', (file) => {
    expect(read(file)).toContain('<BouncyScrollView softTopEdge');
  });

  it('Statistics fades its scroll under the back strip; skeletons and the header stay outside the mask', () => {
    const stats = read('app/streak_stats.tsx');
    expect(stats).toContain('useBouncy({ onScrollWorklet: softEdge.onScrollWorklet })');
    const open = stats.indexOf('<ScrollTopEdgeFade cover={softEdge.cover} enabled={!embedded}>');
    const scroll = stats.indexOf('<Reanimated.ScrollView ref={scrollRef}', open);
    const close = stats.indexOf('</ScrollTopEdgeFade>', scroll);
    const skeleton = stats.indexOf('<SkeletonBlock width="100%" height={200}');
    expect(open).toBeGreaterThan(-1);
    expect(scroll).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(scroll);
    expect(skeleton).toBeGreaterThan(-1);
    expect(skeleton).toBeLessThan(open);
    expect(stats.split('<ScrollTopEdgeFade').length).toBe(2);
  });

  it('plain page scrolls: the drop-in keeps the list place, the screen onScroll and the fast deceleration', () => {
    const drop = read('components/SoftTopEdgeScrollView.tsx');
    expect(drop).toContain('const SHOW_THRESHOLD = 6;');
    expect(drop).toContain('wrap: { flexGrow: 1, flexShrink: 1 },');
    expect(drop).toContain('<ScrollTopEdgeFade cover={cover} style={[styles.wrap, style]}>');
    expect(drop).toContain("if (typeof onScroll === 'function') onScroll(e);");
    expect(drop).toContain('{...rest} decelerationRate="fast">');
    expect(drop).toContain('useNativeDriver: true');
    expect(read('components/ScrollTopEdgeFade.tsx')).toContain('style={style ?? styles.fill}');
  });

  it.each([
    'achievements_screen', 'coin_rank', 'coin_rank_catalog', 'dialogue_v2_completion', 'dialogue_v2_memory',
    'friends_duel', 'friends_week_mine', 'lesson_help', 'lingman_playlist', 'lingman_video_watch', 'mistakes_hub', 'mistakes_list',
    'promo_code_entry', 'referrals', 'runes_wallet', 'shop', 'today_tasks',
  ])('app/%s.tsx scrolls its page through the soft-edge list', (name) => {
    const src = read(`app/${name}.tsx`);
    expect(src).toContain("import SoftTopEdgeScrollView from '../components/SoftTopEdgeScrollView';");
    expect(src).toContain('<SoftTopEdgeScrollView');
    expect(src.split('<SoftTopEdgeScrollView').length).toBe(src.split('</SoftTopEdgeScrollView>').length);
  });
});
