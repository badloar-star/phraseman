import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  DEFAULT_CENSUS_POLICY,
  canonicalCensusJson,
  scanAccountStorageEntries,
  type AccountStorageCensusReport,
  type CensusAuxiliaryInput,
  type CensusCollectionMetadata,
  type CensusPolicySnapshot,
  type CensusSourceEntry,
} from '../scripts/accounts-v2-storage-census-core';
import {
  collectAccountStorageEntries,
  runAccountsV2StorageCensusCli,
  type ReadOnlyCensusFs,
} from '../scripts/accounts-v2-storage-census';

const REGISTRY_PATH = 'config/phone-state-legacy-inventory.v1.json' as const;

const TEST_POLICY: CensusPolicySnapshot = Object.freeze({
  ...DEFAULT_CENSUS_POLICY,
  requiredRoots: ['app'],
  optionalRoots: [],
  auxiliaryInputs: [REGISTRY_PATH],
});

function sourceBytes(
  inputPath: string,
  bytes: Uint8Array,
  root = inputPath.includes('/') ? inputPath.split('/')[0] : '.',
): CensusSourceEntry {
  return { path: inputPath, root, kind: 'js_ts_ast', bytes };
}

function source(inputPath: string, content: string): CensusSourceEntry {
  return sourceBytes(inputPath, new Uint8Array(Buffer.from(content, 'utf8')));
}

function nativeSource(inputPath: string, content: string): CensusSourceEntry {
  return {
    path: inputPath,
    root: inputPath.split('/').slice(0, 4).join('/'),
    kind: 'native_text',
    bytes: new Uint8Array(Buffer.from(content, 'utf8')),
  };
}

function policyRegistry(): CensusAuxiliaryInput {
  return {
    path: REGISTRY_PATH,
    bytes: new Uint8Array(Buffer.from(JSON.stringify({
      schemaVersion: 'phone-state-legacy-inventory.v1',
      rows: [],
      prefixRules: [],
    }), 'utf8')),
  };
}

function completeCollection(fileCount: number): CensusCollectionMetadata {
  return {
    effectivePolicy: TEST_POLICY,
    roots: [
      { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
      { path: 'app', requirement: 'required', status: 'scanned', fileCount },
    ],
    unavailableInputs: [],
    gaps: [],
    enumerationComplete: true,
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function scan(entries: readonly CensusSourceEntry[]): AccountStorageCensusReport {
  return scanAccountStorageEntries({
    entries,
    auxiliaryInputs: [policyRegistry()],
    collection: completeCollection(entries.length),
  });
}

function scanOne(content: string): AccountStorageCensusReport {
  return scan([source('app/fixture.ts', content)]);
}

function literalSelectors(report: AccountStorageCensusReport): string[] {
  return report.operations.flatMap((operation) => (
    operation.selector.literalValue === undefined ? [] : [operation.selector.literalValue]
  ));
}

describe('account storage census stage A', () => {
  it('fingerprints every input deterministically and keeps certification false', () => {
    const entries = [
      source('app/z.ts', "export const z = 'no storage';"),
      source('app/a.ts', "import Store from '@react-native-async-storage/async-storage';"),
    ];

    const report = scan([...entries].reverse());
    const sameLogicalReport = scan(entries);

    expect(report.inputs.files.map((file) => file.path)).toEqual([
      'app/a.ts',
      'app/z.ts',
      REGISTRY_PATH,
    ]);
    expect(report.auxiliaryInputs[0]).toMatchObject({
      path: REGISTRY_PATH,
      root: null,
      readStatus: 'read',
    });
    expect(report.coverage).toMatchObject({
      mayCertifyNativeErase: false,
      mayCertifyFullUserLocalWipe: false,
    });
    expect(canonicalCensusJson(report)).toBe(canonicalCensusJson(sameLogicalReport));

    const drifted = scan([
      source('app/a.ts', "import Store from '@react-native-async-storage/async-storage';"),
      source('app/z.ts', "export const z = 'changed';"),
    ]);
    expect(drifted.inputs.inputSetSha256).not.toBe(report.inputs.inputSetSha256);
  });

  it('hashes BOM bytes and fails closed on invalid UTF-8', () => {
    const bom = Uint8Array.of(
      0xef,
      0xbb,
      0xbf,
      ...Buffer.from('export const bom = true;', 'utf8'),
    );
    const bomReport = scan([sourceBytes('app/bom.ts', bom)]);
    expect(bomReport.inputs.files[0]).toMatchObject({
      sha256: sha256(bom),
      readStatus: 'read',
      parseStatus: 'parsed',
    });

    const invalid = Uint8Array.of(0x65, 0x78, 0x70, 0x6f, 0x72, 0x74, 0xc3);
    const invalidReport = scan([sourceBytes('app/invalid.ts', invalid)]);
    expect(invalidReport.inputs.files[0]).toMatchObject({
      sha256: sha256(invalid),
      readStatus: 'invalid_utf8',
      parseStatus: 'not_applicable',
    });
    expect(invalidReport.scanOutcome).toBe('incomplete');
  });

  it('normalizes policy order and rejects policy or root metadata drift', () => {
    const reversedPolicy: CensusPolicySnapshot = {
      ...TEST_POLICY,
      astExtensions: [...TEST_POLICY.astExtensions].reverse(),
      excludedPathSegments: [...TEST_POLICY.excludedPathSegments].reverse(),
    };
    const reversedReport = scanAccountStorageEntries({
      entries: [source('app/a.ts', 'export const a = true;')],
      auxiliaryInputs: [policyRegistry()],
      collection: {
        ...completeCollection(1),
        effectivePolicy: reversedPolicy,
        roots: [...completeCollection(1).roots].reverse(),
      },
    });
    expect(reversedReport.policy).toEqual(scan([
      source('app/a.ts', 'export const a = true;'),
    ]).policy);

    expect(() => scanAccountStorageEntries({
      entries: [source('app/a.ts', 'export const a = true;')],
      auxiliaryInputs: [policyRegistry()],
      collection: {
        ...completeCollection(1),
        roots: completeCollection(1).roots.filter((root) => root.path !== '.'),
      },
    })).toThrow('root_metadata_mismatch');

    expect(() => scanAccountStorageEntries({
      entries: [source('app/a.ts', 'export const a = true;')],
      auxiliaryInputs: [],
      collection: completeCollection(1),
    })).toThrow('unavailable_input_mismatch');
  });

  it('retains an unavailable required registry as rootless incomplete evidence', () => {
    const unavailableRegistry = {
      path: REGISTRY_PATH,
      root: null,
      kind: 'policy_registry_input' as const,
      classification: 'policy_registry_input' as const,
      bytes: null,
      sha256: null,
      readStatus: 'unreadable' as const,
      parseStatus: 'not_applicable' as const,
    };
    const report = scanAccountStorageEntries({
      entries: [source('app/a.ts', 'export const a = true;')],
      auxiliaryInputs: [],
      collection: {
        ...completeCollection(1),
        unavailableInputs: [unavailableRegistry],
        gaps: [{
          gapId: 'collector-gap',
          kind: 'invalid_auxiliary_input',
          severity: 'incomplete',
          path: REGISTRY_PATH,
          detailCode: 'raw_read_failed',
        }],
      },
    });
    expect(report.auxiliaryInputs[0]).toMatchObject({
      path: REGISTRY_PATH,
      root: null,
      readStatus: 'unreadable',
    });
    expect(report.roots.find((root) => root.path === 'app')?.fileCount).toBe(1);
    expect(report.scanOutcome).toBe('incomplete');
  });
});

describe('account storage census stage B', () => {
  it('tracks scoped imports, aliases, destructured methods, and shadows', () => {
    const report = scanOne(`
      // import Fake from '@react-native-async-storage/async-storage';
      import type StorageType from '@react-native-async-storage/async-storage';
      import Real from '@react-native-async-storage/async-storage';
      const alias = Real;
      const { setItem: put } = alias;
      put('real_key', 'payload');
      function unrelated(Real: { setItem(k: string, v: string): void }) {
        Real.setItem('shadow_key', 'payload');
      }
      function shadowRequire(require: (name: string) => unknown) {
        require('@react-native-async-storage/async-storage');
      }
      const Required = require('@react-native-async-storage/async-storage');
      Required.removeItem('required_key');
      function nestedAlias() {
        const nested = Real;
        const { setItem: nestedPut } = nested;
        nestedPut('nested_key', 'payload');
      }
    `);

    expect(literalSelectors(report)).toEqual(['real_key', 'required_key', 'nested_key']);
    expect(report.imports).toEqual(expect.arrayContaining([
      expect.objectContaining({
        module: '@react-native-async-storage/async-storage',
        syntax: 'import',
        typeOnly: true,
      }),
      expect.objectContaining({
        module: '@react-native-async-storage/async-storage',
        syntax: 'require',
        typeOnly: false,
      }),
    ]));
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      selector: expect.objectContaining({ literalValue: 'shadow_key' }),
    }));
  });

  it('terminates alias cycles and records one stable hold gap', () => {
    const report = scanOne(`
      const first = second;
      const second = first;
      first.setItem('not_confirmed', 'payload');
    `);
    expect(report.gaps.filter((gap) => gap.kind === 'alias_cycle')).toHaveLength(1);
    expect(report.scanOutcome).toBe('complete_with_gaps');
    expect(literalSelectors(report)).not.toContain('not_confirmed');
  });

  it('redacts absolute, file URL, escaping relative, and external imports', () => {
    const report = scanOne(`
      import win from 'C:\\\\private\\\\secret';
      import unc from '\\\\\\\\server\\\\share\\\\secret';
      import posix from '/private/secret';
      import fileUrl from 'file:///private/secret';
      import escaped from '../../escape';
      import external from 'unrelated-private-package';
      void [win, unc, posix, fileUrl, escaped, external];
    `);
    const json = canonicalCensusJson(report);
    for (const secret of [
      'C:\\private\\secret',
      '\\\\server\\share\\secret',
      '/private/secret',
      'file:///private/secret',
      '../../escape',
      'unrelated-private-package',
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(report.imports.map((item) => item.moduleKind)).toEqual(expect.arrayContaining([
      'redacted_absolute',
      'redacted_file_url',
      'redacted_relative_escape',
      'redacted_external',
    ]));
  });
});

describe('account storage census stage C', () => {
  it('does not harvest strings after a mapped multiRemove expression', () => {
    const report = scanOne(`
      import Store from '@react-native-async-storage/async-storage';
      await Store.multiRemove([
        ...settledIds,
      ].map((id) => operationStorageKey(ownerStableId, id)));
      if (!stillCurrent()) throw new Error('level_spin_star_identity_changed');
      type Pair = [string, string];
    `);

    expect(literalSelectors(report)).not.toContain('level_spin_star_identity_changed');
    expect(report.operations).toContainEqual(expect.objectContaining({
      family: 'async_storage',
      operation: 'multiRemove',
      selector: expect.objectContaining({ astKind: 'call_expression' }),
      confidence: 'unresolved',
    }));
  });

  it('extracts only direct multi-operation keys and never payload descendants', () => {
    const report = scanOne(`
      import Store from '@react-native-async-storage/async-storage';
      const dynamicKey = chooseKey();
      await Store.multiSet([
        ['literal_key', 'PAYLOAD_SECRET'],
        [dynamicKey, makePayload('NESTED_PAYLOAD_SECRET')],
        ...morePairs,
      ]);
      await Store.multiGet(['read_key', dynamicKey, makeKey('KEY_HELPER_ARGUMENT')]);
    `);
    expect(literalSelectors(report)).toEqual(['literal_key', 'read_key']);
    const json = canonicalCensusJson(report);
    expect(json).not.toContain('PAYLOAD_SECRET');
    expect(json).not.toContain('NESTED_PAYLOAD_SECRET');
    expect(json).not.toContain('KEY_HELPER_ARGUMENT');
    expect(report.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: 'multiSet',
        selector: expect.objectContaining({ astKind: 'tuple_key' }),
      }),
      expect.objectContaining({
        operation: 'multiSet',
        selector: expect.objectContaining({ astKind: 'spread' }),
        confidence: 'unresolved',
      }),
      expect.objectContaining({
        operation: 'multiGet',
        selector: expect.objectContaining({ astKind: 'call_expression' }),
        confidence: 'unresolved',
      }),
    ]));
  });
});

