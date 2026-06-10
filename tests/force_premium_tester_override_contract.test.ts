import fs from 'fs';
import path from 'path';

/**
 * Dev-обход FORCE_PREMIUM тестерским флагом.
 *
 * Баг: в dev-сборке FORCE_PREMIUM=true заставляет PremiumContext жёстко считать
 * пользователя премиумом (runReload/mount-эффект), игнорируя tester_no_premium.
 * Из-за этого кнопка «Снять премиум» бессильна и премиум-плашки на уроках
 * никогда не показываются в dev (premiumRequired всегда false).
 *
 * premium_guard уже уважает tester_no_premium (см. premium_guard.test.ts),
 * но PremiumContext шунтит его при FORCE_PREMIUM. Контракт: контекст должен
 * сверяться с tester_no_premium ДО FORCE_PREMIUM-шортката, а прод-страж
 * (force_premium_prod_guard.test.ts) при этом не ослабляется.
 */
describe('FORCE_PREMIUM tester override contract', () => {
  const guardSrc = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_guard.ts'), 'utf8');
  const ctxSrc = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');

  it('premium_guard exposes an async forcePremiumActive() helper', () => {
    expect(guardSrc).toMatch(/export\s+async\s+function\s+forcePremiumActive\s*\(/);
    // Helper must read the tester flag and the build-time FORCE_PREMIUM fuse.
    const fnStart = guardSrc.indexOf('export async function forcePremiumActive');
    const fnBody = guardSrc.slice(fnStart, guardSrc.indexOf('\n}', fnStart));
    expect(fnBody).toContain('FORCE_PREMIUM');
    expect(fnBody).toContain('tester_no_premium');
  });

  it('PremiumContext gates the FORCE_PREMIUM shortcut through forcePremiumActive', () => {
    expect(ctxSrc).toContain('forcePremiumActive');
    // The raw `if (FORCE_PREMIUM) {` early-return in runReload must be gone —
    // replaced by the tester-aware async check.
    expect(ctxSrc).not.toMatch(/if\s*\(\s*FORCE_PREMIUM\s*\)\s*\{\s*\n\s*setIsPremium\(true\)/);
  });

  it('mount effect no longer force-rewrites tester_no_premium back to false', () => {
    // The mount effect used to clobber the strip-premium flag on every mount.
    // After the fix it must NOT unconditionally set tester_no_premium='false'.
    const mountIdx = ctxSrc.indexOf("['tester_no_premium', 'false']");
    expect(mountIdx).toBe(-1);
  });
});
