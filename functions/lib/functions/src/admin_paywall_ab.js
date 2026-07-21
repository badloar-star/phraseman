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
exports.adminGetPaywallAbWorkspace = exports.adminPublishPaywallAb = exports.PAYWALL_AB_VARIANT_LETTERS = void 0;
exports.parsePaywallAbRequest = parsePaywallAbRequest;
exports.buildPaywallAbDoc = buildPaywallAbDoc;
exports.paywallAbChanges = paywallAbChanges;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const audit_contract_1 = require("./admin/audit_contract");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const REGION = 'us-central1';
const PAYWALL_AB_DOC_ID = 'paywall_ab';
const DEFAULT_SALT = 'v3';
exports.PAYWALL_AB_VARIANT_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseVariantShare(letter, value) {
    if (!isRecord(value))
        throw new https_1.HttpsError('invalid-argument', `variants.${letter} must be an object`);
    if (typeof value.enabled !== 'boolean')
        throw new https_1.HttpsError('invalid-argument', `variants.${letter}.enabled must be a boolean`);
    const pct = Number(value.pct);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
        throw new https_1.HttpsError('invalid-argument', `variants.${letter}.pct must be an integer between 0 and 100`);
    }
    return Object.freeze({ enabled: value.enabled, pct });
}
function parsePaywallAbRequest(data) {
    if (!isRecord(data) || !isRecord(data.variants)) {
        throw new https_1.HttpsError('invalid-argument', 'variants object required');
    }
    const submittedLetters = Object.keys(data.variants);
    const unknownLetters = submittedLetters.filter((letter) => !exports.PAYWALL_AB_VARIANT_LETTERS.includes(letter));
    if (unknownLetters.length > 0) {
        throw new https_1.HttpsError('invalid-argument', `variants contains unsupported letters: ${unknownLetters.join(', ')}`);
    }
    if (submittedLetters.length === 0)
        throw new https_1.HttpsError('invalid-argument', 'variants must not be empty');
    const variants = {};
    for (const letter of exports.PAYWALL_AB_VARIANT_LETTERS) {
        // Пропущенная буква = контракт приложения для старых доков: включённый вариант с долей 0.
        variants[letter] = letter in data.variants
            ? parseVariantShare(letter, data.variants[letter])
            : Object.freeze({ enabled: true, pct: 0 });
    }
    const enabledLetters = exports.PAYWALL_AB_VARIANT_LETTERS.filter((letter) => variants[letter].enabled);
    if (enabledLetters.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'at least one variant must be enabled');
    }
    const enabledPctSum = enabledLetters.reduce((total, letter) => total + variants[letter].pct, 0);
    if (enabledPctSum !== 100) {
        throw new https_1.HttpsError('invalid-argument', `sum of pct over enabled variants must equal 100, got ${enabledPctSum}`);
    }
    let salt;
    if (data.salt !== undefined && data.salt !== null) {
        salt = String(data.salt).trim();
        if (!salt || salt.length > 40)
            throw new https_1.HttpsError('invalid-argument', 'salt must be a string of 1-40 characters');
    }
    let rating_x10;
    if (data.rating_x10 !== undefined && data.rating_x10 !== null) {
        rating_x10 = Number(data.rating_x10);
        if (!Number.isInteger(rating_x10) || rating_x10 < 0 || rating_x10 > 50) {
            throw new https_1.HttpsError('invalid-argument', 'rating_x10 must be an integer between 0 and 50');
        }
    }
    let ratings_count;
    if (data.ratings_count !== undefined && data.ratings_count !== null) {
        ratings_count = Number(data.ratings_count);
        if (!Number.isInteger(ratings_count) || ratings_count < 0) {
            throw new https_1.HttpsError('invalid-argument', 'ratings_count must be a non-negative integer');
        }
    }
    let expectedUpdatedAt;
    if (data.expectedUpdatedAt !== undefined && data.expectedUpdatedAt !== null) {
        expectedUpdatedAt = Number(data.expectedUpdatedAt);
        if (!Number.isFinite(expectedUpdatedAt) || expectedUpdatedAt < 0) {
            throw new https_1.HttpsError('invalid-argument', 'expectedUpdatedAt must be a non-negative number');
        }
    }
    const idempotencyKey = String(data.idempotencyKey ?? '').trim();
    const reason = String(data.reason ?? '').trim().slice(0, 500);
    const requestId = String(data.requestId ?? '').trim();
    if (!idempotencyKey || idempotencyKey.length > 120 || !reason || !requestId) {
        throw new https_1.HttpsError('invalid-argument', 'idempotencyKey, reason and requestId are required');
    }
    return Object.freeze({
        variants: Object.freeze(variants),
        salt,
        rating_x10,
        ratings_count,
        expectedUpdatedAt,
        idempotencyKey,
        reason,
        requestId,
    });
}
function readDocInt(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < min || num > max)
        return fallback;
    return num;
}
function buildPaywallAbDoc(input, before, actorUid, nowMs) {
    const doc = {};
    for (const letter of exports.PAYWALL_AB_VARIANT_LETTERS) {
        doc[`${letter}_pct`] = input.variants[letter].pct;
        doc[`${letter}_enabled`] = input.variants[letter].enabled;
    }
    const beforeSalt = typeof before.salt === 'string' && before.salt.trim().length > 0 && before.salt.length <= 40
        ? before.salt
        : DEFAULT_SALT;
    doc.salt = input.salt ?? beforeSalt;
    doc.rating_x10 = input.rating_x10 ?? readDocInt(before.rating_x10, 0, 50, 0);
    doc.ratings_count = input.ratings_count ?? readDocInt(before.ratings_count, 0, Number.MAX_SAFE_INTEGER, 0);
    doc.updatedAt = nowMs;
    doc.updatedBy = actorUid;
    return doc;
}
function formatFieldValue(value) {
    return value === undefined || value === null ? '∅' : String(value);
}
function paywallAbChanges(before, after) {
    const fields = [
        ...exports.PAYWALL_AB_VARIANT_LETTERS.flatMap((letter) => [`${letter}_pct`, `${letter}_enabled`]),
        'salt',
        'rating_x10',
        'ratings_count',
    ];
    const changes = [];
    for (const field of fields) {
        if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
            changes.push(`${field}: ${formatFieldValue(before[field])} → ${formatFieldValue(after[field])}`);
        }
    }
    return changes;
}
function resolveRole(token) {
    const claimed = token.adminRole;
    return (0, roles_1.hasAdminRole)(claimed) ? claimed : null;
}
function paywallAbFingerprint(input) {
    return JSON.stringify({
        variants: input.variants,
        salt: input.salt ?? null,
        rating_x10: input.rating_x10 ?? null,
        ratings_count: input.ratings_count ?? null,
    });
}
exports.adminPublishPaywallAb = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const input = parsePaywallAbRequest(request.data);
    const actorUid = request.auth.uid;
    const role = resolveRole(request.auth.token);
    if (!role)
        throw new https_1.HttpsError('permission-denied', 'adminRole claim required');
    if (!(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'Role cannot publish paywall A/B config');
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc(PAYWALL_AB_DOC_ID);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('remote_config_history').doc();
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            if (previous.requestFingerprint !== paywallAbFingerprint(input)) {
                throw new https_1.HttpsError('already-exists', 'idempotencyKey was already used for another payload');
            }
            return {
                ok: true,
                auditId: String(previous.auditId ?? ''),
                updatedAt: Number(previous.updatedAt ?? 0),
                replayed: true,
            };
        }
        const before = (configSnap.data() ?? {});
        if (input.expectedUpdatedAt !== undefined) {
            if (!configSnap.exists || Number(before.updatedAt ?? 0) !== input.expectedUpdatedAt) {
                throw new https_1.HttpsError('failed-precondition', 'paywall_ab changed; reload before publishing');
            }
        }
        const after = buildPaywallAbDoc(input, before, actorUid, nowMs);
        const changes = paywallAbChanges(before, after);
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'paywall_ab.publish',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: PAYWALL_AB_DOC_ID },
            reason: input.reason,
            before,
            after,
            rollbackReference: historyRef.id,
            requestId: input.requestId,
            timestamp: now,
        });
        // merge:false — документ эксперимента перезаписывается целиком, устаревшие поля удаляются.
        tx.set(configRef, after);
        tx.create(historyRef, {
            ...audit,
            operationId: input.idempotencyKey,
            changes,
            doc: PAYWALL_AB_DOC_ID,
            by: actorUid,
            at: now,
        });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, {
            operationId: input.idempotencyKey,
            requestFingerprint: paywallAbFingerprint(input),
            auditId: auditRef.id,
            updatedAt: nowMs,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, auditId: auditRef.id, updatedAt: nowMs, replayed: false };
    });
});
exports.adminGetPaywallAbWorkspace = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = resolveRole(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'Role cannot read paywall A/B config');
    }
    const db = admin.firestore();
    const [configSnap, historySnap] = await Promise.all([
        db.collection('remote_config').doc(PAYWALL_AB_DOC_ID).get(),
        db.collection('remote_config_history').limit(100).get(),
    ]);
    const config = configSnap.exists ? (configSnap.data() ?? {}) : {};
    const history = historySnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((entry) => entry.doc === PAYWALL_AB_DOC_ID || (isRecord(entry.entity) && entry.entity.id === PAYWALL_AB_DOC_ID))
        .sort((left, right) => String(right.timestamp ?? right.at ?? '').localeCompare(String(left.timestamp ?? left.at ?? '')))
        .slice(0, 20);
    return { ok: true, exists: configSnap.exists, config, history };
});
//# sourceMappingURL=admin_paywall_ab.js.map