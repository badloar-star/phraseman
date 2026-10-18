import fs from 'node:fs';
import path from 'node:path';

// зачем (spire-009, вердикт Макетов c0cd6e2ae, координатор 18.10): в образце шапка ступени Шпиля — заголовок и сердца, энергии нет; «⚡ 2» убрана. Сторож не даёт вернуть пилюлю в шапку ступени.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('шапка ступени Шпиля без энергии (spire-009)', () => {
  it('SpireStepScreen не рисует SpireEnergyPill и не импортирует его', () => {
    const src = read('components/spire/SpireStepScreen.tsx');
    expect(src).not.toContain('<SpireEnergyPill');
    expect(src).not.toContain("import SpireEnergyPill");
  });

  it('пилюля энергии остаётся на главной Шпиля (там её рисует макет)', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toMatch(/<SpireEnergyPill ownerActive=/);
  });
});
