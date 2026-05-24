import fs from 'fs';
import path from 'path';

describe('home VIP celebration queue contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('queues one VIP celebration per grant marker', () => {
    expect(source).toContain('vipCelebrationQueuedMarkerRef');
    expect(source).toContain("const queueKey = marker ?? 'vip_pending'");
    expect(source).toContain('vipCelebrationQueuedMarkerRef.current !== queueKey');
    expect(source).toContain('vipCelebrationQueuedMarkerRef.current === queueKey');
  });

  it('clears the queued marker when the VIP celebration is consumed', () => {
    const closeStart = source.indexOf('<VipCelebrationModal visible={vipCelebrationOverlayVisible}');
    expect(closeStart).toBeGreaterThan(-1);
    const closeBody = source.slice(closeStart, source.indexOf('}/> ', closeStart) === -1 ? closeStart + 500 : source.indexOf('}/> ', closeStart));
    expect(closeBody).toContain('vipCelebrationQueuedMarkerRef.current = null');
    expect(closeBody).toContain('consumeVipCelebration(marker)');
  });
});
