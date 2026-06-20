import {
  hashToUnit,
  pickVariantFromUnit,
  getPaywallSocialProof,
  __setPaywallAbConfigForTest,
  __resetPaywallAbForTest,
  type PaywallAbConfig,
} from '../app/paywall_variant';

const cfg = (over: Partial<PaywallAbConfig>): PaywallAbConfig => ({
  aPct: 0, bPct: 0, cPct: 0, salt: 'v3', ratingX10: 0, ratingsCount: 0, ...over,
});

afterEach(() => __resetPaywallAbForTest());

describe('paywall_variant — hashToUnit', () => {
  it('детерминирован и в диапазоне [0,1)', () => {
    const a = hashToUnit('user-42:paywall_ab:v3');
    const b = hashToUnit('user-42:paywall_ab:v3');
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });
  it('смена соли меняет бакет (пересев)', () => {
    expect(hashToUnit('u1:paywall_ab:v3')).not.toBe(hashToUnit('u1:paywall_ab:v4'));
  });
});

describe('paywall_variant — pickVariantFromUnit', () => {
  const c = cfg({ aPct: 25, bPct: 25, cPct: 25 });
  it('режет по кумулятивным границам без возврата в старый v1', () => {
    expect(pickVariantFromUnit(0.10, c)).toBe('A');
    expect(pickVariantFromUnit(0.40, c)).toBe('B');
    expect(pickVariantFromUnit(0.60, c)).toBe('B');
    expect(pickVariantFromUnit(0.80, c)).toBe('C');
    expect(pickVariantFromUnit(0.90, c)).toBe('C');
  });
  it('все нули → новый C, старый v1 не показываем даже как fallback', () => {
    const z = cfg({});
    for (const u of [0, 0.3, 0.7, 0.999]) expect(pickVariantFromUnit(u, z)).toBe('C');
  });
  it('100% одного варианта → все туда', () => {
    const allB = cfg({ bPct: 100 });
    for (const u of [0, 0.5, 0.99]) expect(pickVariantFromUnit(u, allB)).toBe('B');
  });
  it('распределение примерно соответствует активным новым долям', () => {
    const c2 = cfg({ aPct: 50, bPct: 30, cPct: 10 });
    const counts = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 4000; i++) counts[pickVariantFromUnit(hashToUnit(`u${i}:paywall_ab:v3`), c2)]++;
    const total = counts.A + counts.B + counts.C;
    expect(counts.A / total).toBeGreaterThan(0.50);
    expect(counts.A / total).toBeLessThan(0.62);
    expect(counts.B / total).toBeGreaterThan(0.28);
    expect(counts.B / total).toBeLessThan(0.38);
    expect(counts.C / total).toBeGreaterThan(0.06);
    expect(counts.C / total).toBeLessThan(0.15);
  });
});

describe('paywall_variant — sanitize', () => {
  it('доли > 100 пропорционально ужимаются', () => {
    const out = __setPaywallAbConfigForTest({ a_pct: 60, b_pct: 60, c_pct: 60 });
    expect(out.aPct + out.bPct + out.cPct).toBeLessThanOrEqual(100);
  });
  it('rating_x10 зажат в [0,50]', () => {
    expect(__setPaywallAbConfigForTest({ rating_x10: 999 }).ratingX10).toBe(50);
    expect(__setPaywallAbConfigForTest({ rating_x10: -5 }).ratingX10).toBe(0);
  });
  it('мусорные значения → дефолты', () => {
    const out = __setPaywallAbConfigForTest({ a_pct: 'x', salt: 123, ratings_count: -10 });
    expect(out.aPct).toBe(0);
    expect(out.salt).toBe('v3');
    expect(out.ratingsCount).toBe(0);
  });
});

describe('paywall_variant — getPaywallSocialProof', () => {
  it('rating=null когда не задан (не показывать выдуманное)', () => {
    __setPaywallAbConfigForTest({ rating_x10: 0, ratings_count: 0 });
    expect(getPaywallSocialProof()).toEqual({ rating: null, count: null });
  });
  it('50 → 5.0; count прокидывается', () => {
    __setPaywallAbConfigForTest({ rating_x10: 50, ratings_count: 1200 });
    expect(getPaywallSocialProof()).toEqual({ rating: 5.0, count: 1200 });
  });
  it('count=0 → null (только рейтинг)', () => {
    __setPaywallAbConfigForTest({ rating_x10: 48, ratings_count: 0 });
    expect(getPaywallSocialProof()).toEqual({ rating: 4.8, count: null });
  });
});
