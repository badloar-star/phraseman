/* eslint-disable */
(function initFrenchFlashcardPacksAdmin(root) {
  function workflow() {
    return root.PhrasemanFrenchFlashcardPacksWorkflow;
  }

  root.FRENCH_FLASHCARD_PACKS_ADMIN_SURFACE = Object.freeze({
    routeId: 'content.frenchFlashcardPacks',
    category: 'Content',
    title: 'French flashcard packs',
    description: 'Review official French marketplace packs, create a guarded publication draft, request approval, or prepare rollback.',
    activationApproved: false,
    directProductionWrites: false,
    requiredPanels: Object.freeze(['status', 'preview', 'sourceReview', 'publishDraft', 'rollback']),
    requiredPermissions: Object.freeze(['content_read', 'content_publish_draft', 'content_publish', 'content_rollback']),
  });

  root.renderFrenchFlashcardPacksAdmin = function renderFrenchFlashcardPacksAdmin(mount, evidence) {
    const host = mount || (typeof document !== 'undefined' ? document.querySelector('[data-admin-surface="french-flashcard-packs"]') : null);
    if (!host) return null;
    const api = workflow();
    if (!api) {
      host.innerHTML = '<section class="admin-panel" data-route="content.frenchFlashcardPacks"><h2>French flashcard packs</h2><p>Workflow module is not loaded.</p></section>';
      return null;
    }
    const status = api.buildStatusModel({ finalGate: evidence && evidence.finalGate });
    host.innerHTML = [
      '<section class="admin-panel" data-route="content.frenchFlashcardPacks">',
      '<header class="admin-panel-header">',
      '<h2>French flashcard packs</h2>',
      '<p>Review source-backed French packs, draft publication, request approval, or prepare rollback.</p>',
      '</header>',
      `<div class="admin-status" data-status="${status.status}">${status.status}</div>`,
      '<div class="admin-actions">',
      '<button type="button" class="secondary" data-action="previewPack" title="Preview a RU/UK pack before drafting publication.">Preview pack</button>',
      '<button type="button" class="secondary" data-action="validateSourceEvidence" title="Check trusted source evidence before approval.">Validate sources</button>',
      '<button type="button" class="primary" data-action="createPublicationDraft" title="Create a guarded draft; does not activate content.">Create publication draft</button>',
      '<button type="button" class="secondary" data-action="requestActivationApproval" title="Request explicit activation approval; does not approve automatically.">Request approval</button>',
      '<button type="button" class="danger" data-action="rollbackPacks" title="Prepare rollback draft after confirmation.">Prepare rollback</button>',
      '</div>',
      '</section>',
    ].join('');
    return status;
  };
})(typeof window !== 'undefined' ? window : globalThis);
