import { createHash } from 'node:crypto';
import { posix as pathPosix } from 'node:path';
import ts from 'typescript';

export type CensusSourceKind = 'js_ts_ast' | 'native_text';

export type CensusSourceEntry = Readonly<{
  path: string;
  root: string;
  kind: CensusSourceKind;
  bytes: Uint8Array;
}>;

export type CensusAuxiliaryInput = Readonly<{
  path: 'config/phone-state-legacy-inventory.v1.json';
  bytes: Uint8Array;
}>;

export type CensusGapKind =
  | 'required_root_missing'
  | 'unreadable'
  | 'invalid_utf8'
  | 'parse_diagnostic'
  | 'link_skipped'
  | 'path_outside_root'
  | 'bound_exceeded'
  | 'invalid_auxiliary_input'
  | 'ambiguous_policy_hint'
  | 'unresolved_static_dependency'
  | 'unresolved_dynamic_import'
  | 'unresolved_wrapper'
  | 'unresolved_reexport'
  | 'alias_cycle'
  | 'dynamic_receiver'
  | 'dynamic_selector';

export type StorageFamily =
  | 'async_storage'
  | 'secure_store'
  | 'file_system'
  | 'sqlite'
  | 'notifications'
  | 'firebase_app'
  | 'firebase_auth'
  | 'firebase_firestore'
  | 'revenuecat'
  | 'native_storage_hint';

export type SelectorAstKind =
  | 'string_literal'
  | 'no_substitution_template'
  | 'template_expression'
  | 'identifier'
  | 'property_access'
  | 'element_access'
  | 'call_expression'
  | 'array_literal'
  | 'tuple_key'
  | 'spread'
  | 'conditional_expression'
  | 'binary_expression'
  | 'object_literal'
  | 'no_argument'
  | 'unknown_expression';

export type ProvenanceKind =
  | 'runtime_import'
  | 'type_only_import'
  | 'global_require'
  | 'dynamic_import_literal'
  | 'const_alias'
  | 'destructured_method'
  | 'type_injected_candidate'
  | 'unresolved_wrapper'
  | 'unbound_method_name_candidate'
  | 'native_text_candidate_unverified';

export type CensusBounds = Readonly<{
  maxFiles: number;
  maxDepth: number;
  maxBytesPerFile: number;
  maxTotalBytes: number;
  maxEvidencePerFile: number;
  maxDependencyEdgesPerFile: number;
  maxGaps: number;
}>;

export type CensusCollectionPolicy = Readonly<{
  requiredRoots: readonly string[];
  optionalRoots: readonly string[];
  auxiliaryInputs: readonly string[];
  astExtensions: readonly string[];
  nativeTextExtensions: readonly string[];
  excludedPathSegments: readonly string[];
  includeDirectRootAstFiles: true;
  bounds: CensusBounds;
}>;

export type CensusPolicySnapshot = CensusCollectionPolicy;

export const DEFAULT_CENSUS_BOUNDS: CensusBounds = Object.freeze({
  maxFiles: 20_000,
  maxDepth: 32,
  maxBytesPerFile: 4 * 1024 * 1024,
  maxTotalBytes: 256 * 1024 * 1024,
  maxEvidencePerFile: 10_000,
  maxDependencyEdgesPerFile: 2_000,
  maxGaps: 100_000,
});

export const DEFAULT_CENSUS_POLICY: CensusCollectionPolicy = Object.freeze({
  requiredRoots: Object.freeze([
    'app',
    'components',
    'constants',
    'hooks',
    'lib',
    'modules',
    'shared',
    'duel',
    'web_shims',
    'store_release_stubs',
    'android/app/src/main',
  ]),
  optionalRoots: Object.freeze(['contexts', 'ios']),
  auxiliaryInputs: Object.freeze(['config/phone-state-legacy-inventory.v1.json']),
  astExtensions: Object.freeze(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']),
  nativeTextExtensions: Object.freeze([
    '.java', '.kt', '.kts', '.swift', '.m', '.mm', '.c', '.cc', '.cpp', '.h',
    '.hpp', '.xml', '.plist', '.gradle', '.properties',
  ]),
  excludedPathSegments: Object.freeze([
    'node_modules', '.git', '.claude', '.codex', '.worktrees', '.gradle', 'Pods',
    'DerivedData', 'tests', '__tests__', 'testing', 'mocks', 'fixtures', 'generated',
    'vendor', 'build', 'dist', 'coverage', 'tmp', 'maestro-results', '_archive',
    'docs', 'assets', 'functions', 'admin', 'scripts', 'tools',
  ]),
  includeDirectRootAstFiles: true,
  bounds: DEFAULT_CENSUS_BOUNDS,
});

export type AccountStorageCensusInputErrorCode =
  | 'invalid_relative_path'
  | 'path_root_mismatch'
  | 'duplicate_path'
  | 'invalid_bound'
  | 'policy_expansion'
  | 'root_metadata_mismatch'
  | 'unavailable_input_mismatch'
  | 'invalid_registry_path'
  | 'invalid_port_result';

export class AccountStorageCensusInputError extends Error {
  readonly name = 'AccountStorageCensusInputError';

  constructor(readonly code: AccountStorageCensusInputErrorCode) {
    super(code);
  }
}

export type RootCollectionResult = Readonly<{
  path: string;
  requirement: 'required' | 'optional' | 'direct_root_files';
  status: 'scanned' | 'missing_required' | 'absent_optional' | 'unreadable';
  fileCount: number;
}>;

export type InputFingerprint = Readonly<{
  path: string;
  root: string | null;
  kind: CensusSourceKind | 'policy_registry_input';
  classification: 'source_root' | 'root_tooling_unclassified' | 'policy_registry_input';
  bytes: number | null;
  sha256: string | null;
  readStatus: 'read' | 'unreadable' | 'too_large' | 'invalid_utf8';
  parseStatus: 'parsed' | 'parse_diagnostic' | 'not_applicable';
}>;

export type CensusGapDetailCode =
  | 'root_missing'
  | 'directory_read_failed'
  | 'lstat_failed'
  | 'raw_read_failed'
  | 'file_changed_during_read'
  | 'invalid_utf8'
  | 'link_inside_repo'
  | 'link_outside_repo'
  | 'link_target_unreadable'
  | 'invalid_child_name'
  | 'canonical_path_escape'
  | 'duplicate_canonical_file'
  | 'max_files'
  | 'max_depth'
  | 'max_bytes_per_file'
  | 'max_total_bytes'
  | 'max_evidence_per_file'
  | 'max_dependency_edges_per_file'
  | 'max_gaps'
  | 'registry_json_invalid'
  | 'registry_schema_invalid'
  | 'registry_multiple_matches'
  | 'missing_static_target'
  | 'nonliteral_dynamic_import'
  | 'unsupported_wrapper'
  | 'unsupported_reexport'
  | 'alias_cycle'
  | 'computed_receiver'
  | 'dynamic_selector';

export type CensusGap = Readonly<{
  gapId: string;
  kind: CensusGapKind;
  severity: 'hold' | 'incomplete';
  path?: string;
  line?: number;
  column?: number;
  diagnosticCode?: number;
  detailCode?: CensusGapDetailCode;
}>;

export type CensusCollectionMetadata = Readonly<{
  effectivePolicy: CensusPolicySnapshot;
  roots: readonly RootCollectionResult[];
  unavailableInputs: readonly InputFingerprint[];
  gaps: readonly CensusGap[];
  enumerationComplete: boolean;
}>;

export type ImportEvidence = Readonly<{
  evidenceId: string;
  path: string;
  line: number;
  column: number;
  module: string | null;
  moduleKind:
    | 'sensitive_package'
    | 'relative_in_policy'
    | 'redacted_absolute'
    | 'redacted_file_url'
    | 'redacted_relative_escape'
    | 'redacted_external'
    | 'dynamic';
  specifierSha256: string;
  syntax: 'import' | 'import_equals' | 'require' | 'dynamic_import' | 'reexport';
  typeOnly: boolean;
  family: StorageFamily | null;
}>;

export type DependencyEvidence = Readonly<{
  evidenceId: string;
  fromPath: string;
  line: number;
  column: number;
  specifierKind: ImportEvidence['moduleKind'];
  specifier: string | null;
  specifierSha256: string;
  resolvedPath: string | null;
  status:
    | 'sensitive_package'
    | 'resolved_input'
    | 'unresolved_in_policy'
    | 'redacted_absolute'
    | 'redacted_file_url'
    | 'redacted_relative_escape'
    | 'unscanned_external'
    | 'nonliteral_dynamic';
}>;

export type StorageOperationEvidence = Readonly<{
  evidenceId: string;
  path: string;
  line: number;
  column: number;
  family: StorageFamily | null;
  operation: string;
  provenance: ProvenanceKind;
  selector: Readonly<{
    astKind: SelectorAstKind;
    literalValue?: string;
    templateStaticParts?: readonly string[];
  }>;
  confidence: 'confirmed_receiver' | 'type_candidate' | 'unresolved';
}>;

export type NativeCandidateEvidence = Readonly<{
  evidenceId: string;
  path: string;
  line: number;
  category: StorageFamily | 'os_backup' | 'app_group';
  tokenId:
    | 'shared_preferences'
    | 'user_defaults'
    | 'keychain'
    | 'encrypted_shared_preferences'
    | 'sqlite_or_room'
    | 'file_or_database_api'
    | 'app_group'
    | 'backup_rule'
    | 'scheduled_notification'
    | 'firebase_app'
    | 'firebase_auth'
    | 'firebase_firestore'
    | 'revenuecat';
  provenance: 'native_text_candidate_unverified';
}>;

export type PolicyHintEvidence = Readonly<{
  evidenceId: string;
  operationEvidenceId: string;
  registryRowKind: 'literal' | 'prefix';
  registryRowIndex: number;
  matchedPattern: string;
  domain: string;
  scope: string;
  reducer: string;
  importSources: readonly string[];
  legacyMirror: boolean;
  sensitivity: string;
  claim: 'policy_hint_not_owner_proof';
}>;

export type CensusSummary = Readonly<{
  rootCount: number;
  inputCount: number;
  parsedInputCount: number;
  nativeTextInputCount: number;
  importCount: number;
  dependencyCount: number;
  operationCount: number;
  nativeCandidateCount: number;
  policyHintCount: number;
  gapCount: number;
}>;

export type AccountStorageCensusReport = Readonly<{
  schemaVersion: 'accounts-v2-storage-census.v1';
  scannerVersion: 1;
  sourceSnapshot: 'per_file_non_atomic_shared_checkout';
  scanOutcome: 'complete_no_scanner_gaps' | 'complete_with_gaps' | 'incomplete';
  policy: CensusPolicySnapshot;
  coverage: Readonly<{
    legacy: 'incomplete_unknown';
    native: 'text_candidates_only';
    ownerAttribution: 'unclassified';
    mayCertifyNativeErase: false;
    mayCertifyFullUserLocalWipe: false;
  }>;
  roots: readonly RootCollectionResult[];
  auxiliaryInputs: readonly InputFingerprint[];
  inputs: Readonly<{
    inputSetSha256: string;
    files: readonly InputFingerprint[];
  }>;
  imports: readonly ImportEvidence[];
  dependencies: readonly DependencyEvidence[];
  operations: readonly StorageOperationEvidence[];
  nativeCandidates: readonly NativeCandidateEvidence[];
  policyHints: readonly PolicyHintEvidence[];
  gaps: readonly CensusGap[];
  summary: CensusSummary;
}>;

function ordinalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(ordinalCompare));
}

