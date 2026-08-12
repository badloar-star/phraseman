"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnerRepositoryRadixAuditCursor = exports.auditOwnerRepositoryRadixPage = exports.planOwnerRepositoryRadixBatch = exports.lookupOwnerRepositoryRadix = exports.deriveOwnerRepositoryRadixKeyDigest = exports.OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES = exports.OWNER_REPOSITORY_RADIX_MAX_BATCH_VALUE_BYTES = exports.OWNER_REPOSITORY_RADIX_MAX_BATCH_MUTATIONS = exports.OWNER_REPOSITORY_RADIX_LEAF_CAPACITY = exports.OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES = exports.OWNER_REPOSITORY_RADIX_FANOUT_BITS = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const wallet_1 = require("../contracts/wallet");
exports.OWNER_REPOSITORY_RADIX_FANOUT_BITS = 8;
exports.OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES = 32;
exports.OWNER_REPOSITORY_RADIX_LEAF_CAPACITY = 32;
exports.OWNER_REPOSITORY_RADIX_MAX_BATCH_MUTATIONS = 256;
exports.OWNER_REPOSITORY_RADIX_MAX_BATCH_VALUE_BYTES = 4 * 1024 * 1024;
exports.OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES = 64 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const BYTE = /^[a-f0-9]{2}$/;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_BLOB_BYTES = 512 * 1024;
const MAX_INPUT_NODES = 4096;
const MAX_INPUT_DEPTH = 32;
const MAX_INPUT_STRING_UNITS = 128 * 1024;
const MAX_NODE_INPUT_NODES = 32768;
const MAX_NODE_INPUT_DEPTH = 64;
const MAX_NODE_INPUT_STRING_UNITS = 2 * MAX_BLOB_BYTES;
const DEFAULT_LOOKUP_READ_BUDGET = Object.freeze({
    maxExternalReads: 33,
    maxExternalBytes: 20 * 1024 * 1024,
});
const DEFAULT_PLAN_READ_BUDGET = Object.freeze({
    maxExternalReads: 8448,
    maxExternalBytes: 64 * 1024 * 1024,
});
const DEFAULT_AUDIT_READ_BUDGET = Object.freeze({
    maxExternalReads: 256,
    maxExternalBytes: 64 * 1024 * 1024,
});
const MAX_AUDIT_PAGE_NODES = 256;
const AUDIT_CURSORS = new WeakSet();
const MANIFEST_V1_KEYS = [
    "schemaVersion",
    "indexKind",
    "shardBits",
    "shards",
];
const MANIFEST_V2_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "indexKind",
    "keyDerivation",
    "fanoutBits",
    "leafCapacity",
    "entryCount",
    "rootNodeRef",
];
const REF_KEYS = [
    "schemaVersion",
    "kind",
    "blobKey",
    "blobFingerprint",
];
const ENVELOPE_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "kind",
    "payload",
];
const LEAF_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "indexKind",
    "depthBytes",
    "pathPrefix",
    "entryCount",
    "entries",
];
const BRANCH_KEYS = [
    "schemaVersion",
    "accountScopeHash",
    "indexKind",
    "depthBytes",
    "pathPrefix",
    "entryCount",
    "children",
];
const CHILD_KEYS = ["edge", "entryCount", "nodeRef"];
const ENTRY_KEYS = [
    "schemaVersion",
    "keyKind",
    "logicalKey",
    "keyDigest",
    "valueFingerprint",
    "value",
];
const COURSE_VALUE_KEYS = [
    "schemaVersion",
    "courseIdentityFingerprint",
    "stateRef",
];
const COURSE_STATE_REF_KEYS = [
    "schemaVersion",
    "kind",
    "blobKey",
    "blobFingerprint",
];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
const safe = (value, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) &&
    !Object.is(value, -0) &&
    Number(value) >= 0 &&
    Number(value) <= maximum;
