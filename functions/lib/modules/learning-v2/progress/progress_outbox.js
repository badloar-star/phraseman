"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressOutbox = exports.progressOutboxPayloadFingerprint = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const progress_store_1 = require("./progress_store");
const progress_storage_lock_1 = require("./progress_storage_lock");
const KEY = (accountKey) => `v2:outbox:v2:${accountKey}`;
const LEGACY_KEY = (accountKey) => `v2:outbox:v1:${accountKey}`;
const MAX_PENDING_ITEMS = 128;
const MAX_TERMINAL_ITEMS = 32;
const MAX_LEGACY_ITEMS = 128;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_OUTBOX_BYTES = 256 * 1024;
const terminalStatuses = new Set([
    "timed_finalized",
    "system_non_assessment_finalized",
    "protocol_rejected",
]);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const canonicalizeLegacyJson = (value) => {
    if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
        const encoded = JSON.stringify(value);
        if (typeof encoded !== "string")
            throw new Error("progress_outbox_corrupt");
        return encoded;
    }
    if (Array.isArray(value))
        return `[${value.map(canonicalizeLegacyJson).join(",")}]`;
    if (!isRecord(value))
        throw new Error("progress_outbox_corrupt");
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeLegacyJson(value[key])}`).join(",")}}`;
};
const asciiEscapedHashInput = (value) => value.replace(/[\u0080-\uFFFF]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
const serializePayload = (payload, legacy = false) => {
    let encoded;
    let legacyFallback = false;
    try {
        if (legacy) {
            const legacyEncoded = JSON.stringify(payload);
            if (typeof legacyEncoded !== "string" || legacyEncoded.length > MAX_PAYLOAD_BYTES) {
                throw new Error("progress_payload_overflow");
            }
            try {
                encoded = (0, decision_registry_1.canonicalJsonV1)(payload);
            }
            catch {
                encoded = canonicalizeLegacyJson(payload);
                legacyFallback = true;
            }
        }
        else {
            encoded = (0, decision_registry_1.canonicalJsonV1)(payload);
            if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_PAYLOAD_BYTES) {
                throw new Error("progress_payload_overflow");
            }
        }
    }
    catch (error) {
        if (error instanceof Error && error.message === "progress_payload_overflow")
            throw error;
        throw new Error(legacy ? "progress_outbox_corrupt" : "progress_payload_invalid");
    }
    return Object.freeze({
        payload: deepFreeze(JSON.parse(encoded)),
        encoded,
        fingerprint: (0, decision_registry_1.sha256Utf8)(legacyFallback ? asciiEscapedHashInput(encoded) : encoded),
    });
};
/** Canonical fingerprint shared by the local outbox and its server inbox. */
const progressOutboxPayloadFingerprint = (payload) => serializePayload(payload).fingerprint;
exports.progressOutboxPayloadFingerprint = progressOutboxPayloadFingerprint;
const exactKeys = (value, allowed) => Object.keys(value).length === allowed.length &&
    Object.keys(value).every((key) => allowed.includes(key));
