"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveImmutableSeasonRevision = resolveImmutableSeasonRevision;
exports.createStorageSeasonRevisionObjectReader = createStorageSeasonRevisionObjectReader;
const season_revision_1 = require("../../../modules/learning-v2/authoring/season_revision");
const immutable_object_reader_1 = require("./immutable_object_reader");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
async function resolveImmutableSeasonRevision(input) {
    const revision = await input.documentReader.read(input.revisionPath);
    const lifecycle = await input.documentReader.read(input.lifecyclePath);
    if (!revision.exists || !lifecycle.exists)
        throw new Error("season_revision_missing");
    const revisionValue = revision.data();
    const record = (isRecord(revisionValue.record) ? revisionValue.record : revisionValue);
    const lifecycleValue = lifecycle.data();
    const object = record.object;
    const resolved = await input.objectReader.read(object.objectPath, object.contentHash, object.objectGeneration, object.byteSize);
    if (resolved.contentHash !== object.contentHash || resolved.objectGeneration !== object.objectGeneration || resolved.byteSize !== object.byteSize) {
        throw new Error("season_revision_object_metadata_invalid");
    }
    const envelope = { body: resolved.body, record, lifecycle: lifecycleValue };
    if (!(0, season_revision_1.validateSeasonRevisionEnvelope)(envelope))
        throw new Error("season_revision_object_invalid");
    return envelope;
}
function createStorageSeasonRevisionObjectReader(bucket) {
    return {
        async read(path, expectedHash, expectedGeneration, expectedByteSize) {
            const object = bucket.file(path);
            const result = await (0, immutable_object_reader_1.readImmutableCanonicalObject)({
                getMetadata: () => object.getMetadata(),
                download: () => object.download(),
            }, { expectedHash, expectedGeneration, expectedByteSize });
            return { body: result.body, contentHash: result.contentHash, objectGeneration: result.objectGeneration, byteSize: result.byteSize };
        },
    };
}
