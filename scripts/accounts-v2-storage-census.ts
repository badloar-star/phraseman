import { createHash } from 'node:crypto';
import {
  closeSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_CENSUS_POLICY,
  canonicalCensusJson,
  normalizeCensusPolicy,
  scanAccountStorageEntries,
  type CensusAuxiliaryInput,
  type CensusGap,
  type CensusCollectionMetadata,
  type CensusCollectionPolicy,
  type CensusSourceEntry,
  type InputFingerprint,
  type RootCollectionResult,
} from './accounts-v2-storage-census-core';

export { DEFAULT_CENSUS_POLICY } from './accounts-v2-storage-census-core';

export type ReadOnlyCensusFs = Readonly<{
  readDirectory(inputPath: string): readonly Readonly<{
    name: string;
    kind: 'file' | 'directory' | 'symlink' | 'junction' | 'other';
  }>[];
  lstat(inputPath: string): Readonly<{
    kind: 'file' | 'directory' | 'symlink' | 'junction' | 'other';
    sizeBytes: number;
  }>;
  realpath(inputPath: string): string;
  readFileBytes(inputPath: string, maxBytes: number): Uint8Array;
}>;

function deepFreezeCollector<T>(value: T, seen = new Set<unknown>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  if (value instanceof Uint8Array) return value;
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeCollector(child, seen);
  }
  return Object.freeze(value);
}

