import fs from 'node:fs';
import path from 'node:path';

import { writeHeisenbergProductionReleaseEvidenceTemplate } from '../scripts/heisenberg_production_release_evidence_template';
import { writeHeisenbergProductionReleaseEvidenceValidation } from '../scripts/heisenberg_production_release_evidence_validator';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/production-release-evidence';
const GENERATED_AT = '2026-06-28T09:00:00.000Z';
const LOCALES = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CONTENT_HASH = `sha256:${'a'.repeat(64)}`;
const PACK_HASH = `sha256:${'b'.repeat(64)}`;

function rel(file: string): string {
  return `${RUN_ROOT_RELATIVE}/${file}`;
}

function abs(file: string): string {
  return path.join(ROOT, rel(file));
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function cleanRunRoot(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
}

function validReleaseEvidence(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'heisenberg-production-release-evidence-v1',
    requiredLocales: LOCALES,
    generatedApprovals: false,
    generatedDecisionsOrEvidence: false,
    runtimeSourceMutation: false,
    activationApproved: true,
    remoteLoadingEnabled: true,
    runtimeManifestRegistered: true,
    packHashesRebuiltFromCurrentContent: true,
    sourceEvidence: {
      batchManifestPath: rel('source/batch_manifest.json'),
      uiAuditPath: rel('source/ui_locale_audit.json'),
      semanticAuditPath: rel('source/semantic_audit.json'),
      quizValidationPath: rel('source/filled_work_order_validation.json'),
      productionReadinessGatePath: rel('source/production_readiness_gate.json'),
      sourceApplyCandidatePath: rel('source/source_apply_candidate.json'),
      contentRevisionId: 'heisenberg-content-revision-test',
    },
    packArtifacts: Object.fromEntries(LOCALES.map((locale) => [
      locale,
      {
        contentHash: CONTENT_HASH,
        packHash: PACK_HASH,
        serverArtifactId: `server-artifact:${locale}`,
        deployedAt: GENERATED_AT,
      },
    ])),
    approvals: Object.fromEntries(LOCALES.map((locale) => [
      locale,
      {
        reviewerEvidenceId: `reviewer:${locale}`,
        localeOwnerEvidenceId: `locale-owner:${locale}`,
        productOwnerEvidenceId: `product-owner:${locale}`,
      },
    ])),
    runtimeGates: Object.fromEntries(LOCALES.map((locale) => [
      locale,
      {
        offlineCacheEvidenceId: `offline-cache:${locale}`,
        rollbackEvidenceId: `rollback:${locale}`,
        storageRulesEvidenceId: `storage-rules:${locale}`,
      },
    ])),
    ...overrides,
  };
}

function writeValidSourceEvidenceFiles(): void {
  writeJson('source/batch_manifest.json', { pipeline: 'heisenberg', mode: 'batch', status: 'PASS' });
  writeJson('source/ui_locale_audit.json', { mode: 'ui-locale-audit', activationReady: true, findings: [] });
  writeJson('source/semantic_audit.json', { mode: 'semantic-audit', summary: { blockers: 0 } });
  writeJson('source/filled_work_order_validation.json', {
    schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
    status: 'PASS',
    sourceApplyCandidateReady: true,
  });
  writeJson('source/production_readiness_gate.json', {
    schemaVersion: 'heisenberg-production-readiness-gate-v1',
    status: 'PASS',
  });
  writeJson('source/source_apply_candidate.json', {
    schemaVersion: 'heisenberg-quiz-payload-source-apply-candidate-v1',
    sourceApplyCandidateReady: true,
  });
}

function validate(file = 'release_evidence.json') {
  return writeHeisenbergProductionReleaseEvidenceValidation(ROOT, {
    releaseEvidencePath: rel(file),
    outputPath: rel('release_evidence_validation.json'),
    generatedAt: GENERATED_AT,
  });
}

