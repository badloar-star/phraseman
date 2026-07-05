import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PACKET_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_live_handoff_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_live_handoff.mjs');

describe('Gustav French LLM review live handoff', () => {
  it('prints the bounded first live command without spending, importing or opening production', () => {
    const packet = JSON.parse(fs.readFileSync(PACKET_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND');
    expect(script).toContain('Stop after this single 25-row batch');
    expect(script).toContain('openAiCallsMadeByThisScript: false');

    expect(packet.schemaVersion).toBe('gustav-fr-lesson-llm-review-live-handoff-v1');
    expect(packet.status).toBe('HOLD_SPEND_GUARD_CLOSED');
    expect(packet.activationApproved).toBe(false);
    expect(packet.studyTarget).toBe('fr');
    expect(packet.sourceLocales).toEqual(['ru', 'uk']);
    expect(packet.targetContentLang).toBe('fr');
    expect(packet.nextLaunch).toMatchObject({
      batchNumber: 1,
      limit: 25,
      estimatedCostUsd: 0.0625,
      reasoningLevels: { deep: 25 },
    });
    expect(packet.nextLaunch.startIndex).toBeGreaterThanOrEqual(1);
    expect(packet.nextLaunch.endIndex).toBe(packet.nextLaunch.startIndex + 24);
    expect(packet.commands.dryRun).toBe(`node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${packet.nextLaunch.startIndex} --limit 25 --validate-after`);
    expect(packet.commands.live).toBe(`node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index ${packet.nextLaunch.startIndex} --limit 25 --execute --validate-after`);
    expect(packet.commands.livePowerShellOneShot).toContain("$env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND='1'");
    expect(packet.commands.livePowerShellOneShot).toContain('Remove-Item Env:\\PHRASEMAN_ALLOW_OPENAI_DEV_SPEND');
    expect(packet.commands.postBatchGates).toEqual(expect.arrayContaining([
      'node scripts/gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs',
      'node scripts/gustav_validate_fr_lesson_llm_review_decisions.mjs',
      'node scripts/gustav_fr_lesson_review_decision_import_dry_run.mjs',
      'node scripts/gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs',
    ]));
    expect(packet.readiness).toMatchObject({
      openaiApiKeyPresent: true,
      spendGuardOpen: false,
      launchAuditCanExecuteLiveNow: false,
      runnerWillStillRequireSpendGuard: true,
      runnerWillStillEnforceMaxRowsAndCost: true,
    });
    expect(packet.stopConditions.join('\n')).toContain('Do not run live command unless');
    expect(packet.stopConditions.join('\n')).toContain('Stop after this single 25-row batch');
    expect(packet.safety).toMatchObject({
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
