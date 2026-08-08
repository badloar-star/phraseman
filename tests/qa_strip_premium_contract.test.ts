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
  const vipRevokeFn = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'vip_revoke.ts'), 'utf8');
  const fnIndex = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');
  const fnPackage = fs.readFileSync(path.join(process.cwd(), 'functions', 'package.json'), 'utf8');

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


});
