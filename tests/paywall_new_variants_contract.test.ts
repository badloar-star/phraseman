// ════════════════════════════════════════════════════════════════════════════
// paywall_new_variants_contract.test.ts — контракт новых вариантов D/E/F/G:
// экраны существуют и соблюдают shape A/B/C (VARIANT, usePaywallPurchase,
// exposure по impression.id), роуты зарегистрированы, а якорь-приманка G
// принципиально display-only (никакого onSelect в decoy-карточке).
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

import { computeDecoyPriceString } from '../app/paywall_decoy_price';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('paywall D/E/F/G screens', () => {
  it.each([
    ['d', 'D'], ['e', 'E'], ['f', 'F'], ['g', 'G'],
  ])('app/paywall_%s.tsx exists and follows the A/B/C exposure shape', (file, letter) => {
    const source = read(`app/paywall_${file}.tsx`);
    expect(source).toContain(`const VARIANT = '${letter}' as const;`);
    expect(source).toContain('usePaywallPurchase({ variant: VARIANT');
    expect(source).toContain('createPaywallAnalyticsImpression');
    expect(source).toContain('trackPaywallExperimentExposure');
    expect(source).toContain('analyticsImpression.id');
    expect(source).toContain("logPaywallFunnel('shown'");
    expect(source).toContain("'paywall_shown'");
    // Exposure только из отрендеренного экрана (после export default function).
    expect(source.lastIndexOf('trackPaywallExperimentExposure')).toBeGreaterThan(source.indexOf('export default function'));
  });

  it('variant screens use the shared purchase hook via VARIANT (no hard-coded letter)', () => {
    for (const [file, letter] of [['d', 'D'], ['e', 'E'], ['f', 'F'], ['g', 'G']] as const) {
      const source = read(`app/paywall_${file}.tsx`);
      expect(source).toContain('usePaywallPurchase({ variant: VARIANT,');
      expect(source).not.toContain("usePaywallPurchase({ variant: '");
      expect(source).toContain(`const VARIANT = '${letter}' as const;`);
      expect(source).toContain('trackPaywallExperimentExposure(VARIANT, analyticsImpression.id)');
    }
  });
});

describe('paywall D/E/F/G routing', () => {
  it('navigation maps all 7 variants to their routes', () => {
    const nav = read('app/paywall_navigation.ts');
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      expect(nav).toContain(`${letter}: '/paywall_${letter.toLowerCase()}'`);
    }
  });

  it('root layout registers Stack.Screen for each new paywall', () => {
    const layout = read('app/_layout.tsx');
    for (const name of ['paywall_d', 'paywall_e', 'paywall_f', 'paywall_g']) {
      expect(layout).toContain(`<Stack.Screen name="${name}" options={paywallScreenStackOptions(onboardingPaywallActive)} />`);
    }
    // Выбор варианта централизован в paywall_navigation.ts; root layout только
    // регистрирует экраны и не должен держать вторую расходящуюся таблицу роутов.
    expect(layout).not.toContain("D: '/paywall_d'");
    expect(layout).not.toContain("G: '/paywall_g'");
  });

  it('premium_modal dispatcher imports and renders the new screens', () => {
    const dispatcher = read('app/premium_modal.tsx');
    for (const letter of ['D', 'E', 'F', 'G']) {
      expect(dispatcher).toContain(`import Paywall${letter} from './paywall_${letter.toLowerCase()}';`);
      expect(dispatcher).toContain(`route === '/paywall_${letter.toLowerCase()}'`);
    }
  });

  it('firestore funnel allowlist accepts the new variant letters', () => {
    const rules = read('firestore.rules');
    expect(rules).toContain("request.resource.data.variant in ['v1', 'v2', 'A', 'B', 'C', 'D', 'E', 'F', 'G']");
  });
});

describe('paywall G decoy (anchor) compliance', () => {
  it('paywall_g passes the decoy price into PaywallPlanCards (no separate strip, no caption)', () => {
    const source = read('app/paywall_g.tsx');
    expect(source).not.toContain('PaywallDecoyCard');
    expect(source).toContain('decoyPriceString={decoyPrice}');
    // Подпись «для сравнения» убрана: якорь выглядит как обычная карточка плана.
    expect(source).not.toContain('для сравнения');
  });

  it('decoy renders as a full-size card BETWEEN the yearly and monthly cards', () => {
    const plans = read('components/paywall/PaywallPlanCards.tsx');
    const yearlyIdx = plans.indexOf("'yearly',");
    const decoyIdx = plans.indexOf('{decoyPriceString ? renderDecoyCard(');
    const monthlyIdx = plans.indexOf("'monthly',");
    expect(yearlyIdx).toBeGreaterThan(-1);
    expect(decoyIdx).toBeGreaterThan(yearlyIdx);
    expect(monthlyIdx).toBeGreaterThan(decoyIdx);
  });

  it('decoy card has no selection wiring at all (visual anchor, never selectable)', () => {
    const plans = read('components/paywall/PaywallPlanCards.tsx');
    const decoyStart = plans.indexOf('const renderDecoyCard');
    const decoyEnd = plans.indexOf('const additionalOfferTitle');
    expect(decoyStart).toBeGreaterThan(-1);
    expect(decoyEnd).toBeGreaterThan(decoyStart);
    const decoy = plans.slice(decoyStart, decoyEnd);
    // Якорь не должен попадать в selectPlan/покупку: ни пропов выбора, ни прессаблов.
    expect(decoy).not.toContain('onSelect');
    expect(decoy).not.toContain('onPress');
    expect(decoy).not.toContain('TouchableOpacity');
    expect(decoy).not.toContain('Pressable');
    expect(plans).not.toContain('для сравнения');
  });

  it('paywall_d tiles are the only pressable plan selector there', () => {
    const source = read('app/paywall_d.tsx');
    expect(source).toContain('PaywallPlanTiles');
    expect(source).toContain('onSelect={p.selectPlan}');
  });
});

describe('paywall D tiles wording and fit', () => {
  it('lifetime tile uses a short non-truncating label and never says «навсегда»', () => {
    const tiles = read('components/paywall/PaywallPlanTiles.tsx');
    expect(tiles).not.toContain('навсегда');
    expect(tiles).not.toContain("name: 'Phraseman Pro'");
    expect(tiles).toContain("name: 'Pro'");
    expect(tiles).toContain('разовая покупка');
  });
});

describe('computeDecoyPriceString', () => {
  it('computes 85% of the yearly price keeping currency symbol and separators', () => {
    expect(computeDecoyPriceString('€34,99')).toBe('€29,74');
    expect(computeDecoyPriceString('$24.99')).toBe('$21.24');
    expect(computeDecoyPriceString('34.99 €')).toBe('29.74 €');
  });

  it('returns null when the price cannot be parsed (decoy hidden)', () => {
    expect(computeDecoyPriceString('')).toBeNull();
    expect(computeDecoyPriceString('бесплатно')).toBeNull();
    expect(computeDecoyPriceString('€')).toBeNull();
  });
});
