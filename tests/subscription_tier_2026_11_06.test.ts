// зачем (владелец 06.11, «МАКЕТ ПО УЛЬТРА И ПЛЮС ОДОБРЯЮ!»): месячная = Plus, годовая = Ultra, уровень — ОДНА функция по продукту; палитра Ultra — одна константа.
import { inferPremiumPlanFromProductId } from '../app/premium_revenuecat_state';
import {
  SUBSCRIPTION_TIER_NAME,
  applyTierName,
  tierFromPlan,
  tierFromProductId,
  tierFromPublicField,
} from '../app/subscription_tier';
import {
  ULTRA_PALETTE,
  ULTRA_VARIANTS,
  ULTRA_VARIANT_IN_USE,
  flatColorForTier,
  pinColorsForTier,
  pinGlyphColorForTier,
  plusRingSpec,
  ringColorsForTier,
  tagColorsForTier,
} from '../components/plus/plus_ring_spec';
import { resolveTierFromKnown } from '../components/plus/use_subscription_tier';

describe('tier(): годовой → ultra, месячный → plus', () => {
  it('по плану: только yearly даёт ultra; lifetime/monthly/неизвестное/пусто — plus', () => {
    expect(tierFromPlan('yearly')).toBe('ultra');
    expect(tierFromPlan(' YEARLY ')).toBe('ultra');
    for (const plan of ['monthly', 'lifetime', 'server_vip', '', null, undefined, 'weekly']) expect(tierFromPlan(plan as string)).toBe('plus');
  });

  it('по продукту магазина — те же правила, что inferPremiumPlanFromProductId (паритет)', () => {
    const ids = ['phraseman_plus_yearly', 'app.phraseman.plus.annual:p1y', 'plus_12_month', 'phraseman_plus_monthly', 'plus_1month', 'phraseman_lifetime_pro', 'yearly_forever', 'mystery'];
    for (const id of ids) {
      const expected = inferPremiumPlanFromProductId(id, 'monthly') === 'yearly' ? 'ultra' : 'plus';
      expect(tierFromProductId(id)).toBe(expected);
    }
    expect(tierFromProductId('')).toBe('plus');
    expect(tierFromProductId(null)).toBe('plus');
  });

  it('публичное поле другого человека: только "ultra" — ultra', () => {
    expect(tierFromPublicField('ultra')).toBe('ultra');
    for (const v of ['plus', '', null, undefined, 1, 'ULTRA']) expect(tierFromPublicField(v)).toBe('plus');
  });

  it('резолв по известному плану/продукту: продукт точнее плана; неизвестное — plus', () => {
    expect(resolveTierFromKnown(null)).toBe('plus');
    expect(resolveTierFromKnown({ plan: 'monthly', productId: 'x_yearly', source: 't' })).toBe('ultra');
    expect(resolveTierFromKnown({ plan: 'yearly', productId: null, source: 't' })).toBe('ultra');
    expect(resolveTierFromKnown({ plan: 'lifetime', productId: 'pro_lifetime', source: 't' })).toBe('plus');
  });

  it('тексты: «Plus» → «Ultra» только для ultra, по слову, на любом языке', () => {
    expect(applyTierName('Открой всё с Plus', 'ultra')).toBe('Открой всё с Ultra');
    expect(applyTierName('Desbloquea todo con Plus', 'ultra')).toBe('Desbloquea todo con Ultra');
    expect(applyTierName('Plusieurs Plus', 'ultra')).toBe('Plusieurs Ultra');
    expect(applyTierName('С Plus', 'plus')).toBe('С Plus');
    expect(SUBSCRIPTION_TIER_NAME).toEqual({ plus: 'Plus', ultra: 'Ultra' });
  });
});

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('палитра Ultra: одна константа, контраст', () => {
  it('по умолчанию «Рубин»; ULTRA_PALETTE берётся ровно из константы выбора', () => {
    expect(ULTRA_VARIANT_IN_USE).toBe('ruby');
    expect(ULTRA_PALETTE).toBe(ULTRA_VARIANTS[ULTRA_VARIANT_IN_USE]);
  });

  it('у каждого варианта: 5 цветов кольца (замкнуто), глиф на значке ≥ 3:1 в обеих темах', () => {
    for (const id of Object.keys(ULTRA_VARIANTS) as (keyof typeof ULTRA_VARIANTS)[]) {
      const v = ULTRA_VARIANTS[id];
      expect(v.ring).toHaveLength(5); expect(v.ring[0]).toBe(v.ring[4]);
      expect(v.ringLight).toHaveLength(5); expect(v.ringLight[0]).toBe(v.ringLight[4]);
      for (const stop of v.pin) expect(contrast(v.pinGlyph, stop)).toBeGreaterThanOrEqual(3);
      for (const stop of v.pinLight) expect(contrast(v.pinGlyphLight, stop)).toBeGreaterThanOrEqual(3);
    }
  });

  it('кольцо Ultra в светлой теме ≥ 3:1 к белому и к фону светлых тем (#F0F1EC) — «Рубин»', () => {
    for (const color of ULTRA_VARIANTS.ruby.ringLight) {
      expect(contrast(color, '#FFFFFF')).toBeGreaterThanOrEqual(3);
      expect(contrast(color, '#F0F1EC')).toBeGreaterThanOrEqual(3);
    }
  });

  it('функции по уровню: plus — прежние цвета Plus, ultra — палитра Ultra', () => {
    expect(ringColorsForTier('plus', false)).toEqual(['#8E7CFF', '#6FA8FF', '#7FE0D8', '#C69BFF', '#8E7CFF']);
    expect(ringColorsForTier('ultra', false)).toBe(ULTRA_PALETTE.ring);
    expect(ringColorsForTier('ultra', true)).toBe(ULTRA_PALETTE.ringLight);
    expect(pinColorsForTier('plus')).toEqual(['#8E7CFF', '#5F90DB']);
    expect(pinColorsForTier('ultra', false)).toBe(ULTRA_PALETTE.pin);
    expect(pinGlyphColorForTier('plus', false)).toBe('#FFFFFF');
    expect(flatColorForTier('plus', false)).toBe('#9B8CFF');
    expect(flatColorForTier('ultra', true)).toBe(ULTRA_PALETTE.flatLight);
    expect(tagColorsForTier('plus', false)).toEqual({ bg: 'rgba(142,124,255,0.20)', ink: '#C9C0FF' });
    expect(tagColorsForTier('ultra', false)).toBe(ULTRA_PALETTE.tag);
  });

  it('геометрия Ultra = геометрии Plus (раскладка не меняется); плоское кольцо — цвет уровня', () => {
    expect(plusRingSpec(56, 'list')).toEqual(plusRingSpec(56, 'list', false, 'ultra'));
    expect(plusRingSpec(40, 'flat', false, 'ultra').flatColor).toBe(ULTRA_PALETTE.flat);
    expect(plusRingSpec(40, 'flat', false).flatColor).toBe('#9B8CFF');
  });
});
