// зачем (B3, координатор 12.10, реестр п.73): свап при входе пропускает второе перечтение привязки ТОЛЬКО при пяти условиях;
// во всех остальных случаях перечтение обязано остаться (защита от записи в чужой аккаунт).
import fs from 'node:fs';
import path from 'node:path';
import { decideRemoteLinkReuseForSwap, type RemoteLinkEvidence } from '../app/auth_swap_link_reuse';

const fresh: RemoteLinkEvidence = { stableUid: 'remote-stable', authUid: 'firebase-uid', source: 'callable', atMs: 1000 };
const base = { mergeCalled: false, evidence: fresh, remoteStableId: 'remote-stable', currentAuthUid: 'firebase-uid' };

describe('B3: reuse of the remote link answer during the sign-in swap', () => {
  it('skips the re-read for a fresh callable answer of this sign-in', () => {
    expect(decideRemoteLinkReuseForSwap(base)).toEqual({ reuse: true, evidence: fresh });
  });

  it('re-reads when the server merge was called', () => {
    expect(decideRemoteLinkReuseForSwap({ ...base, mergeCalled: true })).toEqual({ reuse: false, reason: 'merge_called' });
  });

  it('re-reads when the answer came from the cache (or any non-callable source)', () => {
    for (const source of ['cache', 'disabled', 'unavailable'] as const) {
      expect(decideRemoteLinkReuseForSwap({ ...base, evidence: { ...fresh, source } })).toEqual({ reuse: false, reason: `source_${source}` });
    }
  });

  it('re-reads without remote evidence, on a stable id mismatch and on a Firebase uid mismatch or gap', () => {
    expect(decideRemoteLinkReuseForSwap({ ...base, evidence: null })).toMatchObject({ reuse: false, reason: 'no_remote_evidence' });
    expect(decideRemoteLinkReuseForSwap({ ...base, remoteStableId: 'other-stable' })).toMatchObject({ reuse: false, reason: 'stable_mismatch' });
    expect(decideRemoteLinkReuseForSwap({ ...base, currentAuthUid: 'someone-else' })).toMatchObject({ reuse: false, reason: 'auth_uid_mismatch' });
    expect(decideRemoteLinkReuseForSwap({ ...base, currentAuthUid: null })).toMatchObject({ reuse: false, reason: 'auth_uid_missing' });
    expect(decideRemoteLinkReuseForSwap({ ...base, evidence: { ...fresh, authUid: null } })).toMatchObject({ reuse: false, reason: 'auth_uid_missing' });
  });

  it('is wired into the swap: evidence only from the remote ensure_link, decision before the re-read, re-read kept', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8');
    const remoteAt = src.indexOf("identityTrace('[AUTH-LINK-GOOGLE]', 'ensure_link remote'");
    const evidenceAt = src.indexOf('remoteLinkEvidence = {');
    const localAt = src.indexOf("identityTrace('[AUTH-LINK-GOOGLE]', 'ensure_link local'");
    expect(remoteAt).toBeGreaterThan(-1);
    expect(evidenceAt).toBeGreaterThan(remoteAt);
    expect(evidenceAt).toBeLessThan(localAt); // локальная ветка доказательство не выставляет
    expect(src.match(/remoteLinkEvidence = \{/g)).toHaveLength(1);
    expect(src).toMatch(/decideRemoteLinkReuseForSwap\(\{\s*mergeCalled: preserveLocalProgress,\s*evidence: remoteLinkEvidence,\s*remoteStableId: outcome\.remoteStableId,\s*currentAuthUid: getAuth\(\)\?\.currentUser\?\.uid \?\? null,/);
    const decisionAt = src.indexOf('decideRemoteLinkReuseForSwap({');
    const rereadAt = src.indexOf('{ requireAuthoritative: true }', decisionAt);
    expect(rereadAt).toBeGreaterThan(decisionAt);
    expect(src.slice(decisionAt, rereadAt)).toContain("swapStage('authoritative_link_reused'");
    expect(src.slice(decisionAt, rereadAt)).toContain("'swap authoritative_link_reread'");
  });
});
