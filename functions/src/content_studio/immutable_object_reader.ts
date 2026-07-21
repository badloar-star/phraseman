import {
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";

export interface ImmutableObjectFile {
  getMetadata(): Promise<
    [
      { generation?: string | number; metadata?: Record<string, unknown> },
      unknown?,
    ]
  >;
  download(options?: Record<string, unknown>): Promise<[Uint8Array, unknown?]>;
}

export interface ImmutableCanonicalObjectReadOptions {
  readonly expectedHash: string;
  readonly expectedGeneration: string;
  readonly expectedByteSize: number;
}

export interface ImmutableCanonicalObjectReadResult {
  readonly body: unknown;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
}

/** Reads one immutable canonical JSON object, binding the bytes to its metadata generation. */
export async function readImmutableCanonicalObject(
  file: ImmutableObjectFile,
  options: ImmutableCanonicalObjectReadOptions,
): Promise<ImmutableCanonicalObjectReadResult> {
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
  let serialized: string;
  try {
    serialized = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("immutable_object_utf8_invalid");
  }
  if (sha256Utf8(serialized) !== options.expectedHash)
    throw new Error("immutable_object_bytes_hash_mismatch");
  let body: unknown;
  try {
    body = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("immutable_object_json_invalid");
  }
  if (hashCanonicalBody(body) !== options.expectedHash)
    throw new Error("immutable_object_canonical_hash_mismatch");
  return {
    body,
    contentHash,
    objectGeneration: generation,
    byteSize: bytes.byteLength,
  };
}
