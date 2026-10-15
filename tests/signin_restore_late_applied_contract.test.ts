// Координатор 15.10, п.2 RESTORE: восстановление из облака, пришедшее после потолка входа 20 с, обязано обновить экраны
// (событие cloud_profile_hydrated) — но только для текущего владельца; иначе Главная держала старые серию/монеты до перезапуска.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8');

describe('[SIGNIN] позднее восстановление после потолка', () => {
  it('restored + текущий владелец → restore_late_applied и cloud_profile_hydrated; иначе — лог пропуска', () => {
    const lateBranch = src.slice(src.indexOf('void restorePromise.then('), src.indexOf('late_fail afterTimeoutMs'));
    expect(lateBranch).toMatch(/if \(late === 'restored' && current\) \{[\s\S]{0,200}restore_late_applied[\s\S]{0,120}emitAppEvent\('cloud_profile_hydrated'\);/);
    expect(lateBranch).toContain('restore_late_skipped');
  });
});
