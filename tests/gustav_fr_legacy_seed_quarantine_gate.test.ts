import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_legacy_seed_quarantine_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_legacy_seed_quarantine_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French legacy seed quarantine gate', () => {
  it('prevents old French seed lessons and early L1/L2 candidates from becoming production content', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('QUARANTINED_LEGACY_SEED');
    expect(script).toContain('BLUEPRINT_FIRST_REBUILD');
    expect(script).toContain('legacySeedMayBeUsedAsFinalLessonContent: false');

    expect(gate.schemaVersion).toBe('gustav-fr-legacy-seed-quarantine-gate-v1');
    expect(gate.status).toBe('HOLD_QUARANTINED_LEGACY_SEED');
    expect(gate.verdict).toBe('Existing French lesson drafts are not production course content.');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.activationApproved).toBe(false);
    expect(gate.readyForApply).toBe(false);

    expect(gate.quarantinePolicy).toMatchObject({
      legacySeedMayBeReadAsEvidence: true,
      legacySeedMayBeUsedAsFinalLessonContent: false,
      legacySeedMayBeUploadedToServer: false,
      legacySeedMayBeUsedForAudioGeneration: false,
      legacySeedMayBeEnabledInRuntime: false,
      legacySeedMaySetActivationApproved: false,
      lessonRebuildMustStartFromEnglishBlueprint: true,
      copyProductShapeOnly: true,
      rebuildFrenchNatively: true,
    });

    expect(gate.summary).toMatchObject({
      legacyLedgerFiles: 32,
      legacyLedgerRows: 1600,
      expectedLegacyLedgerRows: 1600,
      reviewDraftsChecked: 2,
      reviewDraftRows: 100,
      generationAllowedRows: 0,
      materializationAllowedRows: 0,
      audioGenerationAllowedRows: 0,
      serverUploadAllowedRows: 0,
      runtimeActivationAllowedRows: 0,
      activationApproved: false,
      readyForApply: false,
    });
    expect(gate.summary.materializedCandidateFilesQuarantined).toBeGreaterThanOrEqual(4);

    expect(gate.quarantinedGroups).toHaveLength(2);
    expect(gate.quarantinedGroups.every((group: { status: string; productionUseAllowed: boolean }) => (
      group.status === 'QUARANTINED_LEGACY_SEED' && group.productionUseAllowed === false
    ))).toBe(true);

    expect(gate.nextRequiredBuild).toMatchObject({
      lessonId: 1,
      mode: 'BLUEPRINT_FIRST_REBUILD',
      outputExpectationForUserReview: expect.stringContaining('One readable Lesson 1 file'),
    });
    expect(gate.nextRequiredBuild.mustInspectBeforeWriting).toEqual(expect.arrayContaining([
      'All 50 English lesson 1 rows.',
      'Every English lesson 1 word slot and distractor set.',
      'Trusted French A1 source evidence for native Lesson 1 sequencing.',
    ]));
    expect(gate.nextRequiredBuild.mustCreateAfterInspection).toEqual(expect.arrayContaining([
      '50 new French-native phrases, not a translation pass.',
      'French distractors by grammatical slot.',
      'Theory in the same product shape as English but explaining French.',
    ]));

    expect(gate.productionBlockers).toEqual(expect.arrayContaining([
      'FRENCH_LEGACY_SEED_CONTENT_QUARANTINED',
      'LESSON01_MUST_BE_REBUILT_FROM_SURGICAL_ENGLISH_BLUEPRINT',
      'NO_AUDIO_SERVER_RUNTIME_OR_ACTIVATION_FROM_LEGACY_SEED',
    ]));
    expect(gate.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchRuntimeContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(state.legacySeedQuarantineGate).toBe('docs/gustav/generated/fr/core_lessons_32/fr_legacy_seed_quarantine_gate_v1.json');
    expect(state.legacySeedQuarantineStatus).toBe('HOLD_QUARANTINED_LEGACY_SEED');
    expect(state.lesson01FullReviewDraftStatus).toBe('QUARANTINED_LEGACY_SEED');
    expect(state.lesson02FullReviewDraftStatus).toBe('QUARANTINED_LEGACY_SEED');
    expect(state.legacySeedQuarantineSummary).toMatchObject({
      legacyLedgerRows: 1600,
      generationAllowedRows: 0,
      activationApproved: false,
    });
  });
});
