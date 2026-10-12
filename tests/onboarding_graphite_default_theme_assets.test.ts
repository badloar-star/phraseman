import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// зачем (10.10, старая система тем заменена Liquid Glass 2.0): прежние проверки — «устаревшие id тем ведут на Indigo»
// и палитра MINIMAL_DARK — описывали режимы, которых в коде больше нет (тексты `themeMode === 'minimalDark'`, `export const MINIMAL_DARK`
// удалены), поэтому убраны. Остаётся живая гарантия: у домашнего меню нет собственных ассетов onboarding-graphite.
describe('removed graphite theme assets', () => {
  test('home menu has no own onboarding-graphite assets', () => {
    // зачем (15.10): home_menu_icons.ts удалён вместе с иконками меню 1.0 — собственных ассетов у меню нет вовсе.
    expect(fs.existsSync(path.join(ROOT, 'app', 'home_menu_icons.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'assets', 'images', 'home_menu', 'onboarding-graphite'))).toBe(false);
  });
});
