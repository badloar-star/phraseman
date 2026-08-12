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
exports.createOwnerRepository = exports.ownerRepositoryRootHistoryKey = exports.ownerRepositoryRootKey = void 0;
const wallet_reducer_1 = require("./wallet_reducer");
const course_unlock_1 = require("../contracts/course_unlock");
const wallet_1 = require("../contracts/wallet");
const course_unlock_reducer_1 = require("./course_unlock_reducer");
const decision_registry_1 = require("../policies/decision_registry");
const owner_repository_course_manifest_1 = require("./owner_repository_course_manifest");
const owner_repository_root_v2_1 = require("./owner_repository_root_v2");
const owner_repository_economic_manifest_1 = require("./owner_repository_economic_manifest");
const owner_repository_root_fold_1 = require("./owner_repository_root_fold");
const owner_repository_economic_effect_v2_1 = require("./owner_repository_economic_effect_v2");
const owner_repository_wallet_blob_1 = require("./owner_repository_wallet_blob");
const owner_repository_course_blob_1 = require("./owner_repository_course_blob");
const owner_repository_course_unlock_plan_1 = require("./owner_repository_course_unlock_plan");
const server_course_unlock_receipt_1 = require("./server_course_unlock_receipt");
const owner_repository_wallet_credit_plan_1 = require("./owner_repository_wallet_credit_plan");
const ROOT_MAX_BYTES = 64 * 1024;
const BLOB_MAX_BYTES = 512 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const ROOT_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "currentGeneration",
    "repositoryRevision",
    "journalSequence",
    "previousRootFingerprint",
    "journalHeadRef",
    "walletStateRef",
    "courseStateRefs",
    "operationIndexManifestRef",
    "subjectIndexManifestRef",
    "receiptIndexManifestRef",
    "rootFingerprint",
];
const REF_KEYS = [
    "schemaVersion",
    "kind",
    "blobKey",
    "blobFingerprint",
];
const COURSE_REF_KEYS = [
    "schemaVersion",
    "courseIdentityFingerprint",
    "stateRef",
];
const BLOB_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "kind",
    "payload",
];
const INDEX_KEYS = [
    "schemaVersion",
    "indexKind",
    "shardBits",
    "shards",
];
const BLOB_KINDS = new Set([
    "wallet_state",
    "course_unlock_state",
    "operation_index_manifest",
    "subject_index_manifest",
    "receipt_index_manifest",
    "index_radix_node",
    "journal_record",
    "course_state_manifest",
]);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
const safe = (value) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const sameCanonical = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const assertBoundedPlainJson = (input) => {
    let nodes = 0;
    const stack = [
        { value: input, depth: 0 },
    ];
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 4096 || current.depth > 32)
            throw new Error("owner_repository_indeterminate");
        if (typeof current.value !== "object" || current.value === null)
            continue;
        if (Array.isArray(current.value)) {
            if (current.value.length > 2048)
                throw new Error("owner_repository_indeterminate");
            if (Object.getPrototypeOf(current.value) !== Array.prototype) {
                throw new Error("owner_repository_indeterminate");
            }
            const descriptors = Object.getOwnPropertyDescriptors(current.value);
            const keys = Reflect.ownKeys(descriptors);
            if (keys.some((key) => typeof key !== "string") ||
                keys.length !== current.value.length + 1 ||
                !Object.prototype.hasOwnProperty.call(descriptors, "length")) {
                throw new Error("owner_repository_indeterminate");
            }
            for (let index = 0; index < current.value.length; index += 1) {
                const descriptor = descriptors[String(index)];
                if (!descriptor || !("value" in descriptor))
                    throw new Error("owner_repository_indeterminate");
                stack.push({ value: descriptor.value, depth: current.depth + 1 });
            }
            continue;
        }
        if (Object.getPrototypeOf(current.value) !== Object.prototype)
            throw new Error("owner_repository_indeterminate");
        const descriptors = Object.getOwnPropertyDescriptors(current.value);
        const keys = Reflect.ownKeys(descriptors);
        if (keys.some((key) => typeof key !== "string") || keys.length > 2048) {
            throw new Error("owner_repository_indeterminate");
        }
        for (const key of keys) {
            const descriptor = descriptors[key];
            if (!descriptor || !("value" in descriptor))
                throw new Error("owner_repository_indeterminate");
            stack.push({ value: descriptor.value, depth: current.depth + 1 });
        }
    }
};
const checkedIncrement = (value) => {
    if (!Number.isSafeInteger(value) ||
        value < 0 ||
        value === Number.MAX_SAFE_INTEGER) {
        throw new Error("owner_repository_indeterminate");
    }
    return value + 1;
};
const parseScope = (input) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
        throw new Error("owner_repository_scope_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 2 ||
        keys.some((key) => typeof key !== "string" ||
            !["accountScopeHash", "generation"].includes(key)) ||
        !("value" in descriptors.accountScopeHash) ||
        !("value" in descriptors.generation) ||
        typeof descriptors.accountScopeHash.value !== "string" ||
        !ACCOUNT.test(descriptors.accountScopeHash.value) ||
        !safe(descriptors.generation.value)) {
        throw new Error("owner_repository_scope_invalid");
    }
    return deepFreeze({
        accountScopeHash: descriptors.accountScopeHash.value,
        generation: descriptors.generation.value,
    });
};
const parseActiveOwnerFence = (input) => {
    try {
        const parsed = parseScope(input);
        return deepFreeze({
            accountScopeHash: parsed.accountScopeHash,
            generation: parsed.generation,
        });
    }
    catch {
        throw new Error("owner_repository_indeterminate");
    }
};
const ownerRepositoryRootKey = (accountScopeHash) => {
    if (!ACCOUNT.test(accountScopeHash))
        throw new Error("owner_repository_scope_invalid");
    return `learning_v2_owner_repository:v1:${accountScopeHash}:root`;
};
exports.ownerRepositoryRootKey = ownerRepositoryRootKey;
const ownerRepositoryRootHistoryKey = (accountScopeHash, rootFingerprint) => {
    if (!ACCOUNT.test(accountScopeHash) || !HASH.test(rootFingerprint)) {
        throw new Error("owner_repository_scope_invalid");
    }
    return `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${rootFingerprint}`;
};
exports.ownerRepositoryRootHistoryKey = ownerRepositoryRootHistoryKey;
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseBlobRef = (input, accountScopeHash) => {
    if (!isRecord(input) ||
        !exactKeys(input, REF_KEYS) ||
        input.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        !BLOB_KINDS.has(input.kind) ||
        typeof input.blobFingerprint !== "string" ||
        !HASH.test(input.blobFingerprint) ||
        input.blobKey !== blobKey(accountScopeHash, input.blobFingerprint)) {
        throw new Error("owner_repository_indeterminate");
    }
    return deepFreeze(input);
};
const finalizeRoot = (body) => {
    const cleanBody = { ...body };
    delete cleanBody.rootFingerprint;
    const root = deepFreeze({
        ...cleanBody,
        rootFingerprint: (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(cleanBody)),
    });
    const encoded = (0, decision_registry_1.canonicalJsonV1)(root);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > ROOT_MAX_BYTES)
        throw new Error("owner_repository_root_overflow");
    return { root, encoded };
};
const parseRoot = (raw, expectedAccountScopeHash) => {
    let parsed;
    try {
        if (typeof raw !== "string" || (0, decision_registry_1.utf8ByteLengthV1)(raw) > ROOT_MAX_BYTES) {
            throw new Error("owner_repository_indeterminate");
        }
        parsed = JSON.parse(raw);
        assertBoundedPlainJson(parsed);
        if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
            throw new Error("owner_repository_indeterminate");
    }
    catch {
        throw new Error("owner_repository_indeterminate");
    }
    if (!isRecord(parsed) ||
        !exactKeys(parsed, ROOT_KEYS) ||
        parsed.schemaVersion !== "learning-v2-owner-repository-root.v1" ||
        parsed.accountScopeHash !== expectedAccountScopeHash ||
        !safe(parsed.currentGeneration) ||
        !safe(parsed.repositoryRevision) ||
        !safe(parsed.journalSequence) ||
        (parsed.previousRootFingerprint !== null &&
            (typeof parsed.previousRootFingerprint !== "string" ||
                !HASH.test(parsed.previousRootFingerprint))) ||
        typeof parsed.rootFingerprint !== "string" ||
        !HASH.test(parsed.rootFingerprint) ||
        !Array.isArray(parsed.courseStateRefs)) {
        throw new Error("owner_repository_indeterminate");
    }
    if ((parsed.journalSequence === 0) !== (parsed.journalHeadRef === null) ||
        Number(parsed.journalSequence) > Number(parsed.repositoryRevision) ||
        (parsed.repositoryRevision === 0) !==
            (parsed.previousRootFingerprint === null)) {
        throw new Error("owner_repository_indeterminate");
    }
    const walletStateRef = parseBlobRef(parsed.walletStateRef, expectedAccountScopeHash);
    const operationIndexManifestRef = parseBlobRef(parsed.operationIndexManifestRef, expectedAccountScopeHash);
    const subjectIndexManifestRef = parseBlobRef(parsed.subjectIndexManifestRef, expectedAccountScopeHash);
    const receiptIndexManifestRef = parseBlobRef(parsed.receiptIndexManifestRef, expectedAccountScopeHash);
    const journalHeadRef = parsed.journalHeadRef === null
        ? null
        : parseBlobRef(parsed.journalHeadRef, expectedAccountScopeHash);
    const courseStateRefs = parsed.courseStateRefs.map((entry) => {
        if (!isRecord(entry) ||
            !exactKeys(entry, COURSE_REF_KEYS) ||
            entry.schemaVersion !== "learning-v2-owner-repository-course-ref.v1" ||
            typeof entry.courseIdentityFingerprint !== "string" ||
            !HASH.test(entry.courseIdentityFingerprint)) {
            throw new Error("owner_repository_indeterminate");
        }
        const stateRef = parseBlobRef(entry.stateRef, expectedAccountScopeHash);
        if (stateRef.kind !== "course_unlock_state")
            throw new Error("owner_repository_indeterminate");
        return deepFreeze({
            schemaVersion: "learning-v2-owner-repository-course-ref.v1",
            courseIdentityFingerprint: entry.courseIdentityFingerprint,
            stateRef,
        });
    });
    if (walletStateRef.kind !== "wallet_state" ||
        operationIndexManifestRef.kind !== "operation_index_manifest" ||
        subjectIndexManifestRef.kind !== "subject_index_manifest" ||
        receiptIndexManifestRef.kind !== "receipt_index_manifest" ||
        (journalHeadRef !== null && journalHeadRef.kind !== "journal_record") ||
        new Set(courseStateRefs.map((entry) => entry.courseIdentityFingerprint))
            .size !== courseStateRefs.length ||
        courseStateRefs.some((entry, index) => index > 0 &&
            courseStateRefs[index - 1].courseIdentityFingerprint >=
                entry.courseIdentityFingerprint) ||
        (parsed.journalSequence === 0 && courseStateRefs.length !== 0)) {
        throw new Error("owner_repository_indeterminate");
    }
    const { rootFingerprint, ...body } = parsed;
    if (rootFingerprint !== (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(body)))
        throw new Error("owner_repository_indeterminate");
    return deepFreeze({
        ...body,
        walletStateRef,
        courseStateRefs,
        journalHeadRef,
        operationIndexManifestRef,
        subjectIndexManifestRef,
        receiptIndexManifestRef,
        rootFingerprint,
    });
};
const createIndexPayload = (kind) => deepFreeze({
    schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
    indexKind: kind,
    shardBits: 8,
    shards: [],
});
const createBlob = (accountScopeHash, kind, payload) => {
    try {
        assertBoundedPlainJson(payload);
    }
    catch {
        throw new Error("owner_repository_indeterminate");
    }
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash,
        kind,
        payload,
    };
    let encoded;
    try {
        encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
    }
    catch {
        throw new Error("owner_repository_indeterminate");
    }
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > BLOB_MAX_BYTES)
        throw new Error("owner_repository_blob_overflow");
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        encoded,
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind,
            blobKey: blobKey(accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
    });
};
const parseBlob = (raw, ref, accountScopeHash) => {
    let parsed;
    try {
        if (typeof raw !== "string" ||
            (0, decision_registry_1.utf8ByteLengthV1)(raw) > BLOB_MAX_BYTES ||
            (0, decision_registry_1.sha256Utf8)(raw) !== ref.blobFingerprint) {
            throw new Error("owner_repository_indeterminate");
        }
        parsed = JSON.parse(raw);
        assertBoundedPlainJson(parsed);
        if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
            throw new Error("owner_repository_indeterminate");
    }
    catch {
        throw new Error("owner_repository_indeterminate");
    }
    if (!isRecord(parsed) ||
        !exactKeys(parsed, BLOB_KEYS) ||
        parsed.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        parsed.accountScopeHash !== accountScopeHash ||
        parsed.kind !== ref.kind) {
        throw new Error("owner_repository_indeterminate");
    }
    return deepFreeze(parsed);
};
const validateEmptyIndexManifest = (payload, expectedKind) => {
    if (!isRecord(payload) ||
        !exactKeys(payload, INDEX_KEYS) ||
        payload.schemaVersion !==
            "learning-v2-owner-repository-index-manifest.v1" ||
        payload.indexKind !== expectedKind ||
        payload.shardBits !== 8 ||
        !Array.isArray(payload.shards) ||
        payload.shards.length !== 0) {
        throw new Error("owner_repository_indeterminate");
    }
};
const createOwnerRepository = (storage, isCurrentGeneration, options = {}) => {
    if (!isRecord(options) ||
        Object.getPrototypeOf(options) !== Object.prototype) {
        throw new Error("owner_repository_options_invalid");
    }
    const optionDescriptors = Object.getOwnPropertyDescriptors(options);
    const optionKeys = Reflect.ownKeys(optionDescriptors);
    if (optionKeys.some((key) => key !== "materializeWalletCredit" && key !== "materializeCourseUnlock") ||
        ["materializeWalletCredit", "materializeCourseUnlock"].some((key) => Object.prototype.hasOwnProperty.call(optionDescriptors, key) &&
            (!Object.prototype.hasOwnProperty.call(optionDescriptors[key], "value") ||
                !optionDescriptors[key].enumerable))) {
        throw new Error("owner_repository_options_invalid");
    }
    const hasWalletCreditMaterializer = Object.prototype.hasOwnProperty.call(optionDescriptors, "materializeWalletCredit");
    const materializeWalletCredit = hasWalletCreditMaterializer
        ? optionDescriptors.materializeWalletCredit.value
        : undefined;
    if (hasWalletCreditMaterializer &&
        typeof materializeWalletCredit !== "function") {
        throw new Error("owner_repository_options_invalid");
    }
    const hasCourseUnlockMaterializer = Object.prototype.hasOwnProperty.call(optionDescriptors, "materializeCourseUnlock");
    const materializeCourseUnlock = hasCourseUnlockMaterializer
        ? optionDescriptors.materializeCourseUnlock.value
        : undefined;
    if (hasCourseUnlockMaterializer &&
        typeof materializeCourseUnlock !== "function") {
        throw new Error("owner_repository_options_invalid");
    }
    const admittedWalletWindows = new WeakSet();
    const walletHistoryAuditCursors = new WeakSet();
    const walletHistoryAuditStates = new WeakMap();
    const assertCurrentLocal = (scope) => {
        if (!isCurrentGeneration(scope))
            throw new Error("owner_repository_generation_stale");
    };
    const assertCurrentFence = async (scope) => {
        assertCurrentLocal(scope);
        let durableFence;
        try {
            durableFence = await storage.getCurrentOwnerFence();
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        assertCurrentLocal(scope);
        if (durableFence === null)
            throw new Error("owner_repository_generation_stale");
        const stableFence = parseActiveOwnerFence(durableFence);
        if (stableFence.accountScopeHash !== scope.accountScopeHash ||
            stableFence.generation !== scope.generation) {
            throw new Error("owner_repository_generation_stale");
        }
    };
    const get = async (key, scope) => {
        await assertCurrentFence(scope);
        let value;
        try {
            value = await storage.getItem(key);
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        await assertCurrentFence(scope);
        return value;
    };
    const putImmutable = async (scope, blob) => {
        const existing = await get(blob.ref.blobKey, scope);
        if (existing !== blob.encoded) {
            // The key is content-addressed, so only these exact canonical bytes are valid at it.
            // Rewriting a truncated pre-commit orphan is safe and makes interrupted writes retryable.
            try {
                await storage.setItem(blob.ref.blobKey, blob.encoded);
            }
            catch {
                throw new Error("owner_repository_write_failed");
            }
            await assertCurrentFence(scope);
        }
        const verified = await get(blob.ref.blobKey, scope);
        if (verified !== blob.encoded)
            throw new Error("owner_repository_write_failed");
    };
    const putImmutableRootHistory = async (scope, rootFingerprint, encoded) => {
        let parsedFingerprint;
        try {
            const decoded = JSON.parse(encoded);
            if (decoded.schemaVersion === "learning-v2-owner-repository-root.v3") {
                const { parseOwnerRepositoryRootV3Raw } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
                parsedFingerprint = parseOwnerRepositoryRootV3Raw(encoded, scope.accountScopeHash).root.rootFingerprint;
            }
            else if (decoded.schemaVersion === "learning-v2-owner-repository-root.v2") {
                parsedFingerprint = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(encoded, scope.accountScopeHash).root.rootFingerprint;
            }
            else {
                parsedFingerprint = parseRoot(encoded, scope.accountScopeHash).rootFingerprint;
            }
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        if (parsedFingerprint !== rootFingerprint)
            throw new Error("owner_repository_indeterminate");
        const key = (0, exports.ownerRepositoryRootHistoryKey)(scope.accountScopeHash, rootFingerprint);
        const existing = await get(key, scope);
        if (existing !== encoded) {
            try {
                await storage.setItem(key, encoded);
            }
            catch {
                throw new Error("owner_repository_write_failed");
            }
            await assertCurrentFence(scope);
        }
        if ((await get(key, scope)) !== encoded)
            throw new Error("owner_repository_write_failed");
    };
    const putImmutableSideRecord = async (scope, key, encoded) => {
        const existing = await get(key, scope);
        if (existing !== null && existing !== encoded) {
            throw new Error("owner_repository_indeterminate");
        }
        if (existing === null) {
            try {
                await storage.setItem(key, encoded);
            }
            catch {
                throw new Error("owner_repository_write_failed");
            }
            await assertCurrentFence(scope);
        }
        if ((await get(key, scope)) !== encoded) {
            throw new Error("owner_repository_write_failed");
        }
    };
    const loadFromRaw = async (scope, raw, requireCurrentRootGeneration) => {
        const root = parseRoot(raw, scope.accountScopeHash);
        if (requireCurrentRootGeneration &&
            root.currentGeneration !== scope.generation) {
            throw new Error("owner_repository_generation_stale");
        }
        // P2.2a is intentionally genesis-only. P2.2b adds the exact journal/index trie schemas.
        if (root.journalSequence !== 0)
            throw new Error("owner_repository_indeterminate");
        const walletRaw = await get(root.walletStateRef.blobKey, scope);
        const operationRaw = await get(root.operationIndexManifestRef.blobKey, scope);
        const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, scope);
        const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, scope);
        if (walletRaw === null ||
            operationRaw === null ||
            subjectRaw === null ||
            receiptRaw === null) {
            throw new Error("owner_repository_indeterminate");
        }
        const walletBlob = parseBlob(walletRaw, root.walletStateRef, scope.accountScopeHash);
        const operationBlob = parseBlob(operationRaw, root.operationIndexManifestRef, scope.accountScopeHash);
        const subjectBlob = parseBlob(subjectRaw, root.subjectIndexManifestRef, scope.accountScopeHash);
        const receiptBlob = parseBlob(receiptRaw, root.receiptIndexManifestRef, scope.accountScopeHash);
        let walletState;
        try {
            walletState = (0, wallet_reducer_1.parseWalletState)(walletBlob.payload);
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        if (walletState.accountScopeHash !== scope.accountScopeHash)
            throw new Error("owner_repository_indeterminate");
        validateEmptyIndexManifest(operationBlob.payload, "operation");
        validateEmptyIndexManifest(subjectBlob.payload, "subject");
        validateEmptyIndexManifest(receiptBlob.payload, "receipt");
        const courseUnlockStates = [];
        for (const courseRef of root.courseStateRefs) {
            const courseRaw = await get(courseRef.stateRef.blobKey, scope);
            if (courseRaw === null)
                throw new Error("owner_repository_indeterminate");
            const courseBlob = parseBlob(courseRaw, courseRef.stateRef, scope.accountScopeHash);
            let courseState;
            try {
                courseState = (0, course_unlock_reducer_1.parseCourseUnlockState)(courseBlob.payload);
            }
            catch {
                throw new Error("owner_repository_indeterminate");
            }
            if (courseState.accountScopeHash !== scope.accountScopeHash ||
                courseState.courseIdentityFingerprint !==
                    courseRef.courseIdentityFingerprint) {
                throw new Error("owner_repository_indeterminate");
            }
            courseUnlockStates.push(courseState);
        }
        if (root.journalHeadRef !== null) {
            const journalRaw = await get(root.journalHeadRef.blobKey, scope);
            if (journalRaw === null)
                throw new Error("owner_repository_indeterminate");
            parseBlob(journalRaw, root.journalHeadRef, scope.accountScopeHash);
        }
        if (root.journalSequence === 0) {
            const genesisWallet = (0, wallet_reducer_1.createWalletState)({
                accountScopeHash: scope.accountScopeHash,
            });
            if ((0, decision_registry_1.canonicalJsonV1)(walletState) !== (0, decision_registry_1.canonicalJsonV1)(genesisWallet) ||
                courseUnlockStates.length !== 0) {
                throw new Error("owner_repository_indeterminate");
            }
        }
        await assertCurrentFence(scope);
        return deepFreeze({ root, walletState, courseUnlockStates });
    };
    const loadV2FromRaw = async (scope, raw, requireCurrentRootGeneration) => {
        let root;
        try {
            root = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(raw, scope.accountScopeHash).root;
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        if (requireCurrentRootGeneration &&
            root.currentGeneration !== scope.generation) {
            throw new Error("owner_repository_generation_stale");
        }
        // This bounded packet supports genesis plus exactly one canonical wallet-credit effect.
        if (root.journalSequence > 1) {
            throw new Error("owner_repository_history_upgrade_required");
        }
        const walletRaw = await get(root.walletStateRef.blobKey, scope);
        const operationRaw = await get(root.operationIndexManifestRef.blobKey, scope);
        const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, scope);
        const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, scope);
        const courseManifestRaw = await get(root.courseStateManifestRef.blobKey, scope);
        if (walletRaw === null ||
            operationRaw === null ||
            subjectRaw === null ||
            receiptRaw === null ||
            courseManifestRaw === null)
            throw new Error("owner_repository_indeterminate");
        const resolveNode = async (ref) => get(ref.blobKey, scope);
        let walletState;
        let operationManifest;
        let subjectManifest;
        let receiptManifest;
        let courseStateManifest;
        try {
            walletState = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
                accountScopeHash: scope.accountScopeHash,
                ref: root.walletStateRef,
                raw: walletRaw,
            }).state;
            operationManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                indexKind: "operation",
                ref: root.operationIndexManifestRef,
                raw: operationRaw,
                resolveNode,
            });
            subjectManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                indexKind: "subject",
                ref: root.subjectIndexManifestRef,
                raw: subjectRaw,
                resolveNode,
            });
            receiptManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                indexKind: "receipt",
                ref: root.receiptIndexManifestRef,
                raw: receiptRaw,
                resolveNode,
            });
            courseStateManifest = (await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                ref: root.courseStateManifestRef,
                raw: courseManifestRaw,
                resolveNode,
            })).manifest;
        }
        catch {
            await assertCurrentFence(scope);
            throw new Error("owner_repository_indeterminate");
        }
        if (courseStateManifest.entryCount !== 0 ||
            courseStateManifest.rootNodeRef !== null) {
            throw new Error("owner_repository_indeterminate");
        }
        const genesisWallet = (0, wallet_reducer_1.createWalletState)({
            accountScopeHash: scope.accountScopeHash,
        });
        if (root.journalSequence === 0) {
            if (root.journalHeadRef !== null ||
                !sameCanonical(walletState, genesisWallet) ||
                operationManifest.manifest.entryCount !== 0 ||
                operationManifest.manifest.rootNodeRef !== null ||
                subjectManifest.manifest.entryCount !== 0 ||
                subjectManifest.manifest.rootNodeRef !== null ||
                receiptManifest.manifest.entryCount !== 0 ||
                receiptManifest.manifest.rootNodeRef !== null) {
                throw new Error("owner_repository_indeterminate");
            }
            await assertCurrentFence(scope);
            return deepFreeze({ root, walletState, courseStateManifest });
        }
        if (root.journalHeadRef === null ||
            operationManifest.manifest.entryCount !== 2 ||
            subjectManifest.manifest.entryCount !== 1 ||
            receiptManifest.manifest.entryCount !== 1) {
            throw new Error("owner_repository_indeterminate");
        }
        const journalRaw = await get(root.journalHeadRef.blobKey, scope);
        if (journalRaw === null)
            throw new Error("owner_repository_indeterminate");
        let journal;
        try {
            journal = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
                accountScopeHash: scope.accountScopeHash,
                ref: root.journalHeadRef,
                raw: journalRaw,
            });
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        if (journal.record.recordKind !== "wallet_credit") {
            throw new Error("owner_repository_indeterminate");
        }
        const record = journal.record;
        if (record.accountScopeHash !== scope.accountScopeHash ||
            record.acceptedAccountGeneration !== root.currentGeneration ||
            record.journalSequence !== 1 ||
            record.previousJournalRecordRef !== null ||
            root.repositoryRevision !== record.repositoryRevisionBefore + 1 ||
            root.previousRootFingerprint !== record.rootBeforeFingerprint ||
            !sameCanonical(record.walletStateAfterRef, root.walletStateRef) ||
            !sameCanonical(record.operationIndexManifestAfterRef, root.operationIndexManifestRef) ||
            !sameCanonical(record.subjectIndexManifestAfterRef, root.subjectIndexManifestRef) ||
            !sameCanonical(record.receiptIndexManifestAfterRef, root.receiptIndexManifestRef)) {
            throw new Error("owner_repository_indeterminate");
        }
        const parentRootRaw = await get((0, exports.ownerRepositoryRootHistoryKey)(scope.accountScopeHash, record.rootBeforeFingerprint), scope);
        if (parentRootRaw === null)
            throw new Error("owner_repository_indeterminate");
        let parentRoot;
        try {
            parentRoot = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(parentRootRaw, scope.accountScopeHash).root;
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        if (parentRoot.rootFingerprint !== record.rootBeforeFingerprint ||
            parentRoot.currentGeneration !== record.acceptedAccountGeneration ||
            parentRoot.repositoryRevision !== record.repositoryRevisionBefore ||
            parentRoot.journalSequence !== 0 ||
            parentRoot.journalHeadRef !== null ||
            !sameCanonical(parentRoot.walletStateRef, record.walletStateBeforeRef) ||
            !sameCanonical(parentRoot.courseStateManifestRef, root.courseStateManifestRef) ||
            !sameCanonical(parentRoot.operationIndexManifestRef, record.operationIndexManifestBeforeRef) ||
            !sameCanonical(parentRoot.subjectIndexManifestRef, record.subjectIndexManifestBeforeRef) ||
            !sameCanonical(parentRoot.receiptIndexManifestRef, record.receiptIndexManifestBeforeRef)) {
            throw new Error("owner_repository_indeterminate");
        }
        const walletBeforeRaw = await get(record.walletStateBeforeRef.blobKey, scope);
        const operationBeforeRaw = await get(record.operationIndexManifestBeforeRef.blobKey, scope);
        const subjectBeforeRaw = await get(record.subjectIndexManifestBeforeRef.blobKey, scope);
        const receiptBeforeRaw = await get(record.receiptIndexManifestBeforeRef.blobKey, scope);
        if (walletBeforeRaw === null ||
            operationBeforeRaw === null ||
            subjectBeforeRaw === null ||
            receiptBeforeRaw === null)
            throw new Error("owner_repository_indeterminate");
        try {
            const walletBefore = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
                accountScopeHash: scope.accountScopeHash,
                ref: record.walletStateBeforeRef,
                raw: walletBeforeRaw,
            }).state;
            const operationBefore = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                indexKind: "operation",
                ref: record.operationIndexManifestBeforeRef,
                raw: operationBeforeRaw,
                resolveNode,
            });
            const subjectBefore = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                indexKind: "subject",
                ref: record.subjectIndexManifestBeforeRef,
                raw: subjectBeforeRaw,
                resolveNode,
            });
            const receiptBefore = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                indexKind: "receipt",
                ref: record.receiptIndexManifestBeforeRef,
                raw: receiptBeforeRaw,
                resolveNode,
            });
            if (!sameCanonical(walletBefore, genesisWallet) ||
                operationBefore.manifest.entryCount !== 0 ||
                operationBefore.manifest.rootNodeRef !== null ||
                subjectBefore.manifest.entryCount !== 0 ||
                subjectBefore.manifest.rootNodeRef !== null ||
                receiptBefore.manifest.entryCount !== 0 ||
                receiptBefore.manifest.rootNodeRef !== null)
                throw new Error("before_projection_invalid");
            const rebuilt = (0, wallet_reducer_1.rebuildWalletStateFromAppliedReceipts)({
                startingState: walletBefore,
                canonicalAppliedReceipts: [record.appliedReceipt],
            });
            if (!sameCanonical(rebuilt, walletState))
                throw new Error("wallet_projection_invalid");
            await (0, owner_repository_economic_manifest_1.assertOwnerRepositoryEconomicClosureForReceipt)({
                accountScopeHash: scope.accountScopeHash,
                operationManifest: operationManifest.manifest,
                subjectManifest: subjectManifest.manifest,
                receiptManifest: receiptManifest.manifest,
                appliedReceipt: record.appliedReceipt,
                resolveNode,
            });
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        await assertCurrentFence(scope);
        return deepFreeze({ root, walletState, courseStateManifest });
    };
    const commitRoot = async (scope, expectedRaw, nextRaw) => {
        await assertCurrentFence(scope);
        let result;
        try {
            result = await storage.compareAndSet((0, exports.ownerRepositoryRootKey)(scope.accountScopeHash), expectedRaw, nextRaw, {
                accountScopeHash: scope.accountScopeHash,
                generation: scope.generation,
            });
        }
        catch {
            let observed;
            try {
                observed = await storage.getItem((0, exports.ownerRepositoryRootKey)(scope.accountScopeHash));
            }
            catch {
                throw new Error("owner_repository_commit_indeterminate");
            }
            if (observed === nextRaw)
                return true;
            throw new Error("owner_repository_commit_indeterminate");
        }
        if (result !== "committed" &&
            result !== "conflict" &&
            result !== "stale_generation") {
            throw new Error("owner_repository_indeterminate");
        }
        if (result === "stale_generation")
            throw new Error("owner_repository_generation_stale");
        if (result === "conflict")
            return false;
        let durableRoot;
        try {
            durableRoot = await storage.getItem((0, exports.ownerRepositoryRootKey)(scope.accountScopeHash));
        }
        catch {
            throw new Error("owner_repository_commit_indeterminate");
        }
        if (durableRoot !== nextRaw)
            throw new Error("owner_repository_commit_indeterminate");
        return true;
    };
    const load = async (scope) => {
        const stableScope = parseScope(scope);
        await assertCurrentFence(stableScope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        const raw = await get(rootKey, stableScope);
        if (raw === null)
            return undefined;
        try {
            const { parseOwnerRepositoryRootV3Raw } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
            parseOwnerRepositoryRootV3Raw(raw, stableScope.accountScopeHash);
            return loadV3(stableScope);
        }
        catch {
            // Continue with the byte-compatible V2/V1 dispatch.
        }
        let isV2 = false;
        try {
            (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(raw, stableScope.accountScopeHash);
            isV2 = true;
        }
        catch {
            isV2 = false;
        }
        if (isV2) {
            const snapshot = await loadV2FromRaw(stableScope, raw, true);
            if ((await get(rootKey, stableScope)) !== raw)
                throw new Error("owner_repository_cas_conflict");
            return snapshot;
        }
        return loadFromRaw(stableScope, raw, true);
    };
    const loadV2 = async (scope) => {
        const stableScope = parseScope(scope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        for (let attempt = 0; attempt < 4; attempt += 1) {
            const raw = await get(rootKey, stableScope);
            if (raw === null)
                return undefined;
            let snapshot;
            try {
                snapshot = await loadV2FromRaw(stableScope, raw, true);
            }
            catch (error) {
                try {
                    parseRoot(raw, stableScope.accountScopeHash);
                    throw new Error("owner_repository_v2_migration_required");
                }
                catch (v1Error) {
                    if (v1Error instanceof Error &&
                        v1Error.message === "owner_repository_v2_migration_required") {
                        throw v1Error;
                    }
                    throw error;
                }
            }
            if ((await get(rootKey, stableScope)) === raw)
                return snapshot;
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const ensureV2 = async (scope) => {
        const stableScope = parseScope(scope);
        await assertCurrentFence(stableScope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                const wallet = createBlob(stableScope.accountScopeHash, "wallet_state", (0, wallet_reducer_1.createWalletState)({
                    accountScopeHash: stableScope.accountScopeHash,
                }));
                const operation = createBlob(stableScope.accountScopeHash, "operation_index_manifest", createIndexPayload("operation"));
                const subject = createBlob(stableScope.accountScopeHash, "subject_index_manifest", createIndexPayload("subject"));
                const receipt = createBlob(stableScope.accountScopeHash, "receipt_index_manifest", createIndexPayload("receipt"));
                const course = await (0, owner_repository_course_manifest_1.createEmptyOwnerRepositoryCourseManifest)(stableScope.accountScopeHash);
                await putImmutable(stableScope, wallet);
                await putImmutable(stableScope, operation);
                await putImmutable(stableScope, subject);
                await putImmutable(stableScope, receipt);
                for (const nodeBlob of course.immutableNodeBlobs)
                    await putImmutable(stableScope, nodeBlob);
                await putImmutable(stableScope, course.manifestBlob);
                const next = (0, owner_repository_root_v2_1.createGenesisOwnerRepositoryRootV2)({
                    accountScopeHash: stableScope.accountScopeHash,
                    currentGeneration: stableScope.generation,
                    walletStateRef: wallet.ref,
                    courseStateManifestRef: course.manifestBlob.ref,
                    operationIndexManifestRef: operation.ref,
                    subjectIndexManifestRef: subject.ref,
                    receiptIndexManifestRef: receipt.ref,
                });
                await commitRoot(stableScope, null, next.encoded);
                continue;
            }
            let parsedV2;
            try {
                parsedV2 = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(currentRaw, stableScope.accountScopeHash).root;
            }
            catch {
                parsedV2 = undefined;
            }
            if (parsedV2) {
                if (stableScope.generation < parsedV2.currentGeneration) {
                    throw new Error("owner_repository_generation_stale");
                }
                if (parsedV2.currentGeneration !== stableScope.generation &&
                    parsedV2.journalSequence !== 0) {
                    throw new Error("owner_repository_history_upgrade_required");
                }
                const snapshot = await loadV2FromRaw(stableScope, currentRaw, false);
                if (parsedV2.currentGeneration === stableScope.generation) {
                    if ((await get(rootKey, stableScope)) === currentRaw)
                        return snapshot;
                    continue;
                }
                const next = (0, owner_repository_root_v2_1.advanceOwnerRepositoryRootV2Generation)({
                    root: parsedV2,
                    targetGeneration: stableScope.generation,
                });
                await putImmutableRootHistory(stableScope, parsedV2.rootFingerprint, currentRaw);
                await commitRoot(stableScope, currentRaw, next.encoded);
                continue;
            }
            let currentV1;
            try {
                currentV1 = parseRoot(currentRaw, stableScope.accountScopeHash);
            }
            catch {
                throw new Error("owner_repository_indeterminate");
            }
            if (stableScope.generation < currentV1.currentGeneration) {
                throw new Error("owner_repository_generation_stale");
            }
            await loadFromRaw(stableScope, currentRaw, false);
            const isExactGenesis = currentV1.repositoryRevision === 0 &&
                currentV1.previousRootFingerprint === null &&
                currentV1.journalSequence === 0 &&
                currentV1.journalHeadRef === null &&
                currentV1.courseStateRefs.length === 0;
            if (!isExactGenesis)
                throw new Error("owner_repository_v2_migration_required");
            const course = await (0, owner_repository_course_manifest_1.createEmptyOwnerRepositoryCourseManifest)(stableScope.accountScopeHash);
            for (const nodeBlob of course.immutableNodeBlobs)
                await putImmutable(stableScope, nodeBlob);
            await putImmutable(stableScope, course.manifestBlob);
            const next = await (0, owner_repository_root_v2_1.migrateVerifiedGenesisOwnerRepositoryRootV1)({
                rootV1: currentV1,
                targetGeneration: stableScope.generation,
                emptyCourseStateManifestBlob: course.manifestBlob,
                resolveCourseNode: async (ref) => get(ref.blobKey, stableScope),
            });
            await putImmutableRootHistory(stableScope, currentV1.rootFingerprint, currentRaw);
            await commitRoot(stableScope, currentRaw, next.encoded);
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const commitWalletCredit = async (scope, candidate) => {
        if (typeof materializeWalletCredit !== "function") {
            throw new Error("owner_repository_wallet_credit_authorizer_required");
        }
        const stableScope = parseScope(scope);
        let detachedCandidate;
        try {
            detachedCandidate = (0, wallet_1.detachBoundedWalletJson)(candidate, "owner_repository_wallet_credit_candidate_invalid");
        }
        catch {
            throw new Error("owner_repository_wallet_credit_candidate_invalid");
        }
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        let authorizedOperation;
        let authorized = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                await ensureV2(stableScope);
                continue;
            }
            const snapshot = await loadV2FromRaw(stableScope, currentRaw, true);
            if ((await get(rootKey, stableScope)) !== currentRaw)
                continue;
            if (!authorized) {
                let canonicalAppliedReceipt = null;
                if (snapshot.root.journalSequence === 1 &&
                    snapshot.root.journalHeadRef !== null) {
                    const journalRaw = await get(snapshot.root.journalHeadRef.blobKey, stableScope);
                    if (journalRaw === null)
                        throw new Error("owner_repository_indeterminate");
                    try {
                        const parsed = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
                            accountScopeHash: stableScope.accountScopeHash,
                            ref: snapshot.root.journalHeadRef,
                            raw: journalRaw,
                        });
                        if (parsed.record.recordKind !== "wallet_credit") {
                            throw new Error("record_kind_invalid");
                        }
                        canonicalAppliedReceipt = parsed.record.appliedReceipt;
                    }
                    catch {
                        throw new Error("owner_repository_indeterminate");
                    }
                }
                try {
                    const materialized = await materializeWalletCredit({
                        scope: stableScope,
                        walletState: snapshot.walletState,
                        canonicalAppliedReceipt,
                        candidate: detachedCandidate,
                    });
                    // Close the authority TOCTOU window before any subsequent await.
                    authorizedOperation = (0, wallet_1.createWalletAuthorizedOperation)(materialized);
                }
                catch {
                    throw new Error("owner_repository_wallet_credit_authorization_failed");
                }
                await assertCurrentFence(stableScope);
                authorized = true;
            }
            const walletRaw = await get(snapshot.root.walletStateRef.blobKey, stableScope);
            const operationRaw = await get(snapshot.root.operationIndexManifestRef.blobKey, stableScope);
            const subjectRaw = await get(snapshot.root.subjectIndexManifestRef.blobKey, stableScope);
            const receiptRaw = await get(snapshot.root.receiptIndexManifestRef.blobKey, stableScope);
            if (walletRaw === null ||
                operationRaw === null ||
                subjectRaw === null ||
                receiptRaw === null) {
                throw new Error("owner_repository_indeterminate");
            }
            const plan = await (0, owner_repository_wallet_credit_plan_1.planOwnerRepositoryWalletCredit)({
                rootBefore: snapshot.root,
                walletStateBeforeBlob: {
                    ref: snapshot.root.walletStateRef,
                    encoded: walletRaw,
                },
                operationManifestBlob: {
                    ref: snapshot.root.operationIndexManifestRef,
                    encoded: operationRaw,
                },
                subjectManifestBlob: {
                    ref: snapshot.root.subjectIndexManifestRef,
                    encoded: subjectRaw,
                },
                receiptManifestBlob: {
                    ref: snapshot.root.receiptIndexManifestRef,
                    encoded: receiptRaw,
                },
                authorizedOperation,
                resolveNode: (async (ref) => get(ref.blobKey, stableScope)),
            });
            if (plan.status !== "applied") {
                if ((await get(rootKey, stableScope)) !== currentRaw)
                    continue;
                return deepFreeze({
                    status: plan.status,
                    appliedReceipt: plan.appliedReceipt,
                    snapshot,
                });
            }
            if (snapshot.root.journalSequence !== 0) {
                throw new Error("owner_repository_history_upgrade_required");
            }
            await putImmutableRootHistory(stableScope, snapshot.root.rootFingerprint, currentRaw);
            for (const blob of plan.immutableBlobs)
                await putImmutable(stableScope, blob);
            const committed = await commitRoot(stableScope, currentRaw, plan.successorRoot.encoded);
            if (!committed)
                continue;
            const committedSnapshot = await loadV2FromRaw(stableScope, plan.successorRoot.encoded, true);
            if ((await get(rootKey, stableScope)) !== plan.successorRoot.encoded)
                continue;
            return deepFreeze({
                status: "applied",
                appliedReceipt: plan.appliedReceipt,
                snapshot: committedSnapshot,
            });
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const admitWalletWindowAtFence = async (scope, requireExactRootGeneration) => {
        const stableScope = parseScope(scope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        const currentRaw = await get(rootKey, stableScope);
        if (currentRaw === null)
            throw new Error("owner_repository_indeterminate");
        let window;
        try {
            // Keep the legacy repository module lightweight and free of a static
            // RootV3/checkpoint initialization chain. Admission is an explicit,
            // asynchronous operation, so its verifier is loaded only on demand.
            const { verifyOwnerRepositoryWalletWindow } = await Promise.resolve().then(() => __importStar(require("./owner_repository_wallet_window")));
            window = await verifyOwnerRepositoryWalletWindow({
                accountScopeHash: stableScope.accountScopeHash,
                currentRootRaw: currentRaw,
                resolveRaw: (key) => get(key, stableScope),
                resolveNode: (ref) => get(ref.blobKey, stableScope),
            });
        }
        catch (error) {
            // Restore the operational taxonomy if a nested parser normalized an owner switch.
            await assertCurrentFence(stableScope);
            if (error instanceof Error &&
                error.message === "owner_repository_generation_stale") {
                throw error;
            }
            if (error instanceof Error && error.message.includes("budget")) {
                throw new Error("owner_repository_window_budget_exceeded");
            }
            throw new Error("owner_repository_indeterminate");
        }
        const { isOwnerRepositoryWalletWindowVerifiedCandidate } = await Promise.resolve().then(() => __importStar(require("./owner_repository_wallet_window")));
        if (!isOwnerRepositoryWalletWindowVerifiedCandidate(window) ||
            window.currentRoot.root.currentGeneration > stableScope.generation ||
            (requireExactRootGeneration &&
                window.currentRoot.root.currentGeneration !== stableScope.generation)) {
            throw new Error("owner_repository_indeterminate");
        }
        if ((await get(rootKey, stableScope)) !== currentRaw) {
            throw new Error("owner_repository_cas_conflict");
        }
        await assertCurrentFence(stableScope);
        const admitted = deepFreeze({
            scope: stableScope,
            currentRootRaw: currentRaw,
            window,
            authority: "repository_admitted",
        });
        admittedWalletWindows.add(admitted);
        return admitted;
    };
    const admitWalletWindow = async (scope) => admitWalletWindowAtFence(scope, true);
    const isWalletWindowAdmitted = (value) => isRecord(value) && admittedWalletWindows.has(value);
    const checkpointIdentity = (window) => {
        const checkpoint = window.anchorCheckpoint.checkpoint;
        return {
            rootFingerprint: checkpoint.checkpointRootFingerprint,
            checkpointFingerprint: checkpoint.checkpointFingerprint,
            schemaVersion: checkpoint.schemaVersion,
            previousCheckpointRootFingerprint: checkpoint.schemaVersion ===
                "learning-v2-owner-repository-wallet-checkpoint.v1"
                ? checkpoint.previousCheckpointRootFingerprint
                : checkpoint.previousCheckpointAnchor.checkpointRootFingerprint,
        };
    };
    const loadWalletHistoryAuditState = async (scope, currentRootRaw, currentRootFingerprint, window, completedCheckpoints, economicCursor) => {
        const root = window.anchorRoot.root;
        const [operationRaw, subjectRaw, receiptRaw] = await Promise.all([
            get(root.operationIndexManifestRef.blobKey, scope),
            get(root.subjectIndexManifestRef.blobKey, scope),
            get(root.receiptIndexManifestRef.blobKey, scope),
        ]);
        if (operationRaw === null ||
            subjectRaw === null ||
            receiptRaw === null) {
            throw new Error("owner_repository_indeterminate");
        }
        const resolveNode = (ref) => get(ref.blobKey, scope);
        try {
            const [operation, subject, receipt] = await Promise.all([
                (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                    accountScopeHash: scope.accountScopeHash,
                    indexKind: "operation",
                    ref: root.operationIndexManifestRef,
                    raw: operationRaw,
                    resolveNode,
                }),
                (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                    accountScopeHash: scope.accountScopeHash,
                    indexKind: "subject",
                    ref: root.subjectIndexManifestRef,
                    raw: subjectRaw,
                    resolveNode,
                }),
                (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                    accountScopeHash: scope.accountScopeHash,
                    indexKind: "receipt",
                    ref: root.receiptIndexManifestRef,
                    raw: receiptRaw,
                    resolveNode,
                }),
            ]);
            return {
                scope,
                currentRootRaw,
                currentRootFingerprint,
                window,
                completedCheckpoints,
                economicCursor,
                operationManifest: operation.manifest,
                subjectManifest: subject.manifest,
                receiptManifest: receipt.manifest,
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes("budget")) {
                throw new Error("owner_repository_history_audit_budget_exceeded");
            }
            throw new Error("owner_repository_indeterminate");
        }
    };
    const isWalletHistoryAuditCursor = (value) => isRecord(value) && walletHistoryAuditCursors.has(value);
    const auditWalletHistoryPage = async (scope, cursor) => {
        const stableScope = parseScope(scope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        let state;
        if (cursor === null) {
            const admitted = await admitWalletWindow(stableScope);
            state = await loadWalletHistoryAuditState(stableScope, admitted.currentRootRaw, admitted.window.currentRoot.root.rootFingerprint, admitted.window, 0, null);
        }
        else {
            if (!isWalletHistoryAuditCursor(cursor)) {
                throw new Error("owner_repository_history_audit_cursor_invalid");
            }
            const existing = walletHistoryAuditStates.get(cursor);
            walletHistoryAuditCursors.delete(cursor);
            walletHistoryAuditStates.delete(cursor);
            if (!existing ||
                existing.scope.accountScopeHash !== stableScope.accountScopeHash ||
                existing.scope.generation !== stableScope.generation) {
                throw new Error("owner_repository_history_audit_cursor_invalid");
            }
            state = existing;
        }
        if ((await get(rootKey, stableScope)) !== state.currentRootRaw) {
            throw new Error("owner_repository_cas_conflict");
        }
        const identity = checkpointIdentity(state.window);
        let audited;
        try {
            const { auditOwnerRepositoryEconomicClosurePage } = await Promise.resolve().then(() => __importStar(require("./owner_repository_economic_manifest")));
            audited = await auditOwnerRepositoryEconomicClosurePage({
                accountScopeHash: stableScope.accountScopeHash,
                operationManifest: state.operationManifest,
                subjectManifest: state.subjectManifest,
                receiptManifest: state.receiptManifest,
                cursor: state.economicCursor,
                maxNodes: 128,
                resolveNode: (ref) => get(ref.blobKey, stableScope),
                readBudget: {
                    maxExternalReads: 256,
                    maxExternalBytes: 64 * 1024 * 1024,
                },
            });
        }
        catch (error) {
            await assertCurrentFence(stableScope);
            if (error instanceof Error && error.message.includes("budget")) {
                throw new Error("owner_repository_history_audit_budget_exceeded");
            }
            throw new Error("owner_repository_indeterminate");
        }
        let nextState = {
            ...state,
            economicCursor: audited.cursor,
        };
        let completedCheckpoints = state.completedCheckpoints;
        if (audited.done) {
            completedCheckpoints += 1;
            if (identity.schemaVersion ===
                "learning-v2-owner-repository-wallet-checkpoint.v1") {
                if (identity.previousCheckpointRootFingerprint !== null) {
                    throw new Error("owner_repository_indeterminate");
                }
                nextState = null;
            }
            else {
                const { verifyOwnerRepositoryWalletWindow } = await Promise.resolve().then(() => __importStar(require("./owner_repository_wallet_window")));
                let previousWindow;
                try {
                    previousWindow = await verifyOwnerRepositoryWalletWindow({
                        accountScopeHash: stableScope.accountScopeHash,
                        currentRootRaw: state.window.anchorRoot.encoded,
                        resolveRaw: (key) => get(key, stableScope),
                        resolveNode: (ref) => get(ref.blobKey, stableScope),
                    });
                }
                catch (error) {
                    await assertCurrentFence(stableScope);
                    if (error instanceof Error && error.message.includes("budget")) {
                        throw new Error("owner_repository_history_audit_budget_exceeded");
                    }
                    throw new Error("owner_repository_indeterminate");
                }
                const previousIdentity = checkpointIdentity(previousWindow);
                const checkpoint = state.window.anchorCheckpoint;
                if (checkpoint.checkpoint.schemaVersion ===
                    "learning-v2-owner-repository-wallet-checkpoint.v1") {
                    throw new Error("owner_repository_indeterminate");
                }
                if (previousIdentity.rootFingerprint !==
                    identity.previousCheckpointRootFingerprint ||
                    previousIdentity.checkpointFingerprint !==
                        checkpoint.checkpoint.previousCheckpointAnchor
                            .checkpointFingerprint) {
                    throw new Error("owner_repository_indeterminate");
                }
                nextState = await loadWalletHistoryAuditState(stableScope, state.currentRootRaw, state.currentRootFingerprint, previousWindow, completedCheckpoints, null);
            }
        }
        if ((await get(rootKey, stableScope)) !== state.currentRootRaw) {
            throw new Error("owner_repository_cas_conflict");
        }
        let nextCursor = null;
        if (nextState !== null) {
            const nextIdentity = checkpointIdentity(nextState.window);
            nextCursor = Object.freeze({
                schemaVersion: "learning-v2-owner-wallet-history-audit-cursor.v1",
                accountScopeHash: stableScope.accountScopeHash,
                currentRootFingerprint: state.currentRootFingerprint,
                checkpointRootFingerprint: nextIdentity.rootFingerprint,
                checkpointFingerprint: nextIdentity.checkpointFingerprint,
                completedCheckpoints,
                authority: "repository_fenced_in_process_cursor",
            });
            walletHistoryAuditCursors.add(nextCursor);
            walletHistoryAuditStates.set(nextCursor, nextState);
        }
        return deepFreeze({
            done: nextState === null,
            cursor: nextCursor,
            checkpointRootFingerprint: identity.rootFingerprint,
            checkpointFingerprint: identity.checkpointFingerprint,
            completedCheckpoints,
            auditedIndexKind: audited.auditedPhase,
            auditedNodes: audited.radix.visitedNodesThisPage,
            auditedEntries: audited.radix.visitedEntriesThisPage,
        });
    };
    const loadV3FromAdmitted = async (admitted) => {
        if (!isWalletWindowAdmitted(admitted)) {
            throw new Error("owner_repository_indeterminate");
        }
        const scope = admitted.scope;
        const root = admitted.window.currentRoot.root;
        const walletRaw = await get(root.walletStateRef.blobKey, scope);
        const courseRaw = await get(root.courseStateManifestRef.blobKey, scope);
        if (walletRaw === null || courseRaw === null) {
            throw new Error("owner_repository_indeterminate");
        }
        let walletState;
        let courseStateManifest;
        try {
            walletState = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
                accountScopeHash: scope.accountScopeHash,
                ref: root.walletStateRef,
                raw: walletRaw,
            }).state;
            courseStateManifest = (await (0, owner_repository_course_manifest_1.parseOwnerRepositoryCourseManifestBlob)({
                accountScopeHash: scope.accountScopeHash,
                ref: root.courseStateManifestRef,
                raw: courseRaw,
                resolveNode: (ref) => get(ref.blobKey, scope),
            })).manifest;
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        return deepFreeze({ root, walletState, courseStateManifest });
    };
    const materializeRootV3PromotionCheckpoint = async (admitted, blobs, resolveNode) => {
        const root = admitted.window.currentRoot.root;
        let walletRevision;
        try {
            walletRevision = (0, owner_repository_wallet_blob_1.parseOwnerRepositoryWalletStateBlob)({
                accountScopeHash: root.accountScopeHash,
                ref: root.walletStateRef,
                raw: blobs.wallet.encoded,
            }).state.revision;
        }
        catch {
            throw new Error("owner_repository_indeterminate");
        }
        if (walletRevision === root.journalSequence) {
            const checkpointCodec = await Promise.resolve().then(() => __importStar(require("./owner_repository_wallet_checkpoint_v2")));
            const checkpoint = await checkpointCodec.materializeOwnerRepositoryWalletCheckpointV2({
                checkpointRoot: admitted.window.currentRoot,
                walletStateBlob: blobs.wallet,
                courseManifestBlob: blobs.course,
                operationManifestBlob: blobs.operation,
                subjectManifestBlob: blobs.subject,
                receiptManifestBlob: blobs.receipt,
                resolveNode,
            });
            return deepFreeze({
                promotedCheckpointAnchor: checkpointCodec.createOwnerRepositoryWalletCheckpointV2AnchorCandidate({ checkpoint }),
                checkpointToStage: checkpoint,
            });
        }
        const checkpointCodec = await Promise.resolve().then(() => __importStar(require("./owner_repository_economic_checkpoint_v3")));
        const previousCheckpoint = admitted.window.anchorCheckpoint.checkpoint.schemaVersion ===
            "learning-v2-owner-repository-economic-checkpoint.v3"
            ? admitted.window.anchorCheckpoint
            : null;
        const checkpoint = await checkpointCodec.materializeOwnerRepositoryEconomicCheckpointV3({
            checkpointRoot: admitted.window.currentRoot,
            previousCheckpoint,
            walletStateBlob: blobs.wallet,
            courseManifestBlob: blobs.course,
            operationManifestBlob: blobs.operation,
            subjectManifestBlob: blobs.subject,
            receiptManifestBlob: blobs.receipt,
            resolveNode,
        });
        return deepFreeze({
            promotedCheckpointAnchor: checkpointCodec.createOwnerRepositoryEconomicCheckpointV3AnchorCandidate({ checkpoint }),
            checkpointToStage: checkpoint,
        });
    };
    const loadV3 = async (scope) => {
        const stableScope = parseScope(scope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        const raw = await get(rootKey, stableScope);
        if (raw === null)
            return undefined;
        try {
            const { parseOwnerRepositoryRootV3Raw } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
            parseOwnerRepositoryRootV3Raw(raw, stableScope.accountScopeHash);
        }
        catch {
            throw new Error("owner_repository_v3_adoption_required");
        }
        const admitted = await admitWalletWindow(stableScope);
        if (admitted.currentRootRaw !== raw) {
            throw new Error("owner_repository_cas_conflict");
        }
        return loadV3FromAdmitted(admitted);
    };
    const advanceV3Generation = async (scope) => {
        const stableScope = parseScope(scope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                throw new Error("owner_repository_v3_adoption_required");
            }
            let root;
            try {
                const { parseOwnerRepositoryRootV3Raw } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
                root = parseOwnerRepositoryRootV3Raw(currentRaw, stableScope.accountScopeHash).root;
            }
            catch {
                throw new Error("owner_repository_v3_adoption_required");
            }
            if (root.currentGeneration > stableScope.generation) {
                throw new Error("owner_repository_generation_stale");
            }
            if (root.currentGeneration === stableScope.generation) {
                const admitted = await admitWalletWindow(stableScope);
                if (admitted.currentRootRaw !== currentRaw)
                    continue;
                return loadV3FromAdmitted(admitted);
            }
            const admitted = await admitWalletWindowAtFence(stableScope, false);
            if (admitted.currentRootRaw !== currentRaw)
                continue;
            await loadV3FromAdmitted(admitted);
            let promotedCheckpointAnchor = null;
            let checkpointToStage;
            if (root.walletCheckpointPromotionRequired) {
                const walletRaw = await get(root.walletStateRef.blobKey, stableScope);
                const courseRaw = await get(root.courseStateManifestRef.blobKey, stableScope);
                const operationRaw = await get(root.operationIndexManifestRef.blobKey, stableScope);
                const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, stableScope);
                const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, stableScope);
                if (walletRaw === null ||
                    courseRaw === null ||
                    operationRaw === null ||
                    subjectRaw === null ||
                    receiptRaw === null) {
                    throw new Error("owner_repository_indeterminate");
                }
                try {
                    const promotion = await materializeRootV3PromotionCheckpoint(admitted, {
                        wallet: { ref: root.walletStateRef, encoded: walletRaw },
                        course: { ref: root.courseStateManifestRef, encoded: courseRaw },
                        operation: {
                            ref: root.operationIndexManifestRef,
                            encoded: operationRaw,
                        },
                        subject: {
                            ref: root.subjectIndexManifestRef,
                            encoded: subjectRaw,
                        },
                        receipt: {
                            ref: root.receiptIndexManifestRef,
                            encoded: receiptRaw,
                        },
                    }, (ref) => get(ref.blobKey, stableScope));
                    promotedCheckpointAnchor = promotion.promotedCheckpointAnchor;
                    checkpointToStage = promotion.checkpointToStage;
                }
                catch {
                    await assertCurrentFence(stableScope);
                    throw new Error("owner_repository_indeterminate");
                }
            }
            let successor;
            try {
                const rootV3Codec = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
                successor = rootV3Codec.advanceOwnerRepositoryRootV3Generation({
                    rootBefore: root,
                    targetGeneration: stableScope.generation,
                    promotedCheckpointAnchor,
                });
            }
            catch {
                throw new Error("owner_repository_indeterminate");
            }
            await putImmutableRootHistory(stableScope, root.rootFingerprint, currentRaw);
            if (checkpointToStage) {
                await putImmutableSideRecord(stableScope, checkpointToStage.key, checkpointToStage.encoded);
            }
            if (!(await commitRoot(stableScope, currentRaw, successor.encoded)))
                continue;
            const committed = await admitWalletWindow(stableScope);
            if (committed.currentRootRaw !== successor.encoded)
                continue;
            return loadV3FromAdmitted(committed);
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const commitWalletCreditV3FromV2 = async (stableScope, detachedCandidate) => {
        if (typeof materializeWalletCredit !== "function") {
            throw new Error("owner_repository_wallet_credit_authorizer_required");
        }
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        let authorizedOperation;
        let authorized = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                throw new Error("owner_repository_v3_adoption_required");
            }
            let currentRoot;
            try {
                currentRoot = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(currentRaw, stableScope.accountScopeHash);
            }
            catch {
                throw new Error("owner_repository_cas_conflict");
            }
            if (currentRoot.root.journalSequence > 1) {
                throw new Error("owner_repository_history_upgrade_required");
            }
            const snapshot = await loadV2FromRaw(stableScope, currentRaw, true);
            if ((await get(rootKey, stableScope)) !== currentRaw)
                continue;
            const checkpointCodec = await Promise.resolve().then(() => __importStar(require("./owner_repository_wallet_checkpoint")));
            const rootV3Codec = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
            let checkpointRoot = currentRoot;
            let checkpointWalletRaw = await get(currentRoot.root.walletStateRef.blobKey, stableScope);
            let parentJournalRecordBlob;
            if (currentRoot.root.journalSequence === 1) {
                const parentFingerprint = currentRoot.root.previousRootFingerprint;
                if (parentFingerprint === null ||
                    currentRoot.root.journalHeadRef === null) {
                    throw new Error("owner_repository_indeterminate");
                }
                const parentRaw = await get((0, exports.ownerRepositoryRootHistoryKey)(stableScope.accountScopeHash, parentFingerprint), stableScope);
                const journalRaw = await get(currentRoot.root.journalHeadRef.blobKey, stableScope);
                if (parentRaw === null || journalRaw === null) {
                    throw new Error("owner_repository_indeterminate");
                }
                try {
                    checkpointRoot = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(parentRaw, stableScope.accountScopeHash);
                }
                catch {
                    await assertCurrentFence(stableScope);
                    throw new Error("owner_repository_indeterminate");
                }
                checkpointWalletRaw = await get(checkpointRoot.root.walletStateRef.blobKey, stableScope);
                parentJournalRecordBlob = {
                    ref: currentRoot.root.journalHeadRef,
                    encoded: journalRaw,
                };
            }
            const freshCheckpointRoot = checkpointRoot.root.repositoryRevision === 0 &&
                checkpointRoot.root.journalSequence === 0 &&
                checkpointRoot.root.previousRootFingerprint === null &&
                checkpointRoot.root.journalHeadRef === null;
            const migratedCheckpointRoot = checkpointRoot.root.repositoryRevision === 1 &&
                checkpointRoot.root.journalSequence === 0 &&
                checkpointRoot.root.previousRootFingerprint !== null &&
                checkpointRoot.root.journalHeadRef === null;
            let migrationRootV1;
            let migrationCourseManifestBlob;
            if (migratedCheckpointRoot) {
                const rootV1Raw = await get((0, exports.ownerRepositoryRootHistoryKey)(stableScope.accountScopeHash, checkpointRoot.root.previousRootFingerprint), stableScope);
                const courseRaw = await get(checkpointRoot.root.courseStateManifestRef.blobKey, stableScope);
                if (rootV1Raw === null || courseRaw === null) {
                    throw new Error("owner_repository_v3_migration_adoption_required");
                }
                try {
                    migrationRootV1 = parseRoot(rootV1Raw, stableScope.accountScopeHash);
                }
                catch {
                    throw new Error("owner_repository_indeterminate");
                }
                migrationCourseManifestBlob = {
                    ref: checkpointRoot.root.courseStateManifestRef,
                    encoded: courseRaw,
                };
            }
            if (checkpointWalletRaw === null ||
                (!freshCheckpointRoot && !migratedCheckpointRoot)) {
                throw new Error("owner_repository_v3_migration_adoption_required");
            }
            const checkpointWalletBlob = {
                ref: checkpointRoot.root.walletStateRef,
                encoded: checkpointWalletRaw,
            };
            let checkpoint;
            let adoptionBase;
            try {
                const accumulator = migratedCheckpointRoot
                    ? await checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration({
                        rootV1: migrationRootV1,
                        targetGeneration: checkpointRoot.root.currentGeneration,
                        emptyCourseStateManifestBlob: migrationCourseManifestBlob,
                        resolveCourseNode: (ref) => get(ref.blobKey, stableScope),
                        migratedRoot: checkpointRoot,
                    })
                    : checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulator({
                        startingRoot: checkpointRoot,
                        previousCheckpoint: null,
                    });
                checkpoint = checkpointCodec.materializeOwnerRepositoryWalletCheckpoint({
                    accumulator,
                    endingWalletStateBlob: checkpointWalletBlob,
                });
                const anchorCandidate = rootV3Codec.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
                    checkpoint,
                    checkpointRoot: checkpointRoot.root,
                    walletStateBlob: checkpointWalletBlob,
                });
                adoptionBase =
                    currentRoot.root.journalSequence === 0
                        ? migratedCheckpointRoot
                            ? await rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration({
                                rootV1: migrationRootV1,
                                targetGeneration: checkpointRoot.root.currentGeneration,
                                emptyCourseStateManifestBlob: migrationCourseManifestBlob,
                                resolveCourseNode: (ref) => get(ref.blobKey, stableScope),
                                migratedRoot: currentRoot,
                                checkpointAnchorCandidate: anchorCandidate,
                            })
                            : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
                                rootBefore: currentRoot,
                                checkpointAnchorCandidate: anchorCandidate,
                            })
                        : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
                            rootBefore: currentRoot,
                            parentRoot: checkpointRoot,
                            parentJournalRecordBlob,
                            checkpointAnchorCandidate: anchorCandidate,
                        });
            }
            catch {
                await assertCurrentFence(stableScope);
                throw new Error("owner_repository_indeterminate");
            }
            let canonicalAppliedReceipt = null;
            if (currentRoot.root.journalHeadRef !== null) {
                const journalRaw = await get(currentRoot.root.journalHeadRef.blobKey, stableScope);
                if (journalRaw === null)
                    throw new Error("owner_repository_indeterminate");
                try {
                    const parsed = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        ref: currentRoot.root.journalHeadRef,
                        raw: journalRaw,
                    });
                    if (parsed.record.recordKind !== "wallet_credit") {
                        throw new Error("record_kind_invalid");
                    }
                    canonicalAppliedReceipt = parsed.record.appliedReceipt;
                }
                catch {
                    await assertCurrentFence(stableScope);
                    throw new Error("owner_repository_indeterminate");
                }
            }
            if (!authorized) {
                try {
                    authorizedOperation = (0, wallet_1.createWalletAuthorizedOperation)(await materializeWalletCredit({
                        scope: stableScope,
                        walletState: snapshot.walletState,
                        canonicalAppliedReceipt,
                        candidate: detachedCandidate,
                    }));
                }
                catch {
                    throw new Error("owner_repository_wallet_credit_authorization_failed");
                }
                await assertCurrentFence(stableScope);
                authorized = true;
            }
            const walletRaw = await get(currentRoot.root.walletStateRef.blobKey, stableScope);
            const operationRaw = await get(currentRoot.root.operationIndexManifestRef.blobKey, stableScope);
            const subjectRaw = await get(currentRoot.root.subjectIndexManifestRef.blobKey, stableScope);
            const receiptRaw = await get(currentRoot.root.receiptIndexManifestRef.blobKey, stableScope);
            if (walletRaw === null ||
                operationRaw === null ||
                subjectRaw === null ||
                receiptRaw === null) {
                throw new Error("owner_repository_indeterminate");
            }
            let plan;
            try {
                plan = await (0, owner_repository_wallet_credit_plan_1.planOwnerRepositoryWalletCredit)({
                    rootBefore: currentRoot.root,
                    walletStateBeforeBlob: {
                        ref: currentRoot.root.walletStateRef,
                        encoded: walletRaw,
                    },
                    operationManifestBlob: {
                        ref: currentRoot.root.operationIndexManifestRef,
                        encoded: operationRaw,
                    },
                    subjectManifestBlob: {
                        ref: currentRoot.root.subjectIndexManifestRef,
                        encoded: subjectRaw,
                    },
                    receiptManifestBlob: {
                        ref: currentRoot.root.receiptIndexManifestRef,
                        encoded: receiptRaw,
                    },
                    authorizedOperation,
                    resolveNode: (ref) => get(ref.blobKey, stableScope),
                });
            }
            catch {
                await assertCurrentFence(stableScope);
                throw new Error("owner_repository_wallet_credit_authorization_failed");
            }
            if (plan.status !== "applied") {
                if ((await get(rootKey, stableScope)) !== currentRaw)
                    continue;
                return deepFreeze({
                    status: plan.status,
                    appliedReceipt: plan.appliedReceipt,
                    snapshot,
                });
            }
            let successor;
            try {
                successor =
                    rootV3Codec.bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2({
                        adoptionBase,
                        journalRecordBlob: plan.journalRecordBlob,
                    });
            }
            catch {
                throw new Error("owner_repository_indeterminate");
            }
            await putImmutableRootHistory(stableScope, currentRoot.root.rootFingerprint, currentRaw);
            await putImmutableSideRecord(stableScope, checkpoint.key, checkpoint.encoded);
            for (const blob of plan.immutableBlobs) {
                await putImmutable(stableScope, blob);
            }
            if (!(await commitRoot(stableScope, currentRaw, successor.encoded)))
                continue;
            const admitted = await admitWalletWindow(stableScope);
            if (admitted.currentRootRaw !== successor.encoded)
                continue;
            return deepFreeze({
                status: "applied",
                appliedReceipt: plan.appliedReceipt,
                snapshot: await loadV3FromAdmitted(admitted),
            });
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const commitWalletCreditV3 = async (scope, candidate) => {
        if (typeof materializeWalletCredit !== "function") {
            throw new Error("owner_repository_wallet_credit_authorizer_required");
        }
        const stableScope = parseScope(scope);
        let detachedCandidate;
        try {
            detachedCandidate = (0, wallet_1.detachBoundedWalletJson)(candidate, "owner_repository_wallet_credit_candidate_invalid");
        }
        catch {
            throw new Error("owner_repository_wallet_credit_candidate_invalid");
        }
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        let authorizedOperation;
        let authorized = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                throw new Error("owner_repository_v3_adoption_required");
            }
            try {
                (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(currentRaw, stableScope.accountScopeHash);
                return commitWalletCreditV3FromV2(stableScope, detachedCandidate);
            }
            catch {
                // Continue with the already-adopted RootV3 path.
            }
            const admitted = await admitWalletWindow(stableScope);
            if (admitted.currentRootRaw !== currentRaw)
                continue;
            const snapshot = await loadV3FromAdmitted(admitted);
            const root = snapshot.root;
            let canonicalAppliedReceipt = null;
            if (root.journalHeadRef !== null) {
                const journalRaw = await get(root.journalHeadRef.blobKey, stableScope);
                if (journalRaw === null)
                    throw new Error("owner_repository_indeterminate");
                try {
                    try {
                        const parsed = (0, owner_repository_root_fold_1.parseOwnerRepositoryJournalRecordBlob)({
                            accountScopeHash: stableScope.accountScopeHash,
                            ref: root.journalHeadRef,
                            raw: journalRaw,
                        });
                        if (parsed.record.recordKind === "wallet_credit") {
                            canonicalAppliedReceipt = parsed.record.appliedReceipt;
                        }
                        else if (parsed.record.recordKind === "operation_alias" ||
                            parsed.record.recordKind === "missing_index_entry") {
                            canonicalAppliedReceipt =
                                parsed.record.canonicalEffectRecord.appliedReceipt;
                        }
                        else {
                            throw new Error("record_kind_invalid");
                        }
                    }
                    catch {
                        try {
                            canonicalAppliedReceipt =
                                (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryWalletCreditEffectRecordBlobV2)({
                                    accountScopeHash: stableScope.accountScopeHash,
                                    ref: root.journalHeadRef,
                                    raw: journalRaw,
                                }).record.appliedReceipt;
                        }
                        catch {
                            canonicalAppliedReceipt =
                                (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryOperationAliasRecordBlobV2)({
                                    accountScopeHash: stableScope.accountScopeHash,
                                    ref: root.journalHeadRef,
                                    raw: journalRaw,
                                }).record.aliasValue.ledgerEntry.appliedReceipt;
                        }
                    }
                }
                catch {
                    await assertCurrentFence(stableScope);
                    throw new Error("owner_repository_indeterminate");
                }
            }
            if (!authorized) {
                try {
                    const materialized = await materializeWalletCredit({
                        scope: stableScope,
                        walletState: snapshot.walletState,
                        canonicalAppliedReceipt,
                        candidate: detachedCandidate,
                    });
                    authorizedOperation = (0, wallet_1.createWalletAuthorizedOperation)(materialized);
                }
                catch {
                    throw new Error("owner_repository_wallet_credit_authorization_failed");
                }
                await assertCurrentFence(stableScope);
                authorized = true;
            }
            const walletRaw = await get(root.walletStateRef.blobKey, stableScope);
            const courseRaw = await get(root.courseStateManifestRef.blobKey, stableScope);
            const operationRaw = await get(root.operationIndexManifestRef.blobKey, stableScope);
            const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, stableScope);
            const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, stableScope);
            if (walletRaw === null ||
                courseRaw === null ||
                operationRaw === null ||
                subjectRaw === null ||
                receiptRaw === null) {
                throw new Error("owner_repository_indeterminate");
            }
            // The verified head only proves the latest settlement. Resolve an older
            // retry by operation id through the account-lifetime typed indexes, then
            // ask the protected authority to validate the candidate against that
            // exact receipt before planning. This prevents a later wallet revision
            // from changing the operation fingerprint of an old retry.
            try {
                const requestedOperation = (0, wallet_1.createWalletAuthorizedOperation)(authorizedOperation);
                const resolveNode = (ref) => get(ref.blobKey, stableScope);
                const [operationManifest, subjectManifest, receiptManifest] = await Promise.all([
                    (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        indexKind: "operation",
                        ref: root.operationIndexManifestRef,
                        raw: operationRaw,
                        resolveNode,
                    }),
                    (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        indexKind: "subject",
                        ref: root.subjectIndexManifestRef,
                        raw: subjectRaw,
                        resolveNode,
                    }),
                    (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        indexKind: "receipt",
                        ref: root.receiptIndexManifestRef,
                        raw: receiptRaw,
                        resolveNode,
                    }),
                ]);
                const lifetimeReceipt = await (0, owner_repository_economic_manifest_1.lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2)({
                    accountScopeHash: stableScope.accountScopeHash,
                    operationManifest: operationManifest.manifest,
                    subjectManifest: subjectManifest.manifest,
                    receiptManifest: receiptManifest.manifest,
                    operationId: requestedOperation.operationId,
                    resolveNode,
                });
                if (lifetimeReceipt !== undefined) {
                    authorizedOperation = (0, wallet_1.createWalletAuthorizedOperation)(await materializeWalletCredit({
                        scope: stableScope,
                        walletState: snapshot.walletState,
                        canonicalAppliedReceipt: lifetimeReceipt,
                        candidate: detachedCandidate,
                    }));
                }
            }
            catch (error) {
                await assertCurrentFence(stableScope);
                throw error;
            }
            let promotedCheckpointAnchor = null;
            let checkpointToStage;
            if (root.walletCheckpointPromotionRequired) {
                try {
                    const promotion = await materializeRootV3PromotionCheckpoint(admitted, {
                        wallet: { ref: root.walletStateRef, encoded: walletRaw },
                        course: { ref: root.courseStateManifestRef, encoded: courseRaw },
                        operation: {
                            ref: root.operationIndexManifestRef,
                            encoded: operationRaw,
                        },
                        subject: {
                            ref: root.subjectIndexManifestRef,
                            encoded: subjectRaw,
                        },
                        receipt: {
                            ref: root.receiptIndexManifestRef,
                            encoded: receiptRaw,
                        },
                    }, (ref) => get(ref.blobKey, stableScope));
                    promotedCheckpointAnchor = promotion.promotedCheckpointAnchor;
                    checkpointToStage = promotion.checkpointToStage;
                }
                catch {
                    await assertCurrentFence(stableScope);
                    throw new Error("owner_repository_indeterminate");
                }
            }
            let plan;
            try {
                plan = await (0, owner_repository_wallet_credit_plan_1.planOwnerRepositoryWalletCreditV2)({
                    rootBefore: root,
                    walletStateBeforeBlob: {
                        ref: root.walletStateRef,
                        encoded: walletRaw,
                    },
                    operationManifestBlob: {
                        ref: root.operationIndexManifestRef,
                        encoded: operationRaw,
                    },
                    subjectManifestBlob: {
                        ref: root.subjectIndexManifestRef,
                        encoded: subjectRaw,
                    },
                    receiptManifestBlob: {
                        ref: root.receiptIndexManifestRef,
                        encoded: receiptRaw,
                    },
                    authorizedOperation,
                    promotedCheckpointAnchor,
                    resolveNode: (ref) => get(ref.blobKey, stableScope),
                });
            }
            catch (error) {
                await assertCurrentFence(stableScope);
                throw error;
            }
            if (plan.status === "alias_repair_required") {
                if (root.journalHeadRef === null) {
                    throw new Error("owner_repository_indeterminate");
                }
                const headRaw = await get(root.journalHeadRef.blobKey, stableScope);
                if (headRaw === null)
                    throw new Error("owner_repository_indeterminate");
                let canonicalEffect;
                try {
                    canonicalEffect =
                        (0, owner_repository_economic_effect_v2_1.parseOwnerRepositoryWalletCreditEffectRecordBlobV2)({
                            accountScopeHash: stableScope.accountScopeHash,
                            ref: root.journalHeadRef,
                            raw: headRaw,
                        });
                }
                catch {
                    if ((await get(rootKey, stableScope)) !== currentRaw)
                        continue;
                    return deepFreeze({
                        status: plan.status,
                        appliedReceipt: plan.appliedReceipt,
                        snapshot,
                    });
                }
                if (canonicalEffect.record.appliedReceiptFingerprint !==
                    plan.appliedReceipt.appliedReceiptFingerprint) {
                    throw new Error("owner_repository_indeterminate");
                }
                const resolveNode = (ref) => get(ref.blobKey, stableScope);
                let operationManifest;
                let subjectManifest;
                let receiptManifest;
                try {
                    operationManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        indexKind: "operation",
                        ref: root.operationIndexManifestRef,
                        raw: operationRaw,
                        resolveNode,
                    });
                    subjectManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        indexKind: "subject",
                        ref: root.subjectIndexManifestRef,
                        raw: subjectRaw,
                        resolveNode,
                    });
                    receiptManifest = await (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        indexKind: "receipt",
                        ref: root.receiptIndexManifestRef,
                        raw: receiptRaw,
                        resolveNode,
                    });
                }
                catch {
                    throw new Error("owner_repository_indeterminate");
                }
                let aliasPlan;
                try {
                    aliasPlan = await (0, owner_repository_economic_manifest_1.planOwnerRepositoryOperationAliasV2)({
                        accountScopeHash: stableScope.accountScopeHash,
                        operationManifest: operationManifest.manifest,
                        subjectManifest: subjectManifest.manifest,
                        receiptManifest: receiptManifest.manifest,
                        authorizedAliasOperation: plan.authorizedOperation,
                        resolveNode,
                    });
                }
                catch {
                    throw new Error("owner_repository_indeterminate");
                }
                if (!aliasPlan.changed || !sameCanonical(aliasPlan.aliasValue.effectBinding.canonicalEffectJournalRecordRef, canonicalEffect.ref))
                    throw new Error("owner_repository_indeterminate");
                const aliasRecord = (0, owner_repository_economic_effect_v2_1.createOwnerRepositoryOperationAliasRecordV2)({
                    accountScopeHash: stableScope.accountScopeHash,
                    journalSequence: root.journalSequence + 1,
                    repositoryRevisionBefore: root.repositoryRevision,
                    rootBeforeFingerprint: root.rootFingerprint,
                    previousJournalRecordRef: root.journalHeadRef,
                    walletStateRef: root.walletStateRef,
                    operationIndexManifestBeforeRef: root.operationIndexManifestRef,
                    operationIndexManifestAfterRef: aliasPlan.operationManifestBlob.ref,
                    subjectIndexManifestRef: root.subjectIndexManifestRef,
                    receiptIndexManifestRef: root.receiptIndexManifestRef,
                    aliasValue: aliasPlan.aliasValue,
                });
                const aliasJournal = (0, owner_repository_economic_effect_v2_1.materializeOwnerRepositoryOperationAliasRecordBlobV2)(aliasRecord);
                const rootV3Codec = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
                const successor = rootV3Codec.bindOwnerRepositoryOperationAliasV2SuccessorRootV3({
                    rootBefore: root,
                    journalRecordBlob: aliasJournal,
                    promotedCheckpointAnchor,
                });
                await putImmutableRootHistory(stableScope, root.rootFingerprint, currentRaw);
                if (checkpointToStage) {
                    await putImmutableSideRecord(stableScope, checkpointToStage.key, checkpointToStage.encoded);
                }
                for (const blob of aliasPlan.immutableNodeBlobs) {
                    await putImmutable(stableScope, blob);
                }
                await putImmutable(stableScope, aliasPlan.operationManifestBlob);
                await putImmutable(stableScope, aliasJournal);
                if (!(await commitRoot(stableScope, currentRaw, successor.encoded))) {
                    continue;
                }
                const committedAdmission = await admitWalletWindow(stableScope);
                if (committedAdmission.currentRootRaw !== successor.encoded)
                    continue;
                return deepFreeze({
                    status: "aliased",
                    appliedReceipt: plan.appliedReceipt,
                    snapshot: await loadV3FromAdmitted(committedAdmission),
                });
            }
            if (plan.status !== "applied") {
                if ((await get(rootKey, stableScope)) !== currentRaw)
                    continue;
                return deepFreeze({
                    status: plan.status,
                    appliedReceipt: plan.appliedReceipt,
                    snapshot,
                });
            }
            if (plan.successorRoot.root.schemaVersion !==
                "learning-v2-owner-repository-root.v3") {
                throw new Error("owner_repository_indeterminate");
            }
            await putImmutableRootHistory(stableScope, root.rootFingerprint, currentRaw);
            if (checkpointToStage) {
                await putImmutableSideRecord(stableScope, checkpointToStage.key, checkpointToStage.encoded);
            }
            for (const blob of plan.immutableBlobs) {
                await putImmutable(stableScope, blob);
            }
            const committed = await commitRoot(stableScope, currentRaw, plan.successorRoot.encoded);
            if (!committed)
                continue;
            const committedAdmission = await admitWalletWindow(stableScope);
            if (committedAdmission.currentRootRaw !== plan.successorRoot.encoded) {
                continue;
            }
            return deepFreeze({
                status: "applied",
                appliedReceipt: plan.appliedReceipt,
                snapshot: await loadV3FromAdmitted(committedAdmission),
            });
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const prepareRootV3AdoptionFromV2 = async (stableScope, currentRaw, currentRoot) => {
        if (currentRoot.root.journalSequence > 1) {
            throw new Error("owner_repository_history_upgrade_required");
        }
        const snapshot = await loadV2FromRaw(stableScope, currentRaw, true);
        if ((await get((0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash), stableScope)) !== currentRaw)
            return null;
        const checkpointCodec = await Promise.resolve().then(() => __importStar(require("./owner_repository_wallet_checkpoint")));
        const rootV3Codec = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
        let checkpointRoot = currentRoot;
        let checkpointWalletRaw = await get(currentRoot.root.walletStateRef.blobKey, stableScope);
        let parentJournalRecordBlob;
        if (currentRoot.root.journalSequence === 1) {
            const parentFingerprint = currentRoot.root.previousRootFingerprint;
            if (parentFingerprint === null || currentRoot.root.journalHeadRef === null) {
                throw new Error("owner_repository_indeterminate");
            }
            const parentRaw = await get((0, exports.ownerRepositoryRootHistoryKey)(stableScope.accountScopeHash, parentFingerprint), stableScope);
            const journalRaw = await get(currentRoot.root.journalHeadRef.blobKey, stableScope);
            if (parentRaw === null || journalRaw === null) {
                throw new Error("owner_repository_indeterminate");
            }
            try {
                checkpointRoot = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(parentRaw, stableScope.accountScopeHash);
            }
            catch {
                throw new Error("owner_repository_indeterminate");
            }
            checkpointWalletRaw = await get(checkpointRoot.root.walletStateRef.blobKey, stableScope);
            parentJournalRecordBlob = {
                ref: currentRoot.root.journalHeadRef,
                encoded: journalRaw,
            };
        }
        const freshCheckpointRoot = checkpointRoot.root.repositoryRevision === 0 &&
            checkpointRoot.root.journalSequence === 0 &&
            checkpointRoot.root.previousRootFingerprint === null &&
            checkpointRoot.root.journalHeadRef === null;
        const migratedCheckpointRoot = checkpointRoot.root.repositoryRevision === 1 &&
            checkpointRoot.root.journalSequence === 0 &&
            checkpointRoot.root.previousRootFingerprint !== null &&
            checkpointRoot.root.journalHeadRef === null;
        let migrationRootV1;
        let migrationCourseManifestBlob;
        if (migratedCheckpointRoot) {
            const rootV1Raw = await get((0, exports.ownerRepositoryRootHistoryKey)(stableScope.accountScopeHash, checkpointRoot.root.previousRootFingerprint), stableScope);
            const courseRaw = await get(checkpointRoot.root.courseStateManifestRef.blobKey, stableScope);
            if (rootV1Raw === null || courseRaw === null) {
                throw new Error("owner_repository_v3_migration_adoption_required");
            }
            try {
                migrationRootV1 = parseRoot(rootV1Raw, stableScope.accountScopeHash);
            }
            catch {
                throw new Error("owner_repository_indeterminate");
            }
            migrationCourseManifestBlob = {
                ref: checkpointRoot.root.courseStateManifestRef,
                encoded: courseRaw,
            };
        }
        if (checkpointWalletRaw === null ||
            (!freshCheckpointRoot && !migratedCheckpointRoot)) {
            throw new Error("owner_repository_v3_migration_adoption_required");
        }
        const checkpointWalletBlob = {
            ref: checkpointRoot.root.walletStateRef,
            encoded: checkpointWalletRaw,
        };
        try {
            const accumulator = migratedCheckpointRoot
                ? await checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration({
                    rootV1: migrationRootV1,
                    targetGeneration: checkpointRoot.root.currentGeneration,
                    emptyCourseStateManifestBlob: migrationCourseManifestBlob,
                    resolveCourseNode: (ref) => get(ref.blobKey, stableScope),
                    migratedRoot: checkpointRoot,
                })
                : checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulator({
                    startingRoot: checkpointRoot,
                    previousCheckpoint: null,
                });
            const checkpoint = checkpointCodec.materializeOwnerRepositoryWalletCheckpoint({
                accumulator,
                endingWalletStateBlob: checkpointWalletBlob,
            });
            const anchorCandidate = rootV3Codec.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
                checkpoint,
                checkpointRoot: checkpointRoot.root,
                walletStateBlob: checkpointWalletBlob,
            });
            const adoptionBase = currentRoot.root.journalSequence === 0
                ? migratedCheckpointRoot
                    ? await rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration({
                        rootV1: migrationRootV1,
                        targetGeneration: checkpointRoot.root.currentGeneration,
                        emptyCourseStateManifestBlob: migrationCourseManifestBlob,
                        resolveCourseNode: (ref) => get(ref.blobKey, stableScope),
                        migratedRoot: currentRoot,
                        checkpointAnchorCandidate: anchorCandidate,
                    })
                    : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
                        rootBefore: currentRoot,
                        checkpointAnchorCandidate: anchorCandidate,
                    })
                : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
                    rootBefore: currentRoot,
                    parentRoot: checkpointRoot,
                    parentJournalRecordBlob,
                    checkpointAnchorCandidate: anchorCandidate,
                });
            return deepFreeze({ snapshot, checkpoint, adoptionBase });
        }
        catch {
            await assertCurrentFence(stableScope);
            throw new Error("owner_repository_indeterminate");
        }
    };
    const commitCourseUnlock = async (scope, candidate) => {
        if (typeof materializeCourseUnlock !== "function") {
            throw new Error("owner_repository_course_unlock_authorizer_required");
        }
        const stableScope = parseScope(scope);
        let detachedCandidate;
        let candidateReference;
        try {
            detachedCandidate = (0, wallet_1.detachBoundedWalletJson)(candidate, "owner_repository_course_unlock_candidate_invalid");
            candidateReference = (0, server_course_unlock_receipt_1.parseServerCourseUnlockRequest)(detachedCandidate);
        }
        catch {
            throw new Error("owner_repository_course_unlock_candidate_invalid");
        }
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                throw new Error("owner_repository_v3_adoption_required");
            }
            let admitted;
            let snapshot;
            let root;
            let adoptionBase;
            let checkpointToStage;
            let parsedV2;
            try {
                parsedV2 = (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(currentRaw, stableScope.accountScopeHash);
            }
            catch {
                parsedV2 = undefined;
            }
            if (parsedV2) {
                const adoption = await prepareRootV3AdoptionFromV2(stableScope, currentRaw, parsedV2);
                if (adoption === null)
                    continue;
                snapshot = adoption.snapshot;
                root = parsedV2.root;
                adoptionBase = adoption.adoptionBase;
                checkpointToStage = adoption.checkpoint;
            }
            else {
                admitted = await admitWalletWindow(stableScope);
                if (admitted.currentRootRaw !== currentRaw)
                    continue;
                snapshot = await loadV3FromAdmitted(admitted);
                root = snapshot.root;
            }
            const walletRaw = await get(root.walletStateRef.blobKey, stableScope);
            const courseManifestRaw = await get(root.courseStateManifestRef.blobKey, stableScope);
            const operationRaw = await get(root.operationIndexManifestRef.blobKey, stableScope);
            const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, stableScope);
            const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, stableScope);
            if (walletRaw === null ||
                courseManifestRaw === null ||
                operationRaw === null ||
                subjectRaw === null ||
                receiptRaw === null) {
                throw new Error("owner_repository_indeterminate");
            }
            const resolveNode = (ref) => get(ref.blobKey, stableScope);
            let courseUnlockState;
            let operationManifest;
            let subjectManifest;
            let receiptManifest;
            try {
                const emptyCourse = (0, course_unlock_reducer_1.createCourseUnlockState)({
                    accountScopeHash: stableScope.accountScopeHash,
                    courseId: candidateReference.courseId,
                    studyTarget: candidateReference.studyTarget,
                });
                const courseEntry = await (0, owner_repository_course_manifest_1.lookupOwnerRepositoryCourseState)({
                    accountScopeHash: stableScope.accountScopeHash,
                    manifest: snapshot.courseStateManifest,
                    courseIdentityFingerprint: emptyCourse.courseIdentityFingerprint,
                    resolveNode,
                });
                if (courseEntry === undefined) {
                    courseUnlockState = emptyCourse;
                }
                else {
                    const courseRaw = await get(courseEntry.stateRef.blobKey, stableScope);
                    if (courseRaw === null)
                        throw new Error("course_state_missing");
                    courseUnlockState = (0, owner_repository_course_blob_1.parseOwnerRepositoryCourseUnlockStateBlob)({
                        accountScopeHash: stableScope.accountScopeHash,
                        ref: courseEntry.stateRef,
                        raw: courseRaw,
                    }).state;
                }
                [operationManifest, subjectManifest, receiptManifest] =
                    await Promise.all([
                        (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                            accountScopeHash: stableScope.accountScopeHash,
                            indexKind: "operation",
                            ref: root.operationIndexManifestRef,
                            raw: operationRaw,
                            resolveNode,
                        }),
                        (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                            accountScopeHash: stableScope.accountScopeHash,
                            indexKind: "subject",
                            ref: root.subjectIndexManifestRef,
                            raw: subjectRaw,
                            resolveNode,
                        }),
                        (0, owner_repository_economic_manifest_1.parseOwnerRepositoryEconomicManifestBlob)({
                            accountScopeHash: stableScope.accountScopeHash,
                            indexKind: "receipt",
                            ref: root.receiptIndexManifestRef,
                            raw: receiptRaw,
                            resolveNode,
                        }),
                    ]);
                if (root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
                    (operationManifest.legacy || subjectManifest.legacy ||
                        receiptManifest.legacy))
                    throw new Error("legacy_manifest");
            }
            catch {
                await assertCurrentFence(stableScope);
                throw new Error("owner_repository_indeterminate");
            }
            let canonicalAppliedReceipt = null;
            try {
                canonicalAppliedReceipt =
                    (await (0, owner_repository_course_unlock_plan_1.lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2)({
                        accountScopeHash: stableScope.accountScopeHash,
                        operationManifest: operationManifest.manifest,
                        subjectManifest: subjectManifest.manifest,
                        receiptManifest: receiptManifest.manifest,
                        operationId: candidateReference.operationId,
                        resolveNode,
                        resolveBlob: resolveNode,
                    })) ?? null;
            }
            catch {
                await assertCurrentFence(stableScope);
                throw new Error("owner_repository_indeterminate");
            }
            let authorizedRequest;
            try {
                authorizedRequest = (0, course_unlock_1.createAuthorizedCourseUnlockRequest)(await materializeCourseUnlock({
                    scope: stableScope,
                    walletState: snapshot.walletState,
                    courseUnlockState,
                    canonicalAppliedReceipt,
                    candidate: detachedCandidate,
                }));
            }
            catch {
                throw new Error("owner_repository_course_unlock_authorization_failed");
            }
            await assertCurrentFence(stableScope);
            let promotedCheckpointAnchor;
            if (root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
                root.walletCheckpointPromotionRequired) {
                if (!admitted)
                    throw new Error("owner_repository_indeterminate");
                try {
                    const promotion = await materializeRootV3PromotionCheckpoint(admitted, {
                        wallet: { ref: root.walletStateRef, encoded: walletRaw },
                        course: {
                            ref: root.courseStateManifestRef,
                            encoded: courseManifestRaw,
                        },
                        operation: {
                            ref: root.operationIndexManifestRef,
                            encoded: operationRaw,
                        },
                        subject: {
                            ref: root.subjectIndexManifestRef,
                            encoded: subjectRaw,
                        },
                        receipt: {
                            ref: root.receiptIndexManifestRef,
                            encoded: receiptRaw,
                        },
                    }, resolveNode);
                    promotedCheckpointAnchor = promotion.promotedCheckpointAnchor;
                    checkpointToStage = promotion.checkpointToStage;
                }
                catch {
                    await assertCurrentFence(stableScope);
                    throw new Error("owner_repository_indeterminate");
                }
            }
            let plan;
            try {
                plan = await (0, owner_repository_course_unlock_plan_1.planOwnerRepositoryCourseUnlock)({
                    accountScopeHash: stableScope.accountScopeHash,
                    rootBefore: root,
                    walletStateBlob: { ref: root.walletStateRef, encoded: walletRaw },
                    courseManifestBlob: {
                        ref: root.courseStateManifestRef,
                        encoded: courseManifestRaw,
                    },
                    operationManifestBlob: {
                        ref: root.operationIndexManifestRef,
                        encoded: operationRaw,
                    },
                    subjectManifestBlob: {
                        ref: root.subjectIndexManifestRef,
                        encoded: subjectRaw,
                    },
                    receiptManifestBlob: {
                        ref: root.receiptIndexManifestRef,
                        encoded: receiptRaw,
                    },
                    authorizedRequest,
                    resolveNode,
                    resolveBlob: resolveNode,
                    ...(root.schemaVersion === "learning-v2-owner-repository-root.v2"
                        ? { adoptionBase }
                        : root.walletCheckpointPromotionRequired
                            ? { promotedCheckpointAnchor }
                            : {}),
                });
            }
            catch (error) {
                await assertCurrentFence(stableScope);
                throw error;
            }
            if (plan.status === "insufficient_balance") {
                if ((await get(rootKey, stableScope)) !== currentRaw)
                    continue;
                return deepFreeze({
                    status: plan.status,
                    requiredSubunits: plan.requiredSubunits,
                    currentBalanceSubunits: plan.currentBalanceSubunits,
                    courseUnlockState: plan.courseUnlockState,
                    snapshot,
                });
            }
            if (plan.status === "replayed") {
                if ((await get(rootKey, stableScope)) !== currentRaw)
                    continue;
                return deepFreeze({
                    status: plan.status,
                    appliedReceipt: plan.appliedReceipt,
                    courseUnlockState: plan.courseUnlockState,
                    snapshot,
                });
            }
            await putImmutableRootHistory(stableScope, root.rootFingerprint, currentRaw);
            if (checkpointToStage) {
                await putImmutableSideRecord(stableScope, checkpointToStage.key, checkpointToStage.encoded);
            }
            for (const blob of plan.immutableBlobs) {
                await putImmutable(stableScope, blob);
            }
            if (!(await commitRoot(stableScope, currentRaw, plan.successorRoot.encoded)))
                continue;
            const committedAdmission = await admitWalletWindow(stableScope);
            if (committedAdmission.currentRootRaw !== plan.successorRoot.encoded) {
                continue;
            }
            return deepFreeze({
                status: "applied",
                appliedReceipt: plan.appliedReceipt,
                courseUnlockState: (0, owner_repository_course_blob_1.parseOwnerRepositoryCourseUnlockStateBlob)({
                    accountScopeHash: stableScope.accountScopeHash,
                    ref: plan.courseStateAfterBlob.ref,
                    raw: plan.courseStateAfterBlob.encoded,
                }).state,
                snapshot: await loadV3FromAdmitted(committedAdmission),
            });
        }
        throw new Error("owner_repository_cas_conflict");
    };
    const initialize = async (scope) => {
        const stableScope = parseScope(scope);
        await assertCurrentFence(stableScope);
        const rootKey = (0, exports.ownerRepositoryRootKey)(stableScope.accountScopeHash);
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const currentRaw = await get(rootKey, stableScope);
            if (currentRaw === null) {
                const wallet = createBlob(stableScope.accountScopeHash, "wallet_state", (0, wallet_reducer_1.createWalletState)({ accountScopeHash: stableScope.accountScopeHash }));
                const operation = createBlob(stableScope.accountScopeHash, "operation_index_manifest", createIndexPayload("operation"));
                const subject = createBlob(stableScope.accountScopeHash, "subject_index_manifest", createIndexPayload("subject"));
                const receipt = createBlob(stableScope.accountScopeHash, "receipt_index_manifest", createIndexPayload("receipt"));
                await putImmutable(stableScope, wallet);
                await putImmutable(stableScope, operation);
                await putImmutable(stableScope, subject);
                await putImmutable(stableScope, receipt);
                const next = finalizeRoot({
                    schemaVersion: "learning-v2-owner-repository-root.v1",
                    accountScopeHash: stableScope.accountScopeHash,
                    currentGeneration: stableScope.generation,
                    repositoryRevision: 0,
                    journalSequence: 0,
                    previousRootFingerprint: null,
                    journalHeadRef: null,
                    walletStateRef: wallet.ref,
                    courseStateRefs: [],
                    operationIndexManifestRef: operation.ref,
                    subjectIndexManifestRef: subject.ref,
                    receiptIndexManifestRef: receipt.ref,
                });
                if (await commitRoot(stableScope, null, next.encoded))
                    return loadFromRaw(stableScope, next.encoded, true);
                continue;
            }
            let parsedV3;
            try {
                const { parseOwnerRepositoryRootV3Raw } = await Promise.resolve().then(() => __importStar(require("./owner_repository_root_v3")));
                parsedV3 = parseOwnerRepositoryRootV3Raw(currentRaw, stableScope.accountScopeHash).root;
            }
            catch {
                parsedV3 = undefined;
            }
            if (parsedV3) {
                if (stableScope.generation < parsedV3.currentGeneration) {
                    throw new Error("owner_repository_generation_stale");
                }
                if (stableScope.generation !== parsedV3.currentGeneration) {
                    return advanceV3Generation(stableScope);
                }
                const snapshot = await loadV3(stableScope);
                if (snapshot)
                    return snapshot;
                continue;
            }
            let currentIsV2 = false;
            try {
                (0, owner_repository_root_v2_1.parseOwnerRepositoryRootV2Raw)(currentRaw, stableScope.accountScopeHash);
                currentIsV2 = true;
            }
            catch {
                currentIsV2 = false;
            }
            if (currentIsV2)
                return ensureV2(stableScope);
            const current = parseRoot(currentRaw, stableScope.accountScopeHash);
            if (stableScope.generation < current.currentGeneration) {
                throw new Error("owner_repository_generation_stale");
            }
            if (current.currentGeneration === stableScope.generation)
                return loadFromRaw(stableScope, currentRaw, true);
            await loadFromRaw(stableScope, currentRaw, false);
            const next = finalizeRoot({
                ...current,
                currentGeneration: stableScope.generation,
                repositoryRevision: checkedIncrement(current.repositoryRevision),
                previousRootFingerprint: current.rootFingerprint,
            });
            if (await commitRoot(stableScope, currentRaw, next.encoded))
                return loadFromRaw(stableScope, next.encoded, true);
        }
        throw new Error("owner_repository_cas_conflict");
    };
    return {
        initialize,
        load,
        ensureV2,
        loadV2,
        loadV3,
        advanceV3Generation,
        commitWalletCredit,
        commitWalletCreditV3,
        commitCourseUnlock,
        admitWalletWindow,
        isWalletWindowAdmitted,
        auditWalletHistoryPage,
        isWalletHistoryAuditCursor,
    };
};
exports.createOwnerRepository = createOwnerRepository;
//# sourceMappingURL=owner_repository.js.map