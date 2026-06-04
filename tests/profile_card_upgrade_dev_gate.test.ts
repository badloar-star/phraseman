import fs from 'fs';
import path from 'path';

describe('profile card upgrade dev gate', () => {
  it('keeps the upgrade modal visible only behind ENABLE_DEV_TOOLS', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components', 'ProfileCardUpgradeModal.tsx'), 'utf8');

    expect(source).toContain("import { ENABLE_DEV_TOOLS } from '../app/config';");
    expect(source).toContain('const effectiveVisible = ENABLE_DEV_TOOLS && visible;');
    expect(source).toContain('<Modal visible={effectiveVisible}');
    expect(source).toContain('if (!ENABLE_DEV_TOOLS || busy || !nextDef) return;');
  });
});
