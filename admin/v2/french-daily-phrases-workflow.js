/* eslint-disable */
(function initFrenchDailyPhrasesWorkflow(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.PhrasemanFrenchDailyPhrasesWorkflow = api;
})(typeof window !== 'undefined' ? window : globalThis, function createFrenchDailyPhrasesWorkflowApi() {
  const REQUIRED_READY_GATES = [
    'englishBlueprintParity',
    'frenchNativeIdiomRows',
    'sourceEvidencePerAcceptedRow',
    'duplicateAudit',
    'ruUkCopyIntegrity',
    'runtimeTargetIsolation',
    'serverPackManifest',
    'adminWorkflowHandlers',
    'adminSurfaceWiring',
    'activationRollback',
    'activationClosed',
  ];

  const WORKFLOW_DEFINITION = Object.freeze({
    routeId: 'content.frenchDailyPhrases',
    category: 'Content',
    humanName: 'French Daily Phrases',
    primaryCta: 'Create publication draft',
    activationApproved: false,
    panels: Object.freeze(['status', 'preview', 'sourceReview', 'publishDraft', 'rollback']),
    actions: Object.freeze([
      Object.freeze({ id: 'previewRows', type: 'secondary', writes: false, permission: 'content_read' }),
      Object.freeze({ id: 'validateSourceEvidence', type: 'secondary', writes: false, permission: 'content_read' }),
      Object.freeze({
        id: 'createPublicationDraft',
        type: 'primary',
        writes: true,
        permission: 'content_publish_draft',
        requiresConfirm: true,
        requiresPreview: true,
        auditLog: true,
      }),
      Object.freeze({
        id: 'requestActivationApproval',
        type: 'secondary',
        writes: true,
        permission: 'content_publish',
        requiresConfirm: true,
        requiresPreview: true,
        auditLog: true,
      }),
      Object.freeze({
        id: 'rollbackPack',
        type: 'danger',
        writes: true,
        permission: 'content_rollback',
        requiresConfirm: true,
        requiresPreview: true,
        auditLog: true,
        confirmText: 'ROLL BACK FRENCH DAILY PHRASES',
      }),
      Object.freeze({
        id: 'disableFrenchDailyPhrases',
        type: 'danger',
        writes: true,
        permission: 'content_rollback',
        requiresConfirm: true,
        auditLog: true,
      }),
    ]),
  });

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasPermission(permissions, permission) {
    return asArray(permissions).includes(permission);
  }

  function gateMap(finalGate) {
    const gates = finalGate && finalGate.gates;
    if (gates && !Array.isArray(gates) && typeof gates === 'object') {
      return new Map(Object.entries(gates));
    }
    const map = new Map();
    for (const gate of asArray(gates)) {
      if (gate && typeof gate.gateId === 'string') {
        map.set(gate.gateId, gate.status);
      }
    }
    return map;
  }

  function blockedGates(finalGate, extraRequiredGates) {
    const map = gateMap(finalGate);
    const required = extraRequiredGates || REQUIRED_READY_GATES;
    return required
      .filter((gateId) => map.get(gateId) !== 'PASS')
      .map((gateId) => ({ gateId, status: map.get(gateId) || 'MISSING' }));
  }

  function assertDailyPhraseRow(row) {
    if (!row || row.studyTarget !== 'fr' || row.targetContentLang !== 'fr') {
      throw new Error('Preview row must be a French Daily Phrase row.');
    }
    for (const field of ['targetText', 'literal', 'meaning', 'text', 'literal_uk', 'meaning_uk', 'text_uk']) {
      if (!row[field] || typeof row[field] !== 'string') {
        throw new Error(`Preview row missing ${field}.`);
      }
    }
    if (row.activationApproved !== false || row.active !== false) {
      throw new Error('French Daily Phrase preview row must remain inactive before explicit activation.');
    }
  }

  function buildRowPreview(row, sourceLocale) {
    if (sourceLocale !== 'ru' && sourceLocale !== 'uk') {
      throw new Error('French Daily Phrase sourceLocale must be ru or uk.');
    }
    assertDailyPhraseRow(row);
    return {
      id: row.id,
      sourceLocale,
      targetText: row.targetText,
      literal: sourceLocale === 'uk' ? row.literal_uk : row.literal,
      meaning: sourceLocale === 'uk' ? row.meaning_uk : row.meaning,
      text: sourceLocale === 'uk' ? row.text_uk : row.text,
      allowSave: row.allowSave === true,
      active: row.active === true,
      activationApproved: row.activationApproved === true,
      sourceEvidence: asArray(row.sourceEvidence).map((source) => ({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        status: source.status,
        verified: asArray(source.verified),
      })),
    };
  }

  function buildStatusModel(evidence) {
    const finalGate = evidence && evidence.finalGate;
    const blocked = blockedGates(finalGate);
    return {
      productionReady: false,
      activationApproved: false,
      contentBankReady: finalGate && finalGate.contentBankReady === true,
      status: blocked.length === 0 ? 'READY_FOR_ADMIN_DRAFT' : 'HOLD',
      blockedGates: blocked,
    };
  }

  function createPublicationDraft(input) {
    const permissions = input && input.permissions;
    if (!hasPermission(permissions, 'content_publish_draft')) {
      throw new Error('Missing permission: content_publish_draft.');
    }
    const status = buildStatusModel(input && input.evidence);
    if (status.blockedGates.length > 0) {
      throw new Error('Cannot create publication draft while required gates are not PASS.');
    }
    if (!input.owner || !input.reason || !input.contentVersion) {
      throw new Error('Publication draft requires owner, reason, and contentVersion.');
    }
    return {
      status: 'draft',
      studyTarget: 'fr',
      surface: 'daily_phrase',
      section: 'daily_phrases',
      contentVersion: input.contentVersion,
      owner: input.owner,
      reason: input.reason,
      sourceLocales: ['ru', 'uk'],
      rolloutPercent: Number.isFinite(input.rolloutPercent) ? input.rolloutPercent : 0,
      activationApproved: false,
      productionReady: false,
      writePath: `adminContentDrafts/fr/daily-phrases/${input.contentVersion}`,
      auditEvent: {
        action: 'createFrenchDailyPhrasePublicationDraft',
        owner: input.owner,
        reason: input.reason,
        activationApproved: false,
      },
    };
  }

  function requestActivationApproval(input) {
    const permissions = input && input.permissions;
    if (!hasPermission(permissions, 'content_publish')) {
      throw new Error('Missing permission: content_publish.');
    }
    const finalGate = input && input.evidence && input.evidence.finalGate;
    const blocked = blockedGates(finalGate);
    if (blocked.length > 0) {
      return {
        accepted: false,
        activationApproved: false,
        blockedGates: blocked,
      };
    }
    if (input.confirmText !== 'REQUEST FRENCH DAILY PHRASES ACTIVATION') {
      throw new Error('Activation approval requires exact confirmation text.');
    }
    return {
      accepted: true,
      activationApproved: false,
      requestPath: `approvalRequests/content/fr_daily_phrases/${input.contentVersion}`,
      auditEvent: {
        action: 'requestFrenchDailyPhrasesActivationApproval',
        owner: input.owner,
        reason: input.reason,
      },
    };
  }

  function createRollbackDraft(input) {
    const permissions = input && input.permissions;
    if (!hasPermission(permissions, 'content_rollback')) {
      throw new Error('Missing permission: content_rollback.');
    }
    if (input.confirmText !== 'ROLL BACK FRENCH DAILY PHRASES') {
      throw new Error('Rollback requires exact confirmation text.');
    }
    if (!input.currentContentVersion || !input.previousContentVersion || !input.reason || !input.owner) {
      throw new Error('Rollback requires currentContentVersion, previousContentVersion, owner, and reason.');
    }
    return {
      status: 'rollback_draft',
      studyTarget: 'fr',
      surface: 'daily_phrase',
      section: 'daily_phrases',
      currentContentVersion: input.currentContentVersion,
      previousContentVersion: input.previousContentVersion,
      restoreManifestPointer: true,
      deleteHistoricalPayloads: false,
      activationApproved: false,
      productionReady: false,
      writePath: `adminContentRollbacks/fr/daily-phrases/${input.currentContentVersion}`,
      auditEvent: {
        action: 'rollbackFrenchDailyPhrases',
        owner: input.owner,
        reason: input.reason,
        activationApproved: false,
      },
    };
  }

  function createDisableDraft(input) {
    const permissions = input && input.permissions;
    if (!hasPermission(permissions, 'content_rollback')) {
      throw new Error('Missing permission: content_rollback.');
    }
    if (!input.reason || !input.owner) {
      throw new Error('Disable draft requires owner and reason.');
    }
    return {
      status: 'disable_draft',
      studyTarget: 'fr',
      surface: 'daily_phrase',
      enabled: false,
      activationApproved: false,
      productionReady: false,
      writePath: 'remoteConfig/studyTarget/fr/daily_phrase/enabled',
      auditEvent: {
        action: 'disableFrenchDailyPhrases',
        owner: input.owner,
        reason: input.reason,
        activationApproved: false,
      },
    };
  }

  return Object.freeze({
    REQUIRED_READY_GATES,
    WORKFLOW_DEFINITION,
    buildRowPreview,
    buildStatusModel,
    blockedGates,
    createPublicationDraft,
    requestActivationApproval,
    createRollbackDraft,
    createDisableDraft,
  });
});
