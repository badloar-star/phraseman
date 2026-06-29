import { readFileSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const dispatcher = read('app/premium_modal.tsx');
const planScreen = read('app/personal_plan.tsx');
const thankYou = read('app/personal_plan_thank_you.tsx');

describe('personal plan ↔ paywall ↔ thank-you loop is broken', () => {
  it('FIX 1: dispatcher invalidates the premium cache BEFORE the access check (no stale-true → thank-you)', () => {
    const start = dispatcher.indexOf('maybeFinishAlreadyPremiumPersonalPlan');
    expect(start).toBeGreaterThan(-1);
    const block = dispatcher.slice(start, start + 600);
    // invalidate стоит ДО getVerifiedPremiumAccessStatus в этой функции.
    const inv = block.indexOf('invalidatePremiumCache()');
    const check = block.indexOf('getVerifiedPremiumAccessStatus()');
    expect(inv).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(-1);
    expect(inv).toBeLessThan(check);
  });

  it('FIX 2: thank-you is NOT shown when there is nothing to activate and no saved plan (goes home instead)', () => {
    expect(dispatcher).toContain('const activated = await activatePendingPersonalPlanAfterPremium()');
    expect(dispatcher).toContain('readPersonalPlanState');
    const start = dispatcher.indexOf('if (!activated) {');
    expect(start).toBeGreaterThan(-1);
    const block = dispatcher.slice(start, start + 220);
    expect(block).toContain('readPersonalPlanState');
    expect(block).toContain("router.replace('/(tabs)/home' as any)");
  });

  it('FIX 3: plan-screen gate re-checks fresh access before bouncing to the paywall', () => {
    // Провайдер сказал «да» → выходим без редиректа.
    expect(planScreen).toContain('if (planAccess) return;');
    // Иначе перепроверяем свежим источником (тем же, что и диспетчер), сбросив кэш.
    const start = planScreen.indexOf('if (planAccess) return;');
    // Окно охватывает весь эффект-гейт, включая пояснительные комментарии перед
    // replace на пейвол (иначе строка params уезжает за границу — ложный провал).
    const block = planScreen.slice(start, start + 900);
    expect(block).toContain('invalidatePremiumCache()');
    expect(block).toContain('getVerifiedPremiumAccessStatus()');
    expect(block).toContain("params: { context: 'personal_plan' }");
  });

  it('keeps the genuine post-purchase path intact (real buyer still reaches thank-you)', () => {
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase).toContain("router.replace('/personal_plan_thank_you' as any)");
  });

  it('FIX 4: post-purchase replace to thank-you marks replace so the paywall leaves the back stack', () => {
    const purchase = read('app/paywall_purchase.ts');
    const idx = purchase.indexOf("router.replace('/personal_plan_thank_you' as any)");
    expect(idx).toBeGreaterThan(-1);
    // markNextNavigationAsReplace стоит НЕПОСРЕДСТВЕННО перед replace на thank-you,
    // иначе пейвол остаётся в стеке «назад» под экраном «План включён».
    const before = purchase.slice(Math.max(0, idx - 400), idx);
    expect(before).toContain('markNextNavigationAsReplace()');
    expect(purchase).toContain("import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back'");
  });

  it('FIX 5: thank-you → plan marks replace so the celebration screen leaves the back stack (no thank-you↔plan loop)', () => {
    const idx = thankYou.indexOf("router.replace('/personal_plan' as any)");
    expect(idx).toBeGreaterThan(-1);
    const before = thankYou.slice(Math.max(0, idx - 400), idx);
    expect(before).toContain('markNextNavigationAsReplace()');
    expect(thankYou).toContain("import { markNextNavigationAsReplace } from './navigation_back'");
  });

  it('the forbidden store-receipt support copy is removed from the thank-you screen', () => {
    expect(thankYou).not.toContain('по чеку из магазина');
    expect(thankYou).not.toContain('поддержка поможет');
    expect(thankYou).not.toContain('supportBox');
  });
});
