import fs from 'fs';
import path from 'path';

describe('personal profile-card upgrade affordance', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components', 'PlayerProfileModal.tsx'),
    'utf8',
  );

  const marker = 'testID="player-profile-upgrade-card"';
  const markerIndex = source.indexOf(marker);
  const blockStart = source.lastIndexOf('<', markerIndex);
  const pressableEnd = source.indexOf('</Pressable>', markerIndex);
  const touchableEnd = source.indexOf('</TouchableOpacity>', markerIndex);
  const blockEnd = pressableEnd >= 0 ? pressableEnd : touchableEnd;
  const buttonBlock = source.slice(blockStart, blockEnd);

  it('uses the same compact circular action size with an upward arrow only', () => {
    expect(markerIndex).toBeGreaterThan(-1);
    expect(buttonBlock).toContain('<Pressable');
    expect(buttonBlock).toContain('name="arrow-up"');
    expect(buttonBlock).toContain('top: PROFILE_HEADER_ACTION_TOP + PROFILE_HEADER_ACTION_SIZE + PROFILE_HEADER_ACTION_GAP');
    expect(buttonBlock).toContain('right: PROFILE_HEADER_ACTION_RIGHT');
    expect(buttonBlock).toContain('width: PROFILE_HEADER_ACTION_SIZE');
    expect(buttonBlock).toContain('height: PROFILE_HEADER_ACTION_SIZE');
    expect(buttonBlock).not.toContain("ru: 'Улучшить'");
    expect(buttonBlock).not.toContain('name="diamond"');
  });

  it('keeps the control owner-only, level-gated, and wired to preview', () => {
    expect(source).toContain('isMe && ENABLE_PROFILE_CARD && nextRealLevel !== null');
    expect(buttonBlock).toContain('onPress={handleUpgradeButtonTap}');
    expect(buttonBlock).toContain("ru: 'Улучшить карточку'");
    expect(buttonBlock).toContain('hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}');
  });
});