describe('account storage census stage D', () => {
  it('keeps type-injected storage separate from unrelated method names', () => {
    const report = scanOne(`
      import type AsyncStorage from '@react-native-async-storage/async-storage';
      interface Deps {
        storage: Pick<typeof AsyncStorage, 'multiSet'>;
      }
      export async function save(deps: Deps) {
        await deps.storage.multiSet([['safe_key', 'payload']]);
        const obj = { setItem(_key: string, _value: string) {} };
        obj.setItem('not_authoritative', 'payload');
      }
    `);

    expect(report.operations).toContainEqual(expect.objectContaining({
      family: 'async_storage',
      operation: 'multiSet',
      provenance: 'type_injected_candidate',
      confidence: 'type_candidate',
    }));
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      operation: 'setItem',
    }));
  });

  it('records re-exports and relative wrappers without granting producer authority', () => {
    const report = scan([
      source('app/wrapper.ts', `
        import Store from '@react-native-async-storage/async-storage';
        export const put = (key: string, value: string) => Store.setItem(key, value);
      `),
      source('app/consumer.ts', `
        import { put } from './wrapper';
        void put('WRAPPER_KEY_MUST_NOT_BE_CONFIRMED', 'payload');
      `),
      source('app/reexport.ts', `
        export { default as Store } from '@react-native-async-storage/async-storage';
        export type { AsyncStorageStatic } from '@react-native-async-storage/async-storage';
        export * from '@react-native-async-storage/async-storage';
      `),
    ]);

    expect(report.dependencies).toContainEqual(expect.objectContaining({
      fromPath: 'app/consumer.ts',
      resolvedPath: 'app/wrapper.ts',
      status: 'resolved_input',
    }));
    expect(report.gaps.map((gap) => gap.kind)).toEqual(expect.arrayContaining([
      'unresolved_wrapper',
      'unresolved_reexport',
    ]));
    expect(literalSelectors(report)).not.toContain('WRAPPER_KEY_MUST_NOT_BE_CONFIRMED');
  });

  it('recognizes only the approved awaited dynamic-import shapes', () => {
    const report = scanOne(`
      async function inline() {
        await (await import('@react-native-async-storage/async-storage')).default.setItem('inline_key', 'payload');
      }
      const ns = await import('@react-native-async-storage/async-storage');
      await ns.default.setItem('namespace_key', 'payload');
      const { default: Store } = await import('@react-native-async-storage/async-storage');
      await Store.setItem('destructured_key', 'payload');
      const pending = import('@react-native-async-storage/async-storage');
      pending.then((later) => later.default.setItem('NOT_CONFIRMED_THEN', 'payload'));
      const holder = { pending: import('@react-native-async-storage/async-storage') };
      consume(import('@react-native-async-storage/async-storage'));
      import(dynamicName);
      void holder;
    `);

    expect(literalSelectors(report)).toEqual(expect.arrayContaining([
      'inline_key', 'namespace_key', 'destructured_key',
    ]));
    expect(literalSelectors(report)).not.toContain('NOT_CONFIRMED_THEN');
    expect(report.gaps).toContainEqual(expect.objectContaining({
      kind: 'unresolved_dynamic_import',
    }));
  });

  it('retains every sensitive family but never emits non-key secrets', () => {
    const report = scanOne(`
      import auth from '@react-native-firebase/auth';
      import Purchases from 'react-native-purchases';
      import * as FileSystem from 'expo-file-system';
      import * as SecureStore from 'expo-secure-store';
      import * as SQLite from 'expo-sqlite';
      import * as Notifications from 'expo-notifications';
      import app from '@react-native-firebase/app';
      import firestore from '@react-native-firebase/firestore';
      auth().signInWithCustomToken('CUSTOM_TOKEN_SECRET');
      auth().signInWithEmailAndPassword('email@example.test', 'PASSWORD_SECRET');
      Purchases.configure({ apiKey: 'REVENUECAT_SECRET' });
      Purchases.logIn('PRIVATE_USER_ID');
      Purchases.unknownSensitiveMethod('UNKNOWN_SECRET');
      FileSystem.writeAsStringAsync('PRIVATE_PATH', 'PRIVATE_CONTENT');
      SecureStore.setItemAsync('allowed_secure_key', 'PRIVATE_SECURE_VALUE');
      SQLite.openDatabaseAsync('PRIVATE_DATABASE');
      Notifications.scheduleNotificationAsync({ content: { body: 'PRIVATE_BODY' } });
      app().delete();
      firestore().collection('PRIVATE_COLLECTION');
    `);
    const json = canonicalCensusJson(report);
    for (const secret of [
      'CUSTOM_TOKEN_SECRET', 'email@example.test', 'PASSWORD_SECRET',
      'REVENUECAT_SECRET', 'PRIVATE_USER_ID', 'UNKNOWN_SECRET', 'PRIVATE_PATH',
      'PRIVATE_CONTENT', 'PRIVATE_SECURE_VALUE', 'PRIVATE_DATABASE', 'PRIVATE_BODY',
      'PRIVATE_COLLECTION',
    ]) expect(json).not.toContain(secret);
    expect(literalSelectors(report)).toContain('allowed_secure_key');
    expect(new Set(report.operations.flatMap((operation) => (
      operation.family === null ? [] : [operation.family]
    )))).toEqual(new Set([
      'firebase_auth', 'revenuecat', 'file_system', 'secure_store', 'sqlite',
      'notifications', 'firebase_app', 'firebase_firestore',
    ]));
  });

  it('does not leak imported authority through lexical shadows and records import-equals', () => {
    const report = scanOne(`
      import Imported from '@react-native-async-storage/async-storage';
      import Required = require('@react-native-async-storage/async-storage');
      function shadowed() {
        const Imported = { setItem(_key: string, _value: string) {} };
        Imported.setItem('shadowed_key', 'payload');
      }
      Required.setItem('import_equals_key', 'payload');
    `);
    expect(literalSelectors(report)).toContain('import_equals_key');
    expect(literalSelectors(report)).not.toContain('shadowed_key');
    expect(report.imports).toContainEqual(expect.objectContaining({ syntax: 'import_equals' }));
  });

  it('retains computed sensitive members without exposing their argument', () => {
    const report = scanOne(`
      import Store from '@react-native-async-storage/async-storage';
      const method = chooseMethod();
      Store[method]('COMPUTED_ARGUMENT_SECRET');
      import { missing } from './missing-wrapper';
      void missing;
    `);
    expect(report.operations).toContainEqual(expect.objectContaining({
      family: 'async_storage',
      operation: '<computed>',
      selector: expect.objectContaining({ astKind: 'string_literal' }),
      confidence: 'unresolved',
    }));
    expect(canonicalCensusJson(report)).not.toContain('COMPUTED_ARGUMENT_SECRET');
    expect(report.gaps.map((gap) => gap.kind)).toEqual(expect.arrayContaining([
      'dynamic_receiver', 'unresolved_static_dependency',
    ]));
  });
});

