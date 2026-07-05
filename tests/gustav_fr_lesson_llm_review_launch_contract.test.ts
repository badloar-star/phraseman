import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_launch_contract_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_launch_contract_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_launch_contract.mjs');

describe('Gustav French LLM review launch contract', () => {
  it('allows only a bounded single-batch launch after readiness and spend guard are open', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('MAX_ROWS_PER_LIVE_LAUNCH');
    expect(script).toContain('bulkAllRowsLaunchAllowed: false');
    expect(script).toContain('requireExistingLedgerValidation: true');
    expect(script).toContain('requirePreAppendValidation: true');
    expect(script).toContain('openAiCallsMadeByThisScript: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson-llm-review-launch-contract-v1');
    expect(contract.status).toBe('HOLD');
    expect(contract.activationApproved).toBe(false);
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.policy).toMatchObject({
      maxRowsPerLiveLaunch: 25,
      maxCostPerLiveLaunchUsd: 0.0625,
      bulkAllRowsLaunchAllowed: false,
      requireDryRunBeforeLive: true,
      requireValidateAfter: true,
      requireExistingLedgerValidation: true,
      requirePreAppendValidation: true,
      requireSpendGuardAtRuntime: true,
    });
    expect(contract.nextLaunch).toMatchObject({
      batchNumber: 1,
      startIndex: 1,
      endIndex: 25,
      limit: 25,
      estimatedCostUsd: 0.0625,
      reasoningLevels: { deep: 25 },
    });
    expect(contract.nextLaunch.dryRunCommand).toBe('node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index 1 --limit 25 --validate-after');
    expect(contract.nextLaunch.executeCommand).toBe('node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index 1 --limit 25 --execute --validate-after');
    expect(contract.forbiddenCommands).toEqual(expect.arrayContaining([
      'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --limit 1600 --execute',
      'any command without --validate-after',
    ]));

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-launch-contract-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.pendingRows).toBe(1600);
    expect(audit.summary.nextBatchPresent).toBe(true);
    expect(audit.summary.nextBatchStartIndex).toBe(1);
    expect(audit.summary.nextBatchLimit).toBe(25);
    expect(audit.summary.nextBatchEstimatedCostUsd).toBe(0.0625);
    expect(audit.summary.nextBatchWithinLimits).toBe(true);
    expect(audit.summary.existingLedgerValid).toBe(true);
    expect(audit.summary.preAppendValidatorReady).toBe(true);
    expect(audit.summary.liveCredentialReady).toBe(false);
    expect(audit.summary.readinessCanExecute).toBe(false);
    expect(audit.summary.canExecuteLiveNow).toBe(false);
    expect(audit.summary.allowedLiveCommands).toEqual([]);
    expect(audit.summary.dryRunCommand).toBe(contract.nextLaunch.dryRunCommand);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.blockers).toEqual(expect.arrayContaining([
      'LIVE_CREDENTIAL_OR_SPEND_GUARD_NOT_READY',
      'READINESS_GATE_DOES_NOT_ALLOW_LIVE_BATCH',
    ]));
    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    });
  });
});
