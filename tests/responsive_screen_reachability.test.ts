import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('short-window action reachability', () => {
  // зачем: D83 — экраны задания Арены (ArenaQuestion/ArenaScreen) удалены,
  // их проверки досягаемости сняты вместе с ними.

  it('bounds error reporting against the keyboard viewport instead of a minimum screen height', () => {
    const source = read('components/ReportErrorButton.tsx');
    expect(source).not.toContain("Dimensions.get('window')");
    expect(source).toContain("maxHeight: '100%'");
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('provides overflow recovery in both remaining flashcard training routes', () => {
    for (const file of ['flashcards_blitz_session', 'flashcards_speaking_session']) {
      const source = read(`app/${file}.tsx`);
      expect(source).toContain('<ScrollView');
      expect(source).toContain('contentContainerStyle=');
      expect(source).not.toContain('numberOfLines=');
    }
  });

  it('gives ordinary hybrid alerts a scroll fallback while preserving self-scrolling forms', () => {
    const source = read('components/modal_fx/HybridAlertShell.tsx');
    expect(source).toContain('<ScrollView');
    expect(source).toContain('fillAvailableHeight');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it.each([
    'components/celebration/ReferralFriendRewardHybrid.tsx',
    'components/PersonalAdminMessageModal.tsx',
    'components/GlobalBroadcastModal.tsx',
  ])('keeps the complete reward/message reachable in %s', file => {
    const source = read(file);
    expect(source).toContain('<ScrollView');
    expect(source).toContain("maxHeight: '100%'");
  });

  it.each(['UpdateModal', 'PhoneStateRecoveryScreen'])(
    'uses safe-area page overflow in %s', file => {
      expect(read(`components/${file}.tsx`)).toContain('<ResponsiveModalScrollView');
    },
  );

});
