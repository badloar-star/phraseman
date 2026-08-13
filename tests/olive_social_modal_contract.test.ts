import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Olive social modal chrome', () => {
  it('gives every friends modal family an Olive noir resolver', () => {
    const source = read('app/(tabs)/friends.tsx');
    const startedModal = source.slice(
      source.indexOf('function FriendQuestStartedModal'),
      source.indexOf('function FriendQuestCompletedModal'),
    );
    expect(source).toContain("if (themeMode === 'olive')");
    expect(source).toContain('OLIVE_RICH.panel');
    expect(source).toContain('OLIVE_GRADIENTS.raisedPanel');
    expect(source).toContain('oliveShadow(3)');
    expect(source).toContain('friendQuestModalChrome(themeMode)');
    expect(source).toContain('friendGiftModalChrome(themeMode)');
    expect(source).toContain('friendGiftIncomingModalChrome(themeMode)');
    expect(startedModal).toContain('const modalChrome = friendQuestModalChrome(themeMode);');
    const completedModal = source.slice(
      source.indexOf('function FriendQuestCompletedModal'),
      source.indexOf("type ActivityFeedSection"),
    );
    for (const modal of [startedModal, completedModal]) {
      expect(modal).toContain("themeMode === 'olive' ? modalChrome.text : monoIcon");
      expect(modal).toContain("themeMode === 'olive' ? modalChrome.mutedText : monoIcon");
    }
    expect(startedModal).toContain("color: monoIcon(themeMode, '#241905', MONO_ICON.onLight)");
    expect(completedModal).toContain("backgroundColor: themeMode === 'olive' ? modalChrome.button : '#34C759'");
    expect(completedModal).toContain("color: monoIcon(themeMode, '#071E0C', MONO_ICON.onLight)");
    expect(source).toContain("borderColor: 'transparent'");
  });
});