const checkedAdd = (left, right) => {
    const result = left + right;
    if (!Number.isSafeInteger(result) || result < 0)
        throw new Error("owner_index_indeterminate");
    return result;
};
const deepFreeze = (value) => {
    const stack = [value];
    const seen = new Set();
    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current !== "object" || current === null || seen.has(current))
            continue;
        seen.add(current);
        for (const child of Object.values(current))
            stack.push(child);
        Object.freeze(current);
    }
    return value;
};
const readDataRecord = (input, requiredKeys, optionalKeys, code) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        throw new Error(code);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") ||
        requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
        keys.some((key) => RESERVED_KEYS.has(key) ||
            (!requiredKeys.includes(key) &&
                !optionalKeys.includes(key)))) {
        throw new Error(code);
    }
    const result = Object.create(null);
    for (const key of keys) {
        const descriptor = descriptors[key];
        if (!("value" in descriptor) || !descriptor.enumerable)
            throw new Error(code);
        result[key] = descriptor.value;
    }
    return result;
};
const readDenseArray = (input, maximum, code) => {
    if (!Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Array.prototype ||
        input.length > maximum) {
        throw new Error(code);
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") ||
        keys.length !== input.length + 1 ||
        !Object.prototype.hasOwnProperty.call(descriptors, "length"))
        throw new Error(code);
    const result = [];
    for (let index = 0; index < input.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            throw new Error(code);
        result.push(descriptor.value);
    }
    return result;
};
const assertPlainJsonIterative = (input, code, limits = {
    nodes: MAX_INPUT_NODES,
    depth: MAX_INPUT_DEPTH,
    stringUnits: MAX_INPUT_STRING_UNITS,
}) => {
    const stack = [
        { value: input, depth: 0 },
    ];
    let nodes = 0;
    let stringUnits = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > limits.nodes || current.depth > limits.depth)
            throw new Error(code);
        if (typeof current.value === "string") {
            stringUnits += current.value.length;
            if (stringUnits > limits.stringUnits)
                throw new Error(code);
            continue;
        }
        if (current.value === null || typeof current.value === "boolean")
            continue;
        if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) || Object.is(current.value, -0))
                throw new Error(code);
            continue;
        }
        if (typeof current.value !== "object")
            throw new Error(code);
        if (Array.isArray(current.value)) {
            const values = readDenseArray(current.value, 2048, code);
            for (const value of values)
                stack.push({ value, depth: current.depth + 1 });
            continue;
        }
        const record = readDataRecord(current.value, [], Object.keys(Object.getOwnPropertyDescriptors(current.value)), code);
        for (const [key, value] of Object.entries(record)) {
            stringUnits += key.length;
            if (stringUnits > limits.stringUnits)
                throw new Error(code);
            stack.push({ value, depth: current.depth + 1 });
        }
    }
};
const parseReadBudget = (input, fallback) => {
    if (input === undefined)
        return fallback;
    const value = readDataRecord(input, ["maxExternalReads", "maxExternalBytes"], [], "owner_index_read_budget_invalid");
    if (!safe(value.maxExternalReads, 100000) ||
        !safe(value.maxExternalBytes, 1024 * 1024 * 1024)) {
        throw new Error("owner_index_read_budget_invalid");
    }
    return deepFreeze({
        maxExternalReads: Number(value.maxExternalReads),
        maxExternalBytes: Number(value.maxExternalBytes),
    });
};
const createBudgetedNodeReader = (resolver, budget) => {
    const cache = new Map();
    let externalReads = 0;
    let externalBytes = 0;
    return {
        async read(ref) {
            if (cache.has(ref.blobKey))
                return cache.get(ref.blobKey);
            if (externalReads >= budget.maxExternalReads)
                throw new Error("owner_index_read_budget_exceeded");
            let raw;
            try {
                raw = await resolver(ref);
            }
            catch {
                throw new Error("owner_index_indeterminate");
            }
            externalReads += 1;
            if (typeof raw === "string") {
                let bytes;
                try {
                    bytes = (0, decision_registry_1.utf8ByteLengthV1)(raw);
                }
                catch {
                    throw new Error("owner_index_indeterminate");
                }
                externalBytes = checkedAdd(externalBytes, bytes);
                if (externalBytes > budget.maxExternalBytes)
                    throw new Error("owner_index_read_budget_exceeded");
            }
            cache.set(ref.blobKey, raw);
            return raw;
        },
        get externalReads() {
            return externalReads;
        },
        get externalBytes() {
            return externalBytes;
        },
    };
};
const indexKindValid = (value) => value === "operation" ||
    value === "subject" ||
    value === "receipt" ||
    value === "course_state";
const keyKindValid = (value) => value === "operation_id" ||
    value === "operation_fingerprint" ||
    value === "semantic_subject" ||
    value === "applied_receipt" ||
    value === "course_identity";
const keyKindAllowed = (indexKind, keyKind) => indexKind === "operation"
    ? keyKind === "operation_id" || keyKind === "operation_fingerprint"
    : indexKind === "subject"
        ? keyKind === "semantic_subject"
        : indexKind === "receipt"
            ? keyKind === "applied_receipt"
            : keyKind === "course_identity";
const logicalKeyValid = (keyKind, value) => keyKind === "operation_id"
    ? (0, wallet_1.isWalletIdentifier)(value)
    : typeof value === "string" && HASH.test(value);
