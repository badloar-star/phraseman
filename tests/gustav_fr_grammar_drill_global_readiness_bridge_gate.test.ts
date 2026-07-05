import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_grammar_drill_global_readiness_bridge_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_grammar_drill_global_readiness_bridge_gate.mjs');

describe('Gustav French grammar drill global readiness bridge gate', () => {
  it('closes the local preposition/conjugation materialization gap while global French activation remains closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('PREPOSITION_GATE_NOT_READY');
    expect(script).toContain('CONJUGATION_GATE_NOT_READY');
    expect(script).toContain('notEnglishPrepositionOrIrregularReuse');

    expect(gate.schemaVersion).toBe('gustav-fr-grammar-drill-global-readiness-bridge-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.surface).toBe('prepositions_and_conjugation_drills');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      prepositionLessonPacks: 32,
      conjugationLessonPacks: 32,
      prepositionRuntimeItems: 384,
      conjugationRuntimeItems: 256,
      totalRuntimeItems: 640,
      conjugationVerbs: 32,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.trustedSources).toBeGreaterThanOrEqual(5);

    expect(gate.invariants).toMatchObject({
      frenchNativePrepositionDrills: true,
      frenchNativeConjugationDrills: true,
      notEnglishPrepositionOrIrregularReuse: true,
      sourceLocalePayloadsSeparated: true,
      serverPackCandidateOnly: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
  });
});

