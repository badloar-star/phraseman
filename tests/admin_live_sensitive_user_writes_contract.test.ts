import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(__dirname, '../admin/v2/legacy.html'), 'utf8');

function windowHandler(name: string): string {
  const start = source.indexOf(`window.${name} = async function`);
  const next = source.indexOf('\n  };', start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(next).toBeGreaterThan(start);
  return source.slice(start, next + 5);
}

const noDirectSensitiveWrite = (body: string): void => {
  expect(body).not.toMatch(/\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch)\s*\(/);
  expect(body).not.toContain('.catch(()=>{})');
  expect(body).not.toContain('.catch(() => {})');
};

describe('live admin sensitive user operations', () => {
  it.each([
    'editUserField', 'warnUserDirect', 'urAction', 'urMarkReviewed', 'urBulkAction', 'mergeUserPrompt', 'deleteDupe',
    'repairAdminGrantPremiumCompat', 'resetAchievements', 'resetDailyTasks', 'bulkGrantShards',
    'bulkGrantPremium', 'bulkBanUsers',
  ])('%s has no direct sensitive Firestore write', (name) => noDirectSensitiveWrite(windowHandler(name)));

  it('routes profile fields and premium compatibility through authoritative callables', () => {
    const body = windowHandler('editUserField');
    expect(body).toContain('getAdminUpdateUserProfileFieldCallable()');
    expect(body).toContain('getAdminGrantAccessCallable()');
    expect(body).toContain('showInputModal({');
    expect(body).toContain('reason');
    expect(body).toContain('requestId');
    expect(body).toContain('idempotencyKey');
    expect(body).toMatch(/(?:response\.data|data)\.ok !== true/);
  });

  it.each([
    ['warnUserDirect', 'getAdminWarnUserCallable()'],
    ['urAction', 'getAdminResolveUserReportCallable()'],
    ['urMarkReviewed', 'getAdminResolveUserReportCallable()'],
    ['mergeUserPrompt', 'getAdminRequestUserMergeCallable()'],
    ['deleteDupe', 'getAdminDeleteDuplicateUserCallable()'],
    ['repairAdminGrantPremiumCompat', 'getAdminMigrateLegacyAdminPremiumCallable()'],
    ['resetAchievements', 'getAdminResetUserProgressCallable()'],
    ['resetDailyTasks', 'getAdminResetUserProgressCallable()'],
  ])('%s requires a protected acknowledged command', (name, getter) => {
    const body = windowHandler(name);
    expect(body).toContain(getter);
    expect(body).toContain('reason');
    expect(body).toContain('requestId');
    expect(body).toContain('idempotencyKey');
    expect(body).toMatch(/(?:response\.data|data)\.ok !== true/);
  });

  it('reports duplicate cleanup as queued tombstoning, never completed deletion', () => {
    const body = windowHandler('deleteDupe');
    expect(body).toContain("response.data.status !== 'queued'");
    expect(body).toContain('response.data.tombstoned !== true');
    expect(body).toContain('response.data.physicallyDeleted !== false');
    expect(body).toMatch(/cleanup|очист/iu);
    expect(body).not.toMatch(/Дубль удал[её]н/iu);
  });

  it.each([
    ['bulkGrantShards', 'getAdminGrantFn()'],
    ['bulkGrantPremium', 'getAdminGrantAccessCallable()'],
    ['bulkBanUsers', 'getAdminSetUserBanCallable()'],
  ])('%s uses existing protected commands with shared reason, unique ids and exact counts', (name, getter) => {
    const body = windowHandler(name);
    expect(body).toContain(getter);
    expect(body).toContain('reason');
    expect(body).toContain('createAdminCommandId(');
    expect(body).toContain('failed');
    expect(body).toMatch(/response\.data\.(?:ok|type)/);
  });
});
