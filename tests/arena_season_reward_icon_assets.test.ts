import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { arenaActionIconSource } from '../app/arena_action_icons';

const ROOT = path.resolve(__dirname, '..');
const THEMES = ['dark', 'gold', 'coral', 'minimalDark', 'midnight', 'ember', 'aurora', 'volt'] as const;

describe('arena season reward themed icon assets', () => {
  it('ships a generated transparent 160x160 WebP for every app theme', async () => {
    for (const theme of THEMES) {
      const file = path.join(
        ROOT,
        'assets/images/arena_actions',
        `arena-action-season-reward-${theme}.webp`,
      );

      expect(fs.existsSync(file)).toBe(true);

      const metadata = await sharp(file).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(160);
      expect(metadata.height).toBe(160);
      expect(metadata.hasAlpha).toBe(true);

      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let chromaPixels = 0;
      for (let i = 0; i < info.width * info.height; i += 1) {
        const offset = i * 4;
        const [r, g, b, a] = data.subarray(offset, offset + 4);
        if (a > 12 && r > 245 && g < 16 && b > 245) chromaPixels += 1;
      }
      expect(chromaPixels).toBe(0);
    }
  });

  it('uses the seasonReward image source in the arena season rewards row', () => {
    const registrySource = fs.readFileSync(path.join(ROOT, 'app/arena_action_icons.ts'), 'utf8');
    const lobbySource = fs.readFileSync(path.join(ROOT, 'app/arena_lobby.tsx'), 'utf8');
    const rowStart = lobbySource.indexOf('testID="arena-battle-pass"');
    const rowEnd = lobbySource.indexOf('testID="arena-throne-info"', rowStart);
    const rowSource = lobbySource.slice(rowStart, rowEnd);

    expect(registrySource).toContain("export type ArenaActionIconKind = 'match' | 'friend' | 'throne' | 'seasonReward'");
    for (const theme of THEMES) {
      expect(registrySource).toContain(
        `require('../assets/images/arena_actions/arena-action-season-reward-${theme}.webp')`,
      );
    }
    expect(registrySource).toContain(
      "business: require('../assets/images/arena_actions/arena-action-season-reward-business.webp')",
    );
    expect(registrySource).toContain(
      "businessLight: require('../assets/images/arena_actions/arena-action-season-reward-businessLight.webp')",
    );

    expect(lobbySource).toContain("arenaActionIconSource('seasonReward', themeMode)");
    expect(arenaActionIconSource('seasonReward', 'dark')).toBeTruthy();
    expect(arenaActionIconSource('seasonReward', 'business')).toBeTruthy();
    expect(rowSource).toContain('source={arenaSeasonRewardIconSource}');
    expect(rowSource).toContain('style={styles.arenaCommandActionIcon}');
    expect(rowSource).not.toContain('name="trophy"');
  });
});