export function normalizeCensusPolicy(policy: CensusCollectionPolicy): CensusPolicySnapshot {
  const normalized = Object.freeze({
    requiredRoots: sortedUnique(policy.requiredRoots),
    optionalRoots: sortedUnique(policy.optionalRoots),
    auxiliaryInputs: sortedUnique(policy.auxiliaryInputs),
    astExtensions: sortedUnique(policy.astExtensions),
    nativeTextExtensions: sortedUnique(policy.nativeTextExtensions),
    excludedPathSegments: sortedUnique(policy.excludedPathSegments),
    includeDirectRootAstFiles: true,
    bounds: Object.freeze({
      maxFiles: policy.bounds.maxFiles,
      maxDepth: policy.bounds.maxDepth,
      maxBytesPerFile: policy.bounds.maxBytesPerFile,
      maxTotalBytes: policy.bounds.maxTotalBytes,
      maxEvidencePerFile: policy.bounds.maxEvidencePerFile,
      maxDependencyEdgesPerFile: policy.bounds.maxDependencyEdgesPerFile,
      maxGaps: policy.bounds.maxGaps,
    }),
  });
  validatePolicy(normalized);
  return normalized;
}

const BOUND_KEYS = Object.freeze([
  'maxFiles',
  'maxDepth',
  'maxBytesPerFile',
  'maxTotalBytes',
  'maxEvidencePerFile',
  'maxDependencyEdgesPerFile',
  'maxGaps',
] as const);

function isNormalizedRelativePath(value: string): boolean {
  if (value.length === 0 || value.includes('\\') || value.includes('\0') || value.startsWith('/')) {
    return false;
  }
  const segments = value.split('/');
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    && !/^[A-Za-z]:/.test(value);
}

function isSubset(values: readonly string[], allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return values.every((value) => allowedSet.has(value));
}

