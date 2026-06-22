import fs from 'fs';
import path from 'path';

/**
 * Regression guard: the league-bonus / crown modals must respect device safe
 * areas (notch / Dynamic Island, home-indicator, rounded corners). They center
 * a card over a full-screen overlay, so without safe-area padding the card can
 * slide under system zones on tall devices. Both modals must read
 * useSafeAreaInsets() and feed insets into the centering container's padding.
 */
const MODAL_FILES = [
  'LeagueBonusAvailableModal.tsx',
  'LeagueChestOpenModal.tsx',
] as const;

function readModalSource(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'components', file), 'utf8');
}

describe('league bonus crown modals respect safe-area insets', () => {
  for (const file of MODAL_FILES) {
    describe(file, () => {
      const source = readModalSource(file);

      it('imports useSafeAreaInsets from react-native-safe-area-context', () => {
        expect(source).toContain("from 'react-native-safe-area-context'");
        expect(source).toContain('useSafeAreaInsets');
      });

      it('reads the insets inside the component', () => {
        expect(source).toContain('const insets = useSafeAreaInsets();');
      });

      it('feeds insets into the centering container padding (all four edges)', () => {
        expect(source).toContain('insets.top');
        expect(source).toContain('insets.bottom');
        expect(source).toContain('insets.left');
        expect(source).toContain('insets.right');
        // Must clamp so the card never gets LESS breathing room than the
        // original static padding, only more when a safe area exists.
        expect(source).toMatch(/Math\.max\(18, insets\.top/);
        expect(source).toMatch(/Math\.max\(18, insets\.bottom/);
      });
    });
  }
});
