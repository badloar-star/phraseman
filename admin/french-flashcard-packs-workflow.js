/* eslint-disable */
(function initFrenchFlashcardPacksWorkflow(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.PhrasemanFrenchFlashcardPacksWorkflow = api;
})(typeof window !== 'undefined' ? window : globalThis, function createFrenchFlashcardPacksWorkflowApi() {
  const REQUIRED_READY_GATES = [
    'content_candidate_final_gate',
    'server_pack_dry_run',
    'server_upload_rehearsal',
    'runtime_storage_isolation',
    'runtime_marketplace_adapter',
    'admin_workflow_handlers',
    'admin_surface_wiring',
    'admin_preview_publish_rollback',
    'rollback_activation_governance',
    'activation_closed',
  ];

  const WORKFLOW_DEFINITION = Object.freeze({
    routeId: 'content.frenchFlashcardPacks',
    category: 'Content',
    humanName: 'French flashcard packs',
    primaryCta: 'Create publication draft',
    activationApproved: false,
    panels: Object.freeze(['status', 'preview', 'sourceReview', 'publishDraft', 'rollback']),
    actions: Object.freeze([
      Object.freeze({ id: 'previewPack', type: 'secondary', writes: false, permission: 'content_read' }),
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
        id: 'rollbackPacks',
        type: 'danger',
        writes: true,
        permission: 'content_rollback',
        requiresConfirm: true,
        requiresPreview: true,
        auditLog: true,
        confirmText: 'ROLL BACK FRENCH FLASHCARD PACKS',
      }),
      Object.freeze({
        id: 'disableFrenchFlashcardPacks',
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

  function assertSourceLocale(sourceLocale) {
    if (sourceLocale !== 'ru' && sourceLocale !== 'uk') {
      throw new Error('French flashcard pack sourceLocale must be ru or uk.');
    }
  }

  function buildPackPreview(pack, sourceLocale) {
    assertSourceLocale(sourceLocale);
    if (!pack || typeof pack.id !== 'string' || !pack.id.startsWith('fr_')) {
      throw new Error('Preview pack must be an official French flashcard pack.');
    }
    const cards = asArray(pack.cards);
    if (cards.length < 20) {
      throw new Error('Preview pack must include at least 20 cards.');
    }
    return {
      id: pack.id,
      sourceLocale,
      studyTarget: 'fr',
      title: sourceLocale === 'uk' ? pack.titleUk : pack.titleRu,
      description: sourceLocale === 'uk' ? pack.descriptionUk : pack.descriptionRu,
      category: pack.category,
      cardCount: cards.length,
      priceShards: pack.priceShards,
      activationApproved: pack.activationApproved === true,
      cards: cards.slice(0, 5).map((card) => ({
        id: card.id,
        targetText: card.targetText,
        meaning: sourceLocale === 'uk' ? card.uk : card.ru,
        literal: sourceLocale === 'uk' ? card.literalUk : card.literalRu,
        explanation: sourceLocale === 'uk' ? card.explanationUk : card.explanationRu,
        exampleFr: card.exampleFr,
        register: card.register,
        level: card.level,
        sourceEvidence: asArray(card.evidence).map((source) => ({
          sourceId: source.sourceId,
          url: source.url,
          verified: source.verified === true || (typeof source.verified === 'string' && source.verified.length > 0),
        })),
      })),
    };
  }

  function buildStatusModel(evidence) {
    const finalGate = evidence && evidence.finalGate;
    const blocked = blockedGates(finalGate);
    return {
      productionReady: blocked.length === 0,
      activationApproved: false,
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
    const sourceLocales = asArray(input.sourceLocales);
    if (!sourceLocales.includes('ru') || !sourceLocales.includes('uk')) {
      throw new Error('Publication draft requires both ru and uk source locales.');
    }
    return {
      status: 'draft',
      studyTarget: 'fr',
      surface: 'flashcard',
      section: 'official_marketplace_packs',
      contentVersion: input.contentVersion,
      owner: input.owner,
      reason: input.reason,
      sourceLocales: ['ru', 'uk'],
      rolloutPercent: Number.isFinite(input.rolloutPercent) ? input.rolloutPercent : 0,
      activationApproved: false,
      productionReady: false,
      writePath: `adminContentDrafts/fr/flashcard-packs/${input.contentVersion}`,
      auditEvent: {
        action: 'createFrenchFlashcardPackPublicationDraft',
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
    if (input.confirmText !== 'REQUEST FRENCH FLASHCARD PACKS ACTIVATION') {
      throw new Error('Activation approval requires exact confirmation text.');
    }
    return {
      accepted: true,
      activationApproved: false,
      requestPath: `approvalRequests/content/fr_flashcard_packs/${input.contentVersion}`,
      auditEvent: {
        action: 'requestFrenchFlashcardPacksActivationApproval',
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
    if (input.confirmText !== 'ROLL BACK FRENCH FLASHCARD PACKS') {
      throw new Error('Rollback requires exact confirmation text.');
    }
    if (!input.currentContentVersion || !input.previousContentVersion || !input.reason || !input.owner) {
      throw new Error('Rollback requires currentContentVersion, previousContentVersion, owner, and reason.');
    }
    return {
      status: 'rollback_draft',
      studyTarget: 'fr',
      surface: 'flashcard',
      section: 'official_marketplace_packs',
      currentContentVersion: input.currentContentVersion,
      previousContentVersion: input.previousContentVersion,
      restoreManifestPointer: true,
      deleteHistoricalPayloads: false,
      activationApproved: false,
      productionReady: false,
      writePath: `adminContentRollbacks/fr/flashcard-packs/${input.currentContentVersion}`,
      auditEvent: {
        action: 'rollbackFrenchFlashcardPacks',
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
      surface: 'flashcard',
      section: 'official_marketplace_packs',
      enabled: false,
      activationApproved: false,
      productionReady: false,
      writePath: 'remoteConfig/studyTarget/fr/flashcard/official_marketplace_packs_enabled',
      auditEvent: {
        action: 'disableFrenchFlashcardPacks',
        owner: input.owner,
        reason: input.reason,
        activationApproved: false,
      },
    };
  }

  function validateRollbackActivationGovernance(input) {
    const finalGate = input && input.finalGate;
    const upstreamBlocked = blockedGates(finalGate);
    const rollbackDraft = input && input.rollbackDraft;
    const publicationDraft = input && input.publicationDraft;
    const approvalRequest = input && input.approvalRequest;
    const blockers = [];
    if (upstreamBlocked.length > 0) {
      blockers.push(...upstreamBlocked.map((gate) => `gate:${gate.gateId}:${gate.status}`));
    }
    if (!publicationDraft || publicationDraft.status !== 'draft') blockers.push('publicationDraft.status must be draft');
    if (!publicationDraft || !String(publicationDraft.writePath || '').startsWith('adminContentDrafts/fr/flashcard-packs/')) {
      blockers.push('publicationDraft.writePath must stay under adminContentDrafts/fr/flashcard-packs');
    }
    if (!rollbackDraft || rollbackDraft.status !== 'rollback_draft') blockers.push('rollbackDraft.status must be rollback_draft');
    if (!rollbackDraft || !String(rollbackDraft.writePath || '').startsWith('adminContentRollbacks/fr/flashcard-packs/')) {
      blockers.push('rollbackDraft.writePath must stay under adminContentRollbacks/fr/flashcard-packs');
    }
    if (!rollbackDraft || rollbackDraft.restoreManifestPointer !== true) blockers.push('rollbackDraft.restoreManifestPointer must be true');
    if (!rollbackDraft || rollbackDraft.deleteHistoricalPayloads !== false) blockers.push('rollbackDraft.deleteHistoricalPayloads must be false');
    if (approvalRequest && !String(approvalRequest.requestPath || '').startsWith('approvalRequests/content/fr_flashcard_packs/')) {
      blockers.push('approvalRequest.requestPath must stay under approvalRequests/content/fr_flashcard_packs');
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
    buildPackPreview,
    buildStatusModel,
    blockedGates,
    createPublicationDraft,
    requestActivationApproval,
    createRollbackDraft,
    createDisableDraft,
    validateRollbackActivationGovernance,
  });
});
