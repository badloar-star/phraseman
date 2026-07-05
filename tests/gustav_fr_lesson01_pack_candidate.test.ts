import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RU_PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_uk_pack_candidate_v1.json');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_pack_candidate_contract_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_pack_candidate_audit_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_pack_candidate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_pack_candidate.mjs');

describe('Gustav French lesson 1 pack candidate materialization', () => {
  it('writes RU and UK source-locale pack candidates while keeping server/runtime/apply closed', () => {
    const ruPack = JSON.parse(fs.readFileSync(RU_PACK_PATH, 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(UK_PACK_PATH, 'utf8'));
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('decision gate not ready for materialization contract');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson01-pack-candidate-contract-v1');
    expect(contract.status).toBe('PACK_CANDIDATE_READY_FOR_NEXT_GATES');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.decisionGate.status).toBe('PASS_READY_FOR_MATERIALIZATION_CONTRACT');
    expect(contract.packCandidates.ru.path).toBe('docs/gustav/generated/fr/materialized/lesson01/fr_lesson01_ru_pack_candidate_v1.json');
    expect(contract.packCandidates.uk.path).toBe('docs/gustav/generated/fr/materialized/lesson01/fr_lesson01_uk_pack_candidate_v1.json');
    expect(contract.packCandidates.ru.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(contract.packCandidates.uk.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(contract.nextRequiredGates).toEqual(expect.arrayContaining([
      'lesson01_pack_candidate_integrity_gate',
      'lesson01_audio_tts_manifest_gate',
      'lesson01_server_pack_manifest_gate',
      'lesson01_runtime_delivery_gate',
      'lesson01_activation_gate_after_full_course_parity',
    ]));
    expect(contract.safety).toMatchObject({
      packCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    for (const [sourceLocale, pack] of [['ru', ruPack], ['uk', ukPack]] as const) {
      expect(pack.schemaVersion).toBe('gustav-fr-lesson-pack-candidate-v1');
      expect(pack.status).toBe('PACK_CANDIDATE_HOLD');
      expect(pack.packId).toBe(`fr.${sourceLocale}.lesson01.review_draft_v1_pending`);
      expect(pack.studyTarget).toBe('fr');
      expect(pack.targetContentLang).toBe('fr');
      expect(pack.sourceLocale).toBe(sourceLocale);
      expect(pack.surface).toBe('lesson');
      expect(pack.lessonId).toBe(1);
      expect(pack.appCourseLevel).toBe('A1');
      expect(pack.rows).toHaveLength(50);
      expect(pack.counts).toMatchObject({
        rows: 50,
        wordsFrSlots: 115,
      });
      expect(pack.safety).toMatchObject({
        packCandidateOnly: true,
        appBundleModifiedByThisScript: false,
        serverUploadAllowed: false,
        firebaseUploadAllowed: false,
        runtimeDownloadsEnabled: false,
        productionApplyApproved: false,
        activationApproved: false,
      });

      for (const row of [pack.rows[0], pack.rows[7], pack.rows[31], pack.rows[49]]) {
        expect(row.studyTarget).toBe('fr');
        expect(row.targetContentLang).toBe('fr');
        expect(row.sourceLocale).toBe(sourceLocale);
        expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(row.phraseFr)).toBe(false);
        expect(/[�ÃÐÑÒ]/u.test(row.phraseFr)).toBe(false);
        expect(/[�ÃÐÑÒ]/u.test(row.sourceMeaning)).toBe(false);
        expect(row.wordsFr.length).toBeGreaterThan(0);
        expect(row.reviewDecisionRequestId).toMatch(/^fr\.lesson\.01\.review_draft\.row\.\d{2}\.llm_source_review\.v1$/);
      }
    }

    expect(ruPack.rows[0].sourceMeaning).toBe('Здравствуйте.');
    expect(ukPack.rows[0].sourceMeaning).toBe('Вітаю.');
    expect(ruPack.rows[7].phraseFr).toBe("S'il vous plaît.");
    expect(ukPack.rows[31].phraseFr).toBe("J'habite à Lyon.");
    expect(ruPack.rows[49].phraseFr).toBe('Je suis prêt.');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-pack-candidate-audit-v1');
    expect(audit.status).toBe('PASS_PACK_CANDIDATE_WRITTEN');
    expect(audit.blockers).toEqual([]);
    expect(audit.summary).toMatchObject({
      packCandidates: 2,
      rowsPerPack: 50,
      wordsFrSlotsPerPack: 115,
      readyForNextGates: true,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(markdown).toContain('# French Lesson 1 Pack Candidate');
    expect(markdown).toContain('Status: PASS_PACK_CANDIDATE_WRITTEN');
  });
});
