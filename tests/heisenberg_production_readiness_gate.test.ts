import fs from 'node:fs';
import path from 'node:path';

import { writeHeisenbergProductionReadinessGate } from '../scripts/heisenberg_production_readiness_gate';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/production-readiness-gate';
const GENERATED_AT = '2026-06-28T08:00:00.000Z';
const LOCALES = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const STRUCTURED_LOCALES = LOCALES.filter((locale) => locale !== 'es');
const CONTENT_HASH = `sha256:${'c'.repeat(64)}`;
const PACK_HASH = `sha256:${'d'.repeat(64)}`;

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

function writeBaseEvidence(options: {
  uiActivationReady?: boolean;
  semanticWarnings?: number;
  quizValidationStatus?: 'PASS' | 'HOLD';
  releaseEvidence?: unknown;
} = {}): void {
  const quizValidationStatus = options.quizValidationStatus ?? 'PASS';
  writeJson('batch_manifest.json', {
    pipeline: 'heisenberg',
    mode: 'batch',
    generatedAt: GENERATED_AT,
    locales: LOCALES,
    runs: LOCALES.map((locale) => ({
      locale,
      ok: true,
      status: 0,
    })),
    checks: [],
  });
  writeJson('ui_locale_audit.json', {
    generatedAt: GENERATED_AT,
    mode: 'ui-locale-audit',
    activationReady: options.uiActivationReady ?? true,
    summary: { findings: 0, byCode: {} },
    findings: [],
  });
  writeJson('semantic_audit.json', {
    generatedAt: GENERATED_AT,
    mode: 'semantic-audit',
    strict: true,
    summary: {
      findings: options.semanticWarnings ?? 0,
      blockers: 0,
      warnings: options.semanticWarnings ?? 0,
      reviewGroups: 0,
      byCode: {},
      bySurface: {},
    },
    reviewGroups: [],
    findings: Array.from({ length: options.semanticWarnings ?? 0 }, (_, index) => ({
      severity: 'warning',
      code: 'protected-english-term-missing',
      surface: 'quiz',
      locale: 'es',
      message: `warning ${index}`,
    })),
  });
  writeJson('repair_plan.json', {
    mode: 'quiz-payload-ordinal-repair-plan',
    sourceFile: 'app/quiz_source_locale_payloads.ts',
    candidate: {
      sourceApplyReady: false,
      summary: {
        acceptedRemaps: 142,
        sourceEntryCoverageDrops: 0,
        unresolvedMultipleTargets: 0,
        residualOrdinalBlockers: 0,
      },
      workOrder: {
        summary: {
          replacementPayloadTasks: 0,
          collisionDecisionTasks: 0,
          residualValidationTasks: 0,
          localesPerReplacementTask: STRUCTURED_LOCALES,
        },
      },
    },
  });
  writeJson('filled_work_order_validation.json', {
    schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
    status: quizValidationStatus,
    validationStatus: quizValidationStatus === 'PASS' ? 'SOURCE_APPLY_CANDIDATE_READY' : 'MISSING_FILLED_ARTIFACT',
    sourceApplyCandidateReady: quizValidationStatus === 'PASS',
    candidateGenerated: quizValidationStatus === 'PASS',
    generatedDecisionsOrEvidence: false,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    productionActivationApproved: false,
    finalResidualOrdinalFindings: [],
    blockers: quizValidationStatus === 'PASS'
      ? []
      : ['external filled Heisenberg quiz payload repair work-order artifact is missing'],
  });
  writeJson('source_apply_candidate.json', {
    schemaVersion: 'heisenberg-quiz-payload-source-apply-candidate-v1',
    sourceApplyCandidateReady: quizValidationStatus === 'PASS',
  });
  writeJson('source_readiness_gate.json', {
    schemaVersion: 'heisenberg-production-readiness-gate-v1',
    status: 'PASS',
  });
  if (options.releaseEvidence !== undefined) {
    writeJson('release_evidence.json', options.releaseEvidence);
  }
}

