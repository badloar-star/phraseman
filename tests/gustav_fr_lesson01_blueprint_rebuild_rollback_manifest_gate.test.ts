import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_draft_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_rollback_manifest_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild rollback manifest gate', () => {
  it('drafts source-locale-scoped rollback entries while keeping rollback execution, server mutation, runtime, and activation closed', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('course-packs/fr/uiLocale/');
    expect(script).toContain('course-packs/fr/sourceLocale/');
    expect(script).toContain('course-packs/en/');
    expect(script).toContain('card_packs');
    expect(script).toContain('community_packs');
    expect(script).toContain('rollbackExecutionAllowedNow: false');
    expect(script).toContain('serverDeleteAllowed: false');
    expect(script).toContain('activationApproved: false');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-rollback-manifest-draft-v1');
    expect(manifest.status).toBe('HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.targetContentLang).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.lessonId).toBe(1);
    expect(manifest.sourceArtifacts).toMatchObject({
      payloadHashLockContract: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_v1.json',
      payloadHashLockAudit: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json',
      serverManifest: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json',
    });
    expect(manifest.rollbackPolicy.rollbackScopes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(manifest.rollbackPolicy.deniedRollbackScopes).toEqual(expect.arrayContaining([
      'course-packs/fr/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
      'course-packs/en/',
      'card_packs',
      'community_packs',
    ]));
    expect(manifest.rollbackPolicy).toMatchObject({
      requiresHashLockManifest: true,
      requiresServerUploadEvidence: true,
      requiresRuntimeCacheIntegrityGate: true,
      requiresExplicitActivationReceipt: true,
      rollbackManifestDraftOnly: true,
      rollbackExecutionAllowedNow: false,
      serverDeleteAllowedNow: false,
      serverRestoreAllowedNow: false,
      runtimeCacheInvalidationAllowedNow: false,
      activationApproved: false,
    });

    expect(manifest.entries).toHaveLength(4);
    const expectedPairs = new Set(['ru:lesson', 'ru:audio_metadata', 'uk:lesson', 'uk:audio_metadata']);
    for (const entry of manifest.entries) {
      expectedPairs.delete(`${entry.sourceLocale}:${entry.surface}`);
      expect(entry.studyTarget).toBe('fr');
      expect(entry.targetContentLang).toBe('fr');
      expect(['ru', 'uk']).toContain(entry.sourceLocale);
      expect(['lesson', 'audio_metadata']).toContain(entry.surface);
      expect(entry.lessonId).toBe(1);
      expect(entry.rollbackScope).toBe(`course-packs/fr/${entry.sourceLocale}/`);
      expect(entry.rollbackScope).toMatch(/^course-packs\/fr\/(?:ru|uk)\/$/);
      expect(entry.targetServerPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`)).toBe(true);
      expect(entry.targetServerPath).not.toContain('course-packs/en/');
      expect(entry.targetServerPath).not.toContain('uiLocale');
      expect(entry.targetServerPath).not.toContain('sourceLocale');
      expect(entry.expectedPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.expectedPayloadByteSize).toBeGreaterThan(0);
      expect(entry.serverManifestSha256BeforeUpload).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.payloadHashLockGateAuditSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.remotePreUploadState).toBe('no_upload_evidence_yet');
      expect(entry.rollbackExecutionAllowedNow).toBe(false);
      expect(entry.serverDeleteAllowedNow).toBe(false);
      expect(entry.serverRestoreAllowedNow).toBe(false);
      expect(entry.runtimeCacheInvalidationAllowedNow).toBe(false);
      expect(entry.activationApproved).toBe(false);
      expect(entry.blockers).toEqual(['blocked_pending_hash_lock_manifest_upload_evidence_and_activation_receipt']);
    }
    expect([...expectedPairs]).toEqual([]);

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-rollback-manifest-gate-audit-v1');
    expect(audit.status).toBe('HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(audit.blockers).toEqual(['blocked_pending_hash_lock_manifest_upload_evidence_and_activation_receipt']);
    expect(audit.summary).toMatchObject({
      rollbackEntries: 4,
      rollbackScopes: 2,
      safeRollbackScopes: 2,
      deniedRollbackScopeHits: 0,
      sourceLocaleScopedTargets: 4,
      rollbackExecutionAllowedEntries: 0,
      serverDeleteAllowedEntries: 0,
      serverRestoreAllowedEntries: 0,
      runtimeCacheInvalidationAllowedEntries: 0,
      activationApprovedEntries: 0,
      readyForRollbackExecution: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'HASH_LOCK_MANIFEST_NOT_WRITTEN',
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_CACHE_INTEGRITY_GATE_NOT_READY',
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'ROLLBACK_EXECUTION_CLOSED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      rollbackManifestDraftOnly: true,
      rollbackManifestWrittenByThisScript: true,
      serverDeleteAllowed: false,
      serverRestoreAllowed: false,
      firebaseOrServerMutationStarted: false,
      runtimeCacheInvalidationAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(markdown).toContain('Rollback entries: 4');
    expect(markdown).toContain('Rollback executable entries: 0');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildRollbackManifestStatus).toBe('HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(state.lesson01BlueprintRebuildRollbackManifestGateAudit).toBe('docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildRollbackManifestSummary).toMatchObject({
      rollbackEntries: 4,
      safeRollbackScopes: 2,
      rollbackExecutionAllowedEntries: 0,
      activationApproved: false,
    });
  });
});
