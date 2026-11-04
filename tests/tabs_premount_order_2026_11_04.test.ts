// Android-лаги (владелец 04.11): фоновый премаунт после кадра Главной монтирует только вкладку «Уроки» (логический индекс 1).
// Видео, Сообщество и Настройки монтируются по первому тапу через путь переднего плана — иначе четыре вкладки подряд давали паузы JS 1–3 с на Главной.
import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

describe('премаунт вкладок после кадра Главной', () => {
  it('порядок фонового премаунта — только «Уроки»', () => {
    expect(layout).toContain('const BACKGROUND_TAB_PREMOUNT_ORDER = [1] as const;');
    expect(layout).not.toMatch(/BACKGROUND_TAB_PREMOUNT_ORDER = \[1, 2/);
  });

  it('фоновый премаунт идёт по этому порядку, а передний план (тап) по-прежнему монтирует нужную вкладку сразу', () => {
    expect(layout).toContain('BACKGROUND_TAB_PREMOUNT_ORDER.forEach(');
    expect(layout).toContain('[TABS-PREMOUNT] foreground');
  });
});
