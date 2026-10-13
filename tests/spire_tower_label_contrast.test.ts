// зачем (аудит тем по фичам дня 13.10): подписи этажей башни (номер этажа #6E6E72, мелкая метка #8E8E92) стоят на небе наряда лиги, а не на фоне темы.
// Номер этажа — текст 14 pt, метка — 7,5 pt: считаем контраст с тремя стопами неба каждого из 12 нарядов.
import { SPIRE_DEFAULT_SKIN, SPIRE_LEAGUE_SKINS } from '../modules/spire/tower_skins';

const lum = (hex: string) => {
  const h = hex.replace('#', '').slice(0, 6);
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('подписи этажей башни на небе наряда', () => {
  const lowLabel: string[] = [];
  const lowFloor: string[] = [];
  for (const skin of [SPIRE_DEFAULT_SKIN, ...SPIRE_LEAGUE_SKINS]) {
    for (const [k, sky] of skin.sky.entries()) {
      if (ratio('#8E8E92', sky) < 4.5) lowLabel.push(`${skin.id} sky${k}`);
      if (ratio('#6E6E72', sky) < 3) lowFloor.push(`${skin.id} sky${k}`);
    }
  }
  it('мелкая метка #8E8E92 ≥ 4,5 на небе всех 12 нарядов и умолчания', () => {
    expect(lowLabel).toEqual([]);
  });
  it('номер этажа #6E6E72 ≥ 3 (крупный текст); замер 13.10: минимум 3,15 у «Мрамора» — рекомендация Дизайну поднять до #8E8E92 (5,0+)', () => {
    expect(lowFloor).toEqual([]);
  });
});