function hasExactOwnKeys(
  value: object,
  allowed: readonly string[],
  required: readonly string[],
): boolean {
  const keys = Reflect.ownKeys(value);
  return keys.every((key) => typeof key === 'string' && allowed.includes(key))
    && required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

const GAP_KINDS = new Set<CensusGapKind>([
  'required_root_missing', 'unreadable', 'invalid_utf8', 'parse_diagnostic',
  'link_skipped', 'path_outside_root', 'bound_exceeded', 'invalid_auxiliary_input',
  'ambiguous_policy_hint', 'unresolved_static_dependency', 'unresolved_dynamic_import',
  'unresolved_wrapper', 'unresolved_reexport', 'alias_cycle', 'dynamic_receiver',
  'dynamic_selector',
]);

const GAP_DETAIL_CODES = new Set<CensusGapDetailCode>([
  'root_missing', 'directory_read_failed', 'lstat_failed', 'raw_read_failed',
  'file_changed_during_read', 'invalid_utf8', 'link_inside_repo', 'link_outside_repo',
  'link_target_unreadable', 'invalid_child_name', 'canonical_path_escape',
  'duplicate_canonical_file', 'max_files', 'max_depth', 'max_bytes_per_file',
  'max_total_bytes', 'max_evidence_per_file', 'max_dependency_edges_per_file',
  'max_gaps', 'registry_json_invalid', 'registry_schema_invalid',
  'registry_multiple_matches', 'missing_static_target', 'nonliteral_dynamic_import',
  'unsupported_wrapper', 'unsupported_reexport', 'alias_cycle', 'computed_receiver',
  'dynamic_selector',
]);

function validatePolicy(policy: CensusPolicySnapshot): void {
  if (
    !isSubset(policy.requiredRoots, DEFAULT_CENSUS_POLICY.requiredRoots)
    || !isSubset(policy.optionalRoots, DEFAULT_CENSUS_POLICY.optionalRoots)
    || policy.requiredRoots.some((root) => policy.optionalRoots.includes(root))
    || !isSubset(policy.auxiliaryInputs, DEFAULT_CENSUS_POLICY.auxiliaryInputs)
    || !isSubset(policy.astExtensions, DEFAULT_CENSUS_POLICY.astExtensions)
    || !isSubset(policy.nativeTextExtensions, DEFAULT_CENSUS_POLICY.nativeTextExtensions)
    || !isSubset(DEFAULT_CENSUS_POLICY.excludedPathSegments, policy.excludedPathSegments)
  ) {
    throw new AccountStorageCensusInputError('policy_expansion');
  }
  for (const key of BOUND_KEYS) {
    const value = policy.bounds[key];
    if (!Number.isSafeInteger(value) || value <= 0 || value > DEFAULT_CENSUS_BOUNDS[key]) {
      throw new AccountStorageCensusInputError('invalid_bound');
    }
  }
}

function validateInputs(
  input: Readonly<{
    entries: readonly CensusSourceEntry[];
    auxiliaryInputs: readonly CensusAuxiliaryInput[];
    collection: CensusCollectionMetadata;
  }>,
  policy: CensusPolicySnapshot,
): void {
  validatePolicy(policy);
  const incompleteKinds = new Set<CensusGapKind>([
    'required_root_missing', 'unreadable', 'invalid_utf8', 'path_outside_root',
    'bound_exceeded', 'invalid_auxiliary_input',
  ]);
  for (const gap of input.collection.gaps) {
    if (!hasExactOwnKeys(
      gap,
      ['gapId', 'kind', 'severity', 'path', 'line', 'column', 'diagnosticCode', 'detailCode'],
      ['gapId', 'kind', 'severity'],
    )
      || typeof gap.gapId !== 'string'
      || !GAP_KINDS.has(gap.kind)
      || (gap.path !== undefined && !isNormalizedRelativePath(gap.path))
      || (gap.line !== undefined && (!Number.isSafeInteger(gap.line) || gap.line <= 0))
      || (gap.column !== undefined && (!Number.isSafeInteger(gap.column) || gap.column <= 0))
      || (gap.diagnosticCode !== undefined && !Number.isSafeInteger(gap.diagnosticCode))
      || (gap.detailCode !== undefined && !GAP_DETAIL_CODES.has(gap.detailCode))) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
    const expectedSeverity = incompleteKinds.has(gap.kind) ? 'incomplete' : 'hold';
    if (gap.severity !== expectedSeverity) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
  }
  const hasTruncationSentinel = input.collection.enumerationComplete === false
    && input.collection.gaps.some((gap) => hasExactOwnKeys(
      gap,
      ['gapId', 'kind', 'severity', 'detailCode'],
      ['gapId', 'kind', 'severity', 'detailCode'],
    )
      && gap.kind === 'bound_exceeded'
      && gap.severity === 'incomplete'
      && gap.detailCode === 'max_gaps');
  const readableCount = input.entries.length + input.auxiliaryInputs.length;
  const enumeratedCount = readableCount + input.collection.unavailableInputs.length;
  const totalBytes = [...input.entries, ...input.auxiliaryInputs]
    .reduce((sum, item) => sum + item.bytes.byteLength, 0);
  if (enumeratedCount > policy.bounds.maxFiles
    || totalBytes > policy.bounds.maxTotalBytes
    || [...input.entries, ...input.auxiliaryInputs].some(
      (item) => item.bytes.byteLength > policy.bounds.maxBytesPerFile,
    )) {
    throw new AccountStorageCensusInputError('invalid_port_result');
  }
  const expectedRoots = new Map<string, RootCollectionResult['requirement']>([['.', 'direct_root_files']]);
  for (const root of policy.requiredRoots) expectedRoots.set(root, 'required');
  for (const root of policy.optionalRoots) expectedRoots.set(root, 'optional');
  if (input.collection.roots.length !== expectedRoots.size) {
    throw new AccountStorageCensusInputError('root_metadata_mismatch');
  }
  const actualRoots = new Map<string, RootCollectionResult>();
  for (const root of input.collection.roots) {
    if (!hasExactOwnKeys(
      root,
      ['path', 'requirement', 'status', 'fileCount'],
      ['path', 'requirement', 'status', 'fileCount'],
    )
      || typeof root.path !== 'string'
      || !['required', 'optional', 'direct_root_files'].includes(root.requirement)
      || !['scanned', 'missing_required', 'absent_optional', 'unreadable'].includes(root.status)
      || !Number.isSafeInteger(root.fileCount) || root.fileCount < 0) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
    if (actualRoots.has(root.path) || expectedRoots.get(root.path) !== root.requirement) {
      throw new AccountStorageCensusInputError('root_metadata_mismatch');
    }
    actualRoots.set(root.path, root);
  }
  for (const expectedRoot of expectedRoots.keys()) {
    if (!actualRoots.has(expectedRoot)) {
      throw new AccountStorageCensusInputError('root_metadata_mismatch');
    }
  }
  const hasRootGap = (rootPath: string, kind: CensusGapKind): boolean => input.collection.gaps.some(
    (gap) => gap.path === rootPath && gap.kind === kind && gap.severity === 'incomplete',
  );
  for (const root of actualRoots.values()) {
    const statusAllowed = root.requirement === 'direct_root_files'
      ? root.status === 'scanned'
      : root.requirement === 'required'
        ? root.status === 'scanned' || root.status === 'missing_required' || root.status === 'unreadable'
        : root.status === 'scanned' || root.status === 'absent_optional' || root.status === 'unreadable';
    const matchingGap = root.status === 'missing_required'
      ? hasRootGap(root.path, 'required_root_missing') || hasTruncationSentinel
      : root.status === 'unreadable'
        ? hasRootGap(root.path, 'unreadable')
          || hasRootGap(root.path, 'bound_exceeded')
          || hasTruncationSentinel
        : true;
    if (!statusAllowed || !matchingGap
      || (root.status !== 'scanned' && root.status !== 'absent_optional'
        && input.collection.enumerationComplete)) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
  }

  const seenPaths = new Set<string>();
  const rootCounts = new Map<string, number>();
  const recordPath = (inputPath: string): void => {
    if (seenPaths.has(inputPath)) throw new AccountStorageCensusInputError('duplicate_path');
    seenPaths.add(inputPath);
  };
  for (const entry of input.entries) {
    if (!isNormalizedRelativePath(entry.path)
      || (entry.kind !== 'js_ts_ast' && entry.kind !== 'native_text')) {
      throw new AccountStorageCensusInputError('invalid_relative_path');
    }
    const validRoot = entry.root === '.'
      ? !entry.path.includes('/')
      : isNormalizedRelativePath(entry.root)
        && (entry.path === entry.root || entry.path.startsWith(`${entry.root}/`));
    if (!validRoot || !actualRoots.has(entry.root)) {
      throw new AccountStorageCensusInputError('path_root_mismatch');
    }
    recordPath(entry.path);
    rootCounts.set(entry.root, (rootCounts.get(entry.root) ?? 0) + 1);
  }
  for (const auxiliary of input.auxiliaryInputs) {
    if (auxiliary.path !== 'config/phone-state-legacy-inventory.v1.json') {
      throw new AccountStorageCensusInputError('invalid_registry_path');
    }
    recordPath(auxiliary.path);
  }
  for (const unavailable of input.collection.unavailableInputs) {
    if (!hasExactOwnKeys(
      unavailable,
      ['path', 'root', 'kind', 'classification', 'bytes', 'sha256', 'readStatus', 'parseStatus'],
      ['path', 'root', 'kind', 'classification', 'bytes', 'sha256', 'readStatus', 'parseStatus'],
    )
      || !['js_ts_ast', 'native_text', 'policy_registry_input'].includes(unavailable.kind)
      || !['source_root', 'root_tooling_unclassified', 'policy_registry_input']
        .includes(unavailable.classification)) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
    if (!isNormalizedRelativePath(unavailable.path)) {
      throw new AccountStorageCensusInputError('invalid_relative_path');
    }
    recordPath(unavailable.path);
    const hasMatchingIncompleteGap = input.collection.gaps.some(
      (gap) => gap.path === unavailable.path && gap.severity === 'incomplete',
    ) || hasTruncationSentinel;
    if (unavailable.bytes !== null || unavailable.sha256 !== null
      || unavailable.parseStatus !== 'not_applicable'
      || (unavailable.readStatus !== 'unreadable' && unavailable.readStatus !== 'too_large')
      || !hasMatchingIncompleteGap) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
    if (unavailable.kind === 'policy_registry_input') {
      if (unavailable.root !== null
        || unavailable.path !== 'config/phone-state-legacy-inventory.v1.json'
        || unavailable.classification !== 'policy_registry_input') {
        throw new AccountStorageCensusInputError('unavailable_input_mismatch');
      }
    } else {
      const validRoot = unavailable.root === '.'
        ? !unavailable.path.includes('/')
        : unavailable.root !== null
          && isNormalizedRelativePath(unavailable.root)
          && (unavailable.path === unavailable.root
            || unavailable.path.startsWith(`${unavailable.root}/`));
      const expectedClassification = unavailable.root === '.'
        ? 'root_tooling_unclassified'
        : 'source_root';
      if (unavailable.root === null || !actualRoots.has(unavailable.root)
        || !validRoot || unavailable.classification !== expectedClassification) {
        throw new AccountStorageCensusInputError('invalid_port_result');
      }
      rootCounts.set(unavailable.root, (rootCounts.get(unavailable.root) ?? 0) + 1);
    }
  }
  for (const [rootPath, root] of actualRoots) {
    if (root.fileCount !== (rootCounts.get(rootPath) ?? 0)) {
      throw new AccountStorageCensusInputError('root_metadata_mismatch');
    }
  }

  const requiresRegistry = policy.auxiliaryInputs.includes(
    'config/phone-state-legacy-inventory.v1.json',
  );
  const readableRegistryCount = input.auxiliaryInputs.length;
  const unavailableRegistryCount = input.collection.unavailableInputs.filter(
    (item) => item.kind === 'policy_registry_input',
  ).length;
  if (readableRegistryCount + unavailableRegistryCount !== (requiresRegistry ? 1 : 0)) {
    throw new AccountStorageCensusInputError('unavailable_input_mismatch');
  }
}

function makeGap(
  gap: Omit<CensusGap, 'gapId'> | CensusGap,
): CensusGap {
  const fields: Omit<CensusGap, 'gapId'> = {
    kind: gap.kind,
    severity: gap.severity,
    ...(gap.path === undefined ? {} : { path: gap.path }),
    ...(gap.line === undefined ? {} : { line: gap.line }),
    ...(gap.column === undefined ? {} : { column: gap.column }),
    ...(gap.diagnosticCode === undefined ? {} : { diagnosticCode: gap.diagnosticCode }),
    ...(gap.detailCode === undefined ? {} : { detailCode: gap.detailCode }),
  };
  return Object.freeze({ gapId: sha256(JSON.stringify(['gap', fields])), ...fields });
}

function compareGaps(left: CensusGap, right: CensusGap): number {
  return ordinalCompare(left.path ?? '', right.path ?? '')
    || (left.line ?? -1) - (right.line ?? -1)
    || (left.column ?? -1) - (right.column ?? -1)
    || ordinalCompare(left.gapId, right.gapId);
}

function cloneFingerprint(fingerprint: InputFingerprint): InputFingerprint {
  return Object.freeze({
    path: fingerprint.path,
    root: fingerprint.root,
    kind: fingerprint.kind,
    classification: fingerprint.classification,
    bytes: fingerprint.bytes,
    sha256: fingerprint.sha256,
    readStatus: fingerprint.readStatus,
    parseStatus: fingerprint.parseStatus,
  });
}

function outcomeFor(
  gaps: readonly CensusGap[],
  enumerationComplete: boolean,
): AccountStorageCensusReport['scanOutcome'] {
  if (!enumerationComplete || gaps.some((gap) => gap.severity === 'incomplete')) {
    return 'incomplete';
  }
  return gaps.length > 0 ? 'complete_with_gaps' : 'complete_no_scanner_gaps';
}

function inputSetHash(files: readonly InputFingerprint[]): string {
  return sha256(JSON.stringify(files.map((file) => [
    file.path,
    file.sha256,
    file.bytes,
    file.kind,
    file.classification,
    file.root,
    file.readStatus,
  ])));
}

const SENSITIVE_MODULES: ReadonlyMap<string, StorageFamily> = new Map([
  ['@react-native-async-storage/async-storage', 'async_storage'],
  ['expo-secure-store', 'secure_store'],
  ['expo-file-system', 'file_system'],
  ['expo-file-system/legacy', 'file_system'],
  ['expo-sqlite', 'sqlite'],
  ['expo-notifications', 'notifications'],
  ['@react-native-firebase/app', 'firebase_app'],
  ['@react-native-firebase/auth', 'firebase_auth'],
  ['@react-native-firebase/firestore', 'firebase_firestore'],
  ['react-native-purchases', 'revenuecat'],
]);

const NATIVE_TOKEN_RULES: readonly Readonly<{
  pattern: RegExp;
  category: NativeCandidateEvidence['category'];
  tokenId: NativeCandidateEvidence['tokenId'];
}>[] = Object.freeze([
  { pattern: /SharedPreferences/gi, category: 'native_storage_hint', tokenId: 'shared_preferences' },
  { pattern: /NSUserDefaults|UserDefaults/g, category: 'native_storage_hint', tokenId: 'user_defaults' },
  { pattern: /Keychain/gi, category: 'native_storage_hint', tokenId: 'keychain' },
  { pattern: /EncryptedSharedPreferences/gi, category: 'native_storage_hint', tokenId: 'encrypted_shared_preferences' },
  { pattern: /SQLite|\bRoom\b/gi, category: 'sqlite', tokenId: 'sqlite_or_room' },
  { pattern: /FileManager|FileOutputStream|databasePath/gi, category: 'file_system', tokenId: 'file_or_database_api' },
  { pattern: /group\.[A-Za-z0-9._-]+|app[ -]?group/gi, category: 'app_group', tokenId: 'app_group' },
  { pattern: /data-extraction-rules|backup[_ -]?rules?|fullBackupContent/gi, category: 'os_backup', tokenId: 'backup_rule' },
  { pattern: /UNUserNotificationCenter|scheduleNotification/gi, category: 'notifications', tokenId: 'scheduled_notification' },
  { pattern: /FirebaseApp/gi, category: 'firebase_app', tokenId: 'firebase_app' },
  { pattern: /FirebaseAuth/gi, category: 'firebase_auth', tokenId: 'firebase_auth' },
  { pattern: /Firestore/gi, category: 'firebase_firestore', tokenId: 'firebase_firestore' },
  { pattern: /RevenueCat|Purchases/gi, category: 'revenuecat', tokenId: 'revenuecat' },
]);

type RegistryPolicyRow = Readonly<{
  pattern: string;
  rowKind: 'literal' | 'prefix';
  rowIndex: number;
  domain: string;
  scope: string;
  reducer: string;
  importSources: readonly string[];
  legacyMirror: boolean;
  sensitivity: string;
}>;

type Binding = Readonly<{
  family: StorageFamily | null;
  provenance: ProvenanceKind;
  mode: 'namespace' | 'method' | 'factory';
  method?: string;
}>;

type AliasDefinition = Readonly<{
  initializer: ts.Expression;
  property?: string;
}>;

function directImportTypeBinding(typeNode: ts.TypeNode | undefined): Binding | null {
  if (typeNode === undefined) return null;
  if (ts.isParenthesizedTypeNode(typeNode)) return directImportTypeBinding(typeNode.type);
  if (ts.isImportTypeNode(typeNode)
    && ts.isLiteralTypeNode(typeNode.argument)
    && ts.isStringLiteral(typeNode.argument.literal)) {
    const family = SENSITIVE_MODULES.get(typeNode.argument.literal.text);
    return family === undefined ? null : {
      family,
      provenance: 'type_injected_candidate',
      mode: 'namespace',
    };
  }
  if (ts.isTypeReferenceNode(typeNode)
    && ts.isIdentifier(typeNode.typeName)
    && typeNode.typeName.text === 'Pick'
    && typeNode.typeArguments?.length === 2) {
    const base = directImportTypeBinding(typeNode.typeArguments[0]);
    const selected = typeNode.typeArguments[1];
    if (base !== null && ts.isLiteralTypeNode(selected) && ts.isStringLiteral(selected.literal)) {
      return { ...base, method: selected.literal.text };
    }
  }
  return null;
}

type AnalysisSink = {
  imports: ImportEvidence[];
  dependencies: DependencyEvidence[];
  operations: StorageOperationEvidence[];
  gaps: CensusGap[];
  addGap: (gap: Omit<CensusGap, 'gapId'> | CensusGap) => void;
  canAddEvidence: (path: string) => boolean;
  isEvidenceOpen: (path: string) => boolean;
  canAddDependency: (path: string) => boolean;
  addEvidence: <T extends { evidenceId: string }>(
    path: string,
    target: T[],
    build: () => T,
  ) => void;
  addDependency: (path: string, build: () => DependencyEvidence) => void;
};

const UNBOUND_STORAGE_METHODS = new Set([
  'getItem', 'setItem', 'removeItem', 'mergeItem',
  'multiGet', 'multiSet', 'multiRemove', 'multiMerge',
  'getItemAsync', 'setItemAsync', 'deleteItem', 'deleteItemAsync',
]);

function evidenceId(kind: string, fields: object): string {
  return sha256(JSON.stringify([kind, fields]));
}

function locationOf(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): Readonly<{ line: number; column: number }> {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: location.line + 1, column: location.character + 1 };
}

function policyContainsPath(inputPath: string, policy: CensusPolicySnapshot): boolean {
  if (!isNormalizedRelativePath(inputPath)) return false;
  if (!inputPath.includes('/')) return policy.includeDirectRootAstFiles;
  return [...policy.requiredRoots, ...policy.optionalRoots].some(
    (root) => inputPath === root || inputPath.startsWith(`${root}/`),
  );
}

function resolveRelativeImport(
  fromPath: string,
  specifier: string,
  entryPaths: ReadonlySet<string>,
  policy: CensusPolicySnapshot,
): Readonly<{ normalized: string; resolved: string | null }> | null {
  const normalized = pathPosix.normalize(pathPosix.join(pathPosix.dirname(fromPath), specifier));
  if (!policyContainsPath(normalized, policy)) return null;
  const candidates = [
    normalized,
    ...policy.astExtensions.map((extension) => `${normalized}${extension}`),
    ...policy.astExtensions.map((extension) => `${normalized}/index${extension}`),
  ];
  const resolved = candidates.find((candidate) => entryPaths.has(candidate)) ?? null;
  return { normalized, resolved };
}

