// зачем (Макеты spire-gap-008): с подписью причины над кнопкой запас под списком 150 dp (в макете pb:150), без неё 120; раскладка пишется в [SPIRE-LAYOUT].
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: запас под нижней панелью с подписью', () => {
  const home = read('components', 'spire', 'SpireHomeScreen.tsx');
  it('120 / 150 с подписью блокировки / 300 с итогом, как в макете', () => {
    expect(home).toMatch(/const scrollTailPad = game\.outcome \? 300 : game\.startBlock \? 150 : 120;/);
    expect(home).toMatch(/paddingBottom: bottomPad \+ scrollTailPad/);
    expect(home.indexOf('const scrollTailPad')).toBeGreaterThan(home.indexOf('const game = preview'));
  });
  it('лог раскладки [SPIRE-LAYOUT] стоит на панели, подписи, кнопке, списке и ряде друзей, только в dev', () => {
    const dock = read('components', 'spire', 'SpireClimbDock.tsx');
    for (const tag of ["'dock'", "'dock.note'", "'dock.cta'"]) expect(dock).toContain(`logSpireLayout(${tag}`);
    for (const tag of ["'scroll'", "'scroll.content'", "'friends+podium'", "'dock.wrap'"]) expect(home).toContain(`logSpireLayout(${tag}`);
    expect(read('components', 'spire', 'spire_layout_log.ts')).toMatch(/__DEV__ !== true/);
  });
});
