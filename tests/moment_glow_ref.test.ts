// зачем (координатор 18.10, Сверка: ореол «меньше и ярче» эталона): держим геометрию и яркость `.glowspot` эталона и правило «у 365/1000 ореола нет».
import fs from 'node:fs';
import path from 'node:path';
import {
  colorAlpha, MOMENT_GLOW_FADE_AT, MOMENT_GLOW_PULSE_MEAN, MOMENT_GLOW_RADIUS, MOMENT_GLOW_SIZE, momentGlowCenterOpacity, momentGlowStop, opaqueColor,
} from '../components/spire/moments/moment_glow_math';

describe('[MOMENT-GLOW] ореол моментов = эталонный .glowspot', () => {
  it('ноль градиента на ≈147 px от центра круга 320 (farthest-corner × 65 %), а не на 104', () => {
    const fadePx = (MOMENT_GLOW_SIZE / 100) * MOMENT_GLOW_RADIUS * MOMENT_GLOW_FADE_AT;
    expect(Math.round(fadePx)).toBe(147);
  });

  it('альфа цвета: #RRGGBBAA, #RRGGBB, rgba(), неизвестное → null', () => {
    expect(colorAlpha('#7EF0C83D')).toBeCloseTo(0x3d / 255, 5);
    expect(colorAlpha('#7EF0C8')).toBe(1);
    expect(colorAlpha('rgba(126,240,200,.24)')).toBeCloseTo(0.24, 5);
    expect(colorAlpha('rgba(126 240 200 / 30%)')).toBeCloseTo(0.3, 5);
    expect(colorAlpha('oklch(0.4 0.1 160)')).toBeNull();
    expect(colorAlpha(undefined)).toBeNull();
  });

  it('центр = альфа --acc-soft эталона × среднее пульса, какой бы плотной ни была мягкая заливка темы', () => {
    const dark = momentGlowCenterOpacity('rgba(126,240,200,0.42)', false) * 0.42;
    expect(dark).toBeCloseTo(0.24 * MOMENT_GLOW_PULSE_MEAN, 5);
    const light = momentGlowCenterOpacity('rgba(126,240,200,0.6)', true) * 0.6;
    expect(light).toBeCloseTo(0.3 * MOMENT_GLOW_PULSE_MEAN, 5);
    // бледнее эталона не усиливаем сверх полной непрозрачности
    expect(momentGlowCenterOpacity('rgba(0,0,0,0.1)', false)).toBe(1);
  });

  // зачем (Макеты d0030 «вдвое ярче»): react-native-svg не учитывает альфу в stopColor — цвет непрозрачный, вся сила в stopOpacity
  it('стоп градиента: цвет без альфы, непрозрачность = альфа эталона × среднее пульса (Аврора тёмная #7EF0C83D → ≈0,187)', () => {
    expect(opaqueColor('#7EF0C83D')).toBe('#7EF0C8');
    expect(opaqueColor('rgba(126, 240, 200, 0.3)')).toBe('rgb(126, 240, 200)');
    const dark = momentGlowStop('#7EF0C83D', false);
    expect(dark.stopColor).toBe('#7EF0C8');
    expect(dark.stopOpacity).toBeCloseTo(0.24 * MOMENT_GLOW_PULSE_MEAN, 2);
    const light = momentGlowStop('#7EF0C84D', true);
    expect(light.stopOpacity).toBeCloseTo(0.3 * MOMENT_GLOW_PULSE_MEAN, 2);
  });

  it('рубежи серии: ореол из MomentFullScreen; у «Года» и «Легенды» его нет', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/streak/moments/StreakMilestoneScreen.tsx'), 'utf8');
    expect(src).toContain('<MomentFullScreen testID={testID} glowTop={glowTop ?? undefined}>');
    expect(src).not.toContain('StreakGlowSpot');
    const yearToEnd = src.slice(src.indexOf("} else if (kind === 'twoYears') {"));
    const afterTwoYears = yearToEnd.slice(yearToEnd.indexOf("} else if (kind === 'year') {"));
    expect(afterTwoYears.slice(0, afterTwoYears.indexOf('const withFoot'))).not.toContain('glowTop =');
  });
});
