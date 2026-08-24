import * as Crypto from 'expo-crypto';

const MAX_CANONICAL_BYTES = 64 * 1024;
const MAX_SCHEDULED_FRAMES = 200_000;

type ValueFrame = Readonly<{ kind: 'value'; value: unknown }>;
type EmitFrame = Readonly<{ kind: 'emit'; token: string }>;
type ExitFrame = Readonly<{ kind: 'exit'; value: object }>;
type Frame = ValueFrame | EmitFrame | ExitFrame;

function unsupportedValue(value: unknown): never {
  throw new TypeError(`Unsupported canonical value: ${typeof value}`);
}

function canonicalOutputExceeded(maxBytes: number): never {
  throw new TypeError(`canonical output exceeds ${maxBytes} UTF-8 bytes`);
}

function canonicalWorkExceeded(): never {
  throw new TypeError('canonical traversal exceeds 200000 frames');
}

export function canonicalJsonWithLimit(value: unknown, maxBytes: number): string {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError('canonical byte limit must be a positive safe integer');
  }
  const active = new WeakSet<object>();
  const chunks: string[] = [];
  const frames: Frame[] = [];
  let byteLength = 0;
  let scheduledFrames = 0;

  const schedule = (frame: Frame): void => {
    if (scheduledFrames >= MAX_SCHEDULED_FRAMES) {
      canonicalWorkExceeded();
    }
    scheduledFrames += 1;
    frames.push(frame);
  };

  const emit = (token: string): void => {
    const nextByteLength = byteLength + utf8ByteLength(token);
    if (nextByteLength > maxBytes) {
      canonicalOutputExceeded(maxBytes);
    }
    byteLength = nextByteLength;
    chunks.push(token);
  };

  schedule({ kind: 'value', value });
  while (frames.length > 0) {
    const frame = frames.pop()!;
    if (frame.kind === 'emit') {
      emit(frame.token);
      continue;
    }
    if (frame.kind === 'exit') {
      active.delete(frame.value);
      continue;
    }

    const currentValue = frame.value;
    if (
      currentValue === null
      || typeof currentValue === 'string'
      || typeof currentValue === 'boolean'
    ) {
      emit(JSON.stringify(currentValue));
      continue;
    }

    if (typeof currentValue === 'number') {
      if (!Number.isFinite(currentValue)) {
        unsupportedValue(currentValue);
      }
      emit(JSON.stringify(currentValue));
      continue;
    }

    if (typeof currentValue !== 'object') {
      unsupportedValue(currentValue);
    }

    if (active.has(currentValue)) {
      throw new TypeError('Cannot canonicalize cyclic values');
    }
    if (Object.getOwnPropertySymbols(currentValue).length > 0) {
      unsupportedValue(currentValue);
    }

    active.add(currentValue);
    if (Array.isArray(currentValue)) {
      if (Object.getPrototypeOf(currentValue) !== Array.prototype) {
        unsupportedValue(currentValue);
      }

      const propertyNames = Object.getOwnPropertyNames(currentValue);
      if (propertyNames.length !== currentValue.length + 1 || !propertyNames.includes('length')) {
        unsupportedValue(currentValue);
      }

      const values: unknown[] = [];
      for (let index = 0; index < currentValue.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(currentValue, String(index));
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
          unsupportedValue(undefined);
        }
        values.push(descriptor.value);
      }

      schedule({ kind: 'exit', value: currentValue });
      schedule({ kind: 'emit', token: ']' });
      for (let index = values.length - 1; index >= 0; index -= 1) {
        schedule({ kind: 'value', value: values[index] });
        if (index > 0) {
          schedule({ kind: 'emit', token: ',' });
        }
      }
      schedule({ kind: 'emit', token: '[' });
      continue;
    }

    if (Object.getPrototypeOf(currentValue) !== Object.prototype) {
      unsupportedValue(currentValue);
    }

    const descriptors = Object.getOwnPropertyDescriptors(currentValue);
    const propertyNames = Object.getOwnPropertyNames(currentValue);
    for (const propertyName of propertyNames) {
      const descriptor = descriptors[propertyName];
      if (!descriptor.enumerable || !('value' in descriptor)) {
        unsupportedValue(currentValue);
      }
    }

    const keys = propertyNames.sort();
    schedule({ kind: 'exit', value: currentValue });
    schedule({ kind: 'emit', token: '}' });
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      schedule({ kind: 'value', value: descriptors[key].value });
      schedule({ kind: 'emit', token: ':' });
      schedule({ kind: 'emit', token: JSON.stringify(key) });
      if (index > 0) {
        schedule({ kind: 'emit', token: ',' });
      }
    }
    schedule({ kind: 'emit', token: '{' });
  }

  return chunks.join('');
}

export function canonicalJson(value: unknown): string {
  return canonicalJsonWithLimit(value, MAX_CANONICAL_BYTES);
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function operationFingerprint(value: unknown): Promise<string> {
  return canonicalStringFingerprint(canonicalJson(value));
}

export function canonicalStringFingerprint(canonical: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonical,
  );
}
