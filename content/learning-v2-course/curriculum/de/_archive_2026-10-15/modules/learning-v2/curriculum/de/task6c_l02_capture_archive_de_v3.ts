import { GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3 } from "./task6c_l02_capture_producer_contract_de_v3";

const BLOCK_BYTES = 512;

export type GermanTask6cL02CaptureArchiveEntryDeV3 = Readonly<{
  path: string;
  type: "0";
  mode: 0o644;
  uid: 0;
  gid: 0;
  mtime: 0;
  uname: "";
  gname: "";
  bytes: Buffer;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function assertExactFileSet(files: ReadonlyMap<string, Buffer>): void {
  const actual = [...files.keys()].sort();
  const expected =
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist;
  if (
    actual.length !== expected.length ||
    actual.some((filePath, index) => filePath !== expected[index]) ||
    [...files.values()].some((bytes) => !Buffer.isBuffer(bytes))
  ) {
    fail("CAPTURE_ARCHIVE_FILE_SET_INVALID");
  }
}

function writeAscii(
  target: Buffer,
  offset: number,
  length: number,
  value: string,
): void {
  const bytes = Buffer.from(value, "ascii");
  if (bytes.length > length) fail("CAPTURE_ARCHIVE_FIELD_OVERFLOW");
  bytes.copy(target, offset);
}

function octal(value: number, length: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("CAPTURE_ARCHIVE_NUMERIC_FIELD_INVALID");
  }
  const encoded = value.toString(8).padStart(length - 1, "0") + "\0";
  if (encoded.length !== length) fail("CAPTURE_ARCHIVE_FIELD_OVERFLOW");
  return encoded;
}

function headerFor(path: string, size: number): Buffer {
  if (!/^[a-z0-9./-]+$/u.test(path) || Buffer.byteLength(path, "utf8") > 100) {
    fail("CAPTURE_ARCHIVE_PATH_INVALID");
  }
  const header = Buffer.alloc(BLOCK_BYTES);
  writeAscii(header, 0, 100, path);
  writeAscii(header, 100, 8, octal(0o644, 8));
  writeAscii(header, 108, 8, octal(0, 8));
  writeAscii(header, 116, 8, octal(0, 8));
  writeAscii(header, 124, 12, octal(size, 12));
  writeAscii(header, 136, 12, octal(0, 12));
  header.fill(0x20, 148, 156);
  writeAscii(header, 156, 1, "0");
  writeAscii(header, 257, 6, "ustar\0");
  writeAscii(header, 263, 2, "00");
  writeAscii(header, 329, 8, octal(0, 8));
  writeAscii(header, 337, 8, octal(0, 8));
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const encodedChecksum = checksum.toString(8).padStart(6, "0") + "\0 ";
  if (encodedChecksum.length !== 8) fail("CAPTURE_ARCHIVE_CHECKSUM_OVERFLOW");
  writeAscii(header, 148, 8, encodedChecksum);
  return header;
}

export function buildGermanTask6cL02CaptureArchiveDeV3(
  files: ReadonlyMap<string, Buffer>,
): Buffer {
  assertExactFileSet(files);
  const blocks: Buffer[] = [];
  for (const filePath of GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist) {
    const bytes = files.get(filePath);
    if (!bytes) fail("CAPTURE_ARCHIVE_FILE_SET_INVALID");
    blocks.push(headerFor(filePath, bytes.length), Buffer.from(bytes));
    const padding = (BLOCK_BYTES - (bytes.length % BLOCK_BYTES)) % BLOCK_BYTES;
    if (padding > 0) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(BLOCK_BYTES * 2));
  return Buffer.concat(blocks);
}

function readAscii(bytes: Buffer): string {
  const zero = bytes.indexOf(0);
  const end = zero === -1 ? bytes.length : zero;
  return bytes.subarray(0, end).toString("ascii");
}

function readOctal(bytes: Buffer, code: string): number {
  const text = readAscii(bytes).trim();
  if (!/^[0-7]+$/u.test(text)) fail(code);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value)) fail(code);
  return value;
}

function checksumOf(header: Buffer): number {
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  return copy.reduce((sum, byte) => sum + byte, 0);
}

