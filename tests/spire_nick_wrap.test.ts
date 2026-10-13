// зачем (координатор 13.10, строка 26 R1_BACKLOG): длинный ник без пробела («мокрый_асфальт») рвался на пьедестале посреди слова.
import fs from 'node:fs';
import path from 'node:path';
import { spireNickWrap } from '../components/spire/spire_nick_wrap';

const ZWSP = '​';
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('мягкий перенос в нике', () => {
  it('после «_», «.» и «-» ставится невидимая точка переноса', () => {
    expect(spireNickWrap('мокрый_асфальт')).toBe(`мокрый_${ZWSP}асфальт`);
    expect(spireNickWrap('anna.k-2024')).toBe(`anna.${ZWSP}k-${ZWSP}2024`);
  });

  it('ник без разделителей, с пробелом, пустой и с разделителем на краю не меняются', () => {
    expect(spireNickWrap('Макар')).toBe('Макар');
    expect(spireNickWrap('Тая Мира')).toBe('Тая Мира');
    expect(spireNickWrap('')).toBe('');
    expect(spireNickWrap('_тихо')).toBe(`_${ZWSP}тихо`);
    expect(spireNickWrap('тихо_')).toBe('тихо_');
    expect(spireNickWrap('a__b')).toBe(`a__${ZWSP}b`); // подряд идущие разделители — перенос только перед буквой
  });

  it('видимые символы те же: без ZWSP ник совпадает с исходным', () => {
    const nick = 'мокрый_асфальт.-x';
    expect(spireNickWrap(nick).split(ZWSP).join('')).toBe(nick);
  });

  it('пьедестал показывает ник через spireNickWrap, подпись для диктора — исходный, обрезки и ужатия нет', () => {
    const podium = read('components/spire/SpirePodium.tsx');
    expect(podium).toContain('{spireNickWrap(m.name)}');
    expect(podium).toContain('accessibilityLabel={`${place}. ${m.name}, ');
    expect(podium).not.toMatch(/adjustsFontSizeToFit/); // ужатия нет: имя переносится, а не сжимается
  });
});
