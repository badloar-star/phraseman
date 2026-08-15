import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import {
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  ENFORCE_APP_CHECK,
  requireAdminAppCheck,
} from './callable_options';

const REGION = 'us-central1';
const OVERRIDES_COLLECTION = 'cosmetic_asset_archive_overrides';
const ASSET_HOST = 'https://phraseman-ea0b3.web.app';

export type CosmeticAssetCategory = 'aura' | 'avatar' | 'achievement' | 'other';
export type CosmeticDelivery = 'purchase' | 'reward' | 'subscription' | 'legacy';

export interface CosmeticAssetInventoryItem {
  readonly id: string;
  readonly category: CosmeticAssetCategory;
  readonly name: string;
  readonly defaultForSale: boolean;
  readonly delivery: CosmeticDelivery;
  readonly previewUrl?: string;
  readonly alternatePreviewUrl?: string;
}

const AURA_ITEMS: readonly CosmeticAssetInventoryItem[] = [
  { id: 'aura-plus', category: 'aura', name: 'Plus', defaultForSale: false, delivery: 'subscription' },
  { id: 'aura-pro', category: 'aura', name: 'Pro', defaultForSale: false, delivery: 'subscription' },
  { id: 'aura-aurora', category: 'aura', name: 'Аврора', defaultForSale: false, delivery: 'legacy' },
  { id: 'aura-ember', category: 'aura', name: 'Искра', defaultForSale: true, delivery: 'purchase' },
  { id: 'aura-mint', category: 'aura', name: 'Мята', defaultForSale: true, delivery: 'purchase' },
  { id: 'aura-violet', category: 'aura', name: 'Виолет', defaultForSale: false, delivery: 'legacy' },
  { id: 'aura-coral', category: 'aura', name: 'Коралл', defaultForSale: false, delivery: 'legacy' },
  { id: 'aura-prism', category: 'aura', name: 'Призма', defaultForSale: true, delivery: 'purchase' },
  { id: 'aura-lagoon', category: 'aura', name: 'Лагуна', defaultForSale: false, delivery: 'legacy' },
  { id: 'aura-sunset', category: 'aura', name: 'Закат', defaultForSale: false, delivery: 'legacy' },
  { id: 'aura-nimbus', category: 'aura', name: 'Нимб', defaultForSale: false, delivery: 'reward' },
  { id: 'aura-season-1-stage-1', category: 'aura', name: 'Пульс I', defaultForSale: false, delivery: 'reward' },
  { id: 'aura-season-1-stage-2', category: 'aura', name: 'Поток II', defaultForSale: false, delivery: 'reward' },
  { id: 'aura-season-1-stage-3', category: 'aura', name: 'Спектр III', defaultForSale: false, delivery: 'reward' },
  { id: 'aura-season-1-stage-4', category: 'aura', name: 'Импульс IV', defaultForSale: false, delivery: 'reward' },
  { id: 'aura-season-1-secret', category: 'aura', name: 'Секретная', defaultForSale: false, delivery: 'reward' },
];

const AVATAR_ITEMS: readonly CosmeticAssetInventoryItem[] = Array.from({ length: 62 }, (_, offset) => {
  const index = offset + 1;
  const suffix = String(index).padStart(2, '0');
  const defaultForSale = index >= 41;
  return Object.freeze({
    id: `custom-gen-${suffix}`,
    category: 'avatar' as const,
    name: `Аватар ${suffix}`,
    defaultForSale,
    // Первые 40 раньше были магазинными, а не наградными. Они архивные:
    // скрыты по умолчанию, но админ может честно вернуть их в продажу.
    delivery: defaultForSale ? 'purchase' as const : 'legacy' as const,
    previewUrl: `${ASSET_HOST}/avatars/custom-idea-${suffix}-black.webp`,
    alternatePreviewUrl: `${ASSET_HOST}/avatars/custom-idea-${suffix}-white.webp`,
  });
});

export const COSMETIC_ASSET_INVENTORY: readonly CosmeticAssetInventoryItem[] = Object.freeze([
  ...AURA_ITEMS,
  ...AVATAR_ITEMS,
]);

const inventoryByKey = new Map(
  COSMETIC_ASSET_INVENTORY.map((item) => [`${item.category}:${item.id}`, item]),
);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function overrideDocId(category: CosmeticAssetCategory, assetId: string): string {
  return `${category}__${assetId}`;
}

function requireInventoryItem(category: string, assetId: string): CosmeticAssetInventoryItem {
  const item = inventoryByKey.get(`${category}:${assetId}`);
  if (!item) throw new HttpsError('invalid-argument', 'unknown cosmetic asset');
  return item;
}

