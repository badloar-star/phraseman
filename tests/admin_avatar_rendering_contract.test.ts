import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ADMIN_INDEX = path.join(ROOT, 'admin', 'v2', 'legacy.html');
// Numeric level avatars are an older, unrelated mirror contract. Keep its
// established source while this change moves only custom-gen artwork.
const ADMIN_LEVEL_AVATARS = path.join(ROOT, 'admin', 'avatars');
const ADMIN_CUSTOM_AVATARS = path.join(
  ROOT,
  'admin',
  'v2',
  'avatars',
);
const APP_LEVEL_AVATARS = path.join(ROOT, 'assets', 'images', 'levels', 'generated-v5-dalle');

function extractAvatarImgFunctionSource(): string {
  const html = fs.readFileSync(ADMIN_INDEX, 'utf8');
  const start = html.indexOf('function avatarImg(');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = html.indexOf('\n  const ADMIN_DATE_LOCALE', start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

function renderAvatar(value: string, size = 32): string {
  const source = `${extractAvatarImgFunctionSource()}\nreturn avatarImg(${JSON.stringify(value)}, ${size});`;
  return Function(source)();
}

describe('admin avatar rendering contract', () => {
  it('renders current custom-gen avatars from the server-hosted archive', () => {
    const html = renderAvatar('custom:custom-gen-41:ruby:white');

    expect(html).toContain('avatars/custom-idea-41-white.webp');
    expect(html).not.toContain('avatars/1.webp');
  });

  it('keeps old custom avatar ids working', () => {
    const html = renderAvatar('custom:custom-21:aurora:black');

    expect(html).toContain('avatars/custom-21-logo.webp');
    expect(html).not.toContain('avatars/1.webp');
  });

  it('renders and ships the same numeric level avatar assets as the app', () => {
    expect(renderAvatar('60')).toContain('avatars/60.webp');

    for (let i = 1; i <= 60; i += 1) {
      const fileName = `${i}.webp`;
      const adminBytes = fs.readFileSync(path.join(ADMIN_LEVEL_AVATARS, fileName));
      const appBytes = fs.readFileSync(path.join(APP_LEVEL_AVATARS, fileName));
      expect(adminBytes.equals(appBytes)).toBe(true);
    }
  });

  it('ships every current custom-gen avatar image to static admin hosting', () => {
    for (let i = 1; i <= 62; i += 1) {
      const id = String(i).padStart(2, '0');
      expect(fs.existsSync(path.join(ADMIN_CUSTOM_AVATARS, `custom-idea-${id}-black.webp`))).toBe(true);
      expect(fs.existsSync(path.join(ADMIN_CUSTOM_AVATARS, `custom-idea-${id}-white.webp`))).toBe(true);
    }
  });
});
