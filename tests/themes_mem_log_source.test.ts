// зачем (запрос координатора 15.10): экран тем пишет [THEMES-MEM] (число превью, кэши, куча) только в dev и не меняет вид.
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

describe('[THEMES-MEM] лог экрана тем', () => {
  const hook = read('components', 'settings', 'themesMemLog.ts');
  it('пишется только в dev и содержит все числа', () => {
    expect(hook).toMatch(/__DEV__ !== true\) return;/);
    for (const key of ['swatchSvg', 'smokeSvg', 'rasterImages', 'cacheTokens', 'cacheArt', 'heapMB', 'dHeapMB', 'dLiveMB', 'gcs']) expect(hook).toContain(key);
    expect(hook).toContain('[THEMES-MEM]');
  });
  it('экран вызывает хук с числом превью, вид не менялся', () => {
    const screen = read('app', 'settings_themes.tsx');
    expect(screen).toMatch(/useThemesMemLog\(\{/);
    expect(screen).toMatch(/swatches: THEME_OPTIONS\.length \+ GRADIENT_OPTIONS\.length/);
  });
});
