// зачем (Сверка home4, scenes-compact в.2; координатор): Главная со «Сценой» до бита — плитки с подписью внутри, шапка «Сегодня» без чипа ›, «Фраза дня» без перевода, подписи вкладок; всё за флагом сцены.
import { readSource } from './helpers/read_source';

describe('Главная со «Сценой»: до бита', () => {
  const tiles = readSource('components/home/v2/HomeV2FeatureTiles.tsx');
  const today = readSource('components/home/v2/HomeV2TodayCard.tsx');
  const phrase = readSource('components/DailyPhraseCard.tsx');
  const bar = readSource('components/v2/V2TabBar.tsx');
  const home = readSource('app/(tabs)/home.tsx');

  // зачем (владелец 11.11, макет home_tiles_mockup утверждён «Да, переноси»: «плитки квадратные сделай, а тексты сделай меньше, чтобы „Сохранённые“ помещалось в 1 ряд»;
  // «всегда иконки должны быть отцентрированы… увеличь иконки»): прежний пин «картинка 58, подпись 13/700, поля 6/4/10» заменён решением владельца
  it('плитка: квадратная карточка r20, предмет по центру на всё место над подписью и крупнее, подпись 10/700 ВНУТРИ', () => {
    expect(tiles).toMatch(/sceneTile: \{ aspectRatio: 1, borderRadius: 20, paddingBottom: 5, alignItems: 'center' \}/);
    expect(tiles).toMatch(/sceneArt: \{ flex: 1, alignSelf: 'stretch' \}/);
    expect(tiles).toMatch(/sceneArtImage: \{ width: '100%', height: '100%', transform: \[\{ scale: ART_SCALE_FOUR \}\] \}/);
    expect(tiles).toMatch(/sceneTileTitle: \{ fontSize: 10, lineHeight: 12, fontWeight: '700', alignSelf: 'stretch', textAlign: 'center' \}/);
    const scale = Number((tiles.match(/const ART_SCALE_FOUR = ([0-9.]+);/) ?? [])[1]);
    expect(scale).toBeGreaterThan(1); // предмет крупнее прежнего
    expect(scale).toBeLessThanOrEqual(1.15); // видимая часть (≈97 % ширины картинки) не выходит за плитку 72 dp
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
  // зачем (golden approved-rev8/rev6-home-free-0, решение координатора 05.11; прежний пин «без перевода» отменён): со «Сценой» под фразой строка перевода; озвучки на карточке нет (замок 18.10)
  it('«Фраза дня» со сценой — перевод строкой под фразой (шрифт 15/20), без кнопки озвучки', () => {
    expect(phrase).toContain('{cardLiteral ? (');
    expect(phrase).toContain('sceneLook ? styles.v2TranslationScene : styles.v2Translation');
    expect(phrase).toContain('v2TranslationScene: { fontSize: 15, lineHeight: 20');
    expect(phrase).not.toContain('volume-high" size={20} color={v2');
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
