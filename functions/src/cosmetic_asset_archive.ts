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

/**
 * Как ассет выглядит на самом деле. Админка обязана рисовать предмет ровно так
 * же, как приложение, иначе владелец снимает с продажи вслепую.
 *
 * зачем 2026-08-16 (владелец: «каждый ассет должен показываться в точности
 * 100% как в приложении»): раньше все 16 аур рисовались одной SVG-заглушкой,
 * потому что previewUrl был только у аватаров. Ауры — не картинки, а
 * градиентное кольцо из цветов каталога (`constants/avatar_auras.ts`), поэтому
 * их нельзя отдать ссылкой: отдаём сами цвета и способ отрисовки.
 */
export type CosmeticRenderKind = 'image' | 'aura-ring' | 'aura-layers';

/** Палитра кольца. Поля 1:1 с AvatarAuraDef, чтобы расхождение было заметно. */
export interface CosmeticAuraPalette {
  readonly color: string;
  readonly color2: string;
  readonly color3: string;
  readonly softColor: string;
  /** 'satin' — линейный перелив (Pro), иначе кольцевой градиент. */
  readonly material?: 'halo' | 'satin';
}

/** Три вращающихся слоя сезонной ауры — те же файлы, что в бандле приложения. */
export interface CosmeticAuraLayers {
  readonly baseUrl: string;
  readonly flowUrl: string;
  readonly particlesUrl: string;
}

export interface CosmeticAssetInventoryItem {
  readonly id: string;
  readonly category: CosmeticAssetCategory;
  readonly name: string;
  readonly defaultForSale: boolean;
  readonly delivery: CosmeticDelivery;
  readonly render: CosmeticRenderKind;
  readonly previewUrl?: string;
  readonly alternatePreviewUrl?: string;
  readonly palette?: CosmeticAuraPalette;
  readonly layers?: CosmeticAuraLayers;
}

/**
 * Палитры скопированы из AVATAR_AURAS (`constants/avatar_auras.ts`) один в
 * один. Сторож `cosmetic_asset_archive.test.ts` сверяет их с каталогом
 * приложения, поэтому расхождение уронит сборку, а не тихо соврёт админке.
 */
const AURA_PALETTES: Readonly<Record<string, CosmeticAuraPalette>> = Object.freeze({
  'aura-plus': { color: '#D4A72C', color2: '#FFF1B8', color3: '#9A6414', softColor: 'rgba(212,167,44,0.28)' },
  'aura-pro': { color: '#2563A8', color2: '#D7ECFF', color3: '#12396B', softColor: 'rgba(37,99,168,0.28)', material: 'satin' },
  'aura-aurora': { color: '#22D3EE', color2: '#C4B5FD', color3: '#0EA5E9', softColor: 'rgba(34,211,238,0.22)' },
  'aura-ember': { color: '#FB7185', color2: '#FDBA74', color3: '#E11D48', softColor: 'rgba(251,113,133,0.22)' },
  'aura-mint': { color: '#34D399', color2: '#A7F3D0', color3: '#0D9488', softColor: 'rgba(52,211,153,0.22)' },
  'aura-violet': { color: '#A78BFA', color2: '#E9D5FF', color3: '#7C3AED', softColor: 'rgba(167,139,250,0.22)' },
  'aura-coral': { color: '#FB7185', color2: '#FED7AA', color3: '#EA580C', softColor: 'rgba(251,113,133,0.22)' },
  'aura-prism': { color: '#22D3EE', color2: '#A78BFA', color3: '#F9A8D4', softColor: 'rgba(34,211,238,0.22)' },
  'aura-lagoon': { color: '#2DD4BF', color2: '#60A5FA', color3: '#FDE68A', softColor: 'rgba(45,212,191,0.22)' },
  'aura-sunset': { color: '#FB7185', color2: '#FDBA74', color3: '#818CF8', softColor: 'rgba(251,113,133,0.22)' },
  'aura-nimbus': { color: '#38BDF8', color2: '#7DD3FC', color3: '#E0F2FE', softColor: 'rgba(56,189,248,0.30)' },
  'aura-season-1-stage-1': { color: '#22D3EE', color2: '#67E8F9', color3: '#0EA5E9', softColor: 'rgba(34,211,238,0.24)' },
  'aura-season-1-stage-2': { color: '#6366F1', color2: '#22D3EE', color3: '#4338CA', softColor: 'rgba(99,102,241,0.24)' },
  'aura-season-1-stage-3': { color: '#8B5CF6', color2: '#22D3EE', color3: '#6D28D9', softColor: 'rgba(139,92,246,0.24)' },
  'aura-season-1-stage-4': { color: '#D946EF', color2: '#22D3EE', color3: '#7C3AED', softColor: 'rgba(217,70,239,0.24)' },
  'aura-season-1-secret': { color: '#C026D3', color2: '#F0ABFC', color3: '#7E22CE', softColor: 'rgba(192,38,211,0.26)' },
});

/**
 * Сезонные ауры в приложении — не градиент, а три вращающихся слоя
 * (`assets/images/season/auras/dark/*`). Копия лежит на хостинге админки, чтобы
 * превью было настоящим ассетом, а не его пересказом цветами.
 */
function seasonLayers(slug: string): CosmeticAuraLayers {
  return Object.freeze({
    baseUrl: `${ASSET_HOST}/season-auras/${slug}-base.webp`,
    flowUrl: `${ASSET_HOST}/season-auras/${slug}-flow.webp`,
    particlesUrl: `${ASSET_HOST}/season-auras/${slug}-particles.webp`,
  });
}

const SEASON_AURA_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  'aura-season-1-stage-1': 'stage-1',
  'aura-season-1-stage-2': 'stage-2',
  'aura-season-1-stage-3': 'stage-3',
  'aura-season-1-stage-4': 'stage-4',
  'aura-season-1-secret': 'secret',
});

function aura(
  id: string,
  name: string,
  defaultForSale: boolean,
  delivery: CosmeticDelivery,
): CosmeticAssetInventoryItem {
  const slug = SEASON_AURA_SLUGS[id];
  return Object.freeze({
    id,
    category: 'aura' as const,
    name,
    defaultForSale,
    delivery,
    render: slug ? 'aura-layers' as const : 'aura-ring' as const,
    palette: AURA_PALETTES[id],
    ...(slug ? { layers: seasonLayers(slug) } : {}),
  });
}

const AURA_ITEMS: readonly CosmeticAssetInventoryItem[] = [
  aura('aura-plus', 'Plus', false, 'subscription'),
  aura('aura-pro', 'Pro', false, 'subscription'),
  aura('aura-aurora', 'Аврора', false, 'legacy'),
  aura('aura-ember', 'Искра', true, 'purchase'),
  aura('aura-mint', 'Мята', true, 'purchase'),
  aura('aura-violet', 'Виолет', false, 'legacy'),
  aura('aura-coral', 'Коралл', false, 'legacy'),
  aura('aura-prism', 'Призма', true, 'purchase'),
  aura('aura-lagoon', 'Лагуна', false, 'legacy'),
  aura('aura-sunset', 'Закат', false, 'legacy'),
  aura('aura-nimbus', 'Нимб', false, 'reward'),
  aura('aura-season-1-stage-1', 'Пульс I', false, 'reward'),
  aura('aura-season-1-stage-2', 'Поток II', false, 'reward'),
  aura('aura-season-1-stage-3', 'Спектр III', false, 'reward'),
  aura('aura-season-1-stage-4', 'Импульс IV', false, 'reward'),
  aura('aura-season-1-secret', 'Секретная', false, 'reward'),
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
    render: 'image' as const,
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
