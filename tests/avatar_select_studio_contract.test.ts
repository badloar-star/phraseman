import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const readProjectFile = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('avatar customization studio structure', () => {
  it('renders a theme-accented hero with one animated aura', () => {
    const hero = readProjectFile('components', 'customization', 'CustomizationHero.tsx');
    expect(hero).toContain('themeAccent');
    expect(hero).toContain('animateAura={props.motionEnabled && !reduceMotion}');
    expect(hero).not.toContain('previewLabel');
  });

  it('uses one vertical virtualized list with the studio in its header', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain('<Reanimated.FlatList');
    expect(screen).toContain('ListHeaderComponent={listHeader}');
    expect(screen).toContain('data={displayCatalogItems}');
    expect(screen).toContain('numColumns={3}');
    expect(screen).toContain('columnWrapperStyle={styles.row}');
    expect(screen).not.toContain('<ScrollView');
    expect(screen).not.toContain('<Reanimated.ScrollView');
    expect(screen).not.toContain('catalogSections');
    expect(screen).not.toContain('section.items.map');
  });

  it('wraps the price filters without nesting another scroll view', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain('<View style={styles.filterRail} accessibilityRole="tablist">');
    expect(screen).toMatch(/filterRail:\s*\{[^}]*flexWrap:\s*'wrap'/s);
  });

  it('renders catalog auras statically and keeps green CTA text dark', () => {
    const card = readProjectFile('components', 'customization', 'CustomizationCatalogCard.tsx');
    const controls = readProjectFile('components', 'customization', 'CustomizationControls.tsx');
    expect(card).toContain('animateAura={false}');
    expect(controls).toContain('t.correctText');
  });

  it('keeps level-avatar reset without restoring the retired profile-card route', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    const controls = readProjectFile('components', 'customization', 'CustomizationControls.tsx');
    expect(screen).toContain('Вернуть аватар уровня');
    expect(controls).not.toContain('onOpenProfileCard');
    expect(screen).not.toContain("router.push('/profile_card_upgrade')");
    expect(screen).toContain('resetToLevelAvatar');
  });

  it('preserves the custom-avatar achievement after a first purchase', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain("checkAchievements({ type: 'avatar_custom_set' })");
    expect(screen).toContain("target === 'avatar' && !current.ownedAvatars[itemId]");
  });

  it('keeps the studio compact with only avatar and aura tabs', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    const hero = readProjectFile('components', 'customization', 'CustomizationHero.tsx');
    expect(screen).toContain("title: 'Студия'");
    expect(screen).not.toContain("title: 'Студия образа'");
    expect(screen).toContain("const heroHeight = Math.max(300, Math.min(430, Math.round(Dimensions.get('window').height * 0.52)))");
    expect(screen).not.toContain('OwnershipFilters');
    expect(screen).not.toContain('filterCatalog(');
    expect(screen).not.toContain('const handleFilterChange = useCallback');
    expect(hero).not.toContain('styles.preview');
  });

  it('emits toast payloads and keeps catalog position when switching tabs', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain("emitAppEvent('action_toast', actionToastTri(");
    expect(screen).toContain('const scrollToCatalog = useCallback');
    expect(screen).toContain('onChange={handleTabChange}');
    expect(screen).not.toContain('key={`${activeTab}-${filter}`}');
  });

  it('uses confirmed selections for ownership instead of granting previewed items for free', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    const avatarCatalogCall = screen.slice(
      screen.indexOf('const avatarItems = useMemo'),
      screen.indexOf('const auraItems = useMemo'),
    );
    const auraCatalogCall = screen.slice(
      screen.indexOf('const auraItems = useMemo'),
      screen.indexOf('const catalogItems = useMemo'),
    );

    expect(avatarCatalogCall).toContain('activeAvatar: confirmed.activeAvatar');
    expect(avatarCatalogCall).not.toContain('activeAvatar: previewAvatarValue');
    expect(auraCatalogCall).toContain('activeAuraId: confirmed.storedAuraSelection');
    expect(auraCatalogCall).not.toContain('activeAuraId: previewStoredAuraSelection');
  });
});
