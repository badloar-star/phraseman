import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_conjugation_drill_gate_v1.json');
const PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_conjugation_drill_pack_v1.json');
const RU_PAYLOAD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_conjugation_drill_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar', 'fr_conjugation_drill_runtime_payload_uk.dryrun.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_conjugation_drill_gate.mjs');

describe('Gustav French conjugation drill gate', () => {
  it('materializes French-native conjugation drills as the irregular-verb equivalent without opening production', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
    const ruPayload = JSON.parse(fs.readFileSync(RU_PAYLOAD_PATH, 'utf8'));
    const ukPayload = JSON.parse(fs.readFileSync(UK_PAYLOAD_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('notEnglishIrregularVerbReuse');
    expect(script).toContain('presentPasseComposeImparfaitCovered');
    expect(script).toContain('activationRemainsClosed');

    expect(gate.schemaVersion).toBe('gustav-fr-conjugation-drill-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.activationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      lessonPacks: 32,
      ruItems: 128,
      ukItems: 128,
      totalRuntimeItems: 256,
      verbs: 32,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.trustedSources).toBeGreaterThanOrEqual(3);

    expect(pack.delivery).toBe('server-pack-candidate');
    expect(pack.sourceEvidence.length).toBeGreaterThanOrEqual(3);
    expect(ruPayload.lessonPacks).toHaveLength(32);
    expect(ukPayload.lessonPacks).toHaveLength(32);
    expect(ruPayload.lessonPacks.flatMap((lesson: { items: unknown[] }) => lesson.items)).toHaveLength(128);
    expect(ukPayload.lessonPacks.flatMap((lesson: { items: unknown[] }) => lesson.items)).toHaveLength(128);
    expect(JSON.stringify(ruPayload)).toContain('être');
    expect(JSON.stringify(ruPayload)).toContain("j'ai");
    expect(JSON.stringify(ruPayload)).toContain('préfère');

    for (const locale of ['ru', 'uk']) {
      expect(gate.validations[locale]).toMatchObject({
        sourceLocale: locale,
        lessonPacks: 32,
        items: 128,
        verbs: 32,
        issueCount: 0,
        issues: [],
      });
      expect(gate.validations[locale].tenses).toEqual(['imparfait', 'passe_compose', 'present']);
    }

    expect(gate.invariants).toMatchObject({
      frenchNativeConjugationDrills: true,
      notEnglishIrregularVerbReuse: true,
      sourceLocalePayloadsSeparated: true,
      highFrequencyFrenchVerbsCovered: true,
      presentPasseComposeImparfaitCovered: true,
      serverPackCandidateOnly: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });
  });
});
