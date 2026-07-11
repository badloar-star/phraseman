import fs from 'fs';
import path from 'path';

describe('PlayerProfileModal close affordance', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'PlayerProfileModal.tsx'),
    'utf8',
  );
  const clubSource = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'club_screen.tsx'),
    'utf8',
  );

  it('has an explicit close button on the profile sheet, not only backdrop or swipe', () => {
    expect(source).toContain('testID="player-profile-close"');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('onClose: () => void;');
    expect(source).toContain('onClose={handleClose}');
  });

  it('falls back to the selected player streak for self and receives the current club streak', () => {
    expect(source).toContain(
      'const streak = isMe ? (myInfo.streak ?? player.streak ?? null) : (player.streak ?? null);',
    );
    expect(clubSource).toContain(
      'const currentUserStreak = sortedGroup.find((p) => p.isMe)?.streak ?? null;',
    );
    expect(clubSource.match(/streak: currentUserStreak,/g)).toHaveLength(2);
  });
});