function classifySpecifier(
  fromPath: string,
  rawSpecifier: string,
  entryPaths: ReadonlySet<string>,
  policy: CensusPolicySnapshot,
): Readonly<{
  module: string | null;
  moduleKind: ImportEvidence['moduleKind'];
  resolvedPath: string | null;
  status: DependencyEvidence['status'];
  family: StorageFamily | null;
}> {
  const family = SENSITIVE_MODULES.get(rawSpecifier) ?? null;
  if (family !== null) {
    return {
      module: rawSpecifier,
      moduleKind: 'sensitive_package',
      resolvedPath: null,
      status: 'sensitive_package',
      family,
    };
  }
  if (/^file:/i.test(rawSpecifier)) {
    return {
      module: null,
      moduleKind: 'redacted_file_url',
      resolvedPath: null,
      status: 'redacted_file_url',
      family: null,
    };
  }
  if (
    rawSpecifier.startsWith('/')
    || /^[A-Za-z]:[\\/]/.test(rawSpecifier)
    || /^\\\\/.test(rawSpecifier)
  ) {
    return {
      module: null,
      moduleKind: 'redacted_absolute',
      resolvedPath: null,
      status: 'redacted_absolute',
      family: null,
    };
  }
  if (rawSpecifier.startsWith('.')) {
    const resolution = resolveRelativeImport(fromPath, rawSpecifier, entryPaths, policy);
    if (resolution === null) {
      return {
        module: null,
        moduleKind: 'redacted_relative_escape',
        resolvedPath: null,
        status: 'redacted_relative_escape',
        family: null,
      };
    }
    return {
      module: resolution.resolved ?? resolution.normalized,
      moduleKind: 'relative_in_policy',
      resolvedPath: resolution.resolved,
      status: resolution.resolved === null ? 'unresolved_in_policy' : 'resolved_input',
      family: null,
    };
  }
  return {
    module: null,
    moduleKind: 'redacted_external',
    resolvedPath: null,
    status: 'unscanned_external',
    family: null,
  };
}

function syntaxKind(expression: ts.Expression | undefined): SelectorAstKind {
  if (expression === undefined) return 'no_argument';
  if (ts.isStringLiteral(expression)) return 'string_literal';
  if (ts.isNoSubstitutionTemplateLiteral(expression)) return 'no_substitution_template';
  if (ts.isTemplateExpression(expression)) return 'template_expression';
  if (ts.isIdentifier(expression)) return 'identifier';
  if (ts.isPropertyAccessExpression(expression)) return 'property_access';
  if (ts.isElementAccessExpression(expression)) return 'element_access';
  if (ts.isCallExpression(expression)) return 'call_expression';
  if (ts.isArrayLiteralExpression(expression)) return 'array_literal';
  if (ts.isSpreadElement(expression)) return 'spread';
  if (ts.isConditionalExpression(expression)) return 'conditional_expression';
  if (ts.isBinaryExpression(expression)) return 'binary_expression';
  if (ts.isObjectLiteralExpression(expression)) return 'object_literal';
  return 'unknown_expression';
}

function selectorFor(
  family: StorageFamily | null,
  operation: string,
  expression: ts.Expression | undefined,
): StorageOperationEvidence['selector'] {
  const selector: {
    astKind: SelectorAstKind;
    literalValue?: string;
    templateStaticParts?: readonly string[];
  } = { astKind: syntaxKind(expression) };
  const asyncStorageSingle = new Set(['getItem', 'setItem', 'removeItem', 'mergeItem']);
  const secureStoreSingle = new Set([
    'getItem', 'getItemAsync', 'setItem', 'setItemAsync', 'deleteItem', 'deleteItemAsync',
  ]);
  const mayReveal = (family === 'async_storage' && asyncStorageSingle.has(operation))
    || (family === 'secure_store' && secureStoreSingle.has(operation));
  if (mayReveal && expression !== undefined) {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      selector.literalValue = expression.text;
    } else if (ts.isTemplateExpression(expression)) {
      selector.templateStaticParts = [
        expression.head.text,
        ...expression.templateSpans.map((span) => span.literal.text),
      ];
    }
  }
  return Object.freeze(selector);
}

type SelectorCandidate = Readonly<{
  selector: StorageOperationEvidence['selector'];
  unresolved: boolean;
}>;

function selectorIsUnresolved(selector: StorageOperationEvidence['selector']): boolean {
  return selector.astKind !== 'string_literal'
    && selector.astKind !== 'no_substitution_template'
    && selector.astKind !== 'no_argument';
}

function selectorCandidatesFor(
  family: StorageFamily | null,
  operation: string,
  argument: ts.Expression | undefined,
): readonly SelectorCandidate[] {
  if (family !== 'async_storage') {
    const selector = selectorFor(family, operation, argument);
    return [{ selector, unresolved: selectorIsUnresolved(selector) }];
  }
  const directArrayOperations = new Set(['multiGet', 'multiRemove']);
  const tupleArrayOperations = new Set(['multiSet', 'multiMerge']);
  if (!directArrayOperations.has(operation) && !tupleArrayOperations.has(operation)) {
    const selector = selectorFor(family, operation, argument);
    return [{ selector, unresolved: selectorIsUnresolved(selector) }];
  }
  if (argument === undefined || !ts.isArrayLiteralExpression(argument)) {
    const selector = selectorFor(family, operation, argument);
    return [{ selector, unresolved: true }];
  }
  const candidates: SelectorCandidate[] = [];
  for (const element of argument.elements) {
    if (ts.isSpreadElement(element)) {
      candidates.push({ selector: Object.freeze({ astKind: 'spread' }), unresolved: true });
      continue;
    }
    if (directArrayOperations.has(operation)) {
      const selector = selectorFor(family, 'getItem', element);
      candidates.push({ selector, unresolved: selectorIsUnresolved(selector) });
      continue;
    }
    if (!ts.isArrayLiteralExpression(element) || element.elements.length === 0) {
      const selector = selectorFor(family, operation, element);
      candidates.push({ selector, unresolved: true });
      continue;
    }
    const keyExpression = element.elements[0];
    if (ts.isSpreadElement(keyExpression)) {
      candidates.push({ selector: Object.freeze({ astKind: 'spread' }), unresolved: true });
      continue;
    }
    const keySelector = selectorFor(family, 'setItem', keyExpression);
    const tupleSelector = Object.freeze({
      ...keySelector,
      astKind: 'tuple_key' as const,
    });
    candidates.push({ selector: tupleSelector, unresolved: selectorIsUnresolved(keySelector) });
  }
  return candidates.length > 0
    ? candidates
    : [{ selector: Object.freeze({ astKind: 'array_literal' }), unresolved: true }];
}

function bindingNameContains(name: ts.BindingName, target: string): boolean {
  if (ts.isIdentifier(name)) return name.text === target;
  return name.elements.some((element) => !ts.isOmittedExpression(element)
    && bindingNameContains(element.name, target));
}

type VarBindingsByScope = ReadonlyMap<ts.Node, ReadonlySet<string>>;

function collectVarBindings(sourceFile: ts.SourceFile): VarBindingsByScope {
  const bindings = new Map<ts.Node, Set<string>>();
  const visit = (node: ts.Node, scope: ts.Node): void => {
    let activeScope = scope;
    if (node !== sourceFile && ts.isFunctionLike(node)) activeScope = node;
    if (ts.isVariableDeclarationList(node)
      && (node.flags & ts.NodeFlags.BlockScoped) === 0) {
      let names = bindings.get(activeScope);
      if (names === undefined) {
        names = new Set<string>();
        bindings.set(activeScope, names);
      }
      for (const declaration of node.declarations) {
        const collect = (binding: ts.BindingName): void => {
          if (ts.isIdentifier(binding)) names?.add(binding.text);
          else for (const element of binding.elements) {
            if (!ts.isOmittedExpression(element)) collect(element.name);
          }
        };
        collect(declaration.name);
      }
    }
    ts.forEachChild(node, (child) => visit(child, activeScope));
  };
  visit(sourceFile, sourceFile);
  return bindings;
}

function isWithin(node: ts.Node, possibleAncestor: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (current === possibleAncestor) return true;
    current = current.parent;
  }
  return false;
}

function loopBlockBindingShadows(name: string, usage: ts.Node, loop: ts.Node): boolean {
  const declarationList = ts.isForStatement(loop)
    ? loop.initializer !== undefined && ts.isVariableDeclarationList(loop.initializer)
      ? loop.initializer : null
    : ts.isForOfStatement(loop) || ts.isForInStatement(loop)
      ? ts.isVariableDeclarationList(loop.initializer) ? loop.initializer : null
      : null;
  if (declarationList === null || (declarationList.flags & ts.NodeFlags.BlockScoped) === 0
    || !declarationList.declarations.some((declaration) => bindingNameContains(declaration.name, name))) {
    return false;
  }
  return isWithin(usage, loop);
}

function declaredInFunction(
  name: string,
  node: ts.Node,
  varBindingsByScope: VarBindingsByScope,
): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if ((ts.isForStatement(current) || ts.isForOfStatement(current) || ts.isForInStatement(current))
      && loopBlockBindingShadows(name, node, current)) return true;
    if (ts.isFunctionLike(current)) {
      if (current.parameters.some((parameter) => bindingNameContains(parameter.name, name))) {
        return true;
      }
      if (varBindingsByScope.get(current)?.has(name) === true) return true;
    }
    if (ts.isCatchClause(current) && current.variableDeclaration !== undefined
      && bindingNameContains(current.variableDeclaration.name, name)) return true;
    if (ts.isBlock(current)) {
      for (const statement of current.statements) {
        if (ts.isVariableStatement(statement)
          && statement.declarationList.declarations.some((declaration) => bindingNameContains(declaration.name, name))) {
          return true;
        }
        if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
          && statement.name?.text === name) return true;
      }
    }
    if (ts.isSourceFile(current)) {
      if (varBindingsByScope.get(current)?.has(name) === true) return true;
      for (const statement of current.statements) {
        if (name === 'require'
          && ts.isImportDeclaration(statement) && statement.importClause !== undefined) {
          const clause = statement.importClause;
          if (clause.name?.text === name) return true;
          if (clause.namedBindings !== undefined) {
            if (ts.isNamespaceImport(clause.namedBindings)
              && clause.namedBindings.name.text === name) return true;
            if (ts.isNamedImports(clause.namedBindings)
              && clause.namedBindings.elements.some((element) => element.name.text === name)) return true;
          }
        }
        if (name === 'require'
          && ts.isImportEqualsDeclaration(statement) && statement.name.text === name) return true;
        if (ts.isVariableStatement(statement)
          && statement.declarationList.declarations.some((declaration) => bindingNameContains(declaration.name, name))) {
          return true;
        }
        if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
          && statement.name?.text === name) return true;
      }
      break;
    }
    current = current.parent;
  }
  return false;
}

