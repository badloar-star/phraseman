"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const decision_registry_1 = require("./decision_registry");
const FIXTURE_PATH = path.join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'learning-v2', 'content-studio', 'decision-registry.v1.json');
const corpus = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const applyMutations = (target, mutations) => {
    for (const mutation of mutations) {
        let cursor = target;
        for (const segment of mutation.path.slice(0, -1)) {
            cursor = cursor[segment];
        }
        const leaf = mutation.path[mutation.path.length - 1];
        if (mutation.op === 'delete')
            delete cursor[leaf];
        else
            cursor[leaf] = clone(mutation.value);
    }
};
const materializeValidCase = (testCase) => {
    const body = clone(corpus.baseline.body);
    applyMutations(body, testCase.mutations);
    const version = body.version;
    const registryId = body.registryId;
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
const materializeInvalidCase = (testCase) => {
    if (testCase.replaceInput !== undefined)
        return clone(testCase.replaceInput);
    const candidate = clone(corpus.baseline);
    applyMutations(candidate, testCase.mutations);
    return candidate;
};
const materializeRuntimeInvalid = (kind) => {
    if (kind === 'non_nfc')
        return { value: 'e\u0301' };
    if (kind === 'lone_surrogate')
        return { value: '\ud800' };
    if (kind === 'undefined')
        return undefined;
    if (kind === 'nan')
        return Number.NaN;
    if (kind === 'infinity')
        return Number.POSITIVE_INFINITY;
    if (kind === 'negative_zero')
        return -0;
    if (kind === 'sparse') {
        const value = new Array(2);
        value[1] = 'present';
        return value;
    }
    if (kind === 'date')
        return new Date('2026-07-15T00:00:00.000Z');
    if (kind === 'map')
        return new Map([['key', 'value']]);
    if (kind === 'function')
        return () => 'not-json';
    if (kind === 'symbol')
        return Symbol('not-json');
    if (kind === 'bigint')
        return BigInt(1);
    if (kind === 'cycle') {
        const value = {};
        value.self = value;
        return value;
    }
    if (kind === 'array_subclass') {
        class ExtendedArray extends Array {
        }
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
describe('Learning V2 immutable DecisionRegistry — Functions runtime', () => {
    it('reads the shared corpus and matches the normative canonical SHA-256 vector', () => {
        expect(corpus.schemaVersion).toBe('decision-registry-conformance-corpus.v1');
        expect((0, decision_registry_1.canonicalJsonV1)(corpus.goldenVector.value)).toBe(corpus.goldenVector.canonicalJson);
        expect((0, decision_registry_1.hashCanonicalBody)(corpus.goldenVector.value)).toBe(corpus.goldenVector.sha256);
        expect((0, decision_registry_1.utf8ByteLengthV1)(corpus.goldenVector.canonicalJson)).toBe(corpus.goldenVector.utf8ByteSize);
        expect((0, decision_registry_1.decisionRegistryObjectPath)('phraseman-v2-product-decisions', 1, corpus.validCases[0].expectedContentHash)).toBe(corpus.baseline.record.object.objectPath);
    });
    it.each(corpus.validCases)('accepts $caseId without hardcoding pilot values', (testCase) => {
        const input = materializeValidCase(testCase);
        const body = input.body;
        expect((0, decision_registry_1.hashCanonicalBody)(body)).toBe(testCase.expectedContentHash);
        expect((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(body))).toBe(testCase.expectedUtf8ByteSize);
        const result = (0, decision_registry_1.validateDecisionRegistry)(input);
        expect(result).toMatchObject({ ok: true, issues: [] });
        expect((0, decision_registry_1.resolveDecisionRegistry)(input)).toEqual(input);
    });
    it.each(corpus.invalidCases)('rejects $caseId with frozen ordered issue codes', (testCase) => {
        const input = materializeInvalidCase(testCase);
        const result = (0, decision_registry_1.validateDecisionRegistry)(input);
        expect(result.ok).toBe(false);
        const issues = result.issues;
        expect(issues.map((issue) => issue.code)).toEqual(testCase.expectedIssueCodes);
        if (testCase.expectedIssuePaths) {
            expect(issues.map((issue) => issue.path)).toEqual(testCase.expectedIssuePaths);
        }
        expect(issues.every((issue) => issue.severity === 'blocking' && issue.waivable === false)).toBe(true);
        try {
            (0, decision_registry_1.resolveDecisionRegistry)(input);
            throw new Error('expected DecisionRegistryValidationError');
        }
        catch (error) {
            expect(error).toBeInstanceOf(decision_registry_1.DecisionRegistryValidationError);
            const errorIssues = error.issues;
            expect(errorIssues.map((issue) => issue.code)).toEqual(testCase.expectedIssueCodes);
            expect(errorIssues.every((issue) => issue.severity === 'blocking' && issue.waivable === false)).toBe(true);
        }
    });
    it.each(corpus.runtimeInvalidCases)('rejects non-JSON canonical input: $caseId', (testCase) => {
        try {
            (0, decision_registry_1.canonicalJsonV1)(materializeRuntimeInvalid(testCase.kind));
            throw new Error('expected CanonicalJsonError');
        }
        catch (error) {
            expect(error).toBeInstanceOf(decision_registry_1.CanonicalJsonError);
            expect(error.code).toBe(testCase.expectedCode);
        }
    });
    it('rejects non-finite numbers inside a registry before hash checks cascade', () => {
        const input = clone(corpus.baseline);
        const settings = input.body.decisions['HYP-V2-002']
            .settings;
        settings.newPhraseFrames.max = Number.NaN;
        const result = (0, decision_registry_1.validateDecisionRegistry)(input);
        expect(result.issues.map((issue) => issue.code)).toEqual([
            'decision_registry_number_invalid',
        ]);
    });
    it('keeps UTF-8 byte-length validation identical for astral and invalid Unicode strings', () => {
        expect((0, decision_registry_1.utf8ByteLengthV1)('ASCII')).toBe(5);
        expect((0, decision_registry_1.utf8ByteLengthV1)('💬')).toBe(4);
        expect(() => (0, decision_registry_1.utf8ByteLengthV1)('e\u0301')).toThrow('canonical_json_non_nfc');
        expect(() => (0, decision_registry_1.utf8ByteLengthV1)('\ud800')).toThrow('canonical_json_lone_surrogate');
    });
    it('rejects an owner longer than the bounded 160-character contract', () => {
        const input = clone(corpus.baseline);
        input.body.decisions['HYP-V2-001'].owner = 'x'.repeat(161);
        const result = (0, decision_registry_1.validateDecisionRegistry)(input);
        expect(result.issues).toMatchObject([{
                code: 'decision_registry_entry_invalid',
                severity: 'blocking',
                waivable: false,
            }]);
    });
});
//# sourceMappingURL=decision_registry.test.js.map