export function inspectGermanTask6cL02CaptureArchiveDeV3(
  archive: Buffer,
): readonly GermanTask6cL02CaptureArchiveEntryDeV3[] {
  if (!Buffer.isBuffer(archive) || archive.length % BLOCK_BYTES !== 0) {
    fail("CAPTURE_ARCHIVE_LENGTH_INVALID");
  }
  const entries: GermanTask6cL02CaptureArchiveEntryDeV3[] = [];
  let offset = 0;
  while (offset + BLOCK_BYTES <= archive.length) {
    const header = archive.subarray(offset, offset + BLOCK_BYTES);
    if (header.equals(Buffer.alloc(BLOCK_BYTES))) {
      if (
        offset + BLOCK_BYTES * 2 !== archive.length ||
        !archive
          .subarray(offset + BLOCK_BYTES, offset + BLOCK_BYTES * 2)
          .equals(Buffer.alloc(BLOCK_BYTES))
      ) {
        fail("CAPTURE_ARCHIVE_TRAILING_BYTES");
      }
      offset += BLOCK_BYTES * 2;
      break;
    }
    const storedChecksum = readOctal(
      header.subarray(148, 156),
      "CAPTURE_ARCHIVE_CHECKSUM_INVALID",
    );
    if (storedChecksum !== checksumOf(header)) {
      fail("CAPTURE_ARCHIVE_CHECKSUM_INVALID");
    }
    const filePath = readAscii(header.subarray(0, 100));
    const mode = readOctal(
      header.subarray(100, 108),
      "CAPTURE_ARCHIVE_MODE_INVALID",
    );
    const uid = readOctal(
      header.subarray(108, 116),
      "CAPTURE_ARCHIVE_OWNER_INVALID",
    );
    const gid = readOctal(
      header.subarray(116, 124),
      "CAPTURE_ARCHIVE_OWNER_INVALID",
    );
    const size = readOctal(
      header.subarray(124, 136),
      "CAPTURE_ARCHIVE_SIZE_INVALID",
    );
    const mtime = readOctal(
      header.subarray(136, 148),
      "CAPTURE_ARCHIVE_MTIME_INVALID",
    );
    const type = readAscii(header.subarray(156, 157));
    const magic = header.subarray(257, 263).toString("ascii");
    const version = header.subarray(263, 265).toString("ascii");
    const uname = readAscii(header.subarray(265, 297));
    const gname = readAscii(header.subarray(297, 329));
    const devMajor = readOctal(
      header.subarray(329, 337),
      "CAPTURE_ARCHIVE_DEVICE_INVALID",
    );
    const devMinor = readOctal(
      header.subarray(337, 345),
      "CAPTURE_ARCHIVE_DEVICE_INVALID",
    );
    const prefix = readAscii(header.subarray(345, 500));
    if (
      mode !== 0o644 ||
      uid !== 0 ||
      gid !== 0 ||
      mtime !== 0 ||
      type !== "0" ||
      magic !== "ustar\0" ||
      version !== "00" ||
      uname !== "" ||
      gname !== "" ||
      devMajor !== 0 ||
      devMinor !== 0 ||
      prefix !== "" ||
      header.subarray(157, 257).some((byte) => byte !== 0) ||
      header.subarray(500, 512).some((byte) => byte !== 0)
    ) {
      fail("CAPTURE_ARCHIVE_HEADER_INVALID");
    }
    const dataStart = offset + BLOCK_BYTES;
    const dataEnd = dataStart + size;
    if (dataEnd > archive.length) fail("CAPTURE_ARCHIVE_TRUNCATED");
    const paddedEnd = dataStart + Math.ceil(size / BLOCK_BYTES) * BLOCK_BYTES;
    if (
      paddedEnd > archive.length ||
      archive.subarray(dataEnd, paddedEnd).some((byte) => byte !== 0)
    ) {
      fail("CAPTURE_ARCHIVE_PADDING_INVALID");
    }
    entries.push(
      Object.freeze({
        path: filePath,
        type: "0" as const,
        mode: 0o644 as const,
        uid: 0 as const,
        gid: 0 as const,
        mtime: 0 as const,
        uname: "" as const,
        gname: "" as const,
        bytes: Buffer.from(archive.subarray(dataStart, dataEnd)),
      }),
    );
    offset = paddedEnd;
  }
  if (offset !== archive.length) fail("CAPTURE_ARCHIVE_TRAILING_BYTES");
  const actual = entries.map(({ path }) => path);
  const expected =
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist;
  if (
    actual.length !== expected.length ||
    actual.some((filePath, index) => filePath !== expected[index])
  ) {
    fail("CAPTURE_ARCHIVE_FILE_SET_INVALID");
  }
  return Object.freeze(entries);
}
