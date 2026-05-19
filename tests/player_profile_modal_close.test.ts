import fs from 'fs';
import path from 'path';

describe('PlayerProfileModal close affordance', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'PlayerProfileModal.tsx'),
    'utf8',
  );

  it('has an explicit close button on the profile sheet, not only backdrop or swipe', () => {
    expect(source).toContain('testID="player-profile-close"');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('onClose: () => void;');
    expect(source).toContain('onClose={handleClose}');
  });
});
