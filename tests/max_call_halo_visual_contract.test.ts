import fs from 'fs';
import path from 'path';

import { MAX_CALL_HYBRID } from '../constants/motionHybrid';

describe('MAX call aura visual contract', () => {
  it('keeps the non-tutor aura layered and visibly responsive without freezing old pixels', () => {
    expect(MAX_CALL_HYBRID.outerRingSize).toBeGreaterThan(MAX_CALL_HYBRID.innerRingSize);
    expect(MAX_CALL_HYBRID.innerRingSize).toBeGreaterThan(MAX_CALL_HYBRID.coreSize);
    expect(MAX_CALL_HYBRID.containerSize).toBeGreaterThanOrEqual(MAX_CALL_HYBRID.outerRingSize);
    expect(MAX_CALL_HYBRID.outerRingOpacity).toBeGreaterThan(0);
    expect(MAX_CALL_HYBRID.innerRingOpacity).toBeGreaterThan(0);
    expect(MAX_CALL_HYBRID.micPulseMax).toBeGreaterThan(MAX_CALL_HYBRID.breathScale - 1);
    expect(MAX_CALL_HYBRID.micAttackMs).toBeLessThan(MAX_CALL_HYBRID.micReleaseMs);
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
