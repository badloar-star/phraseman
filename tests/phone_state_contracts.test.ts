import {
  canonicalJson,
  operationFingerprint,
  utf8ByteLength,
} from '../modules/phone-state/canonical';
import type {
  PendingPersonalOperation,
  PersonalOperation,
  ProjectionEnvelope,
} from '../modules/phone-state/contracts';

class CustomValue {
  readonly value = 'custom';
}

class CustomArray extends Array<unknown> {}

test('canonicalJson sorts object keys regardless of insertion order and fingerprints are equal', async () => {
  const first = { b: 2, a: 1 };
  const second = { a: 1, b: 2 };

  expect(canonicalJson(first)).toBe('{"a":1,"b":2}');
  await expect(operationFingerprint(first)).resolves.toBe(await operationFingerprint(second));
});

test('canonicalJson recursively sorts nested object keys while preserving array order', () => {
  expect(canonicalJson({ z: [{ b: 2, a: 1 }, 'first'], a: { d: false, c: null } }))
    .toBe('{"a":{"c":null,"d":false},"z":[{"a":1,"b":2},"first"]}');
});

test('canonicalJson supports null, strings, booleans, and finite numbers', () => {
  expect(canonicalJson([null, 'text', true, false, -1.5, 0, 12])).toBe(
    '[null,"text",true,false,-1.5,0,12]',
  );
});

test('canonicalJson rejects unsupported values rather than omitting or coercing them', () => {
  const arrayWithUndefinedExtra = [1] as Array<number> & { extra?: unknown };
  arrayWithUndefinedExtra.extra = undefined;
  const arrayWithSupportedExtra = [1] as Array<number> & { extra?: string };
  arrayWithSupportedExtra.extra = 'extra';
  const objectWithHiddenValue = {};
  Object.defineProperty(objectWithHiddenValue, 'hidden', {
    value: undefined,
    enumerable: false,
  });
  const objectWithGetter = {};
  Object.defineProperty(objectWithGetter, 'value', {
    enumerable: true,
    get: () => 'must not run',
  });
  const arrayWithHiddenIndex = [1];
  Object.defineProperty(arrayWithHiddenIndex, '0', {
    value: 1,
    enumerable: false,
  });

  const unsupported = [
    undefined,
    { value: undefined },
    [undefined],
    () => undefined,
    Symbol('value'),
    { [Symbol('key')]: 'value' },
    1n,
    NaN,
    Infinity,
    -Infinity,
    new Date(),
    new Map(),
    new CustomValue(),
    new CustomArray(),
    Object.create(null),
    Array(1),
    arrayWithUndefinedExtra,
    arrayWithSupportedExtra,
    objectWithHiddenValue,
    objectWithGetter,
    arrayWithHiddenIndex,
  ];

  for (const value of unsupported) {
    expect(() => canonicalJson(value)).toThrow();
  }
});

test('canonicalJson rejects cyclic objects but permits repeated non-cyclic references', () => {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  const shared = { a: 1 };

  expect(() => canonicalJson(cyclic)).toThrow();
  expect(canonicalJson({ first: shared, second: shared }))
    .toBe('{"first":{"a":1},"second":{"a":1}}');
});

test('canonicalJson serializes deeply nested valid arrays without recursive stack overflow', () => {
  const depth = 4_000;
  let value: unknown = 0;
  for (let index = 0; index < depth; index += 1) {
    value = [value];
  }

  expect(canonicalJson(value)).toBe(`${'['.repeat(depth)}0${']'.repeat(depth)}`);
});

test('canonicalJson stops exponentially expanding shared DAG output at the UTF-8 cap', () => {
  let value: unknown = { value: 0 };
  for (let index = 0; index < 20; index += 1) {
    value = { left: value, right: value };
  }

  expect(() => canonicalJson(value)).toThrow('canonical output exceeds 65536 UTF-8 bytes');
});

test('utf8ByteLength measures encoded bytes', () => {
  expect(utf8ByteLength('жемчуг')).toBe(12);
});

test('operationFingerprint is a stable lowercase SHA-256 hex digest', async () => {
  const fingerprint = await operationFingerprint({ nested: { value: 'жемчуг' }, count: 2 });

  expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
  await expect(operationFingerprint({ count: 2, nested: { value: 'жемчуг' } }))
    .resolves.toBe(fingerprint);
});

test('phone-state contracts expose the required immutable shapes', () => {
  const operation: PersonalOperation = {
    schemaVersion: 1,
    operationId: 'op-1',
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId: 'device-1',
    deviceSequence: 2,
    hybridClock: { counter: 3, deviceId: 'device-1' },
    domain: 'phone-state',
    kind: 'update',
    entityId: null,
    payload: { value: true },
    exactResult: { applied: true },
    createdAtMs: 1,
    fingerprint: 'a'.repeat(64),
  };
  const pending: PendingPersonalOperation = {
    schemaVersion: 1,
    stableUid: operation.stableUid,
    accountGeneration: operation.accountGeneration,
    deviceId: operation.deviceId,
    domain: operation.domain,
    kind: operation.kind,
    entityId: operation.entityId,
    payload: operation.payload,
    exactResult: operation.exactResult,
    createdAtMs: operation.createdAtMs,
  };
  const projection: ProjectionEnvelope = {
    schemaVersion: 1,
    domain: operation.domain,
    reducerVersion: 1,
    state: {},
    throughOperationCount: 1,
  };

  expect([operation, pending, projection]).toHaveLength(3);
});