describe('heisenberg production release evidence workflow', () => {
  beforeEach(() => {
    cleanRunRoot();
  });

  it('exposes release evidence template and validation through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:release-evidence-template': 'npx tsx ./scripts/heisenberg_production_release_evidence_template.ts',
      'heisenberg:release-evidence-validate': 'npx tsx ./scripts/heisenberg_production_release_evidence_validator.ts',
    });
  });

  it('writes a template with blank approvals that cannot be submitted as release evidence', () => {
    const result = writeHeisenbergProductionReleaseEvidenceTemplate(ROOT, {
      outputDir: rel('template'),
      generatedAt: GENERATED_AT,
    });
    const template = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8')) as {
      schemaVersion: string;
      targetSchemaVersion: string;
      templateOnly: boolean;
      generatedApprovals: boolean;
      approvals: Record<string, Record<string, string>>;
    };

    expect(template).toMatchObject({
      schemaVersion: 'heisenberg-production-release-evidence-template-v1',
      targetSchemaVersion: 'heisenberg-production-release-evidence-v1',
      templateOnly: true,
      generatedApprovals: false,
    });
    expect(template.approvals.es.reviewerEvidenceId).toBe('');

    const validation = writeHeisenbergProductionReleaseEvidenceValidation(ROOT, {
      releaseEvidencePath: rel('template/release_evidence_template.json'),
      outputPath: rel('template/release_evidence_validation.json'),
      generatedAt: GENERATED_AT,
    });

    expect(validation.report.status).toBe('HOLD');
    expect(validation.report.blockers).toEqual(expect.arrayContaining([
      'release evidence template cannot be submitted as production release evidence',
      'schemaVersion must be heisenberg-production-release-evidence-v1',
    ]));
  });

  it('writes HOLD without throwing when real release evidence is missing', () => {
    const result = validate();

    expect(result.report).toMatchObject({
      schemaVersion: 'heisenberg-production-release-evidence-validation-v1',
      status: 'HOLD',
      validationStatus: 'MISSING_RELEASE_EVIDENCE',
      generatedApprovals: false,
      runtimeSourceMutation: false,
      activationApproved: false,
      remoteLoadingEnabled: false,
      runtimeManifestRegistered: false,
      packHashesRebuiltFromCurrentContent: false,
    });
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'production release evidence artifact is missing',
      'es: production release evidence artifact is missing',
    ]));
  });

  it('passes only with real filled hashes, approvals, runtime gates, and source evidence', () => {
    writeValidSourceEvidenceFiles();
    writeJson('release_evidence.json', validReleaseEvidence());

    const result = validate();

    expect(result.report).toMatchObject({
      status: 'PASS',
      validationStatus: 'PRODUCTION_RELEASE_EVIDENCE_READY',
      generatedApprovals: false,
      generatedDecisionsOrEvidence: false,
      runtimeSourceMutation: false,
      activationApproved: true,
      remoteLoadingEnabled: true,
      runtimeManifestRegistered: true,
      packHashesRebuiltFromCurrentContent: true,
      blockers: [],
    });
    expect(result.report.locales.es).toMatchObject({
      packArtifactReady: true,
      approvalsReady: true,
      runtimeGatesReady: true,
      blockers: [],
    });
  });

  it('holds on generated approvals, placeholders, and missing source evidence', () => {
    const evidence = validReleaseEvidence({
      generatedApprovals: true,
      sourceEvidence: {
        batchManifestPath: 'docs/heisenberg/batch/test/manifest.json',
      },
    });
    (evidence.approvals as Record<string, Record<string, string>>).es.reviewerEvidenceId = 'TODO';
    writeJson('release_evidence.json', evidence);

    const result = validate();

    expect(result.report.status).toBe('HOLD');
    expect(result.report.generatedApprovals).toBe(true);
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'generatedApprovals must be false',
      'sourceEvidence.uiAuditPath is required',
      'es: approval evidence reviewerEvidenceId is required',
    ]));
  });

  it('holds when source evidence files or sha256 pack hashes are not real', () => {
    const evidence = validReleaseEvidence();
    (evidence.packArtifacts as Record<string, Record<string, string>>).es.contentHash = 'sha256:content:es';
    writeJson('release_evidence.json', evidence);

    const result = validate();

    expect(result.report.status).toBe('HOLD');
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'sourceEvidence.batchManifestPath file does not exist',
      'es: pack artifact contentHash must be sha256:<64 hex>',
    ]));
  });

  it('keeps validation output under docs/heisenberg or .codex-tmp', () => {
    writeValidSourceEvidenceFiles();
    writeJson('release_evidence.json', validReleaseEvidence());

    expect(() => writeHeisenbergProductionReleaseEvidenceValidation(ROOT, {
      releaseEvidencePath: rel('release_evidence.json'),
      outputPath: '../outside-heisenberg/release_evidence_validation.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Heisenberg production release evidence validation output must stay under .codex-tmp or docs/heisenberg');
  });
});
