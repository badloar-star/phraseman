import { readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('leaderboard identity and weekly league membership contract', () => {
  test('client nickname writes link auth to stable id and send stableId to callables', () => {
    const source = read('app/firestore_leaderboard.ts');

    expect(source).toContain("import { ensureAnonUser, ensureStableAuthLinkForStableId, waitForAnonAuth } from './cloud_sync';");
    expect(source).toContain("import { getAuthUserId, getCanonicalUserId } from './user_id_policy';");
    expect(source).toMatch(/void ensureAnonUser\(\)\.catch\(\(\) => null\);[\s\S]*?waitForAnonAuth\(timeoutMs\)/);
    expect(source).toMatch(/const stableId = await ensureNameCallableAuthReady\(NAME_RESERVE_TIMEOUT_MS\);[\s\S]*?ensureStableAuthLinkForStableId\(stableId\)/);
    expect(source).not.toContain('leaderboardPushMyScore');
    expect(source).not.toContain('leaderboardUpdatePremium');
    expect(source).toContain('const NAME_CHECK_TIMEOUT_MS = 1_500;');
    expect(source).toContain('const NAME_CHECK_AUTH_TIMEOUT_MS = 800;');
    expect(source).toContain('const NAME_CHECK_IDENTITY_TIMEOUT_MS = 3_500;');
    expect(source).toContain('const NAME_AUTH_LINK_VERIFY_TIMEOUT_MS = 2_500;');
    expect(source).toContain('const NAME_AUTH_LINK_VERIFIED_TTL_MS = 5 * 60_000;');
    expect(source).toContain('const NAME_IDENTITY_READY_TTL_MS = 10 * 60_000;');
    expect(source).toContain('function readCachedNameReservationIdentity');
    expect(source).toContain('function rememberNameReservationIdentity');
    expect(source).toContain('async function ensureNameCallableAuthReady');
    expect(source).toContain('async function forceNameStableAuthLink');
    expect(source).toContain(">('authEnsureStableLink')");
    expect(source).toContain("db.collection('users').doc(stableId).set({ firebaseAuthUid: authUid, updatedAt: Date.now() }, { merge: true })");
    expect(source).toContain('async function ensureNameStableAuthLinkVerified');
    expect(source).toContain('async function ensureNameReservationIdentityReady');
    expect(source).toContain('export function warmNameAvailabilityAuth');
    expect(source).toContain('export async function checkNameAvailabilityDetailed');
    expect(source).toContain('async function checkNameIndexAvailabilityFast');
    expect(source).toContain("db.collection('name_index').doc(nameLower).get()");
    expect(source).toMatch(/await ensureStableAuthLinkForStableId\(stableId\)\.catch\(\(\) => false\);[\s\S]*?ensureNameStableAuthLinkVerified\(stableId\)/);
    expect(source).toMatch(/const identityPromise = ensureNameReservationIdentityReady\(NAME_CHECK_IDENTITY_TIMEOUT_MS\);[\s\S]*?const authPromise = ensureNameCallableAuthReady\(NAME_CHECK_IDENTITY_TIMEOUT_MS\);/);
    expect(source).toMatch(/const fastResult = await checkNameIndexAvailabilityFast\(name, readCachedNameReservationIdentity\(\)\);[\s\S]*?if \(fastResult\) return fastResult;/);
    expect(source).toMatch(/let stableId = readCachedNameReservationIdentity\(\) \|\| await authPromise;[\s\S]*?if \(!stableId\) stableId = await identityPromise;/);
    expect(source).toMatch(/withTimeout\(\s*runNameAvailabilityCheck\(name, stableId\),\s*NAME_CHECK_TIMEOUT_MS/);
    expect(source).toContain("source?: 'onboarding' | 'settings';");
    expect(source).toContain('source: options.source');
    // nameReserve is wrapped in withTimeout() to bound the call on flaky networks
    // (audit C2: no client timeout → onboarding "Продолжить" could hang). The contract
    // is still "callable invoked with { stableId, name: ... }".
    expect(source).toMatch(/>\('nameReserve'\);[\s\S]*?await (withTimeout\()?fn\(\{ stableId, name:/);
    expect(source).toMatch(/>\('nameCheckAvailability'\);[\s\S]*?await (withTimeout\()?fn\(\{ stableId, name:/);
    expect(source).toMatch(/>\('nameReleaseMine'\);[\s\S]*?await fn\(\{ stableId: canonicalUid, names:/);
  });

  test('daily analytics leaderboard write also uses stable id', () => {
    const source = read('app/daily_analytics_sync.ts');

    expect(source).toContain("import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';");
    expect(source).toMatch(/const uid = await ensureAnonUser\(\);[\s\S]*?ensureStableAuthLinkForStableId\(uid\)/);
    expect(source).toMatch(/await fn\(\{ stableId: uid, daily7xp: xp7, daily7time_ms: time7 \}\)/);
  });

  test('server leaderboard callables resolve requested stable id through shared auth identity guard', () => {
    const source = read('functions/src/leaderboard.ts');

    expect(source).toContain("import { resolveStableUidForAuth } from './auth_identity';");
    expect(source).toContain("return resolveStableUidForAuth(db, authUid, requestedStableId, { requireKnownIdentity: true });");

    [
      'leaderboardUpdateDailyAnalytics',
      'nameCheckAvailability',
      'nameReserve',
      'nameReleaseMine',
    ].forEach((name) => {
      const start = source.indexOf(`export const ${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const rest = source.slice(start);
      const next = rest.indexOf('\nexport const ', 1);
      const body = next === -1 ? rest : rest.slice(0, next);
      expect(body).toContain('request.data?.stableId');
    });
  });

  test('server refuses auth uid fallback for identity-critical league and leaderboard writes', () => {
    const identity = read('functions/src/auth_identity.ts');
    const leagues = read('functions/src/league_groups.ts');
    const leaderboard = read('functions/src/leaderboard.ts');

    expect(identity).toContain('requireKnownIdentity?: boolean');
    expect(identity).toContain("throw new HttpsError('failed-precondition', 'stable_id_required')");
    expect(leaderboard).toContain('{ requireKnownIdentity: true }');
    expect((leagues.match(/requireKnownIdentity: true/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  test('legacy auth uid duplicates are hidden automatically without deleting records', () => {
    const identity = read('functions/src/auth_identity.ts');
    const cleanup = read('functions/src/identity_cleanup.ts');
    const index = read('functions/src/index.ts');
    const functionsPkg = JSON.parse(read('functions/package.json')) as { scripts: Record<string, string> };

    expect(identity).toContain('export async function cleanupLegacyAuthIdentityDuplicates');
    expect(identity).toContain("db.collection(LEADERBOARD).doc(authUid)");
    expect(identity).toContain('legacyLeaderboardMerge');
    expect(identity).toContain('cleanupLegacyLeagueMembers');
    expect(identity).toContain('identityHidden: true');
    expect(identity).toContain('canonicalStableId: stableId');
    expect(identity).toContain('identityCanonicalizedAt');
    expect(identity).toContain('await cleanupLegacyAuthIdentityDuplicates(db, stableId, authUid');
    expect(identity).toContain('async function cleanupSiblingStableIdentityDuplicates');
    expect(identity).toContain('linkedStableId === stableId');
    expect(identity).toContain("where('firebaseAuthUid', '==', authUid)");
    expect(identity).toContain('requestedUserData.identityHidden === true');
    expect(identity).not.toContain('tx.delete(legacyLbRef)');
    expect(identity).not.toContain('nameRef.delete()');
    expect(identity).not.toContain('batch.delete(doc.ref)');

    expect(cleanup).toContain('export async function cleanupLegacyIdentityDuplicatesPage');
    expect(cleanup).toContain("const CURSOR_DOC = 'app_meta/identity_cleanup_cursor';");
    expect(cleanup).toContain("reason: 'identity_cleanup_cron'");
    expect(cleanup).toContain('leaderboardHidden');
    expect(index).not.toContain('cleanupLegacyIdentityDuplicatesCron');
    expect(functionsPkg.scripts['deploy:safe']).not.toContain('functions:cleanupLegacyIdentityDuplicatesCron');
  });

  test('server nickname uniqueness is atomic on name_index and blocks on a live owner', () => {
    const source = read('functions/src/leaderboard.ts');
    const reserveStart = source.indexOf('export const nameReserve');
    expect(reserveStart).toBeGreaterThanOrEqual(0);
    const reserveBody = source.slice(reserveStart, source.indexOf('\nexport const nameReleaseMine', reserveStart));

    expect(source).toContain("const NAME_INDEX = 'name_index';");
    expect(source).toContain(".normalize('NFKC')");
    expect(source).toContain('return { name, nameLower: name.toLowerCase() };');

    // Uniqueness is decided ONLY by the name_index doc inside the transaction.
    expect(reserveBody).toContain('const nameRef = db.collection(NAME_INDEX).doc(nameLower);');
    expect(reserveBody).toContain('const nameSnap = await tx.get(nameRef);');
    expect(reserveBody).toContain('txNameOwnerIsLive(tx, db, indexOwner)');
    expect(reserveBody).toContain("throw new HttpsError('already-exists', 'name_taken')");
    expect(reserveBody).toContain('tx.set(nameRef');
    expect(reserveBody).toContain("tx.set(db.collection('leaderboard').doc(stableUid)");

    // Liveness is keyed on the OWNER'S USER DOC, not on a leaderboard row — this
    // is the fix for the username-steal bug (live-but-unranked accounts).
    expect(source).toContain('async function nameOwnerIsLive');
    expect(source).toContain('async function txNameOwnerIsLive');

    // The old race surfaces must be GONE: no out-of-transaction pre-check, no
    // "owner has a visible leaderboard row" escape hatch.
    expect(reserveBody).not.toContain(".where('nameLower', '==', nameLower).limit(8).get()");
    expect(source).not.toContain('async function nameOwnerIsActive');
    expect(source).not.toContain('async function txNameOwnerIsActive');
  });

  test('weekly league top members never backfill stale global leaderboard docs over real groups', () => {
    const source = read('app/firestore_leagues.ts');
    const leaderboard = read('app/firestore_leaderboard.ts');

    expect(source).toContain('старые leaderboard/{authUid}');
    expect(source).toContain('if (all.length === 0)');
    expect(source).not.toContain('if (all.length < 3)');
    expect(source).toContain('d?.groupWeekId === weekId');
    expect(source).toContain("member?.identityHidden !== true");
    expect(leaderboard).toContain("doc.data()?.identityHidden !== true");
  });

  test('renaming syncs current league member name immediately', () => {
    const settings = read('app/(tabs)/settings.tsx');
    const leagues = read('app/firestore_leagues.ts');

    expect(settings).toContain("import { syncMyLeagueMemberProfileNow } from '../firestore_leagues';");
    expect(settings).toContain('void syncMyLeagueMemberProfileNow();');
    expect(leagues).toContain("['user_name', LEAGUE_STATE_V3_KEY]");
    expect(leagues).toContain('export async function syncMyLeagueMemberProfileNow()');
    expect(leagues).toContain('name: memberName || undefined');
  });

  test('server league membership never trusts client-supplied nickname over reservation ownership', () => {
    const source = read('functions/src/league_groups.ts');

    expect(source).toContain('const NAME_INDEX = ');
    expect(source).toContain('async function resolveAuthoritativeLeagueMemberName');
    expect(source).toContain("db.collection(NAME_INDEX).doc(nameLower).get()");
    expect(source).toContain('legacyLeagueNameHasOtherLiveOwner');
    expect(source).toContain('leagueFallbackName(stableUid)');

    const updateStart = source.indexOf('export const leagueUpdateMyMember');
    expect(updateStart).toBeGreaterThanOrEqual(0);
    const updateBody = source.slice(updateStart, source.indexOf('\nexport const leagueSyncMyBoost', updateStart));
    expect(updateBody).toContain('resolveAuthoritativeLeagueMemberName(');
    expect(updateBody).not.toContain("updates[`members.${stableUid}.name`] = sanitizeString(raw.name");

    const joinStart = source.indexOf('export const leagueJoinOrUpdateGroup');
    expect(joinStart).toBeGreaterThanOrEqual(0);
    const joinBody = source.slice(joinStart, source.indexOf('\nexport const leagueUpdateMyMember', joinStart));
    expect(joinBody).toContain('member.name = await resolveAuthoritativeLeagueMemberName(');
  });

  test('weekly league client caches no-op member syncs without bypassing server ownership', () => {
    const leagues = read('app/firestore_leagues.ts');

    expect(leagues).toContain("const LEAGUE_MEMBER_SYNC_CACHE_KEY = 'league_member_sync_cache_v1';");
    expect(leagues).toContain('getLeagueSyncMinDelta');
    expect(leagues).toContain('function shouldSkipLeaguePointsCallable');
    expect(leagues).toContain('function shouldSkipLeagueMemberCallable');
    expect(leagues).toContain('profileHash !== cache.profileHash');
    expect(leagues).toContain("await ensureStableAuthLink().catch(() => false);");
    expect(leagues).toMatch(/shouldSkipLeagueMemberCallable\([\s\S]*?\)[\s\S]*?return;/);
    expect(leagues).toMatch(/>\('leagueUpdateMyMember'\);[\s\S]*?await fn\(\{[\s\S]*?stableId: uid,/);
    expect(leagues).toMatch(/>\('leagueJoinOrUpdateGroup'\);[\s\S]*?await fn\(\{[\s\S]*?stableId: uid,/);
  });

  test('server league join hides duplicate membership for same stable uid in other weekly groups', () => {
    const source = read('functions/src/league_groups.ts');

    expect(source).toContain('async function hideDuplicateMemberships');
    expect(source).toContain('identityHidden: true');
    expect(source).toContain('duplicateOfGroupId: keepGroupId');
    expect(source).not.toContain('batch.delete(doc.ref)');
    expect(source).not.toContain("new admin.firestore.FieldPath('members', stableUid)");
    expect(source).toContain('league_duplicate_membership_cleanup_failed');
    expect(source).toMatch(/await cleanupDuplicateMembershipsBestEffort\(db, weekId, stableUid, groupId\)/);
    expect(source).toMatch(/await cleanupDuplicateMembershipsBestEffort\(db, weekId, stableUid, candidate\)/);
    expect(source).toMatch(/await cleanupDuplicateMembershipsBestEffort\(db, weekId, stableUid, newGroupId\)/);
  });

  test('manual Firestore repair script is targeted and dry-run by default', () => {
    const source = read('scripts/repair_league_identity_ghosts.mjs');
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(pkg.scripts['firestore:repair-league-ghosts']).toBe('node scripts/repair_league_identity_ghosts.mjs');
    expect(source).toContain("const apply = args.includes('--apply');");
    expect(source).toContain('Default mode is dry-run. --apply is required to write.');
    expect(source).toContain("db.collection('league_groups').where('weekId', '==', weekId)");
    expect(source).toContain("db.collection('leaderboard').where('nameLower', '==', nameLower)");
    expect(source).toContain("const deleteLeaderboard = args.includes('--delete-leaderboard');");
  });
});
