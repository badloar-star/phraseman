import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'collectibles', 'fr_collectible_candidate_bridge_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_collectible_candidate_bridge_gate.mjs');

describe('Gustav French collectible candidate bridge gate', () => {
  it('accepts the 330-row French collectible candidate while keeping source, asset, runtime and activation gates closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('liveSourceVerificationStillHold');
    expect(script).toContain('generatedAssetsStillHold');
    expect(script).toContain('serverRuntimeApplyStillClosed');
    expect(script).toContain('MOJIBAKE_PATTERN');

    expect(gate.schemaVersion).toBe('gustav-fr-collectible-candidate-bridge-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_CANDIDATE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.surface).toBe('collectible_cards');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      sets: 30,
      rows: 330,
      regularCards: 300,
      secretCards: 30,
      rarity: { common: 150, rare: 90, epic: 45, legendary: 15 },
      sourceEvidenceRows: 330,
      dalleQueueItems: 330,
      liveSourceFetchedRows: 0,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.generatedWebpAssets).toBeLessThan(330);

    expect(gate.validation).toMatchObject({
      rowCount: 330,
      regularCards: 300,
      secretCards: 30,
      issueCount: 0,
      issues: [],
    });

    expect(gate.invariants).toMatchObject({
      matchesEnglishCollectibleShape: true,
      frenchNativeRowsNotEnglishTranslations: true,
      sourceEvidenceQueuedForEveryRow: true,
      liveSourceVerificationStillHold: true,
      dalleQueueReadyWithoutInThreadGeneration: true,
      generatedAssetsStillHold: true,
      serverRuntimeApplyStillClosed: true,
      appBundleCatalogsNotModified: true,
      englishCatalogModified: true,
      lessonFilesModified: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
  });
});