function addImportEvidence(
  sink: AnalysisSink,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  syntax: ImportEvidence['syntax'],
  rawSpecifier: string,
  typeOnly: boolean,
  entryPaths: ReadonlySet<string>,
  policy: CensusPolicySnapshot,
): ReturnType<typeof classifySpecifier> {
  const classification = classifySpecifier(sourceFile.fileName, rawSpecifier, entryPaths, policy);
  const location = locationOf(sourceFile, node);
  if (sink.canAddEvidence(sourceFile.fileName)) {
    const importFields = {
      path: sourceFile.fileName,
      ...location,
      module: classification.module,
      moduleKind: classification.moduleKind,
      specifierSha256: sha256(rawSpecifier),
      syntax,
      typeOnly,
      family: classification.family,
    } satisfies Omit<ImportEvidence, 'evidenceId'>;
    sink.addEvidence(sourceFile.fileName, sink.imports, () => Object.freeze({
      evidenceId: evidenceId('import', importFields),
      ...importFields,
    }));
  }
  if (sink.canAddDependency(sourceFile.fileName)) {
    const dependencyFields = {
      fromPath: sourceFile.fileName,
      ...location,
      specifierKind: classification.moduleKind,
      specifier: classification.module,
      specifierSha256: sha256(rawSpecifier),
      resolvedPath: classification.resolvedPath,
      status: classification.status,
    } satisfies Omit<DependencyEvidence, 'evidenceId'>;
    sink.addDependency(sourceFile.fileName, () => Object.freeze({
      evidenceId: evidenceId('dependency', dependencyFields),
      ...dependencyFields,
    }));
  }
  if (
    classification.status === 'unresolved_in_policy'
    || classification.status === 'redacted_relative_escape'
  ) {
    sink.addGap({
      kind: 'unresolved_static_dependency',
      severity: 'hold',
      path: sourceFile.fileName,
      ...location,
      detailCode: 'missing_static_target',
    });
  }
  return classification;
}

function collectTopLevelBindings(
  sourceFile: ts.SourceFile,
  sink: AnalysisSink,
  entryPaths: ReadonlySet<string>,
  policy: CensusPolicySnapshot,
): Readonly<{
  imports: ReadonlyMap<string, Binding>;
  aliases: ReadonlyMap<string, AliasDefinition>;
  typeCandidates: ReadonlyMap<string, ReadonlyMap<string, Binding>>;
  typedContainers: ReadonlyMap<string, string>;
}> {
  const imports = new Map<string, Binding>();
  const aliases = new Map<string, AliasDefinition>();
  const typeOnlyImports = new Map<string, StorageFamily>();
  const typeCandidates = new Map<string, ReadonlyMap<string, Binding>>();
  const typedContainers = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (ts.isImportEqualsDeclaration(statement)
      && ts.isExternalModuleReference(statement.moduleReference)
      && statement.moduleReference.expression !== undefined
      && ts.isStringLiteral(statement.moduleReference.expression)) {
      const classification = addImportEvidence(
        sink,
        sourceFile,
        statement,
        'import_equals',
        statement.moduleReference.expression.text,
        statement.isTypeOnly,
        entryPaths,
        policy,
      );
      if (classification.family !== null && !statement.isTypeOnly) {
        imports.set(statement.name.text, {
          family: classification.family,
          provenance: 'global_require',
          mode: 'namespace',
        });
      }
      continue;
    }
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const typeOnly = statement.importClause?.isTypeOnly ?? false;
      const classification = addImportEvidence(
        sink,
        sourceFile,
        statement,
        'import',
        statement.moduleSpecifier.text,
        typeOnly,
        entryPaths,
        policy,
      );
      if (classification.family === null || statement.importClause === undefined) {
        if (classification.status === 'resolved_input' && statement.importClause !== undefined) {
          if (statement.importClause.name !== undefined) {
            imports.set(statement.importClause.name.text, {
              family: null,
              provenance: 'unresolved_wrapper',
              mode: 'method',
              method: 'default',
            });
          }
          const namedBindings = statement.importClause.namedBindings;
          if (namedBindings !== undefined && ts.isNamespaceImport(namedBindings)) {
            imports.set(namedBindings.name.text, {
              family: null,
              provenance: 'unresolved_wrapper',
              mode: 'namespace',
            });
          } else if (namedBindings !== undefined) {
            for (const element of namedBindings.elements) {
              imports.set(element.name.text, {
                family: null,
                provenance: 'unresolved_wrapper',
                mode: 'method',
                method: element.propertyName?.text ?? element.name.text,
              });
            }
          }
        }
        continue;
      }
      const clause = statement.importClause;
      if (typeOnly) {
        if (clause.name !== undefined) typeOnlyImports.set(clause.name.text, classification.family);
        if (clause.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            typeOnlyImports.set(element.name.text, classification.family);
          }
        }
        continue;
      }
      if (clause.name !== undefined) {
        imports.set(clause.name.text, {
          family: classification.family,
          provenance: 'runtime_import',
          mode: classification.family.startsWith('firebase_') ? 'factory' : 'namespace',
        });
      }
      if (clause.namedBindings !== undefined) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          imports.set(clause.namedBindings.name.text, {
            family: classification.family,
            provenance: 'runtime_import',
            mode: 'namespace',
          });
        } else {
          for (const element of clause.namedBindings.elements) {
            if (element.isTypeOnly) continue;
            imports.set(element.name.text, {
              family: classification.family,
              provenance: 'runtime_import',
              mode: 'method',
              method: element.propertyName?.text ?? element.name.text,
            });
          }
        }
      }
      continue;
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined
      && ts.isStringLiteral(statement.moduleSpecifier)) {
      addImportEvidence(
        sink,
        sourceFile,
        statement,
        'reexport',
        statement.moduleSpecifier.text,
        statement.isTypeOnly,
        entryPaths,
        policy,
      );
      sink.addGap({
        kind: 'unresolved_reexport',
        severity: 'hold',
        path: sourceFile.fileName,
        ...locationOf(sourceFile, statement),
        detailCode: 'unsupported_reexport',
      });
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    if (!isConst) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer === undefined) continue;
      if (ts.isIdentifier(declaration.name)) {
        aliases.set(declaration.name.text, { initializer: declaration.initializer });
      } else if (ts.isObjectBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const property = element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
            ? element.propertyName.text
            : element.name.text;
          aliases.set(element.name.text, { initializer: declaration.initializer, property });
        }
      }
    }
  }

  const candidateForPick = (typeNode: ts.TypeNode): Binding | null => {
    if (!ts.isTypeReferenceNode(typeNode)
      || !ts.isIdentifier(typeNode.typeName)
      || typeNode.typeName.text !== 'Pick'
      || typeNode.typeArguments?.length !== 2) return null;
    const owner = typeNode.typeArguments[0];
    const selected = typeNode.typeArguments[1];
    if (!ts.isTypeQueryNode(owner) || !ts.isIdentifier(owner.exprName)
      || !ts.isLiteralTypeNode(selected) || !ts.isStringLiteral(selected.literal)) return null;
    const family = typeOnlyImports.get(owner.exprName.text);
    return family === undefined ? null : {
      family,
      provenance: 'type_injected_candidate',
      mode: 'method',
      method: selected.literal.text,
    };
  };
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement)) continue;
    const properties = new Map<string, Binding>();
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || member.type === undefined || member.name === undefined) continue;
      const propertyName = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
        ? member.name.text
        : null;
      const candidate = candidateForPick(member.type);
      if (propertyName !== null && candidate !== null) properties.set(propertyName, candidate);
    }
    if (properties.size > 0) typeCandidates.set(statement.name.text, properties);
  }
  const collectTypedContainers = (node: ts.Node): void => {
    if ((ts.isParameter(node) || ts.isVariableDeclaration(node))
      && ts.isIdentifier(node.name)
      && node.type !== undefined
      && ts.isTypeReferenceNode(node.type)
      && ts.isIdentifier(node.type.typeName)
      && typeCandidates.has(node.type.typeName.text)) {
      typedContainers.set(node.name.text, node.type.typeName.text);
    }
    ts.forEachChild(node, collectTypedContainers);
  };
  collectTypedContainers(sourceFile);
  return { imports, aliases, typeCandidates, typedContainers };
}

