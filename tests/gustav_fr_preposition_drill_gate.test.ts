import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_preposition_drill_gate_v1.json');
const PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_preposition_drill_pack_v1.json');
const RU_PAYLOAD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_preposition_drill_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_preposition_drill_runtime_payload_uk.dryrun.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_preposition_drill_gate.mjs');

describe('Gustav French preposition drill gate', () => {
  it('materializes French-native preposition drills as server-pack candidates while production stays closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
    const ruPayload = JSON.parse(fs.readFileSync(RU_PAYLOAD_PATH, 'utf8'));
    const ukPayload = JSON.parse(fs.readFileSync(UK_PAYLOAD_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('notEnglishPrepositionReuse');
    expect(script).toContain('server-pack-candidate');
    expect(script).toContain('activationRemainsClosed');

    expect(gate.schemaVersion).toBe('gustav-fr-preposition-drill-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.activationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      lessonPacks: 32,
      ruItems: 192,
      ukItems: 192,
      totalRuntimeItems: 384,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.trustedSources).toBeGreaterThanOrEqual(2);

    expect(pack.delivery).toBe('server-pack-candidate');
    expect(pack.sourceEvidence.length).toBeGreaterThanOrEqual(2);
    expect(ruPayload.lessonPacks).toHaveLength(32);
    expect(ukPayload.lessonPacks).toHaveLength(32);
    expect(ruPayload.lessonPacks.flatMap((lesson: { items: unknown[] }) => lesson.items)).toHaveLength(192);
    expect(ukPayload.lessonPacks.flatMap((lesson: { items: unknown[] }) => lesson.items)).toHaveLength(192);
    expect(JSON.stringify(ruPayload)).toContain('à');
    expect(JSON.stringify(ruPayload)).toContain('États-Unis');

    for (const locale of ['ru', 'uk']) {
      expect(gate.validations[locale]).toMatchObject({
        sourceLocale: locale,
        lessonPacks: 32,
        items: locale === 'ru' ? 192 : 192,
        issueCount: 0,
        issues: [],
      });
    }

    expect(gate.invariants).toMatchObject({
      frenchNativePrepositionDrills: true,
      notEnglishPrepositionReuse: true,
      sourceLocalePayloadsSeparated: true,
      articleContractionsCovered: true,
      placeTimeDirectionFunctionCovered: true,
      serverPackCandidateOnly: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
  });
});

