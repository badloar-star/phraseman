// зачем (координатор 12.10, settings-gap-008): окно «Plus закончился» (holder=entitlementExpired) закрывало экран кадра и шаг робота не находил строку. dev_state?overlays=off гасит и его.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('overlays=off also hides the entitlement-expired window', () => {
  const host = read('components/EntitlementExpiredHost.tsx');

  it('the host subscribes to the dev flag and neither takes the arbiter slot nor renders while it is on', () => {
    expect(host).toContain("import { getDevOverlaysSnapshot, subscribeDevOverlays } from '../app/dev_overlays_off';");
    expect(host).toContain('useSyncExternalStore(subscribeDevOverlays, getDevOverlaysSnapshot, getDevOverlaysSnapshot)');
    expect(host).toContain("useOverlayVisible('entitlementExpired', kind != null && !devOverlaysOff)");
    expect(host).toContain('if (!kind || !overlayVisible || devOverlaysOff) return null;');
  });

  it('the link generator no longer exempts the settings message-slot rows from overlays=off', () => {
    expect(read('scripts/dev_links_r1_generate.py')).toContain('OVERLAYS_KEEP = set()');
  });
});
