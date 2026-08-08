import fs from 'fs';
import path from 'path';

describe('SpinRewardPlaque contract', () => {
  const sourcePath = path.join(process.cwd(), 'components', 'SpinRewardPlaque.tsx');

  test('is the reusable receipt-gated +1 spin presentation standard', () => {
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('export type SpinRewardPlaqueProps');
    expect(source).toContain('amount: 1;');
    expect(source).toContain('receiptId: string;');
    expect(source).toContain('visible: boolean;');
    expect(source).toContain('onComplete: () => void;');
    expect(source).toContain("soundDirector.request('pm.reward.small'");
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('translateY');
    expect(source).toContain("name=\"sync\"");
    expect(source).toContain('const APPEARANCE_DELAY_MS = 280;');
    expect(source).toContain('const HOLD_MS = 1_100;');
    expect(source).toContain('const EXIT_MS = 650;');
    expect(source).toContain('minHeight: 76');
    expect(source).toContain('width: 52');
    expect(source).toContain('backgroundColor: theme.bgCard');
    expect(source).not.toContain('rewardModalSoftSurface');
    expect(source).toContain('borderWidth: 2');
    expect(source).toContain('elevation: 24');
    expect(source).toContain('staticPresentation?: boolean');
    expect(source).toContain('staticPresentation = false');
    expect(source).toContain('if (staticPresentation) return undefined');
  });
});
