// зачем (Темы 25.10, docs/work/season-home-contrast-2026-10-25.md; координатор): в светлом оформлении свет карточки эпизода — 60 % вместо 100 %,
// иначе большой номер падает ниже 4,5 в 29 из 58 сочетаний. В тёмном — без изменений. Тест держит правило в исходнике.
import fs from 'node:fs';
import path from 'node:path';

const face = fs.readFileSync(path.join(__dirname, '..', 'components/learning-v2/season/SeasonCardFace.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('карточка эпизода Сезона: свет в светлом оформлении', () => {
  it('альфа света 60 % (0x99) только когда оформление светлое; тёмное — прежний цвет', () => {
    expect(face).toContain("const LIGHT_GLOW_ALPHA_HEX = '99';");
    expect(Number.parseInt('99', 16) / 255).toBeCloseTo(0.6, 2);
    expect(face).toContain("colors={[dark ? art.glow : `${art.glow}${LIGHT_GLOW_ALPHA_HEX}`, 'transparent']}");
  });
  it('свет в обложке-экзамене не менялся (правка только у карточки эпизода)', () => {
    expect(face.match(/art\.glow/g)?.length).toBe(2);
  });
});
