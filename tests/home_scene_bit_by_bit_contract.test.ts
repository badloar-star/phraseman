// зачем (Сверка home4, scenes-compact в.2; координатор): Главная со «Сценой» до бита — плитки с подписью внутри, шапка «Сегодня» без чипа ›, «Фраза дня» без перевода, подписи вкладок; всё за флагом сцены.
import { readSource } from './helpers/read_source';

describe('Главная со «Сценой»: до бита', () => {
  const tiles = readSource('components/home/v2/HomeV2FeatureTiles.tsx');
  const today = readSource('components/home/v2/HomeV2TodayCard.tsx');
  const phrase = readSource('components/DailyPhraseCard.tsx');
  const bar = readSource('components/v2/V2TabBar.tsx');
  const home = readSource('app/(tabs)/home.tsx');

  it('плитка: карточка r20, картинка 58, подпись 13/700 ВНУТРИ, поля 6/4/10', () => {
    expect(tiles).toMatch(/sceneTile: \{ borderRadius: 20, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 10/);
    expect(tiles).toMatch(/sceneArt: \{ width: '100%', height: 58 \}/);
    expect(tiles).toMatch(/sceneTileTitle: \{ fontSize: 13, lineHeight: 17, fontWeight: '700'/);
    // зачем (шаг 2 ускорения первого кадра Главной): тень — запечённой маской позади заливки, заливка — отдельным слоем
    expect(tiles).toContain('style={s.sceneTile}');
    expect(tiles).toContain('<HomeScenePlateShadow kind="tile" isLight={g.isLight} shadow={g.plateShadow} shadowSoft={g.plateShadowSoft} />');
    expect(tiles).toContain('<View pointerEvents="none" style={[s.sceneTileFill, { backgroundColor: g.opaqueCard }]} />');
    expect(today).toContain('<HomeScenePlateShadow kind="today" isLight={g.isLight} shadow={g.plateShadow} shadowSoft={g.plateShadowSoft} />');
    expect(`${tiles}${today}`).not.toContain('plateBoxShadow(g)');
  });
  it('шапка «Сегодня» — одна нажимаемая строка, серого чипа › нет', () => {
    const scene = today.slice(today.indexOf('if (scene && title !== null)'), today.indexOf('return (\n    <View testID="home-v2-today" style={[s.card'));
    expect(scene).toContain('testID="home-v2-today-see-all"');
    expect(scene).not.toContain('HomeV2SeeAllButton');
  });
  it('заголовок героя: длинный — кегль 26/32 (не переносится в две строки на 360–390), короткий — 30/36', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('const titleStyle = copy.title.length > TITLE_LONG_CHARS ? s.titleLong : s.title;');
    expect(stage).toMatch(/titleLong: { color: HOME_SCENE_INK.text, fontSize: 26, lineHeight: 32/);
    expect(stage).toMatch(/title: { color: HOME_SCENE_INK.text, fontSize: 30, lineHeight: 36/);
  });
  it('«Фраза дня» со сценой — без строки перевода', () => {
    expect(phrase).toContain('{cardLiteral && !sceneLook ? (');
  });
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот тут вот без слов!!!» — подписей вкладок нет и со «Сценой» (главный сторож — v2_tab_bar_liquid_glass_theme)
  it('таб-бар со «Сценой» — только значки, без подписей', () => {
    expect(bar).not.toMatch(/<Text[\s>]/);
    expect(bar).toContain('size={ICON_SIZE} color={color} />');
  });
  it('набор дня пишется в журнал [HOME-TODAY] (почему строки урока нет)', () => {
    expect(home).toContain("console.log('[HOME-TODAY]'");
    expect(home).toContain('lessonInDay');
  });
});
