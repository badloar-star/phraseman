"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityMarkSellerInboxSeen = exports.communityListSellerInbox = exports.communityPurchasePack = exports.communityFetchPackCardsIfAccessible = exports.communityAdminModeratePack = exports.communityModerateSubmission = exports.communitySubmitPackForReview = void 0;
/**
 * Community (UGC) packs — Cloud Functions (источник правды для покупок и модерации).
 * Осколки только внутри приложения; вывода в фиат нет.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const COMMUNITY_PACKS = 'community_packs';
const COMMUNITY_SUBMISSIONS = 'community_pack_submissions';
const COMMUNITY_PURCHASES = 'community_pack_purchases';
const COMMUNITY_RATINGS = 'community_pack_ratings';
const SELLER_INBOX = 'community_seller_inbox';
/** Снят с витрины по требованию модерации; автор может доработать и снова отправить на ревью. */
const LISTING_ADMIN_REVISION = 'admin_revision_required';
/** Мягкое удаление: не в маркете; покупатели сохраняют доступ к карточкам через CF. */
const LISTING_ADMIN_REMOVED = 'admin_removed';
const CARD_MIN = 10;
const CARD_MAX = 50;
/** Фиксированная цена UGC-набора (осколки). Клиент не может задать другую — подменяем здесь. */
const UGC_PACK_PRICE_SHARDS = 10;
/** Базис 10_000 = 100 %. Часть цены не передаётся автору (остаётся в экономике приложения). */
const PLATFORM_FEE_BPS = 1500;
const UGC_CARD_THEME_KEYS = new Set([
    'neon_lime',
    'aqua_pulse',
    'magenta_pop',
    'solar_gold',
    'violet_nebula',
    'ember_coal',
]);
const UGC_CARD_BACK_DEFAULT_KEY = 'community_01_aqua_circuit';
const UGC_CARD_BACK_KEYS = new Set([
    'community_01_aqua_circuit',
    'community_02_coral_sunset',
    'community_03_violet_nebula',
    'community_04_ivory_marble',
    'community_05_neon_grid',
    'community_06_forest_rune',
    'community_07_glacier_blue',
    'community_08_ruby_velvet',
    'community_09_brass_clockwork',
    'community_10_paper_manuscript',
    'community_11_obsidian_star',
    'community_12_mint_enamel',
    'community_13_royal_purple',
    'community_14_desert_sand',
    'community_15_sakura_ink',
    'community_16_steel_blueprint',
    'community_17_cyber_lime',
    'community_18_aurora',
    'community_19_coffee_leather',
    'community_20_crystal_prism',
    'community_21_midnight_moon',
    'community_22_teal_mosaic',
    'community_23_amber_glass',
    'community_24_ink_noir',
    'community_25_garden_botanical',
    'community_26_ocean_pearl',
    'community_27_crimson_chess',
    'community_28_cloud_silver',
    'community_29_rainbow_foil',
    'community_30_slate_minimal',
]);
function trimModeratorMessage(raw) {
    const s = raw != null ? String(raw) : '';
    return s.trim().slice(0, 3500);
}
function moderatorMessageOrNull(s) {
    const t = s.trim();
    return t ? t.slice(0, 3500) : null;
}
function normalizeSubmissionPayload(raw) {
    const sourceLang = raw.sourceLang === 'es' || raw.sourceLang === 'uk' ? raw.sourceLang : 'ru';
    const titleSingle = String(raw.title ?? raw.titleRu ?? raw.titleUk ?? raw.titleEs ?? '').trim();
    let descSingle = String(raw.description ?? raw.descriptionRu ?? raw.descriptionUk ?? raw.descriptionEs ?? '').trim();
    if (!descSingle) {
        descSingle = titleSingle;
    }
    const titleRu = (sourceLang === 'ru' ? titleSingle : String(raw.titleRu ?? '').trim()).slice(0, 200);
    const titleUk = (sourceLang === 'uk' ? titleSingle : String(raw.titleUk ?? '').trim()).slice(0, 200);
    const titleEs = (sourceLang === 'es' ? titleSingle : String(raw.titleEs ?? '').trim()).slice(0, 200);
    const descriptionRu = sourceLang === 'ru' ? descSingle : String(raw.descriptionRu ?? '').trim();
    const descriptionUk = sourceLang === 'uk' ? descSingle : String(raw.descriptionUk ?? '').trim();
    const descriptionEs = sourceLang === 'es' ? descSingle : String(raw.descriptionEs ?? '').trim();
    if (!titleRu && !titleUk && !titleEs) {
        throw new https_1.HttpsError('invalid-argument', 'title required');
    }
    const n = raw.cards?.length ?? 0;
    if (n < CARD_MIN || n > CARD_MAX) {
        throw new https_1.HttpsError('invalid-argument', `Cards must be ${CARD_MIN}–${CARD_MAX}`);
    }
    const cards = raw.cards.map((c, i) => {
        const id = String(c?.id ?? `c${i + 1}`).trim() || `c${i + 1}`;
        const en = String(c?.en ?? '').trim();
        const ru = String(c?.ru ?? '').trim();
        const uk = String(c?.uk ?? '').trim();
        const es = String(c?.es ?? '').trim();
        const hasSource = !!(ru || es);
        if (!c?.id || !String(c.en).trim() || !hasSource) {
            throw new https_1.HttpsError('invalid-argument', 'Each card needs id, en, and a source-language translation');
        }
        return {
            id,
            en,
            ...(ru ? { ru } : {}),
            ...(uk ? { uk } : {}),
            ...(es ? { es } : {}),
        };
    });
    let cardThemeKey = String(raw.cardThemeKey ?? 'neon_lime').trim();
    if (!UGC_CARD_THEME_KEYS.has(cardThemeKey)) {
        cardThemeKey = 'neon_lime';
    }
    let cardBackKey = String(raw.cardBackKey ?? UGC_CARD_BACK_DEFAULT_KEY).trim();
    if (!UGC_CARD_BACK_KEYS.has(cardBackKey)) {
        cardBackKey = UGC_CARD_BACK_DEFAULT_KEY;
    }
    return {
        sourceLang,
        titleRu,
        titleUk,
        titleEs,
        descriptionRu,
        descriptionUk,
        descriptionEs,
        priceShards: UGC_PACK_PRICE_SHARDS,
        cards,
        cardThemeKey,
        cardBackKey,
    };
}
function safeCardThemeKey(p) {
    const k = String(p.cardThemeKey ?? 'neon_lime').trim();
    return UGC_CARD_THEME_KEYS.has(k) ? k : 'neon_lime';
}
function safeCardBackKey(p) {
    const k = String(p.cardBackKey ?? UGC_CARD_BACK_DEFAULT_KEY).trim();
    return UGC_CARD_BACK_KEYS.has(k) ? k : UGC_CARD_BACK_DEFAULT_KEY;
}
function parseShards(data) {
    const raw = data?.shards;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.floor(n);
}
function authorNetShards(price) {
    const fee = Math.floor((price * PLATFORM_FEE_BPS) / 10000);
    const net = price - fee;
    return Math.max(0, net);
}
function shardLedgerMeta(op, reason, updatedAtMs) {
    return {
        shards_updated_at_ms: updatedAtMs,
        shards_updated_op: op,
        shards_updated_reason: reason,
        updatedAt: updatedAtMs,
    };
}
/**
 * Отправка набора на модерацию (создаёт документ в community_pack_submissions).
 * Доверие к authorStableId — как к клиентским путям users/{stableId} в текущей архитектуре; усиление через auth-мост — отдельная задача.
 */
