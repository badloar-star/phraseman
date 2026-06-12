import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(__dirname, '..');

function walk(dir: string, matcher: RegExp = /\.(webp|png|jpe?g)$/i): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next, matcher);
    return matcher.test(entry.name) ? [next] : [];
  });
}

describe('adaptive background assets', () => {
  it('does not map deleted screen background asset groups', () => {
    const generated = fs.readFileSync(
      path.join(ROOT, 'components', 'adaptiveBackgroundAssets.generated.ts'),
      'utf8',
    );

    expect(generated).not.toMatch(/app_backdrops|screen_backdrops|theme_backdrops|first_lesson_sheet|premium_hero/);
  });

  it('does not use stretch mode for app background images', () => {
    const files = [
      'app',
      'components',
      'constants',
      'hooks',
      'lib',
    ].flatMap(root => walk(path.join(ROOT, root), /\.(tsx?|jsx?)$/i));

    const offenders = files.flatMap(file => {
      const body = fs.readFileSync(file, 'utf8');
      return body.match(/(?:resizeMode|contentFit)=["']stretch["']/g)
        ? [path.relative(ROOT, file)]
        : [];
    });

    expect(offenders).toEqual([]);
  });
});
