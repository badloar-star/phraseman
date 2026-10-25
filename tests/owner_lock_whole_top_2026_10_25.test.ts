// ЗАМОК ВЛАДЕЛЬЦА 25.10 (дословно): «запомни нигде верхняя часть не должна отличаться, она должна быть цельной… такого нигде не должно быть!!»
// Снимки владельца, светлая тема: на Главной бледная полоса под часами над зелёной сценой; на Пике строка состояния и вкладки на бледной плоской полосе.
// Причина: маска верха (копия полотна страницы, в светлых темах бледная) поверх «Сцены» и гаснущий при прокрутке слой шапки Пика. Правило no-colored-safe-area-band 22.10:
// фон/сцена идут до самого верха, отступ сверху — только padding контента. Сработал сторож — вернуть цельный верх, а не править сторож.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (p: string): string => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

// корневые экраны с шапкой: Главная, Обучение, Пик/Друзья/Наборы, Видео, Журнал, Настройки, Магазин, Темы
const ROOTS = [
  'app/(tabs)/_layout.tsx', 'app/(tabs)/home.tsx', 'app/(tabs)/lessons.tsx', 'app/(tabs)/community.tsx', 'app/(tabs)/friends.tsx',
  'app/(tabs)/video.tsx', 'app/(tabs)/journal.tsx', 'app/(tabs)/settings.tsx', 'app/shop.tsx', 'app/settings_themes.tsx',
];

describe('верх экрана цельный (замок владельца 25.10)', () => {
  it('на страницах со «Сценой» (Главная, Пик) маска-копия полотна не рисуется', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toMatch(/<TopFadeMask[^>]*suppressed=\{tabFullBleedPages\.includes\(physicalPageIdx\)\}/);
    expect(read('components/TopFadeMask.tsx')).toMatch(/if \(suppressed \|\| height <= 0\) return null;/);
  });

  it('на Пике слой шапки цвета сцены и полоса под часами не гаснут при прокрутке', () => {
    expect(read('components/spire/scene/spire_scene_header.tsx')).toMatch(/const WHOLE_TOP_KEEPS_HEADER = true;/);
    expect(read('components/home/v2/scene/HomeSceneStatusStrip.tsx')).toMatch(/scrollY && source !== 'spire'/);
  });

  it('у корневых экранов нет отдельной верхней полосы со своим фоном высотой в зону часов', () => {
    const bands: string[] = [];
    for (const file of ROOTS) {
      if (!fs.existsSync(path.join(root, file))) continue;
      read(file).split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;
        // полоса = элемент высотой ровно в зону часов (insets.top / topInset) со своей заливкой
        if (/height:\s*(insets\.top|topInset|safeTop)\b/.test(line) && /backgroundColor/.test(line) && !/whole-top-ok/.test(line)) bands.push(`${file}:${i + 1}`);
      });
    }
    expect(bands).toEqual([]);
  });
});
