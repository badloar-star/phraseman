import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const rootPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
const functionsPackage = JSON.parse(fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8')) as { scripts: Record<string, string> };
const readiness = JSON.parse(fs.readFileSync(path.join(root, 'config/global-broadcast-privacy-rollout.json'), 'utf8')) as Record<string, unknown>;
const guide = fs.readFileSync(path.join(root, 'docs/admin/GLOBAL_BROADCAST_PRIVACY_ROLLOUT.md'), 'utf8');
const guardSource = fs.readFileSync(path.join(root, 'scripts/guard_global_broadcast_privacy_rules_rollout.mjs'), 'utf8');
const verifier = require(path.join(root, 'scripts/global_broadcast_privacy_rollout_verifier.cjs')) as {
  computeGlobalBroadcastLocalArtifactHashes(repoRoot: string): Record<string, unknown>;
  verifyGlobalBroadcastPrivacyRollout(input: Record<string, unknown>): { ok: boolean; errors: string[] };
};

const sha = (seed: string) => require('node:crypto').createHash('sha256').update(seed).digest('hex');

describe('global broadcast privacy rollout stays fail-closed', () => {
  test('repository readiness defaults false and records no invented client-floor evidence', () => {
    expect(readiness).toMatchObject({
      schemaVersion: 2,
      projectId: 'phraseman-ea0b3',
      environment: 'production',
      functionsStageReady: false,
      scrubVerificationReady: false,
      schemaConstrainedClientReleased: false,
      minimumSupportedClientFloorVerified: false,
      rulesReleaseApproved: false,
    });
    expect(readiness.functionsStageEvidence).toBeNull();
    expect(readiness.verificationEvidence).toBeNull();
    expect(readiness.clientReleaseEvidence).toBeNull();
    expect(readiness.clientFloorEvidence).toBeNull();
    expect(readiness.rulesApprovalEvidence).toBeNull();
  });

  test('rules guard refuses the default repository state and prints the mandatory order', () => {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/guard_global_broadcast_privacy_rules_rollout.mjs')], {
      cwd: root,
      encoding: 'utf8',
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(output).toContain('BLOCKED');
    const stages = [
      '1. Deploy safe functions and admin hosting',
      '2. Owner dry-run and idempotent scrub to zero unsafe documents',
      '3. Release the schema-constrained client query',
      '4. Verify the minimum supported app build/client floor externally',
      '5. Enable and deploy restrictive Firestore Rules',
    ];
    let previous = -1;
    for (const stage of stages) {
      const current = output.indexOf(stage);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
  });

  test('release guard retrieves the authoritative receipt, state, and audit rather than trusting a local receipt file', () => {
    expect(guardSource).toContain("collection('admin_command_operations')");
    expect(guardSource).toContain("doc('global_broadcast_privacy_state')");
    expect(guardSource).toContain("collection('admin_log')");
    expect(guardSource).toContain('applicationDefault()');
    expect(guardSource).toContain('verifyGlobalBroadcastPrivacyRollout');
    expect(guardSource).not.toMatch(/receipt(?:File|Path)|verificationReceiptPath/);
  });

  test('every repository deploy command that can publish Firestore Rules runs the privacy guard first', () => {
    const scripts = [
      ...Object.entries(rootPackage.scripts).map(([name, command]) => [`root:${name}`, command] as const),
      ...Object.entries(functionsPackage.scripts).map(([name, command]) => [`functions:${name}`, command] as const),
    ];
    const rulesDeploys = scripts.filter(([, command]) => /firebase deploy[^\n]*firestore:rules/.test(command));
    expect(rulesDeploys.length).toBeGreaterThan(0);
    for (const [name, command] of rulesDeploys) {
      expect({ name, command }).toEqual(expect.objectContaining({
        command: expect.stringContaining('guard_global_broadcast_privacy_rules_rollout.mjs'),
      }));
      expect(command.indexOf('guard_global_broadcast_privacy_rules_rollout.mjs')).toBeLessThan(command.indexOf('firebase deploy'));
    }
    expect(functionsPackage.scripts['deploy:admin-global-broadcast-stage-functions']).not.toContain('firestore:rules');
    expect(functionsPackage.scripts['deploy:admin-global-broadcast']).not.toContain('firestore:rules');
  });

  test('release guide records the old-client compatibility blocker and forbids a one-step rollout', () => {
    expect(guide).toContain("where('active', '==', true)");
    expect(guide).toContain('globalBroadcastListActive');
    expect(guide).toContain('browser read/list/write');
    expect(guide).toContain('старые клиенты');
    expect(guide).toContain('нельзя');
    expect(guide).toContain('не выполняет деплой');
    expect(guide).toContain('aggregate verification receipt');
    expect(guide).toContain('Firestore');
  });

  test('structured guard validates real server evidence, current artifacts, and strict chronology', () => {
    const localArtifacts = verifier.computeGlobalBroadcastLocalArtifactHashes(root) as any;
    const config: any = {
      schemaVersion: 2,
      projectId: 'phraseman-ea0b3',
      environment: 'production',
      functionsStageReady: true,
      scrubVerificationReady: true,
      schemaConstrainedClientReleased: true,
      minimumSupportedClientFloorVerified: true,
      rulesReleaseApproved: true,
      functionsStageEvidence: {
        deployedAtMs: 1_000,
        deploymentEvidenceSha256: sha('functions-stage'),
        schemaAllowlistHash: localArtifacts.schemaAllowlistHash,
        functionArtifactHashes: localArtifacts.functionArtifactHashes,
      },
      verificationEvidence: { operationId: 'verify-operation', auditId: 'verify-audit' },
      clientReleaseEvidence: {
        releasedAtMs: 4_000,
        releaseEvidenceSha256: sha('client-release'),
        verificationOperationId: 'verify-operation',
        appQueryArtifact: localArtifacts.appQueryArtifact,
      },
      clientFloorEvidence: {
        verifiedAtMs: 5_000,
        minimumSupportedBuild: '1.42.0',
        floorEvidenceSha256: sha('client-floor'),
        verificationOperationId: 'verify-operation',
        clientReleaseEvidenceSha256: sha('client-release'),
        appQueryArtifact: localArtifacts.appQueryArtifact,
      },
      rulesApprovalEvidence: {
        approvedAtMs: 6_000,
        approvalEvidenceSha256: sha('rules-approval'),
        verificationOperationId: 'verify-operation',
        verificationAuditId: 'verify-audit',
        schemaAllowlistHash: localArtifacts.schemaAllowlistHash,
        clientFloorEvidenceSha256: sha('client-floor'),
        functionArtifactHashes: localArtifacts.functionArtifactHashes,
        appQueryArtifact: localArtifacts.appQueryArtifact,
      },
    };
    const verificationReceipt = {
      receiptType: 'global_broadcast_privacy_final_v1', scope: 'aggregate',
      projectId: config.projectId, environment: config.environment,
      schemaVersion: 1, schemaAllowlistHash: localArtifacts.schemaAllowlistHash,
      generation: 9, scannedCount: 27, unsafeCount: 0, unknownCount: 0,
      forbiddenCount: 0, unvalidatedCount: 0, wrongSchemaCount: 0,
      complete: true, functionArtifactHashes: localArtifacts.functionArtifactHashes,
      appQueryArtifact: localArtifacts.appQueryArtifact,
      startedAtMs: 2_000, finishedAtMs: 3_000,
      operationId: 'verify-operation', actorUid: 'owner-a', auditId: 'verify-audit',
    };
    const operation: any = {
      action: 'global_broadcast_privacy_verify', actorUid: 'owner-a', auditId: 'verify-audit',
      createdAtMs: 3_000,
      result: { ready: true, complete: true, truncated: false, unsafeCount: 0, unknownCount: 0, verificationReceipt },
    };
    const state: any = {
      generation: 9, lastVerificationReady: true, lastVerificationFinishedAtMs: 3_000,
      lastVerificationOperationId: 'verify-operation', latestVerificationOperationId: 'verify-operation',
      latestVerificationAuditId: 'verify-audit',
    };
    const audit: any = {
      action: 'global_broadcast_privacy_verify', actorUid: 'owner-a', operationId: 'verify-operation',
      entity: { collection: 'global_broadcast_modals', id: 'aggregate' },
      timestamp: new Date(3_000).toISOString(),
    };
    const verify = (overrides: Record<string, unknown> = {}) => verifier.verifyGlobalBroadcastPrivacyRollout({
      config, operation, state, audit, localArtifacts, nowMs: 7_000, ...overrides,
    });
    expect(verify()).toEqual({ ok: true, errors: [] });
    expect(verify({ operation: null }).ok).toBe(false);
    expect(verify({ state: null }).ok).toBe(false);
    expect(verify({ audit: null }).ok).toBe(false);

    const arbitrary = structuredClone(config);
    arbitrary.functionsStageEvidence.deploymentEvidenceSha256 = 'x';
    expect(verify({ config: arbitrary }).ok).toBe(false);

    const pageOnly = structuredClone(operation);
    pageOnly.result.verificationReceipt.scope = 'page';
    expect(verify({ operation: pageOnly }).ok).toBe(false);

    const wrongProject = structuredClone(operation);
    wrongProject.result.verificationReceipt.projectId = 'wrong-project';
    expect(verify({ operation: wrongProject }).ok).toBe(false);

    const wrongHash = structuredClone(operation);
    wrongHash.result.verificationReceipt.schemaAllowlistHash = sha('wrong-schema');
    expect(verify({ operation: wrongHash }).ok).toBe(false);

    const stale = structuredClone(config);
    stale.clientReleaseEvidence.releasedAtMs = 1_500;
    expect(verify({ config: stale }).ok).toBe(false);

    const future = structuredClone(config);
    future.rulesApprovalEvidence.approvedAtMs = 8_000;
    expect(verify({ config: future }).ok).toBe(false);

    const unboundApproval = structuredClone(config);
    unboundApproval.rulesApprovalEvidence.verificationOperationId = 'another-operation';
    expect(verify({ config: unboundApproval }).ok).toBe(false);
  });
});
