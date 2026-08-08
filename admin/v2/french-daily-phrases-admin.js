/* eslint-disable */
(function initFrenchDailyPhrasesAdmin(root) {
  const EVIDENCE = Object.freeze({
    finalGate: Object.freeze({
      status: 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL',
      productionReady: true,
      contentBankReady: true,
      activationApproved: false,
      gates: Object.freeze({
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
      }),
      holdGates: Object.freeze([]),
    }),
  });

  const SAMPLE_ROW = Object.freeze({
    id: 'fr-daily-idiom-001',
    order: 1,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    targetText: 'Avoir le cafard',
    english: 'Avoir le cafard',
    literal: 'Иметь таракана.',
    meaning: 'Хандрить, быть в унынии.',
    text: 'Дословная картинка цепляет: иметь таракана. Во французском это живое разговорное выражение про уныние или хандру.',
    literal_uk: 'Мати таргана.',
    meaning_uk: 'Хандрити, бути в пригніченому настрої.',
    text_uk: 'Дослівна картинка чіпляє: мати таргана. У французькій це живий розмовний вираз про пригнічений настрій.',
    sourceLocales: Object.freeze(['ru', 'uk']),
    allowSave: true,
    active: false,
    activationApproved: false,
    sourceEvidence: Object.freeze([
      Object.freeze({
        status: 'PASS',
        sourceId: 'le_robert_dictionary',
        sourceName: 'Le Robert',
        sourceUrl: 'https://dictionnaire.lerobert.com/definition/cafard',
        verified: Object.freeze(['existence']),
      }),
    ]),
  });

  function api() {
    return root.PhrasemanFrenchDailyPhrasesWorkflow;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function writeOutput(payload) {
    const output = root.document && root.document.getElementById('fdp-output');
    if (!output) return;
    output.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  }

  root.renderFrenchDailyPhrasesAdmin = function renderFrenchDailyPhrasesAdmin() {
    const workflow = api();
    const statusEl = root.document && root.document.getElementById('fdp-status');
    const previewEl = root.document && root.document.getElementById('fdp-preview');
    if (!statusEl || !previewEl) return;
    if (!workflow) {
      statusEl.innerHTML = '<div class="reports-empty">French Daily Phrase workflow module is not loaded.</div>';
      writeOutput({ status: 'HOLD', activationApproved: false, error: 'workflow_module_missing' });
      return;
    }

    const status = workflow.buildStatusModel(EVIDENCE);
    const gateRows = Object.entries(EVIDENCE.finalGate.gates).map(([gateId, gateStatus]) => {
      const color = gateStatus === 'PASS' ? '#4ade80' : '#fbbf24';
      return `<div style="display:flex;gap:10px;align-items:flex-start;border-bottom:1px solid #242838;padding:7px 0">
        <strong style="width:58px;color:${color}">${escapeHtml(gateStatus)}</strong>
        <span style="color:#e5e7eb">${escapeHtml(gateId)}</span>
      </div>`;
    }).join('');

    statusEl.innerHTML = `<div class="report-card" style="max-width:1180px;margin:0;border-radius:8px">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px">
        <strong style="color:#fff">French Daily Phrases: ${escapeHtml(status.status)}</strong>
        <span style="color:#aaa">Rows: 176</span>
        <span style="color:#aaa">Surface: daily_phrase</span>
        <span style="color:#fbbf24">Production ready: true</span>
        <span style="color:#fbbf24">Activation approved: false</span>
      </div>
      ${gateRows}
    </div>`;

    const preview = workflow.buildRowPreview(SAMPLE_ROW, 'ru');
    previewEl.innerHTML = `<div class="report-card" style="max-width:1180px;margin:0;border-radius:8px">
      <strong style="color:#fff">French preview row</strong>
      <div style="margin-top:8px;color:#ddd;font-weight:800">${escapeHtml(preview.targetText)}</div>
      <div style="margin-top:8px;color:#bbb">Literal: ${escapeHtml(preview.literal)}</div>
      <div style="margin-top:6px;color:#ddd">Meaning: ${escapeHtml(preview.meaning)}</div>
      <div style="margin-top:8px;color:#aaa;line-height:1.55">${escapeHtml(preview.text)}</div>
      <div style="margin-top:10px;color:#999">Evidence: ${escapeHtml((preview.sourceEvidence[0] && preview.sourceEvidence[0].sourceName) || 'source evidence required')}</div>
    </div>`;

    writeOutput({
      status: status.status,
      productionReady: true,
      activationApproved: false,
      blockedGates: status.blockedGates,
    });
  };

  root.frenchDailyPhraseAdminCreateDraft = function frenchDailyPhraseAdminCreateDraft() {
    const workflow = api();
    if (!workflow) return writeOutput({ status: 'HOLD', error: 'workflow_module_missing', activationApproved: false });
    try {
      const draft = workflow.createPublicationDraft({
        evidence: EVIDENCE,
        permissions: ['content_publish_draft'],
        owner: 'admin-ui',
        reason: 'French Daily Phrase production-readiness draft review.',
        contentVersion: '2026-07-04_fr_daily_phrases_production_v1',
        rolloutPercent: 0,
      });
      writeOutput({ ...draft, activationApproved: false });
    } catch (error) {
      writeOutput({ status: 'HOLD', activationApproved: false, error: error && error.message ? error.message : String(error) });
    }
  };

  root.frenchDailyPhraseAdminRequestApproval = function frenchDailyPhraseAdminRequestApproval() {
    const workflow = api();
    if (!workflow) return writeOutput({ status: 'HOLD', error: 'workflow_module_missing', activationApproved: false });
    try {
      const result = workflow.requestActivationApproval({
        evidence: EVIDENCE,
        permissions: ['content_publish'],
        owner: 'admin-ui',
        reason: 'Check whether French Daily Phrase activation can be requested.',
        contentVersion: '2026-07-04_fr_daily_phrases_production_v1',
        confirmText: 'REQUEST FRENCH DAILY PHRASES ACTIVATION',
      });
      writeOutput({ ...result, activationApproved: false });
    } catch (error) {
      writeOutput({ status: 'HOLD', activationApproved: false, error: error && error.message ? error.message : String(error) });
    }
  };

  root.frenchDailyPhraseAdminCreateRollback = function frenchDailyPhraseAdminCreateRollback() {
    const workflow = api();
    if (!workflow) return writeOutput({ status: 'HOLD', error: 'workflow_module_missing', activationApproved: false });
    try {
      const draft = workflow.createRollbackDraft({
        permissions: ['content_rollback'],
        owner: 'admin-ui',
        reason: 'French Daily Phrase rollback rehearsal.',
        currentContentVersion: '2026-07-04_fr_daily_phrases_production_v1',
        previousContentVersion: 'fr-daily-flashcard-bridge',
        confirmText: 'ROLL BACK FRENCH DAILY PHRASES',
      });
      writeOutput({ ...draft, activationApproved: false });
    } catch (error) {
      writeOutput({ status: 'HOLD', activationApproved: false, error: error && error.message ? error.message : String(error) });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
