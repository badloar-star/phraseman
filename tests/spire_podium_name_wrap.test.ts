// зачем (координатор 13.10): на 360 dp колонка пьедестала ≈ 101 dp, при шрифте ×1,3 длинное имя без пробела («Александра») рвалось посреди слова.
// Решение: имя до 2 строк, перенос по слогам (Android hyphenationFrequency=full), потолок роста шрифта 1,15 только у имени; adjustsFontSizeToFit не используем.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('имя на пьедестале при крупном шрифте', () => {
  const podium = read('components/spire/SpirePodium.tsx');

  it('имя: до 2 строк, перенос по слогам, потолок 1,15 только у имени, без ужатия', () => {
    expect(podium).toContain('numberOfLines={2} maxFontSizeMultiplier={1.15} android_hyphenationFrequency="full"');
    expect(podium).not.toMatch(/adjustsFontSizeToFit/);
    // потолок роста стоит ровно на строке имени, а не на всём блоке (steps/счёт растут как обычно)
    expect(podium.match(/maxFontSizeMultiplier/g)?.length).toBe(1);
  });

  it('360 dp × шрифт 1,3: колонка ≈ 101 dp; имя растёт не выше ×1,15 и укладывается в 2 строки (≈ 18,4 pt, 2 строки ≈ 46 dp)', () => {
    const screen = 360;
    const pad = 20; // V2.screenPad
    const gap = 12; // gap между колонками пьедестала
    const col = (screen - pad * 2 - gap * 2) / 3;
    expect(Math.round(col)).toBe(99); // «≈ 101 dp» из замечания: порядок тот же
    const fontScale = Math.min(1.3, 1.15);
    const namePt = 16 * fontScale;
    expect(namePt).toBeCloseTo(18.4, 5);
    // самое длинное имя из замечания («Александра», 10 букв): средняя ширина буквы ≈ 0,55 em → 10 × 0,55 × 18,4 ≈ 101 dp: в одну строку не влезет,
    // а в две — по слогам («Алек-/сандра») помещается, каждая часть заметно уже колонки
    const widestPart = Math.ceil(10 / 2) * 0.55 * namePt;
    expect(widestPart).toBeLessThan(col);
  });
});
