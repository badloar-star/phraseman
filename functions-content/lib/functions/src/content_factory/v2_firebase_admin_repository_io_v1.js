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
exports.createV2FirebaseAdminRepositoryIoV1 = createV2FirebaseAdminRepositoryIoV1;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_authenticated_repository_contract_v1_1 = require("./v2_authenticated_repository_contract_v1");
const v2_firebase_repository_trust_root_v1_1 = require("./v2_firebase_repository_trust_root_v1");
const v2_voice_profile_repository_contract_v1_1 = require("./v2_voice_profile_repository_contract_v1");
const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const encoder = new TextEncoder();
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasExactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return (actual.length === wanted.length &&
        actual.every((key, index) => key === wanted[index]));
}
function sha256Bytes(value) {
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
}
function timestamp(value) {
    if (!isRecord(value) ||
        !Number.isSafeInteger(value.seconds) ||
        Number(value.seconds) < 0 ||
        !Number.isSafeInteger(value.nanoseconds) ||
        Number(value.nanoseconds) < 0 ||
        Number(value.nanoseconds) > 999_999_999)
        fail("v2_firebase_admin_repository_timestamp_invalid");
    return Object.freeze({
        seconds: String(value.seconds),
        nanoseconds: Number(value.nanoseconds),
    });
}
function timestampEqual(left, right) {
    return (left.seconds === right.seconds && left.nanoseconds === right.nanoseconds);
}
function canonicalDocumentBytes(value, maximumBytes) {
    if (!isRecord(value))
        fail("v2_firebase_admin_repository_document_invalid");
    const raw = (0, decision_registry_1.canonicalJsonV1)(value);
    if ((0, decision_registry_1.utf8ByteLengthV1)(raw) < 1 || (0, decision_registry_1.utf8ByteLengthV1)(raw) > maximumBytes)
        fail("v2_firebase_admin_repository_document_size_invalid");
    return encoder.encode(raw);
}
async function readCanonicalDocumentExact(db, input) {
    if (!isRecord(input) ||
        Object.keys(input).sort().join("|") !== "documentPath|maximumBytes" ||
        typeof input.documentPath !== "string" ||
        input.documentPath.length < 3 ||
        input.documentPath.length > 1024 ||
        input.documentPath.startsWith("/") ||
        input.documentPath.includes("..") ||
        input.documentPath.split("/").length % 2 !== 0 ||
        !Number.isSafeInteger(input.maximumBytes) ||
        input.maximumBytes < 1 ||
        input.maximumBytes > 1024 * 1024)
        fail("v2_firebase_admin_repository_document_read_input_invalid");
    const reference = db.doc(input.documentPath);
    const snapshots = await db.getAll(reference);
    const snapshot = snapshots[0];
    if (snapshots.length !== 1 ||
        !snapshot?.exists ||
        snapshot.ref.path !== input.documentPath ||
        snapshot.readTime === null ||
        snapshot.updateTime === null)
        fail("v2_firebase_admin_repository_document_read_missing");
    const bytes = canonicalDocumentBytes(snapshot.data(), input.maximumBytes);
    return Object.freeze({
        documentPath: input.documentPath,
        canonicalRaw: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        readTime: timestamp(snapshot.readTime),
        updateTime: timestamp(snapshot.updateTime),
    });
}
function requirementPaths(requirement) {
    return requirement.dependencyType === "language_profile"
        ? Object.freeze({
            versionDocumentPath: (0, v2_authenticated_repository_contract_v1_1.v2LanguageProfileVersionDocumentPathV1)(requirement.profileId, requirement.version),
            lifecycleDocumentPath: (0, v2_authenticated_repository_contract_v1_1.v2LanguageProfileLifecycleDocumentPathV1)(requirement.profileId, requirement.version),
            objectPath: (0, v2_authenticated_repository_contract_v1_1.v2LanguageProfileObjectPathV1)(requirement.profileId, requirement.version, requirement.contentHash),
        })
        : Object.freeze({
            versionDocumentPath: (0, v2_authenticated_repository_contract_v1_1.v2ModeTemplateVersionDocumentPathV1)(requirement.templateId, requirement.version),
            lifecycleDocumentPath: (0, v2_authenticated_repository_contract_v1_1.v2ModeTemplateLifecycleDocumentPathV1)(requirement.templateId, requirement.version),
            objectPath: (0, v2_authenticated_repository_contract_v1_1.v2ModeTemplateObjectPathV1)(requirement.templateId, requirement.version, requirement.contentHash),
        });
}
function parseStateDocument(value) {
    if (!isRecord(value) ||
        !hasExactKeys(value, ["canonicalRaw"]) ||
        typeof value.canonicalRaw !== "string")
        fail("v2_firebase_admin_repository_state_document_invalid");
    return value.canonicalRaw;
}
function firestorePort(db) {
    return Object.freeze({
        runTransaction: async (body) => db.runTransaction(async (nativeTransaction) => {
            const reads = new Map();
            const port = Object.freeze({
                readExact: async (documentPath) => {
                    const snapshot = await nativeTransaction.get(db.doc(documentPath));
                    reads.set(documentPath, snapshot);
                    return snapshot.exists
                        ? Object.freeze({
                            exists: true,
                            raw: parseStateDocument(snapshot.data()),
                        })
                        : Object.freeze({ exists: false });
                },
                createExact: async (documentPath, canonicalRaw) => {
                    nativeTransaction.create(db.doc(documentPath), { canonicalRaw });
                },
                compareAndSetExact: async (documentPath, expected, canonicalRaw) => {
                    const snapshot = reads.get(documentPath);
                    if (!snapshot?.exists)
                        fail("v2_firebase_admin_repository_cas_read_missing");
                    let current;
                    try {
                        current = JSON.parse(parseStateDocument(snapshot.data()));
                    }
                    catch {
                        fail("v2_firebase_admin_repository_state_document_invalid");
                    }
                    if (!isRecord(current) ||
                        current.operationRevision !== expected.operationRevision ||
                        current.operationFingerprint !== expected.operationFingerprint)
                        fail("v2_firebase_admin_repository_cas_conflict");
                    nativeTransaction.update(db.doc(documentPath), { canonicalRaw });
                },
            });
            return body(port);
        }),
    });
}
function metadata(value) {
    if (!isRecord(value) ||
        typeof value.generation !== "string" ||
        !GENERATION_RE.test(value.generation) ||
        typeof value.size !== "string" ||
        !/^(0|[1-9][0-9]{0,15})$/.test(value.size) ||
        typeof value.contentType !== "string" ||
        !isRecord(value.metadata) ||
        typeof value.metadata.contentHash !== "string" ||
        !HASH_RE.test(value.metadata.contentHash))
        fail("v2_firebase_admin_repository_storage_metadata_invalid");
    const byteSize = Number(value.size);
    if (!Number.isSafeInteger(byteSize) || byteSize < 1)
        fail("v2_firebase_admin_repository_storage_metadata_invalid");
    return Object.freeze({
        generation: value.generation,
        byteSize,
        contentType: value.contentType,
        contentHash: value.metadata.contentHash,
    });
}
function errorCode(error) {
    return isRecord(error) &&
        (typeof error.code === "number" || typeof error.code === "string")
        ? error.code
        : null;
}
function storagePort(bucket) {
    return Object.freeze({
        readMetadataExact: async (objectPath) => {
            try {
                const [value] = await bucket.file(objectPath).getMetadata();
                return metadata(value);
            }
            catch (error) {
                if (errorCode(error) === 404)
                    return null;
                throw error;
            }
        },
        createExact: async (input) => {
            const file = bucket.file(input.objectPath);
            try {
                await file.save(Buffer.from(input.bytes), {
                    resumable: false,
                    validation: "crc32c",
                    preconditionOpts: { ifGenerationMatch: 0 },
                    metadata: {
                        contentType: input.contentType,
                        metadata: { contentHash: input.contentHash },
                    },
                });
                const [value] = await file.getMetadata();
                return Object.freeze({
                    kind: "created",
                    metadata: metadata(value),
                });
            }
            catch (error) {
                if (errorCode(error) === 412)
                    return Object.freeze({ kind: "precondition_failed" });
                throw error;
            }
        },
        downloadGenerationExact: async (input) => {
            try {
                const [value] = await bucket
                    .file(input.objectPath, { generation: input.ifGenerationMatch })
                    .download({ validation: "crc32c" });
                if (value.byteLength > input.maximumBytes)
                    fail("v2_firebase_admin_repository_storage_download_oversize");
                return Object.freeze({
                    kind: "downloaded",
                    bytes: new Uint8Array(value),
                });
            }
            catch (error) {
                if (errorCode(error) === 404)
                    return Object.freeze({ kind: "not_found" });
                if (errorCode(error) === 412)
                    return Object.freeze({ kind: "generation_mismatch" });
                throw error;
            }
        },
        quarantineConflict: async () => {
            console.error("v2_firebase_admin_repository_immutable_conflict");
        },
    });
}
async function readHeadSnapshot(db, requirements) {
    if (!Array.isArray(requirements) ||
        requirements.length < 2 ||
        requirements.length > 29)
        fail("v2_firebase_admin_repository_requirement_count_invalid");
    const paths = requirements.map(requirementPaths);
    const references = paths.flatMap((value) => [
        db.doc(value.versionDocumentPath),
        db.doc(value.lifecycleDocumentPath),
    ]);
    const snapshots = await db.getAll(...references);
    if (snapshots.length !== references.length)
        fail("v2_firebase_admin_repository_snapshot_count_invalid");
    let coherentReadTime = null;
    const entries = requirements.map((requirement, index) => {
        const record = snapshots[index * 2];
        const lifecycle = snapshots[index * 2 + 1];
        const expected = paths[index];
        if (!record?.exists ||
            !lifecycle?.exists ||
            record.ref.path !== expected.versionDocumentPath ||
            lifecycle.ref.path !== expected.lifecycleDocumentPath)
            fail("v2_firebase_admin_repository_snapshot_path_invalid");
        const recordReadTime = timestamp(record.readTime);
        const lifecycleReadTime = timestamp(lifecycle.readTime);
        if (!timestampEqual(recordReadTime, lifecycleReadTime))
            fail("v2_firebase_admin_repository_read_time_incoherent");
        if (coherentReadTime === null)
            coherentReadTime = recordReadTime;
        if (!timestampEqual(coherentReadTime, recordReadTime))
            fail("v2_firebase_admin_repository_read_time_incoherent");
        return Object.freeze({
            requirement,
            versionDocumentPath: expected.versionDocumentPath,
            lifecycleDocumentPath: expected.lifecycleDocumentPath,
            recordBytes: canonicalDocumentBytes(record.data(), v2_authenticated_repository_contract_v1_1.V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1),
            lifecycleBytes: canonicalDocumentBytes(lifecycle.data(), v2_authenticated_repository_contract_v1_1.V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1),
            recordUpdateTime: timestamp(record.updateTime),
            lifecycleUpdateTime: timestamp(lifecycle.updateTime),
        });
    });
    if (coherentReadTime === null)
        fail("v2_firebase_admin_repository_read_time_incoherent");
    return Object.freeze({
        readTime: coherentReadTime,
        entries: Object.freeze(entries),
    });
}
function voiceProfileRequirementPaths(requirement) {
    return Object.freeze({
        versionDocumentPath: (0, v2_voice_profile_repository_contract_v1_1.v2VoiceProfileRepositoryRecordDocumentPathV1)(requirement.profileKind, requirement.profileId, requirement.version),
        lifecycleDocumentPath: (0, v2_voice_profile_repository_contract_v1_1.v2VoiceProfileRepositoryLifecycleDocumentPathV1)(requirement.profileKind, requirement.profileId, requirement.version),
        objectPath: (0, v2_voice_profile_repository_contract_v1_1.v2VoiceProfileRepositoryObjectPathV1)(requirement),
    });
}
async function readVoiceProfileHeadSnapshot(db, requirements) {
    if (!Array.isArray(requirements) ||
        requirements.length !== 2 ||
        requirements[0]?.profileKind !== "speech_profile" ||
        requirements[1]?.profileKind !== "voice_generation_profile")
        fail("v2_firebase_admin_voice_profile_requirement_set_invalid");
    const paths = requirements.map(voiceProfileRequirementPaths);
    const references = paths.flatMap((value) => [
        db.doc(value.versionDocumentPath),
        db.doc(value.lifecycleDocumentPath),
    ]);
    const snapshots = await db.getAll(...references);
    if (snapshots.length !== references.length)
        fail("v2_firebase_admin_voice_profile_snapshot_count_invalid");
    let coherentReadTime = null;
    const entries = requirements.map((requirement, index) => {
        const record = snapshots[index * 2];
        const lifecycle = snapshots[index * 2 + 1];
        const expected = paths[index];
        if (!record?.exists ||
            !lifecycle?.exists ||
            record.ref.path !== expected.versionDocumentPath ||
            lifecycle.ref.path !== expected.lifecycleDocumentPath)
            fail("v2_firebase_admin_voice_profile_snapshot_path_invalid");
        const recordReadTime = timestamp(record.readTime);
        const lifecycleReadTime = timestamp(lifecycle.readTime);
        if (!timestampEqual(recordReadTime, lifecycleReadTime))
            fail("v2_firebase_admin_voice_profile_read_time_incoherent");
        if (coherentReadTime === null)
            coherentReadTime = recordReadTime;
        if (!timestampEqual(coherentReadTime, recordReadTime))
            fail("v2_firebase_admin_voice_profile_read_time_incoherent");
        return Object.freeze({
            requirement,
            versionDocumentPath: expected.versionDocumentPath,
            lifecycleDocumentPath: expected.lifecycleDocumentPath,
            recordBytes: canonicalDocumentBytes(record.data(), v2_voice_profile_repository_contract_v1_1.V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1),
            lifecycleBytes: canonicalDocumentBytes(lifecycle.data(), v2_voice_profile_repository_contract_v1_1.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1),
            recordUpdateTime: timestamp(record.updateTime),
            lifecycleUpdateTime: timestamp(lifecycle.updateTime),
        });
    });
    if (coherentReadTime === null)
        fail("v2_firebase_admin_voice_profile_read_time_incoherent");
    return Object.freeze({
        readTime: coherentReadTime,
        entries: Object.freeze(entries),
    });
}
async function readRequirementObject(bucket, input) {
    if (!isRecord(input) ||
        !GENERATION_RE.test(input.objectGeneration) ||
        !Number.isSafeInteger(input.declaredByteSize) ||
        Number(input.declaredByteSize) < 1 ||
        !Number.isSafeInteger(input.maximumBytes) ||
        Number(input.maximumBytes) < 1 ||
        Number(input.declaredByteSize) > Number(input.maximumBytes))
        fail("v2_firebase_admin_repository_object_read_input_invalid");
    const objectPath = requirementPaths(input.requirement).objectPath;
    const [rawMetadata] = await bucket.file(objectPath).getMetadata();
    const observed = metadata(rawMetadata);
    if (observed.generation !== input.objectGeneration ||
        observed.byteSize !== input.declaredByteSize ||
        observed.byteSize > input.maximumBytes ||
        observed.contentHash !== input.requirement.contentHash ||
        !observed.contentType.startsWith("application/json"))
        fail("v2_firebase_admin_repository_object_metadata_mismatch");
    let downloaded;
    try {
        [downloaded] = await bucket
            .file(objectPath, { generation: input.objectGeneration })
            .download({ validation: "crc32c" });
    }
    catch (error) {
        if (errorCode(error) === 404 || errorCode(error) === 412)
            fail("v2_firebase_admin_repository_object_generation_mismatch");
        throw error;
    }
    if (downloaded.byteLength !== observed.byteSize ||
        downloaded.byteLength > input.maximumBytes ||
        sha256Bytes(downloaded) !== input.requirement.contentHash)
        fail("v2_firebase_admin_repository_object_readback_mismatch");
    return Object.freeze({
        requirement: input.requirement,
        objectPath,
        objectGeneration: observed.generation,
        byteSize: observed.byteSize,
        contentHash: observed.contentHash,
        bytes: new Uint8Array(downloaded),
    });
}
async function readVoiceProfileObject(bucket, input) {
    if (!isRecord(input) ||
        !GENERATION_RE.test(input.objectGeneration) ||
        !Number.isSafeInteger(input.declaredByteSize) ||
        input.declaredByteSize < 1 ||
        !Number.isSafeInteger(input.maximumBytes) ||
        input.maximumBytes < 1 ||
        input.declaredByteSize > input.maximumBytes)
        fail("v2_firebase_admin_voice_profile_object_read_input_invalid");
    const objectPath = voiceProfileRequirementPaths(input.requirement).objectPath;
    const [rawMetadata] = await bucket.file(objectPath).getMetadata();
    const observed = metadata(rawMetadata);
    if (observed.generation !== input.objectGeneration ||
        observed.byteSize !== input.declaredByteSize ||
        observed.byteSize > input.maximumBytes ||
        observed.contentHash !== input.requirement.contentHash ||
        observed.contentType !== "application/json; charset=utf-8")
        fail("v2_firebase_admin_voice_profile_object_metadata_mismatch");
    let downloaded;
    try {
        [downloaded] = await bucket
            .file(objectPath, { generation: input.objectGeneration })
            .download({ validation: "crc32c" });
    }
    catch (error) {
        if (errorCode(error) === 404 || errorCode(error) === 412)
            fail("v2_firebase_admin_voice_profile_object_generation_mismatch");
        throw error;
    }
    if (downloaded.byteLength !== observed.byteSize ||
        downloaded.byteLength > input.maximumBytes ||
        sha256Bytes(downloaded) !== input.requirement.contentHash)
        fail("v2_firebase_admin_voice_profile_object_readback_mismatch");
    return Object.freeze({
        requirement: input.requirement,
        objectPath,
        objectGeneration: observed.generation,
        byteSize: observed.byteSize,
        contentHash: observed.contentHash,
        bytes: new Uint8Array(downloaded),
    });
}
function emulatorObservation() {
    return Object.freeze({
        functionsEmulator: process.env.FUNCTIONS_EMULATOR ?? null,
        firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? null,
        storageEmulatorHost: process.env.STORAGE_EMULATOR_HOST ?? null,
        firebaseStorageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? null,
        firebaseEmulatorHub: process.env.FIREBASE_EMULATOR_HUB ?? null,
    });
}
/**
 * Acquires only the default production Admin SDK context. The returned value is
 * an unbranded I/O boundary and carries no repository-origin or release authority.
 */
