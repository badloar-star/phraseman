import { createHash, timingSafeEqual } from 'crypto';

const SHA256_RE = /^[a-f0-9]{64}$/;

function canonicalJson(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error('pack_integrity_non_json_number');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object' || ancestors.has(value)) throw new Error('pack_integrity_non_json_value');

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    throw new Error('pack_integrity_non_plain_value');
  }

  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) throw new Error('pack_integrity_symbol_key');

    if (isArray) {
      const length = value.length;
      const itemKeys = (keys as string[]).filter((key) => key !== 'length');
      if (itemKeys.length !== length) throw new Error('pack_integrity_sparse_array');
      const items: string[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor?.enumerable || !('value' in descriptor)) {
          throw new Error('pack_integrity_non_data_property');
        }
        items.push(canonicalJson(descriptor.value, ancestors));
      }
      return `[${items.join(',')}]`;
    }

    const objectKeys = keys as string[];
    objectKeys.sort();
    return `{${objectKeys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        throw new Error('pack_integrity_non_data_property');
      }
      return `${JSON.stringify(key)}:${canonicalJson(descriptor.value, ancestors)}`;
    }).join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

function packetWithoutSelfHash(packet: unknown): Readonly<Record<string, unknown>> {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new Error('pack_integrity_packet_invalid');
  }
  const prototype = Object.getPrototypeOf(packet);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('pack_integrity_packet_invalid');
  const descriptors = Object.getOwnPropertyDescriptors(packet);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string') || !Object.prototype.hasOwnProperty.call(descriptors, 'packSha256')) {
    throw new Error('pack_integrity_packet_invalid');
  }

  const payload = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    if (key === 'packSha256') continue;
    const descriptor = descriptors[key];
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error('pack_integrity_packet_invalid');
    Object.defineProperty(payload, key, {
      value: descriptor.value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(payload);
}

/**
 * SHA-256 over canonical UTF-8 JSON for every packet field except the
 * self-referential `packSha256`. Object keys are sorted; array order is bound.
 */
export function computeDialogueV2PackSha256(packet: unknown): string {
  const canonicalBytes = canonicalJson(packetWithoutSelfHash(packet), new Set<object>());
  return createHash('sha256').update(canonicalBytes, 'utf8').digest('hex');
}

export function verifyDialogueV2PackSha256(packet: unknown): boolean {
  try {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(packet, 'packSha256');
    if (!descriptor?.enumerable || !('value' in descriptor)
      || typeof descriptor.value !== 'string' || !SHA256_RE.test(descriptor.value)) return false;
    const expected = Buffer.from(descriptor.value, 'hex');
    const actual = Buffer.from(computeDialogueV2PackSha256(packet), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
