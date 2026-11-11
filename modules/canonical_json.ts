export type Sha256 = string;

export type CanonicalJsonErrorCode =
  | 'canonical_json_non_nfc'
  | 'canonical_json_lone_surrogate'
  | 'canonical_json_non_json_value'
  | 'canonical_json_non_finite_number'
  | 'canonical_json_negative_zero'
  | 'canonical_json_sparse_array'
  | 'canonical_json_cycle';

export class CanonicalJsonError extends Error {
  constructor(readonly code: CanonicalJsonErrorCode) {
    super(code);
    this.name = 'CanonicalJsonError';
  }
}

const hasLoneSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
};

const assertCanonicalString = (value: string): void => {
  if (hasLoneSurrogate(value)) throw new CanonicalJsonError('canonical_json_lone_surrogate');
  if (value.normalize('NFC') !== value) throw new CanonicalJsonError('canonical_json_non_nfc');
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const serializeCanonical = (value: unknown, ancestors: Set<object>): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    assertCanonicalString(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError('canonical_json_non_finite_number');
    }
    if (Object.is(value, -0)) throw new CanonicalJsonError('canonical_json_negative_zero');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new CanonicalJsonError('canonical_json_non_json_value');
  }
  if (ancestors.has(value)) throw new CanonicalJsonError('canonical_json_cycle');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new CanonicalJsonError('canonical_json_non_json_value');
      }
      const keys = Reflect.ownKeys(value);
      const expectedKeys = new Set<string>(['length']);
      for (let index = 0; index < value.length; index += 1) expectedKeys.add(String(index));
      if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
        throw new CanonicalJsonError('canonical_json_non_json_value');
      }
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw new CanonicalJsonError('canonical_json_sparse_array');
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !('value' in descriptor)) {
          throw new CanonicalJsonError('canonical_json_non_json_value');
        }
        items.push(serializeCanonical(value[index], ancestors));
      }
      return `[${items.join(',')}]`;
    }
    if (!isPlainObject(value)) throw new CanonicalJsonError('canonical_json_non_json_value');
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) {
      throw new CanonicalJsonError('canonical_json_non_json_value');
    }
    const keys = ownKeys as string[];
    for (const key of keys) {
      assertCanonicalString(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        throw new CanonicalJsonError('canonical_json_non_json_value');
      }
    }
    keys.sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serializeCanonical(value[key], ancestors)}`).join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
};

export const canonicalJsonV1 = (value: unknown): string => serializeCanonical(value, new Set());

const utf8Bytes = (value: string): number[] => {
  assertCanonicalString(value);
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) as number;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
};

export const utf8ByteLengthV1 = (value: string): number => utf8Bytes(value).length;

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

const rotateRight = (value: number, bits: number): number =>
  (value >>> bits) | (value << (32 - bits));

/**
 * UTF-8 в заранее выделенный Uint8Array (два прохода: длина, затем запись). Байты те же, что у utf8Bytes.
 * зачем (R08, координатор 15.10): sha256Utf8 копил ~200 КБ сообщения в обычном массиве чисел через push — на Hermes
 * это секунды блокировки JS-потока при подготовке занятия. Алгоритм хэша не меняется, только хранение байтов.
 */
const utf8EncodeTyped = (value: string): Uint8Array => {
  assertCanonicalString(value);
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) as number;
    if (codePoint > 0xffff) index += 1;
    length += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) as number;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes[at++] = codePoint;
    else if (codePoint <= 0x7ff) {
      bytes[at++] = 0xc0 | (codePoint >>> 6);
      bytes[at++] = 0x80 | (codePoint & 0x3f);
    } else if (codePoint <= 0xffff) {
      bytes[at++] = 0xe0 | (codePoint >>> 12);
      bytes[at++] = 0x80 | ((codePoint >>> 6) & 0x3f);
      bytes[at++] = 0x80 | (codePoint & 0x3f);
    } else {
      bytes[at++] = 0xf0 | (codePoint >>> 18);
      bytes[at++] = 0x80 | ((codePoint >>> 12) & 0x3f);
      bytes[at++] = 0x80 | ((codePoint >>> 6) & 0x3f);
      bytes[at++] = 0x80 | (codePoint & 0x3f);
    }
  }
  return bytes;
};

export const sha256Utf8 = (value: string): string => {
  const data = utf8EncodeTyped(value);
  const byteLength = data.length;
  const bitLength = byteLength * 8;
  // дополнение FIPS 180-4: 0x80, нули до 56 mod 64, затем длина в битах (64 бита, big-endian) — как в прежней версии
  const paddedLength = Math.ceil((byteLength + 9) / 64) * 64;
  const message = new Uint8Array(paddedLength);
  message.set(data);
  message[byteLength] = 0x80;
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24, at = paddedLength - 8; shift >= 0; shift -= 8, at += 1) message[at] = (high >>> shift) & 0xff;
  for (let shift = 24, at = paddedLength - 4; shift >= 0; shift -= 8, at += 1) message[at] = (low >>> shift) & 0xff;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = (
        (message[start] << 24) |
        (message[start + 1] << 16) |
        (message[start + 2] << 8) |
        message[start + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const w15 = words[index - 15];
      const w2 = words[index - 2];
      const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ (w15 >>> 3);
      const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ (w2 >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
    for (let index = 0; index < 64; index += 1) {
      const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const first = (h + sigma1 + choose + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const second = (sigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
};

export const hashCanonicalBody = (body: unknown): Sha256 => sha256Utf8(canonicalJsonV1(body));
