import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', '2026-07-04_fr_daily_phrases_production_v1');

function readJson<T = any>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(RUN_DIR, relativePath), 'utf8'));
}

describe('Gustav French Daily Phrases production v1 gate', () => {
  it('keeps the spec locked to French-native idioms and English Daily Phrase shape parity', () => {
    const spec = fs.readFileSync(path.join(ROOT, 'specs', 'gustav-french-daily-phrases-production.md'), 'utf8');

    expect(spec).toContain('French-native idiom/expression bank');
    expect(spec).toContain('at least 176 French-native idiom/expression rows are accepted');
    expect(spec).toContain('The existing `fr-daily-*` flashcard bridge is a temporary target-aware runtime path');
    expect(spec).toContain('Do not mix English as a teaching language inside French rows');
  });

  it('accepts a source-backed 176-row French idiom/expression subset without activating it', () => {
    const bank = readJson('build/fr_daily_phrase_bank.json');
    const sourceEvidence = readJson('build/fr_daily_phrase_source_evidence.json');
    const duplicateAudit = readJson('build/fr_daily_phrase_duplicate_audit.json');

    expect(bank.studyTarget).toBe('fr');
    expect(bank.activationApproved).toBe(false);
    expect(bank.requiredCountParityWithEnglish).toBe(176);
    expect(bank.rows).toHaveLength(176);
    expect(bank.status).toBe('CONTENT_BANK_READY_FOR_RUNTIME_ADMIN_REVIEW');

    for (const row of bank.rows) {
      expect(row).toMatchObject({
        studyTarget: 'fr',
        targetContentLang: 'fr',
        allowSave: true,
        active: false,
        activationApproved: false,
      });
      expect(row.targetText).toBeTruthy();
      expect(row.english).toBe(row.targetText);
      expect(row.literal).toBeTruthy();
      expect(row.meaning).toBeTruthy();
      expect(row.text).toBeTruthy();
      expect(row.literal_uk).toBeTruthy();
      expect(row.meaning_uk).toBeTruthy();
      expect(row.text_uk).toBeTruthy();
      expect(row.sourceEvidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'PASS',
            sourceId: expect.any(String),
            sourceUrl: expect.stringMatching(/^https:\/\//),
            checkedAt: expect.any(String),
          }),
        ]),
      );
      expect(`${row.text} ${row.text_uk} ${row.meaning} ${row.meaning_uk}`).not.toMatch(/\bEnglish\b|английск|англійськ/i);
      expect(`${row.text} ${row.text_uk} ${row.meaning} ${row.meaning_uk}`).not.toMatch(/Ð|Ñ|�/);
    }

    expect(sourceEvidence.status).toBe('PASS');
    expect(sourceEvidence.acceptedRows).toBe(176);
    expect(sourceEvidence.strictSourceBackedRows).toBeGreaterThanOrEqual(176);
    expect(duplicateAudit.status).toBe('PASS');
    expect(duplicateAudit.duplicateCount).toBe(0);
  });

  it('blocks production activation until runtime, server upload rehearsal, and admin workflow are wired', () => {
    const finalGate = readJson('build/fr_daily_phrase_final_gate.json');
    const runtimeManifest = readJson('build/fr_daily_phrase_runtime_manifest.json');
    const serverPackManifest = readJson('build/fr_daily_phrase_server_pack_manifest.json');
    const rollbackManifest = readJson('build/fr_daily_phrase_activation_rollback_manifest.json');
    const adminWorkflowManifest = readJson('build/fr_daily_phrase_admin_workflow_manifest.json');

    expect(finalGate.contentBankReady).toBe(true);
    expect(finalGate.productionReady).toBe(true);
    expect(finalGate.activationApproved).toBe(false);
    expect(finalGate.status).toBe('READY_FOR_EXPLICIT_ACTIVATION_APPROVAL');
    expect(finalGate.gates).toMatchObject({
      englishBlueprintParity: 'PASS',
      frenchNativeIdiomRows: 'PASS',
      sourceEvidencePerAcceptedRow: 'PASS',
      duplicateAudit: 'PASS',
      ruUkCopyIntegrity: 'PASS',
      runtimeTargetIsolation: 'PASS',
      serverPackManifest: 'PASS',
      adminWorkflowHandlers: 'PASS',
      adminSurfaceWiring: 'PASS',
      activationRollback: 'PASS',
      activationClosed: 'PASS',
    });
    expect(finalGate.holdGates).toEqual([]);

    expect(runtimeManifest.status).toBe('PASS_RUNTIME_WIRED_WITH_FLASHCARD_ROLLBACK');
    expect(runtimeManifest.runtimeWired).toBe(true);
    expect(runtimeManifest.requiredRuntimeChange.join('\n')).toContain('Do not read English IDIOMS');
    expect(serverPackManifest.uploadPerformed).toBe(false);
    expect(serverPackManifest.uploadRehearsalPerformed).toBe(true);
    expect(serverPackManifest.status).toBe('PASS_UPLOAD_REHEARSAL_READY_NOT_UPLOADED');
    expect(serverPackManifest.targetScoped).toBe(true);
    expect(serverPackManifest.entries).toHaveLength(2);
    expect(serverPackManifest.entries.map((entry: { sourceLocale: string }) => entry.sourceLocale).sort()).toEqual(['ru', 'uk']);
    for (const entry of serverPackManifest.entries) {
      expect(entry.serverPath).toMatch(/^course-packs\/fr\/(ru|uk)\/daily_phrase\/2026-07-04_fr_daily_phrases_production_v1\/[a-f0-9]{64}\.json$/);
      expect(entry.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(rollbackManifest.rollbackBaseline).toBe('existing fr-daily flashcard bridge');
    expect(adminWorkflowManifest.status).toBe('PASS_ADMIN_WORKFLOW_AND_SURFACE_WIRED');
    expect(adminWorkflowManifest.workflowHandlersPresent).toBe(true);
    expect(adminWorkflowManifest.adminSurfaceWired).toBe(true);
  });
});
