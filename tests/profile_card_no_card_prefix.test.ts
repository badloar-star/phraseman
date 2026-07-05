import fs from 'fs';
import path from 'path';
import { profileCardLevelLabel } from '../components/profileCardLabel';
import type { ProfileCardLevel } from '../app/profile_card_system';

// Обрезаем цепочку импортов profile_card_system → shards_system → … → remote_flags:
// у remote_flags module-scope __DEV__, которого в jest нет (моки — как в соседних
// тестах карточки).
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));

describe('profile card label has no "CARD" prefix', () => {
  it('returns the Russian product name for ru, "Lv N" otherwise', () => {
    expect(profileCardLevelLabel(0, true)).toBe('Стандарт');
    expect(profileCardLevelLabel(1, true)).toBe('Phraseman Pro');
    expect(profileCardLevelLabel(1, false)).toBe('Lv I');
    expect(profileCardLevelLabel(2, true)).toBe('Teal');
    expect(profileCardLevelLabel(3, false)).toBe('Lv III');
    expect(profileCardLevelLabel(5, true)).toBe('Platinum');
    expect(profileCardLevelLabel(5, false)).toBe('Lv V');
  });

  it('never emits the word "CARD"', () => {
    ([0, 1, 2, 3, 4, 5] as ProfileCardLevel[]).forEach((lvl) => {
      expect(profileCardLevelLabel(lvl, true)).not.toMatch(/CARD/i);
      expect(profileCardLevelLabel(lvl, false)).not.toMatch(/CARD/i);
    });
  });

  const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

  it('the badge, upgrade screen and profile modal carry no literal "CARD " label', () => {
    expect(read('components/ProfileCardBadge.tsx')).not.toMatch(/CARD \{/);
    expect(read('components/ProfileCardBadge.tsx')).not.toMatch(/['"`]CARD /);
    expect(read('app/profile_card_upgrade.tsx')).not.toMatch(/CARD \$\{/);
    expect(read('components/PlayerProfileModal.tsx')).not.toMatch(/CARD \$\{/);
    expect(read('app/avatar_select.tsx')).not.toMatch(/· CARD /);
  });
});