function analyzeAstEntry(
  entry: CensusSourceEntry,
  text: string,
  entryPaths: ReadonlySet<string>,
  policy: CensusPolicySnapshot,
  sink: AnalysisSink,
): boolean {
  const scriptKind = entry.path.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : entry.path.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : entry.path.endsWith('.js') || entry.path.endsWith('.mjs') || entry.path.endsWith('.cjs')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(entry.path, text, ts.ScriptTarget.ES2022, true, scriptKind);
  const diagnostics = (sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
  }).parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) {
      const position = diagnostic.start ?? 0;
      const location = sourceFile.getLineAndCharacterOfPosition(position);
      sink.addGap({
        kind: 'parse_diagnostic',
        severity: 'hold',
        path: entry.path,
        line: location.line + 1,
        column: location.character + 1,
        diagnosticCode: diagnostic.code,
      });
    }
    return false;
  }

  const bindings = collectTopLevelBindings(sourceFile, sink, entryPaths, policy);
  const varBindingsByScope = collectVarBindings(sourceFile);
  const cycleKeys = new Set<string>();
  const findVisibleAlias = (name: string, usage: ts.Node): AliasDefinition | null => {
    let current: ts.Node | undefined = usage.parent;
    while (current !== undefined && !ts.isSourceFile(current)) {
      if (ts.isBlock(current)) {
        for (const statement of current.statements) {
          if (!ts.isVariableStatement(statement)
            || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) continue;
          for (const declaration of statement.declarationList.declarations) {
            if (declaration.initializer === undefined) continue;
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
              return { initializer: declaration.initializer };
            }
            if (ts.isObjectBindingPattern(declaration.name)) {
              for (const element of declaration.name.elements) {
                if (!ts.isIdentifier(element.name) || element.name.text !== name) continue;
                const property = element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
                  ? element.propertyName.text
                  : element.name.text;
                return { initializer: declaration.initializer, property };
              }
            }
          }
        }
      }
      current = current.parent;
    }
    return null;
  };
  const findAnnotatedCandidate = (name: string, usage: ts.Node): Binding | null => {
    let current: ts.Node | undefined = usage.parent;
    while (current !== undefined) {
      if (ts.isFunctionLike(current)) {
        for (const parameter of current.parameters) {
          if (ts.isIdentifier(parameter.name) && parameter.name.text === name) {
            return directImportTypeBinding(parameter.type);
          }
        }
      }
      if (ts.isBlock(current) || ts.isSourceFile(current)) {
        for (const statement of current.statements) {
          if (!ts.isVariableStatement(statement)) continue;
          for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
              return directImportTypeBinding(declaration.type);
            }
          }
        }
      }
      current = current.parent;
    }
    return null;
  };
  type NearestLoopScopedBinding =
    | Readonly<{ kind: 'alias'; alias: AliasDefinition }>
    | Readonly<{ kind: 'annotation'; binding: Binding }>
    | Readonly<{ kind: 'shadow' }>
    | Readonly<{ kind: 'none' }>;
  const findNearestBeforeLoopBoundary = (
    name: string,
    usage: ts.Node,
  ): NearestLoopScopedBinding => {
    let current: ts.Node | undefined = usage.parent;
    while (current !== undefined && !ts.isSourceFile(current)) {
      if (ts.isFunctionLike(current)) {
        for (const parameter of current.parameters) {
          if (!bindingNameContains(parameter.name, name)) continue;
          const binding = directImportTypeBinding(parameter.type);
          return binding === null
            ? { kind: 'shadow' }
            : { kind: 'annotation', binding };
        }
      }
      if (ts.isCatchClause(current) && current.variableDeclaration !== undefined
        && bindingNameContains(current.variableDeclaration.name, name)) {
        return { kind: 'shadow' };
      }
      if (ts.isBlock(current)) {
        for (const statement of current.statements) {
          if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
              if (!bindingNameContains(declaration.name, name)) continue;
              if (usage.getStart() <= declaration.end) return { kind: 'shadow' };
              const binding = directImportTypeBinding(declaration.type);
              if (binding !== null) return { kind: 'annotation', binding };
              if ((statement.declarationList.flags & ts.NodeFlags.Const) !== 0
                && declaration.initializer !== undefined) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                  return { kind: 'alias', alias: { initializer: declaration.initializer } };
                }
                if (ts.isObjectBindingPattern(declaration.name)) {
                  for (const element of declaration.name.elements) {
                    if (!ts.isIdentifier(element.name) || element.name.text !== name) continue;
                    const property = element.propertyName !== undefined
                      && ts.isIdentifier(element.propertyName)
                      ? element.propertyName.text
                      : element.name.text;
                    return {
                      kind: 'alias',
                      alias: { initializer: declaration.initializer, property },
                    };
                  }
                }
              }
              return { kind: 'shadow' };
            }
          }
          if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
            && statement.name?.text === name) return { kind: 'shadow' };
        }
      }
      if ((ts.isForStatement(current) || ts.isForOfStatement(current)
          || ts.isForInStatement(current))
        && loopBlockBindingShadows(name, usage, current)) return { kind: 'shadow' };
      current = current.parent;
    }
    return { kind: 'none' };
  };
  const resolveBinding = (
    name: string,
    usage: ts.Node,
    stack: readonly string[] = [],
  ): Binding | null => {
    const nearest = findNearestBeforeLoopBoundary(name, usage);
    if (nearest.kind === 'shadow') return null;
    if (nearest.kind === 'annotation') return nearest.binding;
    const visibleAlias = nearest.kind === 'alias'
      ? nearest.alias
      : findVisibleAlias(name, usage);
    const topLevelAlias = bindings.aliases.get(name);
    const alias = visibleAlias ?? topLevelAlias;
    const annotatedCandidate = nearest.kind === 'alias'
      ? null
      : findAnnotatedCandidate(name, usage);
    if (annotatedCandidate !== null) return annotatedCandidate;
    if (alias === undefined && declaredInFunction(name, usage, varBindingsByScope)) return null;
    if (alias === undefined) {
      const imported = bindings.imports.get(name);
      if (imported !== undefined) return imported;
    }
    if (alias === undefined) return null;
    const cycleIndex = stack.indexOf(name);
    if (cycleIndex >= 0) {
      const cycle = sortedUnique([...stack.slice(cycleIndex), name]);
      const cycleKey = cycle.join('|');
      if (!cycleKeys.has(cycleKey)) {
        cycleKeys.add(cycleKey);
        sink.addGap({
          kind: 'alias_cycle',
          severity: 'hold',
          path: entry.path,
          detailCode: 'alias_cycle',
        });
      }
      return null;
    }
    const nextStack = [...stack, name];
    let resolved: Binding | null = null;
    if (ts.isIdentifier(alias.initializer)) {
      resolved = resolveBinding(alias.initializer.text, alias.initializer, nextStack);
    } else if (
      ts.isAwaitExpression(alias.initializer)
      && ts.isCallExpression(alias.initializer.expression)
      && alias.initializer.expression.expression.kind === ts.SyntaxKind.ImportKeyword
      && alias.initializer.expression.arguments.length === 1
      && ts.isStringLiteral(alias.initializer.expression.arguments[0])
    ) {
      const classification = classifySpecifier(
        entry.path,
        alias.initializer.expression.arguments[0].text,
        entryPaths,
        policy,
      );
      if (classification.family !== null) {
        resolved = {
          family: classification.family,
          provenance: 'dynamic_import_literal',
          mode: 'namespace',
        };
      }
    } else if (
      ts.isCallExpression(alias.initializer)
      && ts.isIdentifier(alias.initializer.expression)
      && alias.initializer.expression.text === 'require'
      && !declaredInFunction('require', alias.initializer, varBindingsByScope)
      && alias.initializer.arguments.length === 1
      && ts.isStringLiteral(alias.initializer.arguments[0])
    ) {
      const rawSpecifier = alias.initializer.arguments[0].text;
      const classification = classifySpecifier(entry.path, rawSpecifier, entryPaths, policy);
      if (classification.family !== null) {
        resolved = {
          family: classification.family,
          provenance: 'global_require',
          mode: 'namespace',
        };
      }
    } else if (
      ts.isCallExpression(alias.initializer)
      && ts.isIdentifier(alias.initializer.expression)
      && alias.initializer.arguments.length === 0
    ) {
      const factory = resolveBinding(alias.initializer.expression.text, alias.initializer.expression, nextStack);
      if (factory?.mode === 'factory') {
        resolved = {
          family: factory.family,
          provenance: 'const_alias',
          mode: 'namespace',
        };
      }
    } else if (ts.isPropertyAccessExpression(alias.initializer)) {
      const base = ts.isIdentifier(alias.initializer.expression)
        ? resolveBinding(alias.initializer.expression.text, alias.initializer, nextStack)
        : null;
      if (base !== null) {
        resolved = {
          family: base.family,
          provenance: 'const_alias',
          mode: 'method',
          method: alias.initializer.name.text,
        };
      }
    }
    if (resolved !== null && alias.property !== undefined) {
      if (alias.property === 'default' && resolved.mode === 'namespace') {
        return { ...resolved, provenance: 'dynamic_import_literal' };
      }
      return {
        family: resolved.family,
        provenance: 'destructured_method',
        mode: 'method',
        method: alias.property,
      };
    }
    if (resolved === null) return null;
    return resolved.provenance === 'global_require'
      ? resolved
      : { ...resolved, provenance: resolved.mode === 'method' ? resolved.provenance : 'const_alias' };
  };

  const seenRequirePositions = new Set<number>();
  const seenDynamicImportPositions = new Set<number>();
  const resolveTypeCandidate = (receiver: ts.Expression): Binding | null => {
    if (!ts.isPropertyAccessExpression(receiver) || !ts.isIdentifier(receiver.expression)) return null;
    const interfaceName = bindings.typedContainers.get(receiver.expression.text);
    if (interfaceName === undefined) return null;
    return bindings.typeCandidates.get(interfaceName)?.get(receiver.name.text) ?? null;
  };
  const resolveDynamicReceiver = (receiver: ts.Expression): Binding | null => {
    const findAwaitedImport = (expression: ts.Expression, awaited = false): ts.CallExpression | null => {
      if (ts.isParenthesizedExpression(expression)) {
        return findAwaitedImport(expression.expression, awaited);
      }
      if (ts.isAwaitExpression(expression)) {
        return findAwaitedImport(expression.expression, true);
      }
      if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'default') {
        return findAwaitedImport(expression.expression, awaited);
      }
      return awaited && ts.isCallExpression(expression)
        && expression.expression.kind === ts.SyntaxKind.ImportKeyword
        ? expression
        : null;
    };
    const dynamicCall = findAwaitedImport(receiver);
    if (dynamicCall === null
      || dynamicCall.expression.kind !== ts.SyntaxKind.ImportKeyword
      || dynamicCall.arguments.length !== 1
      || !ts.isStringLiteral(dynamicCall.arguments[0])) return null;
    const classification = classifySpecifier(entry.path, dynamicCall.arguments[0].text, entryPaths, policy);
    return classification.family === null ? null : {
      family: classification.family,
      provenance: 'dynamic_import_literal',
      mode: 'namespace',
    };
  };
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'require'
      && !declaredInFunction('require', node, varBindingsByScope)
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
      && !seenRequirePositions.has(node.getStart(sourceFile))
    ) {
      seenRequirePositions.add(node.getStart(sourceFile));
      addImportEvidence(
        sink,
        sourceFile,
        node,
        'require',
        node.arguments[0].text,
        false,
        entryPaths,
        policy,
      );
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && !seenDynamicImportPositions.has(node.getStart(sourceFile))
    ) {
      seenDynamicImportPositions.add(node.getStart(sourceFile));
      if (node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
        addImportEvidence(
          sink,
          sourceFile,
          node,
          'dynamic_import',
          node.arguments[0].text,
          false,
          entryPaths,
          policy,
        );
      } else {
        const location = locationOf(sourceFile, node);
        const includeImport = sink.canAddEvidence(entry.path);
        const includeDependency = sink.canAddDependency(entry.path);
        const markerHash = includeImport || includeDependency
          ? sha256('nonliteral_dynamic_import')
          : null;
        if (includeImport && markerHash !== null) {
          const importFields = {
            path: entry.path,
            ...location,
            module: null,
            moduleKind: 'dynamic' as const,
            specifierSha256: markerHash,
            syntax: 'dynamic_import' as const,
            typeOnly: false,
            family: null,
          };
          sink.addEvidence(entry.path, sink.imports, () => Object.freeze({
            evidenceId: evidenceId('import', importFields),
            ...importFields,
          }));
        }
        if (includeDependency && markerHash !== null) {
          const dependencyFields = {
            fromPath: entry.path,
            ...location,
            specifierKind: 'dynamic' as const,
            specifier: null,
            specifierSha256: markerHash,
            resolvedPath: null,
            status: 'nonliteral_dynamic' as const,
          };
          sink.addDependency(entry.path, () => Object.freeze({
            evidenceId: evidenceId('dependency', dependencyFields),
            ...dependencyFields,
          }));
        }
        sink.addGap({
          kind: 'unresolved_dynamic_import',
          severity: 'hold',
          path: entry.path,
          ...location,
          detailCode: 'nonliteral_dynamic_import',
        });
      }
    }
    if (ts.isCallExpression(node)) {
      let binding: Binding | null = null;
      let operation: string | null = null;
      if (ts.isIdentifier(node.expression)) {
        const candidate = resolveBinding(node.expression.text, node.expression);
        if (candidate?.mode === 'method') {
          binding = candidate;
          operation = candidate.method ?? node.expression.text;
        }
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        operation = node.expression.name.text;
        const receiver = node.expression.expression;
        if (ts.isIdentifier(receiver)) {
          const candidate = resolveBinding(receiver.text, receiver);
          if (candidate !== null && candidate.mode !== 'method') binding = candidate;
        } else if (ts.isPropertyAccessExpression(receiver)) {
          const typedCandidate = resolveTypeCandidate(receiver);
          if (typedCandidate !== null && typedCandidate.method === operation) {
            binding = typedCandidate;
          } else if (receiver.name.text === 'default' && ts.isIdentifier(receiver.expression)) {
            const candidate = resolveBinding(receiver.expression.text, receiver.expression);
            if (candidate !== null && candidate.mode !== 'method') binding = candidate;
          } else {
            binding = resolveDynamicReceiver(receiver);
          }
        } else if (
          ts.isCallExpression(receiver)
          && ts.isIdentifier(receiver.expression)
          && receiver.arguments.length === 0
        ) {
          const candidate = resolveBinding(receiver.expression.text, receiver.expression);
          if (candidate?.mode === 'factory') binding = candidate;
        } else {
          binding = resolveDynamicReceiver(receiver);
        }
      } else if (ts.isElementAccessExpression(node.expression)) {
        const receiver = node.expression.expression;
        if (ts.isIdentifier(receiver)) {
          const candidate = resolveBinding(receiver.text, receiver);
          if (candidate !== null && candidate.mode !== 'method') {
            binding = candidate;
            operation = '<computed>';
          }
        }
      }
      if (
        operation !== null
        && operation !== 'require'
        && (binding !== null || UNBOUND_STORAGE_METHODS.has(operation))
      ) {
        const location = locationOf(sourceFile, node);
        const family = binding?.family ?? null;
        for (const candidate of selectorCandidatesFor(family, operation, node.arguments[0])) {
          const operationFields = {
            path: entry.path,
            ...location,
            family,
            operation,
            provenance: binding?.provenance ?? 'unbound_method_name_candidate',
            selector: candidate.selector,
            confidence: operation === '<computed>'
              ? 'unresolved'
              : binding?.provenance === 'type_injected_candidate'
              ? 'type_candidate'
              : binding === null || candidate.unresolved
              ? 'unresolved'
              : 'confirmed_receiver',
          } satisfies Omit<StorageOperationEvidence, 'evidenceId'>;
          sink.addEvidence(entry.path, sink.operations, () => Object.freeze({
              evidenceId: evidenceId('operation', operationFields),
              ...operationFields,
            }));
          if (binding !== null && candidate.unresolved) {
            sink.addGap({
              kind: 'dynamic_selector',
              severity: 'hold',
              path: entry.path,
              ...location,
              detailCode: 'dynamic_selector',
            });
          }
          if (binding?.provenance === 'unresolved_wrapper') {
            sink.addGap({
              kind: 'unresolved_wrapper',
              severity: 'hold',
              path: entry.path,
              ...location,
              detailCode: 'unsupported_wrapper',
            });
          }
          if (operation === '<computed>') {
            sink.addGap({
              kind: 'dynamic_receiver',
              severity: 'hold',
              path: entry.path,
              ...location,
              detailCode: 'computed_receiver',
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const aliasName of bindings.aliases.keys()) resolveBinding(aliasName, sourceFile);
  return true;
}

function analyzeNativeText(
  entry: CensusSourceEntry,
  text: string,
  target: NativeCandidateEvidence[],
  sink: AnalysisSink,
): void {
  for (const rule of NATIVE_TOKEN_RULES) {
    if (!sink.isEvidenceOpen(entry.path)) return;
    rule.pattern.lastIndex = 0;
    let scannedTo = 0;
    let line = 1;
    let lineStart = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text)) !== null) {
      if (!sink.canAddEvidence(entry.path)) return;
      for (let index = scannedTo; index < match.index; index += 1) {
        if (text.charCodeAt(index) === 0x0a) {
          line += 1;
          lineStart = index + 1;
        }
      }
      scannedTo = match.index + match[0].length;
      const column = match.index - lineStart + 1;
      const fields = {
        path: entry.path,
        line,
        category: rule.category,
        tokenId: rule.tokenId,
        provenance: 'native_text_candidate_unverified' as const,
      };
      sink.addEvidence(entry.path, target, () => Object.freeze({
          evidenceId: evidenceId('native_candidate', { ...fields, column }),
          ...fields,
        }));
      if (match[0].length === 0) rule.pattern.lastIndex += 1;
    }
  }
}

function parseRegistryRows(
  text: string,
  addGap: AnalysisSink['addGap'],
  maxRows: number,
): readonly RegistryPolicyRow[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    addGap({
      kind: 'invalid_auxiliary_input',
      severity: 'incomplete',
      path: 'config/phone-state-legacy-inventory.v1.json',
      detailCode: 'registry_json_invalid',
    });
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return invalidRegistry(addGap);
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== 'phone-state-legacy-inventory.v1'
    || !Array.isArray(record.rows) || !Array.isArray(record.prefixRules)) {
    return invalidRegistry(addGap);
  }
  if (record.rows.length + record.prefixRules.length > maxRows) {
    addGap({
      kind: 'bound_exceeded',
      severity: 'incomplete',
      path: 'config/phone-state-legacy-inventory.v1.json',
      detailCode: 'max_evidence_per_file',
    });
    return null;
  }
  const result: RegistryPolicyRow[] = [];
  const consume = (rows: readonly unknown[], rowKind: RegistryPolicyRow['rowKind']): boolean => {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const value = rows[rowIndex];
      if (typeof value !== 'object' || value === null) return false;
      const row = value as Record<string, unknown>;
      const pattern = rowKind === 'literal' ? row.key : row.prefix;
      if (typeof pattern !== 'string' || pattern.length === 0
        || typeof row.domain !== 'string' || typeof row.scope !== 'string'
        || typeof row.reducer !== 'string' || !Array.isArray(row.importSource)
        || !row.importSource.every((item) => typeof item === 'string')
        || typeof row.legacyMirror !== 'boolean' || typeof row.sensitivity !== 'string') {
        return false;
      }
      result.push(Object.freeze({
        pattern,
        rowKind,
        rowIndex,
        domain: row.domain,
        scope: row.scope,
        reducer: row.reducer,
        importSources: Object.freeze([...row.importSource] as string[]),
        legacyMirror: row.legacyMirror,
        sensitivity: row.sensitivity,
      }));
    }
    return true;
  };
  if (!consume(record.rows, 'literal') || !consume(record.prefixRules, 'prefix')) {
    return invalidRegistry(addGap);
  }
  return result;
}

