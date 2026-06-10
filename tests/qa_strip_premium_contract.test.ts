import fs from 'fs';
import path from 'path';

/**
 * QA-кнопки «Снять премиум» / «Выдать VIP на профиле» (in-app панель тестеров).
 *
 * После progressHasNoPremiumWrites в firestore.rules клиент НЕ может писать
 * vip_* и premium_* в users/{uid}.progress. Серверный отзыв СВОЕГО VIP делает
 * callable vipRevokeMine (Admin SDK, только понижение прав). Прямой клиентский
 * grant оставлен best-effort (срабатывает только у admin-клеймов) и не должен
 * ронять локальную QA-логику.
 */
describe('qa strip premium contract', () => {
  const testers = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');
  const vipRevokeFn = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'vip_revoke.ts'), 'utf8');
  const fnIndex = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');
  const fnPackage = fs.readFileSync(path.join(process.cwd(), 'functions', 'package.json'), 'utf8');
  const client = fs.readFileSync(path.join(process.cwd(), 'app', 'vip_revoke_client.ts'), 'utf8');

  const stripStart = testers.indexOf('const performStripPremium');
  const stripBody = testers.slice(stripStart, testers.indexOf('const performResetAllData', stripStart));

  it('strips premium via the vipRevokeMine callable, not a direct Firestore vip_* write', () => {
    expect(stripStart).toBeGreaterThan(-1);
    expect(stripBody).toContain('callVipRevokeMine');
    // Прямая запись vip_* с клиента запрещена firestore.rules — её не должно быть в strip.
    expect(stripBody).not.toContain('getAdminFirestoreDb');
    expect(stripBody).not.toContain("vip_active: 'false'");
  });

  it('keeps the local strip alive when the server revoke fails', () => {
    const callIdx = stripBody.indexOf('callVipRevokeMine');
    const tryIdx = stripBody.lastIndexOf('try', callIdx);
    const catchIdx = stripBody.indexOf('catch', callIdx);
    const successToastIdx = stripBody.indexOf('Премиум и VIP сняты');
    expect(tryIdx).toBeGreaterThan(-1);
    expect(catchIdx).toBeGreaterThan(-1);
    // Успешный тост идёт ПОСЛЕ изолированного server-revoke блока.
    expect(successToastIdx).toBeGreaterThan(catchIdx);
  });

  it('keeps the QA VIP grant local-first: blocked server write must not fail the button', () => {
    const grantStart = testers.indexOf('const activateVipOnCurrentProfile');
    const grantBody = testers.slice(grantStart, testers.indexOf('const emitFrenchDevSeedBlockedToast', grantStart));
    const writeIdx = grantBody.indexOf("vip_active: 'true'", grantBody.indexOf('getAdminFirestoreDb'));
    const innerCatch = grantBody.indexOf('catch', writeIdx);
    const successToast = grantBody.indexOf('VIP включён на профиле');
    expect(writeIdx).toBeGreaterThan(-1);
    expect(innerCatch).toBeGreaterThan(writeIdx);
    expect(innerCatch).toBeLessThan(successToast);
  });

  it('resolves identity from auth only and mirrors the admin revoke payload', () => {
    expect(vipRevokeFn).toContain('resolveStableUidForAuth(db, request.auth.uid)');
    expect(vipRevokeFn).not.toContain('request.data');
    expect(vipRevokeFn).toContain("vip_active: 'false'");
    expect(vipRevokeFn).toContain("vip_admin_override: 'false'");
    expect(vipRevokeFn).toContain('vip_revoked_at');
  });

  it('stays deployable: exported from index.ts and present in deploy:safe whitelist', () => {
    expect(fnIndex).toContain('vipRevokeMine');
    expect(fnPackage).toContain('functions:vipRevokeMine');
  });

  it('ships a client wrapper that never sends a body identity', () => {
    expect(client).toContain("httpsCallable");
    expect(client).toContain("'vipRevokeMine'");
    expect(client).not.toContain('stableId');
  });
});
