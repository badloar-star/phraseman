import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('boon activation modal contract', () => {
  const hostSource = () =>
    fs.readFileSync(path.join(ROOT, 'components', 'BoonActivatedHost.tsx'), 'utf8');

  it('shows the evening unlimited-energy modal only during the real local energy window', () => {
    const src = hostSource();

    expect(src).toContain('isEnergyFreeWindowActive');
    expect(src).toContain("primary === 'energy_free_window' && !isEnergyFreeWindowActive()");
    expect(src).toContain('ENERGY_FREE_WINDOW_START_HOUR');
    expect(src).toContain('msUntilLocalHour');
  });

  it('does not show free-only visual boon popups to premium users', () => {
    const src = hostSource();

    expect(src).toContain('FREE_ONLY_VISUAL_BOONS');
    expect(src).toContain('hasPremiumAccess && FREE_ONLY_VISUAL_BOONS.has(primary)');
    expect(src).toContain("'turbo_regen'");
    expect(src).toContain("'energy_free_window'");
    expect(src).toContain("'flashcard_friday'");
  });

  it('marks the informational boon popup as shown when it really becomes visible', () => {
    const src = hostSource();
    const visibleEffectStart = src.indexOf('if (visible) {');
    const visibleEffect = src.slice(visibleEffectStart, visibleEffectStart + 200);

    expect(visibleEffectStart).toBeGreaterThanOrEqual(0);
    expect(visibleEffect).toContain('markShown()');
  });
});
