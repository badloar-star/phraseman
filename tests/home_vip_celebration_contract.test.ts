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

  it('captures the marker for display at queue time but does NOT consume pending there (consume only on close)', () => {
    // Regression: queue-time consume lost the celebration if the user navigated away
    // before the OverlayArbiter actually presented the modal. Pending must survive until close.
    const premiumStart = source.indexOf('const pending = await isCelebrationPending()');
    expect(premiumStart).toBeGreaterThan(-1);
    const premiumBody = source.slice(premiumStart, source.indexOf('const vipPending = await isVipCelebrationPending()', premiumStart));
    expect(premiumBody).toContain('setCelebrationMarker(marker)');
    // The queue-time block must NOT consume — that is the bug this fix removes.
    expect(premiumBody).not.toContain('consumeCelebration(marker)');

    const vipStart = source.indexOf('const vipPending = await isVipCelebrationPending()');
    expect(vipStart).toBeGreaterThan(-1);
    const vipBody = source.slice(vipStart, source.indexOf('catch (error)', vipStart));
    expect(vipBody).toContain('setVipCelebrationMarker(marker)');
    expect(vipBody).not.toContain('consumeVipCelebration(marker)');
  });

  it('guards the premium celebration with a session ref so it does not re-queue every loadData before close', () => {
    // Without the early consume, isCelebrationPending() stays true until the user closes the
    // modal. celebrationQueuedRef prevents re-arming the modal/timer on each loadData run.
    expect(source).toContain('celebrationQueuedRef');
    expect(source).toContain('!celebrationQueuedRef.current');
    expect(source).toContain('celebrationQueuedRef.current = true');
  });

  it('consumes both celebrations only in their onClose handlers', () => {
    const premiumClose = source.indexOf('<PremiumCelebrationModal visible={celebrationOverlayVisible}');
    expect(premiumClose).toBeGreaterThan(-1);
    const premiumCloseBody = source.slice(premiumClose, premiumClose + 800);
    expect(premiumCloseBody).toContain('consumeCelebration(marker)');
    // Closing resets the session guard so a later grant can re-arm.
    expect(premiumCloseBody).toContain('celebrationQueuedRef.current = false');

    const vipClose = source.indexOf('<VipCelebrationModal visible={vipCelebrationOverlayVisible}');
    expect(vipClose).toBeGreaterThan(-1);
    const vipCloseBody = source.slice(vipClose, vipClose + 800);
    expect(vipCloseBody).toContain('consumeVipCelebration(marker)');
  });

  it('clears the queued marker when the VIP celebration is consumed', () => {
    const closeStart = source.indexOf('<VipCelebrationModal visible={vipCelebrationOverlayVisible}');
    expect(closeStart).toBeGreaterThan(-1);
    const closeBody = source.slice(closeStart, source.indexOf('}/> ', closeStart) === -1 ? closeStart + 500 : source.indexOf('}/> ', closeStart));
    expect(closeBody).toContain('vipCelebrationQueuedMarkerRef.current = null');
    expect(closeBody).toContain('consumeVipCelebration(marker)');
  });
});
