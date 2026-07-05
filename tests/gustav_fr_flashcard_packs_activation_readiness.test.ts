import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  '2026-07-04_fr_flashcard_phrase_packs_v1',
  'build',
);
const workflow = require('../admin/french-flashcard-packs-workflow.js');

function readJson(name: string) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, name), 'utf8'));
}

beforeAll(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gustav_build_fr_flashcard_phrase_packs_v1.mjs')], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gustav_build_fr_flashcard_packs_activation_readiness.mjs')], {
    cwd: ROOT,
    stdio: 'pipe',
  });
});

describe('Gustav French flashcard packs activation readiness', () => {
  it('keeps the admin workflow in Content with one primary CTA and guarded write actions', () => {
    const definition = workflow.WORKFLOW_DEFINITION;
    const writingActions = definition.actions.filter((action: { writes: boolean }) => action.writes);

    expect(definition.category).toBe('Content');
    expect(definition.routeId).toBe('content.frenchFlashcardPacks');
    expect(definition.activationApproved).toBe(false);
    expect(definition.actions.filter((action: { type: string }) => action.type === 'primary')).toHaveLength(1);
    expect(definition.panels).toEqual(['status', 'preview', 'sourceReview', 'publishDraft', 'rollback']);
    for (const action of writingActions) {
      expect(action.requiresConfirm).toBe(true);
      expect(action.auditLog).toBe(true);
      expect(action.permission).toMatch(/^content_/);
    }
  });

  it('builds RU and UK previews from the accepted French flashcard pack shape', () => {
    const candidate = readJson('fr_flashcard_phrase_pack_candidates.json');
    const pack = candidate.packs[0];
    const ruPreview = workflow.buildPackPreview(pack, 'ru');
    const ukPreview = workflow.buildPackPreview(pack, 'uk');

    expect(ruPreview).toMatchObject({
      id: pack.id,
      sourceLocale: 'ru',
      studyTarget: 'fr',
      title: pack.titleRu,
      description: pack.descriptionRu,
      cardCount: 20,
      activationApproved: false,
    });
    expect(ukPreview).toMatchObject({
      id: pack.id,
      sourceLocale: 'uk',
      title: pack.titleUk,
      description: pack.descriptionUk,
      cardCount: 20,
    });
    expect(ruPreview.cards[0]).toMatchObject({
      targetText: expect.any(String),
      meaning: expect.any(String),
      sourceEvidence: expect.arrayContaining([
        expect.objectContaining({ url: expect.stringMatching(/^https:\/\//), verified: true }),
      ]),
    });
  });

  it('creates publication, approval, rollback and disable drafts without approving activation', () => {
    const finalGate = readJson('fr_flashcard_packs_activation_readiness_final_gate.json');
    expect(workflow.buildStatusModel({ finalGate })).toMatchObject({
      productionReady: true,
      activationApproved: false,
      status: 'READY_FOR_ADMIN_DRAFT',
      blockedGates: [],
    });

    const draft = workflow.createPublicationDraft({
      evidence: { finalGate },
      permissions: ['content_publish_draft'],
      owner: 'codex',
      reason: 'French flashcard packs release handoff',
      contentVersion: 'fr_flashcard_phrase_packs_v1.draft',
      sourceLocales: ['ru', 'uk'],
    });
    expect(draft).toMatchObject({
      status: 'draft',
      studyTarget: 'fr',
      surface: 'flashcard',
      section: 'official_marketplace_packs',
      activationApproved: false,
      productionReady: false,
      writePath: 'adminContentDrafts/fr/flashcard-packs/fr_flashcard_phrase_packs_v1.draft',
    });

    const approval = workflow.requestActivationApproval({
      evidence: { finalGate },
      permissions: ['content_publish'],
      owner: 'codex',
      reason: 'Ready for explicit activation approval',
      contentVersion: 'fr_flashcard_phrase_packs_v1.draft',
      confirmText: 'REQUEST FRENCH FLASHCARD PACKS ACTIVATION',
    });
    expect(approval).toMatchObject({
      accepted: true,
      activationApproved: false,
      requestPath: 'approvalRequests/content/fr_flashcard_packs/fr_flashcard_phrase_packs_v1.draft',
    });

    const rollback = workflow.createRollbackDraft({
      permissions: ['content_rollback'],
      owner: 'codex',
      reason: 'Revert after failed health check',
      currentContentVersion: 'fr_flashcard_phrase_packs_v1.draft',
      previousContentVersion: 'none',
      confirmText: 'ROLL BACK FRENCH FLASHCARD PACKS',
    });
    const disable = workflow.createDisableDraft({
      permissions: ['content_rollback'],
      owner: 'codex',
      reason: 'Emergency off switch rehearsal',
    });
    expect(rollback).toMatchObject({
      status: 'rollback_draft',
      restoreManifestPointer: true,
      deleteHistoricalPayloads: false,
      activationApproved: false,
      productionReady: false,
    });
    expect(disable).toMatchObject({
      status: 'disable_draft',
      enabled: false,
      activationApproved: false,
      productionReady: false,
      writePath: 'remoteConfig/studyTarget/fr/flashcard/official_marketplace_packs_enabled',
    });
  });

  it('writes a production-ready activation handoff while keeping explicit approval and live upload closed', () => {
    const finalGate = readJson('fr_flashcard_packs_activation_readiness_final_gate.json');
    const runtimeEvidence = readJson('fr_flashcard_packs_runtime_activation_evidence.json');
    const adminHandoff = readJson('fr_flashcard_packs_admin_activation_handoff.json');

    expect(finalGate).toMatchObject({
      productionReady: true,
      activationApproved: false,
      liveUploadPerformed: false,
      status: 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL',
    });
    expect(finalGate.gates.every((gate: { status: string }) => gate.status === 'PASS')).toBe(true);
    expect(finalGate.holdGates).toEqual(['explicitActivationApproval', 'liveFirebaseUploadExecution']);

    expect(runtimeEvidence).toMatchObject({
      productionReady: true,
      activationApproved: false,
      status: 'PASS',
      cacheScope: 'flashcards_v2::fr::flashcards_market_built_cards_v1',
    });
    expect(runtimeEvidence.payloads).toHaveLength(2);
    expect(runtimeEvidence.payloads.every((payload: { packCount: number; cardCount: number; payloadKind: string }) =>
      payload.packCount === 5 &&
      payload.cardCount === 100 &&
      payload.payloadKind === 'official_marketplace_packs'
    )).toBe(true);

    expect(adminHandoff).toMatchObject({
      productionReady: true,
      activationApproved: false,
      workflowRouteId: 'content.frenchFlashcardPacks',
      adminSurface: 'admin/french-flashcard-packs-admin.js',
      workflowHandlers: 'admin/french-flashcard-packs-workflow.js',
      status: 'PASS',
    });
    expect(adminHandoff.governance).toMatchObject({
      status: 'PASS_ROLLBACK_ACTIVATION_GOVERNANCE_READY',
      requiresExplicitActivationApproval: true,
    });
  });

  it('exposes an admin surface module without direct production writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'french-flashcard-packs-admin.js'), 'utf8');

    expect(source).toContain("routeId: 'content.frenchFlashcardPacks'");
    expect(source).toContain("category: 'Content'");
    expect(source).toContain('directProductionWrites: false');
    expect(source).toContain('renderFrenchFlashcardPacksAdmin');
    expect(source).toContain('data-action="createPublicationDraft"');
    expect(source).toContain('data-action="requestActivationApproval"');
    expect(source).toContain('data-action="rollbackPacks"');
  });
});
