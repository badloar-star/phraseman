import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const markerPath = path.join(ROOT, 'components/friends_together/FriendEventMarker.tsx');

describe('friend event universal icon contract', () => {
  const marker = fs.readFileSync(markerPath, 'utf8');

  it('paints with the tokens of the CURRENT theme (owner law 22.10: no fixed brand palette) and has no raster lookup', () => {
    expect(marker).toContain('useShadowGlass()');
    expect(marker).not.toMatch(/PORCELAIN|GRAPHITE|TEAL|AMBER|#[0-9A-Fa-f]{6}/);
    expect(marker).not.toMatch(/require\s*\(/);
    expect(marker).not.toContain('Image');
  });

  it('removes every rejected social-marker raster artifact', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/friends_together/friend_event_assets.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'scripts/friend-social/build-marker-assets.mjs'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'assets/images/friends/social-markers'))).toBe(false);
  });
});
