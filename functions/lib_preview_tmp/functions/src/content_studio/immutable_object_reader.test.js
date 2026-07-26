"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const immutable_object_reader_1 = require("./immutable_object_reader");
describe("immutable object reader", () => {
    it("pins generation and verifies canonical bytes and size", async () => {
        const body = { value: "ok" };
        const serialized = JSON.stringify(body);
        const expectedHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const calls = [];
        const result = await (0, immutable_object_reader_1.readImmutableCanonicalObject)({
            getMetadata: async () => [
                {
                    generation: "g-1",
                    metadata: { contentHash: expectedHash },
                },
            ],
            download: async (options) => {
                calls.push(options ?? {});
                return [new TextEncoder().encode(serialized)];
            },
        }, {
            expectedHash,
            expectedGeneration: "g-1",
            expectedByteSize: new TextEncoder().encode(serialized).byteLength,
        });
        expect(result.body).toEqual(body);
        expect(result.contentHash).toBe(expectedHash);
        expect(calls).toEqual([{ ifGenerationMatch: "g-1" }]);
    });
    it("rejects a generation race before accepting bytes", async () => {
        const body = { value: "ok" };
        const hash = (0, decision_registry_1.sha256Utf8)(JSON.stringify(body));
        await expect((0, immutable_object_reader_1.readImmutableCanonicalObject)({
            getMetadata: async () => [
                { generation: "g-2", metadata: { contentHash: hash } },
            ],
            download: async () => [
                new TextEncoder().encode(JSON.stringify(body)),
            ],
        }, { expectedHash: hash, expectedGeneration: "g-1", expectedByteSize: 14 })).rejects.toThrow("immutable_object_generation_invalid");
    });
    it("rejects metadata and byte-size drift before returning a body", async () => {
        const body = { value: "ok" };
        const serialized = JSON.stringify(body);
        const hash = (0, decision_registry_1.hashCanonicalBody)(body);
        const file = {
            getMetadata: async () => [{ generation: "g-1", metadata: { contentHash: "f".repeat(64) } }],
            download: async () => [new TextEncoder().encode(serialized)],
        };
        await expect((0, immutable_object_reader_1.readImmutableCanonicalObject)(file, {
            expectedHash: hash,
            expectedGeneration: "g-1",
            expectedByteSize: new TextEncoder().encode(serialized).byteLength,
        })).rejects.toThrow("immutable_object_metadata_hash_invalid");
        await expect((0, immutable_object_reader_1.readImmutableCanonicalObject)({
            getMetadata: async () => [
                { generation: "g-1", metadata: { contentHash: hash } },
            ],
            download: async () => [new TextEncoder().encode(serialized)],
        }, { expectedHash: hash, expectedGeneration: "g-1", expectedByteSize: 1 })).rejects.toThrow("immutable_object_byte_size_invalid");
    });
});
//# sourceMappingURL=immutable_object_reader.test.js.map