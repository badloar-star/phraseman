// зачем (владелец 11.10, капсом: «ШПИЛЬ НЕМЕДЛЕННО ОПУБЛИКОВАТЬ!»): включить Шпиль в проде тем же способом, что кнопки админки —
// config/spire_v1 целиком через spireBuildConfigDoc + admin_log, и remote_config/app.bools.spire_tab_enabled с ревизией и историей.
// По умолчанию — только чтение (dry-run); запись — флаг --apply. Credentials: gcloud ADC владельца (GOOGLE_APPLICATION_CREDENTIALS).
import * as admin from 'firebase-admin';
import { createAuditRecord } from '../functions/src/admin/audit_contract';
import { SPIRE_CONFIG_COLLECTION, SPIRE_CONFIG_DOC_ID, spireBuildConfigDoc, spireConfigStatus } from '../functions/src/spire_config_contract';
import { mergeRemoteConfigBranches } from '../functions/src/admin_remote_config';

const APPLY = process.argv.includes('--apply');
const ACTOR = 'script:coordinator-on-owner-order-2026-10-11';
const REASON = 'владелец 11.10: опубликовать Шпиль немедленно (скрипт координатора по прямому приказу)';

async function main(): Promise<void> {
  admin.initializeApp({ projectId: 'phraseman-ea0b3' });
  const db = admin.firestore();
  const cfgRef = db.collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID);
  const rcRef = db.collection('remote_config').doc('app');
  const [cfgSnap, rcSnap] = await Promise.all([cfgRef.get(), rcRef.get()]);
  const cfgBefore = spireConfigStatus(cfgSnap.exists ? cfgSnap.data() : null);
  const rcBefore = (rcSnap.data() ?? {}) as Record<string, unknown>;
  const boolsBefore = (rcBefore.bools ?? {}) as Record<string, unknown>;
  console.log('[SPIRE-ENABLE] до:', JSON.stringify({
    configExists: cfgBefore.exists, configValid: cfgBefore.valid, enabled: cfgBefore.config.enabled,
    tabFlag: boolsBefore.spire_tab_enabled ?? null, rcRevision: rcBefore.revision ?? null, apply: APPLY,
  }));
  const next = spireBuildConfigDoc({ ...(cfgSnap.exists ? cfgSnap.data() : {}), enabled: true });
  console.log('[SPIRE-ENABLE] новый config/spire_v1:', JSON.stringify(next));
  if (!APPLY) { console.log('[SPIRE-ENABLE] dry-run: ничего не записано (добавьте --apply)'); return; }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  // 1) config/spire_v1 — как adminSpireConfigSet
  const auditRef = db.collection('admin_log').doc();
  await db.runTransaction(async (tx) => {
    const before = await tx.get(cfgRef);
    const beforeStatus = spireConfigStatus(before.exists ? before.data() : null);
    tx.set(cfgRef, { ...next, updatedAtMs: nowMs, updatedByUid: ACTOR });
    tx.set(auditRef, createAuditRecord({
      action: 'spire_config_write', actorUid: ACTOR, role: 'owner',
      entity: { collection: SPIRE_CONFIG_COLLECTION, id: SPIRE_CONFIG_DOC_ID }, reason: REASON,
      before: { enabled: beforeStatus.config.enabled }, after: { enabled: next.enabled },
      requestId: auditRef.id, timestamp: nowIso,
    }));
  });
  console.log('[SPIRE-ENABLE] config/spire_v1 записан, audit', auditRef.id);

  // 2) remote_config/app.bools.spire_tab_enabled — как adminPublishRemoteConfig (ревизия + история + аудит)
  const histRef = db.collection('remote_config_history').doc();
  const rcAuditRef = db.collection('admin_log').doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rcRef);
    const before = (snap.data() ?? {}) as Record<string, unknown>;
    const rev = Number(before.revision ?? 0);
    const after = { ...mergeRemoteConfigBranches(before, { bools: { spire_tab_enabled: true } } as never), revision: rev + 1, updatedBy: ACTOR };
    const audit = createAuditRecord({
      action: 'remote_config.publish', actorUid: ACTOR, role: 'owner', entity: { collection: 'remote_config', id: 'app' },
      reason: REASON, before, after, rollbackReference: histRef.id, requestId: rcAuditRef.id, timestamp: nowIso,
    });
    tx.set(rcRef, { ...after, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.create(histRef, { ...audit, operationId: `spire-enable-${nowMs}`, revision: rev + 1 });
    tx.create(rcAuditRef, { ...audit, operationId: `spire-enable-${nowMs}` });
  });
  // 3) read-back
  const [c2, r2] = await Promise.all([cfgRef.get(), rcRef.get()]);
  console.log('[SPIRE-ENABLE] после:', JSON.stringify({
    enabled: spireConfigStatus(c2.data()).config.enabled, liveForPlayers: spireConfigStatus(c2.data()).liveForPlayers,
    tabFlag: ((r2.data() ?? {}).bools as Record<string, unknown> | undefined)?.spire_tab_enabled ?? null, rcRevision: (r2.data() ?? {}).revision ?? null,
  }));
}
main().catch((e) => { console.error('[SPIRE-ENABLE] ОШИБКА', e instanceof Error ? e.message : e); process.exit(1); });