exports.communitySubmitPackForReview = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const callerAuthUid = request.auth.uid;
    const authorStableId = String(request.data?.authorStableId ?? '').trim();
    const rawPayload = request.data?.payload;
    const updatePackId = String(request.data?.updatePackId ?? '').trim();
    if (!authorStableId) {
        throw new https_1.HttpsError('invalid-argument', 'authorStableId required');
    }
    if (!rawPayload) {
        throw new https_1.HttpsError('invalid-argument', 'payload required');
    }
    const payload = normalizeSubmissionPayload(rawPayload);
    const db = admin.firestore();
    const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc();
    const now = Date.now();
    if (updatePackId) {
        const dup = await db
            .collection(COMMUNITY_SUBMISSIONS)
            .where('editTargetPackId', '==', updatePackId)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
        if (!dup.empty) {
            throw new https_1.HttpsError('failed-precondition', 'Edit review already pending');
        }
        const packRef = db.collection(COMMUNITY_PACKS).doc(updatePackId);
        await db.runTransaction(async (tx) => {
            const pSnap = await tx.get(packRef);
            if (!pSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Pack not found');
            }
            const pd = pSnap.data();
            if (String(pd.authorStableId ?? '') !== authorStableId) {
                throw new https_1.HttpsError('permission-denied', 'Not your pack');
            }
            const st = String(pd.listingStatus ?? '');
            if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION) {
                throw new https_1.HttpsError('failed-precondition', 'Pack not editable');
            }
            const previousPayloadSnapshot = {
                titleRu: pd.titleRu ?? '',
                titleUk: pd.titleUk ?? '',
                titleEs: pd.titleEs ?? '',
                descriptionRu: pd.descriptionRu ?? '',
                descriptionUk: pd.descriptionUk ?? '',
                descriptionEs: pd.descriptionEs ?? '',
                priceShards: pd.priceShards ?? 0,
                cards: pd.cards ?? [],
                cardThemeKey: pd.cardThemeKey ?? null,
                cardBackKey: pd.cardBackKey ?? null,
            };
            tx.set(subRef, {
                status: 'pending',
                authorStableId,
                submittedAt: now,
                payload,
                submissionKind: 'edit',
                editTargetPackId: updatePackId,
                previousPayloadSnapshot,
                callerAuthUid,
            });
            tx.update(packRef, { listingStatus: 'update_pending', updatedAt: now });
        });
        return { submissionId: subRef.id };
    }
    await subRef.set({
        status: 'pending',
        authorStableId,
        submittedAt: now,
        payload,
        submissionKind: 'create',
        callerAuthUid,
    });
    return { submissionId: subRef.id };
});
/**
 * Модерация: approve | reject | request_changes. Только custom claim admin.
 * Опциональный moderatorMessage (и legacy rejectReason) — в заявке и в inbox автора.
 */
