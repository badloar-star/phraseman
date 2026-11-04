// зачем (энергия от Пика, владелец 04.11): в «Итоге недели» одна строка про запас энергии — +1 при повышении, −1 при понижении (если было что снимать), на максимуме 11 строки нет.
import fs from 'node:fs';
import path from 'node:path';

import { MOMENT_STRING_KEYS, momentText } from '../components/spire/moments/moments_strings';
import { spireWeekEnergyLine } from '../components/spire/spire_week_energy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const up = { promoted: true, demoted: false };
const down = { promoted: false, demoted: true };
const stay = { promoted: false, demoted: false };

describe('строка запаса энергии в итоге недели', () => {
  it('строка minus есть на 9 языках и совпадает с файлом Переводчика', () => {
    expect(MOMENT_STRING_KEYS).toContain('demoEnergy');
    expect(momentText('ru', 'demoEnergy')).toBe('−1 к запасу энергии');
    expect(momentText('en', 'demoEnergy')).toBe('−1 to energy');
    expect(momentText('ru', 'promoEnergy')).toBe('+1 к запасу энергии');
  });

  it('повышение даёт +1 пока бонус меньше 11; на максимуме строки нет', () => {
    expect(spireWeekEnergyLine('ru', up, 0)).toBe('+1 к запасу энергии');
    expect(spireWeekEnergyLine('ru', up, 10)).toBe('+1 к запасу энергии');
    expect(spireWeekEnergyLine('ru', up, 11)).toBeNull();
  });

  it('понижение даёт −1 только если было что снимать', () => {
    expect(spireWeekEnergyLine('ru', down, 3)).toBe('−1 к запасу энергии');
    expect(spireWeekEnergyLine('ru', down, 0)).toBeNull();
  });

  it('без смены лиги строки нет', () => {
    expect(spireWeekEnergyLine('ru', stay, 5)).toBeNull();
  });

  it('карточка итога добавляет строку энергии рядом со строкой монет', () => {
    const card = read('components/spire/SpireWeekResultCard.tsx');
    expect(card).toContain('const energy = spireWeekEnergyLine(lang, r, energyBonus);');
    expect(card).toContain('if (energy) parts.push(energy);');
  });
});
