import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const THEORY_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_theory_candidate_v1.json');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_theory_materialization_contract_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_theory_materialization_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_theory_materialization.mjs');

describe('Gustav French lesson 1 theory materialization', () => {
  it('writes a French-native theory candidate with English theory shape and closed production flags', () => {
    const theory = JSON.parse(fs.readFileSync(THEORY_PATH, 'utf8'));
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('app/theory_content_lesson1.ts');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(theory.schemaVersion).toBe('gustav-fr-lesson01-theory-candidate-v1');
    expect(theory.status).toBe('THEORY_CANDIDATE_HOLD');
    expect(theory.studyTarget).toBe('fr');
    expect(theory.targetContentLang).toBe('fr');
    expect(theory.sourceLocales).toEqual(['ru', 'uk']);
    expect(theory.lessonId).toBe(1);
    expect(theory.appCourseLevel).toBe('A1');
    expect(theory.titleRu).toContain('être');
    expect(theory.titleUk).toContain('être');
    expect(theory.englishBlueprintShape.blockKindsPreserved).toEqual(['body', 'formula', 'examples', 'fix', 'tip']);
    expect(theory.sections).toHaveLength(7);

    for (const section of theory.sections) {
      expect(section.num).toMatch(/^\d{2}$/);
      expect(section.titleRu.length).toBeGreaterThan(5);
      expect(section.titleUk.length).toBeGreaterThan(5);
      expect(section.blocks.length).toBeGreaterThanOrEqual(2);
      for (const block of section.blocks) {
        expect(['body', 'formula', 'examples', 'fix', 'tip']).toContain(block.kind);
        if (block.kind === 'examples') {
          expect(block.examples.length).toBeGreaterThan(0);
          for (const example of block.examples) {
            expect(example.fr).toBeTruthy();
            expect(example.ru).toBeTruthy();
            expect(example.uk).toBeTruthy();
            expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(example.fr)).toBe(false);
            expect(/[�ÃÐÑÒ]/u.test(example.fr + example.ru + example.uk)).toBe(false);
          }
        }
      }
    }

    expect(theory.safety).toMatchObject({
      theoryCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(contract.schemaVersion).toBe('gustav-fr-lesson01-theory-materialization-contract-v1');
    expect(contract.status).toBe('THEORY_CANDIDATE_READY_FOR_NEXT_GATES');
    expect(contract.nextRequiredGates).toEqual(expect.arrayContaining([
      'lesson01_theory_runtime_shape_gate',
      'lesson01_theory_source_review_gate',
      'lesson01_theory_server_pack_manifest_gate',
      'lesson01_theory_admin_visibility_gate',
    ]));
    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-theory-materialization-audit-v1');
    expect(audit.status).toBe('PASS_THEORY_CANDIDATE_WRITTEN');
    expect(audit.blockers).toEqual([]);
    expect(audit.summary).toMatchObject({
      sections: 7,
      blocks: 21,
      exampleBlocks: 7,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
  });
});