function writeSemanticClearanceValidation(warningsByLocale: Record<string, number>): void {
  const totalWarnings = Object.values(warningsByLocale).reduce((sum, count) => sum + count, 0);
  writeJson('semantic_clearance_validation.json', {
    schemaVersion: 'heisenberg-semantic-clearance-validation-v1',
    status: 'PASS',
    validationStatus: 'SEMANTIC_WARNINGS_CLEARED',
    generatedAt: GENERATED_AT,
    semanticAuditPath: rel('semantic_audit.json'),
    clearancePath: rel('semantic_clearance.json'),
    generatedClearanceArtifact: false,
    generatedDecisionsOrEvidence: false,
    semanticBlockersRemaining: 0,
    semanticWarnings: totalWarnings,
    expectedClearanceTasks: totalWarnings,
    filledClearanceTasks: totalWarnings,
    missingTaskIds: [],
    duplicateTaskIds: [],
    unknownTaskIds: [],
    locales: Object.fromEntries(Object.entries(warningsByLocale).map(([locale, warnings]) => [
      locale,
      {
        warnings,
        cleared: warnings,
        blockers: [],
      },
    ])),
    blockers: [],
  });
}

function releaseEvidence(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'heisenberg-production-release-evidence-v1',
    generatedApprovals: false,
    runtimeSourceMutation: false,
    activationApproved: true,
    remoteLoadingEnabled: true,
    runtimeManifestRegistered: true,
    packHashesRebuiltFromCurrentContent: true,
    sourceEvidence: {
      batchManifestPath: rel('batch_manifest.json'),
      uiAuditPath: rel('ui_locale_audit.json'),
      semanticAuditPath: rel('semantic_audit.json'),
      quizValidationPath: rel('filled_work_order_validation.json'),
      productionReadinessGatePath: rel('source_readiness_gate.json'),
      sourceApplyCandidatePath: rel('source_apply_candidate.json'),
      contentRevisionId: 'test-content-revision',
    },
    packArtifacts: Object.fromEntries(LOCALES.map((locale) => [
      locale,
      {
        contentHash: CONTENT_HASH,
        packHash: PACK_HASH,
        serverArtifactId: `server-pack:${locale}`,
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
        offlineCacheEvidenceId: `offline:${locale}`,
        rollbackEvidenceId: `rollback:${locale}`,
        storageRulesEvidenceId: `storage:${locale}`,
      },
    ])),
    ...overrides,
  };
}

function runGate(extraOptions: Record<string, string | boolean> = {}) {
  return writeHeisenbergProductionReadinessGate(ROOT, {
    batchManifestPath: rel('batch_manifest.json'),
    uiAuditPath: rel('ui_locale_audit.json'),
    semanticAuditPath: rel('semantic_audit.json'),
    semanticClearanceValidationPath: rel('semantic_clearance_validation.json'),
    quizRepairPlanPath: rel('repair_plan.json'),
    quizValidationPath: rel('filled_work_order_validation.json'),
    releaseEvidencePath: rel('release_evidence.json'),
    outputDir: rel('out'),
    generatedAt: GENERATED_AT,
    ...extraOptions,
  });
}

