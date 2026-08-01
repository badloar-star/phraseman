import fs from 'fs';
import path from 'path';

type GiftAccessDecision = {
  kind: 'grant' | 'replay';
  grantedAtMs: number;
  endsAtMs: number;
};

type GiftAccessHooks = {
  decideIntroFullAccessClaim: (
    enabled: boolean,
    progress: Record<string, unknown>,
    nowMs: number,
  ) => GiftAccessDecision;
};

function loadHooks(): GiftAccessHooks {
  const sourcePath = path.join(__dirname, 'gift_access.ts');
  expect(fs.existsSync(sourcePath)).toBe(true);
  return require('./gift_access').__giftAccessTestHooks as GiftAccessHooks;
}

describe('introFullAccessClaim policy', () => {
  it('grants exactly 72 hours from authoritative server time when enabled', () => {
    const { decideIntroFullAccessClaim } = loadHooks();
    const nowMs = 1_800_000_000_000;

    expect(decideIntroFullAccessClaim(true, {}, nowMs)).toEqual({
      kind: 'grant',
      grantedAtMs: nowMs,
      endsAtMs: nowMs + 72 * 60 * 60 * 1000,
    });
  });

  it('replays the original valid grant without extending it', () => {
    const { decideIntroFullAccessClaim } = loadHooks();
    const grantedAtMs = 1_700_000_000_000;
    const endsAtMs = grantedAtMs + 72 * 60 * 60 * 1000;

    expect(decideIntroFullAccessClaim(true, {
      intro_access_granted_at_ms: String(grantedAtMs),
      intro_access_until_ms: String(endsAtMs),
    }, 1_900_000_000_000)).toEqual({
      kind: 'replay',
      grantedAtMs,
      endsAtMs,
    });
  });

  it('fails closed when the authoritative remote gate is disabled', () => {
    const { decideIntroFullAccessClaim } = loadHooks();
    expect(() => decideIntroFullAccessClaim(false, {}, Date.now()))
      .toThrow('intro_full_access_disabled');
  });

  it('replays a complete existing grant when the remote gate is later disabled', () => {
    const { decideIntroFullAccessClaim } = loadHooks();
    const grantedAtMs = 1_700_000_000_000;
    const endsAtMs = grantedAtMs + 72 * 60 * 60 * 1000;

    expect(decideIntroFullAccessClaim(false, {
      intro_access_granted_at_ms: grantedAtMs,
      intro_access_until_ms: endsAtMs,
    }, 1_900_000_000_000)).toEqual({
      kind: 'replay',
      grantedAtMs,
      endsAtMs,
    });
  });

  it('fails closed on partial or malformed existing grant state', () => {
    const { decideIntroFullAccessClaim } = loadHooks();
    expect(() => decideIntroFullAccessClaim(true, {
      intro_access_granted_at_ms: 1_700_000_000_000,
    }, Date.now())).toThrow('intro_full_access_state_invalid');
    expect(() => decideIntroFullAccessClaim(true, {
      intro_access_granted_at_ms: 'bad',
      intro_access_until_ms: 1_700_000_000_001,
    }, Date.now())).toThrow('intro_full_access_state_invalid');
    expect(() => decideIntroFullAccessClaim(false, {
      intro_access_until_ms: 1_700_000_000_001,
    }, Date.now())).toThrow('intro_full_access_state_invalid');
  });

  it('uses authenticated stable identity, App Check and no caller-owned identity or timestamps', () => {
    const sourcePath = path.join(__dirname, 'gift_access.ts');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(source).toContain('resolveStableUidForAuth(db, authUid, undefined');
    expect(source).not.toContain('request.data?.stableId');
    expect(source).not.toContain('request.data?.grantedAtMs');
    expect(source).not.toContain('request.data?.endsAtMs');
    expect(indexSource).toContain("export { introFullAccessClaim } from './gift_access';");
  });
});
