// Координатор 26.10: полоса «топ-5» в окне повышения брала высоту строки из замыкания сценария (всегда запасные 48).
// Теперь высота — в трекере: зона берёт последнюю измеренную, а поздний замер (после старта зоны) доводит полосу до настоящей границы.
import fs from 'node:fs';
import path from 'node:path';
import { createPromoZoneTracker, promoZoneTop, PROMO_FALLBACK_ROW_H, type PromoZoneMove } from '../components/spire/moments/promo_zone';

const track = () => {
  const moves: Array<{ top: number; why: PromoZoneMove }> = [];
  return { moves, z: createPromoZoneTracker((top, why) => moves.push({ top, why })) };
};

describe('полоса «топ-5»: настоящая высота строки', () => {
  it('замер до старта зоны — зона сразу едет к границе по настоящей высоте', () => {
    const { moves, z } = track();
    z.measured(62.4);
    expect(moves).toEqual([]);
    z.start();
    expect(moves).toEqual([{ top: promoZoneTop(62), why: 'zone_start' }]);
    expect(promoZoneTop(62)).toBe((62 + 6) * 5 - 3);
  });

  it('строка измерилась позже старта зоны — полоса доезжает до настоящей высоты', () => {
    const { moves, z } = track();
    z.start();
    expect(moves[0]).toEqual({ top: promoZoneTop(PROMO_FALLBACK_ROW_H), why: 'zone_start' });
    z.measured(70);
    expect(moves[1]).toEqual({ top: promoZoneTop(70), why: 'late_measure' });
    expect(moves[1]!.top).not.toBe(moves[0]!.top);
  });

  it('пустой или тот же замер полосу не двигает', () => {
    const { moves, z } = track();
    z.start();
    z.measured(0);
    z.measured(PROMO_FALLBACK_ROW_H);
    expect(moves).toHaveLength(1);
  });

  it('MomentPromotion: метка зоны зовёт трекер, высоты в замыкании сценария нет', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/spire/moments/MomentPromotion.tsx'), 'utf8');
    expect(src).toContain('zone.start();');
    expect(src).toContain('const onFirstRowLayout = useCallback((e: LayoutChangeEvent) => zone.measured(e.nativeEvent.layout.height), [zone]);');
    expect(src).not.toMatch(/\browH\b/);
  });
});