describe('heisenberg production readiness gate', () => {
  beforeEach(() => {
    cleanRunRoot();
  });

  it('exposes the production readiness gate through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:production-readiness': 'npx tsx ./scripts/heisenberg_production_readiness_gate.ts',
    });
  });

  it('passes only when all content, quiz, pack, approvals, and server evidence is clean', () => {
    writeBaseEvidence({ releaseEvidence: releaseEvidence() });

    const result = runGate();

    expect(result.report).toMatchObject({
      schemaVersion: 'heisenberg-production-readiness-gate-v1',
      status: 'PASS',
      summary: {
        readyLocales: 6,
        blockedLocales: 0,
        sourceApplyCandidateReady: true,
        activationApproved: true,
        remoteLoadingEnabled: true,
        runtimeManifestRegistered: true,
        generatedApprovals: false,
        runtimeSourceMutation: false,
      },
    });
    expect(result.report.languages.every((language) => language.status === 'READY')).toBe(true);
    expect(fs.existsSync(path.join(ROOT, rel('out/production_readiness_gate.json')))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, rel('out/production_readiness_gate.md')))).toBe(true);
  });

  it('allows active semantic warnings only when matching semantic clearance validation passes', () => {
    writeBaseEvidence({
      semanticWarnings: 1,
      releaseEvidence: releaseEvidence(),
    });

    const withoutClearance = runGate();

    expect(withoutClearance.report.status).toBe('HOLD');
    expect(withoutClearance.report.summary.semanticClearanceReady).toBe(false);
    expect(withoutClearance.report.languages.find((language) => language.locale === 'es')?.blockers).toEqual(
      expect.arrayContaining(['semantic warnings require reviewer clearance or fixes (1)']),
    );

    writeSemanticClearanceValidation({ es: 1 });

    const withClearance = runGate({ outputDir: rel('out-with-clearance') });

    expect(withClearance.report.status).toBe('PASS');
    expect(withClearance.report.summary.semanticClearanceReady).toBe(true);
    expect(withClearance.report.languages.find((language) => language.locale === 'es')?.gates.semantic).toMatchObject({
      status: 'PASS',
      counts: {
        localeWarnings: 1,
        clearanceReady: true,
      },
    });
  });

  it('holds when quiz filled evidence and production release evidence are missing', () => {
    writeBaseEvidence({ quizValidationStatus: 'HOLD' });

    const result = runGate();

    expect(result.report.status).toBe('HOLD');
    expect(result.report.summary.readyLocales).toBe(0);
    expect(result.report.summary.sourceApplyCandidateReady).toBe(false);
    expect(result.report.summary.activationApproved).toBe(false);
    expect(result.report.languages.find((language) => language.locale === 'es')?.gates.quizPayloadRepair.status).toBe('NA');
    for (const locale of STRUCTURED_LOCALES) {
      const language = result.report.languages.find((item) => item.locale === locale);
      expect(language?.gates.quizPayloadRepair.status).toBe('HOLD');
      expect(language?.blockers).toEqual(expect.arrayContaining([
        'quiz source-apply candidate is not ready',
        'external filled Heisenberg quiz payload repair work-order artifact is missing',
        'production release evidence is missing',
      ]));
    }
  });

  it('rejects generated approvals and runtime source mutation even when other evidence is present', () => {
    writeBaseEvidence({
      releaseEvidence: releaseEvidence({
        generatedApprovals: true,
        runtimeSourceMutation: true,
      }),
    });

    const result = runGate();

    expect(result.report.status).toBe('HOLD');
    expect(result.report.summary.generatedApprovals).toBe(true);
    expect(result.report.summary.runtimeSourceMutation).toBe(true);
    expect(result.report.languages[0].blockers).toEqual(expect.arrayContaining([
      'generated approvals are not accepted for production release',
      'runtime source mutation is not allowed',
    ]));
  });

  it('rejects release evidence with nonexistent source evidence files or weak pack hashes', () => {
    const evidence = releaseEvidence({
      sourceEvidence: {
        batchManifestPath: rel('missing_batch_manifest.json'),
        uiAuditPath: rel('ui_locale_audit.json'),
        semanticAuditPath: rel('semantic_audit.json'),
        quizValidationPath: rel('filled_work_order_validation.json'),
        productionReadinessGatePath: rel('source_readiness_gate.json'),
        sourceApplyCandidatePath: rel('source_apply_candidate.json'),
        contentRevisionId: 'test-content-revision',
      },
    });
    (evidence.packArtifacts as Record<string, Record<string, string>>).es.contentHash = 'content:es';
    writeBaseEvidence({ releaseEvidence: evidence });

    const result = runGate();

    expect(result.report.status).toBe('HOLD');
    const es = result.report.languages.find((language) => language.locale === 'es');
    expect(es?.gates.productionPack.blockers).toEqual(expect.arrayContaining([
      'production pack artifact contentHash must be sha256:<64 hex>',
    ]));
    expect(es?.gates.serverRuntime.blockers).toEqual(expect.arrayContaining([
      'sourceEvidence.batchManifestPath file does not exist',
    ]));
  });

  it('keeps generated reports under docs/heisenberg or .codex-tmp', () => {
    writeBaseEvidence({ releaseEvidence: releaseEvidence() });

    expect(() => runGate({ outputDir: '../outside-heisenberg' })).toThrow(
      'Heisenberg production readiness output must stay under .codex-tmp or docs/heisenberg',
    );
  });
});
