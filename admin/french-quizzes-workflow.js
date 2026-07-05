/* eslint-disable */
(function initFrenchQuizzesWorkflow(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.PhrasemanFrenchQuizzesWorkflow = api;
})(typeof window !== 'undefined' ? window : globalThis, function createFrenchQuizzesWorkflowApi() {
  const REQUIRED_READY_GATES = [
    'content_hard_audit',
    'semantic_smell_audit',
    'llm_review_decisions',
    'runtime_full_sentence_adapter',
    'server_pack_dryrun_validation',
    'server_pack_upload_rehearsal',
    'rollback_runtime_off_switch',
    'admin_workflow_map',
  ];

  const WORKFLOW_DEFINITION = Object.freeze({
    routeId: 'content.frenchQuizzes',
    category: 'Content',
    humanName: 'French quizzes',
    primaryCta: 'Create publication draft',
    activationApproved: false,
    panels: Object.freeze(['status', 'preview', 'validation', 'publishDraft', 'rollback']),
    actions: Object.freeze([
      Object.freeze({ id: 'previewRows', type: 'secondary', writes: false, permission: 'content_read' }),
      Object.freeze({ id: 'validatePack', type: 'secondary', writes: false, permission: 'content_read' }),
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
        confirmText: 'ROLL BACK FRENCH QUIZZES',
      }),
      Object.freeze({
        id: 'disableFrenchQuizPack',
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
    const map = new Map();
    for (const gate of asArray(finalGate && finalGate.gates)) {
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

  function assertSourceLocale(sourceLocale) {
    if (sourceLocale !== 'ru' && sourceLocale !== 'uk') {
      throw new Error('French quiz sourceLocale must be ru or uk.');
    }
  }

  function buildRowPreview(row, sourceLocale) {
    assertSourceLocale(sourceLocale);
    if (!row || row.studyTarget !== 'fr' || row.surface !== 'quiz') {
      throw new Error('Preview row must be a French quiz row.');
    }
    const choices = asArray(row.choices);
    const explanations = sourceLocale === 'uk'
      ? asArray(row.explanations_uk || row.explanationsUK)
      : asArray(row.explanations_ru || row.explanations);
    if (choices.length !== 4 || explanations.length !== 4) {
      throw new Error('Preview row must include four choices and four aligned explanations.');
    }
    if (!Number.isInteger(row.correct) || row.correct < 0 || row.correct >= choices.length) {
      throw new Error('Preview row correct index is invalid.');
    }
    return {
      entryId: row.entryId,
      questionId: row.questionId,
      sourceLocale,
      prompt: sourceLocale === 'uk'
        ? row.sourcePrompt_uk || row.uk || row.sourceText
        : row.sourcePrompt_ru || row.ru || row.sourceText,
      choices: choices.slice(),
      correct: row.correct,
      answer: row.answer || choices[row.correct],
      explanations: explanations.slice(),
      sourceEvidence: asArray(row.officialSourceCoverage).map((source) => ({
        sourceId: source.sourceId,
        label: source.label,
        url: source.url,
      })),
    };
  }

  function buildStatusModel(evidence) {
    const finalGate = evidence && evidence.finalGate;
    const progress = evidence && evidence.progress;
    const blocked = blockedGates(finalGate);
    return {
      productionReady: false,
      activationApproved: false,
      status: blocked.length === 0 ? 'READY_FOR_ADMIN_DRAFT' : 'HOLD',
      blockedGates: blocked,
      summary: progress && progress.summary ? { ...progress.summary } : {},
    };
  }

  function createPublicationDraft(input) {
    const evidence = input && input.evidence;
    const permissions = input && input.permissions;
    if (!hasPermission(permissions, 'content_publish_draft')) {
      throw new Error('Missing permission: content_publish_draft.');
    }
    const status = buildStatusModel(evidence);
    if (status.blockedGates.length > 0) {
      throw new Error('Cannot create publication draft while required gates are not PASS.');
    }
    if (!input.owner || !input.reason || !input.contentVersion) {
      throw new Error('Publication draft requires owner, reason, and contentVersion.');
    }
    const sourceLocales = asArray(input.sourceLocales);
    if (!sourceLocales.includes('ru') || !sourceLocales.includes('uk')) {
      throw new Error('Publication draft requires both ru and uk source locales.');
    }
    return {
      status: 'draft',
      studyTarget: 'fr',
      surface: 'quiz',
      section: 'standard',
      contentVersion: input.contentVersion,
      owner: input.owner,
      reason: input.reason,
      sourceLocales: ['ru', 'uk'],
      rolloutPercent: Number.isFinite(input.rolloutPercent) ? input.rolloutPercent : 0,
      activationApproved: false,
      productionReady: false,
      writePath: `adminContentDrafts/fr/quiz/${input.contentVersion}`,
      auditEvent: {
        action: 'createPublicationDraft',
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
    const blocked = blockedGates(finalGate, [
      ...REQUIRED_READY_GATES,
      'admin_preview_publish_rollback',
      'rollback_activation_governance',
    ]);
    if (blocked.length > 0) {
      return {
        accepted: false,
        activationApproved: false,
        blockedGates: blocked,
      };
    }
    if (input.confirmText !== 'REQUEST FRENCH QUIZ ACTIVATION') {
      throw new Error('Activation approval requires exact confirmation text.');
    }
    return {
      accepted: true,
      activationApproved: false,
      requestPath: `approvalRequests/content/fr_quiz/${input.contentVersion}`,
      auditEvent: {
        action: 'requestActivationApproval',
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
    if (input.confirmText !== 'ROLL BACK FRENCH QUIZZES') {
      throw new Error('Rollback requires exact confirmation text.');
    }
    if (!input.currentContentVersion || !input.previousContentVersion || !input.reason || !input.owner) {
      throw new Error('Rollback requires currentContentVersion, previousContentVersion, owner, and reason.');
    }
    return {
      status: 'rollback_draft',
      studyTarget: 'fr',
      surface: 'quiz',
      section: 'standard',
      currentContentVersion: input.currentContentVersion,
      previousContentVersion: input.previousContentVersion,
      restoreManifestPointer: true,
      deleteHistoricalPayloads: false,
      activationApproved: false,
      productionReady: false,
      writePath: `adminContentRollbacks/fr/quiz/${input.currentContentVersion}`,
      auditEvent: {
        action: 'rollbackPack',
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
      surface: 'quiz',
      enabled: false,
      activationApproved: false,
      productionReady: false,
      writePath: 'remoteConfig/studyTarget/fr/quiz/enabled',
      auditEvent: {
        action: 'disableFrenchQuizPack',
        owner: input.owner,
        reason: input.reason,
      },
    };
  }

  function validateRollbackActivationGovernance(input) {
    const finalGate = input && input.finalGate;
    const upstreamBlocked = blockedGates(finalGate, [
      ...REQUIRED_READY_GATES,
      'admin_workflow_handlers',
      'admin_surface_wiring',
      'admin_preview_publish_rollback',
    ]);
    const rollbackDraft = input && input.rollbackDraft;
    const publicationDraft = input && input.publicationDraft;
    const approvalRequest = input && input.approvalRequest;
    const blockers = [];
    if (upstreamBlocked.length > 0) {
      blockers.push(...upstreamBlocked.map((gate) => `gate:${gate.gateId}:${gate.status}`));
    }
    if (!publicationDraft || publicationDraft.status !== 'draft') {
      blockers.push('publicationDraft.status must be draft');
    }
    if (!publicationDraft || !String(publicationDraft.writePath || '').startsWith('adminContentDrafts/fr/quiz/')) {
      blockers.push('publicationDraft.writePath must stay under adminContentDrafts/fr/quiz');
    }
    if (!rollbackDraft || rollbackDraft.status !== 'rollback_draft') {
      blockers.push('rollbackDraft.status must be rollback_draft');
    }
    if (!rollbackDraft || !String(rollbackDraft.writePath || '').startsWith('adminContentRollbacks/fr/quiz/')) {
      blockers.push('rollbackDraft.writePath must stay under adminContentRollbacks/fr/quiz');
    }
    if (!rollbackDraft || rollbackDraft.restoreManifestPointer !== true) {
      blockers.push('rollbackDraft.restoreManifestPointer must be true');
    }
    if (!rollbackDraft || rollbackDraft.deleteHistoricalPayloads !== false) {
      blockers.push('rollbackDraft.deleteHistoricalPayloads must be false');
    }
    if (approvalRequest && !String(approvalRequest.requestPath || '').startsWith('approvalRequests/content/fr_quiz/')) {
      blockers.push('approvalRequest.requestPath must stay under approvalRequests/content/fr_quiz');
    }
    for (const item of [publicationDraft, rollbackDraft, approvalRequest].filter(Boolean)) {
      if (item.activationApproved !== false) blockers.push('activationApproved must remain false');
      if ('productionReady' in item && item.productionReady !== false) blockers.push('draft productionReady must remain false');
    }
    return {
      status: blockers.length === 0
        ? 'PASS_ROLLBACK_ACTIVATION_GOVERNANCE_READY'
        : 'HOLD_ROLLBACK_ACTIVATION_GOVERNANCE',
      productionReady: blockers.length === 0,
      activationApproved: false,
      blockers,
      rollbackMode: 'restore_previous_manifest_pointer',
      deleteHistoricalPayloads: false,
      requiresExplicitActivationApproval: true,
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
    validateRollbackActivationGovernance,
  });
});
