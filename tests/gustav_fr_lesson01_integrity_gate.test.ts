import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_integrity_gate_audit_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_integrity_gate_audit_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_integrity_gate.mjs');

describe('Gustav French lesson 1 combined integrity gate', () => {
  it('accepts structural integrity across pack, theory, review and audio manifest while keeping production blocked', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('PASS_INTEGRITY_WITH_AUDIO_HOLD');
    expect(script).toContain('blocked_pending_openai_tts_generation_and_checksum');
    expect(script).toContain('blocked_until_full_32_lesson_course_parity');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-integrity-gate-audit-v1');
    expect(audit.status).toBe('PASS_INTEGRITY_WITH_AUDIO_HOLD');
    expect(audit.blockers).toEqual([]);
    expect(audit.studyTarget).toBe('fr');
    expect(audit.targetContentLang).toBe('fr');
    expect(audit.lessonId).toBe(1);
    expect(audit.appCourseLevel).toBe('A1');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);

    expect(audit.inputs.ruPack.path).toBe('docs/gustav/generated/fr/materialized/lesson01/fr_lesson01_ru_pack_candidate_v1.json');
    expect(audit.inputs.ukPack.path).toBe('docs/gustav/generated/fr/materialized/lesson01/fr_lesson01_uk_pack_candidate_v1.json');
    expect(audit.inputs.theory.path).toBe('docs/gustav/generated/fr/materialized/lesson01/fr_lesson01_theory_candidate_v1.json');
    expect(audit.inputs.audioManifest.path).toBe('docs/gustav/generated/fr/audio/lesson01/fr_lesson01_audio_tts_manifest_v1.json');
    for (const input of Object.values(audit.inputs) as Array<{ sha256: string }>) {
      expect(input.sha256).toMatch(/^[a-f0-9]{64}$/);
    }

    expect(audit.summary).toMatchObject({
      ruRows: 50,
      ukRows: 50,
      acceptedReviewDecisions: 50,
      theorySections: 7,
      theoryBlocks: 21,
      audioSlots: 100,
      uniqueAudioPhraseTexts: 50,
      generatedAudioSlots: 0,
      checksumReadySlots: 0,
      structuralIntegrityReady: true,
      readyForAudioGeneration: true,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.productionBlockers).toEqual([
      'blocked_pending_openai_tts_generation_and_checksum',
      'blocked_pending_lesson01_server_pack_manifest_gate',
      'blocked_pending_lesson01_runtime_delivery_gate',
      'blocked_pending_admin_visibility_and_activation_gates',
      'blocked_until_full_32_lesson_course_parity',
    ]);
    expect(audit.safety).toMatchObject({
      readOnlyGate: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('# French Lesson 1 Integrity Gate');
    expect(markdown).toContain('Status: PASS_INTEGRITY_WITH_AUDIO_HOLD');
    expect(markdown).toContain('- blocked_pending_openai_tts_generation_and_checksum');
  });
});
