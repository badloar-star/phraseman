import {
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { readImmutableCanonicalObject } from "./immutable_object_reader";

describe("immutable object reader", () => {
  it("pins generation and verifies canonical bytes and size", async () => {
    const body = { value: "ok" };
    const serialized = JSON.stringify(body);
    const expectedHash = hashCanonicalBody(body);
    const calls: Record<string, unknown>[] = [];
    const result = await readImmutableCanonicalObject(
      {
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
      },
      {
        expectedHash,
        expectedGeneration: "g-1",
        expectedByteSize: new TextEncoder().encode(serialized).byteLength,
      },
    );
    expect(result.body).toEqual(body);
    expect(result.contentHash).toBe(expectedHash);
    expect(calls).toEqual([{ ifGenerationMatch: "g-1" }]);
  });

  it("rejects a generation race before accepting bytes", async () => {
    const body = { value: "ok" };
    const hash = sha256Utf8(JSON.stringify(body));
    await expect(
      readImmutableCanonicalObject(
        {
          getMetadata: async () => [
            { generation: "g-2", metadata: { contentHash: hash } },
          ],
          download: async () => [
            new TextEncoder().encode(JSON.stringify(body)),
          ],
        },
        { expectedHash: hash, expectedGeneration: "g-1", expectedByteSize: 14 },
      ),
    ).rejects.toThrow("immutable_object_generation_invalid");
  });

  it("rejects metadata and byte-size drift before returning a body", async () => {
    const body = { value: "ok" };
    const serialized = JSON.stringify(body);
    const hash = hashCanonicalBody(body);
    const file = {
      getMetadata: async () =>
        [{ generation: "g-1", metadata: { contentHash: "f".repeat(64) } }] as [
          { generation: string; metadata: { contentHash: string } },
        ],
      download: async () =>
        [new TextEncoder().encode(serialized)] as [Uint8Array],
    };
    await expect(
      readImmutableCanonicalObject(file, {
        expectedHash: hash,
        expectedGeneration: "g-1",
        expectedByteSize: new TextEncoder().encode(serialized).byteLength,
      }),
    ).rejects.toThrow("immutable_object_metadata_hash_invalid");

    await expect(
      readImmutableCanonicalObject(
        {
          getMetadata: async () => [
            { generation: "g-1", metadata: { contentHash: hash } },
          ],
          download: async () => [new TextEncoder().encode(serialized)],
        },
        { expectedHash: hash, expectedGeneration: "g-1", expectedByteSize: 1 },
      ),
    ).rejects.toThrow("immutable_object_byte_size_invalid");
  });
});
