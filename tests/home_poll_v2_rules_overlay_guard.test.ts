import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const verifierPath = path.join(root, 'scripts/home_poll_v2_rules_overlay_verifier.cjs');
const verifier = fs.existsSync(verifierPath)
  ? require(verifierPath) as {
      buildHomePollV2Overlay(live: string): string;
      validateExactHomePollV2DeployArgs(args: string[]): boolean;
      verifyHomePollV2RulesOverlay(input: Record<string, unknown>): { ok: boolean; errors: string[]; overlaySource?: string };
    }
  : null;

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const live = [
  'rules_version = \'2\';',
  'service cloud.firestore {',
  '  match /databases/{database}/documents {',
  "    match /review_promo_claims/{docId} {",
  '      allow read: if false;',
  '    }',
  '    match /{collection}/{document=**} {',
  '      allow read, write: if isAdmin()',
  "        && collection != 'users'",
  "        && collection != 'accounts_v2'",
  "        && collection != 'account_deletion_tombstones';",
  '    }',
  '  }',
  '}',
  '',
].join('\n');

function requireVerifier() {
  expect(verifier).not.toBeNull();
  return verifier!;
}

function fixture() {
  const selected = requireVerifier();
  const overlay = selected.buildHomePollV2Overlay(live);
  const manifest = {
    schemaVersion: 1,
    mode: 'exact-home-poll-v2-overlay',
    projectId: 'phraseman-ea0b3',
    releaseName: 'projects/phraseman-ea0b3/releases/cloud.firestore',
    expectedLiveRulesetName: 'projects/phraseman-ea0b3/rulesets/live-ruleset',
    expectedLiveReleaseUpdateTime: '2026-10-11T09:36:02.666200Z',
    expectedLiveSha256: sha256(live),
    expectedOverlaySha256: sha256(overlay),
    expectedAddedLines: 13,
  };
  const release = {
    name: manifest.releaseName,
    rulesetName: manifest.expectedLiveRulesetName,
    updateTime: manifest.expectedLiveReleaseUpdateTime,
  };
  return { selected, overlay, manifest, release };
}

