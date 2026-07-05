import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs');

describe('Gustav French lesson LLM review execution readiness gate', () => {
  it('separates prepared requests from live execution, decision import and production readiness', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('reasoningLevelRequired: \'maximum_extended_reasoning\'');
    expect(script).toContain('openAiCallsMadeByThisScript: false');
    expect(script).toContain('reviewerDecisionsWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('CODEX_RESPONSES_API_FIREWALL_ACTIVE');
    expect(script).toContain('externalTerminalExecutionRequired');
    expect(script).toContain('currentProcessMayCallOpenAiResponses');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-execution-readiness-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.targetContentLang).toBe('fr');
    expect(audit.aiOutputLang).toBe('fr');
    expect(audit.reasoningLevelRequired).toBe('maximum_extended_reasoning');

    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.requestManifestPresent).toBe(true);
    expect(audit.summary.requestAuditReady).toBe(true);
    expect(audit.summary.executionAuditStatus).toBe('HOLD_DRY_RUN');
    expect(audit.summary.decisionsFilePresent).toBe(true);
    expect(audit.summary.decisionRows).toBe(1263);
    expect(audit.summary.missingDecisionRows).toBe(337);
    expect(audit.summary.reasoningLevels).toEqual({ deep: 1600 });
    expect(typeof audit.summary.liveCredentialState.openaiApiKeyPresent).toBe('boolean');
    expect(typeof audit.summary.liveCredentialState.spendGuardOpen).toBe('boolean');
    expect(audit.summary.liveExecutionEnvironment).toMatchObject({
      codexSessionActive: true,
      responsesApiAllowedInCurrentProcess: false,
      currentProcessMayCallOpenAiResponses: false,
      externalTerminalExecutionRequired: true,
      codexAllowedOpenAiEndpoint: 'audio/speech only',
    });
    expect(audit.summary.liveExecutionExplicitlyRequested).toBe(false);
    expect(audit.summary.canExecuteLiveBatchNow).toBe(false);
    expect(audit.summary.canImportDecisionsNow).toBe(false);
    expect(audit.summary.schemaGateReady).toBe(false);
    expect(audit.summary.importDryRunReady).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);

    expect(audit.productionBlockers.map((blocker: any) => blocker.id)).toEqual(expect.arrayContaining([
      'CODEX_RESPONSES_API_FIREWALL_ACTIVE',
      'DECISIONS_FILE_INCOMPLETE',
      'SCHEMA_GATE_NOT_READY',
      'IMPORT_DRY_RUN_NOT_READY',
    ]));
    expect(audit.nextAllowedCommands).toEqual(expect.arrayContaining([
      'Open a normal project terminal outside Codex at C:\\appsprojects\\phraseman.',
      'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index 1264 --limit 25 --execute --validate-after',
    ]));

    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationStarted: false,
      productionApplyApproved: false,
    });
  });
});