exports.communityModerateSubmission = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const submissionId = String(request.data?.submissionId ?? '').trim();
    const action = String(request.data?.action ?? '').trim();
    const moderatorMessage = trimModeratorMessage(request.data?.moderatorMessage);
    const legacyReject = trimModeratorMessage(request.data?.rejectReason);
    const effectiveMessage = moderatorMessage || legacyReject;
    if (!submissionId || !['approve', 'reject', 'request_changes'].includes(action)) {
        throw new https_1.HttpsError('invalid-argument', 'submissionId and action approve|reject|request_changes required');
    }
    const db = admin.firestore();
    const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc(submissionId);
    let approvedPackId = null;
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(subRef);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Submission not found');
        }
        const d = snap.data();
        if (d.status !== 'pending') {
            throw new https_1.HttpsError('failed-precondition', 'Submission is not pending');
        }
        const authorStableId = String(d.authorStableId ?? '').trim();
        const now = Date.now();
        const msgForInbox = moderatorMessageOrNull(effectiveMessage);
        const writeModerationInbox = (result) => {
            if (!authorStableId)
                return;
            const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
            tx.set(inboxRef, {
                type: 'moderation_result',
                result,
                submissionId,
                message: msgForInbox,
                titleRu: (d.payload?.titleRu ?? '').trim().slice(0, 200) || null,
                titleUk: (d.payload?.titleUk ?? '').trim().slice(0, 200) || null,
                titleEs: (d.payload?.titleEs ?? '').trim().slice(0, 200) || null,
                createdAt: now,
                seen: false,
            });
        };
        const editTargetEarly = String(d.editTargetPackId ?? '').trim();
        let editPackExistsForRestore = false;
        if (editTargetEarly && (action === 'reject' || action === 'request_changes')) {
            const ps = await tx.get(db.collection(COMMUNITY_PACKS).doc(editTargetEarly));
            editPackExistsForRestore = ps.exists;
        }
        if (action === 'reject') {
            tx.update(subRef, {
                status: 'rejected',
                reviewedAt: now,
                rejectReason: effectiveMessage,
                moderatorMessage: msgForInbox,
            });
            if (editTargetEarly && editPackExistsForRestore) {
                tx.update(db.collection(COMMUNITY_PACKS).doc(editTargetEarly), { listingStatus: 'published', updatedAt: now });
            }
            writeModerationInbox('rejected');
            return;
        }
        if (action === 'request_changes') {
            tx.update(subRef, {
                status: 'needs_revision',
                reviewedAt: now,
                moderatorMessage: effectiveMessage,
            });
            if (editTargetEarly && editPackExistsForRestore) {
                tx.update(db.collection(COMMUNITY_PACKS).doc(editTargetEarly), { listingStatus: 'published', updatedAt: now });
            }
            writeModerationInbox('revision_requested');
            return;
        }
        const rawPayload = d.payload;
        if (!rawPayload) {
            throw new https_1.HttpsError('failed-precondition', 'Submission has no payload');
        }
        const payload = normalizeSubmissionPayload(rawPayload);
        const themeKey = safeCardThemeKey(payload);
        const cardBackKey = safeCardBackKey(payload);
        const editTarget = String(d.editTargetPackId ?? '').trim();
        if (editTarget) {
            const packRef = db.collection(COMMUNITY_PACKS).doc(editTarget);
            const packSnap = await tx.get(packRef);
            if (!packSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Pack to update not found');
            }
            const existing = (packSnap.data() ?? {});
            tx.set(packRef, {
                ...existing,
                listingStatus: 'published',
                authorStableId: d.authorStableId ?? existing.authorStableId ?? null,
                submissionId: editTarget,
                titleRu: payload.titleRu.trim(),
                titleUk: payload.titleUk.trim(),
                titleEs: (payload.titleEs ?? '').trim() || null,
                descriptionRu: (payload.descriptionRu ?? '').trim() || null,
                descriptionUk: (payload.descriptionUk ?? '').trim() || null,
                descriptionEs: (payload.descriptionEs ?? '').trim() || null,
                priceShards: Math.floor(Number(payload.priceShards)),
                cards: payload.cards,
                cardCount: payload.cards.length,
                cardThemeKey: themeKey,
                cardBackKey,
                updatedAt: now,
            });
            tx.update(subRef, {
                status: 'approved',
                reviewedAt: now,
                publishedPackId: editTarget,
                moderatorMessage: msgForInbox,
            });
            writeModerationInbox('approved');
            approvedPackId = editTarget;
            return;
        }
        const packRef = db.collection(COMMUNITY_PACKS).doc(submissionId);
        const packSnap = await tx.get(packRef);
        if (packSnap.exists) {
            throw new https_1.HttpsError('already-exists', 'Published pack already exists for this id');
        }
        tx.set(packRef, {
            listingStatus: 'published',
            authorStableId: d.authorStableId ?? null,
            submissionId,
            titleRu: payload.titleRu.trim(),
            titleUk: payload.titleUk.trim(),
            titleEs: (payload.titleEs ?? '').trim() || null,
            descriptionRu: (payload.descriptionRu ?? '').trim() || null,
            descriptionUk: (payload.descriptionUk ?? '').trim() || null,
            descriptionEs: (payload.descriptionEs ?? '').trim() || null,
            priceShards: Math.floor(Number(payload.priceShards)),
            cards: payload.cards,
            cardCount: payload.cards.length,
            cardThemeKey: themeKey,
            cardBackKey,
            salesCount: 0,
            publishedAt: now,
            updatedAt: now,
        });
        tx.update(subRef, {
            status: 'approved',
            reviewedAt: now,
            publishedPackId: submissionId,
            moderatorMessage: msgForInbox,
        });
        writeModerationInbox('approved');
        approvedPackId = submissionId;
    });
    return { ok: true, publishedPackId: action === 'approve' ? approvedPackId : null };
});
function buildSellerInboxModerationRow(params) {
    const row = {
        type: 'moderation_result',
        result: params.result,
        packId: params.packId,
        createdAt: params.now,
        seen: false,
    };
    if (params.message)
        row.message = params.message;
    if (params.titleRu)
        row.titleRu = params.titleRu;
    if (params.titleUk)
        row.titleUk = params.titleUk;
    if (params.titleEs)
        row.titleEs = params.titleEs;
    return row;
}
/**
 * Админ: снять набор с витрины на доработку или удалить (мягко). Inbox автору — как при модерации заявок.
 * Явный регион us-central1 — как getFunctions в админке и в приложении.
 */
