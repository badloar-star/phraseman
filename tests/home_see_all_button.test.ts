// зачем (прямая просьба владельца через координатора 18.10): «Смотреть все» у блоков «Видео» и «Сегодня» на Главной — кнопка-иконка без текста:
// круг buttonFill, шеврон 20 цветом text, зона нажатия ≥ 44, без обводки, подпись для читалки «Смотреть все»; кнопка не сливается с фоном Главной ни в одном из 138 сочетаний тем.
import fs from 'fs';
import path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Rgb = [number, number, number];
const parse = (c: string): { rgb: Rgb; a: number } => {
  const m = /^rgba?\(([^)]+)\)$/.exec(c.trim());
  if (m) { const p = m[1]!.split(',').map(Number); return { rgb: [p[0]!, p[1]!, p[2]!], a: p[3] ?? 1 }; }
  const h = c.replace('#', '');
  return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb, a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
};
const over = (top: string, base: Rgb): Rgb => { const t = parse(top); return t.rgb.map((v, i) => v * t.a + base[i]! * (1 - t.a)) as Rgb; };
const solid = (c: string): Rgb => over(c, [0, 0, 0]);
const lum = (c: Rgb) => { const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!; };
const R = (a: Rgb, b: Rgb) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

describe('кнопка «Смотреть все» на Главной — не сливается с фоном во всех 138 сочетаниях тем', () => {
  let worstTone = 99; let worstIcon = 99;
  for (const appearance of ['dark', 'light'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) for (const intensity of [0, 0.5, 1]) {
    const g = liquidGlassTokens(id as never, { appearance, intensity } as never) as unknown as Record<string, string>;
    for (const key of ['bg', 'bgTop', 'bgBottom']) {
      const page = solid(g[key]!);
      const fill = over(g.buttonFill!, page);
      worstTone = Math.min(worstTone, R(fill, page));
      worstIcon = Math.min(worstIcon, R(over(g.text!, fill), fill));
    }
  }
  it('тон круга к фону Главной ≥ 1,5 (порог правила владельца для кнопок без обводки)', () => {
    console.log(`[BLEND-HOME] кнопка «Смотреть все» · тон buttonFill к фону · худшее ${worstTone.toFixed(2)} · порог 1.5`);
    expect(worstTone).toBeGreaterThanOrEqual(1.5);
  });
  it('шеврон цветом text на круге ≥ 3 (графика)', () => {
    console.log(`[BLEND-HOME] кнопка «Смотреть все» · шеврон text на buttonFill · худшее ${worstIcon.toFixed(2)} · порог 3`);
    expect(worstIcon).toBeGreaterThanOrEqual(3);
  });
});

describe('кнопка «Смотреть все» — исходник', () => {
  const button = read('components/home/v2/HomeV2SeeAllButton.tsx');
  const today = read('components/home/v2/HomeV2TodayCard.tsx');
  const rail = read('components/home/v2/HomeV2VideoRail.tsx');

  it('круг buttonFill, шеврон 20 цветом text, зона нажатия 44, без обводки и без текста', () => {
    expect(button).toContain('export const HOME_SEE_ALL_HIT = 44;');
    expect(button).toContain('export const HOME_SEE_ALL_ICON = 20;');
    expect(button).toContain('backgroundColor: g.buttonFill');
    expect(button).toContain('name="chevron-forward"');
    expect(button).toContain('color={g.text}');
    expect(button).toContain('accessibilityRole="button"');
    expect(button).toContain('accessibilityLabel={label}');
    expect(button).not.toMatch(/borderWidth|borderColor|<Text/);
  });

  it('у блока «Сегодня» — кнопка-иконка с подписью «Смотреть все» для читалки, поведение прежнее; у блока «Видео» кнопки нет совсем', () => {
    expect(today).toContain('<HomeV2SeeAllButton testID="home-v2-today-see-all" label={seeAllShown.label} onPress={() => latestRef.current.seeAll?.onPress()} rowHeight={17} />');
    // владелец через координатора 18.10: все видео открываются через таббар — ни кнопки, ни ссылки, ни текста «Смотреть все» в рейке
    expect(rail).not.toContain('HomeV2SeeAllButton');
    expect(rail).not.toContain('onSeeAll');
    expect(rail).not.toContain('Смотреть все');
    expect(today).not.toContain('s.seeAllText');
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("ru: 'Смотреть все', uk: 'Дивитися всі', en: 'See all', es: 'Ver todos', 'pt-BR': 'Ver todos', vi: 'Xem tất cả', id: 'Lihat semua', tr: 'Tümünü gör', pl: 'Zobacz wszystkie'");
  });

  it('строка заголовка не прыгает: зона 44 уравнена отрицательными отступами до прежней высоты строки', () => {
    expect(button).toContain('const extra = Math.max(0, HOME_SEE_ALL_HIT - rowHeight);');
    expect(button).toContain('marginTop');
    expect(button).toContain('marginBottom');
  });
});
