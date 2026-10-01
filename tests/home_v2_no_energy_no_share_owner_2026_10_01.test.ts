// зачем (владелец 01.10, ответ в сессии ядра): «на главной не надо энергию показывать»;
// «Поделиться» в шапке не нужна — «кнопка уже есть в визитке». Главная V2 так и устроена:
// в шапке только серия, монеты, колокольчик и аватар. Сторож не даёт вернуть их на Главную.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');
const header = fs.readFileSync(path.join(root, 'components', 'home', 'v2', 'HomeV2Header.tsx'), 'utf8');

function homeV2Block(): string {
  const start = home.indexOf('const renderHomeV2 = () => (');
  const end = home.indexOf('return renderHomeV2();');
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return home.slice(start, end);
}

describe('Главная V2: без энергии и без «Поделиться» в шапке (владелец 01.10)', () => {
  it('Главная рендерится только в виде V2, V1-ветки и флага нет', () => {
    expect(home).toContain('return renderHomeV2();');
    expect(home).not.toMatch(/HOME_V2_LAYOUT/);
  });
  it('на Главной V2 нет энергии', () => {
    const block = homeV2Block();
    expect(block).not.toMatch(/EnergyIcon|home-quickstart-energy|showEnergyTooltip|homeEnergyTotal/);
  });
  it('в шапке Главной нет кнопки «Поделиться»', () => {
    const block = homeV2Block();
    expect(block).not.toMatch(/Share\.share|share-social|share-outline|onShare/);
    expect(header).not.toMatch(/Share\.share|share-social|share-outline|onShare/);
  });
});
