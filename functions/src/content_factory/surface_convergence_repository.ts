import { defaultSurfaceConvergenceConfig, planArenaConvergenceConfigUpdate } from './surface_convergence_policy';

type FirestoreLike = Pick<FirebaseFirestore.Firestore, 'collection' | 'runTransaction'>;

export async function persistArenaComparisonReceipt(db: FirestoreLike, receipt: { readonly documentId: string } & Record<string, unknown>, serverTimestamp: unknown) {
  if (!/^[a-f0-9]{64}$/.test(receipt.documentId)) throw new Error('surface_convergence_receipt_identity_invalid');
  const ref = db.collection('content_factory_surface_comparisons').doc(receipt.documentId);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return Object.freeze({ created: false, documentId: receipt.documentId });
    tx.create(ref, { ...receipt, createdAt: serverTimestamp });
    return Object.freeze({ created: true, documentId: receipt.documentId });
  });
}

export async function updateArenaConvergenceConfig(db: FirestoreLike, input: { readonly expectedRevision: number; readonly mode: 'legacy' | 'shadow'; readonly actorUid: string; readonly role: string; readonly requiredLocalePairs?: readonly string[]; readonly disabledReason: string; readonly requestId: string; readonly nowIso: string; readonly serverTimestamp: unknown }) {
  const configRef = db.collection('content_factory_config').doc('surface_convergence'); const auditRef = db.collection('admin_log').doc();
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(configRef); const current = snapshot.exists ? snapshot.data() : defaultSurfaceConvergenceConfig();
    const planned = planArenaConvergenceConfigUpdate(current, { expectedRevision: input.expectedRevision, mode: input.mode, actorUid: input.actorUid, requiredLocalePairs: input.requiredLocalePairs, disabledReason: input.disabledReason });
    tx.set(configRef, { arena: planned.arena, updatedAt: input.serverTimestamp }, { merge: false });
    tx.create(auditRef, { action: input.mode === 'legacy' ? 'content_factory.arena.kill_switch' : 'content_factory.arena.shadow_enable', actorUid: input.actorUid, role: input.role, entity: { collection: 'content_factory_config', id: 'surface_convergence' }, reason: input.disabledReason || 'Arena shadow evidence collection enabled', requestId: input.requestId, before: { mode: planned.audit.beforeMode, revision: planned.audit.expectedRevision }, after: { mode: planned.audit.afterMode, revision: planned.audit.nextRevision, requiredLocalePairs: planned.arena.requiredLocalePairs }, timestamp: input.nowIso });
    return Object.freeze({ ok: true, arena: planned.arena, auditId: auditRef.id });
  });
}