function invalidRegistry(addGap: AnalysisSink['addGap']): null {
  addGap({
    kind: 'invalid_auxiliary_input',
    severity: 'incomplete',
    path: 'config/phone-state-legacy-inventory.v1.json',
    detailCode: 'registry_schema_invalid',
  });
  return null;
}

function addPolicyHints(
  operations: readonly StorageOperationEvidence[],
  rows: readonly RegistryPolicyRow[],
  hints: PolicyHintEvidence[],
  sink: AnalysisSink,
): void {
  for (const operation of operations) {
    if (operation.family !== 'async_storage' || operation.selector.literalValue === undefined) continue;
    const selector = operation.selector.literalValue;
    const matches = rows.filter((row) => row.rowKind === 'literal'
      ? row.pattern === selector
      : selector.startsWith(row.pattern));
    if (matches.length > 1) {
      sink.addGap({
        kind: 'ambiguous_policy_hint',
        severity: 'hold',
        path: operation.path,
        line: operation.line,
        column: operation.column,
        detailCode: 'registry_multiple_matches',
      });
      continue;
    }
    const row = matches[0];
    if (row === undefined) continue;
    const fields = {
      operationEvidenceId: operation.evidenceId,
      registryRowKind: row.rowKind,
      registryRowIndex: row.rowIndex,
      matchedPattern: row.pattern,
      domain: row.domain,
      scope: row.scope,
      reducer: row.reducer,
      importSources: row.importSources,
      legacyMirror: row.legacyMirror,
      sensitivity: row.sensitivity,
      claim: 'policy_hint_not_owner_proof' as const,
    };
    sink.addEvidence(operation.path, hints, () => Object.freeze({
        evidenceId: evidenceId('policy_hint', fields),
        ...fields,
      }));
  }
}

function isRuntimeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateScanInputContainers(rawInput: unknown): Readonly<{
  entries: readonly CensusSourceEntry[];
  auxiliaryInputs: readonly CensusAuxiliaryInput[];
  collection: CensusCollectionMetadata;
}> {
  if (!isRuntimeObject(rawInput)
    || !hasExactOwnKeys(rawInput, ['entries', 'auxiliaryInputs', 'collection'], [
      'entries', 'auxiliaryInputs', 'collection',
    ])
    || !Array.isArray(rawInput.entries)
    || !Array.isArray(rawInput.auxiliaryInputs)
    || !isRuntimeObject(rawInput.collection)) {
    throw new AccountStorageCensusInputError('invalid_port_result');
  }
  const collection = rawInput.collection;
  if (!hasExactOwnKeys(
    collection,
    ['effectivePolicy', 'roots', 'unavailableInputs', 'gaps', 'enumerationComplete'],
    ['effectivePolicy', 'roots', 'unavailableInputs', 'gaps', 'enumerationComplete'],
  )
    || !isRuntimeObject(collection.effectivePolicy)
    || !Array.isArray(collection.roots)
    || !Array.isArray(collection.unavailableInputs)
    || !Array.isArray(collection.gaps)
    || typeof collection.enumerationComplete !== 'boolean') {
    throw new AccountStorageCensusInputError('invalid_port_result');
  }
  const policy = collection.effectivePolicy;
  const policyArrayKeys = [
    'requiredRoots', 'optionalRoots', 'auxiliaryInputs', 'astExtensions',
    'nativeTextExtensions', 'excludedPathSegments',
  ] as const;
  if (!hasExactOwnKeys(
    policy,
    [...policyArrayKeys, 'includeDirectRootAstFiles', 'bounds'],
    [...policyArrayKeys, 'includeDirectRootAstFiles', 'bounds'],
  )
    || policy.includeDirectRootAstFiles !== true
    || !isRuntimeObject(policy.bounds)
    || !hasExactOwnKeys(policy.bounds, BOUND_KEYS, BOUND_KEYS)
    || policyArrayKeys.some((key) => !Array.isArray(policy[key])
      || !(policy[key] as unknown[]).every((value) => typeof value === 'string'))) {
    throw new AccountStorageCensusInputError('invalid_port_result');
  }
  return rawInput as unknown as Readonly<{
    entries: readonly CensusSourceEntry[];
    auxiliaryInputs: readonly CensusAuxiliaryInput[];
    collection: CensusCollectionMetadata;
  }>;
}

function deepFreezePlain<T>(value: T, seen = new Set<unknown>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  if (value instanceof Uint8Array) return value;
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezePlain(child, seen);
  }
  return Object.freeze(value);
}