exports.communityAdminModeratePack = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const packId = String(request.data?.packId ?? '').trim();
    const action = String(request.data?.action ?? '').trim();
    const moderatorMessage = trimModeratorMessage(request.data?.moderatorMessage);
    const msgForInbox = moderatorMessageOrNull(moderatorMessage);
    if (!packId || !['require_revision', 'remove'].includes(action)) {
        throw new https_1.HttpsError('invalid-argument', 'packId and action require_revision|remove required');
    }
    const db = admin.firestore();
    const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
    const run = async () => {
        await db.runTransaction(async (tx) => {
            const packSnap = await tx.get(packRef);
            if (!packSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Pack not found');
            }
            const pack = packSnap.data();
            const st = String(pack.listingStatus ?? '');
            if (st === LISTING_ADMIN_REMOVED) {
                throw new https_1.HttpsError('failed-precondition', 'Pack already removed');
            }
            if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION) {
                throw new https_1.HttpsError('failed-precondition', 'Pack is not active for admin action');
            }
            const authorStableId = String(pack.authorStableId ?? '').trim();
            const now = Date.now();
            const tRu = String(pack.titleRu ?? '').trim().slice(0, 200) || null;
            const tUk = String(pack.titleUk ?? '').trim().slice(0, 200) || null;
            const tEs = String(pack.titleEs ?? '').trim().slice(0, 200) || null;
            const writeInbox = (result) => {
                if (!authorStableId)
                    return;
                const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
                tx.set(inboxRef, buildSellerInboxModerationRow({
                    result,
                    packId,
                    now,
                    message: msgForInbox,
                    titleRu: tRu,
                    titleUk: tUk,
                    titleEs: tEs,
                }));
            };
            const patchAdminMessage = (base) => {
                if (msgForInbox) {
                    return { ...base, adminLastMessage: msgForInbox };
                }
                return { ...base, adminLastMessage: admin.firestore.FieldValue.delete() };
            };
            if (action === 'require_revision') {
                if (st === 'update_pending') {
                    throw new https_1.HttpsError('failed-precondition', 'У набора уже висит заявка на правку в очереди — обработайте её во вкладке заявок.');
                }
                tx.update(packRef, patchAdminMessage({
                    listingStatus: LISTING_ADMIN_REVISION,
                    updatedAt: now,
                    adminLastAction: 'require_revision',
                    adminLastActionAt: now,
                }));
                writeInbox('revision_requested');
                return;
            }
            if (st === 'update_pending') {
                throw new https_1.HttpsError('failed-precondition', 'У набора висит заявка на правку в очереди — сначала заявки.');
            }
            tx.update(packRef, patchAdminMessage({
                listingStatus: LISTING_ADMIN_REMOVED,
                updatedAt: now,
                adminLastAction: 'remove',
                adminLastActionAt: now,
            }));
            writeInbox('pack_removed');
        });
    };
    try {
        await run();
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        const m = e instanceof Error ? e.message : String(e);
        console.error('communityAdminModeratePack failed', m, e);
        throw new https_1.HttpsError('internal', m || 'server');
    }
    return { ok: true };
});
/**
 * Карточки набора, если пользователь — автор (кроме admin_removed) или покупатель.
 */
