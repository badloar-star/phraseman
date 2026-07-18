import fs from 'fs';
import path from 'path';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('startup cloud identity recovery regression', () => {
  const cloudSync = read('app/cloud_sync.ts');
  const publicProfile = read('app/public_profile_snapshot.ts');
  const layout = read('app/_layout.tsx');
  const premiumContext = read('components/PremiumContext.tsx');
  const vipSurvey = read('app/vip_survey.ts');
  const adminTesters = read('app/_admin_settings_testers.tsx');
  const firestoreRules = read('firestore.rules');

  it('tries the authenticated stable-link callable even when local App Check is unavailable', () => {
    const start = cloudSync.indexOf('export async function ensureStableAuthLinkForStableIdDetailed');
    const end = cloudSync.indexOf('export async function ensureStableAuthLinkForStableId(', start);
    const source = cloudSync.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(source).toContain('const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);');
    expect(source).toContain("const fn = callable<");
    expect(source).not.toMatch(/if \(!appCheckReady\)[\s\S]{0,220}return/);
    expect(source.indexOf('initFirebaseAppCheckIfAvailable')).toBeLessThan(source.indexOf("const fn = callable<"));
  });

  it('fails closed before the users document read when stable identity is not verified', () => {
    const start = cloudSync.indexOf('async function restoreAndMigrateFromCloudResult');
    const end = cloudSync.indexOf('// ── Восстановить прогресс из облака', start);
    const source = cloudSync.slice(start, end);
    const ensure = source.indexOf('const stableLink = await ensureStableAuthLinkForStableIdDetailed(uid);');
    const gate = source.indexOf('if (!stableLink.ok || stableLink.stableUid !== uid)', ensure);
    const protectedRead = source.indexOf("db.collection('users').doc(uid).get()", gate);

    expect(ensure).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(ensure);
    expect(protectedRead).toBeGreaterThan(gate);
    expect(source).toContain('failureReason: cloudRestoreFailureForStableLink(stableLink.failure)');
  });

  it('classifies App Check, transport, and identity failures separately', () => {
    const classify = (__cloudSyncTestHooks as unknown as {
      classifyCloudAccessFailure?: (error: unknown, appCheckReady: boolean) => string;
    }).classifyCloudAccessFailure;

    expect(classify).toEqual(expect.any(Function));
    if (typeof classify !== 'function') return;

    expect(classify(
      { code: 'functions/unauthenticated', message: 'App Check token is invalid' },
      false,
    )).toBe('app_check_unavailable');
    expect(classify({ code: 'functions/unavailable', message: 'network failed' }, false))
      .toBe('transport_unavailable');
    expect(classify(
      { code: 'functions/permission-denied', message: 'stable_id_mismatch' },
      true,
    )).toBe('stable_id_mismatch');
    expect(classify({ code: 'functions/unauthenticated', message: 'auth_required' }, true))
      .toBe('identity_unavailable');
  });

  it('returns a recovery reason to startup without changing the legacy restore status API', () => {
    expect(cloudSync).toContain('export async function restoreFromCloudWithRecoveryDetails');
    expect(cloudSync).toContain('failureReason: CloudRestoreFailureReason | null');
    expect(layout).toContain('restoreFromCloudWithRecoveryDetails');
    expect(layout).toContain("bootRestoreFailureReason === 'app_check_unavailable'");
    expect(layout).toContain("bootRestoreFailureReason === 'identity_unavailable'");
    expect(layout).not.toContain('Проверь интернет — он подтянется автоматически.');
  });

  it('does not touch public profile Firestore paths until canonical identity is proven', () => {
    const stableId = publicProfile.indexOf('const stableId = await ensureAnonUser();');
    const ensure = publicProfile.indexOf('ensureStableAuthLinkForStableIdDetailed(stableId)', stableId);
    const gate = publicProfile.indexOf('stableLink.stableUid !== stableId', ensure);
    const banRead = publicProfile.indexOf("db.collection('banned_users').doc(stableId).get()", gate);
    const profileWrite = publicProfile.indexOf("db.collection('public_profiles').doc(stableId).set", gate);

    expect(stableId).toBeGreaterThan(-1);
    expect(ensure).toBeGreaterThan(stableId);
    expect(gate).toBeGreaterThan(ensure);
    expect(banRead).toBeGreaterThan(gate);
    expect(profileWrite).toBeGreaterThan(banRead);
    expect(publicProfile).toContain('return syncPublicProfileSnapshotUnsafe(input).catch(() => {});');
  });

  it('does not open or hot-retry the live premium listener after a stable-owner mismatch', () => {
    const listenerStart = premiumContext.indexOf('Live VIP grants/revokes from admin/index.html');
    const listenerEnd = premiumContext.indexOf('// Reload when app comes to foreground', listenerStart);
    const listener = premiumContext.slice(listenerStart, listenerEnd);
    const ensure = listener.indexOf('ensureStableAuthLinkForStableIdDetailed(uid)');
    const identityGate = listener.indexOf('stableLink.stableUid !== uid', ensure);
    const protectedListener = listener.indexOf("db.collection('users').doc(uid).onSnapshot", identityGate);
    const mismatchBranch = listener.slice(
      listener.indexOf("stableLink?.failure === 'stable_id_mismatch'", ensure),
      identityGate,
    );

    expect(ensure).toBeGreaterThan(-1);
    expect(identityGate).toBeGreaterThan(ensure);
    expect(protectedListener).toBeGreaterThan(identityGate);
    expect(mismatchBranch).toContain('return;');
    expect(mismatchBranch).not.toContain('scheduleRetry()');
  });

  it.each([
    ['components/PremiumContext.tsx', premiumContext, 6],
    ['app/vip_survey.ts', vipSurvey, 1],
    ['app/_admin_settings_testers.tsx', adminTesters, 1],
  ])('handles every fire-and-forget public-profile sync in %s', (_path, source, expectedCount) => {
    const calls = source.match(/void syncPublicProfileSnapshot\(/g) ?? [];
    const handled = source.match(/void syncPublicProfileSnapshot\([\s\S]*?\)\.catch\(\(\) => \{\}\);/g) ?? [];
    expect(calls).toHaveLength(expectedCount);
    expect(handled).toHaveLength(expectedCount);
  });

  it('keeps public-profile writes behind the existing strict stable-user ownership rule', () => {
    const canonicalStart = firestoreRules.indexOf('function canonicalUserMatchesAuth(stableUid)');
    const canonicalEnd = firestoreRules.indexOf('function userDocOwnerMatchesAuth', canonicalStart);
    const canonicalRule = firestoreRules.slice(canonicalStart, canonicalEnd);

    expect(canonicalRule).toContain('return stableUserMatchesAuth(stableUid);');
    expect(canonicalRule).not.toContain('authLinkMapsToUser');
    expect(firestoreRules).toContain('allow create, update: if canonicalUserMatchesAuth(userId);');
  });
});
