import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('live admin user briefs projection contract', () => {
  const live = read('admin/v2/legacy.html');
  const source = read('functions/src/admin_user_briefs.ts');
  const index = read('functions/src/index.ts');
  const rules = read('firestore.rules');
  const jarvis = read('functions/src/jarvis/jarvis_data_contract_guard.test.ts');

  it('backs the live callable with a bounded server projection', () => {
    expect(live).toContain("httpsCallable(functionsUs, 'adminUserBriefs')");
    expect(source).toContain('export const adminUserBriefs = onCall(');
    expect(source).toContain('ADMIN_USER_BRIEFS_MAX_UIDS = 80');
    expect(source).toContain("ADMIN_USER_BRIEFS_RATE_LIMIT_COLLECTION = 'admin_user_briefs_rate_limits'");
    expect(source).toContain("hasClaimedPermission(auth.token, 'users.read')");
    expect(index).toContain('adminUserBriefs');
    expect(rules).toContain('match /admin_user_briefs_rate_limits/{document=**}');
    expect(rules).toContain("collection != 'admin_user_briefs_rate_limits'");
    expect(jarvis).toContain("collection: 'admin_user_briefs_rate_limits'");
  });

  it('keeps the response allowlist free from email and raw profile fields', () => {
    const projectionStart = source.indexOf('export function projectAdminUserBrief');
    const projectionEnd = source.indexOf('export const adminUserBriefs', projectionStart);
    const projection = source.slice(projectionStart, projectionEnd);
    expect(projectionStart).toBeGreaterThan(0);
    expect(projection).toContain('uid');
    expect(projection).toContain('nameIndex');
    expect(projection).toContain('avatar');
    expect(projection).toContain('found');
    expect(projection).not.toContain('email:');
    expect(projection).not.toContain('raw:');
    expect(projection).not.toContain('progress:');
  });

  it('retains the compatibility fallback for older deployments without hard-coded owner PII', () => {
    expect(live).toContain('pmCanFallbackToDirectUserReads');
    expect(live).toContain("source:'firestore-compat'");
    expect(live).not.toContain('badloar@gmail.com');
  });

  it('falls back only for a missing old deployment and never returns raw user documents', () => {
    const start = live.indexOf('function pmBriefFromData(uid, data, publicProfile)');
    const end = live.indexOf('window.pmResolveUserBriefs = pmResolveUserBriefs;', start);
    const fetcher = live.slice(start, end);
    expect(fetcher).toMatch(/not-found\|unimplemented/);
    expect(fetcher).not.toMatch(/internal\|unavailable\|permission/);
    expect(fetcher).toContain('compatFallbackAllowed');
    expect(fetcher).toMatch(/compatFallbackAllowed\s*=\s*true/);
    expect(fetcher).toMatch(/if \(!compatFallbackAllowed/);
    expect(fetcher).not.toContain('data: d');
    expect(fetcher).not.toContain('data: user');
    expect(fetcher).not.toContain('data: {}');
    expect(fetcher).not.toContain('brief.data');
    expect(fetcher).not.toContain('fresh.data');
    expect(fetcher).not.toContain('fresh?.data');
    expect(fetcher).not.toContain('base?.data');
  });

  it('caps aggregate browser resolution and executes server batches sequentially', () => {
    expect(live).toContain('const PM_USER_BRIEF_MAX_AGGREGATE_UIDS = 400;');
    expect(live).toContain('admin_user_briefs_aggregate_limit');
    const start = live.indexOf('async function pmResolveUserBriefs(uids)');
    const end = live.indexOf('window.pmResolveUserBriefs = pmResolveUserBriefs;', start);
    const resolver = live.slice(start, end);
    expect(resolver).toContain('for (const chunk of chunks)');
    expect(resolver).not.toContain('const ownPromises = chunks.map');
    expect(resolver).not.toMatch(/Promise\.all\([^)]*ownPromises/);
    const fetchStart = live.indexOf('async function pmFetchUserBriefBatch(chunk)');
    const fetchEnd = live.indexOf('async function pmResolveUserBriefs(uids)', fetchStart);
    const compatibilityFetcher = live.slice(fetchStart, fetchEnd);
    expect(compatibilityFetcher).toContain('for (const part of directChunks)');
    expect(compatibilityFetcher).toContain('for (const part of publicChunks)');
    expect(compatibilityFetcher).not.toMatch(/Promise\.all\(directChunks\.map/);
    expect(compatibilityFetcher).not.toMatch(/Promise\.all\(publicChunks\.map/);
  });
});
