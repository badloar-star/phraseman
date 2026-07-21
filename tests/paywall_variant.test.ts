import {
  hashToUnit,
  pickVariantFromUnit,
  getPaywallSocialProof,
  __setPaywallAbConfigForTest,
  __resetPaywallAbForTest,
  type PaywallAbConfig,
} from '../app/paywall_variant';

const cfg = (over: Partial<PaywallAbConfig>): PaywallAbConfig => ({
  aPct: 0, bPct: 0, cPct: 0, dPct: 0, ePct: 0, fPct: 0, gPct: 0,
  aEnabled: true, bEnabled: true, cEnabled: true, dEnabled: true,
  eEnabled: true, fEnabled: true, gEnabled: true,
  salt: 'v3', ratingX10: 0, ratingsCount: 0, ...over,
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
  it('кумулятивные границы работают для всех 7 вариантов A–G', () => {
    const seven = cfg({ aPct: 10, bPct: 10, cPct: 10, dPct: 10, ePct: 10, fPct: 10, gPct: 40 });
    expect(pickVariantFromUnit(0.05, seven)).toBe('A');  // 0–10
    expect(pickVariantFromUnit(0.15, seven)).toBe('B');  // 10–20
    expect(pickVariantFromUnit(0.25, seven)).toBe('C');  // 20–30
    expect(pickVariantFromUnit(0.35, seven)).toBe('D');  // 30–40
    expect(pickVariantFromUnit(0.45, seven)).toBe('E');  // 40–50
    expect(pickVariantFromUnit(0.55, seven)).toBe('F');  // 50–60
    expect(pickVariantFromUnit(0.80, seven)).toBe('G');  // 60–100
    expect(pickVariantFromUnit(0.999, seven)).toBe('G');
  });
  it('граница точно на стыке уходит в следующий вариант (point < acc)', () => {
    const halves = cfg({ aPct: 50, dPct: 50 });
    expect(pickVariantFromUnit(0.499, halves)).toBe('A');
    expect(pickVariantFromUnit(0.5, halves)).toBe('D');
  });
  it('все нули → новый C, старый v1 не показываем даже как fallback', () => {
    const z = cfg({});
    for (const u of [0, 0.3, 0.7, 0.999]) expect(pickVariantFromUnit(u, z)).toBe('C');
  });
  it('100% одного варианта → все туда', () => {
    const allB = cfg({ bPct: 100 });
    for (const u of [0, 0.5, 0.99]) expect(pickVariantFromUnit(u, allB)).toBe('B');
    const allG = cfg({ gPct: 100 });
    for (const u of [0, 0.5, 0.99]) expect(pickVariantFromUnit(u, allG)).toBe('G');
  });
  it('выключенный вариант исключён из сплита (enabled=false → доля 0)', () => {
    const offD = cfg({ aPct: 50, dPct: 100, dEnabled: false, gPct: 50 });
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pickVariantFromUnit(i / 200, offD));
    expect(seen.has('D')).toBe(false);
    expect(seen.has('A')).toBe(true);
    expect(seen.has('G')).toBe(true);
  });
  it('все варианты выключены → fallback C (сумма эффективных = 0)', () => {
    const allOff = cfg({
      aPct: 50, aEnabled: false, bPct: 50, bEnabled: false,
      cPct: 50, cEnabled: false, dPct: 50, dEnabled: false,
    });
    for (const u of [0, 0.3, 0.7, 0.999]) expect(pickVariantFromUnit(u, allOff)).toBe('C');
  });
  it('распределение примерно соответствует активным новым долям', () => {
    const c2 = cfg({ aPct: 50, bPct: 30, cPct: 10 });
    const counts = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 4000; i++) counts[pickVariantFromUnit(hashToUnit(`u${i}:paywall_ab:v3`), c2) as 'A' | 'B' | 'C']++;
    const total = counts.A + counts.B + counts.C;
    expect(counts.A / total).toBeGreaterThan(0.50);
    expect(counts.A / total).toBeLessThan(0.62);
    expect(counts.B / total).toBeGreaterThan(0.28);
    expect(counts.B / total).toBeLessThan(0.38);
    expect(counts.C / total).toBeGreaterThan(0.06);
    expect(counts.C / total).toBeLessThan(0.15);
  });
  it('7-сторонний сплит распределяется примерно по долям', () => {
    const c7 = cfg({ aPct: 40, bPct: 10, cPct: 10, dPct: 10, ePct: 10, fPct: 10, gPct: 10 });
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
    for (let i = 0; i < 7000; i++) counts[pickVariantFromUnit(hashToUnit(`w${i}:paywall_ab:v3`), c7)]++;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(counts.A / total).toBeGreaterThan(0.36);
    expect(counts.A / total).toBeLessThan(0.44);
    for (const v of ['B', 'C', 'D', 'E', 'F', 'G']) {
      expect(counts[v] / total).toBeGreaterThan(0.07);
      expect(counts[v] / total).toBeLessThan(0.13);
    }
  });
});

describe('paywall_variant — sanitize', () => {
  it('доли > 100 пропорционально ужимаются', () => {
    const out = __setPaywallAbConfigForTest({ a_pct: 60, b_pct: 60, c_pct: 60 });
    expect(out.aPct + out.bPct + out.cPct).toBeLessThanOrEqual(100);
  });
  it('ужатие >100 учитывает и новые поля d–g', () => {
    const out = __setPaywallAbConfigForTest({ a_pct: 60, b_pct: 60, c_pct: 60, d_pct: 60, g_pct: 60 });
    const effSum = out.aPct + out.bPct + out.cPct + out.dPct + out.ePct + out.fPct + out.gPct;
    expect(effSum).toBeLessThanOrEqual(100);
    expect(out.dPct).toBeGreaterThan(0);
    expect(out.dPct).toBeLessThan(60);
  });
  it('выключенные варианты не участвуют в сумме и не ужимаются', () => {
    const out = __setPaywallAbConfigForTest({ a_pct: 70, b_pct: 70, d_pct: 90, d_enabled: false });
    // Эффективная сумма = 140 (d не считается) → ужимаются только a и b.
    expect(out.aPct + out.bPct).toBeLessThanOrEqual(100);
    expect(out.dPct).toBe(90);
    expect(out.dEnabled).toBe(false);
  });
  it('старый док без d_pct..g_pct и *_enabled ведёт себя как сплит A/B/C', () => {
    const out = __setPaywallAbConfigForTest({ a_pct: 50, b_pct: 50 });
    expect(out.dPct).toBe(0);
    expect(out.ePct).toBe(0);
    expect(out.fPct).toBe(0);
    expect(out.gPct).toBe(0);
    expect(out.aEnabled && out.bEnabled && out.cEnabled && out.dEnabled
      && out.eEnabled && out.fEnabled && out.gEnabled).toBe(true);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pickVariantFromUnit(i / 200, out));
    expect([...seen].sort()).toEqual(['A', 'B']);
  });
  it('новые доли зажаты в [0,100] и округлены', () => {
    // По одному полю за раз — иначе срабатывает пропорциональное ужатие суммы >100.
    expect(__setPaywallAbConfigForTest({ d_pct: 140 }).dPct).toBe(100);
    expect(__setPaywallAbConfigForTest({ e_pct: -5 }).ePct).toBe(0);
    expect(__setPaywallAbConfigForTest({ f_pct: 10.6 }).fPct).toBe(11);
    expect(__setPaywallAbConfigForTest({ g_pct: 'x' }).gPct).toBe(0);
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