export function collectAccountStorageEntries(input: Readonly<{
  repoRoot: string;
  fs: ReadOnlyCensusFs;
  pathApi: typeof path.win32 | typeof path.posix;
  policy?: CensusCollectionPolicy;
}>): Readonly<{
  entries: readonly CensusSourceEntry[];
  auxiliaryInputs: readonly CensusAuxiliaryInput[];
  collection: CensusCollectionMetadata;
}> {
  const effectivePolicy = normalizeCensusPolicy(input.policy ?? DEFAULT_CENSUS_POLICY);
  const { fs, pathApi } = input;
  const entries: CensusSourceEntry[] = [];
  const auxiliaryInputs: CensusAuxiliaryInput[] = [];
  const unavailableInputs: InputFingerprint[] = [];
  const roots: RootCollectionResult[] = [];
  const gaps: CensusGap[] = [];
  let enumerationComplete = true;
  let enumeratedFiles = 0;
  let totalBytes = 0;
  let gapLimitReached = false;
  let collectionWorkStopped = false;
  let collectionStopDetail: 'max_files' | 'max_total_bytes' | null = null;
  const seenCanonicalFiles = new Set<string>();
  const seenCanonicalDirectories = new Set<string>();

  const gapId = (fields: object): string => createHash('sha256')
    .update(JSON.stringify(['collector_gap', fields]))
    .digest('hex');
  const compareGaps = (left: CensusGap, right: CensusGap): number => {
    const leftPath = left.path ?? '';
    const rightPath = right.path ?? '';
    if (leftPath !== rightPath) return leftPath < rightPath ? -1 : 1;
    const lineDifference = (left.line ?? -1) - (right.line ?? -1);
    if (lineDifference !== 0) return lineDifference;
    const columnDifference = (left.column ?? -1) - (right.column ?? -1);
    if (columnDifference !== 0) return columnDifference;
    return left.gapId < right.gapId ? -1 : left.gapId > right.gapId ? 1 : 0;
  };
  const addGap = (fields: Omit<CensusGap, 'gapId'>): void => {
    if (fields.severity === 'incomplete') enumerationComplete = false;
    const max = effectivePolicy.bounds.maxGaps;
    const sentinelFields: Omit<CensusGap, 'gapId'> = {
      kind: 'bound_exceeded',
      severity: 'incomplete',
      detailCode: 'max_gaps',
    };
    if (gaps.some((gap) => gap.detailCode === 'max_gaps')) return;
    if (gaps.length < max - 1) {
      gaps.push(Object.freeze({ gapId: gapId(fields), ...fields }));
      return;
    }
    gaps.push(Object.freeze({ gapId: gapId(sentinelFields), ...sentinelFields }));
    enumerationComplete = false;
    gapLimitReached = true;
  };
  const canonicalRoot = pathApi.resolve(fs.realpath(input.repoRoot));
  const rootStat = fs.lstat(canonicalRoot);
  if (rootStat.kind !== 'directory') {
    throw new Error('account_storage_census_invalid_repo_root');
  }
  const comparisonRoot = pathApi === path.win32 ? canonicalRoot.toLowerCase() : canonicalRoot;
  const canonicalKey = (value: string): string => pathApi === path.win32
    ? pathApi.resolve(value).toLowerCase()
    : pathApi.resolve(value);
  const isContained = (candidate: string): boolean => {
    const resolved = pathApi.resolve(candidate);
    const compared = pathApi === path.win32 ? resolved.toLowerCase() : resolved;
    const relative = pathApi.relative(comparisonRoot, compared);
    return relative === '' || (!relative.startsWith('..') && !pathApi.isAbsolute(relative));
  };
  const reportPath = (absolutePath: string): string => pathApi
    .relative(canonicalRoot, absolutePath)
    .split(pathApi.sep)
    .join('/');
  const classify = (absolutePath: string): CensusSourceEntry['kind'] | null => {
    const extension = pathApi.extname(absolutePath).toLowerCase();
    if (effectivePolicy.astExtensions.includes(extension)) return 'js_ts_ast';
    if (effectivePolicy.nativeTextExtensions.includes(extension)) return 'native_text';
    return null;
  };
  const unavailable = (
    relativePath: string,
    root: string | null,
    kind: CensusSourceEntry['kind'] | 'policy_registry_input',
    readStatus: InputFingerprint['readStatus'],
  ): void => {
    unavailableInputs.push(Object.freeze({
      path: relativePath,
      root,
      kind,
      classification: kind === 'policy_registry_input'
        ? 'policy_registry_input'
        : root === '.' ? 'root_tooling_unclassified' : 'source_root',
      bytes: null,
      sha256: null,
      readStatus,
      parseStatus: 'not_applicable',
    }));
  };
  const readBoundedFile = (
    absolutePath: string,
    root: string | null,
    kind: CensusSourceEntry['kind'] | 'policy_registry_input',
  ): boolean => {
    if (collectionWorkStopped) return false;
    const relativePath = reportPath(absolutePath);
    const fileLimit = kind === 'policy_registry_input'
      ? effectivePolicy.bounds.maxFiles
      : Math.max(0, effectivePolicy.bounds.maxFiles - effectivePolicy.auxiliaryInputs.length);
    if (enumeratedFiles >= fileLimit) {
      addGap({ kind: 'bound_exceeded', severity: 'incomplete', path: relativePath, detailCode: 'max_files' });
      collectionWorkStopped = true;
      collectionStopDetail = 'max_files';
      return false;
    }
    enumeratedFiles += 1;
    let observedCanonical: string;
    try {
      observedCanonical = fs.realpath(absolutePath);
    } catch {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'raw_read_failed' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    if (!isContained(observedCanonical)) {
      addGap({ kind: 'path_outside_root', severity: 'incomplete', path: relativePath, detailCode: 'canonical_path_escape' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    const observedKey = canonicalKey(observedCanonical);
    if (seenCanonicalFiles.has(observedKey)) {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'duplicate_canonical_file' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    seenCanonicalFiles.add(observedKey);
    let before: ReturnType<ReadOnlyCensusFs['lstat']>;
    try {
      before = fs.lstat(absolutePath);
    } catch {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'lstat_failed' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    if (before.kind !== 'file' || !Number.isSafeInteger(before.sizeBytes) || before.sizeBytes < 0) {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'file_changed_during_read' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    if (before.sizeBytes > effectivePolicy.bounds.maxBytesPerFile) {
      addGap({ kind: 'bound_exceeded', severity: 'incomplete', path: relativePath, detailCode: 'max_bytes_per_file' });
      unavailable(relativePath, root, kind, 'too_large');
      return false;
    }
    if (totalBytes + before.sizeBytes > effectivePolicy.bounds.maxTotalBytes) {
      addGap({ kind: 'bound_exceeded', severity: 'incomplete', path: relativePath, detailCode: 'max_total_bytes' });
      unavailable(relativePath, root, kind, 'too_large');
      collectionWorkStopped = true;
      collectionStopDetail = 'max_total_bytes';
      return false;
    }
    let returnedBytes: unknown;
    try {
      returnedBytes = fs.readFileBytes(absolutePath, effectivePolicy.bounds.maxBytesPerFile);
    } catch {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'raw_read_failed' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    if (!(returnedBytes instanceof Uint8Array)) {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'raw_read_failed' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    const bytes = returnedBytes;
    if (bytes.byteLength > effectivePolicy.bounds.maxBytesPerFile || bytes.byteLength !== before.sizeBytes) {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'file_changed_during_read' });
      unavailable(relativePath, root, kind, bytes.byteLength > effectivePolicy.bounds.maxBytesPerFile ? 'too_large' : 'unreadable');
      return false;
    }
    let after: ReturnType<ReadOnlyCensusFs['lstat']>;
    try {
      after = fs.lstat(absolutePath);
    } catch {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'file_changed_during_read' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    if (after.kind !== 'file' || after.sizeBytes !== before.sizeBytes) {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: relativePath, detailCode: 'file_changed_during_read' });
      unavailable(relativePath, root, kind, 'unreadable');
      return false;
    }
    if (totalBytes + bytes.byteLength > effectivePolicy.bounds.maxTotalBytes) {
      addGap({ kind: 'bound_exceeded', severity: 'incomplete', path: relativePath, detailCode: 'max_total_bytes' });
      unavailable(relativePath, root, kind, 'too_large');
      collectionWorkStopped = true;
      collectionStopDetail = 'max_total_bytes';
      return false;
    }
    totalBytes += bytes.byteLength;
    const copy = new Uint8Array(bytes);
    if (kind === 'policy_registry_input') {
      auxiliaryInputs.push({ path: 'config/phone-state-legacy-inventory.v1.json', bytes: copy });
    } else {
      entries.push({ path: relativePath, root: root ?? '.', kind, bytes: copy });
    }
    return true;
  };
  const observeLink = (absolutePath: string): void => {
    const relativePath = reportPath(absolutePath);
    let detailCode: 'link_inside_repo' | 'link_outside_repo' | 'link_target_unreadable';
    try {
      detailCode = isContained(fs.realpath(absolutePath)) ? 'link_inside_repo' : 'link_outside_repo';
    } catch {
      detailCode = 'link_target_unreadable';
    }
    addGap({ kind: 'link_skipped', severity: 'hold', path: relativePath, detailCode });
  };
  const validChildName = (name: string): boolean => name !== '.' && name !== '..'
    && name.length > 0 && !name.includes('\0') && !name.includes('/') && !name.includes('\\');
  const walkDirectory = (absoluteDirectory: string, root: string, depth: number): void => {
    if (gapLimitReached || collectionWorkStopped) return;
    if (depth > effectivePolicy.bounds.maxDepth) {
      addGap({ kind: 'bound_exceeded', severity: 'incomplete', path: reportPath(absoluteDirectory), detailCode: 'max_depth' });
      return;
    }
    let observedDirectory: string;
    try {
      observedDirectory = fs.realpath(absoluteDirectory);
    } catch {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: reportPath(absoluteDirectory), detailCode: 'directory_read_failed' });
      return;
    }
    if (!isContained(observedDirectory)) {
      addGap({ kind: 'path_outside_root', severity: 'incomplete', path: reportPath(absoluteDirectory), detailCode: 'canonical_path_escape' });
      return;
    }
    const directoryKey = canonicalKey(observedDirectory);
    if (seenCanonicalDirectories.has(directoryKey)) {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: reportPath(absoluteDirectory), detailCode: 'duplicate_canonical_file' });
      return;
    }
    seenCanonicalDirectories.add(directoryKey);
    let children: readonly Readonly<{ name: string; kind: 'file' | 'directory' | 'symlink' | 'junction' | 'other' }>[];
    try {
      children = fs.readDirectory(absoluteDirectory);
    } catch {
      addGap({ kind: 'unreadable', severity: 'incomplete', path: reportPath(absoluteDirectory), detailCode: 'directory_read_failed' });
      return;
    }
    for (const child of [...children].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      if (gapLimitReached || collectionWorkStopped) break;
      if (!validChildName(child.name)) {
        addGap({ kind: 'path_outside_root', severity: 'incomplete', path: reportPath(absoluteDirectory), detailCode: 'invalid_child_name' });
        continue;
      }
      if (effectivePolicy.excludedPathSegments.includes(child.name)) continue;
      const absoluteChild = pathApi.resolve(absoluteDirectory, child.name);
      if (!isContained(absoluteChild)) {
        addGap({ kind: 'path_outside_root', severity: 'incomplete', detailCode: 'canonical_path_escape' });
        continue;
      }
      if (child.kind === 'symlink' || child.kind === 'junction') {
        observeLink(absoluteChild);
      } else if (child.kind === 'directory') {
        try {
          if (fs.lstat(absoluteChild).kind !== 'directory') {
            addGap({ kind: 'unreadable', severity: 'incomplete', path: reportPath(absoluteChild), detailCode: 'file_changed_during_read' });
          } else {
            walkDirectory(absoluteChild, root, depth + 1);
          }
        } catch {
          addGap({ kind: 'unreadable', severity: 'incomplete', path: reportPath(absoluteChild), detailCode: 'lstat_failed' });
        }
      } else if (child.kind === 'file') {
        const kind = classify(absoluteChild);
        if (kind !== null) readBoundedFile(absoluteChild, root, kind);
      }
    }
  };

  const directRootFilesBefore = entries.length + unavailableInputs.length;
  let rootChildren: ReturnType<ReadOnlyCensusFs['readDirectory']> = [];
  try {
    rootChildren = fs.readDirectory(canonicalRoot);
  } catch {
    addGap({ kind: 'unreadable', severity: 'incomplete', detailCode: 'directory_read_failed' });
  }
  for (const child of [...rootChildren].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
    if (gapLimitReached || collectionWorkStopped) break;
    if (!validChildName(child.name)) {
      addGap({ kind: 'path_outside_root', severity: 'incomplete', detailCode: 'invalid_child_name' });
      continue;
    }
    const absoluteChild = pathApi.resolve(canonicalRoot, child.name);
    if (child.kind === 'symlink' || child.kind === 'junction') {
      observeLink(absoluteChild);
      continue;
    }
    if (child.kind !== 'file') continue;
    const kind = classify(absoluteChild);
    if (kind === 'js_ts_ast' && isContained(absoluteChild)) readBoundedFile(absoluteChild, '.', kind);
  }
  roots.push({
    path: '.',
    requirement: 'direct_root_files',
    status: 'scanned',
    fileCount: entries.length + unavailableInputs.length - directRootFilesBefore,
  });

  for (const requirement of ['required', 'optional'] as const) {
    const configuredRoots = requirement === 'required' ? effectivePolicy.requiredRoots : effectivePolicy.optionalRoots;
    for (const root of configuredRoots) {
      const absoluteRoot = pathApi.resolve(canonicalRoot, ...root.split('/'));
      const beforeCount = entries.length + unavailableInputs.length;
      let status: RootCollectionResult['status'] = 'scanned';
      if (collectionWorkStopped) {
        status = 'unreadable';
        addGap({
          kind: 'bound_exceeded',
          severity: 'incomplete',
          path: root,
          detailCode: collectionStopDetail ?? 'max_files',
        });
        roots.push({ path: root, requirement, status, fileCount: 0 });
        continue;
      }
      try {
        const rootInfo = fs.lstat(absoluteRoot);
        if (rootInfo.kind === 'symlink' || rootInfo.kind === 'junction') {
          status = 'unreadable';
          observeLink(absoluteRoot);
          addGap({
            kind: 'unreadable',
            severity: 'incomplete',
            path: root,
            detailCode: 'lstat_failed',
          });
        } else if (rootInfo.kind !== 'directory') {
          status = 'unreadable';
          addGap({ kind: 'unreadable', severity: 'incomplete', path: root, detailCode: 'lstat_failed' });
        } else {
          walkDirectory(absoluteRoot, root, 0);
        }
      } catch (error) {
        const errorCode = typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: unknown }).code
          : undefined;
        const missing = errorCode === 'ENOENT' || errorCode === 'ENOTDIR';
        if (requirement === 'optional' && missing) {
          status = 'absent_optional';
        } else if (requirement === 'required' && missing) {
          status = 'missing_required';
          addGap({ kind: 'required_root_missing', severity: 'incomplete', path: root, detailCode: 'root_missing' });
        } else {
          status = 'unreadable';
          addGap({ kind: 'unreadable', severity: 'incomplete', path: root, detailCode: 'lstat_failed' });
        }
      }
      roots.push({
        path: root,
        requirement,
        status,
        fileCount: entries.length + unavailableInputs.length - beforeCount,
      });
    }
  }

  for (const auxiliaryPath of effectivePolicy.auxiliaryInputs) {
    const absoluteAuxiliary = pathApi.resolve(canonicalRoot, ...auxiliaryPath.split('/'));
    if (!isContained(absoluteAuxiliary)
      || !readBoundedFile(absoluteAuxiliary, null, 'policy_registry_input')) {
      if (!unavailableInputs.some((item) => item.path === auxiliaryPath)) {
        unavailable(auxiliaryPath, null, 'policy_registry_input', 'unreadable');
      }
      if (!gaps.some((gap) => gap.path === auxiliaryPath && gap.severity === 'incomplete')) {
        addGap({ kind: 'invalid_auxiliary_input', severity: 'incomplete', path: auxiliaryPath, detailCode: 'raw_read_failed' });
      }
    }
  }

  entries.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  auxiliaryInputs.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  unavailableInputs.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  gaps.sort(compareGaps);
  roots.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return deepFreezeCollector({
    entries,
    auxiliaryInputs,
    collection: {
      effectivePolicy,
      roots,
      unavailableInputs,
      gaps,
      enumerationComplete,
    },
  });
}