exports.communityFetchPackCardsIfAccessible = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const stableId = String(request.data?.stableId ?? '').trim();
    const packId = String(request.data?.packId ?? '').trim();
    if (!stableId || !packId) {
        throw new https_1.HttpsError('invalid-argument', 'stableId and packId required');
    }
    const db = admin.firestore();
    const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
    const packSnap = await packRef.get();
    if (!packSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Pack not found');
    }
    const pack = packSnap.data();
    const st = String(pack.listingStatus ?? '');
    const authorStableId = String(pack.authorStableId ?? '').trim();
    if (stableId === authorStableId) {
        if (st === LISTING_ADMIN_REMOVED) {
            throw new https_1.HttpsError('permission-denied', 'Pack was removed');
        }
        const cards = Array.isArray(pack.cards) ? pack.cards : [];
        return { ok: true, cards };
    }
    const purchaseId = `${stableId}__${packId}`;
    const purSnap = await db.collection(COMMUNITY_PURCHASES).doc(purchaseId).get();
    if (!purSnap.exists) {
        throw new https_1.HttpsError('permission-denied', 'No access');
    }
    if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION && st !== LISTING_ADMIN_REMOVED) {
        throw new https_1.HttpsError('failed-precondition', 'Pack unavailable');
    }
    const cards = Array.isArray(pack.cards) ? pack.cards : [];
    return { ok: true, cards };
});
/**
 * Покупка опубликованного набора: списание у покупателя, начисление автору (за вычетом внутриигровой комиссии), запись покупки, inbox продавцу.
 */