describe('account storage census stage E', () => {
  it('reports native tokens as unverified text, including comment-only matches', () => {
    const nativePolicy: CensusPolicySnapshot = {
      ...TEST_POLICY,
      requiredRoots: ['android/app/src/main'],
      auxiliaryInputs: [],
    };
    const entry = nativeSource('android/app/src/main/Fake.kt', `
      // SharedPreferences appears only in this comment.
      val defaults = UserDefaults.standard
      val group = "group.example"
      // data-extraction-rules backup rule
    `);
    const report = scanAccountStorageEntries({
      entries: [entry],
      auxiliaryInputs: [],
      collection: {
        effectivePolicy: nativePolicy,
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'android/app/src/main', requirement: 'required', status: 'scanned', fileCount: 1 },
        ],
        unavailableInputs: [],
        gaps: [],
        enumerationComplete: true,
      },
    });

    expect(report.nativeCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ tokenId: 'shared_preferences' }),
      expect.objectContaining({ tokenId: 'user_defaults' }),
      expect.objectContaining({ tokenId: 'app_group' }),
      expect.objectContaining({ tokenId: 'backup_rule' }),
    ]));
    expect(report.nativeCandidates.every(
      (candidate) => candidate.provenance === 'native_text_candidate_unverified',
    )).toBe(true);
    expect(report.coverage.mayCertifyNativeErase).toBe(false);
  });

  it('emits registry matches as hints and holds ambiguous matches', () => {
    const registry: CensusAuxiliaryInput = {
      path: REGISTRY_PATH,
      bytes: new Uint8Array(Buffer.from(JSON.stringify({
        schemaVersion: 'phone-state-legacy-inventory.v1',
        rows: [
          { key: 'exact_key', domain: 'exact', scope: 'portable', reducer: 'replace', importSource: ['async_storage'], legacyMirror: false, sensitivity: 'personal' },
          { key: 'duplicate_key', domain: 'duplicate', scope: 'portable', reducer: 'replace', importSource: [], legacyMirror: false, sensitivity: 'personal' },
        ],
        prefixRules: [
          { prefix: 'prefix_', domain: 'prefix', scope: 'device', reducer: 'replace', importSource: ['async_storage'], legacyMirror: true, sensitivity: 'low' },
          { prefix: 'duplicate_', domain: 'duplicate-prefix', scope: 'device', reducer: 'replace', importSource: [], legacyMirror: false, sensitivity: 'low' },
        ],
      }), 'utf8')),
    };
    const report = scanAccountStorageEntries({
      entries: [source('app/keys.ts', `
        import Store from '@react-native-async-storage/async-storage';
        Store.setItem('exact_key', 'payload');
        Store.getItem('prefix_value');
        Store.removeItem('unmatched_key');
        Store.getItem('duplicate_key');
      `)],
      auxiliaryInputs: [registry],
      collection: completeCollection(1),
    });

    expect(report.policyHints).toEqual(expect.arrayContaining([
      expect.objectContaining({ registryRowKind: 'literal', domain: 'exact', claim: 'policy_hint_not_owner_proof' }),
      expect.objectContaining({ registryRowKind: 'prefix', domain: 'prefix', claim: 'policy_hint_not_owner_proof' }),
    ]));
    expect(report.policyHints).toHaveLength(2);
    expect(report.gaps).toContainEqual(expect.objectContaining({
      kind: 'ambiguous_policy_hint',
      detailCode: 'registry_multiple_matches',
    }));
  });
});

describe('account storage census stage F', () => {
  it('collects bounded files without following observed links or escaped child names', () => {
    const safeBytes = new Uint8Array(Buffer.from('export const ok = true;', 'utf8'));
    const malformedBytes = new Uint8Array(Buffer.from('export const = ;', 'utf8'));
    const readPaths: string[] = [];
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === 'C:\\repo') return [{ name: 'app', kind: 'directory' }];
        if (inputPath === 'C:\\repo\\app') return [
          { name: 'safe.ts', kind: 'file' },
          { name: 'malformed.ts', kind: 'file' },
          { name: 'unreadable.ts', kind: 'file' },
          { name: 'outside', kind: 'junction' },
          { name: '..\\escape.ts', kind: 'file' },
        ];
        throw new Error('unexpected test directory');
      },
      lstat(inputPath) {
        if (inputPath === 'C:\\repo' || inputPath === 'C:\\repo\\app') {
          return { kind: 'directory', sizeBytes: 0 };
        }
        if (inputPath === 'C:\\repo\\app\\safe.ts') {
          return { kind: 'file', sizeBytes: safeBytes.byteLength };
        }
        if (inputPath === 'C:\\repo\\app\\malformed.ts') {
          return { kind: 'file', sizeBytes: malformedBytes.byteLength };
        }
        throw new Error('unreadable');
      },
      realpath(inputPath) {
        if (inputPath === 'C:\\repo\\app\\outside') return 'C:\\outside\\secret';
        return inputPath;
      },
      readFileBytes(inputPath, maxBytes) {
        readPaths.push(inputPath);
        const bytes = inputPath.endsWith('safe.ts') ? safeBytes : malformedBytes;
        if (bytes.byteLength > maxBytes) throw new Error('too large');
        return bytes.slice();
      },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: 'C:\\repo',
      fs,
      pathApi: path.win32,
      policy: { ...TEST_POLICY, auxiliaryInputs: [] },
    });
    const report = scanAccountStorageEntries(collected);

    expect(readPaths).toEqual([
      'C:\\repo\\app\\malformed.ts',
      'C:\\repo\\app\\safe.ts',
    ]);
    expect(readPaths).not.toContain('C:\\outside\\secret');
    expect(collected.collection.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'link_skipped', detailCode: 'link_outside_repo' }),
      expect.objectContaining({ kind: 'path_outside_root', detailCode: 'invalid_child_name' }),
      expect.objectContaining({ kind: 'unreadable', detailCode: 'lstat_failed' }),
    ]));
    expect(report.gaps).toContainEqual(expect.objectContaining({ kind: 'parse_diagnostic' }));
    expect(report.scanOutcome).toBe('incomplete');
  });

  it('enforces byte bounds and reserves a deterministic max-gaps sentinel', () => {
    const bytes = new Uint8Array(Buffer.from('too many bytes', 'utf8'));
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === '/repo') return [{ name: 'app', kind: 'directory' }];
        if (inputPath === '/repo/app') return [
          { name: '../one', kind: 'file' },
          { name: '../two', kind: 'file' },
          { name: '../three', kind: 'file' },
          { name: 'large.ts', kind: 'file' },
        ];
        return [];
      },
      lstat(inputPath) {
        if (inputPath === '/repo' || inputPath === '/repo/app') return { kind: 'directory', sizeBytes: 0 };
        return { kind: 'file', sizeBytes: bytes.byteLength };
      },
      realpath(inputPath) { return inputPath; },
      readFileBytes() { throw new Error('oversized file must not be read'); },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: '/repo',
      fs,
      pathApi: path.posix,
      policy: {
        ...TEST_POLICY,
        auxiliaryInputs: [],
        bounds: {
          ...TEST_POLICY.bounds,
          maxBytesPerFile: 4,
          maxTotalBytes: 8,
          maxGaps: 2,
        },
      },
    });

    expect(collected.collection.gaps).toHaveLength(2);
    expect(collected.collection.gaps).toContainEqual(expect.objectContaining({
      kind: 'bound_exceeded',
      detailCode: 'max_gaps',
      severity: 'incomplete',
    }));
    expect(collected.collection.enumerationComplete).toBe(false);
  });

  it.each([
    ['max_files', { maxFiles: 1 }, ['one.ts', 'two.ts']],
    ['max_total_bytes', { maxTotalBytes: 3 }, ['one.ts', 'two.ts']],
  ] as const)('retains %s overflow as incomplete evidence', (detailCode, boundOverride, names) => {
    const bytes = new Uint8Array(Buffer.from('ok', 'utf8'));
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === '/repo') return [{ name: 'app', kind: 'directory' }];
        if (inputPath === '/repo/app') return names.map((name) => ({ name, kind: 'file' as const }));
        return [];
      },
      lstat(inputPath) {
        return inputPath === '/repo' || inputPath === '/repo/app'
          ? { kind: 'directory', sizeBytes: 0 }
          : { kind: 'file', sizeBytes: bytes.byteLength };
      },
      realpath(inputPath) { return inputPath; },
      readFileBytes() { return bytes.slice(); },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: '/repo', fs, pathApi: path.posix,
      policy: {
        ...TEST_POLICY,
        auxiliaryInputs: [],
        bounds: { ...TEST_POLICY.bounds, ...boundOverride },
      },
    });
    expect(collected.collection.gaps).toContainEqual(expect.objectContaining({
      kind: 'bound_exceeded', detailCode, severity: 'incomplete',
    }));
    if (detailCode === 'max_files') expect(collected.entries).toHaveLength(1);
  });

  it('stops descent at the configured depth bound', () => {
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === '/repo') return [{ name: 'app', kind: 'directory' }];
        if (inputPath === '/repo/app') return [{ name: 'one', kind: 'directory' }];
        if (inputPath === '/repo/app/one') return [{ name: 'two', kind: 'directory' }];
        return [];
      },
      lstat() { return { kind: 'directory', sizeBytes: 0 }; },
      realpath(inputPath) { return inputPath; },
      readFileBytes() { throw new Error('no files'); },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: '/repo', fs, pathApi: path.posix,
      policy: {
        ...TEST_POLICY,
        auxiliaryInputs: [],
        bounds: { ...TEST_POLICY.bounds, maxDepth: 1 },
      },
    });
    expect(collected.collection.gaps).toContainEqual(expect.objectContaining({
      kind: 'bound_exceeded', detailCode: 'max_depth', severity: 'incomplete',
    }));
  });

  it('reports direct-root hazards, optional-root errors, and malformed port values', () => {
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === 'C:\\repo') return [
          { name: '..\\escape.ts', kind: 'file' },
          { name: 'linked.ts', kind: 'symlink' },
          { name: 'app', kind: 'directory' },
        ];
        if (inputPath === 'C:\\repo\\app') return [{ name: 'invalid.ts', kind: 'file' }];
        return [];
      },
      lstat(inputPath) {
        if (inputPath === 'C:\\repo' || inputPath === 'C:\\repo\\app') {
          return { kind: 'directory', sizeBytes: 0 };
        }
        if (inputPath === 'C:\\repo\\contexts') {
          throw Object.assign(new Error('denied'), { code: 'EACCES' });
        }
        return { kind: 'file', sizeBytes: 1 };
      },
      realpath(inputPath) {
        if (inputPath.endsWith('linked.ts')) return 'C:\\outside\\linked.ts';
        return inputPath;
      },
      readFileBytes() { return null as unknown as Uint8Array; },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: 'C:\\repo', fs, pathApi: path.win32,
      policy: { ...TEST_POLICY, optionalRoots: ['contexts'], auxiliaryInputs: [] },
    });
    expect(collected.collection.roots).toContainEqual(expect.objectContaining({
      path: 'contexts', status: 'unreadable',
    }));
    expect(collected.collection.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'path_outside_root', detailCode: 'invalid_child_name' }),
      expect.objectContaining({ kind: 'link_skipped', detailCode: 'link_outside_repo' }),
      expect.objectContaining({ kind: 'unreadable', path: 'contexts' }),
      expect.objectContaining({ kind: 'unreadable', path: 'app/invalid.ts', detailCode: 'raw_read_failed' }),
    ]));
  });
});

