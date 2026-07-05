import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'flashcards', 'fr_flashcard_global_readiness_bridge_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_flashcard_global_readiness_bridge_gate.mjs');

describe('Gustav French flashcard global readiness bridge gate', () => {
  it('promotes French flashcard packs to local surface ready while global French activation stays closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('notLessonRowFanout');
    expect(script).toContain('serverPackCandidateOnly');
    expect(script).toContain('activationRemainsClosed');
    expect(script).toContain('MOJIBAKE_PATTERN');

    expect(gate.schemaVersion).toBe('gustav-fr-flashcard-global-readiness-bridge-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.surface).toBe('flashcards_and_marketplace_cards');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      packCount: 5,
      cardCount: 100,
      ruPayloadPacks: 5,
      ukPayloadPacks: 5,
      ruPayloadCards: 100,
      ukPayloadCards: 100,
      sourceEvidenceRows: 100,
      duplicateAudit: 'PASS',
      descriptionStyle: 'PASS',
      serverManifest: 'PASS_DRY_RUN',
      runtimeIsolation: 'PASS',
      adminWorkflow: 'PASS_DRY_RUN',
      rollback: 'PASS_DRY_RUN',
      activationReadiness: 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL',
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.sourceCount).toBeGreaterThanOrEqual(10);

    for (const locale of ['ru', 'uk']) {
      expect(gate.validations[locale]).toMatchObject({
        sourceLocale: locale,
        packCount: 5,
        cardCount: 100,
        issueCount: 0,
        issues: [],
      });
    }

    expect(gate.invariants).toMatchObject({
      frenchNativeMarketplacePacks: true,
      notLessonRowFanout: true,
      fiveOfficialPacksWithTwentyCardsEach: true,
      sourceEvidencePerCard: true,
      duplicateTargetsBlocked: true,
      ruUkPayloadsSeparated: true,
      serverPackCandidateOnly: true,
      appBundleAssetsNotModified: true,
      adminWritesClosed: true,
      liveUploadClosed: true,
      runtimeActivationClosed: true,
      rollbackExecutionClosed: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
  });
});
