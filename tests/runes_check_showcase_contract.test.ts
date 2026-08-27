import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

/**
 * зачем (владелец, 2026-08-27): «должен быть КАЖДЫЙ экран, а не 1 общий».
 * Раздел «Проверка рун» обязан содержать СВОЮ строку на каждый экран, который
 * реально начисляет руны. Разошлось — раздел молча врёт: владелец жмёт кнопки
 * и не видит экрана, который на самом деле платит руны.
 */
describe('DEV Hub · раздел «Проверка рун»', () => {
  const section = readFileSync(
    join(ROOT, 'components', 'dev', 'motion_showcase', 'sections', 'runes_check.ts'),
    'utf8',
  );

  /** Экраны, реально подключённые к копилке рун. */
  const screensAwardingRunes = (): string[] => {
    const appDir = join(ROOT, 'app');
    return readdirSync(appDir)
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => readFileSync(join(appDir, f), 'utf8').includes('usePracticeRunes'))
      .map((f) => f.replace(/\.tsx$/, ''));
  };

  it('содержит отдельную строку для КАЖДОГО экрана, начисляющего руны', () => {
    const screens = screensAwardingRunes();
    expect(screens.length).toBeGreaterThan(0);
    const missing = screens.filter((s) => !section.includes(`route: '/${s}'`));
    expect(missing).toEqual([]);
  });

  it('каждая строка раздела открывает настоящий экран со свежим случайным seed', () => {
    const items = section.match(/\{ id: 'runes-check-[^}]+\}/g) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(8);
    for (const item of items) {
      expect(item).toContain("kind: 'route'");
      expect(item).toContain('devRunesSeed: true');
    }
  });

  it('витрина не вырезает пункты-маршруты фильтром гибридов', () => {
    // Фильтр от 17.08 требовал слова `hybrid` в id и вырезал ВСЕ секции экранов.
    const index = readFileSync(
      join(ROOT, 'components', 'dev', 'motion_showcase', 'index.ts'),
      'utf8',
    );
    expect(index).toContain("if (item.kind === 'route') return true;");
  });

  it('запуск подставляет НОВЫЙ seed на каждый тап, а не один на список', () => {
    const screen = readFileSync(join(ROOT, 'app', '_motion_showcase.tsx'), 'utf8');
    expect(screen).toContain('makeDevRunesSeed()');
    expect(screen).toContain('item.devRunesSeed');
  });
});
