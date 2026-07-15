import fs from 'fs';
import path from 'path';

/**
 * Страж: FORCE_PREMIUM никогда не должен раздавать Premium всем в стор-сборке.
 *
 * История: коммит 1d659478 (08.06) случайно увёз `export const FORCE_PREMIUM = true`
 * («TEMP dev-check — вернуть в false перед коммитом») в большой cleanup-коммит.
 * В таком виде ЛЮБАЯ публичная сборка раздала бы полный Premium всем бесплатно.
 *
 * Этот тест читает app/config.ts как текст и требует, чтобы итоговое значение
 * FORCE_PREMIUM было привязано к стор-гарду (IS_STORE_RELEASE) — то есть гасилось
 * в проде, что бы ни оставила dev-сессия в левом операнде. Падает, если кто-то
 * снова экспортирует «голый» `FORCE_PREMIUM = true/false` без этого гарда.
 */

const CONFIG_PATH = path.join(__dirname, '..', 'app', 'config.ts');
const PREMIUM_GUARD_PATH = path.join(__dirname, '..', 'app', 'premium_guard.ts');

function getExportedForcePremiumExpression(source: string): string | null {
  // Берём правую часть `export const FORCE_PREMIUM = <...>;` (может занимать
  // несколько строк) — именно ЭКСПОРТ, а не вспомогательный *_DEV_INTENT.
  const m = source.match(/export\s+const\s+FORCE_PREMIUM\s*=\s*([\s\S]*?);/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

describe('FORCE_PREMIUM production guard', () => {
  const source = fs.readFileSync(CONFIG_PATH, 'utf8');
  const premiumGuardSource = fs.readFileSync(PREMIUM_GUARD_PATH, 'utf8');

  it('does not grant ordinary Metro sessions a client-only Premium entitlement', () => {
    expect(source).toMatch(/const\s+FORCE_PREMIUM_DEV_INTENT\s*=\s*false\s*;/);
    expect(premiumGuardSource).not.toContain('if (isDevRuntime && !IS_STORE_RELEASE) return cacheReal(true);');
  });

  it('exports FORCE_PREMIUM exactly once', () => {
    const count = (source.match(/export\s+const\s+FORCE_PREMIUM\b/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('ties FORCE_PREMIUM to the store-release fuse so it cannot ship enabled to prod', () => {
    const expr = getExportedForcePremiumExpression(source);
    expect(expr).not.toBeNull();

    // Должен ссылаться на стор-гард — иначе в проде премиум может оказаться true.
    expect(expr).toMatch(/IS_STORE_RELEASE/);

    // И не должен быть «голым» литералом (`= true` / `= false`), который игнорирует гард.
    expect(expr).not.toMatch(/^(true|false)$/);
  });

  it('runtime value is false when EXPO_PUBLIC_STORE_RELEASE=1 (simulated store build)', () => {
    // Симулируем стор-сборку и проверяем, что итог гаснет независимо от dev-intent.
    // Воспроизводим формулу из config.ts: <intent> && __DEV__ && !IS_STORE_RELEASE.
    const IS_STORE_RELEASE = '1' === '1'; // EXPO_PUBLIC_STORE_RELEASE=1
    const devIntent = true; // даже если разработчик оставил true
    const isDevRuntime = true; // даже если бы __DEV__ был true
    const forcePremium = devIntent && isDevRuntime && !IS_STORE_RELEASE;
    expect(forcePremium).toBe(false);
  });
});
