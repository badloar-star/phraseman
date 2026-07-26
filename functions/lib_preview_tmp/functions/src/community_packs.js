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
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const flashcard_registry_mutations_1 = require("./content_factory/flashcard_registry_mutations");
const COMMUNITY_PACKS = 'community_packs';
const COMMUNITY_SUBMISSIONS = 'community_pack_submissions';
const COMMUNITY_PURCHASES = 'community_pack_purchases';
const COMMUNITY_RATINGS = 'community_pack_ratings';
const SELLER_INBOX = 'community_seller_inbox';
const FLASHCARD_SEMANTIC_KEYS = 'content_factory_flashcard_semantic_keys';
const FLASHCARD_REGISTRY_CONFIG = 'flashcard_semantic_registry';
async function syncFlashcardRegistryPackMutation(tx, db, previous, next) {
    const plan = (0, flashcard_registry_mutations_1.planFlashcardRegistryPackMutation)(previous, next).filter((item) => item.addSources.length || item.removeSources.length);
    if (!plan.length)
        return;
    const configRef = db.collection('content_factory_config').doc(FLASHCARD_REGISTRY_CONFIG);
    const [configSnapshot, ...snapshots] = await Promise.all([
        tx.get(configRef),
        ...plan.map((item) => tx.get(db.collection(FLASHCARD_SEMANTIC_KEYS).doc(item.docId))),
    ]);
    const config = configSnapshot.data() ?? {};
    const currentGeneration = Number.isSafeInteger(Number(config.catalogGeneration)) ? Number(config.catalogGeneration) : 0;
    const registryIsVerified = config.mode === 'registry'
        && config.manifestComplete === true
        && Number(config.verifiedGeneration) === currentGeneration;
    for (let index = 0; index < plan.length; index += 1) {
        const mutation = plan[index];
        const ref = snapshots[index].ref;
        const current = snapshots[index].data() ?? {};
        if (snapshots[index].exists && (current.partitionKey !== mutation.partitionKey || current.canonicalKey !== mutation.canonicalKey))
            throw new https_1.HttpsError('aborted', 'flashcard_registry_hash_collision');
        const next = (0, flashcard_registry_mutations_1.applyFlashcardRegistryDocumentMutation)(snapshots[index].exists ? { docId: mutation.docId, partitionKey: String(current.partitionKey), canonicalKey: String(current.canonicalKey), sources: Array.isArray(current.sources) ? current.sources : [] } : null, mutation);
        if (next)
            tx.set(ref, { ...next, updatedAt: Date.now() }, { merge: true });
        else if (snapshots[index].exists)
            tx.delete(ref);
    }
    tx.set(configRef, registryIsVerified
        ? { catalogGeneration: currentGeneration + 1, verifiedGeneration: currentGeneration + 1, manifestComplete: true, updatedAt: Date.now() }
        : { catalogGeneration: currentGeneration + 1, manifestComplete: false, updatedAt: Date.now() }, { merge: true });
}
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
function preserveExistingRichCardFields(existing, incoming) {
    const byId = new Map((Array.isArray(existing) ? existing : []).filter((item) => !!item && typeof item === 'object' && !Array.isArray(item)).map((item) => [String(item.id ?? ''), item]));
    return incoming.map((card) => {
        const prior = byId.get(card.id);
        if (!prior)
            return card;
        const sourceReferences = card.sourceReferences?.length ? card.sourceReferences : Array.isArray(prior.sourceReferences) ? prior.sourceReferences.map(String).filter(Boolean) : undefined;
        return { ...card, richSchemaVersion: card.richSchemaVersion ?? (Number(prior.richSchemaVersion) === 1 ? 1 : undefined), exampleTarget: card.exampleTarget || String(prior.exampleTarget ?? '').trim() || undefined, exampleSource: card.exampleSource || String(prior.exampleSource ?? '').trim() || undefined, note: card.note || String(prior.note ?? '').trim() || undefined, sourceReferences };
    });
}
function normalizeCommunityPackStudyTarget(raw) {
    return raw === 'fr' ? 'fr' : 'en';
}
function requireMatchingPackStudyTarget(requested, pack) {
    const requestStudyTarget = normalizeCommunityPackStudyTarget(requested);
    const packStudyTarget = normalizeCommunityPackStudyTarget(pack.studyTarget);
    if (requestStudyTarget !== packStudyTarget) {
        throw new https_1.HttpsError('failed-precondition', 'Pack study target mismatch');
    }
    return packStudyTarget;
}
function trimModeratorMessage(raw) {
    const s = raw != null ? String(raw) : '';
    return s.trim().slice(0, 3500);
}
function moderatorMessageOrNull(s) {
    const t = s.trim();
    return t ? t.slice(0, 3500) : null;
}
function normalizeSubmissionPayload(raw) {
    const studyTarget = normalizeCommunityPackStudyTarget(raw.studyTarget);
    if (studyTarget !== 'en') {
        throw new https_1.HttpsError('failed-precondition', 'French community packs are source-gated');
    }
    const sourceLang = raw.sourceLang === 'uk' ||
        raw.sourceLang === 'es' ||
        raw.sourceLang === 'pt-BR' ||
        raw.sourceLang === 'vi' ||
        raw.sourceLang === 'id' ||
        raw.sourceLang === 'tr' ||
        raw.sourceLang === 'pl'
        ? raw.sourceLang
        : 'ru';
    const titleSingle = String(raw.title ?? raw.titleRu ?? raw.titleUk ?? raw.titleEs ?? raw.titlePtBr ?? raw.titleVi ?? raw.titleId ?? raw.titleTr ?? raw.titlePl ?? '').trim();
    let descSingle = String(raw.description ?? raw.descriptionRu ?? raw.descriptionUk ?? raw.descriptionEs ?? raw.descriptionPtBr ?? raw.descriptionVi ?? raw.descriptionId ?? raw.descriptionTr ?? raw.descriptionPl ?? '').trim();
    if (!descSingle) {
        descSingle = titleSingle;
    }
    const titleRu = (sourceLang === 'ru' ? titleSingle : String(raw.titleRu ?? '').trim()).slice(0, 200);
    const titleUk = (sourceLang === 'uk' ? titleSingle : String(raw.titleUk ?? '').trim()).slice(0, 200);
    const titleEs = (sourceLang === 'es' ? titleSingle : String(raw.titleEs ?? '').trim()).slice(0, 200);
    const titlePtBr = (sourceLang === 'pt-BR' ? titleSingle : String(raw.titlePtBr ?? '').trim()).slice(0, 200);
    const titleVi = (sourceLang === 'vi' ? titleSingle : String(raw.titleVi ?? '').trim()).slice(0, 200);
    const titleId = (sourceLang === 'id' ? titleSingle : String(raw.titleId ?? '').trim()).slice(0, 200);
    const titleTr = (sourceLang === 'tr' ? titleSingle : String(raw.titleTr ?? '').trim()).slice(0, 200);
    const titlePl = (sourceLang === 'pl' ? titleSingle : String(raw.titlePl ?? '').trim()).slice(0, 200);
    // Per-field length caps: only card COUNT (10–50) and titles (200) were bounded,
    // so an authenticated user could inflate a submission doc toward Firestore's 1MB
    // limit with huge card/description strings. Cap generously — far above any real
    // card/description — so legitimate content is never clipped (DoS / storage abuse).
    const DESC_MAX = 3500;
    const descriptionRu = (sourceLang === 'ru' ? descSingle : String(raw.descriptionRu ?? '').trim()).slice(0, DESC_MAX);
    const descriptionUk = (sourceLang === 'uk' ? descSingle : String(raw.descriptionUk ?? '').trim()).slice(0, DESC_MAX);
    const descriptionEs = (sourceLang === 'es' ? descSingle : String(raw.descriptionEs ?? '').trim()).slice(0, DESC_MAX);
    const descriptionPtBr = (sourceLang === 'pt-BR' ? descSingle : String(raw.descriptionPtBr ?? '').trim()).slice(0, DESC_MAX);
    const descriptionVi = (sourceLang === 'vi' ? descSingle : String(raw.descriptionVi ?? '').trim()).slice(0, DESC_MAX);
    const descriptionId = (sourceLang === 'id' ? descSingle : String(raw.descriptionId ?? '').trim()).slice(0, DESC_MAX);
    const descriptionTr = (sourceLang === 'tr' ? descSingle : String(raw.descriptionTr ?? '').trim()).slice(0, DESC_MAX);
    const descriptionPl = (sourceLang === 'pl' ? descSingle : String(raw.descriptionPl ?? '').trim()).slice(0, DESC_MAX);
    if (!titleRu && !titleUk && !titleEs && !titlePtBr && !titleVi && !titleId && !titleTr && !titlePl) {
        throw new https_1.HttpsError('invalid-argument', 'title required');
    }
    if (!Array.isArray(raw.cards)) {
        throw new https_1.HttpsError('invalid-argument', 'cards must be an array');
    }
    const n = raw.cards.length;
    if (n < CARD_MIN || n > CARD_MAX) {
        throw new https_1.HttpsError('invalid-argument', `Cards must be ${CARD_MIN}–${CARD_MAX}`);
    }
    const CARD_FIELD_MAX = 1000; // generous per-card string cap (see DESC_MAX note above)
    const cards = raw.cards.map((c, i) => {
        const id = (String(c?.id ?? `c${i + 1}`).trim() || `c${i + 1}`).slice(0, 200);
        const en = String(c?.en ?? '').trim().slice(0, CARD_FIELD_MAX);
        const ru = String(c?.ru ?? '').trim().slice(0, CARD_FIELD_MAX);
        const uk = String(c?.uk ?? '').trim().slice(0, CARD_FIELD_MAX);
        const es = String(c?.es ?? '').trim().slice(0, CARD_FIELD_MAX);
        const sourceLocales = {
            'pt-BR': String(c?.sourceLocales?.['pt-BR'] ?? '').trim().slice(0, CARD_FIELD_MAX),
            vi: String(c?.sourceLocales?.vi ?? '').trim().slice(0, CARD_FIELD_MAX),
            id: String(c?.sourceLocales?.id ?? '').trim().slice(0, CARD_FIELD_MAX),
            tr: String(c?.sourceLocales?.tr ?? '').trim().slice(0, CARD_FIELD_MAX),
            pl: String(c?.sourceLocales?.pl ?? '').trim().slice(0, CARD_FIELD_MAX),
        };
        const hasSource = !!(ru || es || Object.values(sourceLocales).some(Boolean));
        if (!c?.id || !String(c.en).trim() || !hasSource) {
            throw new https_1.HttpsError('invalid-argument', 'Each card needs id, en, and a source-language translation');
        }
        return {
            id,
            en,
            ...(ru ? { ru } : {}),
            ...(uk ? { uk } : {}),
            ...(es ? { es } : {}),
            sourceLocales: {
                ...(sourceLocales['pt-BR'] ? { 'pt-BR': sourceLocales['pt-BR'] } : {}),
                ...(sourceLocales.vi ? { vi: sourceLocales.vi } : {}),
                ...(sourceLocales.id ? { id: sourceLocales.id } : {}),
                ...(sourceLocales.tr ? { tr: sourceLocales.tr } : {}),
                ...(sourceLocales.pl ? { pl: sourceLocales.pl } : {}),
            },
            ...(Number(c.richSchemaVersion) === 1 ? { richSchemaVersion: 1 } : {}),
            ...(String(c.exampleTarget ?? '').trim() ? { exampleTarget: String(c.exampleTarget).trim().slice(0, CARD_FIELD_MAX) } : {}),
            ...(String(c.exampleSource ?? '').trim() ? { exampleSource: String(c.exampleSource).trim().slice(0, CARD_FIELD_MAX) } : {}),
            ...(String(c.note ?? '').trim() ? { note: String(c.note).trim().slice(0, CARD_FIELD_MAX) } : {}),
            ...(Array.isArray(c.sourceReferences) ? { sourceReferences: [...new Set(c.sourceReferences.map(String).map((value) => value.trim().slice(0, 500)).filter(Boolean))].slice(0, 50) } : {}),
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
        studyTarget,
        sourceLang,
        titleRu,
        titleUk,
        titleEs,
        titlePtBr,
        titleVi,
        titleId,
        titleTr,
        titlePl,
        descriptionRu,
        descriptionUk,
        descriptionEs,
        descriptionPtBr,
        descriptionVi,
        descriptionId,
        descriptionTr,
        descriptionPl,
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
exports.communitySubmitPackForReview = (0, https_1.onCall)({ enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const callerAuthUid = request.auth.uid;
    const requestedAuthorStableId = String(request.data?.authorStableId ?? '').trim();
    const rawPayload = request.data?.payload;
    const updatePackId = String(request.data?.updatePackId ?? '').trim();
    if (!requestedAuthorStableId) {
        throw new https_1.HttpsError('invalid-argument', 'authorStableId required');
    }
    if (!rawPayload) {
        throw new https_1.HttpsError('invalid-argument', 'payload required');
    }
    const payload = normalizeSubmissionPayload(rawPayload);
    const db = admin.firestore();
    const authorStableId = await (0, auth_identity_1.resolveStableUidForAuth)(db, callerAuthUid, requestedAuthorStableId, {
        requireKnownIdentity: true,
    });
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
                titlePtBr: pd.titlePtBr ?? '',
                titleVi: pd.titleVi ?? '',
                titleId: pd.titleId ?? '',
                titleTr: pd.titleTr ?? '',
                titlePl: pd.titlePl ?? '',
                descriptionRu: pd.descriptionRu ?? '',
                descriptionUk: pd.descriptionUk ?? '',
                descriptionEs: pd.descriptionEs ?? '',
                descriptionPtBr: pd.descriptionPtBr ?? '',
                descriptionVi: pd.descriptionVi ?? '',
                descriptionId: pd.descriptionId ?? '',
                descriptionTr: pd.descriptionTr ?? '',
                descriptionPl: pd.descriptionPl ?? '',
                priceShards: pd.priceShards ?? 0,
                cards: pd.cards ?? [],
                cardThemeKey: pd.cardThemeKey ?? null,
                cardBackKey: pd.cardBackKey ?? null,
                studyTarget: normalizeCommunityPackStudyTarget(pd.studyTarget),
            };
            if (st === 'published')
                await syncFlashcardRegistryPackMutation(tx, db, { id: updatePackId, studyTarget: normalizeCommunityPackStudyTarget(pd.studyTarget), cards: Array.isArray(pd.cards) ? pd.cards : [] }, null);
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
exports.communityModerateSubmission = (0, https_1.onCall)({ enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
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
            const studyTarget = normalizeCommunityPackStudyTarget(d.payload?.studyTarget);
            const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
            tx.set(inboxRef, {
                type: 'moderation_result',
                result,
                submissionId,
                studyTarget,
                message: msgForInbox,
                titleRu: (d.payload?.titleRu ?? '').trim().slice(0, 200) || null,
                titleUk: (d.payload?.titleUk ?? '').trim().slice(0, 200) || null,
                titleEs: (d.payload?.titleEs ?? '').trim().slice(0, 200) || null,
                titlePtBr: (d.payload?.titlePtBr ?? '').trim().slice(0, 200) || null,
                titleVi: (d.payload?.titleVi ?? '').trim().slice(0, 200) || null,
                titleId: (d.payload?.titleId ?? '').trim().slice(0, 200) || null,
                titleTr: (d.payload?.titleTr ?? '').trim().slice(0, 200) || null,
                titlePl: (d.payload?.titlePl ?? '').trim().slice(0, 200) || null,
                createdAt: now,
                seen: false,
            });
        };
        const editTargetEarly = String(d.editTargetPackId ?? '').trim();
        let editPackExistsForRestore = false;
        let editPackForRestore = null;
        if (editTargetEarly && (action === 'reject' || action === 'request_changes')) {
            const ps = await tx.get(db.collection(COMMUNITY_PACKS).doc(editTargetEarly));
            editPackExistsForRestore = ps.exists;
            editPackForRestore = ps.exists ? ps.data() : null;
        }
        if (action === 'reject') {
            if (editTargetEarly && editPackExistsForRestore) {
                await syncFlashcardRegistryPackMutation(tx, db, null, { id: editTargetEarly, studyTarget: normalizeCommunityPackStudyTarget(editPackForRestore?.studyTarget), cards: Array.isArray(editPackForRestore?.cards) ? editPackForRestore.cards : [] });
            }
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
            if (editTargetEarly && editPackExistsForRestore) {
                await syncFlashcardRegistryPackMutation(tx, db, null, { id: editTargetEarly, studyTarget: normalizeCommunityPackStudyTarget(editPackForRestore?.studyTarget), cards: Array.isArray(editPackForRestore?.cards) ? editPackForRestore.cards : [] });
            }
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
            const existingStudyTarget = normalizeCommunityPackStudyTarget(existing.studyTarget);
            if (existingStudyTarget !== normalizeCommunityPackStudyTarget(payload.studyTarget)) {
                throw new https_1.HttpsError('failed-precondition', 'Cannot change pack study target');
            }
            const cardsWithRichFallback = preserveExistingRichCardFields(existing.cards, payload.cards);
            await syncFlashcardRegistryPackMutation(tx, db, null, { id: editTarget, studyTarget: existingStudyTarget, cards: cardsWithRichFallback });
            tx.set(packRef, {
                ...existing,
                listingStatus: 'published',
                authorStableId: d.authorStableId ?? existing.authorStableId ?? null,
                submissionId: editTarget,
                studyTarget: existingStudyTarget,
                titleRu: payload.titleRu.trim(),
                titleUk: payload.titleUk.trim(),
                titleEs: (payload.titleEs ?? '').trim() || null,
                titlePtBr: (payload.titlePtBr ?? '').trim() || null,
                titleVi: (payload.titleVi ?? '').trim() || null,
                titleId: (payload.titleId ?? '').trim() || null,
                titleTr: (payload.titleTr ?? '').trim() || null,
                titlePl: (payload.titlePl ?? '').trim() || null,
                descriptionRu: (payload.descriptionRu ?? '').trim() || null,
                descriptionUk: (payload.descriptionUk ?? '').trim() || null,
                descriptionEs: (payload.descriptionEs ?? '').trim() || null,
                descriptionPtBr: (payload.descriptionPtBr ?? '').trim() || null,
                descriptionVi: (payload.descriptionVi ?? '').trim() || null,
                descriptionId: (payload.descriptionId ?? '').trim() || null,
                descriptionTr: (payload.descriptionTr ?? '').trim() || null,
                descriptionPl: (payload.descriptionPl ?? '').trim() || null,
                priceShards: Math.floor(Number(payload.priceShards)),
                cards: cardsWithRichFallback,
                cardCount: cardsWithRichFallback.length,
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
        await syncFlashcardRegistryPackMutation(tx, db, null, { id: submissionId, studyTarget: normalizeCommunityPackStudyTarget(payload.studyTarget), cards: payload.cards });
        tx.set(packRef, {
            listingStatus: 'published',
            authorStableId: d.authorStableId ?? null,
            submissionId,
            studyTarget: normalizeCommunityPackStudyTarget(payload.studyTarget),
            titleRu: payload.titleRu.trim(),
            titleUk: payload.titleUk.trim(),
            titleEs: (payload.titleEs ?? '').trim() || null,
            titlePtBr: (payload.titlePtBr ?? '').trim() || null,
            titleVi: (payload.titleVi ?? '').trim() || null,
            titleId: (payload.titleId ?? '').trim() || null,
            titleTr: (payload.titleTr ?? '').trim() || null,
            titlePl: (payload.titlePl ?? '').trim() || null,
            descriptionRu: (payload.descriptionRu ?? '').trim() || null,
            descriptionUk: (payload.descriptionUk ?? '').trim() || null,
            descriptionEs: (payload.descriptionEs ?? '').trim() || null,
            descriptionPtBr: (payload.descriptionPtBr ?? '').trim() || null,
            descriptionVi: (payload.descriptionVi ?? '').trim() || null,
            descriptionId: (payload.descriptionId ?? '').trim() || null,
            descriptionTr: (payload.descriptionTr ?? '').trim() || null,
            descriptionPl: (payload.descriptionPl ?? '').trim() || null,
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
        studyTarget: params.studyTarget,
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
exports.communityAdminModeratePack = (0, https_1.onCall)({ region: 'us-central1', enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
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
            const studyTarget = normalizeCommunityPackStudyTarget(pack.studyTarget);
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
                    studyTarget,
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
                if (st === 'published')
                    await syncFlashcardRegistryPackMutation(tx, db, { id: packId, studyTarget, cards: Array.isArray(pack.cards) ? pack.cards : [] }, null);
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
            if (st === 'published')
                await syncFlashcardRegistryPackMutation(tx, db, { id: packId, studyTarget, cards: Array.isArray(pack.cards) ? pack.cards : [] }, null);
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
exports.communityFetchPackCardsIfAccessible = (0, https_1.onCall)({ region: 'us-central1', enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const requestedStableId = String(request.data?.stableId ?? '').trim();
    const packId = String(request.data?.packId ?? '').trim();
    const requestedStudyTarget = request.data?.studyTarget;
    if (!requestedStableId || !packId) {
        throw new https_1.HttpsError('invalid-argument', 'stableId and packId required');
    }
    const db = admin.firestore();
    const stableId = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, requestedStableId, {
        requireKnownIdentity: true,
    });
    const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
    const packSnap = await packRef.get();
    if (!packSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Pack not found');
    }
    const pack = packSnap.data();
    requireMatchingPackStudyTarget(requestedStudyTarget, pack);
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
exports.communityPurchasePack = (0, https_1.onCall)({ enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const requestedBuyerStableId = String(request.data?.buyerStableId ?? '').trim();
    const packId = String(request.data?.packId ?? '').trim();
    const requestedStudyTarget = request.data?.studyTarget;
    const buyerDisplayName = String(request.data?.buyerDisplayName ?? 'Игрок').trim().slice(0, 80);
    if (!requestedBuyerStableId || !packId) {
        throw new https_1.HttpsError('invalid-argument', 'buyerStableId and packId required');
    }
    const db = admin.firestore();
    const buyerStableId = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, requestedBuyerStableId, {
        requireKnownIdentity: true,
    });
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
        const studyTarget = requireMatchingPackStudyTarget(requestedStudyTarget, pack);
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
            return { alreadyOwned: true, priceShards: price, studyTarget };
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
            studyTarget,
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
            studyTarget,
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
            studyTarget,
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
            studyTarget,
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
            shardsUpdatedAtMs: now,
            studyTarget,
        };
    });
    return result;
});
/**
 * Список непрочитанных событий продажи для автора (для модалки при входе).
 * Доверие к authorStableId — как у communityPurchasePack.
 */
exports.communityListSellerInbox = (0, https_1.onCall)({ enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const requestedAuthorStableId = String(request.data?.authorStableId ?? '').trim();
    if (!requestedAuthorStableId) {
        throw new https_1.HttpsError('invalid-argument', 'authorStableId required');
    }
    const limit = Math.min(50, Math.max(1, Math.floor(Number(request.data?.limit) || 20)));
    const db = admin.firestore();
    const authorStableId = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, requestedAuthorStableId, {
        requireKnownIdentity: true,
    });
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
exports.communityMarkSellerInboxSeen = (0, https_1.onCall)({ enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const requestedAuthorStableId = String(request.data?.authorStableId ?? '').trim();
    const eventIds = request.data?.eventIds;
    if (!requestedAuthorStableId || !Array.isArray(eventIds) || eventIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'authorStableId and eventIds[] required');
    }
    const ids = eventIds.map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
    const db = admin.firestore();
    const authorStableId = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, requestedAuthorStableId, {
        requireKnownIdentity: true,
    });
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