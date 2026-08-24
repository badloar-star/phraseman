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
exports.adminGetV2OwnerGeneratorSetupCatalog = exports.V2_OWNER_GENERATOR_SETUP_CATALOG_SCHEMA_V1 = void 0;
exports.readV2OwnerGeneratorSetupCatalogV1 = readV2OwnerGeneratorSetupCatalogV1;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const language_profile_1 = require("../../../modules/learning-v2/content/language_profile");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const callable_options_1 = require("../callable_options");
const immutable_object_reader_1 = require("../content_studio/immutable_object_reader");
const v2_authenticated_repository_contract_v1_1 = require("./v2_authenticated_repository_contract_v1");
const v2_voice_profile_contracts_v1_1 = require("./v2_voice_profile_contracts_v1");
const v2_voice_profile_repository_contract_v1_1 = require("./v2_voice_profile_repository_contract_v1");
const v2_root_owner_identity_v1_1 = require("./v2_root_owner_identity_v1");
exports.V2_OWNER_GENERATOR_SETUP_CATALOG_SCHEMA_V1 = "v2-owner-generator-setup-catalog.v1";
const LANGUAGE_LIFECYCLE = "content_language_profile_lifecycle";
const TEMPLATE_LIFECYCLE = "content_mode_template_lifecycle";
const DECISION_REGISTRIES = "content_decision_registries";
const MAX_ROWS = 100;
const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
function record(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return (actual.length === expected.length &&
        actual.every((key, index) => key === expected[index]));
}
function identity(value, idKey) {
    const id = value[idKey];
    const version = value.version;
    const contentHash = value.contentHash;
    if (typeof id !== "string" ||
        !TOKEN_RE.test(id) ||
        typeof version !== "number" ||
        !Number.isSafeInteger(version) ||
        version < 1 ||
        version > 1_000_000 ||
        typeof contentHash !== "string" ||
        !HASH_RE.test(contentHash))
        throw new Error("v2_owner_generator_setup_identity_invalid");
    return Object.freeze({ id, version, contentHash });
}
function objectPin(value) {
    const object = value.object;
    if (!record(object) ||
        !exactKeys(object, [
            "objectPath",
            "contentHash",
            "objectGeneration",
            "byteSize",
        ]) ||
        typeof object.objectPath !== "string" ||
        typeof object.contentHash !== "string" ||
        !HASH_RE.test(object.contentHash) ||
        typeof object.objectGeneration !== "string" ||
        !/^[1-9][0-9]{0,30}$/u.test(object.objectGeneration) ||
        typeof object.byteSize !== "number" ||
        !Number.isSafeInteger(object.byteSize) ||
        object.byteSize < 2 ||
        object.byteSize > 512 * 1024)
        throw new Error("v2_owner_generator_setup_pin_invalid");
    return Object.freeze({
        objectPath: object.objectPath,
        contentHash: object.contentHash,
        objectGeneration: object.objectGeneration,
        byteSize: object.byteSize,
    });
}
function matchingIdentity(left, right) {
    if ((0, decision_registry_1.canonicalJsonV1)(left) !== (0, decision_registry_1.canonicalJsonV1)(right))
        throw new Error("v2_owner_generator_setup_identity_mismatch");
}
async function languageEntries(targetLanguage, dependencies) {
    const rows = await dependencies.listDocuments(LANGUAGE_LIFECYCLE, MAX_ROWS);
    const result = [];
    let rejected = 0;
    for (const row of rows) {
        try {
            const lifecycle = row.data;
            if (!exactKeys(lifecycle, [
                "schemaVersion",
                "profileId",
                "version",
                "contentHash",
                "status",
                "reason",
                "changedBy",
                "changedAt",
                "lifecycleRevision",
            ]) ||
                lifecycle.schemaVersion !== "v2-language-profile-lifecycle.v1" ||
                lifecycle.status !== "published")
                throw new Error("lifecycle_invalid");
            const lifecycleIdentity = identity(lifecycle, "profileId");
            if (`${LANGUAGE_LIFECYCLE}/${row.id}` !==
                (0, v2_authenticated_repository_contract_v1_1.v2LanguageProfileLifecycleDocumentPathV1)(lifecycleIdentity.id, lifecycleIdentity.version))
                throw new Error("path_invalid");
            const recordPath = (0, v2_authenticated_repository_contract_v1_1.v2LanguageProfileVersionDocumentPathV1)(lifecycleIdentity.id, lifecycleIdentity.version);
            const stored = await dependencies.readDocument(recordPath);
            if (!stored ||
                !exactKeys(stored, [
                    "schemaVersion",
                    "profileId",
                    "version",
                    "contentHash",
                    "object",
                    "provenance",
                    "createdAt",
                ]) ||
                stored.schemaVersion !== "v2-language-profile-record.v1")
                throw new Error("record_invalid");
            const storedIdentity = identity(stored, "profileId");
            matchingIdentity(lifecycleIdentity, storedIdentity);
            const pin = objectPin(stored);
            if (pin.contentHash !== storedIdentity.contentHash ||
                pin.objectPath !==
                    (0, v2_authenticated_repository_contract_v1_1.v2LanguageProfileObjectPathV1)(storedIdentity.id, storedIdentity.version, storedIdentity.contentHash))
                throw new Error("pin_invalid");
            const body = await dependencies.readCanonicalObject(pin);
            const validated = (0, language_profile_1.validateV2LanguageProfile)(body);
            if (!validated.ok ||
                validated.value.profileId !== storedIdentity.id ||
                validated.value.version !== storedIdentity.version ||
                validated.value.targetLanguage !== targetLanguage)
                throw new Error("body_invalid");
            result.push(Object.freeze({
                profileId: storedIdentity.id,
                targetLanguage: validated.value.targetLanguage,
                version: storedIdentity.version,
                contentHash: storedIdentity.contentHash,
            }));
        }
        catch {
            rejected += 1;
        }
    }
    return { entries: result, rejected };
}
async function templateEntries(dependencies) {
    const rows = await dependencies.listDocuments(TEMPLATE_LIFECYCLE, MAX_ROWS);
    const result = [];
    let rejected = 0;
    for (const row of rows) {
        try {
            const lifecycleValidation = (0, validation_1.validateModeTemplateLifecycleHead)(row.data);
            if (!lifecycleValidation.ok ||
                lifecycleValidation.value.status !== "published" ||
                "replacementRef" in lifecycleValidation.value ||
                "noReplacement" in lifecycleValidation.value ||
                row.id !==
                    `${lifecycleValidation.value.templateId}__v${lifecycleValidation.value.version}`)
                throw new Error("lifecycle_invalid");
            const lifecycleIdentity = Object.freeze({
                id: lifecycleValidation.value.templateId,
                version: lifecycleValidation.value.version,
                contentHash: lifecycleValidation.value.contentHash,
            });
            const stored = await dependencies.readDocument(`content_mode_template_versions/${lifecycleIdentity.id}__v${lifecycleIdentity.version}`);
            if (!stored ||
                !exactKeys(stored, [
                    "schemaVersion",
                    "templateId",
                    "version",
                    "contentHash",
                    "object",
                    "provenance",
                    "createdAt",
                ]) ||
                stored.schemaVersion !== "v2-mode-template-record.v1")
                throw new Error("record_invalid");
            const storedIdentity = identity(stored, "templateId");
            matchingIdentity(lifecycleIdentity, storedIdentity);
            const pin = objectPin(stored);
            const expectedPath = `content-studio/mode-templates/${(0, decision_registry_1.sha256Utf8)(storedIdentity.id)}/v${storedIdentity.version}/${storedIdentity.contentHash}.json`;
            if (pin.objectPath !== expectedPath ||
                pin.contentHash !== storedIdentity.contentHash)
                throw new Error("pin_invalid");
            const body = await dependencies.readCanonicalObject(pin);
            const validated = (0, validation_1.validateModeTemplateArtifactBody)(body);
            if (!validated.ok ||
                validated.value.templateId !== storedIdentity.id ||
                validated.value.version !== storedIdentity.version)
                throw new Error("body_invalid");
            result.push(Object.freeze({
                templateId: storedIdentity.id,
                version: storedIdentity.version,
                contentHash: storedIdentity.contentHash,
                family: validated.value.family,
                humanName: validated.value.humanName,
            }));
        }
        catch {
            rejected += 1;
        }
    }
    return { entries: result, rejected };
}
async function voiceEntries(targetLanguage, profileKind, dependencies) {
    const collection = profileKind === "speech_profile"
        ? v2_voice_profile_repository_contract_v1_1.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.speechLifecycle
        : v2_voice_profile_repository_contract_v1_1.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.generationLifecycle;
    const rows = await dependencies.listDocuments(collection, MAX_ROWS);
    const result = [];
    let rejected = 0;
    for (const row of rows) {
        try {
            const lifecycle = (0, v2_voice_profile_repository_contract_v1_1.parseV2VoiceProfileRepositoryLifecycleV1)((0, decision_registry_1.canonicalJsonV1)(row.data));
            if (lifecycle.profileKind !== profileKind ||
                `${collection}/${row.id}` !==
                    (0, v2_voice_profile_repository_contract_v1_1.v2VoiceProfileRepositoryLifecycleDocumentPathV1)(profileKind, lifecycle.profileId, lifecycle.version))
                throw new Error("lifecycle_invalid");
            const recordRaw = await dependencies.readDocument((0, v2_voice_profile_repository_contract_v1_1.v2VoiceProfileRepositoryRecordDocumentPathV1)(profileKind, lifecycle.profileId, lifecycle.version));
            if (!recordRaw)
                throw new Error("record_missing");
            const stored = (0, v2_voice_profile_repository_contract_v1_1.parseV2VoiceProfileRepositoryRecordV1)((0, decision_registry_1.canonicalJsonV1)(recordRaw));
            if (stored.profileId !== lifecycle.profileId ||
                stored.version !== lifecycle.version ||
                stored.contentHash !== lifecycle.contentHash)
                throw new Error("identity_invalid");
            const body = await dependencies.readCanonicalObject(stored.object);
            if (profileKind === "speech_profile") {
                const parsed = (0, v2_voice_profile_contracts_v1_1.parseV2SpeechProfileBodyV1)((0, decision_registry_1.canonicalJsonV1)(body));
                if (parsed.profileId !== stored.profileId ||
                    parsed.version !== stored.version ||
                    parsed.targetLanguage !== targetLanguage)
                    throw new Error("body_invalid");
                result.push(Object.freeze({
                    profileId: stored.profileId,
                    targetLanguage: parsed.targetLanguage,
                    speechLocale: parsed.speechLocale,
                    version: stored.version,
                    contentHash: stored.contentHash,
                }));
            }
            else {
                const parsed = (0, v2_voice_profile_contracts_v1_1.parseV2VoiceGenerationProfileBodyV1)((0, decision_registry_1.canonicalJsonV1)(body));
                if (parsed.profileId !== stored.profileId ||
                    parsed.version !== stored.version)
                    throw new Error("body_invalid");
                result.push(Object.freeze({
                    profileId: stored.profileId,
                    version: stored.version,
                    contentHash: stored.contentHash,
                    providerFamily: parsed.providerFamily,
                    model: parsed.model,
                }));
            }
        }
        catch {
            rejected += 1;
        }
    }
    return { entries: result, rejected };
}
async function decisionEntries(dependencies) {
    const rows = await dependencies.listDocuments(DECISION_REGISTRIES, 20);
    const result = [];
    let rejected = 0;
    for (const row of rows) {
        try {
            const validatedRecord = (0, decision_registry_1.validateDecisionRegistryRecord)(row.data);
            if (!validatedRecord.ok)
                throw new Error("record_invalid");
            const recordValue = validatedRecord.value;
            if (row.id !== `${recordValue.ref.id}__v${recordValue.ref.version}`)
                throw new Error("path_invalid");
            const body = await dependencies.readCanonicalObject({
                objectPath: recordValue.object.objectPath,
                contentHash: recordValue.object.contentHash,
                objectGeneration: recordValue.object.objectGeneration,
                byteSize: recordValue.object.byteSize,
            });
            const validated = (0, decision_registry_1.validateDecisionRegistry)({
                body,
                record: recordValue,
            });
            if (!validated.ok || !validated.value.body.decisions["HYP-V2-007"])
                throw new Error("body_invalid");
            result.push(Object.freeze({
                decisionId: "HYP-V2-007",
                registryId: validated.value.body.registryId,
                version: recordValue.ref.version,
                contentHash: recordValue.ref.contentHash,
            }));
        }
        catch {
            rejected += 1;
        }
    }
    return { entries: result, rejected };
}
function compareRef(left, right) {
    const a = (0, decision_registry_1.canonicalJsonV1)(left);
    const b = (0, decision_registry_1.canonicalJsonV1)(right);
    return a < b ? -1 : a > b ? 1 : 0;
}
async function readV2OwnerGeneratorSetupCatalogV1(request, dependencies) {
    (dependencies.authenticateOwner ?? v2_root_owner_identity_v1_1.requireV2ConfiguredRootOwnerV1)(request.auth);
    if (!record(request.data) ||
        !exactKeys(request.data, ["targetLanguage"]) ||
        typeof request.data.targetLanguage !== "string" ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(request.data.targetLanguage) === null)
        throw new Error("v2_owner_generator_setup_request_invalid");
    const targetLanguage = request.data.targetLanguage;
    const [language, speech, generation, templates, decisions] = await Promise.all([
        languageEntries(targetLanguage, dependencies),
        voiceEntries(targetLanguage, "speech_profile", dependencies),
        voiceEntries(targetLanguage, "voice_generation_profile", dependencies),
        templateEntries(dependencies),
        decisionEntries(dependencies),
    ]);
    return Object.freeze({
        ok: true,
        schemaVersion: exports.V2_OWNER_GENERATOR_SETUP_CATALOG_SCHEMA_V1,
        targetLanguage,
        languageProfiles: Object.freeze(language.entries.sort(compareRef)),
        speechProfiles: Object.freeze(speech.entries.sort(compareRef)),
        voiceGenerationProfiles: Object.freeze(generation.entries.sort(compareRef)),
        templates: Object.freeze(templates.entries.sort(compareRef)),
        decisionRegistries: Object.freeze(decisions.entries.sort(compareRef)),
        rejectedCounts: Object.freeze({
            languageProfiles: language.rejected,
            speechProfiles: speech.rejected,
            voiceGenerationProfiles: generation.rejected,
            templates: templates.rejected,
            decisionRegistries: decisions.rejected,
        }),
        ownerContentBoundary: "owner_creates_all_real_episode_content",
        catalogUse: "setup_selection_only_server_revalidates_on_use",
        generationAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    });
}
function firebaseDependencies() {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    return Object.freeze({
        async listDocuments(collection, maximum) {
            const snapshot = await db.collection(collection).limit(maximum).get();
            return snapshot.docs.map((document) => Object.freeze({
                id: document.id,
                data: Object.freeze(document.data()),
            }));
        },
        async readDocument(path) {
            const snapshot = await db.doc(path).get();
            return snapshot.exists ? Object.freeze(snapshot.data() ?? {}) : null;
        },
        async readCanonicalObject(input) {
            const file = bucket.file(input.objectPath);
            const [metadata] = await file.getMetadata();
            const contentType = String(metadata.contentType ?? "");
            const declaredSize = Number(metadata.size);
            if (!/^application\/json(?:;\s*charset=utf-8)?$/iu.test(contentType) ||
                !Number.isSafeInteger(declaredSize) ||
                declaredSize !== input.byteSize)
                throw new Error("v2_owner_generator_setup_object_metadata_invalid");
            return (await (0, immutable_object_reader_1.readImmutableCanonicalObject)(file, {
                expectedHash: input.contentHash,
                expectedGeneration: input.objectGeneration,
                expectedByteSize: input.byteSize,
            })).body;
        },
    });
}
exports.adminGetV2OwnerGeneratorSetupCatalog = (0, https_1.onCall)({ region: "us-central1", enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_ADMIN }, async (request) => {
    try {
        return await readV2OwnerGeneratorSetupCatalogV1(request, firebaseDependencies());
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        const message = error instanceof Error ? error.message : "";
        throw new https_1.HttpsError("failed-precondition", /^v2_owner_generator_setup_[a-z0-9_]+$/u.test(message)
            ? message
            : "v2_owner_generator_setup_failed");
    }
});
//# sourceMappingURL=v2_owner_generator_setup_catalog_v1.js.map