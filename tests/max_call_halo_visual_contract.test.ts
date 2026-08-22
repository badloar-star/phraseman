import fs from 'fs';
import path from 'path';

import { MAX_CALL_HYBRID } from '../constants/motionHybrid';

describe('MAX call aura visual contract', () => {
  it('keeps the approved mockup geometry, opacity, and motion tokens', () => {
    expect(MAX_CALL_HYBRID).toMatchObject({
      containerSize: 178,
      outerRingSize: 170,
      innerRingSize: 138,
      coreSize: 106,
      iconSize: 44,
      ringStrokePx: 1,
      outerRingOpacity: 0.17,
      innerRingOpacity: 0.14,
      coreOpacity: 0.11,
      breathScale: 1.055,
      breathHalfMs: 1500,
      micPulseMax: 0.08,
      micAttackMs: 480,
      micReleaseMs: 720,
    });
  });

  it('renders both structural rings and consumes the shared MAX tokens', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/max_call_halo.tsx'), 'utf8');
    expect(source).toContain("from '../constants/motionHybrid'");
    expect(source).toContain('MAX_CALL_HYBRID.outerRingSize');
    expect(source).toContain('MAX_CALL_HYBRID.innerRingSize');
    expect(source).toContain('borderWidth: MAX_CALL_HYBRID.ringStrokePx');
    expect(source).toContain('opacity: MAX_CALL_HYBRID.outerRingOpacity');
    expect(source).toContain('opacity: MAX_CALL_HYBRID.innerRingOpacity');
    expect(source).toContain('easing: Easing.inOut(Easing.quad)');
  });
});
