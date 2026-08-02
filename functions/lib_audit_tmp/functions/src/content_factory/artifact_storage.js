"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeImmutableArtifact = writeImmutableArtifact;
exports.writeImmutableObject = writeImmutableObject;
const artifact_repository_1 = require("./artifact_repository");
const node_crypto_1 = require("node:crypto");
function metadataRecord(result) {
    const metadata = Array.isArray(result) ? result[0] : result;
    if (typeof metadata !== 'object' || metadata === null)
        throw new Error('artifact_metadata_missing');
    return metadata;
}
function customContentHash(metadata) {
    const custom = metadata.metadata;
    return typeof custom === 'object' && custom !== null ? String(custom.contentHash ?? '').trim() : '';
}
async function saveOrReplay(file, bytes, contentHash) {
    const verifyExisting = async () => {
        const metadata = metadataRecord(await file.getMetadata());
        const storedHash = customContentHash(metadata);
        if (!storedHash)
            throw new Error('artifact_existing_hash_missing');
        if (storedHash !== contentHash)
            throw new Error('artifact_content_conflict');
        return { metadata, replayed: true };
    };
    const [exists] = await file.exists();
    if (exists)
        return verifyExisting();
    try {
        await file.save(bytes, {
            resumable: false,
            preconditionOpts: { ifGenerationMatch: 0 },
            metadata: { contentType: 'application/json', cacheControl: 'public,max-age=31536000,immutable', metadata: { contentHash } },
        });
    }
    catch (error) {
        const [nowExists] = await file.exists();
        if (nowExists)
            return verifyExisting();
        throw error;
    }
    return { metadata: metadataRecord(await file.getMetadata()), replayed: false };
}
async function writeImmutableArtifact(bucket, input) {
    const objectPath = (0, artifact_repository_1.artifactObjectPath)(input.releaseId, input.surface, input.lessonId);
    const file = bucket.file(objectPath);
    const serialized = (0, artifact_repository_1.serializeArtifactPayload)(input.payload);
    const bytes = Buffer.from(serialized, 'utf8');
    const contentHash = (0, node_crypto_1.createHash)('sha256').update(serialized).digest('hex');
    const { metadata } = await saveOrReplay(file, bytes, contentHash);
    const objectGeneration = String(metadata.generation ?? '').trim();
    if (!objectGeneration)
        throw new Error('artifact_generation_missing');
    return (0, artifact_repository_1.buildArtifactReceipt)({ ...input, objectGeneration, byteSize: Number(metadata.size ?? bytes.byteLength) });
}
async function writeImmutableObject(bucket, objectPath, payload) {
    if (!/^[A-Za-z0-9._/-]{1,300}$/.test(objectPath) || objectPath.includes('..') || objectPath.startsWith('/'))
        throw new Error('artifact_object_path_invalid');
    const file = bucket.file(objectPath);
    const serialized = (0, artifact_repository_1.serializeArtifactPayload)(payload);
    const bytes = Buffer.from(serialized, 'utf8');
    const contentHash = (0, node_crypto_1.createHash)('sha256').update(serialized).digest('hex');
    const { metadata } = await saveOrReplay(file, bytes, contentHash);
    const objectGeneration = String(metadata.generation ?? '').trim();
    if (!objectGeneration)
        throw new Error('artifact_generation_missing');
    const finalizationKey = (0, node_crypto_1.createHash)('sha256').update(`${objectPath}\n${objectGeneration}\n${contentHash}`).digest('hex');
    return Object.freeze({ objectPath, contentHash, objectGeneration, byteSize: Number(metadata.size ?? bytes.byteLength), referenceState: 'pending_commit', finalizationKey });
}
//# sourceMappingURL=artifact_storage.js.map