function createV2FirebaseAdminRepositoryIoV1() {
    const app = admin.app();
    const expected = v2_firebase_repository_trust_root_v1_1.V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1;
    if (app.name !== expected.appName ||
        app.options.projectId !== expected.projectId ||
        app.options.storageBucket !== expected.bucketName)
        fail("v2_firebase_admin_repository_app_invalid");
    const db = admin.firestore(app);
    const bucket = admin.storage(app).bucket(expected.bucketName);
    if (bucket.name !== expected.bucketName)
        fail("v2_firebase_admin_repository_bucket_invalid");
    (0, v2_firebase_repository_trust_root_v1_1.validateV2FirebaseRepositoryTrustRootV1)({
        projectId: app.options.projectId,
        databaseId: expected.databaseId,
        bucketName: bucket.name,
        appName: app.name,
        emulatorEnvironment: emulatorObservation(),
    });
    const io = {
        firestore: firestorePort(db),
        storage: storagePort(bucket),
        readCanonicalDocumentExact: (input) => readCanonicalDocumentExact(db, input),
        readCoherentHeadSnapshot: (requirements) => readHeadSnapshot(db, requirements),
        readRequirementObjectGenerationExact: (input) => readRequirementObject(bucket, input),
        readCoherentVoiceProfileHeadSnapshot: (requirements) => readVoiceProfileHeadSnapshot(db, requirements),
        readVoiceProfileObjectGenerationExact: (input) => readVoiceProfileObject(bucket, input),
    };
    return Object.freeze(io);
}
//# sourceMappingURL=v2_firebase_admin_repository_io_v1.js.map