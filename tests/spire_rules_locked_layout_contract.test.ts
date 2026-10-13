// зачем (разбор размеров реестра 13.10, community-004 и spire-gap-011): числа вёрстки шторки правил и замка Шпиля берутся из образцов
// (`community.html` leagueRules, `spire-gaps-states.html` `.sg-lock`) как dp = css px; масштаб кадров 411/390 в правки не попадает.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: замок — размеры по образцу', () => {
  const locked = read('components/spire/SpireLockedState.tsx');

  it('замок: нижний отступ 60 как у `.in` макета — центр на ≈49,5 % высоты', () => {
    expect(locked).toMatch(/root: \{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: V2\.screenPad \* 2, paddingBottom: 60 \}/);
    expect(locked).toMatch(/fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0\.3/);
  });
});