exports.communityPurchasePack = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const buyerStableId = String(request.data?.buyerStableId ?? '').trim();
    const packId = String(request.data?.packId ?? '').trim();
    const buyerDisplayName = String(request.data?.buyerDisplayName ?? 'Игрок').trim().slice(0, 80);
    if (!buyerStableId || !packId) {
        throw new https_1.HttpsError('invalid-argument', 'buyerStableId and packId required');
    }
    const db = admin.firestore();
    const purchaseId = `${buyerStableId}__${packId}`;
    const purchaseRef = db.collection(COMMUNITY_PURCHASES).doc(purchaseId);
    const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
    const buyerRef = db.collection('users').doc(buyerStableId);
    const result = await db.runTransaction(async (tx) => {
        const [pSnap, purSnap, buyerSnap] = await Promise.all([
            tx.get(packRef),
            tx.get(purchaseRef),
            tx.get(buyerRef),
        ]);
        if (!pSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Pack not found');
        }
        const pack = pSnap.data();
        if (pack.listingStatus !== 'published') {
            throw new https_1.HttpsError('failed-precondition', 'Pack is not published');
        }
        const authorStableId = String(pack.authorStableId ?? '').trim();
        if (!authorStableId) {
            throw new https_1.HttpsError('failed-precondition', 'Pack has no author');
        }
        if (authorStableId === buyerStableId) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot buy your own pack');
        }
        const price = UGC_PACK_PRICE_SHARDS;
        if (purSnap.exists) {
            return { alreadyOwned: true, priceShards: price };
        }
        const buyerShards = parseShards(buyerSnap.data());
        if (buyerShards < price) {
            throw new https_1.HttpsError('failed-precondition', 'Insufficient shards');
        }
        const authorRef = db.collection('users').doc(authorStableId);
        const authorSnap = await tx.get(authorRef);
        const authorShards = parseShards(authorSnap.data());
        const net = authorNetShards(price);
        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        const buyerBalanceAfter = buyerShards - price;
        const authorBalanceAfter = authorShards + net;
        tx.set(purchaseRef, {
            packId,
            buyerStableId,
            authorStableId,
            priceShards: price,
            authorNetShards: net,
            platformFeeShards: price - net,
            createdAt: now,
            buyerDisplayName,
        });
        tx.set(buyerRef, {
            shards: buyerBalanceAfter,
            ...shardLedgerMeta('spend', 'community_pack_purchase', now),
        }, { merge: true });
        tx.set(authorRef, {
            shards: authorBalanceAfter,
            ...shardLedgerMeta('earn', 'community_pack_sale', now),
        }, { merge: true });
        tx.set(buyerRef.collection('shard_log').doc(), {
            ts: nowIso,
            type: 'spend',
            amount: price,
            reason: 'community_pack_purchase',
            packId,
            authorStableId,
            balanceBefore: buyerShards,
            balanceAfter: buyerBalanceAfter,
        });
        tx.set(authorRef.collection('shard_log').doc(), {
            ts: nowIso,
            type: 'earn',
            amount: net,
            grossAmount: price,
            platformFeeShards: price - net,
            reason: 'community_pack_sale',
            packId,
            buyerStableId,
            balanceBefore: authorShards,
            balanceAfter: authorBalanceAfter,
        });
        tx.update(packRef, {
            salesCount: admin.firestore.FieldValue.increment(1),
            updatedAt: now,
        });
        const inboxRef = authorRef.collection(SELLER_INBOX).doc(purchaseId);
        tx.set(inboxRef, {
            type: 'pack_sold',
            packId,
            buyerStableId,
            buyerDisplayName,
            grossShards: price,
            authorNetShards: net,
            createdAt: now,
            seen: false,
        });
        return {
            alreadyOwned: false,
            priceShards: price,
            authorNetShards: net,
            buyerBalanceAfter,
        };
    });
    return result;
});
/**
 * Список непрочитанных событий продажи для автора (для модалки при входе).
 * Доверие к authorStableId — как у communityPurchasePack.
 */
exports.communityListSellerInbox = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authorStableId = String(request.data?.authorStableId ?? '').trim();
    if (!authorStableId) {
        throw new https_1.HttpsError('invalid-argument', 'authorStableId required');
    }
    const limit = Math.min(50, Math.max(1, Math.floor(Number(request.data?.limit) || 20)));
    const db = admin.firestore();
    const snap = await db
        .collection('users')
        .doc(authorStableId)
        .collection(SELLER_INBOX)
        .where('seen', '==', false)
        .limit(limit)
        .get();
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { events };
});
/**
 * Пометить события inbox как просмотренные (для модалки «уже показали»).
 */
exports.communityMarkSellerInboxSeen = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authorStableId = String(request.data?.authorStableId ?? '').trim();
    const eventIds = request.data?.eventIds;
    if (!authorStableId || !Array.isArray(eventIds) || eventIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'authorStableId and eventIds[] required');
    }
    const ids = eventIds.map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
    const db = admin.firestore();
    const batch = db.batch();
    const now = Date.now();
    for (const id of ids) {
        const ref = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc(id);
        batch.set(ref, { seen: true, seenAt: now }, { merge: true });
    }
    await batch.commit();
    return { ok: true };
});
//# sourceMappingURL=community_packs.js.map