describe('exact Home Poll v2 Rules overlay exception stays hash-bound and fail-closed', () => {
  test('the existing guard gains an explicit exact mode for the reviewed 13-line overlay', () => {
    const { selected, overlay, manifest, release } = fixture();
    expect(selected.verifyHomePollV2RulesOverlay({
      mode: manifest.mode,
      projectId: manifest.projectId,
      manifest,
      release,
      liveSource: live,
      candidateOverlaySource: overlay,
    })).toMatchObject({ ok: true, errors: [], overlaySource: overlay });
  });

  test('missing explicit mode is rejected', () => {
    const { selected, overlay, manifest, release } = fixture();
    const result = selected.verifyHomePollV2RulesOverlay({ projectId: manifest.projectId, manifest, release, liveSource: live, candidateOverlaySource: overlay });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('mode');
  });

  test('live source drift is rejected', () => {
    const { selected, overlay, manifest, release } = fixture();
    const result = selected.verifyHomePollV2RulesOverlay({ mode: manifest.mode, projectId: manifest.projectId, manifest, release, liveSource: `${live}// drift\n`, candidateOverlaySource: overlay });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('live.sha256');
  });

  test('overlay drift and any non-13-line diff are rejected', () => {
    const { selected, overlay, manifest, release } = fixture();
    for (const candidateOverlaySource of [`${overlay}// overlay drift\n`, overlay.replace('allow read: if false;', 'allow read: if true;')]) {
      const result = selected.verifyHomePollV2RulesOverlay({ mode: manifest.mode, projectId: manifest.projectId, manifest, release, liveSource: live, candidateOverlaySource });
      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(['overlay.exact', 'overlay.sha256']));
    }
  });

  test('wrong project, release identity, live hash, and overlay hash are rejected', () => {
    const { selected, overlay, manifest, release } = fixture();
    const cases = [
      { projectId: 'wrong-project' },
      { release: { ...release, rulesetName: `${release.rulesetName}-drift` } },
      { manifest: { ...manifest, expectedLiveSha256: sha256('wrong-live') } },
      { manifest: { ...manifest, expectedOverlaySha256: sha256('wrong-overlay') } },
    ];
    for (const mutation of cases) {
      const result = selected.verifyHomePollV2RulesOverlay({ mode: manifest.mode, projectId: manifest.projectId, manifest, release, liveSource: live, candidateOverlaySource: overlay, ...mutation });
      expect(result.ok).toBe(false);
    }
  });

  test('production manifest is bound to the reviewed live release and overlay hashes', () => {
    requireVerifier();
    const manifestPath = path.join(root, 'config/home-poll-v2-rules-overlay.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    if (!fs.existsSync(manifestPath)) return;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      mode: 'exact-home-poll-v2-overlay',
      projectId: 'phraseman-ea0b3',
      releaseName: 'projects/phraseman-ea0b3/releases/cloud.firestore',
      expectedLiveRulesetName: 'projects/phraseman-ea0b3/rulesets/a0825b49-c444-4404-ac55-77ff58a9f8d6',
      expectedLiveReleaseUpdateTime: '2026-10-11T09:36:02.666200Z',
      expectedLiveSha256: '2e5cc2004b9ca95352ac8f3b2f73fdb26c2cb435ac6f091b02b4be2df25d5cbc',
      expectedOverlaySha256: '5ce1ff1c509304c211e5a2116245b5e9d5394eeacde15b590c6e56e30d2762bb',
      expectedAddedLines: 13,
    });
  });

  test('CLI and deploy profile require the explicit mode and preserve broadcast readiness', () => {
    requireVerifier();
    const guard = fs.readFileSync(path.join(root, 'scripts/guard_global_broadcast_privacy_rules_rollout.mjs'), 'utf8');
    const deployPath = path.join(root, 'scripts/deploy_home_poll_v2_rules_overlay.mjs');
    expect(guard).toContain("--mode=exact-home-poll-v2-overlay");
    expect(fs.existsSync(deployPath)).toBe(true);
    if (fs.existsSync(deployPath)) {
      const deploy = fs.readFileSync(deployPath, 'utf8');
      expect(deploy).toContain('guard_global_broadcast_privacy_rules_rollout.mjs');
      expect(deploy.indexOf('guard_global_broadcast_privacy_rules_rollout.mjs')).toBeLessThan(deploy.indexOf("run('firebase', ["));
      expect(deploy).toContain('--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES');
      expect(deploy).toContain('createRequire(import.meta.url)');
      expect(deploy).toContain('Pre-deploy prepared Rules hash mismatch');
      expect(deploy).toContain('PREDEPLOY_ARTIFACT_VERIFIED');
      expect(deploy).toContain("shell: command === 'firebase' && process.platform === 'win32'");
    }
    const readiness = JSON.parse(fs.readFileSync(path.join(root, 'config/global-broadcast-privacy-rollout.json'), 'utf8'));
    expect(readiness.rulesReleaseApproved).toBe(false);
    expect(readiness.rulesApprovalEvidence).toBeNull();
  });

  test('deploy confirmation accepts each exact argument once and rejects duplicates', () => {
    const selected = requireVerifier();
    expect(typeof selected.validateExactHomePollV2DeployArgs).toBe('function');
    expect(selected.validateExactHomePollV2DeployArgs(['--apply', '--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES'])).toBe(true);
    expect(selected.validateExactHomePollV2DeployArgs(['--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES', '--apply'])).toBe(true);
    expect(selected.validateExactHomePollV2DeployArgs(['--apply', '--apply'])).toBe(false);
    expect(selected.validateExactHomePollV2DeployArgs(['--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES', '--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES'])).toBe(false);
    expect(selected.validateExactHomePollV2DeployArgs(['--apply'])).toBe(false);
    expect(selected.validateExactHomePollV2DeployArgs(['--apply', '--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES', '--extra'])).toBe(false);
  });
});