const validateStoredItem = (value, expectedAccountKey, expectedGeneration, legacy) => {
    if (!isRecord(value) ||
        typeof value.mutationId !== "string" ||
        !/^[A-Za-z0-9._:-]{1,160}$/.test(value.mutationId) ||
        value.accountKey !== expectedAccountKey ||
        value.accountGeneration !== expectedGeneration ||
        (value.status !== "pending" && value.status !== "terminal")) {
        throw new Error("progress_outbox_corrupt");
    }
    const hasTerminalStatus = Object.prototype.hasOwnProperty.call(value, "terminalStatus");
    const expectedKeys = legacy
        ? ["mutationId", "accountKey", "accountGeneration", "payload", "status", ...(hasTerminalStatus ? ["terminalStatus"] : [])]
        : ["mutationId", "accountKey", "accountGeneration", "payload", "payloadFingerprint", "status", ...(hasTerminalStatus ? ["terminalStatus"] : [])];
    if (!exactKeys(value, expectedKeys))
        throw new Error("progress_outbox_corrupt");
    const serialized = serializePayload(value.payload, legacy);
    if (!legacy &&
        (typeof value.payloadFingerprint !== "string" ||
            !/^[a-f0-9]{64}$/.test(value.payloadFingerprint) ||
            value.payloadFingerprint !== serialized.fingerprint)) {
        throw new Error("progress_outbox_corrupt");
    }
    if (value.status === "pending" && hasTerminalStatus) {
        throw new Error("progress_outbox_corrupt");
    }
    if (value.status === "terminal" && !hasTerminalStatus && legacy) {
        return undefined;
    }
    if (value.status === "terminal" &&
        !terminalStatuses.has(value.terminalStatus)) {
        throw new Error("progress_outbox_corrupt");
    }
    return Object.freeze({
        mutationId: value.mutationId,
        accountKey: expectedAccountKey,
        accountGeneration: expectedGeneration,
        payload: serialized.payload,
        payloadFingerprint: serialized.fingerprint,
        status: value.status,
        ...(value.status === "terminal"
            ? { terminalStatus: value.terminalStatus }
            : {}),
    });
};
const validateItems = (values, accountKey, generation, legacy) => {
    if (values.length > (legacy ? MAX_LEGACY_ITEMS : MAX_PENDING_ITEMS + MAX_TERMINAL_ITEMS)) {
        throw new Error("progress_outbox_corrupt");
    }
    const items = values
        .map((item) => validateStoredItem(item, accountKey, generation, legacy))
        .filter((item) => item !== undefined);
    if (new Set(items.map((item) => item.mutationId)).size !== items.length) {
        throw new Error("progress_outbox_corrupt");
    }
    if (items.filter((item) => item.status === "pending").length > MAX_PENDING_ITEMS) {
        throw new Error("progress_outbox_corrupt");
    }
    if (!legacy && items.filter((item) => item.status === "terminal").length > MAX_TERMINAL_ITEMS) {
        throw new Error("progress_outbox_corrupt");
    }
    return items;
};
const parseEnvelope = (raw, accountKey, generation) => {
    if (raw.length > MAX_OUTBOX_BYTES)
        throw new Error("progress_outbox_corrupt");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error("progress_outbox_corrupt");
    }
    if (Array.isArray(parsed)) {
        return { items: validateItems(parsed, accountKey, generation, true), source: "legacy" };
    }
    if ((0, decision_registry_1.utf8ByteLengthV1)(raw) > MAX_OUTBOX_BYTES ||
        !isRecord(parsed) ||
        !exactKeys(parsed, ["schemaVersion", "accountKey", "items"]) ||
        parsed.schemaVersion !== "v2-progress-outbox.v2" ||
        parsed.accountKey !== accountKey ||
        !Array.isArray(parsed.items)) {
        throw new Error("progress_outbox_corrupt");
    }
    return { items: validateItems(parsed.items, accountKey, generation, false), source: "v2" };
};
const encodeEnvelope = (accountKey, items) => {
    const terminal = items.filter((item) => item.status === "terminal");
    const pending = items.filter((item) => item.status === "pending");
    if (pending.length > MAX_PENDING_ITEMS)
        throw new Error("progress_outbox_capacity");
    const boundedTerminal = terminal.slice(-MAX_TERMINAL_ITEMS);
    const envelope = {
        schemaVersion: "v2-progress-outbox.v2",
        accountKey,
        items: [...boundedTerminal, ...pending],
    };
    const encoded = JSON.stringify(envelope);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_OUTBOX_BYTES)
        throw new Error("progress_outbox_overflow");
    return encoded;
};
const canEncodeAsV2 = (item) => {
    try {
        const serialized = serializePayload(item.payload);
        return serialized.fingerprint === item.payloadFingerprint;
    }
    catch {
        return false;
    }
};
const encodeLegacyItems = (items) => {
    const pending = items.filter((item) => item.status === "pending");
    if (pending.length > MAX_PENDING_ITEMS)
        throw new Error("progress_outbox_capacity");
    const terminalCapacity = Math.max(0, MAX_LEGACY_ITEMS - pending.length);
    const bounded = [
        ...items.filter((item) => item.status === "terminal").slice(-terminalCapacity),
        ...pending,
    ];
    const encoded = JSON.stringify(bounded.map((item) => ({
        mutationId: item.mutationId,
        accountKey: item.accountKey,
        accountGeneration: item.accountGeneration,
        payload: item.payload,
        status: item.status,
        ...(item.status === "terminal" ? { terminalStatus: item.terminalStatus } : {}),
    })));
    if (encoded.length > MAX_OUTBOX_BYTES)
        throw new Error("progress_outbox_overflow");
    return encoded;
};
const createProgressOutbox = (storage, isCurrentGeneration) => {
    const assertGeneration = (scope) => {
        if (!isCurrentGeneration(scope))
            throw new Error("progress_generation_stale");
    };
    const lockKey = (scope) => `outbox:${KEY((0, progress_store_1.progressAccountKey)(scope))}`;
    const readItems = async (scope) => {
        assertGeneration(scope);
        const accountKey = (0, progress_store_1.progressAccountKey)(scope);
        const current = await storage.getItem(KEY(accountKey));
        assertGeneration(scope);
        if (current !== null)
            return parseEnvelope(current, accountKey, scope.generation);
        const legacy = await storage.getItem(LEGACY_KEY(accountKey));
        assertGeneration(scope);
        return legacy === null
            ? { items: [], source: "empty" }
            : parseEnvelope(legacy, accountKey, scope.generation);
    };
    const writeItems = async (scope, items, source) => {
        assertGeneration(scope);
        const accountKey = (0, progress_store_1.progressAccountKey)(scope);
        if (source === "legacy" && items.some((item) => !canEncodeAsV2(item))) {
            await storage.setItem(LEGACY_KEY(accountKey), encodeLegacyItems(items));
            assertGeneration(scope);
            return;
        }
        await storage.setItem(KEY(accountKey), encodeEnvelope(accountKey, items));
        assertGeneration(scope);
        if (source === "legacy" && storage.removeItem) {
            try {
                await storage.removeItem(LEGACY_KEY(accountKey));
            }
            catch {
                // V2 is authoritative once its write succeeds; stale V1 is ignored.
            }
            assertGeneration(scope);
        }
    };
    return {
        async list(scope) {
            return (0, progress_storage_lock_1.withProgressStorageLock)(lockKey(scope), async () => [
                ...(await readItems(scope)).items,
            ], storage.operationTimeoutMs);
        },
        async enqueue(scope, mutationId, payload) {
            assertGeneration(scope);
            if (!/^[A-Za-z0-9._:-]{1,160}$/.test(mutationId)) {
                throw new Error("progress_mutation_id_invalid");
            }
            const serialized = serializePayload(payload);
            if (isRecord(serialized.payload) &&
                serialized.payload.kind === "scheduled_delayed_probe" &&
                /(learningRef|learningEvidence|evidenceRef)/i.test(serialized.encoded)) {
                throw new Error("delayed_candidate_learning_ref_forbidden");
            }
            const accountKey = (0, progress_store_1.progressAccountKey)(scope);
            return (0, progress_storage_lock_1.withProgressStorageLock)(lockKey(scope), async () => {
                const state = await readItems(scope);
                const existing = state.items.find((item) => item.mutationId === mutationId);
                if (existing) {
                    if (existing.payloadFingerprint !== serialized.fingerprint) {
                        throw new Error("progress_mutation_id_reused");
                    }
                    return existing;
                }
                if (state.items.filter((item) => item.status === "pending").length >= MAX_PENDING_ITEMS) {
                    throw new Error("progress_outbox_capacity");
                }
                const item = Object.freeze({
                    mutationId,
                    accountKey,
                    accountGeneration: scope.generation,
                    payload: serialized.payload,
                    payloadFingerprint: serialized.fingerprint,
                    status: "pending",
                });
                await writeItems(scope, [...state.items, item], state.source);
                return item;
            }, storage.operationTimeoutMs);
        },
        async acknowledge(scope, identity, terminalStatus) {
            assertGeneration(scope);
            if (!terminalStatuses.has(terminalStatus))
                throw new Error("progress_terminal_status_invalid");
            return (0, progress_storage_lock_1.withProgressStorageLock)(lockKey(scope), async () => {
                const state = await readItems(scope);
                const item = state.items.find((candidate) => candidate.mutationId === identity.mutationId);
                if (!item)
                    throw new Error("progress_mutation_missing");
                if (item.payloadFingerprint !== identity.payloadFingerprint)
                    throw new Error("progress_mutation_payload_conflict");
                if (item.status === "terminal") {
                    if (item.terminalStatus !== terminalStatus)
                        throw new Error("progress_ack_state_conflict");
                    return "already_recorded";
                }
                await writeItems(scope, state.items.map((candidate) => candidate.mutationId === identity.mutationId
                    ? Object.freeze({ ...candidate, status: "terminal", terminalStatus })
                    : candidate), state.source);
                return "recorded";
            }, storage.operationTimeoutMs);
        },
        async completeAccepted(scope, identity) {
            assertGeneration(scope);
            return (0, progress_storage_lock_1.withProgressStorageLock)(lockKey(scope), async () => {
                const state = await readItems(scope);
                const item = state.items.find((candidate) => candidate.mutationId === identity.mutationId);
                if (!item)
                    return "already_removed";
                if (item.payloadFingerprint !== identity.payloadFingerprint)
                    throw new Error("progress_mutation_payload_conflict");
                if (item.status !== "pending")
                    throw new Error("progress_ack_state_conflict");
                await writeItems(scope, state.items.filter((candidate) => candidate.mutationId !== identity.mutationId), state.source);
                return "removed";
            }, storage.operationTimeoutMs);
        },
        async clear(scope) {
            assertGeneration(scope);
            if (!storage.removeItem)
                throw new Error("progress_storage_remove_unsupported");
            await (0, progress_storage_lock_1.withProgressStorageLock)(lockKey(scope), async () => {
                const accountKey = (0, progress_store_1.progressAccountKey)(scope);
                await storage.removeItem(LEGACY_KEY(accountKey));
                assertGeneration(scope);
                await storage.removeItem(KEY(accountKey));
                assertGeneration(scope);
            }, storage.operationTimeoutMs);
        },
    };
};
exports.createProgressOutbox = createProgressOutbox;
//# sourceMappingURL=progress_outbox.js.map