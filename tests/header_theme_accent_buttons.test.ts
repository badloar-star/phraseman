import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');

const THEME_BUTTON_DIR = 'assets/images/header_glyphs/theme-accent-buttons';
const THEME_MODES = ['dark', 'neon', 'gold', 'coral', 'minimalLight', 'minimalDark', 'compass'] as const;

type AlphaBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  coverage: number;
};

async function alphaBounds(assetPath: string): Promise<AlphaBounds> {
  const { data, info } = await sharp(assetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count += 1;
      }
    }
  }

  return { minX, minY, maxX, maxY, coverage: count / (info.width * info.height) };
}

describe('header theme accent buttons', () => {
  test('provides transparent play and message buttons for every active theme', async () => {
    for (const themeMode of THEME_MODES) {
      for (const kind of ['play', 'message'] as const) {
        const assetPath = path.join(ROOT, THEME_BUTTON_DIR, `${kind}-button-${themeMode}-dalle-v1.webp`);
        expect(fs.existsSync(assetPath)).toBe(true);

        const metadata = await sharp(assetPath).metadata();
        expect(metadata.width).toBe(320);
        expect(metadata.height).toBe(224);
        expect(metadata.hasAlpha).toBe(true);
      }
    }
  });

  test('home header buttons use the theme accent button assets', () => {
    const lingmanSource = fs.readFileSync(path.join(ROOT, 'components', 'LingmanVideosButton.tsx'), 'utf8');
    const inboxSource = fs.readFileSync(path.join(ROOT, 'components', 'AppMessagesInbox.tsx'), 'utf8');

    for (const themeMode of THEME_MODES) {
      expect(lingmanSource).toContain(`${THEME_BUTTON_DIR}/play-button-${themeMode}-dalle-v1.webp`);
      expect(inboxSource).toContain(`${THEME_BUTTON_DIR}/message-button-${themeMode}-dalle-v1.webp`);
    }
  });

  test('play and message header buttons keep the same visual box and baseline', () => {
    const lingmanSource = fs.readFileSync(path.join(ROOT, 'components', 'LingmanVideosButton.tsx'), 'utf8');
    const inboxSource = fs.readFileSync(path.join(ROOT, 'components', 'AppMessagesInbox.tsx'), 'utf8');

    expect(lingmanSource).toContain('width: 66');
    expect(lingmanSource).toContain('height: 54');
    expect(lingmanSource).toContain('width: 56');
    expect(lingmanSource).toContain('height: 40');
    expect(lingmanSource).not.toContain('translateY');

    const headerIconBlock = inboxSource.slice(
      inboxSource.indexOf('  headerIcon: {'),
      inboxSource.indexOf('  badge: {'),
    );
    expect(inboxSource).toContain('width: 66');
    expect(inboxSource).toContain('height: 54');
    expect(headerIconBlock).toContain('width: 56');
    expect(headerIconBlock).toContain('height: 40');
    expect(headerIconBlock).not.toContain('translateY');
  });

  test('play and message assets share a stable transparent visual frame', async () => {
    for (const themeMode of THEME_MODES) {
      const playPath = path.join(ROOT, THEME_BUTTON_DIR, `play-button-${themeMode}-dalle-v1.webp`);
      const messagePath = path.join(ROOT, THEME_BUTTON_DIR, `message-button-${themeMode}-dalle-v1.webp`);
      const play = await alphaBounds(playPath);
      const message = await alphaBounds(messagePath);

      expect(Math.abs(play.minX - message.minX)).toBeLessThanOrEqual(1);
      expect(Math.abs(play.maxX - message.maxX)).toBeLessThanOrEqual(1);
      expect(Math.abs(play.minY - message.minY)).toBeLessThanOrEqual(1);
      expect(Math.abs(play.maxY - message.maxY)).toBeLessThanOrEqual(1);
      expect(Math.abs(play.coverage - message.coverage)).toBeLessThanOrEqual(0.01);
    }
  });
});
