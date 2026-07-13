import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const readProjectFile = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('avatar customization studio structure', () => {
  it('renders a theme-accented hero with one animated aura', () => {
    const hero = readProjectFile('components', 'customization', 'CustomizationHero.tsx');
    expect(hero).toContain('themeAccent');
    expect(hero).toContain('animateAura={props.motionEnabled && !reduceMotion}');
    expect(hero).toContain('previewLabel');
  });

  it('uses one vertical virtualized list with the studio in its header', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain('<Reanimated.FlatList');
    expect(screen).toContain('ListHeaderComponent={listHeader}');
    expect(screen).toContain('numColumns={3}');
    expect(screen).not.toContain('<ScrollView');
    expect(screen).not.toContain('<Reanimated.ScrollView');
  });

  it('renders catalog auras statically and keeps green CTA text dark', () => {
    const card = readProjectFile('components', 'customization', 'CustomizationCatalogCard.tsx');
    const controls = readProjectFile('components', 'customization', 'CustomizationControls.tsx');
    expect(card).toContain('animateAura={false}');
    expect(controls).toContain('t.correctText');
  });

  it('keeps reset and profile-card entry without level avatars in the catalog', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    const controls = readProjectFile('components', 'customization', 'CustomizationControls.tsx');
    expect(screen).toContain('Вернуть аватар уровня');
    expect(controls).toContain('onOpenProfileCard');
    expect(screen).toContain("router.push('/profile_card_upgrade')");
    expect(screen).toContain('resetToLevelAvatar');
  });

  it('preserves the custom-avatar achievement after a first purchase', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain("checkAchievements({ type: 'avatar_custom_set' })");
    expect(screen).toContain("target === 'avatar' && !current.ownedAvatars[itemId]");
  });

  it('emits toast payloads and keeps catalog position when filtering', () => {
    const screen = readProjectFile('app', 'avatar_select.tsx');
    expect(screen).toContain("emitAppEvent('action_toast', actionToastTri(");
    expect(screen).toContain('const handleFilterChange = useCallback');
    expect(screen).toContain('onChange={handleFilterChange}');
    expect(screen).not.toContain('key={`${activeTab}-${filter}`}');
  });
});
