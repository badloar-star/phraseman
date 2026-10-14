// зачем (координатор 14.10): «Фраза дня» просит вес 800, а рисуется тоньше. Тест фиксирует правду о семействе Inter: какие начертания зарегистрированы (равны app.json) и во что превращается каждый заказанный вес.
// Если добавят файл 800 (или 500) — поменяется только app.json и REGISTERED_INTER_WEIGHTS, а тест покажет, что расхождений не осталось.
import fs from 'node:fs';
import path from 'node:path';
import {
  REGISTERED_INTER_WEIGHTS, fontWeightPlanLine, mismatchedWeights, noteRequestedFontWeight, normalizeFontWeight, requestedFontWeightsSnapshot,
  resetFontWeightCountersForTests, resolveRenderedInterWeight,
} from '../app/font_weights';

const ROOT = path.join(__dirname, '..');

describe('веса Inter: что зарегистрировано и что рисуется', () => {
  it('REGISTERED_INTER_WEIGHTS равен весам из app.json (expo-font → android.fonts → Inter) и файлы начертаний на месте', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')) as { expo: { plugins: unknown[] } };
    const plugin = app.expo.plugins.find((e) => Array.isArray(e) && e[0] === 'expo-font') as [string, { android: { fonts: Array<{ fontFamily: string; fontDefinitions: Array<{ path: string; weight: number }> }> } }];
    const family = plugin[1].android.fonts.find((f) => f.fontFamily === 'Inter')!;
    expect(family.fontDefinitions.map((d) => d.weight)).toEqual([...REGISTERED_INTER_WEIGHTS]);
    for (const d of family.fontDefinitions) expect(fs.existsSync(path.join(ROOT, d.path.replace('./', '')))).toBe(true);
  });

  it('нормализация: bold → 700, normal → 400, «800» → 800, число и нет значения', () => {
    expect([normalizeFontWeight('bold'), normalizeFontWeight('normal'), normalizeFontWeight('800'), normalizeFontWeight(600), normalizeFontWeight(undefined)]).toEqual([700, 400, 800, 600, 400]);
  });

  it('при весах 400/600/700/900: 500 рисуется как 400, 800 — как 700 (ничья → нижнее начертание); остальные веса точны', () => {
    expect(mismatchedWeights([400, 600, 700, 900])).toEqual([[500, 400], [800, 700]]);
    expect(resolveRenderedInterWeight('800', [400, 600, 700, 900])).toBe(700);
    expect(resolveRenderedInterWeight('900', [400, 600, 700, 900])).toBe(900);
    expect(fontWeightPlanLine([400, 600, 700, 900])).toBe('400→400 500→400 600→600 700→700 800→700 900→900');
  });

  it('если зарегистрировать 800 (и 500) — расхождений нет: план «чинится» только файлом начертания и app.json', () => {
    expect(mismatchedWeights([400, 500, 600, 700, 800, 900])).toEqual([]);
    expect(mismatchedWeights([400, 600, 700, 800, 900])).toEqual([[500, 400]]);
  });

  it('счётчик заказанных весов копит нормализованные значения (dev-сводка)', () => {
    resetFontWeightCountersForTests();
    noteRequestedFontWeight('800');
    noteRequestedFontWeight('800');
    noteRequestedFontWeight('bold');
    expect(Object.fromEntries(requestedFontWeightsSnapshot())).toEqual({ 800: 2, 700: 1 });
    resetFontWeightCountersForTests();
  });

  it('при старте патч шрифта пишет строку [FONT-WEIGHT] с планом (источник: font_family_patch.ts)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/font_family_patch.ts'), 'utf8');
    expect(src).toContain('[FONT-WEIGHT] семейство=');
    expect(src).toContain('fontWeightPlanLine()');
    expect(src).toContain('noteRequestedFontWeight(weight)');
  });
});
