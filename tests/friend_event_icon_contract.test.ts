import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const markerPath = path.join(ROOT, 'components/friends_together/FriendEventMarker.tsx');

describe('friend event universal icon contract', () => {
  const marker = fs.readFileSync(markerPath, 'utf8');

  it('uses the approved fixed palette and no raster lookup', () => {
    expect(marker).toContain("PORCELAIN = '#EEE7DB'");
    expect(marker).toContain("GRAPHITE = '#2D3842'");
    expect(marker).toContain("TEAL = '#5E8C90'");
    expect(marker).toContain("AMBER = '#DF824B'");
    expect(marker).not.toMatch(/require\s*\(/);
    expect(marker).not.toContain('Image');
  });

  it('removes every rejected social-marker raster artifact', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/friends_together/friend_event_assets.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'scripts/friend-social/build-marker-assets.mjs'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'assets/images/friends/social-markers'))).toBe(false);
  });
});
