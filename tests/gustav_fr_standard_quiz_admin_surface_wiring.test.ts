import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const adminIndexPath = path.join(repoRoot, 'admin', 'v2', 'legacy.html');
const workflowPath = path.join(repoRoot, 'admin', 'french-quizzes-workflow.js');

describe('Gustav French standard quiz admin surface wiring', () => {
  const html = fs.readFileSync(adminIndexPath, 'utf8');
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');
  const workflow = require(workflowPath);

  test('registers French quizzes as a normal admin content tab', () => {
    expect(html).toContain('switchTab(\'french-quizzes\')');
    expect(html).toContain('id="tab-french-quizzes"');
    expect(html).toContain('data-gustav-admin-surface="french-standard-quizzes"');
    expect(html).toContain('french-quizzes-workflow.js');
    expect(html).toContain("'daily-phrases','french-quizzes','push-notify'");
    expect(html).toContain("'french-quizzes': 'French quizzes'");
    expect(html).toContain("'french-quizzes': 'clipboard'");
    expect(html).toContain("'french-quizzes': 'community'");
  });

  test('wires expected preview, draft, approval, and rollback handlers', () => {
    expect(html).toContain('renderFrenchQuizzesAdmin');
    expect(html).toContain('frenchQuizAdminCreateDraft');
    expect(html).toContain('frenchQuizAdminRequestApproval');
    expect(html).toContain('frenchQuizAdminCreateRollback');
    expect(html).toContain('Create publication draft');
    expect(html).toContain('Rollback draft');
    expect(html).toContain('Check activation approval');
  });

  test('uses guarded Firestore draft writes with admin audit logging', () => {
    expect(html).toContain('frenchQuizAdminCommitDraft');
    expect(html).toContain('writeBatch(db)');
    expect(html).toContain("collection(db, 'admin_log')");
    expect(html).toContain('french_quiz_publication_draft');
    expect(html).toContain('french_quiz_rollback_draft');
    expect(workflowSource).toContain('adminContentDrafts/fr/quiz/');
    expect(workflowSource).toContain('adminContentRollbacks/fr/quiz/');
  });

  test('keeps activation closed in admin surface and workflow', () => {
    expect(html).toContain('activationApproved=false');
    expect(html).toContain('activationApproved: false');
    expect(html).not.toContain('activationApproved=true');
    expect(html).not.toContain('activationApproved: true');
    expect(workflow.WORKFLOW_DEFINITION.activationApproved).toBe(false);
  });

  test('approval request remains blocked while final production gates hold', () => {
    const finalGate = {
      gates: [
        { gateId: 'content_hard_audit', status: 'PASS' },
        { gateId: 'semantic_smell_audit', status: 'PASS' },
        { gateId: 'llm_review_decisions', status: 'PASS' },
        { gateId: 'runtime_full_sentence_adapter', status: 'PASS' },
        { gateId: 'server_pack_dryrun_validation', status: 'PASS' },
        { gateId: 'server_pack_upload_rehearsal', status: 'PASS' },
        { gateId: 'rollback_runtime_off_switch', status: 'PASS' },
        { gateId: 'admin_workflow_map', status: 'PASS' },
        { gateId: 'admin_workflow_handlers', status: 'PASS' },
        { gateId: 'admin_surface_wiring', status: 'PASS' },
        { gateId: 'admin_preview_publish_rollback', status: 'HOLD' },
        { gateId: 'rollback_activation_governance', status: 'HOLD' },
      ],
    };

    const result = workflow.requestActivationApproval({
      evidence: { finalGate },
      permissions: ['content_publish'],
      owner: 'admin-ui',
      reason: 'contract test',
      contentVersion: 'fr-standard-quizzes-2026-07-04-candidate-v1',
      confirmText: 'REQUEST FRENCH QUIZ ACTIVATION',
    });

    expect(result.accepted).toBe(false);
    expect(result.activationApproved).toBe(false);
    expect(result.blockedGates.map((gate: { gateId: string }) => gate.gateId)).toEqual([
      'admin_preview_publish_rollback',
      'rollback_activation_governance',
    ]);
  });
});
