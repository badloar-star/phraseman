import * as fs from 'fs';
import * as path from 'path';

import {
  CanonicalJsonError,
  DecisionRegistryValidationError,
  canonicalJsonV1,
  decisionRegistryObjectPath,
  hashCanonicalBody,
  resolveDecisionRegistry,
  utf8ByteLengthV1,
  validateDecisionRegistry,
} from '../modules/learning-v2/policies/decision_registry';

type JsonRecord = Record<string, unknown>;
type Mutation = {
  readonly op: 'set' | 'delete';
  readonly path: readonly (string | number)[];
  readonly value?: unknown;
};

type ValidCase = {
  readonly caseId: string;
  readonly mutations: readonly Mutation[];
  readonly expectedContentHash: string;
  readonly expectedUtf8ByteSize: number;
};

type InvalidCase = {
  readonly caseId: string;
  readonly replaceInput?: unknown;
  readonly mutations: readonly Mutation[];
  readonly expectedIssueCodes: readonly string[];
  readonly expectedIssuePaths?: readonly string[];
};

type RuntimeInvalidCase = {
  readonly caseId: string;
  readonly kind: string;
  readonly expectedCode: string;
};

type Corpus = {
  readonly schemaVersion: string;
  readonly goldenVector: {
    readonly value: unknown;
    readonly canonicalJson: string;
    readonly sha256: string;
    readonly utf8ByteSize: number;
  };
  readonly registryIdSha256: string;
  readonly baseline: { readonly body: JsonRecord; readonly record: JsonRecord };
  readonly validCases: readonly ValidCase[];
  readonly invalidCases: readonly InvalidCase[];
  readonly runtimeInvalidCases: readonly RuntimeInvalidCase[];
};

const FIXTURE_PATH = path.join(
  __dirname,
  'fixtures',
  'learning-v2',
  'content-studio',
  'decision-registry.v1.json',
);

const corpus = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as Corpus;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const applyMutations = (target: unknown, mutations: readonly Mutation[]): void => {
  for (const mutation of mutations) {
    let cursor = target as Record<string | number, unknown>;
    for (const segment of mutation.path.slice(0, -1)) {
      cursor = cursor[segment] as Record<string | number, unknown>;
    }
    const leaf = mutation.path[mutation.path.length - 1];
    if (mutation.op === 'delete') delete cursor[leaf];
    else cursor[leaf] = clone(mutation.value);
  }
};

const materializeValidCase = (testCase: ValidCase): unknown => {
  const body = clone(corpus.baseline.body);
  applyMutations(body, testCase.mutations);
  const version = body.version as number;
  const registryId = body.registryId as string;
  return {
    body,
    record: {
      schemaVersion: 'v2-decision-registry-record.v1',
      ref: { id: registryId, version, contentHash: testCase.expectedContentHash },
      object: {
        objectPath: `content-studio/decision-registries/${corpus.registryIdSha256}/v${version}/${testCase.expectedContentHash}.json`,
        contentHash: testCase.expectedContentHash,
        objectGeneration: String(version),
        byteSize: testCase.expectedUtf8ByteSize,
      },
      createdAt: '2026-07-15T00:00:00.000Z',
    },
  };
};

const materializeInvalidCase = (testCase: InvalidCase): unknown => {
  if (testCase.replaceInput !== undefined) return clone(testCase.replaceInput);
  const candidate = clone(corpus.baseline);
  applyMutations(candidate, testCase.mutations);
  return candidate;
};

const materializeRuntimeInvalid = (kind: string): unknown => {
  if (kind === 'non_nfc') return { value: 'e\u0301' };
  if (kind === 'lone_surrogate') return { value: '\ud800' };
  if (kind === 'undefined') return undefined;
  if (kind === 'nan') return Number.NaN;
  if (kind === 'infinity') return Number.POSITIVE_INFINITY;
  if (kind === 'negative_zero') return -0;
  if (kind === 'sparse') {
    const value = new Array(2);
    value[1] = 'present';
    return value;
  }
  if (kind === 'date') return new Date('2026-07-15T00:00:00.000Z');
  if (kind === 'map') return new Map([['key', 'value']]);
  if (kind === 'function') return () => 'not-json';
  if (kind === 'symbol') return Symbol('not-json');
  if (kind === 'bigint') return BigInt(1);
  if (kind === 'cycle') {
    const value: { self?: unknown } = {};
    value.self = value;
    return value;
  }
  if (kind === 'array_subclass') {
    class ExtendedArray extends Array<unknown> {}
    const value = new ExtendedArray();
    value.push('present');
    return value;
  }
  if (kind === 'array_accessor') {
    const value = ['placeholder'];
    Object.defineProperty(value, '0', { enumerable: true, get: () => 'present' });
    return value;
  }
  if (kind === 'array_non_enumerable') {
    const value = ['present'];
    Object.defineProperty(value, '0', { enumerable: false, value: 'present' });
    return value;
  }
  throw new Error(`unknown_runtime_fixture:${kind}`);
};

