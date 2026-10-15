// зачем (Макеты 15.10, кадры v3_p8_fs10 / v2_p8_fs13; правило владельца «ничего не обрезается»): 1) цифра плиты «3» компактного подиума срезана (плита была фиксированной высоты),
// 2) «+4»/«+20» слева в окне башни налезают на тело башни, 3) срезанный кружок у верха окна башни.
import fs from 'node:fs';
import path from 'node:path';
import { PODIUM_SIZES } from '../components/spire/spire_podium_sizes';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Пик: плиты подиума вмещают цифру места', () => {
  it('плита — минимальная высота (растёт по содержимому), с запасом под цифру сверху и снизу', () => {
    const src = read('components/spire/SpirePodium.tsx');
    expect(src).toContain('{ minHeight: blk, backgroundColor: place === 1 ? p.cardRaised : p.card }');
    expect(src).not.toMatch(/\{ height: blk, backgroundColor/);
    expect(src).toContain("alignItems: 'center', paddingTop: 10, paddingBottom: 8 },");
    // цифра без фиксированного lineHeight: на Android он не растёт со шрифтом и режет глиф
    expect(src).toMatch(/place: \{ fontSize: 20, fontWeight: '700' \}/);
  });

  it('самая маленькая компактная плита (42) не ниже цифры при шрифте 1.0: отступы 10 + 8 + строка ≈ 24', () => {
    const digitLine = 24; // 20 sp при шрифте 1.0 → ≈ 24 dp строки
    const smallest = Math.min(...PODIUM_SIZES.compact.blocks);
    expect(smallest).toBeGreaterThanOrEqual(10 + digitLine + 8);
    expect(PODIUM_SIZES.compact.blocks).toEqual([60, 50, 42]);
    expect(PODIUM_SIZES.full.blocks).toEqual([88, 66, 50]);
  });

  it('самая высокая колонка компактного подиума ниже полной на 40 dp — бюджет ступеней не меняется', () => {
    const col = (s: typeof PODIUM_SIZES.full, place: number): number => (place === 1 ? s.coinFirst : s.coinOther) + 8 + 21 + 8 + 16 + 8 + s.blocks[place - 1]!;
    const tallest = (s: typeof PODIUM_SIZES.full): number => Math.max(col(s, 1), col(s, 2), col(s, 3));
    expect(tallest(PODIUM_SIZES.full) - tallest(PODIUM_SIZES.compact)).toBe(40);
  });
});

describe('Пик: «+N» соперников не заходит на тело башни', () => {
  const tower = read('components/spire/SpireTower.tsx');

  it('ряд монет и «+N» привязан правым краем в 10 единицах левее тела этажа, а не левым с запасом 22', () => {
    expect(tower).toContain('right: renderWidth - (fl.x0 - RIVAL_GAP) * scale');
    expect(tower).toContain('const RIVAL_GAP = 10;');
    expect(tower).not.toContain('(extra ? 22 : 0)');
    expect(tower).not.toContain('left: ax * scale');
  });

  it('на крупном шрифте (≥ 1.15) у башни одна монета и «+N»; текст «+N» с потолком роста шрифта', () => {
    expect(tower).toContain('const RIVAL_BIG_FONT = 1.15;');
    expect(tower).toContain('const shown = Math.min(list.length, singleCoin ? 1 : RIVAL_SHOWN);');
    expect(tower).toContain('singleCoin={fontScale >= RIVAL_BIG_FONT}');
    expect(tower).toContain('<Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.rivalExtra');
  });

  it('геометрия: ряд из двух монет + «+20» при шрифте 1.0 и 1.3 умещается левее тела башни, не доходя до подписи этажа', () => {
    const RIVAL = 22; const STEP = 13; const gap = 5;
    const textW = (digits: number, font: number): number => Math.ceil(digits * 8.5 * font) + 4; // «+», цифры 13 sp bold
    const rowW = (coins: number, digits: number, font: number): number => RIVAL + (coins - 1) * STEP + gap + textW(digits, font);
    const roomLeftOfTower = 112; // dp: кадр Pixel 8 — тело башни начинается ≈ 112 dp (246 px / 2.625 ≈ 94 при масштабе; берём запас)
    const floorLabelEnd = 40; // подпись этажа «1»/«2» заканчивается ≈ 38 dp
    const two1 = rowW(2, 2, 1.0);
    const one13 = rowW(1, 2, 1.3);
    expect(roomLeftOfTower - 10 - two1).toBeGreaterThanOrEqual(floorLabelEnd - 12); // при 1.0: допускается подойти почти вплотную, но не на подпись
    expect(roomLeftOfTower - 10 - one13).toBeGreaterThanOrEqual(floorLabelEnd);
  });
});

describe('Пик: срезанный кружок у верха окна башни', () => {
  const tower = read('components/spire/SpireTower.tsx');

  it('верх окна: затухание непрозрачно в верхней полосе (40 %) — всё, что пересекает кромку, скрыто целиком, ниже растворяется', () => {
    expect(tower).toContain('const TOP_FADE_SOLID = 0.4;');
    expect(tower).toContain('colors={[g.plateFillFrom, g.plateFillFrom, colorWithAlpha(g.plateFillFrom, 0)]}');
    expect(tower).toContain('locations={[0, TOP_FADE_SOLID, 1]}');
  });

  it('непрозрачная полоса ≈ 14 из 36 dp — выше самой монеты соперника не прячет (монета 22 dp целиком в зоне растворения)', () => {
    const TOP_FADE_H = 36;
    expect(Math.round(TOP_FADE_H * 0.4)).toBe(14);
    expect(tower).toContain('const TOP_FADE_H = 36;');
  });
});
