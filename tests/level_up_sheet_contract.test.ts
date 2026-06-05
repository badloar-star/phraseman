import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('global level-up sheet contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');

  it('uses the centered level badge modal instead of the full-screen level-up sheet', () => {
    expect(source).toContain('testID="level-up-modal"');
    expect(source).toContain('<LevelBadge level={currentLevel}');
    expect(source).toContain('USE_ELITE_LEVEL_UP_MODAL');
    expect(source).not.toContain('testID="level-up-sheet"');
    expect(source).not.toContain('AvatarView avatar={levelUpDisplayAvatar}');
    expect(source).not.toContain("const LEVEL_UP_FALLBACK_AVATAR = 'custom:custom-gen-04:royal:white'");
  });

  it('keeps the old centered modal spring animation', () => {
    expect(source).toContain('levelUpTranslateY.setValue(40)');
    expect(source).toContain('Animated.spring(levelUpOpacity');
    expect(source).toContain('Animated.spring(levelUpTranslateY');
    expect(source).toContain('levelUpModalScale');
  });

  it('keeps the dev preview URL wired through the real pending queue', () => {
    expect(source).toContain('globalParams.levelUpPreview');
    expect(source).toContain("AsyncStorage.setItem('pending_level_up_queue', JSON.stringify([level]))");
    expect(source).toContain('.then(flushQueue)');
  });
});
