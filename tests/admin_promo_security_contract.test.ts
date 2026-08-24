import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function namedFunction(source: string, name: string): string {
  const starts = [
    `async function ${name}(`,
    `function ${name}(`,
    `window.${name} = async function(`,
    `window.${name} = function(`,
  ]
    .map((marker) => source.indexOf(marker))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  const start = starts[0] ?? -1;
  if (start < 0) throw new Error(`missing function ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

describe('admin promo bearer boundary', () => {
  const live = read('admin/v2/legacy.html');
  const promo = read('functions/src/promo_codes.ts');
  const telegram = read('functions/src/telegram_premium_admin.ts');

  test('the browser never reads or writes promo_codes directly', () => {
    expect(live).not.toMatch(/getDoc\(doc\(db,\s*['"]promo_codes['"]/);
    expect(live).not.toMatch(/(?:getDocs\(query\()?collection\(db,\s*['"]promo_codes['"]/);
    expect(namedFunction(live, 'loadPromoCodes')).toContain("httpsCallable(functionsUs, 'adminListPromoCodes')");
    expect(namedFunction(live, 'telegramPremiumCodeState')).toContain('getAdminInspectTelegramPromoCodeCallable');
    expect(live).toContain("httpsCallable(functionsUs, 'adminInspectTelegramPromoCode')");
  });

  test('all admin promo endpoints are manual-access and explicitly App-Check-off', () => {
    expect(promo).toContain("const ADMIN_PROMO_CALLABLE_OPTIONS = { region: REGION, enforceAppCheck: false }");
    expect(promo).toContain('hasClaimedPermission(request.auth?.token');
    expect(promo).not.toContain('hasPermission(role, permission)');
    for (const name of ['promoCodeUpsert', 'promoCodeBatchUpsert', 'promoCodeDelete', 'adminListPromoCodes']) {
      const start = promo.indexOf(`export const ${name} = onCall(ADMIN_PROMO_CALLABLE_OPTIONS`);
      expect(start).toBeGreaterThan(0);
      expect(promo.slice(start, start + 500)).toContain("assertAdminPermission(request, 'money.manual_access.write')");
    }
    expect(telegram).toContain('export const adminInspectTelegramPromoCode = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(telegram).toContain("hasPermission(role, 'money.manual_access.write')");
  });

  test('ordinary promo audit documents never store bearer codes', () => {
    expect(promo).not.toMatch(/targetUid:\s*code\b/);
    expect(promo).not.toMatch(/details:\s*\{[^}]*\bcode\b/s);
    expect(promo).toContain('targetUid: auditRef.id');
  });
});
