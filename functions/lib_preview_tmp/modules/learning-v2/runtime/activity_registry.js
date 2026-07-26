"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivityRegistry = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const unsupported_activity_1 = require("./unsupported_activity");
const POLICY_KINDS = [
    "evidence", "scoring", "progress", "reward", "recovery",
];
const exactRef = (left, right) => left.kind === right.kind && left.key === right.key && left.version === right.version &&
    left.contentHash === right.contentHash;
const assertPolicy = (catalog, ref) => {
    const entry = catalog.resolve(ref);
    if (!entry)
        throw new Error("v2_activity_policy_ref_not_found");
    if (entry.body.schemaVersion !== "content-studio-policy-body.v1" ||
        entry.body.kind !== ref.kind || entry.body.key !== ref.key || entry.body.version !== ref.version ||
        entry.ref.kind !== ref.kind || entry.ref.key !== ref.key || entry.ref.version !== ref.version ||
        entry.ref.contentHash !== ref.contentHash || entry.ref.contentHash !== (0, decision_registry_1.hashCanonicalBody)(entry.body) ||
        !exactRef(entry.record.ref, ref) || entry.record.object.contentHash !== ref.contentHash ||
        !entry.record.object.objectPath || !entry.record.object.objectGeneration ||
        !Number.isSafeInteger(entry.record.object.byteSize) || entry.record.object.byteSize < 1) {
        throw new Error("v2_activity_policy_descriptor_mismatch");
    }
    if (!entry.body.compatibleFamilies.length ||
        !entry.body.compatibleKernelKeys.length) {
        throw new Error("v2_activity_policy_descriptor_mismatch");
    }
    return entry;
};
const assertCapabilities = (registration, available) => {
    const { capabilities } = registration;
    if (capabilities.microphone === "required" && !available.microphone) {
        throw new Error("v2_activity_capability_unsupported");
    }
    if (capabilities.speechRecognition === "required" && !available.speechRecognition) {
        throw new Error("v2_activity_capability_unsupported");
    }
    if (capabilities.network === "required" && !available.network) {
        throw new Error("v2_activity_capability_unsupported");
    }
    if (capabilities.speechRecognition === "required" && capabilities.microphone === "none") {
        throw new Error("v2_activity_capability_unsupported");
    }
};
const createActivityRegistry = (options) => {
    const available = options.runtimeCapabilities ?? {
        microphone: true,
        speechRecognition: true,
        network: true,
    };
    const byType = new Map();
    if (options.policyCatalog.entries) {
        const policyIdentity = new Map();
        for (const entry of options.policyCatalog.entries) {
            const identity = `${entry.ref.kind}:${entry.ref.key}@${entry.ref.version}`;
            const previousHash = policyIdentity.get(identity);
            if (previousHash && previousHash !== entry.ref.contentHash) {
                throw new Error("v2_activity_policy_ambiguous_ref");
            }
            policyIdentity.set(identity, entry.ref.contentHash);
        }
    }
    for (const registration of options.registrations) {
        if (!registration || !registration.activityTypeKey || byType.has(registration.activityTypeKey)) {
            throw new Error("v2_activity_duplicate_type");
        }
        if (!Number.isSafeInteger(registration.kernelVersion) || registration.kernelVersion < 1 ||
            !Number.isSafeInteger(registration.payloadSchemaVersion) || registration.payloadSchemaVersion < 1 ||
            !registration.rendererKey || typeof registration.validatePayload !== "function" ||
            typeof registration.resolveRenderer !== "function") {
            throw new Error("v2_activity_registration_invalid");
        }
        if (!registration.capabilities || !registration.accessibilityFallback) {
            throw new Error("v2_activity_registration_invalid");
        }
        assertCapabilities(registration, available);
        for (const kind of POLICY_KINDS) {
            assertPolicy(options.policyCatalog, registration.policies[kind]);
            const resolved = options.policyCatalog.resolve(registration.policies[kind]);
            if (!resolved?.body.compatibleFamilies.includes(registration.family) ||
                !resolved.body.compatibleKernelKeys.includes(registration.activityTypeKey)) {
                // Catalogs may publish a kernel alias.  A registration's renderer key is
                // the executable identity, while activity type remains the payload key.
                if (!resolved?.body.compatibleKernelKeys.includes(registration.rendererKey)) {
                    throw new Error("v2_activity_policy_incompatible");
                }
            }
        }
        byType.set(registration.activityTypeKey, Object.freeze({ ...registration }));
    }
    return Object.freeze({
        get: (activityTypeKey) => {
            const registration = byType.get(activityTypeKey);
            if (!registration)
                throw new unsupported_activity_1.UnsupportedActivityError(activityTypeKey);
            return registration;
        },
        resolveRenderer: (activityTypeKey) => byType.get(activityTypeKey)
            ? byType.get(activityTypeKey).resolveRenderer()
            : (() => { throw new unsupported_activity_1.UnsupportedActivityError(activityTypeKey); })(),
        list: () => Object.freeze([...byType.values()]),
    });
};
exports.createActivityRegistry = createActivityRegistry;
//# sourceMappingURL=activity_registry.js.map