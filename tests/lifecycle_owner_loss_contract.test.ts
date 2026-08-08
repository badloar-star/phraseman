import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('owner-loss lifecycle contracts', () => {
  test('Friends invalidates stale referral work and forces exactly one dirty catch-up', () => {
    const source = read('app/(tabs)/friends.tsx');

    expect(source).toContain('const referralRefreshDirtyRef = useRef(false);');
    expect(source).toContain('referralRefreshDirtyRef.current = true;');
    expect(source).toContain('if (referralRefreshInFlightRef.current === ownedTask)');
    expect(source).toContain('const force = referralRefreshDirtyRef.current;');
    expect(source).toContain('referralRefreshDirtyRef.current = false;');
    expect(source).toContain('void refreshReferralState({ force });');
  });

  test('Home marks late revive and week-marker reads dirty for one resume catch-up', () => {
    const source = read('app/(tabs)/home.tsx');

    expect(source).toContain('reviveOfferDirtyRef.current = true;');
    expect(source).toContain('streakMarkersDirtyRef.current = true;');
    expect(source).toContain('if (!homeRuntimeActiveRef.current) {\n                    reviveOfferDirtyRef.current = true;');
    expect(source).toContain('if (!homeRuntimeActiveRef.current) {\n                    streakMarkersDirtyRef.current = true;');
  });

  test('SpeakingPanel watchdog callbacks own their timer and capture generation', () => {
    const source = read('components/SpeakingPanel.tsx');

    expect(source).toContain('if (watchdogRef.current !== watchdog) return;');
    expect(source).toContain('captureGeneration !== captureGenerationRef.current');
    expect(source).toContain('if (wordWatchdogRef.current !== watchdog) return;');
  });
});
