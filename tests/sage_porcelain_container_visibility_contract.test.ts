import fs from 'node:fs';
import path from 'node:path';

import { glassFill } from '../constants/glassSurfaceFill';

const ROOT = path.resolve(__dirname, '..');
const source = (...segments: string[]) => fs.readFileSync(path.join(ROOT, ...segments), 'utf8');

describe('Sage Porcelain container visibility', () => {
  it('keeps semantic Sage surfaces opaque instead of reducing them to dark-theme glass', () => {
    expect(glassFill('#FCFDF9', 0.46)).toBe('#E1E5DC');
    expect(glassFill('#E1E5DC', 0.32)).toBe('#E1E5DC');
    expect(glassFill('#D1D9D1', 0.46)).toBe('#D1D9D1');

    expect(glassFill('#101710', 0.46)).toBe('rgba(16,23,16,0.46)');
  });

  it('uses the central light-theme classifier for shared and direct modal surfaces', () => {
    const glassSurface = source('components', 'GlassSurface.tsx');
    const account = source('app', 'account_details.tsx');

    expect(glassSurface).toContain("import { isLightThemeMode } from '../constants/theme';");
    expect(glassSurface).not.toMatch(/function isLightThemeMode\(/);
    // 30.09: экран аккаунта на токенах Liquid Glass активной темы (PRF-02), без ручного light-классификатора.
    expect(account).toContain('liquidGlassTokens(liquidGlassThemeId)');
  });

  // 30.09: визитка 2.0 переписана на токенах Liquid Glass, XP и множители удалены —
  // проверки старой раскладки визитки сняты.
});
