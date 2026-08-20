/**
 * «Вместе» — статический контракт на новые UI-компоненты (docs/plans/
 * 2026-08-16-friends-together-implementation.ru.md §5). Проверяет то, что
 * обычные unit-тесты не ловят: запрет обводок контейнеров, запрет
 * adjustsFontSizeToFit, fontWeight только 400/700, каждая пользовательская
 * строка идёт через triLang со всеми 8 ключами, useReduceMotion присутствует
 * в каждом анимированном компоненте, и friends.tsx содержит гейт
 * useFriendsTogetherEnabled вокруг новой вёрстки.
 */
import fs from 'node:fs';
import path from 'node:path';

const COMPONENTS_DIR = path.join(process.cwd(), 'components/friends_together');
const FRIENDS_TAB_FILE = path.join(process.cwd(), 'app/(tabs)/friends.tsx');
const SETTINGS_FILE = path.join(process.cwd(), 'app/settings_notifications.tsx');

const COMPONENT_FILES = [
  'FriendsChestCard.tsx',
  'FriendTogetherSheet.tsx',
  'FriendLevelUpModal.tsx',
  'FriendsChestModal.tsx',
  'FriendListRow.tsx',
];

function readComponent(name: string): string {
  return fs.readFileSync(path.join(COMPONENTS_DIR, name), 'utf8');
}

const LANG_KEYS = ["ru", "uk", "es", "'pt-BR'", 'vi', 'id', 'tr', 'pl'];

describe('friends_together UI contract', () => {
  test.each(COMPONENT_FILES)('%s exists', (file) => {
    expect(fs.existsSync(path.join(COMPONENTS_DIR, file))).toBe(true);
  });

  test.each(COMPONENT_FILES)('%s has no container border styles', (file) => {
    const source = readComponent(file);
    expect(source).not.toMatch(/borderWidth:\s*[1-9]/);
    expect(source).not.toMatch(/borderColor:\s*(?!'transparent')/);
  });

  test.each(COMPONENT_FILES)('%s never uses adjustsFontSizeToFit', (file) => {
    const source = readComponent(file);
    expect(source).not.toContain('adjustsFontSizeToFit');
  });

  test.each(COMPONENT_FILES)('%s only uses fontWeight 400 or 700', (file) => {
    const source = readComponent(file);
    const matches = [...source.matchAll(/fontWeight:\s*'(\d+)'/g)].map((m) => m[1]);
    for (const weight of matches) {
      expect(['400', '700']).toContain(weight);
    }
  });

  test.each(COMPONENT_FILES)('%s has no small caption/subtitle text under a title', (file) => {
    const source = readComponent(file);
    // Запрет из ТЗ: никаких «subtitle»/«caption»/«description» мелким шрифтом под заголовком.
    expect(source).not.toMatch(/subtitle/i);
    expect(source).not.toMatch(/caption/i);
  });

  test.each(COMPONENT_FILES)('%s routes user-facing strings through triLang with all 8 keys', (file) => {
    const source = readComponent(file);
    const calls = [...source.matchAll(/triLang\(lang(?: as any)?,\s*\{([^}]*)\}\)/gs)];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      const body = call[1];
      for (const key of LANG_KEYS) {
        // Ключ либо как `ru:`, либо shorthand `{ ru, uk, … }` (обёртка L() в компонентах).
        const bare = key.replace(/'/g, '');
        const present = body.includes(`${key}:`) || body.split(/[\s,{}]+/).includes(bare);
        expect(present).toBe(true);
      }
    }
  });

  test('celebration modals (level-up, chest) use useRewardImpactHybrid and useReduceMotion is present in the shared engine', () => {
    const levelUp = readComponent('FriendLevelUpModal.tsx');
    const chest = readComponent('FriendsChestModal.tsx');
    expect(levelUp).toContain('useRewardImpactHybrid');
    expect(chest).toContain('useRewardImpactHybrid');
    // useRewardImpactHybrid сам гейтит reduceMotion внутри (components/celebration/
    // use_reward_impact_hybrid.ts) — компоненты-потребители не обязаны звать
    // useReduceMotion повторно, но FriendsChestCard анимирует локально (idle rock)
    // и обязан гейтить сам.
    const chestCard = readComponent('FriendsChestCard.tsx');
    expect(chestCard).toContain('useReduceMotion');
  });

  test('use_reward_impact_hybrid engine itself gates on useReduceMotion (shared by both celebration modals)', () => {
    const engine = fs.readFileSync(
      path.join(process.cwd(), 'components/celebration/use_reward_impact_hybrid.ts'),
      'utf8',
    );
    expect(engine).toContain('useReduceMotion');
  });

  test('friends.tsx gates the new UI behind useFriendsTogetherEnabled', () => {
    const source = fs.readFileSync(FRIENDS_TAB_FILE, 'utf8');
    expect(source).toContain('useFriendsTogetherEnabled');
    expect(source).toContain("from '../friends_together/together_config'");
  });

  test('friends.tsx wires the data flow: prime on mount, refresh after profiles batch', () => {
    const source = fs.readFileSync(FRIENDS_TAB_FILE, 'utf8');
    expect(source).toContain('primeFriendsTogetherSnapshot');
    expect(source).toContain('refreshFriendsTogether');
  });

  test('friends.tsx imports the new components', () => {
    const source = fs.readFileSync(FRIENDS_TAB_FILE, 'utf8');
    expect(source).toContain("from '../../components/friends_together/FriendsChestCard'");
    expect(source).toContain("from '../../components/friends_together/FriendTogetherSheet'");
    expect(source).toContain("from '../../components/friends_together/FriendLevelUpModal'");
    expect(source).toContain("from '../../components/friends_together/FriendsChestModal'");
  });

  test('settings_notifications.tsx has a "Друзья" toggle bound to prefs.categories.friends', () => {
    const source = fs.readFileSync(SETTINGS_FILE, 'utf8');
    expect(source).toContain("prefs.categories.friends");
    expect(source).toContain("toggleCategory('friends')");
  });

  test('_layout.tsx calls syncFriendsPushPrefIfChanged once at boot', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
    expect(source).toContain('syncFriendsPushPrefIfChanged');
  });

  test('FriendTogetherSheet keeps the large vertical details surface contract', () => {
    const source = readComponent('FriendTogetherSheet.tsx');
    expect(source).toContain('together: FriendTogetherDisplay | null');
    expect(source).toContain('<ScrollView');
    expect(source).toContain('nestedScrollEnabled');
    expect(source).toContain('style={styles.scroll}');
    expect(source).toContain('flexShrink: 1');
    expect(source).toContain('backdropAccessible={false}');
    expect(source).toContain('requestDismiss');
    expect(source).toContain('accessibilityRole="progressbar"');
    expect(source).toContain('accessibilityValue={{ min: 0, max: 100, now: progress }}');
    expect(source).toContain("flexDirection: 'column'");
    expect(source).toContain('minHeight: 52');
    expect(source).toContain('friend-together-sheet-high-five');
    expect(source).toContain('friend-together-sheet-delete');
    expect(source).not.toContain('numberOfLines');
    expect(source).not.toContain('onPress={onClose}');
    expect(source).not.toContain("flexDirection: 'row',\n    gap: 8,\n    marginTop: 20");
  });
});
