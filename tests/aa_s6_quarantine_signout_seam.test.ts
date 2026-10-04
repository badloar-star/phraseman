/**
 * AA S6: выход при восстановлении после смены аккаунта идёт через тот же шов
 * авторитета, что и обычный выход (auth_provider → runAccountAuthorityProviderSignOutTransition).
 * Сторож по исходнику: лёгкий, не грузит приложение.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const quarantine = readFileSync(join(__dirname, '..', 'app', 'account_switch_quarantine.ts'), 'utf8');
const flag = readFileSync(join(__dirname, '..', 'app', 'accounts_v2_client_flag.ts'), 'utf8');

function signOutBlock(): string {
  const start = quarantine.indexOf('signOut: async () => {');
  expect(start).toBeGreaterThan(-1);
  const end = quarantine.indexOf('wipeLocalData:', start);
  expect(end).toBeGreaterThan(start);
  return quarantine.slice(start, end);
}

describe('AA S6: выход восстановления через шов авторитета', () => {
  it('signOut восстановления оборачивает выход Firebase в runAccountsV2ProviderSignOutTransition', () => {
    const block = signOutBlock();
    const seam = block.indexOf('accountsV2.runAccountsV2ProviderSignOutTransition(');
    const firebase = block.indexOf('auth.signOut()');
    expect(seam).toBeGreaterThan(-1);
    expect(firebase).toBeGreaterThan(seam);
    expect(block).toContain('cloud.resetAnonAuthCacheForSignOut()');
  });

  it('прямого выхода Firebase мимо шва в signOut восстановления нет', () => {
    const block = signOutBlock();
    expect(block.match(/auth\.signOut\(\)/g)?.length).toBe(1);
  });

  it('ветка логируется без идентификаторов', () => {
    const block = signOutBlock();
    expect(block).toContain('[AA-S6] quarantine_signout start');
    expect(block).toContain('[AA-S6] quarantine_signout done');
    expect(block).not.toMatch(/\$\{[^}]*uid[^}]*\}/);
  });

  it('модуль флага подгружается лениво (require), не статическим import', () => {
    expect(quarantine).toMatch(/require\('\.\/accounts_v2_client_flag'\)/);
    expect(quarantine).not.toMatch(/^import .*accounts_v2_client_flag/m);
  });

  it('экспорт шва ведёт в общую точку авторитета, а при выключенных флагах — в старый выход', () => {
    expect(flag).toContain('export const runAccountsV2ProviderSignOutTransition = runAccountAuthorityProviderSignOutTransition;');
    expect(flag).toMatch(/if \(!isAccountsV2ClientEnabled\(\) \|\| !isAccountsV2ProviderTransitionSupported\(\)\) return authenticate\(\);/);
  });
});