describe('Learning V2 immutable DecisionRegistry — shared/client runtime', () => {
  it('pins one conformance corpus and the normative canonical SHA-256 vector', () => {
    expect(corpus.schemaVersion).toBe('decision-registry-conformance-corpus.v1');
    expect(canonicalJsonV1(corpus.goldenVector.value)).toBe(corpus.goldenVector.canonicalJson);
    expect(hashCanonicalBody(corpus.goldenVector.value)).toBe(corpus.goldenVector.sha256);
    expect(utf8ByteLengthV1(corpus.goldenVector.canonicalJson)).toBe(
      corpus.goldenVector.utf8ByteSize,
    );
    expect(decisionRegistryObjectPath(
      'phraseman-v2-product-decisions',
      1,
      corpus.validCases[0].expectedContentHash,
    )).toBe((corpus.baseline.record.object as JsonRecord).objectPath);
  });

  it.each(corpus.validCases)('accepts $caseId without hardcoding pilot values', (testCase) => {
    const input = materializeValidCase(testCase);
    const body = (input as { body: unknown }).body;
    expect(hashCanonicalBody(body)).toBe(testCase.expectedContentHash);
    expect(utf8ByteLengthV1(canonicalJsonV1(body))).toBe(testCase.expectedUtf8ByteSize);

    const result = validateDecisionRegistry(input);
    expect(result).toMatchObject({ ok: true, issues: [] });
    expect(resolveDecisionRegistry(input)).toEqual(input);
  });

  it.each(corpus.invalidCases)('rejects $caseId with frozen ordered issue codes', (testCase) => {
    const input = materializeInvalidCase(testCase);
    const result = validateDecisionRegistry(input);
    expect(result.ok).toBe(false);
    const issues = result.issues as readonly {
      readonly code: string;
      readonly path: string;
      readonly severity?: string;
      readonly waivable?: boolean;
    }[];
    expect(issues.map((issue) => issue.code)).toEqual(
      testCase.expectedIssueCodes,
    );
    if (testCase.expectedIssuePaths) {
      expect(issues.map((issue) => issue.path)).toEqual(testCase.expectedIssuePaths);
    }
    expect(issues.every((issue) => issue.severity === 'blocking' && issue.waivable === false)).toBe(true);

    try {
      resolveDecisionRegistry(input);
      throw new Error('expected DecisionRegistryValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(DecisionRegistryValidationError);
      const errorIssues = (error as DecisionRegistryValidationError).issues as readonly {
        readonly code: string;
        readonly severity?: string;
        readonly waivable?: boolean;
      }[];
      expect(errorIssues.map((issue) => issue.code)).toEqual(
        testCase.expectedIssueCodes,
      );
      expect(errorIssues.every(
        (issue) => issue.severity === 'blocking' && issue.waivable === false,
      )).toBe(true);
    }
  });

  it.each(corpus.runtimeInvalidCases)('rejects non-JSON canonical input: $caseId', (testCase) => {
    try {
      canonicalJsonV1(materializeRuntimeInvalid(testCase.kind));
      throw new Error('expected CanonicalJsonError');
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalJsonError);
      expect((error as CanonicalJsonError).code).toBe(testCase.expectedCode);
    }
  });

  it('rejects non-finite numbers inside a registry before hash checks cascade', () => {
    const input = clone(corpus.baseline);
    const settings = (((input.body.decisions as JsonRecord)['HYP-V2-002'] as JsonRecord)
      .settings as JsonRecord);
    (settings.newPhraseFrames as JsonRecord).max = Number.NaN;
    const result = validateDecisionRegistry(input);
    expect(result.issues.map((issue: { readonly code: string }) => issue.code)).toEqual([
      'decision_registry_number_invalid',
    ]);
  });

  it('keeps UTF-8 byte-length validation identical for astral and invalid Unicode strings', () => {
    expect(utf8ByteLengthV1('ASCII')).toBe(5);
    expect(utf8ByteLengthV1('💬')).toBe(4);
    expect(() => utf8ByteLengthV1('e\u0301')).toThrow('canonical_json_non_nfc');
    expect(() => utf8ByteLengthV1('\ud800')).toThrow('canonical_json_lone_surrogate');
  });

  it('rejects an owner longer than the bounded 160-character contract', () => {
    const input = clone(corpus.baseline);
    ((input.body.decisions as JsonRecord)['HYP-V2-001'] as JsonRecord).owner = 'x'.repeat(161);
    const result = validateDecisionRegistry(input);
    expect(result.issues).toMatchObject([{
      code: 'decision_registry_entry_invalid',
      severity: 'blocking',
      waivable: false,
    }]);
  });

  it('keeps the shared/mobile module free of Node-only crypto imports', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'modules', 'learning-v2', 'policies', 'decision_registry.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/(?:from|require\s*\()\s*['"](?:node:)?crypto['"]/);
  });
});
