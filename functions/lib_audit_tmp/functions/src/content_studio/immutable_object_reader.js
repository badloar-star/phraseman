"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readImmutableCanonicalObject = readImmutableCanonicalObject;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
/** Reads one immutable canonical JSON object, binding the bytes to its metadata generation. */
async function readImmutableCanonicalObject(file, options) {
    const [metadata] = await file.getMetadata();
    const generation = String(metadata.generation ?? "");
    const contentHash = String(metadata.metadata?.contentHash ?? "");
    if (generation !== options.expectedGeneration)
        throw new Error("immutable_object_generation_invalid");
    if (contentHash !== options.expectedHash)
        throw new Error("immutable_object_metadata_hash_invalid");
    const [bytes] = await file.download({
        ifGenerationMatch: options.expectedGeneration,
    });
    if (bytes.byteLength !== options.expectedByteSize)
        throw new Error("immutable_object_byte_size_invalid");
    let serialized;
    try {
        serialized = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    catch {
        throw new Error("immutable_object_utf8_invalid");
    }
    if ((0, decision_registry_1.sha256Utf8)(serialized) !== options.expectedHash)
        throw new Error("immutable_object_bytes_hash_mismatch");
    let body;
    try {
        body = JSON.parse(serialized);
    }
    catch {
        throw new Error("immutable_object_json_invalid");
    }
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== options.expectedHash)
        throw new Error("immutable_object_canonical_hash_mismatch");
    return {
        body,
        contentHash,
        objectGeneration: generation,
        byteSize: bytes.byteLength,
    };
}
//# sourceMappingURL=immutable_object_reader.js.map