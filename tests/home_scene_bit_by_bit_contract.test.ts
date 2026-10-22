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
    expect(tiles).toContain('style={[s.sceneTile, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}');
  });
  it('шапка «Сегодня» — одна нажимаемая строка, серого чипа › нет', () => {
    const scene = today.slice(today.indexOf('if (scene && title !== null)'), today.indexOf('return (\n    <View testID="home-v2-today" style={[s.card'));
    expect(scene).toContain('testID="home-v2-today-see-all"');
    expect(scene).not.toContain('HomeV2SeeAllButton');
  });
  it('«Фраза дня» со сценой — без строки перевода', () => {
    expect(phrase).toContain('{cardLiteral && !sceneLook ? (');
  });
  it('подписи вкладок 11/600 по CSS — только со «Сценой»', () => {
    expect(bar).toContain('HOME_SCENE_V2_ENABLED ? <Text numberOfLines={1} maxFontSizeMultiplier={1.2}');
    expect(bar).toMatch(/tabLabel: \{ fontSize: 11, lineHeight: 14, fontWeight: '600' \}/);
    expect(bar).toMatch(/tabStack: \{ alignItems: 'center', gap: 3 \}/);
  });
  it('набор дня пишется в журнал [HOME-TODAY] (почему строки урока нет)', () => {
    expect(home).toContain("console.log('[HOME-TODAY]'");
    expect(home).toContain('lessonInDay');
  });
});
