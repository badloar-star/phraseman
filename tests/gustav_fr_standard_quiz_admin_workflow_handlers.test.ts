import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const workflow = require('../admin/french-quizzes-workflow.js');

const RUN_BUILD = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  '2026-07-04_fr_standard_quizzes_production_readiness_v1',
  'build',
);

function readJson(name: string) {
  return JSON.parse(fs.readFileSync(path.join(RUN_BUILD, name), 'utf8'));
}

describe('Gustav French standard quiz admin workflow handlers', () => {
  it('keeps the workflow inside Content with one primary CTA and guarded writing actions', () => {
    const definition = workflow.WORKFLOW_DEFINITION;
    const writingActions = definition.actions.filter((action: { writes: boolean }) => action.writes);

    expect(definition.category).toBe('Content');
    expect(definition.routeId).toBe('content.frenchQuizzes');
    expect(definition.activationApproved).toBe(false);
    expect(definition.actions.filter((action: { type: string }) => action.type === 'primary')).toHaveLength(1);
    expect(definition.panels).toEqual(['status', 'preview', 'validation', 'publishDraft', 'rollback']);
    for (const action of writingActions) {
      expect(action.requiresConfirm).toBe(true);
      expect(action.auditLog).toBe(true);
      expect(action.permission).toMatch(/^content_/);
    }
  });

  it('builds a row preview that preserves four choices, correct index, explanations, and source evidence', () => {
    const payload = readJson('fr_standard_quizzes_runtime_payload_ru.dryrun.json');
    const preview = workflow.buildRowPreview(payload.entries[0], 'ru');

    expect(preview.sourceLocale).toBe('ru');
    expect(preview.prompt).toBe(payload.entries[0].sourcePrompt_ru);
    expect(preview.choices).toEqual(payload.entries[0].choices);
    expect(preview.correct).toBe(payload.entries[0].correct);
    expect(preview.answer).toBe(payload.entries[0].answer);
    expect(preview.explanations).toEqual(payload.entries[0].explanations_ru);
    expect(preview.sourceEvidence.length).toBeGreaterThan(0);
  });

  it('creates a guarded publication draft when upstream gates pass without approving activation', () => {
    const finalGate = readJson('fr_standard_quizzes_production_final_gate.json');
    const progress = readJson('fr_standard_quizzes_production_progress_report.json');

    expect(workflow.buildStatusModel({ finalGate, progress })).toMatchObject({
      productionReady: false,
      activationApproved: false,
      status: 'READY_FOR_ADMIN_DRAFT',
    });
    const draft = workflow.createPublicationDraft({
      evidence: { finalGate, progress },
      permissions: ['content_publish_draft'],
      owner: 'codex',
      reason: 'French standard quizzes release rehearsal',
      contentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      sourceLocales: ['ru', 'uk'],
    });
    expect(draft).toMatchObject({
      status: 'draft',
      studyTarget: 'fr',
      surface: 'quiz',
      section: 'standard',
      activationApproved: false,
      productionReady: false,
      writePath: 'adminContentDrafts/fr/quiz/2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
    });
  });

  it('creates rollback and disable drafts without approving activation or deleting payload history', () => {
    const rollback = workflow.createRollbackDraft({
      permissions: ['content_rollback'],
      owner: 'codex',
      reason: 'Revert French quiz pack after failed health check',
      currentContentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      previousContentVersion: '2026.06.26.2026-05-19_fr_inventory_v0a1.draft',
      confirmText: 'ROLL BACK FRENCH QUIZZES',
    });
    const disable = workflow.createDisableDraft({
      permissions: ['content_rollback'],
      owner: 'codex',
      reason: 'Emergency off switch rehearsal',
    });

    expect(rollback).toMatchObject({
      status: 'rollback_draft',
      activationApproved: false,
      productionReady: false,
      restoreManifestPointer: true,
      deleteHistoricalPayloads: false,
    });
    expect(disable).toMatchObject({
      status: 'disable_draft',
      enabled: false,
      activationApproved: false,
      productionReady: false,
    });
  });

  it('passes rollback activation governance only as an explicit approval-ready request', () => {
    const finalGate = readJson('fr_standard_quizzes_production_final_gate.json');
    const approvalReadyGate = {
      ...finalGate,
      gates: finalGate.gates.map((gate: { gateId: string }) => (
        gate.gateId === 'rollback_activation_governance'
          ? { ...gate, status: 'PASS', blocker: undefined }
          : gate
      )),
    };
    const publicationDraft = workflow.createPublicationDraft({
      evidence: { finalGate: approvalReadyGate },
      permissions: ['content_publish_draft'],
      owner: 'codex',
      reason: 'French standard quizzes release rehearsal',
      contentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      sourceLocales: ['ru', 'uk'],
    });
    const rollbackDraft = workflow.createRollbackDraft({
      permissions: ['content_rollback'],
      owner: 'codex',
      reason: 'Revert French quiz pack after failed health check',
      currentContentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      previousContentVersion: '2026.06.26.2026-05-19_fr_inventory_v0a1.draft',
      confirmText: 'ROLL BACK FRENCH QUIZZES',
    });
    const approvalRequest = workflow.requestActivationApproval({
      evidence: { finalGate: approvalReadyGate },
      permissions: ['content_publish'],
      owner: 'codex',
      reason: 'Request explicit activation review',
      contentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      confirmText: 'REQUEST FRENCH QUIZ ACTIVATION',
    });

    expect(approvalRequest).toMatchObject({
      accepted: true,
      activationApproved: false,
      requestPath: 'approvalRequests/content/fr_quiz/2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
    });

    expect(workflow.validateRollbackActivationGovernance({
      finalGate: approvalReadyGate,
      publicationDraft,
      rollbackDraft,
      approvalRequest,
    })).toMatchObject({
      status: 'PASS_ROLLBACK_ACTIVATION_GOVERNANCE_READY',
      productionReady: true,
      activationApproved: false,
      blockers: [],
      rollbackMode: 'restore_previous_manifest_pointer',
      deleteHistoricalPayloads: false,
      requiresExplicitActivationApproval: true,
    });
  });

  it('refuses activation approval when rollback activation governance is still HOLD', () => {
    const currentGate = readJson('fr_standard_quizzes_production_final_gate.json');
    const finalGate = {
      ...currentGate,
      gates: currentGate.gates.map((gate: { gateId: string }) => (
        gate.gateId === 'rollback_activation_governance'
          ? { ...gate, status: 'HOLD', blocker: 'HOLD_ADMIN_ROLLBACK_WORKFLOW_REQUIRED' }
          : gate
      )),
    };
    const response = workflow.requestActivationApproval({
      evidence: { finalGate },
      permissions: ['content_publish'],
      owner: 'codex',
      reason: 'Should still be blocked',
      contentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      confirmText: 'REQUEST FRENCH QUIZ ACTIVATION',
    });

    expect(response.accepted).toBe(false);
    expect(response.activationApproved).toBe(false);
    expect(response.blockedGates.map((gate: { gateId: string }) => gate.gateId)).toEqual([
      'rollback_activation_governance',
    ]);
  });

  it('allows an approval request from the current ready gate without approving activation', () => {
    const finalGate = readJson('fr_standard_quizzes_production_final_gate.json');
    expect(finalGate.status).toBe('READY_FOR_EXPLICIT_ACTIVATION_APPROVAL');
    expect(finalGate.productionReady).toBe(true);
    expect(finalGate.activationApproved).toBe(false);

    const response = workflow.requestActivationApproval({
      evidence: { finalGate },
      permissions: ['content_publish'],
      owner: 'codex',
      reason: 'Ready for explicit activation review',
      contentVersion: '2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
      confirmText: 'REQUEST FRENCH QUIZ ACTIVATION',
    });

    expect(response).toMatchObject({
      accepted: true,
      activationApproved: false,
      requestPath: 'approvalRequests/content/fr_quiz/2026-07-04_fr_standard_quizzes_quality_candidate_v1.draft',
    });
  });
});