const blobKey = (accountScopeHash, fingerprint) => `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseRef = (input, accountScopeHash) => {
    let value;
    try {
        value = readDataRecord(input, REF_KEYS, [], "owner_index_indeterminate");
    }
    catch {
        throw new Error("owner_index_indeterminate");
    }
    if (value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
        value.kind !== "index_radix_node" ||
        typeof value.blobFingerprint !== "string" ||
        !HASH.test(value.blobFingerprint) ||
        value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)) {
        throw new Error("owner_index_indeterminate");
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
        kind: "index_radix_node",
        blobKey: value.blobKey,
        blobFingerprint: value.blobFingerprint,
    });
};
const detachValue = (input) => {
    let encoded;
    try {
        assertPlainJsonIterative(input, "owner_index_value_invalid");
        encoded = (0, decision_registry_1.canonicalJsonV1)(input);
    }
    catch {
        throw new Error("owner_index_value_invalid");
    }
    const bytes = (0, decision_registry_1.utf8ByteLengthV1)(encoded);
    if (bytes > exports.OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES)
        throw new Error("owner_index_value_invalid");
    return deepFreeze({
        value: JSON.parse(encoded),
        fingerprint: (0, decision_registry_1.sha256Utf8)(encoded),
        bytes,
    });
};
const defaultDigest = (body) => (0, decision_registry_1.hashCanonicalBody)(body);
const deriveOwnerRepositoryRadixKeyDigest = (input) => {
    const value = readDataRecord(input, ["indexKind", "keyKind", "logicalKey"], ["digest"], "owner_index_key_invalid");
    if (!indexKindValid(value.indexKind) ||
        !keyKindValid(value.keyKind) ||
        !keyKindAllowed(value.indexKind, value.keyKind) ||
        !logicalKeyValid(value.keyKind, value.logicalKey) ||
        (value.digest !== undefined && typeof value.digest !== "function")) {
        throw new Error("owner_index_key_invalid");
    }
    const body = deepFreeze({
        schemaVersion: "learning-v2-owner-index-key.v1",
        indexKind: value.indexKind,
        keyKind: value.keyKind,
        logicalKey: value.logicalKey,
    });
    let result;
    try {
        result = (value.digest ?? defaultDigest)(body);
    }
    catch {
        throw new Error("owner_index_digest_invalid");
    }
    if (!HASH.test(result))
        throw new Error("owner_index_digest_invalid");
    return result;
};
exports.deriveOwnerRepositoryRadixKeyDigest = deriveOwnerRepositoryRadixKeyDigest;
const entryOrder = (left, right) => left.keyDigest.localeCompare(right.keyDigest) ||
    left.keyKind.localeCompare(right.keyKind) ||
    left.logicalKey.localeCompare(right.logicalKey);
const sameLogicalKey = (left, right) => left.keyKind === right.keyKind && left.logicalKey === right.logicalKey;
const normalizeEntry = (accountScopeHash, indexKind, mutation, digest) => {
    const value = readDataRecord(mutation, ["keyKind", "logicalKey", "value"], ["expectedValueFingerprint"], "owner_index_key_invalid");
    if (!keyKindValid(value.keyKind) ||
        !keyKindAllowed(indexKind, value.keyKind) ||
        !logicalKeyValid(value.keyKind, value.logicalKey) ||
        (indexKind !== "course_state" &&
            Object.prototype.hasOwnProperty.call(value, "expectedValueFingerprint")) ||
        (value.expectedValueFingerprint !== undefined &&
            value.expectedValueFingerprint !== null &&
            (typeof value.expectedValueFingerprint !== "string" ||
                !HASH.test(value.expectedValueFingerprint)))) {
        throw new Error("owner_index_key_invalid");
    }
    let detached = detachValue(value.value);
    if (indexKind === "course_state") {
        detached = detachValue(parseCourseStateValue(detached.value, accountScopeHash, value.logicalKey, "owner_index_key_invalid"));
    }
    return deepFreeze({
        valueBytes: detached.bytes,
        expectedValueFingerprint: value.expectedValueFingerprint,
        entry: {
            schemaVersion: "learning-v2-owner-repository-index-entry.v1",
            keyKind: value.keyKind,
            logicalKey: value.logicalKey,
            keyDigest: (0, exports.deriveOwnerRepositoryRadixKeyDigest)({
                indexKind,
                keyKind: value.keyKind,
                logicalKey: value.logicalKey,
                digest,
            }),
            valueFingerprint: detached.fingerprint,
            value: detached.value,
        },
    });
};
const parseEntry = (input, accountScopeHash, indexKind, digest) => {
    if (!isRecord(input) ||
        !exactKeys(input, ENTRY_KEYS) ||
        input.schemaVersion !== "learning-v2-owner-repository-index-entry.v1" ||
        !keyKindValid(input.keyKind) ||
        !keyKindAllowed(indexKind, input.keyKind) ||
        !logicalKeyValid(input.keyKind, input.logicalKey) ||
        typeof input.keyDigest !== "string" ||
        typeof input.valueFingerprint !== "string" ||
        !HASH.test(input.valueFingerprint)) {
        throw new Error("owner_index_indeterminate");
    }
    let detached;
    let expectedDigest;
    try {
        detached = detachValue(input.value);
        if (indexKind === "course_state") {
            detached = detachValue(parseCourseStateValue(detached.value, accountScopeHash, input.logicalKey, "owner_index_indeterminate"));
        }
        expectedDigest = (0, exports.deriveOwnerRepositoryRadixKeyDigest)({
            indexKind,
            keyKind: input.keyKind,
            logicalKey: input.logicalKey,
            digest,
        });
    }
    catch {
        throw new Error("owner_index_indeterminate");
    }
    if (input.keyDigest !== expectedDigest ||
        input.valueFingerprint !== detached.fingerprint) {
        throw new Error("owner_index_indeterminate");
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-index-entry.v1",
        keyKind: input.keyKind,
        logicalKey: input.logicalKey,
        keyDigest: expectedDigest,
        valueFingerprint: detached.fingerprint,
        value: detached.value,
    });
};
const parseCourseStateValue = (input, accountScopeHash, logicalKey, code) => {
    if (!isRecord(input) ||
        !exactKeys(input, COURSE_VALUE_KEYS) ||
        input.schemaVersion !== "learning-v2-owner-repository-course-entry.v1" ||
        input.courseIdentityFingerprint !== logicalKey ||
        !HASH.test(logicalKey) ||
        !isRecord(input.stateRef) ||
        !exactKeys(input.stateRef, COURSE_STATE_REF_KEYS) ||
        input.stateRef.schemaVersion !==
            "learning-v2-owner-repository-blob-ref.v1" ||
        input.stateRef.kind !== "course_unlock_state" ||
        typeof input.stateRef.blobFingerprint !== "string" ||
        !HASH.test(input.stateRef.blobFingerprint) ||
        input.stateRef.blobKey !==
            `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${input.stateRef.blobFingerprint}`) {
        throw new Error(code);
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-course-entry.v1",
        courseIdentityFingerprint: logicalKey,
        stateRef: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "course_unlock_state",
            blobKey: input.stateRef.blobKey,
            blobFingerprint: input.stateRef.blobFingerprint,
        },
    });
};
const makeManifest = (accountScopeHash, indexKind, entryCount, rootNodeRef) => deepFreeze({
    schemaVersion: "learning-v2-owner-repository-index-manifest.v2",
    accountScopeHash,
    indexKind,
    keyDerivation: "owner-index-key.v1",
    fanoutBits: exports.OWNER_REPOSITORY_RADIX_FANOUT_BITS,
    leafCapacity: exports.OWNER_REPOSITORY_RADIX_LEAF_CAPACITY,
    entryCount,
    rootNodeRef,
});
const parseManifest = (input, accountScopeHash, indexKind) => {
    if (!ACCOUNT.test(accountScopeHash) || !indexKindValid(indexKind)) {
        throw new Error("owner_index_manifest_invalid");
    }
    let schemaVersion;
    try {
        if (!isRecord(input))
            throw new Error("owner_index_manifest_invalid");
        const schema = Object.getOwnPropertyDescriptor(input, "schemaVersion");
        if (!schema || !("value" in schema) || !schema.enumerable)
            throw new Error("owner_index_manifest_invalid");
        schemaVersion = schema.value;
    }
    catch {
        throw new Error("owner_index_manifest_invalid");
    }
    if (schemaVersion === "learning-v2-owner-repository-index-manifest.v1") {
        let value;
        try {
            value = readDataRecord(input, MANIFEST_V1_KEYS, [], "owner_index_manifest_invalid");
        }
        catch {
            throw new Error("owner_index_manifest_invalid");
        }
        let shards;
        try {
            shards = readDenseArray(value.shards, 0, "owner_index_manifest_invalid");
        }
        catch {
            throw new Error("owner_index_manifest_invalid");
        }
        if (value.indexKind !== indexKind ||
            value.shardBits !== 8 ||
            shards.length !== 0) {
            throw new Error("owner_index_manifest_invalid");
        }
        return {
            manifest: makeManifest(accountScopeHash, indexKind, 0, null),
            legacy: true,
        };
    }
    let value;
    try {
        value = readDataRecord(input, MANIFEST_V2_KEYS, [], "owner_index_manifest_invalid");
    }
    catch {
        throw new Error("owner_index_manifest_invalid");
    }
    if (value.schemaVersion !== "learning-v2-owner-repository-index-manifest.v2" ||
        value.accountScopeHash !== accountScopeHash ||
        value.indexKind !== indexKind ||
        value.keyDerivation !== "owner-index-key.v1" ||
        value.fanoutBits !== 8 ||
        value.leafCapacity !== 32 ||
        !safe(value.entryCount) ||
        (Number(value.entryCount) === 0) !== (value.rootNodeRef === null)) {
        throw new Error("owner_index_manifest_invalid");
    }
    let rootNodeRef;
    try {
        rootNodeRef =
            value.rootNodeRef === null
                ? null
                : parseRef(value.rootNodeRef, accountScopeHash);
    }
    catch {
        throw new Error("owner_index_manifest_invalid");
    }
    return {
        manifest: makeManifest(accountScopeHash, indexKind, Number(value.entryCount), rootNodeRef),
        legacy: false,
    };
};
const createNodeBlob = (accountScopeHash, node) => {
    const envelope = {
        schemaVersion: "learning-v2-owner-repository-blob.v1",
        accountScopeHash,
        kind: "index_radix_node",
        payload: node,
    };
    try {
        assertPlainJsonIterative(envelope, "owner_index_node_overflow", {
            nodes: MAX_NODE_INPUT_NODES,
            depth: MAX_NODE_INPUT_DEPTH,
            stringUnits: MAX_NODE_INPUT_STRING_UNITS,
        });
    }
    catch {
        throw new Error("owner_index_node_overflow");
    }
    const encoded = (0, decision_registry_1.canonicalJsonV1)(envelope);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BLOB_BYTES)
        throw new Error("owner_index_node_overflow");
    const blobFingerprint = (0, decision_registry_1.sha256Utf8)(encoded);
    return deepFreeze({
        encoded,
        ref: {
            schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
            kind: "index_radix_node",
            blobKey: blobKey(accountScopeHash, blobFingerprint),
            blobFingerprint,
        },
    });
};
const parseNode = (raw, ref, accountScopeHash, indexKind, expectedDepth, expectedPrefix, expectedCount, digest) => {
    let envelope;
    try {
        if (typeof raw !== "string" ||
            (0, decision_registry_1.utf8ByteLengthV1)(raw) > MAX_BLOB_BYTES ||
            (0, decision_registry_1.sha256Utf8)(raw) !== ref.blobFingerprint)
            throw new Error("owner_index_indeterminate");
        envelope = JSON.parse(raw);
        assertPlainJsonIterative(envelope, "owner_index_indeterminate", {
            nodes: MAX_NODE_INPUT_NODES,
            depth: MAX_NODE_INPUT_DEPTH,
            stringUnits: MAX_NODE_INPUT_STRING_UNITS,
        });
        if ((0, decision_registry_1.canonicalJsonV1)(envelope) !== raw)
            throw new Error("owner_index_indeterminate");
    }
    catch {
        throw new Error("owner_index_indeterminate");
    }
    if (!isRecord(envelope) ||
        !exactKeys(envelope, ENVELOPE_KEYS) ||
        envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
        envelope.accountScopeHash !== accountScopeHash ||
        envelope.kind !== "index_radix_node" ||
        !isRecord(envelope.payload)) {
        throw new Error("owner_index_indeterminate");
    }
    const payload = envelope.payload;
    if (payload.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
        if (!exactKeys(payload, LEAF_KEYS) ||
            payload.accountScopeHash !== accountScopeHash ||
            payload.indexKind !== indexKind ||
            payload.depthBytes !== expectedDepth ||
            payload.pathPrefix !== expectedPrefix ||
            !safe(payload.entryCount, exports.OWNER_REPOSITORY_RADIX_LEAF_CAPACITY) ||
            payload.entryCount !== expectedCount ||
            !Array.isArray(payload.entries) ||
            payload.entries.length !== payload.entryCount) {
            throw new Error("owner_index_indeterminate");
        }
        let entries;
        try {
            entries = payload.entries.map((entry) => parseEntry(entry, accountScopeHash, indexKind, digest));
        }
        catch {
            throw new Error("owner_index_indeterminate");
        }
        if (entries.some((entry) => !entry.keyDigest.startsWith(expectedPrefix)) ||
            entries.some((entry, index) => index > 0 && entryOrder(entries[index - 1], entry) >= 0) ||
            entries.some((entry, index) => index > 0 &&
                entry.keyDigest === entries[index - 1].keyDigest &&
                !sameLogicalKey(entries[index - 1], entry))) {
            throw new Error("owner_index_indeterminate");
        }
        return deepFreeze({
            schemaVersion: "learning-v2-owner-repository-radix-leaf.v1",
            accountScopeHash,
            indexKind,
            depthBytes: expectedDepth,
            pathPrefix: expectedPrefix,
            entryCount: entries.length,
            entries,
        });
    }
    if (payload.schemaVersion !== "learning-v2-owner-repository-radix-branch.v1" ||
        !exactKeys(payload, BRANCH_KEYS) ||
        payload.accountScopeHash !== accountScopeHash ||
        payload.indexKind !== indexKind ||
        payload.depthBytes !== expectedDepth ||
        payload.pathPrefix !== expectedPrefix ||
        !safe(payload.entryCount) ||
        payload.entryCount !== expectedCount ||
        expectedDepth >= exports.OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES ||
        !Array.isArray(payload.children) ||
        payload.children.length < 1 ||
        payload.children.length > 256) {
        throw new Error("owner_index_indeterminate");
    }
    const children = payload.children.map((child) => {
        if (!isRecord(child) ||
            !exactKeys(child, CHILD_KEYS) ||
            typeof child.edge !== "string" ||
            !BYTE.test(child.edge) ||
            !safe(child.entryCount) ||
            Number(child.entryCount) < 1) {
            throw new Error("owner_index_indeterminate");
        }
        return deepFreeze({
            edge: child.edge,
            entryCount: Number(child.entryCount),
            nodeRef: parseRef(child.nodeRef, accountScopeHash),
        });
    });
    let childEntryCount = 0;
    for (const child of children)
        childEntryCount = checkedAdd(childEntryCount, child.entryCount);
    if (children.some((child, index) => index > 0 && children[index - 1].edge >= child.edge) ||
        new Set(children.map((child) => child.nodeRef.blobFingerprint)).size !==
            children.length ||
        childEntryCount !== expectedCount) {
        throw new Error("owner_index_indeterminate");
    }
    return deepFreeze({
        schemaVersion: "learning-v2-owner-repository-radix-branch.v1",
        accountScopeHash,
        indexKind,
        depthBytes: expectedDepth,
        pathPrefix: expectedPrefix,
        entryCount: expectedCount,
        children,
    });
};
const canonicalEntry = (entry) => (0, decision_registry_1.canonicalJsonV1)(entry);
const lookupOwnerRepositoryRadix = async (input) => {
    const request = readDataRecord(input, [
        "accountScopeHash",
        "indexKind",
        "manifest",
        "keyKind",
        "logicalKey",
        "resolveNode",
    ], ["digest", "readBudget"], "owner_index_lookup_invalid");
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !indexKindValid(request.indexKind) ||
        !keyKindValid(request.keyKind) ||
        typeof request.logicalKey !== "string" ||
        typeof request.resolveNode !== "function" ||
        (request.digest !== undefined && typeof request.digest !== "function")) {
        throw new Error("owner_index_lookup_invalid");
    }
    const accountScopeHash = request.accountScopeHash;
    const indexKind = request.indexKind;
    const keyKind = request.keyKind;
    const logicalKey = request.logicalKey;
    const digest = request.digest;
    const readBudget = parseReadBudget(request.readBudget, DEFAULT_LOOKUP_READ_BUDGET);
    const parsed = parseManifest(request.manifest, accountScopeHash, indexKind).manifest;
    const keyDigest = (0, exports.deriveOwnerRepositoryRadixKeyDigest)({
        indexKind,
        keyKind,
        logicalKey,
        digest,
    });
    if (parsed.rootNodeRef === null)
        return undefined;
    const reader = createBudgetedNodeReader(request.resolveNode, readBudget);
    let ref = parsed.rootNodeRef;
    let depth = 0;
    let prefix = "";
    let count = parsed.entryCount;
    for (;;) {
        const raw = await reader.read(ref);
        if (raw === null)
            throw new Error("owner_index_indeterminate");
        const node = parseNode(raw, ref, accountScopeHash, indexKind, depth, prefix, count, digest);
        if (node.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
            return node.entries.find((entry) => entry.keyKind === keyKind && entry.logicalKey === logicalKey);
        }
        const edge = keyDigest.slice(depth * 2, depth * 2 + 2);
        const child = node.children.find((candidate) => candidate.edge === edge);
        if (!child)
            return undefined;
        ref = child.nodeRef;
        count = child.entryCount;
        prefix += edge;
        depth += 1;
    }
};
exports.lookupOwnerRepositoryRadix = lookupOwnerRepositoryRadix;
const planOwnerRepositoryRadixBatch = async (input) => {
    const request = readDataRecord(input, ["accountScopeHash", "indexKind", "manifest", "mutations", "resolveNode"], ["digest", "readBudget"], "owner_index_batch_invalid");
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !indexKindValid(request.indexKind) ||
        typeof request.resolveNode !== "function" ||
        (request.digest !== undefined && typeof request.digest !== "function")) {
        throw new Error("owner_index_batch_invalid");
    }
    const accountScopeHash = request.accountScopeHash;
    const indexKind = request.indexKind;
    const digest = request.digest;
    const mutationInputs = readDenseArray(request.mutations, exports.OWNER_REPOSITORY_RADIX_MAX_BATCH_MUTATIONS, "owner_index_batch_invalid");
    const parsedManifest = parseManifest(request.manifest, accountScopeHash, indexKind);
    let batchValueBytes = 0;
    const normalized = mutationInputs.map((mutation) => {
        const result = normalizeEntry(accountScopeHash, indexKind, mutation, digest);
        batchValueBytes = checkedAdd(batchValueBytes, result.valueBytes);
        if (batchValueBytes > exports.OWNER_REPOSITORY_RADIX_MAX_BATCH_VALUE_BYTES) {
            throw new Error("owner_index_batch_value_overflow");
        }
        return result;
    });
    normalized.sort((left, right) => entryOrder(left.entry, right.entry));
    const unique = [];
    for (const mutation of normalized) {
        const entry = mutation.entry;
        const previous = unique[unique.length - 1];
        if (previous &&
            previous.entry.keyDigest === entry.keyDigest &&
            !sameLogicalKey(previous.entry, entry)) {
            throw new Error("owner_index_digest_collision");
        }
        if (previous && sameLogicalKey(previous.entry, entry)) {
            if (canonicalEntry(previous.entry) !== canonicalEntry(entry) ||
                previous.expectedValueFingerprint !== mutation.expectedValueFingerprint) {
                throw new Error("owner_index_key_conflict");
            }
            continue;
        }
        unique.push({
            entry,
            expectedValueFingerprint: mutation.expectedValueFingerprint,
        });
    }
    const pending = new Map();
    const reader = createBudgetedNodeReader(request.resolveNode, parseReadBudget(request.readBudget, DEFAULT_PLAN_READ_BUDGET));
    const storeNode = (node) => {
        const blob = createNodeBlob(accountScopeHash, node);
        pending.set(blob.ref.blobKey, blob);
        return blob.ref;
    };
    const tryMakeLeaf = (entries, depthBytes, pathPrefix) => {
        const ordered = [...entries].sort(entryOrder);
        const node = deepFreeze({
            schemaVersion: "learning-v2-owner-repository-radix-leaf.v1",
            accountScopeHash,
            indexKind,
            depthBytes,
            pathPrefix,
            entryCount: ordered.length,
            entries: ordered,
        });
        try {
            return { ref: storeNode(node), count: ordered.length };
        }
        catch (error) {
            if (error instanceof Error &&
                error.message === "owner_index_node_overflow")
                return undefined;
            throw error;
        }
    };
    const makeLeaf = (entries, depthBytes, pathPrefix) => {
        const leaf = tryMakeLeaf(entries, depthBytes, pathPrefix);
        if (!leaf)
            throw new Error("owner_index_entry_overflow");
        return leaf;
    };
    const buildSubtree = (entries, depthBytes, pathPrefix) => {
        const ordered = [...entries].sort(entryOrder);
        for (let index = 1; index < ordered.length; index += 1) {
            if (ordered[index - 1].keyDigest === ordered[index].keyDigest &&
                !sameLogicalKey(ordered[index - 1], ordered[index])) {
                throw new Error("owner_index_digest_collision");
            }
        }
        if (ordered.length <= exports.OWNER_REPOSITORY_RADIX_LEAF_CAPACITY) {
            const leaf = tryMakeLeaf(ordered, depthBytes, pathPrefix);
            if (leaf)
                return leaf;
            if (ordered.length === 1)
                throw new Error("owner_index_entry_overflow");
        }
        if (depthBytes >= exports.OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES) {
            throw new Error("owner_index_digest_collision");
        }
        const groups = new Map();
        for (const entry of ordered) {
            const edge = entry.keyDigest.slice(depthBytes * 2, depthBytes * 2 + 2);
            const group = groups.get(edge) ?? [];
            group.push(entry);
            groups.set(edge, group);
        }
        const children = [...groups.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([edge, group]) => {
            const child = buildSubtree(group, depthBytes + 1, pathPrefix + edge);
            return deepFreeze({
                edge,
                entryCount: child.count,
                nodeRef: child.ref,
            });
        });
        const ref = storeNode(deepFreeze({
            schemaVersion: "learning-v2-owner-repository-radix-branch.v1",
            accountScopeHash,
            indexKind,
            depthBytes,
            pathPrefix,
            entryCount: ordered.length,
            children,
        }));
        return { ref, count: ordered.length };
    };
    const resolve = async (ref) => {
        const local = pending.get(ref.blobKey);
        if (local)
            return local.encoded;
        return reader.read(ref);
    };
    const insert = async (ref, count, depthBytes, pathPrefix, entry, expectedValueFingerprint) => {
        const raw = await resolve(ref);
        if (raw === null)
            throw new Error("owner_index_indeterminate");
        const node = parseNode(raw, ref, accountScopeHash, indexKind, depthBytes, pathPrefix, count, digest);
        if (node.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
            const same = node.entries.find((candidate) => sameLogicalKey(candidate, entry));
            if (same) {
                if (expectedValueFingerprint === null ||
                    (expectedValueFingerprint !== undefined &&
                        same.valueFingerprint !== expectedValueFingerprint)) {
                    throw new Error("owner_index_expected_conflict");
                }
                if (canonicalEntry(same) === canonicalEntry(entry)) {
                    return { ref, count, changed: false };
                }
                if (expectedValueFingerprint === undefined)
                    throw new Error("owner_index_key_conflict");
                const rebuilt = buildSubtree(node.entries.map((candidate) => sameLogicalKey(candidate, entry) ? entry : candidate), depthBytes, pathPrefix);
                return { ...rebuilt, changed: true };
            }
            if (expectedValueFingerprint !== undefined &&
                expectedValueFingerprint !== null) {
                throw new Error("owner_index_expected_conflict");
            }
            if (node.entries.some((candidate) => candidate.keyDigest === entry.keyDigest)) {
                throw new Error("owner_index_digest_collision");
            }
            const rebuilt = buildSubtree([...node.entries, entry], depthBytes, pathPrefix);
            return { ...rebuilt, changed: true };
        }
        const edge = entry.keyDigest.slice(depthBytes * 2, depthBytes * 2 + 2);
        const childIndex = node.children.findIndex((candidate) => candidate.edge === edge);
        const children = [...node.children];
        let delta = 0;
        if (childIndex < 0) {
            if (expectedValueFingerprint !== undefined &&
                expectedValueFingerprint !== null) {
                throw new Error("owner_index_expected_conflict");
            }
            const child = makeLeaf([entry], depthBytes + 1, pathPrefix + edge);
            children.push(deepFreeze({ edge, entryCount: child.count, nodeRef: child.ref }));
            children.sort((left, right) => left.edge.localeCompare(right.edge));
            delta = 1;
        }
        else {
            const current = children[childIndex];
            const child = await insert(current.nodeRef, current.entryCount, depthBytes + 1, pathPrefix + edge, entry, expectedValueFingerprint);
            if (!child.changed)
                return { ref, count, changed: false };
            delta = child.count - current.entryCount;
            children[childIndex] = deepFreeze({
                edge,
                entryCount: child.count,
                nodeRef: child.ref,
            });
        }
        const nextCount = checkedAdd(count, delta);
        const nextRef = storeNode(deepFreeze({
            schemaVersion: "learning-v2-owner-repository-radix-branch.v1",
            accountScopeHash,
            indexKind,
            depthBytes,
            pathPrefix,
            entryCount: nextCount,
            children,
        }));
        return { ref: nextRef, count: nextCount, changed: true };
    };
    let rootRef = parsedManifest.manifest.rootNodeRef;
    let entryCount = parsedManifest.manifest.entryCount;
    let logicalChange = false;
    for (const mutation of unique) {
        const { entry, expectedValueFingerprint } = mutation;
        if (rootRef === null) {
            if (expectedValueFingerprint !== undefined &&
                expectedValueFingerprint !== null) {
                throw new Error("owner_index_expected_conflict");
            }
            const root = makeLeaf([entry], 0, "");
            rootRef = root.ref;
            entryCount = root.count;
            logicalChange = true;
            continue;
        }
        const result = await insert(rootRef, entryCount, 0, "", entry, expectedValueFingerprint);
        rootRef = result.ref;
        entryCount = result.count;
        logicalChange = logicalChange || result.changed;
    }
    if (rootRef !== null && unique.length === 0) {
        const raw = await resolve(rootRef);
        if (raw === null)
            throw new Error("owner_index_indeterminate");
        parseNode(raw, rootRef, accountScopeHash, indexKind, 0, "", entryCount, digest);
    }
    const reachable = new Set();
    const stack = rootRef === null ? [] : [rootRef];
    while (stack.length > 0) {
        const ref = stack.pop();
        if (reachable.has(ref.blobKey))
            continue;
        const blob = pending.get(ref.blobKey);
        if (!blob)
            continue;
        reachable.add(ref.blobKey);
        const envelope = JSON.parse(blob.encoded);
        if (envelope.payload.schemaVersion ===
            "learning-v2-owner-repository-radix-branch.v1") {
            for (const child of envelope.payload.children)
                stack.push(child.nodeRef);
        }
    }
    const immutableBlobs = [...reachable]
        .map((key) => pending.get(key))
        .sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
    const manifest = makeManifest(accountScopeHash, indexKind, entryCount, rootRef);
    return deepFreeze({
        manifest,
        immutableBlobs,
        changed: parsedManifest.legacy || logicalChange,
    });
};
exports.planOwnerRepositoryRadixBatch = planOwnerRepositoryRadixBatch;
/**
 * Bounded full-tree traversal. Cursors are in-process capabilities: their hashes are
 * deterministic audit evidence, not durable authority and not a resumable client token.
 */
const auditOwnerRepositoryRadixPage = async (input) => {
    const request = readDataRecord(input, [
        "accountScopeHash",
        "indexKind",
        "manifest",
        "cursor",
        "maxNodes",
        "resolveNode",
    ], ["readBudget"], "owner_index_audit_invalid");
    if (typeof request.accountScopeHash !== "string" ||
        !ACCOUNT.test(request.accountScopeHash) ||
        !indexKindValid(request.indexKind) ||
        !safe(request.maxNodes, MAX_AUDIT_PAGE_NODES) ||
        Number(request.maxNodes) < 1 ||
        typeof request.resolveNode !== "function") {
        throw new Error("owner_index_audit_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
    if (hasReadBudget && request.readBudget === undefined) {
        throw new Error("owner_index_read_budget_invalid");
    }
    const readBudget = parseReadBudget(hasReadBudget ? request.readBudget : undefined, DEFAULT_AUDIT_READ_BUDGET);
    const accountScopeHash = request.accountScopeHash;
    const indexKind = request.indexKind;
    const parsedManifest = parseManifest(request.manifest, accountScopeHash, indexKind).manifest;
    const manifestFingerprint = (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(parsedManifest));
    let stack;
    let visitedNodeCount;
    let visitedEntryCount;
    let accumulatorFingerprint;
    if (request.cursor === null) {
        stack =
            parsedManifest.rootNodeRef === null
                ? []
                : [
                    {
                        ref: parsedManifest.rootNodeRef,
                        depth: 0,
                        prefix: "",
                        entryCount: parsedManifest.entryCount,
                    },
                ];
        visitedNodeCount = 0;
        visitedEntryCount = 0;
        accumulatorFingerprint = (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "learning-v2-owner-repository-radix-audit-seed.v1",
            accountScopeHash,
            indexKind,
            manifestFingerprint,
            expectedEntryCount: parsedManifest.entryCount,
        });
    }
    else {
        if (!isRecord(request.cursor) || !AUDIT_CURSORS.has(request.cursor)) {
            throw new Error("owner_index_audit_invalid");
        }
        const cursor = request.cursor;
        if (cursor.accountScopeHash !== accountScopeHash ||
            cursor.indexKind !== indexKind ||
            cursor.manifestFingerprint !== manifestFingerprint ||
            cursor.expectedEntryCount !== parsedManifest.entryCount ||
            !safe(cursor.visitedNodeCount) ||
            !safe(cursor.visitedEntryCount) ||
            typeof cursor.accumulatorFingerprint !== "string" ||
            !HASH.test(cursor.accumulatorFingerprint) ||
            !Array.isArray(cursor.stack)) {
            throw new Error("owner_index_audit_invalid");
        }
        stack = [...cursor.stack];
        visitedNodeCount = cursor.visitedNodeCount;
        visitedEntryCount = cursor.visitedEntryCount;
        accumulatorFingerprint = cursor.accumulatorFingerprint;
    }
    const reader = createBudgetedNodeReader(request.resolveNode, readBudget);
    const entries = [];
    let visitedNodesThisPage = 0;
    let visitedEntriesThisPage = 0;
    while (stack.length > 0 && visitedNodesThisPage < Number(request.maxNodes)) {
        const frame = stack.pop();
        const raw = await reader.read(frame.ref);
        if (raw === null)
            throw new Error("owner_index_indeterminate");
        const node = parseNode(raw, frame.ref, accountScopeHash, indexKind, frame.depth, frame.prefix, frame.entryCount);
        visitedNodeCount = checkedAdd(visitedNodeCount, 1);
        visitedNodesThisPage += 1;
        if (node.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
            visitedEntryCount = checkedAdd(visitedEntryCount, node.entryCount);
            visitedEntriesThisPage = checkedAdd(visitedEntriesThisPage, node.entryCount);
            entries.push(...node.entries);
        }
        else {
            for (let index = node.children.length - 1; index >= 0; index -= 1) {
                const child = node.children[index];
                stack.push({
                    ref: child.nodeRef,
                    depth: frame.depth + 1,
                    prefix: `${frame.prefix}${child.edge}`,
                    entryCount: child.entryCount,
                });
            }
        }
        accumulatorFingerprint = (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "learning-v2-owner-repository-radix-audit-step.v1",
            previousAccumulatorFingerprint: accumulatorFingerprint,
            nodeFingerprint: frame.ref.blobFingerprint,
            depthBytes: frame.depth,
            pathPrefix: frame.prefix,
            entryCount: frame.entryCount,
            visitedNodeCount,
            visitedEntryCount,
        });
    }
    const done = stack.length === 0;
    if (done && visitedEntryCount !== parsedManifest.entryCount) {
        throw new Error("owner_index_indeterminate");
    }
    let cursor = null;
    if (!done) {
        cursor = deepFreeze({
            schemaVersion: "learning-v2-owner-repository-radix-audit-cursor.v1",
            accountScopeHash,
            indexKind,
            manifestFingerprint,
            expectedEntryCount: parsedManifest.entryCount,
            visitedNodeCount,
            visitedEntryCount,
            accumulatorFingerprint,
            authority: "in_process_audit_cursor",
            stack,
        });
        AUDIT_CURSORS.add(cursor);
    }
    return deepFreeze({
        done,
        cursor,
        entries,
        visitedNodesThisPage,
        visitedEntriesThisPage,
        visitedNodeCount,
        visitedEntryCount,
        externalReads: reader.externalReads,
        externalBytes: reader.externalBytes,
        accumulatorFingerprint,
    });
};
exports.auditOwnerRepositoryRadixPage = auditOwnerRepositoryRadixPage;
const isOwnerRepositoryRadixAuditCursor = (value) => isRecord(value) && AUDIT_CURSORS.has(value);
exports.isOwnerRepositoryRadixAuditCursor = isOwnerRepositoryRadixAuditCursor;
//# sourceMappingURL=owner_repository_radix.js.map