import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_blueprint_rebuild_review_gate_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_blueprint_rebuild_review_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_review_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild review gate', () => {
  it('accepts all reviewed Lesson 1 rows while keeping production activation closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('codex_llm_trusted_source_review');
    expect(script).toContain('GENERIC_FALLBACK_SIGNATURE');
    expect(script).toContain('FORBIDDEN_FRENCH_LEAKS');

    expect(gate.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-review-gate-v1');
    expect(gate.status).toBe('PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.lessonId).toBe(1);
    expect(gate.appCourseLevel).toBe('A1');
    expect(gate.reviewer).toMatchObject({
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
    });

    expect(gate.summary).toMatchObject({
      rows: 50,
      acceptedRows: 50,
      revisionRows: 0,
      llmTrustedSourceReviewDone: true,
      readyForTheoryPackDraft: true,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(gate.summary.wordsFrSlots).toBeGreaterThanOrEqual(150);
    expect(gate.summary.distractorSlots).toBeGreaterThanOrEqual(750);
    expect(gate.blockers).toEqual([]);
    expect(gate.rowDecisions).toHaveLength(50);
    expect(gate.rowDecisions.every((row: { decision: string; acceptedForProduction: boolean }) => (
      row.decision === 'ACCEPT' && row.acceptedForProduction === false
    ))).toBe(true);

    const acceptedPhrases = gate.rowDecisions.map((row: { phraseFr: string }) => row.phraseFr);
    expect(acceptedPhrases).toEqual(expect.arrayContaining([
      'Je suis ici.',
      'Tu es là.',
      'Il est prêt.',
      'Elle est prête.',
      "Je suis à l'intérieur.",
      "C'est facile.",
      "C'est possible.",
    ]));

    expect(JSON.stringify(gate)).not.toMatch(/\b(etes|pret|prete|prets|pretes|occupe|occupee|fatigue|fatiguee|securite|casse|serieux)\b/);
    expect(gate.productionBlockers).toEqual(expect.arrayContaining([
      'LESSON1_AUDIO_TTS_NOT_GENERATED',
      'LESSON1_SERVER_PACK_NOT_BUILT',
      'FULL_32_LESSON_PARITY_NOT_DONE',
      'ADMIN_STORAGE_CLOUD_PROMPT_GATES_NOT_DONE',
    ]));
    expect(gate.safety).toMatchObject({
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      firebaseUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Accepted rows: 50/50');
    expect(markdown).toContain("Je suis à l'intérieur.");
    expect(markdown).toContain('## Production Blockers Still Open');

    expect(state.lesson01BlueprintRebuildReviewGate).toBe('docs/gustav/generated/fr/reviewer/fr_lesson01_blueprint_rebuild_review_gate_v1.json');
    expect(state.lesson01BlueprintRebuildReviewGateStatus).toBe('PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(state.lesson01BlueprintRebuildReviewGateSummary).toMatchObject({
      acceptedRows: 50,
      revisionRows: 0,
      activationApproved: false,
    });
  });
});
