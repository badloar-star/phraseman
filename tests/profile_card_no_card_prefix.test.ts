import fs from 'fs';
import path from 'path';
import { profileCardLevelLabel } from '../components/profileCardLabel';

/**
 * The user asked to drop the literal "CARD" prefix from every profile-card level label
 * (CARD I … CARD V). For Russian we show the product names; for other languages "Lv N".
 * These checks lock that in so the prefix can't quietly come back.
 */
describe('profile card label has no "CARD" prefix', () => {
  it('returns the Russian product name for ru, "Lv N" otherwise', () => {
    expect(profileCardLevelLabel(0, true)).toBe('Стандарт');
    expect(profileCardLevelLabel(1, true)).toBe('Гранёная');
    expect(profileCardLevelLabel(5, true)).toBe('Элита');
    expect(profileCardLevelLabel(3, false)).toBe('Lv III');
    expect(profileCardLevelLabel(5, false)).toBe('Lv V');
  });

  it('never emits the word "CARD"', () => {
    for (let lvl = 0 as 0 | 1 | 2 | 3 | 4 | 5; lvl <= 5; lvl = (lvl + 1) as any) {
      expect(profileCardLevelLabel(lvl, true)).not.toMatch(/CARD/i);
      expect(profileCardLevelLabel(lvl, false)).not.toMatch(/CARD/i);
    }
  });

  const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

  it('the badge, the upgrade screen and the profile modal carry no literal "CARD " label', () => {
    // The badge pill and headers must use the localized label, not "CARD {roman}".
    expect(read('components/ProfileCardBadge.tsx')).not.toMatch(/CARD \{/);
    expect(read('components/ProfileCardBadge.tsx')).not.toMatch(/['"`]CARD /);
    expect(read('app/profile_card_upgrade.tsx')).not.toMatch(/CARD \$\{/);
    expect(read('components/PlayerProfileModal.tsx')).not.toMatch(/CARD \$\{/);
    // avatar_select entry row likewise.
    expect(read('app/avatar_select.tsx')).not.toMatch(/· CARD /);
  });
});
