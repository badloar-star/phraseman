import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const RU_PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_uk_pack_draft_v1.json');
const CONTRACT_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_contract_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_pack_draft.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild pack draft', () => {
  it('materializes reviewed Lesson 1 into isolated RU/UK pack drafts without server/runtime/apply', () => {
    const ruPack = JSON.parse(fs.readFileSync(RU_PACK_PATH, 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(UK_PACK_PATH, 'utf8'));
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('REVIEW_GATE_NOT_PASS');
    expect(script).toContain('SOURCE_LOCALE_LEAK_IN_TARGET_PHRASE');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-pack-draft-contract-v1');
    expect(contract.status).toBe('PACK_DRAFT_READY_FOR_THEORY_AUDIO_SERVER_GATES');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.reviewGate.status).toBe('PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(contract.packDrafts.ru.path).toBe('docs/gustav/generated/fr/materialized/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_ru_pack_draft_v1.json');
    expect(contract.packDrafts.uk.path).toBe('docs/gustav/generated/fr/materialized/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_uk_pack_draft_v1.json');
    expect(contract.packDrafts.ru.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(contract.packDrafts.uk.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(contract.nextRequiredGates).toEqual(expect.arrayContaining([
      'lesson01_blueprint_rebuild_theory_pack_gate',
      'lesson01_blueprint_rebuild_audio_tts_manifest_gate',
      'lesson01_blueprint_rebuild_server_pack_manifest_gate',
      'lesson01_blueprint_rebuild_runtime_delivery_gate',
    ]));
    expect(contract.safety).toMatchObject({
      packDraftOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    for (const [sourceLocale, pack] of [['ru', ruPack], ['uk', ukPack]] as const) {
      expect(pack.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-pack-draft-v1');
      expect(pack.status).toBe('PACK_DRAFT_HOLD_REVIEWED_LOCAL_ONLY');
      expect(pack.packId).toBe(`fr.${sourceLocale}.lesson01.blueprint_rebuild_v1.reviewed.pending`);
      expect(pack.studyTarget).toBe('fr');
      expect(pack.targetContentLang).toBe('fr');
      expect(pack.sourceLocale).toBe(sourceLocale);
      expect(pack.lessonId).toBe(1);
      expect(pack.appCourseLevel).toBe('A1');
      expect(pack.rows).toHaveLength(50);
      expect(pack.counts).toMatchObject({
        rows: 50,
        wordsFrSlots: 157,
        distractorSlots: 785,
      });
      expect(pack.safety).toMatchObject({
        packDraftOnly: true,
        appBundleModifiedByThisScript: false,
        serverUploadAllowed: false,
        firebaseUploadAllowed: false,
        runtimeDownloadsEnabled: false,
        productionApplyApproved: false,
        activationApproved: false,
      });

      for (const row of [pack.rows[0], pack.rows[20], pack.rows[31], pack.rows[49]]) {
        expect(row.studyTarget).toBe('fr');
        expect(row.targetContentLang).toBe('fr');
        expect(row.sourceLocale).toBe(sourceLocale);
        expect(row.reviewDecision).toBe('ACCEPT');
        expect(row.acceptedForProduction).toBe(false);
        expect(/[А-Яа-яЁёІіЇїЄєҐґ]/u.test(row.phraseFr)).toBe(false);
        expect(/[ï¿½ÃƒÃÃ‘Ã’]/u.test(row.phraseFr)).toBe(false);
        expect(row.wordsFr.length).toBeGreaterThanOrEqual(3);
      }
    }

    expect(ruPack.rows[0].phraseFr).toBe('Je suis ici.');
    expect(ruPack.rows[0].sourceMeaning).toBe('Я здесь.');
    expect(ukPack.rows[0].sourceMeaning).toBe('Я тут.');
    expect(ruPack.rows[20].phraseFr).toBe("Je suis à l'intérieur.");
    expect(ruPack.rows[31].phraseFr).toBe("C'est facile.");
    expect(ukPack.rows[49].phraseFr).toBe("C'est possible.");

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-pack-draft-audit-v1');
    expect(audit.status).toBe('PASS_PACK_DRAFT_WRITTEN');
    expect(audit.blockers).toEqual([]);
    expect(audit.summary).toMatchObject({
      packDrafts: 2,
      rowsPerPack: 50,
      wordsFrSlotsPerPack: 157,
      distractorSlotsPerPack: 785,
      readyForTheoryAudioServerGates: true,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'THEORY_PACK_NOT_MATERIALIZED',
      'AUDIO_TTS_NOT_GENERATED',
      'SERVER_UPLOAD_NOT_ALLOWED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));

    expect(markdown).toContain('# French Lesson 1 Blueprint Rebuild Pack Draft');
    expect(markdown).toContain('Status: PASS_PACK_DRAFT_WRITTEN');
    expect(markdown).toContain('Je suis ici.');

    expect(state.lesson01BlueprintRebuildPackDraftStatus).toBe('PASS_PACK_DRAFT_WRITTEN');
    expect(state.lesson01BlueprintRebuildPackDraftAudit).toBe('docs/gustav/generated/fr/materialized/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
  });
});