async function readSaleOverrides(): Promise<{
  readonly values: Readonly<Record<string, boolean>>;
  readonly revision: number;
}> {
  const snapshot = await admin.firestore().collection(OVERRIDES_COLLECTION).limit(500).get();
  const values: Record<string, boolean> = {};
  let revision = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const category = text(data.category, 40);
    const assetId = text(data.assetId, 160);
    if (!inventoryByKey.has(`${category}:${assetId}`) || typeof data.forSale !== 'boolean') return;
    values[`${category}:${assetId}`] = data.forSale;
    revision = Math.max(revision, Math.floor(Number(data.updatedAtMs) || 0));
  });
  return Object.freeze({ values: Object.freeze(values), revision });
}

/** Compact client manifest. Cached on-device; no image bytes pass through Functions. */
export const cosmeticAssetCatalogGet = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, invoker: 'public' },
  async () => {
    const overrides = await readSaleOverrides();
    return { ok: true, schemaVersion: 1, ...overrides };
  },
);

export const adminGetCosmeticAssetArchive = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromAdminToken(request.auth.token);
    if (!role || !hasPermission(role, 'application.config.write')) {
      throw new HttpsError('permission-denied', 'Role cannot manage asset availability');
    }
    const overrides = await readSaleOverrides();
    return {
      ok: true,
      revision: overrides.revision,
      items: COSMETIC_ASSET_INVENTORY.map((item) => ({
        ...item,
        saleManaged: item.delivery === 'purchase' || item.delivery === 'legacy',
        forSale: overrides.values[`${item.category}:${item.id}`] ?? item.defaultForSale,
      })),
      categories: ['aura', 'avatar', 'achievement', 'other'],
    };
  },
);

export const adminSetCosmeticAssetSaleStatus = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromAdminToken(request.auth.token);
    if (!role || !hasPermission(role, 'application.config.write')) {
      throw new HttpsError('permission-denied', 'Role cannot manage asset availability');
    }
    if (!record(request.data)) throw new HttpsError('invalid-argument', 'asset command required');
    const category = text(request.data.category, 40) as CosmeticAssetCategory;
    const assetId = text(request.data.assetId, 160);
    const reason = text(request.data.reason, 500);
    const requestId = text(request.data.requestId, 160);
    const idempotencyKey = text(request.data.idempotencyKey, 160);
    const forSale = request.data.forSale;
    const item = requireInventoryItem(category, assetId);
    if (item.delivery !== 'purchase' && item.delivery !== 'legacy') {
      throw new HttpsError('failed-precondition', 'asset is managed by entitlement delivery, not sale status');
    }
    if (typeof forSale !== 'boolean' || !reason || !requestId || !idempotencyKey) {
      throw new HttpsError('invalid-argument', 'forSale, reason and request ids are required');
    }

    const db = admin.firestore();
    const assetRef = db.collection(OVERRIDES_COLLECTION).doc(overrideDocId(category, assetId));
    const operationRef = db.collection('admin_command_operations').doc(`asset_sale_${idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const actorUid = request.auth.uid;
    const nowMs = Date.now();
    const fingerprint = JSON.stringify({ category, assetId, forSale, reason });

    return db.runTransaction(async (tx) => {
      const [assetSnapshot, operationSnapshot] = await Promise.all([
        tx.get(assetRef),
        tx.get(operationRef),
      ]);
      if (operationSnapshot.exists) {
        const previous = operationSnapshot.data() ?? {};
        if (previous.fingerprint !== fingerprint || previous.actorUid !== actorUid) {
          throw new HttpsError('already-exists', 'idempotency key belongs to another command');
        }
        return { ok: true, replayed: true, forSale: previous.forSale === true };
      }

      const beforeForSale = typeof assetSnapshot.data()?.forSale === 'boolean'
        ? assetSnapshot.data()!.forSale === true
        : item.defaultForSale;
      const before = { category, assetId, forSale: beforeForSale };
      const after = { category, assetId, forSale };
      const audit = createAuditRecord({
        action: forSale ? 'cosmetic_asset.return_to_sale' : 'cosmetic_asset.remove_from_sale',
        actorUid,
        role,
        entity: { collection: OVERRIDES_COLLECTION, id: assetRef.id },
        reason,
        before,
        after,
        rollbackReference: `${category}:${assetId}:${beforeForSale}`,
        requestId,
        timestamp: new Date(nowMs).toISOString(),
      });

      tx.set(assetRef, {
        ...after,
        delivery: item.delivery,
        updatedAtMs: nowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: actorUid,
      });
      tx.create(auditRef, { ...audit, operationId: operationRef.id });
      tx.create(operationRef, {
        actorUid,
        fingerprint,
        forSale,
        auditId: auditRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, replayed: false, forSale, revision: nowMs, auditId: auditRef.id };
    });
  },
);