describe('account storage census stage G', () => {
  function cliFs(options: Readonly<{ malformedRootFile?: boolean; missingRequiredRoot?: string }> = {}): ReadOnlyCensusFs {
    const registryBytes = policyRegistry().bytes;
    const malformedBytes = new Uint8Array(Buffer.from('export const = ;', 'utf8'));
    const roots = new Set(DEFAULT_CENSUS_POLICY.requiredRoots.map((root) => `C:\\repo\\${root.replaceAll('/', '\\')}`));
    return {
      readDirectory(inputPath) {
        if (inputPath === 'C:\\repo') {
          return options.malformedRootFile ? [{ name: 'broken.ts', kind: 'file' }] : [];
        }
        return [];
      },
      lstat(inputPath) {
        if (inputPath === 'C:\\repo') return { kind: 'directory', sizeBytes: 0 };
        if (inputPath === 'C:\\repo\\broken.ts') return { kind: 'file', sizeBytes: malformedBytes.byteLength };
        if (inputPath === `C:\\repo\\${REGISTRY_PATH.replaceAll('/', '\\')}`) {
          return { kind: 'file', sizeBytes: registryBytes.byteLength };
        }
        const missing = options.missingRequiredRoot === undefined
          ? null
          : `C:\\repo\\${options.missingRequiredRoot.replaceAll('/', '\\')}`;
        if (roots.has(inputPath) && inputPath !== missing) return { kind: 'directory', sizeBytes: 0 };
        throw Object.assign(new Error('absent'), { code: 'ENOENT' });
      },
      realpath(inputPath) { return inputPath; },
      readFileBytes(inputPath) {
        return inputPath.endsWith('broken.ts') ? malformedBytes.slice() : registryBytes.slice();
      },
    };
  }

  it('emits one canonical report and maps no-gap, hold, and incomplete outcomes', () => {
    const run = (fs: ReadOnlyCensusFs) => {
      const stdout: string[] = [];
      const stderr: string[] = [];
      const result = runAccountsV2StorageCensusCli({
        argv: ['--scan'], cwd: 'C:\\repo', fs,
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
      });
      return { ...result, stdout, stderr };
    };

    const complete = run(cliFs());
    expect(complete.exitCode).toBe(0);
    expect(complete.stdout).toHaveLength(1);
    expect(JSON.parse(complete.stdout[0]).scanOutcome).toBe('complete_no_scanner_gaps');

    const hold = run(cliFs({ malformedRootFile: true }));
    expect(hold.exitCode).toBe(1);
    expect(JSON.parse(hold.stdout[0]).scanOutcome).toBe('complete_with_gaps');

    const incomplete = run(cliFs({ missingRequiredRoot: 'app' }));
    expect(incomplete.exitCode).toBe(2);
    expect(JSON.parse(incomplete.stdout[0]).scanOutcome).toBe('incomplete');
  });

  it('rejects unknown and output flags without touching the filesystem', () => {
    let calls = 0;
    const fs: ReadOnlyCensusFs = {
      readDirectory() { calls += 1; return []; },
      lstat() { calls += 1; return { kind: 'directory', sizeBytes: 0 }; },
      realpath(inputPath) { calls += 1; return inputPath; },
      readFileBytes() { calls += 1; return new Uint8Array(); },
    };
    for (const argv of [[], ['--unknown'], ['--scan', '--out', 'report.json']]) {
      const stdout: string[] = [];
      const result = runAccountsV2StorageCensusCli({
        argv, cwd: 'C:\\repo', fs,
        stdout: (text) => stdout.push(text),
        stderr: () => undefined,
      });
      expect(result.exitCode).toBe(2);
      expect(stdout).toHaveLength(0);
    }
    expect(calls).toBe(0);
  });

  it('has no stdout or stderr side effect when imported', () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      jest.isolateModules(() => {
        jest.requireActual('../scripts/accounts-v2-storage-census');
      });
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});

describe('account storage census review repairs', () => {
  function expectRecursivelyFrozen(value: unknown, seen = new Set<unknown>()): void {
    if (typeof value !== 'object' || value === null || seen.has(value)) return;
    seen.add(value);
    if (value instanceof Uint8Array) {
      expect(Object.isFrozen(value)).toBe(false);
      return;
    }
    expect(Object.isFrozen(value)).toBe(true);
    for (const child of Object.values(value as Record<string, unknown>)) {
      expectRecursivelyFrozen(child, seen);
    }
  }

  it('snapshots each core byte input exactly once and deeply freezes the report', () => {
    const original = new Uint8Array(Buffer.from(`
      import Store from '@react-native-async-storage/async-storage';
      Store.setItem('immutable_key', 'payload');
    `, 'utf8'));
    let reads = 0;
    const entry = {
      path: 'app/immutable.ts',
      root: 'app',
      kind: 'js_ts_ast' as const,
      get bytes() {
        reads += 1;
        return original;
      },
    };
    const report = scanAccountStorageEntries({
      entries: [entry],
      auxiliaryInputs: [policyRegistry()],
      collection: completeCollection(1),
    });
    const before = canonicalCensusJson(report);
    original.fill(0);

    expect(reads).toBe(1);
    expect(canonicalCensusJson(report)).toBe(before);
    expect(literalSelectors(report)).toContain('immutable_key');
    expectRecursivelyFrozen(report);
    expect(() => {
      (report.coverage as { mayCertifyNativeErase: boolean }).mayCertifyNativeErase = true;
    }).toThrow();
    expect(report.coverage).toMatchObject({
      mayCertifyNativeErase: false,
      mayCertifyFullUserLocalWipe: false,
    });
  });

  it('returns a deeply frozen collector graph with newly owned mutable byte views', () => {
    const original = new Uint8Array(Buffer.from('export const safe = true;', 'utf8'));
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === '/repo') return [{ name: 'app', kind: 'directory' }];
        if (inputPath === '/repo/app') return [{ name: 'safe.ts', kind: 'file' }];
        return [];
      },
      lstat(inputPath) {
        return inputPath === '/repo' || inputPath === '/repo/app'
          ? { kind: 'directory', sizeBytes: 0 }
          : { kind: 'file', sizeBytes: original.byteLength };
      },
      realpath(inputPath) { return inputPath; },
      readFileBytes() { return original; },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: '/repo', fs, pathApi: path.posix,
      policy: { ...TEST_POLICY, auxiliaryInputs: [] },
    });
    const collectedBytes = collected.entries[0].bytes;
    original.fill(0);

    expect(collectedBytes).not.toBe(original);
    expect(Buffer.from(collectedBytes).toString('utf8')).toBe('export const safe = true;');
    expectRecursivelyFrozen(collected);
  });

  it('reserves the sole gap slot for deterministic overflow evidence', () => {
    const report = scanAccountStorageEntries({
      entries: [source('app/a.ts', 'export const a = true;')],
      auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxGaps: 1 },
        },
        roots: completeCollection(1).roots,
        unavailableInputs: [],
        gaps: [{
          gapId: 'injected-link',
          kind: 'link_skipped',
          severity: 'hold',
          path: 'app/link',
          detailCode: 'link_inside_repo',
        }],
        enumerationComplete: true,
      },
    });
    expect(report.gaps).toEqual([
      expect.objectContaining({
        kind: 'bound_exceeded',
        severity: 'incomplete',
        detailCode: 'max_gaps',
      }),
    ]);
    expect(report.scanOutcome).toBe('incomplete');
  });

  it('enforces evidence and dependency budgets during deterministic production', () => {
    const boundedPolicy: CensusPolicySnapshot = {
      ...TEST_POLICY,
      bounds: {
        ...TEST_POLICY.bounds,
        maxEvidencePerFile: 1,
        maxDependencyEdgesPerFile: 1,
      },
    };
    const entry = source('app/bounded.ts', `
      import Store from '@react-native-async-storage/async-storage';
      import Secure from 'expo-secure-store';
      Store.setItem('first', 'payload');
      Secure.setItemAsync('second', 'payload');
    `);
    const run = (entries: readonly CensusSourceEntry[]) => scanAccountStorageEntries({
      entries,
      auxiliaryInputs: [policyRegistry()],
      collection: {
        ...completeCollection(entries.length),
        effectivePolicy: boundedPolicy,
      },
    });
    const report = run([entry]);
    expect(report.imports.length + report.operations.length).toBe(1);
    expect(report.dependencies).toHaveLength(1);
    expect(report.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ detailCode: 'max_evidence_per_file', severity: 'incomplete' }),
      expect.objectContaining({ detailCode: 'max_dependency_edges_per_file', severity: 'incomplete' }),
    ]));
    expect(canonicalCensusJson(report)).toBe(canonicalCensusJson(run([entry])));
  });

  it('stops evidence and dependency hashing after both per-file budgets close', () => {
    const cryptoModule = jest.requireActual<typeof import('node:crypto')>('node:crypto');
    const hashSpy = jest.spyOn(cryptoModule, 'createHash');
    const boundedPolicy: CensusPolicySnapshot = {
      ...TEST_POLICY,
      bounds: {
        ...TEST_POLICY.bounds,
        maxEvidencePerFile: 1,
        maxDependencyEdgesPerFile: 1,
      },
    };
    const countHashes = (importCount: number): number => {
      hashSpy.mockClear();
      const imports = Array.from({ length: importCount }, (_, index) => (
        `import Store${index} from '@react-native-async-storage/async-storage';`
      )).join('\n');
      scanAccountStorageEntries({
        entries: [source('app/hash-budget.ts', imports)],
        auxiliaryInputs: [policyRegistry()],
        collection: { ...completeCollection(1), effectivePolicy: boundedPolicy },
      });
      return hashSpy.mock.calls.length;
    };
    try {
      expect(countHashes(20)).toBe(countHashes(2));
    } finally {
      hashSpy.mockRestore();
    }
  });

  it('marks an observed linked required root incomplete and validates root gap semantics', () => {
    const linkedRootFs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        return inputPath === 'C:\\repo' ? [{ name: 'app', kind: 'junction' }] : [];
      },
      lstat(inputPath) {
        if (inputPath === 'C:\\repo') return { kind: 'directory', sizeBytes: 0 };
        if (inputPath === 'C:\\repo\\app') return { kind: 'junction', sizeBytes: 0 };
        throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      },
      realpath(inputPath) { return inputPath; },
      readFileBytes() { throw new Error('linked root must not be read'); },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: 'C:\\repo', fs: linkedRootFs, pathApi: path.win32,
      policy: { ...TEST_POLICY, auxiliaryInputs: [] },
    });
    const report = scanAccountStorageEntries(collected);
    expect(collected.collection.roots).toContainEqual(expect.objectContaining({
      path: 'app', requirement: 'required', status: 'unreadable',
    }));
    expect(report.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'link_skipped', path: 'app', severity: 'hold' }),
      expect.objectContaining({ kind: 'unreadable', path: 'app', severity: 'incomplete' }),
    ]));
    expect(report.scanOutcome).toBe('incomplete');

    expect(() => scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: { ...TEST_POLICY, auxiliaryInputs: [] },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'unreadable', fileCount: 0 },
        ],
        unavailableInputs: [], gaps: [], enumerationComplete: true,
      },
    })).toThrow('invalid_port_result');
  });

  it('rejects required-to-optional policy weakening and forged unavailable metadata', () => {
    expect(() => scanAccountStorageEntries({
      entries: [source('app/a.ts', 'export const a = true;')],
      auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          requiredRoots: [],
          optionalRoots: ['app'],
          auxiliaryInputs: [],
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'optional', status: 'scanned', fileCount: 1 },
        ],
        unavailableInputs: [], gaps: [], enumerationComplete: true,
      },
    })).toThrow('policy_expansion');

    expect(() => scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: { ...TEST_POLICY, auxiliaryInputs: [] },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 1 },
        ],
        unavailableInputs: [{
          path: 'hooks/x.ts',
          root: 'app',
          kind: 'js_ts_ast',
          classification: 'policy_registry_input',
          bytes: 1,
          sha256: 'forged',
          readStatus: 'read',
          parseStatus: 'parsed',
        }],
        gaps: [], enumerationComplete: true,
      },
    })).toThrow('invalid_port_result');
  });

  it('accepts only derived unavailable source metadata with a matching incomplete gap', () => {
    const report = scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: { ...TEST_POLICY, auxiliaryInputs: [] },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 1 },
        ],
        unavailableInputs: [{
          path: 'app/x.ts', root: 'app', kind: 'js_ts_ast', classification: 'source_root',
          bytes: null, sha256: null, readStatus: 'unreadable', parseStatus: 'not_applicable',
        }],
        gaps: [{
          gapId: 'unreadable-x', kind: 'unreadable', severity: 'incomplete',
          path: 'app/x.ts', detailCode: 'raw_read_failed',
        }],
        enumerationComplete: false,
      },
    });
    expect(report.scanOutcome).toBe('incomplete');
    expect(report.inputs.files[0]).toMatchObject({ path: 'app/x.ts', bytes: null, sha256: null });
  });

  it('does not grant package authority through a source-level shadowed require', () => {
    const report = scanOne(`
      const fake = { setItem(_key: string, _value: string) {} };
      const require = (_name: string) => fake;
      const Store = require('@react-native-async-storage/async-storage');
      Store.setItem('shadowed_require_key', 'payload');
    `);
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      selector: expect.objectContaining({ literalValue: 'shadowed_require_key' }),
    }));
  });

  it('tracks a Firebase factory-result const alias without exposing its selector', () => {
    const report = scanOne(`
      import firestore from '@react-native-firebase/firestore';
      const db = firestore();
      db.collection('PRIVATE_COLLECTION_ALIAS');
    `);
    expect(report.operations).toContainEqual(expect.objectContaining({
      family: 'firebase_firestore',
      operation: 'collection',
      confidence: 'confirmed_receiver',
    }));
    expect(canonicalCensusJson(report)).not.toContain('PRIVATE_COLLECTION_ALIAS');
  });

  it('retains relative default and namespace wrapper calls only as unresolved evidence', () => {
    const report = scan([
      source('app/wrapper.ts', `
        export default function put(_key: string, _value: string) {}
        export function remove(_key: string) {}
      `),
      source('app/wrapper-consumer.ts', `
        import put from './wrapper';
        import * as wrapper from './wrapper';
        put('DEFAULT_WRAPPER_SECRET', 'payload');
        wrapper.remove('NAMESPACE_WRAPPER_SECRET');
      `),
    ]);
    expect(report.operations.filter((operation) => operation.provenance === 'unresolved_wrapper')).toHaveLength(2);
    expect(report.gaps.filter((gap) => gap.kind === 'unresolved_wrapper')).toHaveLength(2);
    expect(canonicalCensusJson(report)).not.toContain('DEFAULT_WRAPPER_SECRET');
    expect(canonicalCensusJson(report)).not.toContain('NAMESPACE_WRAPPER_SECRET');
  });

  it('retains direct typeof-import annotations as type candidates only', () => {
    const report = scanOne(`
      declare const injected: unknown;
      const storage: typeof import('@react-native-async-storage/async-storage').default = injected as never;
      storage.setItem('typed_import_key', 'payload');
    `);
    expect(report.operations).toContainEqual(expect.objectContaining({
      family: 'async_storage',
      operation: 'setItem',
      provenance: 'type_injected_candidate',
      confidence: 'type_candidate',
    }));
  });

  it.each([
    ['absolute gap path', {
      gap: {
        gapId: 'bad', kind: 'link_skipped', severity: 'hold',
        path: 'C:/private/secret', detailCode: 'link_inside_repo',
      },
    }],
    ['escaping gap path', {
      gap: {
        gapId: 'bad', kind: 'link_skipped', severity: 'hold',
        path: '../escape', detailCode: 'link_inside_repo',
      },
    }],
    ['backslash gap path', {
      gap: {
        gapId: 'bad', kind: 'link_skipped', severity: 'hold',
        path: 'app\\private', detailCode: 'link_inside_repo',
      },
    }],
    ['extra gap field', {
      gap: {
        gapId: 'bad', kind: 'link_skipped', severity: 'hold',
        path: 'app/link', detailCode: 'link_inside_repo', message: 'SOURCE_SECRET',
      },
    }],
    ['extra root field', { rootExtra: { message: 'SOURCE_SECRET' } }],
    ['extra fingerprint field', { fingerprintExtra: { message: 'SOURCE_SECRET' } }],
    ['invalid unavailable source kind', { unavailableKind: 'mystery' }],
  ] as const)('rejects runtime metadata leakage: %s', (_label, mutation) => {
    const gapMutation = 'gap' in mutation;
    const gap = gapMutation ? mutation.gap : {
      gapId: 'unavailable', kind: 'unreadable', severity: 'incomplete',
      path: 'app/x.ts', detailCode: 'raw_read_failed',
    };
    const unavailable = {
      path: 'app/x.ts', root: 'app',
      kind: 'unavailableKind' in mutation ? mutation.unavailableKind : 'js_ts_ast',
      classification: 'source_root', bytes: null, sha256: null,
      readStatus: 'unreadable', parseStatus: 'not_applicable',
      ...('fingerprintExtra' in mutation ? mutation.fingerprintExtra : {}),
    };
    expect(() => scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: { ...TEST_POLICY, auxiliaryInputs: [] },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          {
            path: 'app', requirement: 'required', status: 'scanned', fileCount: gapMutation ? 0 : 1,
            ...('rootExtra' in mutation ? mutation.rootExtra : {}),
          },
        ],
        unavailableInputs: gapMutation ? [] : [unavailable],
        gaps: [gap], enumerationComplete: gapMutation,
      } as unknown as CensusCollectionMetadata,
    })).toThrow('invalid_port_result');
  });

  it('stops collection work immediately after total-byte or file-count bounds close', () => {
    const makeFs = (
      lstatPaths: string[],
      readPaths: string[],
      directoryPaths: string[],
    ): ReadOnlyCensusFs => {
      const children = ['01.ts', '02.ts', '03.ts'].map((name) => ({ name, kind: 'file' as const }));
      return {
        readDirectory(inputPath) {
          directoryPaths.push(inputPath);
          if (inputPath === '/repo') return [
            { name: 'app', kind: 'directory' },
            { name: 'modules', kind: 'directory' },
          ];
          if (inputPath === '/repo/app') return children;
          return [];
        },
        lstat(inputPath) {
          lstatPaths.push(inputPath);
          return inputPath === '/repo' || inputPath === '/repo/app'
            ? { kind: 'directory', sizeBytes: 0 }
            : { kind: 'file', sizeBytes: 2 };
        },
        realpath(inputPath) { return inputPath; },
        readFileBytes(inputPath) {
          readPaths.push(inputPath);
          return Uint8Array.of(0x2f, 0x2f);
        },
      };
    };
    const collectWith = (bound: Partial<CensusPolicySnapshot['bounds']>) => {
      const lstatPaths: string[] = [];
      const readPaths: string[] = [];
      const directoryPaths: string[] = [];
      const collected = collectAccountStorageEntries({
        repoRoot: '/repo', pathApi: path.posix,
        fs: makeFs(lstatPaths, readPaths, directoryPaths),
        policy: {
          ...TEST_POLICY,
          requiredRoots: ['app', 'modules'],
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, ...bound },
        },
      });
      return { collected, lstatPaths, readPaths, directoryPaths };
    };

    const totalBound = collectWith({ maxTotalBytes: 3 });
    expect(totalBound.readPaths).toEqual(['/repo/app/01.ts']);
    expect([...new Set(totalBound.lstatPaths.filter((value) => value.endsWith('.ts')))])
      .toEqual(['/repo/app/01.ts', '/repo/app/02.ts']);
    expect(totalBound.lstatPaths).not.toContain('/repo/modules');
    expect(totalBound.directoryPaths).toEqual(['/repo', '/repo/app']);
    expect(totalBound.collected.collection.roots).toContainEqual(expect.objectContaining({
      path: 'modules', status: 'unreadable', fileCount: 0,
    }));
    expect(scanAccountStorageEntries(totalBound.collected).scanOutcome).toBe('incomplete');
    expect(totalBound.collected.collection.gaps).toContainEqual(expect.objectContaining({
      detailCode: 'max_total_bytes', severity: 'incomplete',
    }));

    const fileBound = collectWith({ maxFiles: 1 });
    expect(fileBound.readPaths).toEqual(['/repo/app/01.ts']);
    expect([...new Set(fileBound.lstatPaths.filter((value) => value.endsWith('.ts')))])
      .toEqual(['/repo/app/01.ts']);
    expect(fileBound.lstatPaths).not.toContain('/repo/modules');
    expect(fileBound.directoryPaths).toEqual(['/repo', '/repo/app']);
    expect(scanAccountStorageEntries(fileBound.collected).scanOutcome).toBe('incomplete');
    expect(fileBound.collected.collection.gaps).toContainEqual(expect.objectContaining({
      detailCode: 'max_files', severity: 'incomplete',
    }));
  });

  it.each(['missing', 'linked', 'unreadable', 'unavailable-file'] as const)(
    'accepts the sole max-gaps sentinel as bounded incomplete evidence for %s collection',
    (failure) => {
      const bytes = new Uint8Array(Buffer.from('export const value = true;', 'utf8'));
      const fs: ReadOnlyCensusFs = {
        readDirectory(inputPath) {
          if (inputPath === '/repo') return [{ name: 'app', kind: 'directory' }];
          if (inputPath === '/repo/app' && failure === 'unavailable-file') {
            return [{ name: 'unreadable.ts', kind: 'file' }];
          }
          return [];
        },
        lstat(inputPath) {
          if (inputPath === '/repo') return { kind: 'directory', sizeBytes: 0 };
          if (inputPath === '/repo/app') {
            if (failure === 'missing') throw Object.assign(new Error('missing'), { code: 'ENOENT' });
            if (failure === 'unreadable') throw Object.assign(new Error('denied'), { code: 'EACCES' });
            if (failure === 'linked') return { kind: 'junction', sizeBytes: 0 };
            return { kind: 'directory', sizeBytes: 0 };
          }
          if (inputPath === '/repo/app/unreadable.ts') {
            throw Object.assign(new Error('denied'), { code: 'EACCES' });
          }
          return { kind: 'file', sizeBytes: bytes.byteLength };
        },
        realpath(inputPath) { return inputPath; },
        readFileBytes() { return bytes.slice(); },
      };
      const collected = collectAccountStorageEntries({
        repoRoot: '/repo', fs, pathApi: path.posix,
        policy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxGaps: 1 },
        },
      });

      expect(collected.collection.gaps).toEqual([
        expect.objectContaining({
          kind: 'bound_exceeded', severity: 'incomplete', detailCode: 'max_gaps',
        }),
      ]);
      expect(collected.collection.enumerationComplete).toBe(false);
      expect(scanAccountStorageEntries(collected).scanOutcome).toBe('incomplete');
    },
  );

  it('does not let a max-gaps sentinel waive collection consistency when enumeration is complete', () => {
    expect(() => scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxGaps: 1 },
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'missing_required', fileCount: 0 },
        ],
        unavailableInputs: [],
        gaps: [{
          gapId: 'sentinel', kind: 'bound_exceeded', severity: 'incomplete', detailCode: 'max_gaps',
        }],
        enumerationComplete: true,
      },
    })).toThrow('invalid_port_result');
  });

  it('stops evidence and dependency production after the max-gaps sentinel is installed', () => {
    const report = scanAccountStorageEntries({
      entries: [source('app/closed-after-gap.ts', `
        import Store from '@react-native-async-storage/async-storage';
        declare const dynamicKey: string;
        declare const dynamicModule: string;
        Store.getItem(dynamicKey);
        Store.setItem('must_not_be_emitted', 'payload');
        import(dynamicModule);
      `)],
      auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxGaps: 1 },
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 1 },
        ],
        unavailableInputs: [], gaps: [], enumerationComplete: true,
      },
    });

    expect(report.gaps).toEqual([
      expect.objectContaining({ detailCode: 'max_gaps', severity: 'incomplete' }),
    ]);
    expect(literalSelectors(report)).not.toContain('must_not_be_emitted');
    expect(report.imports).not.toContainEqual(expect.objectContaining({ moduleKind: 'dynamic' }));
    expect(report.dependencies).not.toContainEqual(expect.objectContaining({
      status: 'nonliteral_dynamic',
    }));
  });

  it.each([
    "import require from 'other-package';",
    "import { factory as require } from 'other-package';",
    "import * as require from 'other-package';",
  ])('treats an imported require binding as a lexical shadow: %s', (declaration) => {
    const report = scanOne(`
      ${declaration}
      const Store = require('@react-native-async-storage/async-storage');
      Store.setItem('false_imported_require_key', 'payload');
    `);
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      selector: expect.objectContaining({ literalValue: 'false_imported_require_key' }),
    }));
  });

  it('keeps global require authority and requires zero arguments for Firebase factories', () => {
    const report = scanOne(`
      import firestore from '@react-native-firebase/firestore';
      const Store = require('@react-native-async-storage/async-storage');
      Store.setItem('real_global_require_key', 'payload');
      firestore().collection('PRIVATE_CONFIRMED_COLLECTION');
      firestore({ named: 'other-app' }).collection('PRIVATE_FALSE_COLLECTION');
    `);
    expect(literalSelectors(report)).toContain('real_global_require_key');
    expect(report.operations.filter((operation) => (
      operation.family === 'firebase_firestore' && operation.operation === 'collection'
    ))).toHaveLength(1);
    expect(canonicalCensusJson(report)).not.toContain('PRIVATE_CONFIRMED_COLLECTION');
    expect(canonicalCensusJson(report)).not.toContain('PRIVATE_FALSE_COLLECTION');
  });

  it('rejects an over-counted input set before touching any bytes getter', () => {
    let bytesReads = 0;
    const guardedEntry = (inputPath: string): CensusSourceEntry => {
      const entry = { path: inputPath, root: 'app', kind: 'js_ts_ast' } as CensusSourceEntry;
      Object.defineProperty(entry, 'bytes', {
        enumerable: true,
        get() {
          bytesReads += 1;
          throw new Error('bytes getter must remain untouched');
        },
      });
      return entry;
    };
    expect(() => scanAccountStorageEntries({
      entries: [guardedEntry('app/a.ts'), guardedEntry('app/b.ts')],
      auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxFiles: 1 },
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 2 },
        ],
        unavailableInputs: [], gaps: [], enumerationComplete: true,
      },
    })).toThrow('invalid_port_result');
    expect(bytesReads).toBe(0);
  });

  it('rejects an oversized byte view with a stable input error after one capture and before copying', () => {
    let bytesReads = 0;
    const oversized = Uint8Array.of(1, 2);
    const entry = { path: 'app/large.ts', root: 'app', kind: 'js_ts_ast' } as CensusSourceEntry;
    Object.defineProperty(entry, 'bytes', {
      enumerable: true,
      get() {
        bytesReads += 1;
        return oversized;
      },
    });
    expect(() => scanAccountStorageEntries({
      entries: [entry], auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxBytesPerFile: 1 },
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 1 },
        ],
        unavailableInputs: [], gaps: [], enumerationComplete: true,
      },
    })).toThrow('invalid_port_result');
    expect(bytesReads).toBe(1);
    expect(oversized).toEqual(Uint8Array.of(1, 2));
  });

  it('rejects an over-limit injected gap array before reading or hashing any gap row', () => {
    let gapReads = 0;
    const guardedGap = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get() {
        gapReads += 1;
        throw new Error('gap row must remain untouched');
      },
    });
    expect(() => scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY,
          auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxGaps: 1 },
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 0 },
        ],
        unavailableInputs: [],
        gaps: [guardedGap, guardedGap],
        enumerationComplete: false,
      } as unknown as CensusCollectionMetadata,
    })).toThrow('invalid_port_result');
    expect(gapReads).toBe(0);
  });

  it.each([Object(false), 0, 'false', null])(
    'rejects non-boolean enumerationComplete metadata: %p',
    (enumerationComplete) => {
      expect(() => scanAccountStorageEntries({
        entries: [], auxiliaryInputs: [],
        collection: {
          effectivePolicy: { ...TEST_POLICY, auxiliaryInputs: [] },
          roots: [
            { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
            { path: 'app', requirement: 'required', status: 'scanned', fileCount: 0 },
          ],
          unavailableInputs: [], gaps: [],
          enumerationComplete,
        } as unknown as CensusCollectionMetadata,
      })).toThrow('invalid_port_result');
    },
  );

  it('stops native token work as soon as the per-file evidence budget closes', () => {
    const originalExec = RegExp.prototype.exec;
    let sharedPreferenceExecs = 0;
    const execSpy = jest.spyOn(RegExp.prototype, 'exec').mockImplementation(function exec(value) {
      if (this.source === 'SharedPreferences') sharedPreferenceExecs += 1;
      return originalExec.call(this, value);
    });
    try {
      const bytes = new Uint8Array(Buffer.from(
        Array.from({ length: 20 }, () => 'SharedPreferences').join('\n'), 'utf8',
      ));
      const report = scanAccountStorageEntries({
        entries: [{ path: 'app/native.kt', root: 'app', kind: 'native_text', bytes }],
        auxiliaryInputs: [],
        collection: {
          effectivePolicy: {
            ...TEST_POLICY,
            auxiliaryInputs: [],
            bounds: { ...TEST_POLICY.bounds, maxEvidencePerFile: 1 },
          },
          roots: [
            { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
            { path: 'app', requirement: 'required', status: 'scanned', fileCount: 1 },
          ],
          unavailableInputs: [], gaps: [], enumerationComplete: true,
        },
      });
      expect(report.nativeCandidates).toHaveLength(1);
      expect(report.gaps).toContainEqual(expect.objectContaining({
        detailCode: 'max_evidence_per_file',
      }));
      expect(sharedPreferenceExecs).toBe(2);
    } finally {
      execSpy.mockRestore();
    }
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'does not treat inherited object key %s as a sensitive module',
    (specifier) => {
      const report = scanOne(`
        import Candidate from '${specifier}';
        const Required = require('${specifier}');
        Candidate.setItem('not_sensitive', 'payload');
        Required.setItem('also_not_sensitive', 'payload');
        type Direct = typeof import('${specifier}');
        void (null as unknown as Direct);
      `);
      expect(report.imports).toEqual(expect.arrayContaining([
        expect.objectContaining({ family: null, moduleKind: 'redacted_external' }),
      ]));
      expect(report.operations).not.toContainEqual(expect.objectContaining({
        family: expect.any(String),
        selector: expect.objectContaining({ literalValue: expect.stringMatching(/not_sensitive/) }),
      }));
    },
  );

  it('models loop-scoped imported aliases and destructuring without granting authority', () => {
    const report = scanOne(`
      import Store from '@react-native-async-storage/async-storage';
      declare const fakeStores: unknown[];
      for (const Store of fakeStores) {
        Store.setItem('loop_shadow_key', 'payload');
      }
      for (const { storage: Store } of fakeStores as any[]) {
        Store.setItem('destructured_loop_shadow_key', 'payload');
      }
      Store.setItem('real_import_key', 'payload');
    `);
    expect(literalSelectors(report)).toContain('real_import_key');
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      selector: expect.objectContaining({
        literalValue: expect.stringMatching(/loop_shadow_key/),
      }),
    }));
  });

  it('keeps let require loop-scoped but treats var require as function/source scoped', () => {
    const report = scanOne(`
      declare const factories: Array<(name: string) => unknown>;
      for (let require of factories) {
        const Local = require('@react-native-async-storage/async-storage');
        Local.setItem('let_loop_false', 'payload');
      }
      const GlobalAfterLet = require('@react-native-async-storage/async-storage');
      GlobalAfterLet.setItem('global_after_let', 'payload');
      function varShadow(values: Array<(name: string) => unknown>) {
        for (var require of values) { void require; }
        const AfterVar = require('@react-native-async-storage/async-storage');
        AfterVar.setItem('var_after_loop_false', 'payload');
      }
    `);
    expect(literalSelectors(report)).toContain('global_after_let');
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      selector: expect.objectContaining({ literalValue: 'let_loop_false' }),
    }));
    expect(report.operations).not.toContainEqual(expect.objectContaining({
      family: 'async_storage',
      selector: expect.objectContaining({ literalValue: 'var_after_loop_false' }),
    }));
  });

  it('applies loop lexical TDZ shadowing in classic initializers and for-in/of RHS expressions', () => {
    const report = scanOne(`
      import Store from '@react-native-async-storage/async-storage';
      for (let Store = Store.setItem('classic_initializer_false', 'payload') as any;
        false; void Store) {}
      for (let Store of [Store.setItem('for_of_rhs_false', 'payload')] as any[]) {
        void Store;
      }
      for (let Store in Store.setItem('for_in_rhs_false', 'payload') as any) {
        void Store;
      }
      for (const { storage: Store } of [
        Store.setItem('destructured_rhs_false', 'payload'),
      ] as any[]) {
        void Store;
      }
      Store.setItem('real_import_after_loops', 'payload');
    `);
    expect(literalSelectors(report)).toContain('real_import_after_loops');
    for (const literalValue of [
      'classic_initializer_false',
      'for_of_rhs_false',
      'for_in_rhs_false',
      'destructured_rhs_false',
    ]) {
      expect(report.operations).not.toContainEqual(expect.objectContaining({
        family: 'async_storage',
        selector: expect.objectContaining({ literalValue }),
      }));
    }
  });

  it('applies loop shadows before top-level alias and annotation authority fallbacks', () => {
    const report = scanOne(`
      import Real from '@react-native-async-storage/async-storage';
      declare const values: unknown[];
      declare const injected: unknown;
      const Store = Real;
      const Typed: typeof import('@react-native-async-storage/async-storage').default =
        injected as never;
      for (let Store of values) {
        Store.setItem('alias_loop_body_false', 'payload');
      }
      for (let Store of [Store.setItem('alias_loop_rhs_false', 'payload')] as any[]) {
        void Store;
      }
      for (let Typed of values) {
        Typed.setItem('annotation_loop_body_false', 'payload');
      }
      for (let Store of values) {
        {
          const Store = Real;
          Store.setItem('nested_alias_real', 'payload');
        }
      }
      for (let Typed of values) {
        {
          const Typed: typeof import('@react-native-async-storage/async-storage').default =
            injected as never;
          Typed.setItem('nearer_annotation_real', 'payload');
        }
      }
      for (let Store of values) {
        {
          Store.setItem('nearer_alias_tdz_false', 'payload');
          const Store = Real;
          void Store;
        }
        {
          const Store = (Store.setItem('nearer_alias_self_false', 'payload'), Real);
          void Store;
        }
      }
      for (let Typed of values) {
        {
          Typed.setItem('nearer_annotation_tdz_false', 'payload');
          const Typed: typeof import('@react-native-async-storage/async-storage').default =
            injected as never;
          void Typed;
        }
        {
          const Typed: typeof import('@react-native-async-storage/async-storage').default =
            (Typed.setItem('nearer_annotation_self_false', 'payload'), injected as never);
          void Typed;
        }
      }
      {
        const OuterStore = Real;
        for (let OuterStore of values) {
          OuterStore.setItem('enclosing_alias_hidden_false', 'payload');
        }
      }
      function useLocalAlias() {
        const LocalStore = Real;
        LocalStore.setItem('local_alias_real', 'payload');
      }
      void useLocalAlias;
      Store.setItem('alias_after_loop_real', 'payload');
      Typed.setItem('annotation_after_loop_real', 'payload');
    `);
    expect(literalSelectors(report)).toEqual(expect.arrayContaining([
      'alias_after_loop_real',
      'annotation_after_loop_real',
      'local_alias_real',
      'nested_alias_real',
      'nearer_annotation_real',
    ]));
    for (const literalValue of [
      'alias_loop_body_false',
      'alias_loop_rhs_false',
      'annotation_loop_body_false',
      'enclosing_alias_hidden_false',
      'nearer_alias_tdz_false',
      'nearer_alias_self_false',
      'nearer_annotation_tdz_false',
      'nearer_annotation_self_false',
    ]) {
      expect(report.operations).not.toContainEqual(expect.objectContaining({
        family: 'async_storage',
        selector: expect.objectContaining({ literalValue }),
      }));
    }
  });

  it('orders gaps canonically and admits bounded input gaps in canonical order', () => {
    const makeGap = (gapId: string, path?: string, line?: number, column?: number) => ({
      gapId, kind: 'link_skipped' as const, severity: 'hold' as const,
      ...(path === undefined ? {} : { path }),
      ...(line === undefined ? {} : { line }),
      ...(column === undefined ? {} : { column }),
      detailCode: 'link_inside_repo' as const,
    });
    const rows = [
      makeGap('b', 'b/path', 1, 1),
      makeGap('a-2', 'a/path', 2, 1),
      makeGap('a-1-2', 'a/path', 1, 2),
      makeGap('a-1-1', 'a/path', 1, 1),
      { gapId: 'sentinel', kind: 'bound_exceeded' as const,
        severity: 'incomplete' as const, detailCode: 'max_gaps' as const },
    ];
    const run = (gaps: typeof rows) => scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: { ...TEST_POLICY, auxiliaryInputs: [] },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 0 },
        ],
        unavailableInputs: [], gaps, enumerationComplete: false,
      },
    });
    const forward = run(rows);
    const reverse = run([...rows].reverse());
    expect(forward.gaps.map((gap) => [gap.path, gap.line, gap.column])).toEqual([
      [undefined, undefined, undefined],
      ['a/path', 1, 1], ['a/path', 1, 2], ['a/path', 2, 1], ['b/path', 1, 1],
    ]);
    expect(canonicalCensusJson(forward)).toBe(canonicalCensusJson(reverse));

    const bounded = scanAccountStorageEntries({
      entries: [], auxiliaryInputs: [],
      collection: {
        effectivePolicy: {
          ...TEST_POLICY, auxiliaryInputs: [],
          bounds: { ...TEST_POLICY.bounds, maxGaps: 2 },
        },
        roots: [
          { path: '.', requirement: 'direct_root_files', status: 'scanned', fileCount: 0 },
          { path: 'app', requirement: 'required', status: 'scanned', fileCount: 0 },
        ],
        unavailableInputs: [],
        gaps: [makeGap('z', 'z/path'), makeGap('a', 'a/path')],
        enumerationComplete: true,
      },
    });
    expect(bounded.gaps).toEqual([
      expect.objectContaining({ detailCode: 'max_gaps' }),
      expect.objectContaining({ path: 'a/path' }),
    ]);
  });

  it('uses the same absent-first canonical gap order in collector output', () => {
    const fs: ReadOnlyCensusFs = {
      readDirectory(inputPath) {
        if (inputPath === '/repo') return [{ name: 'app', kind: 'directory' }];
        if (inputPath === '/repo/app') return [
          { name: 'b-link', kind: 'symlink' },
          { name: 'a-link', kind: 'symlink' },
        ];
        return [];
      },
      lstat(inputPath) {
        return inputPath === '/repo' || inputPath === '/repo/app'
          ? { kind: 'directory', sizeBytes: 0 }
          : { kind: 'symlink', sizeBytes: 0 };
      },
      realpath(inputPath) { return inputPath; },
      readFileBytes() { throw new Error('no readable files expected'); },
    };
    const collected = collectAccountStorageEntries({
      repoRoot: '/repo', fs, pathApi: path.posix,
      policy: {
        ...TEST_POLICY,
        auxiliaryInputs: [],
        bounds: { ...TEST_POLICY.bounds, maxGaps: 2 },
      },
    });
    expect(collected.collection.gaps[0]).toMatchObject({ detailCode: 'max_gaps' });
    expect(collected.collection.gaps[0]).not.toHaveProperty('path');
    expect(collected.collection.gaps[1]).toMatchObject({ path: 'app/a-link' });

    const report = scanAccountStorageEntries(collected);
    expect(report.gaps).toHaveLength(2);
    expect(report.gaps[0]).toMatchObject({ detailCode: 'max_gaps' });
    expect(report.gaps[0]).not.toHaveProperty('path');
    expect(report.gaps[1]).toMatchObject({ path: 'app/a-link' });

    const cappedAtOne = collectAccountStorageEntries({
      repoRoot: '/repo', fs, pathApi: path.posix,
      policy: {
        ...TEST_POLICY,
        auxiliaryInputs: [],
        bounds: { ...TEST_POLICY.bounds, maxGaps: 1 },
      },
    });
    expect(cappedAtOne.collection.gaps).toHaveLength(1);
    expect(cappedAtOne.collection.gaps[0]).toMatchObject({ detailCode: 'max_gaps' });
    const cappedReport = scanAccountStorageEntries(cappedAtOne);
    expect(cappedReport.gaps).toHaveLength(1);
    expect(cappedReport.gaps[0]).toMatchObject({ detailCode: 'max_gaps' });
  });
});