export function scanAccountStorageEntries(rawInput: Readonly<{
  entries: readonly CensusSourceEntry[];
  auxiliaryInputs: readonly CensusAuxiliaryInput[];
  collection: CensusCollectionMetadata;
}>): AccountStorageCensusReport {
  const container = validateScanInputContainers(rawInput);
  const policy = normalizeCensusPolicy(container.collection.effectivePolicy);
  const inputCount = container.entries.length
    + container.auxiliaryInputs.length
    + container.collection.unavailableInputs.length;
  if (inputCount > policy.bounds.maxFiles
    || container.collection.gaps.length > policy.bounds.maxGaps) {
    throw new AccountStorageCensusInputError('invalid_port_result');
  }
  if (![...container.entries, ...container.auxiliaryInputs].every(isRuntimeObject)
    || !container.collection.roots.every(isRuntimeObject)
    || !container.collection.unavailableInputs.every(isRuntimeObject)
    || !container.collection.gaps.every(isRuntimeObject)) {
    throw new AccountStorageCensusInputError('invalid_port_result');
  }
  let capturedBytes = 0;
  const captureBytes = (value: unknown): Uint8Array => {
    if (!(value instanceof Uint8Array)
      || value.byteLength > policy.bounds.maxBytesPerFile
      || capturedBytes + value.byteLength > policy.bounds.maxTotalBytes) {
      throw new AccountStorageCensusInputError('invalid_port_result');
    }
    capturedBytes += value.byteLength;
    return value;
  };
  const capturedEntries = container.entries.map((entry) => ({
    entry,
    bytes: captureBytes(entry.bytes as unknown),
  }));
  const capturedAuxiliaryInputs = container.auxiliaryInputs.map((auxiliary) => ({
    auxiliary,
    bytes: captureBytes(auxiliary.bytes as unknown),
  }));
  const entries = capturedEntries.map(({ entry, bytes }) => {
    return {
      path: entry.path,
      root: entry.root,
      kind: entry.kind,
      bytes: new Uint8Array(bytes),
    } satisfies CensusSourceEntry;
  }).sort((left, right) => ordinalCompare(left.path, right.path));
  const snapshotAuxiliaryInputs = capturedAuxiliaryInputs.map(({ auxiliary, bytes }) => {
    return {
      path: auxiliary.path,
      bytes: new Uint8Array(bytes),
    } satisfies CensusAuxiliaryInput;
  }).sort((left, right) => ordinalCompare(left.path, right.path));
  const input = { entries, auxiliaryInputs: snapshotAuxiliaryInputs, collection: container.collection };
  validateInputs(input, policy);
  const gaps: CensusGap[] = [];
  const files: InputFingerprint[] = input.collection.unavailableInputs.map(cloneFingerprint);
  const imports: ImportEvidence[] = [];
  const dependencies: DependencyEvidence[] = [];
  const operations: StorageOperationEvidence[] = [];
  const nativeCandidates: NativeCandidateEvidence[] = [];
  const policyHints: PolicyHintEvidence[] = [];
  const gapIds = new Set<string>();
  let gapBudgetExhausted = false;
  const maxGapsSentinel = makeGap({
    kind: 'bound_exceeded',
    severity: 'incomplete',
    detailCode: 'max_gaps',
  });
  const addGap: AnalysisSink['addGap'] = (rawGap) => {
    if (gapBudgetExhausted) return;
    const gap = makeGap(rawGap);
    if (gapIds.has(gap.gapId)) return;
    if (gap.gapId === maxGapsSentinel.gapId) {
      gaps.push(gap);
      gapIds.add(gap.gapId);
      if (gaps.length >= policy.bounds.maxGaps) gapBudgetExhausted = true;
      return;
    }
    if (gapIds.has(maxGapsSentinel.gapId)) {
      if (gaps.length < policy.bounds.maxGaps) {
        gaps.push(gap);
        gapIds.add(gap.gapId);
      }
      if (gaps.length >= policy.bounds.maxGaps) gapBudgetExhausted = true;
      return;
    }
    if (gaps.length >= policy.bounds.maxGaps - 1) {
      gaps.push(maxGapsSentinel);
      gapIds.add(maxGapsSentinel.gapId);
      gapBudgetExhausted = true;
      return;
    }
    gaps.push(gap);
    gapIds.add(gap.gapId);
  };
  for (const gap of input.collection.gaps.map(makeGap).sort(compareGaps)) addGap(gap);
  if (gapIds.has(maxGapsSentinel.gapId)) gapBudgetExhausted = true;
  const evidenceCounts = new Map<string, number>();
  const stoppedEvidencePaths = new Set<string>();
  const dependencyCounts = new Map<string, number>();
  const stoppedDependencyPaths = new Set<string>();
  const isEvidenceOpen: AnalysisSink['isEvidenceOpen'] = (inputPath) => (
    !gapBudgetExhausted && !stoppedEvidencePaths.has(inputPath)
  );
  const canAddEvidence: AnalysisSink['canAddEvidence'] = (inputPath) => {
    if (gapBudgetExhausted) return false;
    if (stoppedEvidencePaths.has(inputPath)) return false;
    const count = evidenceCounts.get(inputPath) ?? 0;
    if (count >= policy.bounds.maxEvidencePerFile) {
      stoppedEvidencePaths.add(inputPath);
      addGap({
        kind: 'bound_exceeded',
        severity: 'incomplete',
        path: inputPath,
        detailCode: 'max_evidence_per_file',
      });
      return false;
    }
    return true;
  };
  const addEvidence: AnalysisSink['addEvidence'] = (inputPath, target, build) => {
    if (!canAddEvidence(inputPath)) return;
    const count = evidenceCounts.get(inputPath) ?? 0;
    target.push(build());
    evidenceCounts.set(inputPath, count + 1);
  };
  const canAddDependency: AnalysisSink['canAddDependency'] = (inputPath) => {
    if (gapBudgetExhausted) return false;
    if (stoppedDependencyPaths.has(inputPath)) return false;
    const count = dependencyCounts.get(inputPath) ?? 0;
    if (count >= policy.bounds.maxDependencyEdgesPerFile) {
      stoppedDependencyPaths.add(inputPath);
      addGap({
        kind: 'bound_exceeded',
        severity: 'incomplete',
        path: inputPath,
        detailCode: 'max_dependency_edges_per_file',
      });
      return false;
    }
    return true;
  };
  const addDependency: AnalysisSink['addDependency'] = (inputPath, build) => {
    if (!canAddDependency(inputPath)) return;
    const count = dependencyCounts.get(inputPath) ?? 0;
    dependencies.push(build());
    dependencyCounts.set(inputPath, count + 1);
  };
  const sink: AnalysisSink = {
    imports,
    dependencies,
    operations,
    gaps,
    addGap,
    canAddEvidence,
    isEvidenceOpen,
    canAddDependency,
    addEvidence,
    addDependency,
  };
  const entryPaths = new Set(input.entries.map((entry) => entry.path));
  const decoder = new TextDecoder('utf-8', { fatal: true });

  for (const entry of input.entries) {
    let readStatus: InputFingerprint['readStatus'] = 'read';
    let parseStatus: InputFingerprint['parseStatus'] =
      entry.kind === 'js_ts_ast' ? 'parsed' : 'not_applicable';
    let decodedText: string | null = null;
    try {
      decodedText = decoder.decode(entry.bytes);
    } catch {
      readStatus = 'invalid_utf8';
      parseStatus = 'not_applicable';
      sink.addGap({
        kind: 'invalid_utf8',
        severity: 'incomplete',
        path: entry.path,
        detailCode: 'invalid_utf8',
      });
    }
    if (decodedText !== null && entry.kind === 'js_ts_ast') {
      parseStatus = analyzeAstEntry(entry, decodedText, entryPaths, policy, sink)
        ? 'parsed'
        : 'parse_diagnostic';
    } else if (decodedText !== null && entry.kind === 'native_text') {
      analyzeNativeText(entry, decodedText, nativeCandidates, sink);
    }
    files.push(Object.freeze({
      path: entry.path,
      root: entry.root,
      kind: entry.kind,
      classification: entry.root === '.' ? 'root_tooling_unclassified' : 'source_root',
      bytes: entry.bytes.byteLength,
      sha256: sha256(entry.bytes),
      readStatus,
      parseStatus,
    }));
  }

  let registryRows: readonly RegistryPolicyRow[] | null = null;
  for (const auxiliary of input.auxiliaryInputs) {
    let readStatus: InputFingerprint['readStatus'] = 'read';
    let decodedRegistry: string | null = null;
    try {
      decodedRegistry = decoder.decode(auxiliary.bytes);
    } catch {
      readStatus = 'invalid_utf8';
      sink.addGap({
        kind: 'invalid_utf8',
        severity: 'incomplete',
        path: auxiliary.path,
        detailCode: 'invalid_utf8',
      });
    }
    if (decodedRegistry !== null) {
      registryRows = parseRegistryRows(decodedRegistry, sink.addGap, policy.bounds.maxEvidencePerFile);
    }
    files.push(Object.freeze({
      path: auxiliary.path,
      root: null,
      kind: 'policy_registry_input',
      classification: 'policy_registry_input',
      bytes: auxiliary.bytes.byteLength,
      sha256: sha256(auxiliary.bytes),
      readStatus,
      parseStatus: 'not_applicable',
    }));
  }

  if (registryRows !== null) addPolicyHints(operations, registryRows, policyHints, sink);

  const dedupeEvidence = <T extends { evidenceId: string }>(rows: T[]): void => {
    const seen = new Set<string>();
    const unique = rows.filter((row) => {
      if (seen.has(row.evidenceId)) return false;
      seen.add(row.evidenceId);
      return true;
    });
    rows.splice(0, rows.length, ...unique);
  };
  dedupeEvidence(imports);
  dedupeEvidence(dependencies);
  dedupeEvidence(operations);
  dedupeEvidence(nativeCandidates);
  dedupeEvidence(policyHints);

  files.sort((left, right) => ordinalCompare(left.path, right.path));
  gaps.sort(compareGaps);
  imports.sort((left, right) => ordinalCompare(left.path, right.path)
    || left.line - right.line
    || left.column - right.column
    || ordinalCompare(left.evidenceId, right.evidenceId));
  dependencies.sort((left, right) => ordinalCompare(left.fromPath, right.fromPath)
    || left.line - right.line
    || left.column - right.column
    || ordinalCompare(left.evidenceId, right.evidenceId));
  operations.sort((left, right) => ordinalCompare(left.path, right.path)
    || left.line - right.line
    || left.column - right.column
    || ordinalCompare(left.evidenceId, right.evidenceId));
  nativeCandidates.sort((left, right) => ordinalCompare(left.path, right.path)
    || left.line - right.line
    || ordinalCompare(left.evidenceId, right.evidenceId));
  policyHints.sort((left, right) => ordinalCompare(left.operationEvidenceId, right.operationEvidenceId)
    || ordinalCompare(left.evidenceId, right.evidenceId));
  const roots = input.collection.roots
    .map((root) => Object.freeze({
      path: root.path,
      requirement: root.requirement,
      status: root.status,
      fileCount: root.fileCount,
    }))
    .sort((left, right) => ordinalCompare(left.path, right.path));
  const auxiliaryInputs = files.filter((file) => file.kind === 'policy_registry_input');
  const report: AccountStorageCensusReport = {
    schemaVersion: 'accounts-v2-storage-census.v1',
    scannerVersion: 1,
    sourceSnapshot: 'per_file_non_atomic_shared_checkout',
    scanOutcome: outcomeFor(gaps, input.collection.enumerationComplete),
    policy,
    coverage: {
      legacy: 'incomplete_unknown',
      native: 'text_candidates_only',
      ownerAttribution: 'unclassified',
      mayCertifyNativeErase: false,
      mayCertifyFullUserLocalWipe: false,
    },
    roots,
    auxiliaryInputs,
    inputs: { inputSetSha256: inputSetHash(files), files },
    imports,
    dependencies,
    operations,
    nativeCandidates,
    policyHints,
    gaps,
    summary: {
      rootCount: roots.length,
      inputCount: files.length,
      parsedInputCount: files.filter((file) => file.parseStatus === 'parsed').length,
      nativeTextInputCount: files.filter((file) => file.kind === 'native_text').length,
      importCount: imports.length,
      dependencyCount: dependencies.length,
      operationCount: operations.length,
      nativeCandidateCount: nativeCandidates.length,
      policyHintCount: policyHints.length,
      gapCount: gaps.length,
    },
  };
  return deepFreezePlain(report);
}

export function canonicalCensusJson(report: AccountStorageCensusReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
