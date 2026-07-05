import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'daily_phrases', 'fr_daily_phrase_global_readiness_bridge_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_daily_phrase_global_readiness_bridge_gate.mjs');

describe('Gustav French Daily Phrase global readiness bridge gate', () => {
  it('marks Daily Phrases as locally ready while global French activation remains closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('notFlashcardBridgeAsFinalContent');
    expect(script).toContain('noEnglishIdiomsFallbackForFrenchRuntime');
    expect(script).toContain('serverPackTargetScoped');
    expect(script).toContain('activationRemainsClosed');

    expect(gate.schemaVersion).toBe('gustav-fr-daily-phrase-global-readiness-bridge-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.surface).toBe('daily_phrases');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      acceptedRows: 176,
      strictSourceBackedRows: 176,
      ruPayloadRows: 176,
      ukPayloadRows: 176,
      duplicateCount: 0,
      runtimeWired: true,
      uploadRehearsalPerformed: true,
      liveUploadPerformed: false,
      adminSurfaceWired: true,
      productionReadyLocalGate: true,
      activationApproved: false,
      globalFrenchStillHold: true,
    });

    for (const locale of ['ru', 'uk']) {
      expect(gate.validations[locale]).toMatchObject({
        sourceLocale: locale,
        entryCount: 176,
        issueCount: 0,
        issues: [],
      });
    }

    expect(gate.invariants).toMatchObject({
      frenchNativeDailyPhraseBank: true,
      notFlashcardBridgeAsFinalContent: true,
      noEnglishIdiomsFallbackForFrenchRuntime: true,
      sourceEvidencePerAcceptedRow: true,
      duplicateTargetsBlocked: true,
      ruUkPayloadsSeparated: true,
      serverPackTargetScoped: true,
      liveUploadClosed: true,
      adminWorkflowScopedToFrench: true,
      rollbackToFlashcardBridgeAvailable: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
  });
});