export function runAccountsV2StorageCensusCli(_input: Readonly<{
  argv: readonly string[];
  cwd: string;
  fs: ReadOnlyCensusFs;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}>): Readonly<{ exitCode: 0 | 1 | 2 }> {
  const input = _input;
  if (input.argv.length !== 1 || input.argv[0] !== '--scan') {
    input.stderr('account_storage_census_usage: --scan\n');
    return { exitCode: 2 };
  }
  try {
    const pathApi = /^[A-Za-z]:[\\/]/.test(input.cwd) || input.cwd.includes('\\')
      ? path.win32
      : path.posix;
    const collected = collectAccountStorageEntries({
      repoRoot: input.cwd,
      fs: input.fs,
      pathApi,
    });
    const report = scanAccountStorageEntries(collected);
    input.stdout(canonicalCensusJson(report));
    return {
      exitCode: report.scanOutcome === 'complete_no_scanner_gaps'
        ? 0
        : report.scanOutcome === 'complete_with_gaps' ? 1 : 2,
    };
  } catch {
    input.stderr('account_storage_census_failed\n');
    return { exitCode: 2 };
  }
}

function nodePort(): ReadOnlyCensusFs {
  return Object.freeze({
    readDirectory(inputPath) {
      return readdirSync(inputPath, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        kind: entry.isSymbolicLink()
          ? 'symlink' as const
          : entry.isDirectory()
            ? 'directory' as const
            : entry.isFile() ? 'file' as const : 'other' as const,
      }));
    },
    lstat(inputPath) {
      const stat = lstatSync(inputPath);
      return {
        kind: stat.isSymbolicLink()
          ? 'symlink' as const
          : stat.isDirectory()
            ? 'directory' as const
            : stat.isFile() ? 'file' as const : 'other' as const,
        sizeBytes: stat.size,
      };
    },
    realpath(inputPath) {
      return realpathSync.native(inputPath);
    },
    readFileBytes(inputPath, maxBytes) {
      const descriptor = openSync(inputPath, 'r');
      try {
        const buffer = Buffer.allocUnsafe(maxBytes + 1);
        let offset = 0;
        while (offset < buffer.byteLength) {
          const count = readSync(descriptor, buffer, offset, buffer.byteLength - offset, null);
          if (count === 0) break;
          offset += count;
        }
        return new Uint8Array(buffer.subarray(0, offset));
      } finally {
        closeSync(descriptor);
      }
    },
  });
}

if (require.main === module) {
  const result = runAccountsV2StorageCensusCli({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    fs: nodePort(),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  });
  process.exitCode = result.exitCode;
}
