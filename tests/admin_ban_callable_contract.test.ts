import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.resolve(__dirname, '../admin/v2/legacy.html'),
  'utf8',
);

function handler(name: 'banUser' | 'unbanUser'): string {
  const start = source.indexOf(`window.${name} = async function(uid) {`);
  const next = source.indexOf('\n  window.', start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(next).toBeGreaterThan(start);
  return source.slice(start, next);
}

describe('live admin ban callable contract', () => {
  it('caches one protected adminSetUserBan callable', () => {
    expect(source).toContain("_fnAdminSetUserBan = httpsCallable(functionsUs, 'adminSetUserBan');");
    expect(source.match(/httpsCallable\(functionsUs, 'adminSetUserBan'\)/g)).toHaveLength(1);
    expect(source).toContain('function getAdminSetUserBanCallable()');
  });

  it.each([
    ['banUser', true],
    ['unbanUser', false],
  ] as const)('%s requires reason and calls the server with crypto-backed idempotency', (name, banned) => {
    const body = handler(name);

    expect(body).toContain('showInputModal({');
    expect(body).toContain('.trim();');
    expect(body).toMatch(/if\s*\(!reason\)/);
    expect(body).toContain('createAdminCommandId(');
    expect(body).toContain('requestId,');
    expect(body).toContain('idempotencyKey,');
    expect(body).toContain('await getAdminSetUserBanCallable()({');
    expect(body).toContain(`banned: ${String(banned)}`);
    expect(body).toContain('reason,');
  });

  it.each(['banUser', 'unbanUser'] as const)(
    '%s has no direct or swallowed partial ban writes',
    (name) => {
      const body = handler(name);
      expect(body).not.toMatch(/\b(?:setDoc|updateDoc|deleteDoc)\s*\(/);
      expect(body).not.toContain("doc(db, 'leaderboard'");
      expect(body).not.toContain('.catch(()=>{})');
      expect(body).not.toContain("logAction('ban'");
      expect(body).not.toContain("logAction('unban'");
    },
  );

  it.each(['banUser', 'unbanUser'] as const)(
    '%s mutates cached UI only after an acknowledged server success',
    (name) => {
      const body = handler(name);
      const call = body.indexOf('await getAdminSetUserBanCallable()({');
      const acknowledged = body.indexOf('response.data.ok !== true');
      const cachedMutation = body.indexOf(`u.banned = ${name === 'banUser' ? 'true' : 'false'};`);
      const successToast = body.indexOf("showToast(", cachedMutation);
      const errorToast = body.lastIndexOf("showToast(");

      expect(call).toBeGreaterThan(-1);
      expect(acknowledged).toBeGreaterThan(call);
      expect(cachedMutation).toBeGreaterThan(acknowledged);
      expect(successToast).toBeGreaterThan(cachedMutation);
      expect(errorToast).toBeGreaterThan(successToast);
      expect(body.slice(errorToast)).toContain("'err'");
    },
  );

  it('creates command ids only from Web Crypto randomness', () => {
    const start = source.indexOf('function createAdminCommandId(prefix) {');
    const end = source.indexOf('\n  }', start);
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, end + 4);
    expect(body).toMatch(/crypto\.(?:randomUUID|getRandomValues)/);
    expect(body).not.toMatch(/Math\.random|Date\.now/);
  });
});
