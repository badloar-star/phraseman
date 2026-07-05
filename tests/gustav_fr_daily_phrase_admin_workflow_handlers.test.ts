import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RUN_BUILD = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  '2026-07-04_fr_daily_phrases_production_v1',
  'build',
);
const workflow = require('../admin/french-daily-phrases-workflow.js');

function readJson(name: string) {
  return JSON.parse(fs.readFileSync(path.join(RUN_BUILD, name), 'utf8'));
}

describe('Gustav French Daily Phrases admin workflow handlers', () => {
  it('keeps the workflow in Content with one primary CTA and guarded write actions', () => {
    const definition = workflow.WORKFLOW_DEFINITION;
    const writingActions = definition.actions.filter((action: { writes: boolean }) => action.writes);

    expect(definition.category).toBe('Content');
    expect(definition.routeId).toBe('content.frenchDailyPhrases');
    expect(definition.activationApproved).toBe(false);
    expect(definition.actions.filter((action: { type: string }) => action.type === 'primary')).toHaveLength(1);
    expect(definition.panels).toEqual(['status', 'preview', 'sourceReview', 'publishDraft', 'rollback']);
    for (const action of writingActions) {
      expect(action.requiresConfirm).toBe(true);
      expect(action.auditLog).toBe(true);
      expect(action.permission).toMatch(/^content_/);
    }
  });

  it('builds RU and UK previews from the accepted French Daily Phrase row shape', () => {
    const bank = readJson('fr_daily_phrase_bank.json');
    const row = bank.rows[0];
    const ruPreview = workflow.buildRowPreview(row, 'ru');
    const ukPreview = workflow.buildRowPreview(row, 'uk');

    expect(ruPreview).toMatchObject({
      id: row.id,
      sourceLocale: 'ru',
      targetText: row.targetText,
      literal: row.literal,
      meaning: row.meaning,
      text: row.text,
      active: false,
      activationApproved: false,
    });
    expect(ukPreview).toMatchObject({
      id: row.id,
      sourceLocale: 'uk',
      literal: row.literal_uk,
      meaning: row.meaning_uk,
      text: row.text_uk,
      active: false,
      activationApproved: false,
    });
    expect(ruPreview.sourceEvidence[0]).toMatchObject({
      status: 'PASS',
      sourceUrl: expect.stringMatching(/^https:\/\//),
    });
  });

  it('reports current production state as ready for admin draft while activation remains explicit', () => {
    const finalGate = readJson('fr_daily_phrase_final_gate.json');

    expect(workflow.buildStatusModel({ finalGate })).toMatchObject({
      productionReady: false,
      activationApproved: false,
      contentBankReady: true,
      status: 'READY_FOR_ADMIN_DRAFT',
    });
    expect(workflow.buildStatusModel({ finalGate }).blockedGates).toEqual([]);
  });

  it('creates a publication draft and approval request without approving activation', () => {
    const finalGate = readJson('fr_daily_phrase_final_gate.json');

    const draft = workflow.createPublicationDraft({
      evidence: { finalGate },
      permissions: ['content_publish_draft'],
      owner: 'codex',
      reason: 'French Daily Phrases release rehearsal',
      contentVersion: '2026-07-04_fr_daily_phrases_production_v1',
    });
    expect(draft).toMatchObject({
      status: 'draft',
      studyTarget: 'fr',
      surface: 'daily_phrase',
      activationApproved: false,
      productionReady: false,
      writePath: 'adminContentDrafts/fr/daily-phrases/2026-07-04_fr_daily_phrases_production_v1',
    });

    const response = workflow.requestActivationApproval({
      evidence: { finalGate },
      permissions: ['content_publish'],
      owner: 'codex',
      reason: 'Ready for explicit activation approval',
      contentVersion: '2026-07-04_fr_daily_phrases_production_v1',
      confirmText: 'REQUEST FRENCH DAILY PHRASES ACTIVATION',
    });

    expect(response.accepted).toBe(true);
    expect(response.activationApproved).toBe(false);
    expect(response.requestPath).toBe('approvalRequests/content/fr_daily_phrases/2026-07-04_fr_daily_phrases_production_v1');
  });

  it('creates rollback and disable drafts without approving activation', () => {
    const rollback = workflow.createRollbackDraft({
      permissions: ['content_rollback'],
      owner: 'codex',
      reason: 'Revert French Daily Phrase pack after failed health check',
      currentContentVersion: '2026-07-04_fr_daily_phrases_production_v1',
      previousContentVersion: 'fr-daily-flashcard-bridge',
      confirmText: 'ROLL BACK FRENCH DAILY PHRASES',
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
      writePath: 'adminContentRollbacks/fr/daily-phrases/2026-07-04_fr_daily_phrases_production_v1',
    });
    expect(disable).toMatchObject({
      status: 'disable_draft',
      enabled: false,
      activationApproved: false,
      productionReady: false,
      writePath: 'remoteConfig/studyTarget/fr/daily_phrase/enabled',
    });
  });
});
