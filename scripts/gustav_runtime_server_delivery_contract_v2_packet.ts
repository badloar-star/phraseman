import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type RuntimeSliceContract = {
  runtimeSliceId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  requiredManifestFields: string[];
  expectedManifestIdentity: {
    packIdPrefix: string;
    studyTarget: string;
    sourceLocale: string;
    surface: string;
    schemaVersion: string;
    contentVersion: string;
    entryIndexTemplate: string;
  };
  cacheKeyContract: {
    dimensions: string[];
    template: string;
  };
  futureArtifacts: {
    sliceManifest: string;
    entryIndex: string;
    payloadShard: string;
    checksumReport: string;
  };
  sliceManifestCreated: boolean;
  entryIndexCreated: boolean;
  runtimeManifestAllowedNow: false;
  payloadShardCreated: boolean;
  cacheKeyCreated: boolean;
  loaderCanResolveNow: false;
  activationApproved: false;
  blockedBy: string[];
};

type Contract = {
  schemaVersion: 'gustav-runtime-server-delivery-contract-v2';
  runId: string;
  generatedAt: string;
  targetLocale: string;
  studyTarget: string;
  sourceLocales: string[];
  sourceArtifacts: Record<string, string>;
  targetPackManifest: {
    path: string;
    packId: string;
    contentVersion: string;
    sha256: string;
    readyForRuntimeServerDeliveryContractV2: boolean;
  };
  runtimeState: {
    coursePackSchemaVersion: string;
    coursePackSurfaces: string[];
    coursePackCacheStates: string[];
    manifestRequiredFields: string[];
    cacheKeyDimensions: string[];
    internalStudyTargetHasFrench: boolean;
    productionStudyTargetHasFrench: boolean;
    embeddedIndexHasFrenchEntries: boolean;
    embeddedIndexDownloadableEntries: boolean;
    coursePackRemoteLoadingEnabled: boolean;
    startupImportsCoursePackRuntime: boolean;
    loaderNetworkOrFsImports: boolean;
    loaderUsesEmbeddedIndex: boolean;
    loaderBuildsCacheKey: boolean;
    loaderRequiresSelectionConfirmed: boolean;
    readinessReasons: string[];
  };
  requiredRuntimeSlices: RuntimeSliceContract[];
  serverDeliveryContract: {
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    serverManifestCreated: boolean;
    approvedCoursePackUploadPath: false;
    firebaseStoragePathTemplate: string;
    requiredServerManifestFields: string[];
    requiredServerChecks: string[];
    coursePackSpecificServerUploadCandidates: string[];
    genericFirebaseSurfacesMapped: number;
  };
  runtimeActivationPolicy: {
    activationApproved: false;
    runtimeDownloadsEnabled: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    requiredFutureGates: string[];
  };
  productionBlockerMap: Array<{
    blockerId: string;
    area: string;
    status: 'blocked';
    evidence: string;
    nextUnblockArtifact: string;
  }>;
};

type Report = {
  schemaVersion: 'gustav-runtime-server-delivery-contract-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: string;
    sourceLocales: number;
    targetPackManifestPresent: boolean;
    targetPackManifestReadyForP10: boolean;
    runtimeServerDeliveryContractCreated: boolean;
    coursePackSchemaVersion: string;
    coursePackSurfaces: number;
    coursePackCacheStates: number;
    manifestRequiredFields: number;
    cacheKeyDimensions: number;
    requiredRuntimeSlices: number;
    requiredRuntimeSlicesWithClosedActivation: number;
    runtimeSlicesBlocked: number;
    runtimeSlicesMissingPayload: number;
    runtimeSlicesWithCacheKeyContract: number;
    internalStudyTargetHasFrench: boolean;
    productionStudyTargetHasFrench: boolean;
    embeddedIndexHasFrenchEntries: boolean;
    embeddedIndexDownloadableEntries: boolean;
    coursePackRemoteLoadingEnabled: boolean;
    startupImportsCoursePackRuntime: boolean;
    loaderNetworkOrFsImports: boolean;
    loaderUsesEmbeddedIndex: boolean;
    loaderBuildsCacheKey: boolean;
    loaderRequiresSelectionConfirmed: boolean;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    downloadablePacksPublished: boolean;
    serverManifestCreated: boolean;
    approvedCoursePackUploadPath: boolean;
    coursePackSpecificServerUploadCandidates: number;
    genericFirebaseSurfacesMapped: number;
    activationApprovedFlags: number;
    serverUploadOpenFlags: number;
    firebaseUploadOpenFlags: number;
    runtimeDownloadsOpenFlags: number;
    readyForApplyOpenFlags: number;
    productionBlockers: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    readyForStorageCloudTargetMapV2: boolean;
    readyForRuntimeDownloadActivation: boolean;
    readyForServerUpload: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  contract: Contract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const REQUIRED_SOURCE_LOCALES = ['ru', 'uk'] as const;
const REQUIRED_CACHE_KEY_DIMENSIONS = ['studyTarget', 'sourceLocale', 'surface', 'schemaVersion', 'contentVersion', 'sha256'] as const;
const REQUIRED_MANIFEST_FIELDS = [
  'packId',
  'studyTarget',
  'sourceLocale',
  'surface',
  'schemaVersion',
  'contentVersion',
  'minAppVersion',
  'sha256',
  'byteSize',
  'createdAt',
  'dependencies',
  'entryIndex',
] as const;
const RUNTIME_SLICE_SURFACES = [
  'lesson',
  'lesson_intro',
  'quiz',
  'audio_metadata',
  'flashcard',
  'personal_practice',
] as const;
const STARTUP_FILES = [
  'app/_layout.tsx',
  'components/onboarding.tsx',
  'components/LangContext.tsx',
] as const;
const SOURCE_FILES = {
  coursePackManifest: 'app/course_pack_manifest.ts',
  coursePackIndex: 'app/course_pack_index.ts',
  coursePackLoader: 'app/course_pack_loader.ts',
  studyTarget: 'app/study_target.ts',
  sourceLocales: 'app/source_locales.ts',
  appConfig: 'app/config.ts',
  cloudSync: 'app/cloud_sync.ts',
  runtimeContractTest: 'tests/course_pack_runtime_contract.test.ts',
  bootstrapBoundaryTest: 'tests/bootstrap_bundle_boundary_contract.test.ts',
} as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function quotedArrayFromConst(source: string, constName: string): string[] {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function hasProductionFrench(studyTargetSource: string): boolean {
  return /ProductionStudyTarget\s*=\s*[^;]*'fr'/.test(studyTargetSource) ||
    /export\s+const\s+STUDY_TARGETS\s*=\s*\[[^\]]*'fr'/.test(studyTargetSource);
}

function hasInternalFrench(studyTargetSource: string): boolean {
  return /StudyTarget\s*=\s*[^;]*'fr'/.test(studyTargetSource) &&
    /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*'fr'/.test(studyTargetSource);
}

function importLikeLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .filter((line) => /^\s*import\b/.test(line) || /\brequire\(['"]/.test(line));
}

function startupImportsCoursePackRuntime(repoRoot: string): boolean {
  const fragments = ['course_pack_manifest', 'course_pack_index', 'course_pack_loader'];
  for (const relativePath of STARTUP_FILES) {
    const source = readText(path.join(repoRoot, relativePath));
    const matches = importLikeLines(source).filter((line) => fragments.some((fragment) => line.includes(fragment)));
    if (matches.length > 0) return true;
  }
  return false;
}

function readinessReasons(loaderSource: string): string[] {
  return [...loaderSource.matchAll(/reason:\s*'([^']+)'/g)].map((m) => m[1]);
}

function walkFiles(dir: string, repoRoot: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = rel(repoRoot, fullPath);
    if (entry.isDirectory()) {
      if ([
        'node_modules',
        '.git',
        '.codex',
        '.codex-tmp',
        'dist',
        'build',
        'android/.gradle',
        'android/app/build',
        'functions/lib',
      ].some((skip) => relative === skip || relative.startsWith(`${skip}/`))) {
        continue;
      }
      files.push(...walkFiles(fullPath, repoRoot));
    } else if (entry.isFile() && /\.(ts|tsx|js|mjs|cjs|json|rules)$/.test(entry.name)) {
      if (/\.generated\./.test(entry.name) || /\.map$/.test(entry.name)) continue;
      files.push(fullPath);
    }
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function scanServerSurfaces(repoRoot: string): { coursePackCandidates: string[]; genericFirebaseSurfaces: number } {
  const roots = ['app', 'functions/src', 'scripts', 'firebase.json', 'firestore.rules', 'storage.rules']
    .map((relativePath) => path.join(repoRoot, relativePath))
    .filter((filePath) => fs.existsSync(filePath));
  const files = roots.flatMap((root) => {
    if (fs.statSync(root).isDirectory()) return walkFiles(root, repoRoot);
    return [root];
  });
  const firebaseOrNetwork = /(firebase|firestore|firebasestorage|getStorage|uploadBytes|getDownloadURL|storage\(|onCall|onRequest|fetch\()/i;
  const coursePack = /course[_-]?pack|coursePacks|pack_candidates|downloadable/i;
  const uploadLike = /(upload|download|getDownloadURL|storage|bucket|serverManifest|remote_loader|COURSE_PACK_REMOTE_LOADING_ENABLED)/i;
  const genericFirebase = files.filter((filePath) => firebaseOrNetwork.test(readText(filePath)));
  const candidates = files
    .filter((filePath) => {
      const source = readText(filePath);
      return coursePack.test(source) && uploadLike.test(source);
    })
    .map((filePath) => rel(repoRoot, filePath))
    .slice(0, 40);
  return {
    coursePackCandidates: candidates,
    genericFirebaseSurfaces: genericFirebase.length,
  };
}

function runtimeSlicesFromManifest(targetPackManifest: JsonObject): Array<{ studyTarget: string; sourceLocale: string; surface: string }> {
  const runtimeDelivery = object(targetPackManifest.runtimeDelivery);
  const slices = runtimeDelivery.requiredRuntimeSlices;
  if (!Array.isArray(slices)) return [];
  return slices.map((slice) => {
    const row = object(slice);
    return {
      studyTarget: s(row, 'studyTarget'),
      sourceLocale: s(row, 'sourceLocale'),
      surface: s(row, 'surface'),
    };
  });
}

function buildSliceContracts(
  repoRoot: string,
  runDir: string,
  target: string,
  sourceLocales: readonly string[],
  surfaces: readonly string[],
  schemaVersion: string,
  contentVersion: string,
  runId: string,
): RuntimeSliceContract[] {
  return sourceLocales.flatMap((sourceLocale) =>
    surfaces.map((surface) => {
      const sliceDir = path.join(runDir, 'pack_candidates', target, 'runtime_slices', sourceLocale, surface);
      const sliceManifestPath = path.join(sliceDir, 'manifest.json');
      const entryIndexPath = path.join(sliceDir, 'index.json');
      const payloadShardPath = path.join(sliceDir, `payload-${runId}.json`);
      const checksumReportPath = path.join(runDir, 'audits', `payload_checksum_${target}_${sourceLocale}_${surface}.json`);
      const sliceManifestCreated = fs.existsSync(sliceManifestPath);
      const entryIndexCreated = fs.existsSync(entryIndexPath);
      const payloadShardCreated = fs.existsSync(payloadShardPath);
      const blockedBy = [
        'production_study_target_not_enabled',
        'course_pack_remote_loading_disabled',
        'no_french_embedded_index_entry',
        'activationApproved_false',
      ];
      if (!sliceManifestCreated) blockedBy.push('runtime_slice_manifest_not_created');
      if (!entryIndexCreated) blockedBy.push('runtime_entry_index_not_created');
      if (!payloadShardCreated) blockedBy.push('runtime_payload_shard_not_created');
      return {
        runtimeSliceId: `${target}-${sourceLocale}-${surface}`,
        studyTarget: target,
        sourceLocale,
        surface,
        requiredManifestFields: [...REQUIRED_MANIFEST_FIELDS],
        expectedManifestIdentity: {
          packIdPrefix: `${target}.${sourceLocale}.${surface}`,
          studyTarget: target,
          sourceLocale,
          surface,
          schemaVersion,
          contentVersion,
          entryIndexTemplate: `${target}/${sourceLocale}/${surface}/index.json`,
        },
        cacheKeyContract: {
          dimensions: [...REQUIRED_CACHE_KEY_DIMENSIONS],
          template: `${target}/${sourceLocale}/${surface}/${schemaVersion}/${contentVersion}/{sha256}`,
        },
        futureArtifacts: {
          sliceManifest: rel(repoRoot, sliceManifestPath),
          entryIndex: rel(repoRoot, entryIndexPath),
          payloadShard: rel(repoRoot, payloadShardPath),
          checksumReport: rel(repoRoot, checksumReportPath),
        },
        sliceManifestCreated,
        entryIndexCreated,
        runtimeManifestAllowedNow: false,
        payloadShardCreated,
        cacheKeyCreated: false,
        loaderCanResolveNow: false,
        activationApproved: false,
        blockedBy,
      };
    }),
  );
}

function productionBlockers(target: string, payloadShardsCreated: boolean, serverManifestCreated: boolean): Contract['productionBlockerMap'] {
  const blockers: Contract['productionBlockerMap'] = [
    {
      blockerId: 'P10-RUNTIME-001-fr-not-production-study-target',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'app/study_target.ts keeps ProductionStudyTarget limited to en.',
      nextUnblockArtifact: 'audits/production_study_target_activation_gate_v2.json',
    },
    {
      blockerId: 'P10-RUNTIME-002-remote-loader-disabled',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'app/course_pack_loader.ts exports COURSE_PACK_REMOTE_LOADING_ENABLED=false.',
      nextUnblockArtifact: 'audits/runtime_download_activation_gate_v2.json',
    },
    {
      blockerId: 'P10-RUNTIME-003-no-french-index-entry',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'app/course_pack_index.ts has no downloadable studyTarget=fr entries.',
      nextUnblockArtifact: 'audits/admin_pack_delivery_surface_v2_packet.json',
    },
    {
      blockerId: 'P10-SERVER-002-upload-policy-missing',
      area: 'server_delivery',
      status: 'blocked',
      evidence: 'No approved Firebase Storage path, upload policy, checksum policy or rollback policy exists for French packs.',
      nextUnblockArtifact: 'audits/server_pack_upload_policy_v2_packet.json',
    },
    {
      blockerId: 'P10-CACHE-001-cache-persistence-not-materialized',
      area: 'cache',
      status: 'blocked',
      evidence: 'buildCoursePackCacheKey is defined, but no persisted French downloadable cache entries or integrity records exist.',
      nextUnblockArtifact: 'audits/runtime_cache_integrity_v2_packet.json',
    },
    {
      blockerId: 'P10-STORAGE-001-storage-cloud-map-not-accepted',
      area: 'storage_cloud',
      status: 'blocked',
      evidence: 'French target storage/cloud namespaces must be mapped before runtime activation.',
      nextUnblockArtifact: 'audits/storage_cloud_target_map_v2_packet.json',
    },
    {
      blockerId: 'P10-ADMIN-001-admin-delivery-surfaces-not-approved',
      area: 'admin',
      status: 'blocked',
      evidence: 'Admin upload/preview/reviewer import surfaces are not yet bound to this runtime delivery contract.',
      nextUnblockArtifact: 'audits/admin_pack_delivery_surface_v2_packet.json',
    },
    {
      blockerId: 'P10-ACTIVATION-001-activation-not-approved',
      area: 'activation',
      status: 'blocked',
      evidence: 'activationApproved remains false until all gates, rollback and explicit apply approval exist.',
      nextUnblockArtifact: 'apply_plan/APPLY_PLAN.md',
    },
  ];
  if (!payloadShardsCreated) {
    blockers.splice(3, 0, {
      blockerId: 'P10-RUNTIME-004-payload-shards-missing',
      area: 'pack_payload',
      status: 'blocked',
      evidence: 'One or more runtime slice payload shards are not materialized yet.',
      nextUnblockArtifact: `pack_candidates/${target}/runtime_slices/*`,
    });
  }
  if (!serverManifestCreated) {
    blockers.splice(payloadShardsCreated ? 3 : 4, 0, {
      blockerId: 'P10-SERVER-001-server-manifest-missing',
      area: 'server_delivery',
      status: 'blocked',
      evidence: 'No local server delivery manifest exists for studyTarget=fr.',
      nextUnblockArtifact: 'audits/server_delivery_manifest_v2_packet.json',
    });
  }
  return blockers;
}

function buildContract(repoRoot: string, runDir: string, target: string): Contract {
  const runId = path.basename(runDir);
  const targetPackManifestPath = path.join(runDir, 'pack_candidates', target, 'target_pack_manifest_v2_draft.json');
  const targetPackManifestPacketPath = path.join(runDir, 'audits', 'target_pack_manifest_v2_packet.json');
  const serverDeliveryManifestPath = path.join(runDir, 'pack_candidates', target, 'server_delivery_manifest_v2.json');
  const targetPackManifest = object(readJson<unknown>(targetPackManifestPath));
  const targetPackManifestPacket = object(readJson<unknown>(targetPackManifestPacketPath));
  const targetPackManifestSummary = object(targetPackManifestPacket.summary);

  const coursePackManifestSource = readText(path.join(repoRoot, SOURCE_FILES.coursePackManifest));
  const coursePackIndexSource = readText(path.join(repoRoot, SOURCE_FILES.coursePackIndex));
  const coursePackLoaderSource = readText(path.join(repoRoot, SOURCE_FILES.coursePackLoader));
  const studyTargetSource = readText(path.join(repoRoot, SOURCE_FILES.studyTarget));
  const serverScan = scanServerSurfaces(repoRoot);

  const coursePackSchemaVersion = coursePackManifestSource.match(/COURSE_PACK_SCHEMA_VERSION\s*=\s*'([^']+)'/)?.[1] ?? '';
  const coursePackSurfaces = quotedArrayFromConst(coursePackManifestSource, 'COURSE_PACK_SURFACES');
  const coursePackCacheStates = quotedArrayFromConst(coursePackManifestSource, 'COURSE_PACK_CACHE_STATES');
  const cacheKeyDimensions = [...REQUIRED_CACHE_KEY_DIMENSIONS].filter((dimension) =>
    coursePackManifestSource.includes(`parts.${dimension}`),
  );
  const p9Slices = runtimeSlicesFromManifest(targetPackManifest);
  const expectedSlices = buildSliceContracts(
    repoRoot,
    runDir,
    target,
    REQUIRED_SOURCE_LOCALES,
    RUNTIME_SLICE_SURFACES,
    coursePackSchemaVersion,
    s(targetPackManifest, 'contentVersion'),
    runId,
  );
  const p9SliceIds = new Set(p9Slices.map((slice) => `${slice.studyTarget}-${slice.sourceLocale}-${slice.surface}`));
  const requiredRuntimeSlices = expectedSlices.map((slice) => ({
    ...slice,
    blockedBy: p9SliceIds.has(slice.runtimeSliceId)
      ? slice.blockedBy
      : [...slice.blockedBy, 'missing_from_target_pack_manifest_v2'],
  }));
  const allPayloadShardsCreated = requiredRuntimeSlices.every((slice) => slice.payloadShardCreated);
  const serverManifestCreated = fs.existsSync(serverDeliveryManifestPath);

  return {
    schemaVersion: 'gustav-runtime-server-delivery-contract-v2',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: target,
    studyTarget: target,
    sourceLocales: [...REQUIRED_SOURCE_LOCALES],
    sourceArtifacts: Object.fromEntries(
      Object.entries(SOURCE_FILES).map(([key, relativePath]) => [key, relativePath]),
    ),
    targetPackManifest: {
      path: rel(repoRoot, targetPackManifestPath),
      packId: s(targetPackManifest, 'packId'),
      contentVersion: s(targetPackManifest, 'contentVersion'),
      sha256: sha256(targetPackManifestPath),
      readyForRuntimeServerDeliveryContractV2:
        fs.existsSync(targetPackManifestPacketPath) &&
        n(targetPackManifestSummary, 'blockers') === 0 &&
        b(targetPackManifestSummary, 'readyForRuntimeServerDeliveryContractV2'),
    },
    runtimeState: {
      coursePackSchemaVersion,
      coursePackSurfaces,
      coursePackCacheStates,
      manifestRequiredFields: [...REQUIRED_MANIFEST_FIELDS].filter((field) => coursePackManifestSource.includes(`${field}:`)),
      cacheKeyDimensions,
      internalStudyTargetHasFrench: hasInternalFrench(studyTargetSource),
      productionStudyTargetHasFrench: hasProductionFrench(studyTargetSource),
      embeddedIndexHasFrenchEntries: /studyTarget:\s*'fr'/.test(coursePackIndexSource),
      embeddedIndexDownloadableEntries: /delivery:\s*'downloadable'/.test(coursePackIndexSource),
      coursePackRemoteLoadingEnabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*true\b/.test(coursePackLoaderSource),
      startupImportsCoursePackRuntime: startupImportsCoursePackRuntime(repoRoot),
      loaderNetworkOrFsImports: /firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage/i.test(coursePackLoaderSource),
      loaderUsesEmbeddedIndex: coursePackLoaderSource.includes('findEmbeddedCoursePackIndexEntry'),
      loaderBuildsCacheKey: coursePackLoaderSource.includes('buildCoursePackCacheKey'),
      loaderRequiresSelectionConfirmed: coursePackLoaderSource.includes('selectionConfirmed'),
      readinessReasons: readinessReasons(coursePackLoaderSource),
    },
    requiredRuntimeSlices,
    serverDeliveryContract: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      serverManifestCreated,
      approvedCoursePackUploadPath: false,
      firebaseStoragePathTemplate: `course-packs/${target}/{sourceLocale}/{surface}/{contentVersion}/{sha256}.json`,
      requiredServerManifestFields: [
        ...REQUIRED_MANIFEST_FIELDS,
        'activationApproved:false',
        'publishedAt',
        'rollbackFromVersion',
        'gateReportRefs',
      ],
      requiredServerChecks: [
        'studyTarget/sourceLocale/surface identity must match the runtime slice request.',
        'sha256 and byteSize must match the downloadable payload before cache state can become ready.',
        'activationApproved must remain false until LLM official-source review, server upload, cache integrity and rollback gates pass.',
        'Server manifest must not be published for a sourceLocale/UI locale mismatch.',
        'Rollback metadata must identify the prior known-good contentVersion before runtime download activation.',
      ],
      coursePackSpecificServerUploadCandidates: serverScan.coursePackCandidates,
      genericFirebaseSurfacesMapped: serverScan.genericFirebaseSurfaces,
    },
    runtimeActivationPolicy: {
      activationApproved: false,
      runtimeDownloadsEnabled: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      requiredFutureGates: [
        'storage_cloud_target_map_v2',
        'admin_pack_delivery_surface_v2',
        'reviewer_decision_import_v2_dry_run',
        'payload_shard_materialization_checksum_audit',
        'server_delivery_manifest_v2',
        'runtime_cache_integrity_v2',
        'production_activation_gate_v2_with_rollback',
      ],
    },
    productionBlockerMap: productionBlockers(target, allPayloadShardsCreated, serverManifestCreated),
  };
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function validateContract(contract: Contract): Finding[] {
  const findings: Finding[] = [];
  if (contract.schemaVersion !== 'gustav-runtime-server-delivery-contract-v2') {
    addFinding(findings, 'blocker', 'schema_version_invalid', 'Runtime/server contract schema version is invalid.');
  }
  if (contract.studyTarget !== 'fr' || contract.targetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'target_not_fr', 'P10 is scoped to studyTarget=fr only.');
  }
  if (contract.sourceLocales.length !== REQUIRED_SOURCE_LOCALES.length ||
    REQUIRED_SOURCE_LOCALES.some((locale) => !contract.sourceLocales.includes(locale))) {
    addFinding(findings, 'blocker', 'source_locales_invalid', 'Contract must cover sourceLocales ru and uk.');
  }
  if (!contract.targetPackManifest.readyForRuntimeServerDeliveryContractV2) {
    addFinding(findings, 'blocker', 'target_pack_manifest_not_ready', 'P9 target pack manifest is not ready for P10.');
  }
  if (!contract.runtimeState.internalStudyTargetHasFrench) {
    addFinding(findings, 'blocker', 'internal_fr_target_missing', 'French must remain registered as an internal StudyTarget before pack planning.');
  }
  if (contract.runtimeState.productionStudyTargetHasFrench) {
    addFinding(findings, 'blocker', 'production_fr_opened_too_early', 'French production target is open before activation gate.');
  }
  if (contract.runtimeState.embeddedIndexHasFrenchEntries) {
    addFinding(findings, 'blocker', 'embedded_fr_index_opened_too_early', 'Embedded course-pack index already exposes French entries.');
  }
  if (contract.runtimeState.embeddedIndexDownloadableEntries) {
    addFinding(findings, 'blocker', 'embedded_downloadable_index_opened_too_early', 'Embedded course-pack index already exposes downloadable entries.');
  }
  if (contract.runtimeState.coursePackRemoteLoadingEnabled) {
    addFinding(findings, 'blocker', 'remote_loader_enabled_too_early', 'COURSE_PACK_REMOTE_LOADING_ENABLED must stay false during P10.');
  }
  if (contract.runtimeState.startupImportsCoursePackRuntime) {
    addFinding(findings, 'blocker', 'startup_imports_course_pack_runtime', 'Startup/onboarding imports course-pack runtime too early.');
  }
  if (contract.runtimeState.loaderNetworkOrFsImports) {
    addFinding(findings, 'blocker', 'loader_has_network_or_fs_imports', 'Course-pack loader is connected to network/filesystem/storage before delivery gate.');
  }
  if (!contract.runtimeState.loaderUsesEmbeddedIndex || !contract.runtimeState.loaderBuildsCacheKey || !contract.runtimeState.loaderRequiresSelectionConfirmed) {
    addFinding(findings, 'blocker', 'loader_contract_incomplete', 'Course-pack loader must use embedded index, cache key and explicit selection confirmation.');
  }
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!contract.runtimeState.manifestRequiredFields.includes(field)) {
      addFinding(findings, 'blocker', 'manifest_field_missing', `CoursePackManifest field is not detected: ${field}.`);
    }
  }
  for (const dimension of REQUIRED_CACHE_KEY_DIMENSIONS) {
    if (!contract.runtimeState.cacheKeyDimensions.includes(dimension)) {
      addFinding(findings, 'blocker', 'cache_key_dimension_missing', `CoursePack cache key is missing dimension: ${dimension}.`);
    }
  }
  const expectedSliceIds = new Set(
    REQUIRED_SOURCE_LOCALES.flatMap((sourceLocale) =>
      RUNTIME_SLICE_SURFACES.map((surface) => `${contract.studyTarget}-${sourceLocale}-${surface}`),
    ),
  );
  const actualSliceIds = new Set(contract.requiredRuntimeSlices.map((slice) => slice.runtimeSliceId));
  if (contract.requiredRuntimeSlices.length !== expectedSliceIds.size) {
    addFinding(findings, 'blocker', 'runtime_slice_count_invalid', `Expected ${expectedSliceIds.size} runtime slices.`);
  }
  for (const sliceId of expectedSliceIds) {
    if (!actualSliceIds.has(sliceId)) {
      addFinding(findings, 'blocker', 'runtime_slice_missing', `Runtime slice is missing: ${sliceId}.`);
    }
  }
  for (const slice of contract.requiredRuntimeSlices) {
    if (slice.studyTarget !== contract.studyTarget) {
      addFinding(findings, 'blocker', 'slice_target_mismatch', `Slice target mismatch: ${slice.runtimeSliceId}.`);
    }
    if (!REQUIRED_SOURCE_LOCALES.includes(slice.sourceLocale as (typeof REQUIRED_SOURCE_LOCALES)[number])) {
      addFinding(findings, 'blocker', 'slice_source_locale_invalid', `Slice sourceLocale is invalid: ${slice.runtimeSliceId}.`);
    }
    if (!RUNTIME_SLICE_SURFACES.includes(slice.surface as (typeof RUNTIME_SLICE_SURFACES)[number])) {
      addFinding(findings, 'blocker', 'slice_surface_invalid', `Slice surface is invalid: ${slice.runtimeSliceId}.`);
    }
    for (const dimension of REQUIRED_CACHE_KEY_DIMENSIONS) {
      if (!slice.cacheKeyContract.dimensions.includes(dimension)) {
        addFinding(findings, 'blocker', 'slice_cache_key_dimension_missing', `Slice cache key missing ${dimension}: ${slice.runtimeSliceId}.`);
      }
    }
    if (slice.runtimeManifestAllowedNow || slice.cacheKeyCreated || slice.loaderCanResolveNow || slice.activationApproved) {
      addFinding(findings, 'blocker', 'slice_opened_too_early', `Runtime slice is opened before gates: ${slice.runtimeSliceId}.`);
    }
  }
  if (contract.serverDeliveryContract.serverUploadAllowed) {
    addFinding(findings, 'blocker', 'server_upload_allowed_too_early', 'Server upload must remain disabled in P10.');
  }
  if (contract.serverDeliveryContract.firebaseUploadAllowed) {
    addFinding(findings, 'blocker', 'firebase_upload_allowed_too_early', 'Firebase upload must remain disabled in P10.');
  }
  if (contract.serverDeliveryContract.downloadablePacksPublished) {
    addFinding(findings, 'blocker', 'downloadable_server_manifest_opened_too_early', 'No downloadable French server manifest may be published in P10.');
  }
  if (contract.serverDeliveryContract.approvedCoursePackUploadPath) {
    addFinding(findings, 'blocker', 'approved_upload_path_opened_too_early', 'Approved course-pack upload path must stay false until server gate.');
  }
  if (contract.runtimeActivationPolicy.activationApproved) {
    addFinding(findings, 'blocker', 'activation_approved_too_early', 'activationApproved must remain false.');
  }
  if (contract.runtimeActivationPolicy.runtimeDownloadsEnabled) {
    addFinding(findings, 'blocker', 'runtime_downloads_enabled_too_early', 'Runtime downloads must remain disabled.');
  }
  if (contract.runtimeActivationPolicy.readyForApply || contract.runtimeActivationPolicy.mayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'apply_opened_too_early', 'Apply and production app modification must remain disabled.');
  }
  if (contract.productionBlockerMap.length < 8) {
    addFinding(findings, 'blocker', 'production_blocker_map_too_small', 'P10 production blocker map must enumerate runtime/server/storage/admin/activation blockers.');
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbes(contract: Contract): Probe[] {
  const fixtures: Array<{ id: string; expectedAccept: boolean; mutate?: (draft: Contract) => void }> = [
    { id: 'canonical_runtime_server_contract_accepts', expectedAccept: true },
    {
      id: 'runtime_downloads_enabled_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.runtimeActivationPolicy as { runtimeDownloadsEnabled: boolean }).runtimeDownloadsEnabled = true; },
    },
    {
      id: 'server_upload_allowed_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.serverDeliveryContract as { serverUploadAllowed: boolean }).serverUploadAllowed = true; },
    },
    {
      id: 'firebase_upload_allowed_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.serverDeliveryContract as { firebaseUploadAllowed: boolean }).firebaseUploadAllowed = true; },
    },
    {
      id: 'slice_activation_approved_rejected',
      expectedAccept: false,
      mutate: (draft) => { (draft.requiredRuntimeSlices[0] as { activationApproved: boolean }).activationApproved = true; },
    },
    {
      id: 'missing_runtime_slice_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.requiredRuntimeSlices.pop(); },
    },
    {
      id: 'cache_key_missing_target_dimension_rejected',
      expectedAccept: false,
      mutate: (draft) => {
        draft.requiredRuntimeSlices[0].cacheKeyContract.dimensions =
          draft.requiredRuntimeSlices[0].cacheKeyContract.dimensions.filter((dimension) => dimension !== 'studyTarget');
      },
    },
    {
      id: 'startup_connected_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeState.startupImportsCoursePackRuntime = true; },
    },
    {
      id: 'loader_network_imports_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeState.loaderNetworkOrFsImports = true; },
    },
    {
      id: 'remote_loader_enabled_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeState.coursePackRemoteLoadingEnabled = true; },
    },
  ];

  return fixtures.map((fixture) => {
    const draft = clone(contract);
    fixture.mutate?.(draft);
    const blockers = validateContract(draft).filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: fixture.id,
      expectedAccept: fixture.expectedAccept,
      accepted,
      blockers,
      passed: accepted === fixture.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Runtime/Server Delivery Contract V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: ${report.summary.targetLocale}`,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- Runtime slices: ${report.summary.requiredRuntimeSlices}`,
    `- Cache key dimensions: ${report.summary.cacheKeyDimensions}`,
    `- Production French target open: ${report.summary.productionStudyTargetHasFrench ? 'yes' : 'no'}`,
    `- Embedded French index entries: ${report.summary.embeddedIndexHasFrenchEntries ? 'yes' : 'no'}`,
    `- Remote loading enabled: ${report.summary.coursePackRemoteLoadingEnabled ? 'yes' : 'no'}`,
    `- Startup imports course-pack runtime: ${report.summary.startupImportsCoursePackRuntime ? 'yes' : 'no'}`,
    `- Loader has network/filesystem imports: ${report.summary.loaderNetworkOrFsImports ? 'yes' : 'no'}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}`,
    `- Firebase upload allowed: ${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}`,
    `- Production blockers mapped: ${report.summary.productionBlockers}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for Storage/Cloud Target Map V2: ${report.summary.readyForStorageCloudTargetMapV2 ? 'yes' : 'no'}`,
    `- Ready for runtime download activation: ${report.summary.readyForRuntimeDownloadActivation ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Required Runtime Slices',
    '',
  ];
  for (const slice of report.contract.requiredRuntimeSlices) {
    lines.push(`- \`${slice.runtimeSliceId}\`: ${slice.cacheKeyContract.template} -> ${slice.futureArtifacts.payloadShard}`);
  }
  lines.push('', '## Production Blockers', '');
  for (const blocker of report.contract.productionBlockerMap) {
    lines.push(`- \`${blocker.blockerId}\` (${blocker.area}): ${blocker.evidence} Next: \`${blocker.nextUnblockArtifact}\``);
  }
  lines.push('', '## Probes', '');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet writes only Gustav run artifacts.',
    '- It does not modify production app files.',
    '- It does not create payload shards.',
    '- It does not upload to Firebase/server.',
    '- It does not enable runtime downloads.',
    '- It does not approve activation.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_runtime_server_delivery_contract_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P10 runtime/server delivery contract is currently scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', target);
  ensureDir(auditsDir);
  ensureDir(packDir);

  const targetPackManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const targetPackManifestPacketPath = path.join(auditsDir, 'target_pack_manifest_v2_packet.json');
  const outContract = path.join(packDir, 'runtime_server_delivery_contract_v2.json');
  const outJson = path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.json');
  const outMd = path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.md');

  const contract = buildContract(repoRoot, runDir, target);
  const validationFindings = validateContract(contract);
  const probes = makeProbes(contract);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...validationFindings];
  for (const probe of failedProbes) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(
    findings,
    'info',
    'runtime_delivery_closed',
    'Runtime/download/server activation remains intentionally closed while the delivery contract is mapped.',
  );
  addFinding(
    findings,
    'info',
    'storage_cloud_deferred',
    'Storage/cloud namespace verification is the next large pass and no migration was opened in P10.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const activationApprovedFlags = contract.requiredRuntimeSlices.filter((slice) => slice.activationApproved).length +
    (contract.runtimeActivationPolicy.activationApproved ? 1 : 0);
  const serverUploadOpenFlags = contract.serverDeliveryContract.serverUploadAllowed ? 1 : 0;
  const firebaseUploadOpenFlags = contract.serverDeliveryContract.firebaseUploadAllowed ? 1 : 0;
  const runtimeDownloadsOpenFlags = contract.runtimeActivationPolicy.runtimeDownloadsEnabled ? 1 : 0;
  const readyForApplyOpenFlags = contract.runtimeActivationPolicy.readyForApply || contract.runtimeActivationPolicy.mayModifyProductionAppFiles ? 1 : 0;

  const report: Report = {
    schemaVersion: 'gustav-runtime-server-delivery-contract-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      targetPackManifestV2Draft: rel(repoRoot, targetPackManifestPath),
      targetPackManifestV2Packet: rel(repoRoot, targetPackManifestPacketPath),
      coursePackManifest: SOURCE_FILES.coursePackManifest,
      coursePackIndex: SOURCE_FILES.coursePackIndex,
      coursePackLoader: SOURCE_FILES.coursePackLoader,
      studyTarget: SOURCE_FILES.studyTarget,
      sourceLocales: SOURCE_FILES.sourceLocales,
      appConfig: SOURCE_FILES.appConfig,
      cloudSync: SOURCE_FILES.cloudSync,
      runtimeContractTest: SOURCE_FILES.runtimeContractTest,
      bootstrapBoundaryTest: SOURCE_FILES.bootstrapBoundaryTest,
    },
    outputs: {
      runtimeServerDeliveryContractV2: rel(repoRoot, outContract),
      runtimeServerDeliveryContractV2PacketJson: rel(repoRoot, outJson),
      runtimeServerDeliveryContractV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: target,
      sourceLocales: contract.sourceLocales.length,
      targetPackManifestPresent: fs.existsSync(targetPackManifestPath),
      targetPackManifestReadyForP10: contract.targetPackManifest.readyForRuntimeServerDeliveryContractV2,
      runtimeServerDeliveryContractCreated: true,
      coursePackSchemaVersion: contract.runtimeState.coursePackSchemaVersion,
      coursePackSurfaces: contract.runtimeState.coursePackSurfaces.length,
      coursePackCacheStates: contract.runtimeState.coursePackCacheStates.length,
      manifestRequiredFields: contract.runtimeState.manifestRequiredFields.length,
      cacheKeyDimensions: contract.runtimeState.cacheKeyDimensions.length,
      requiredRuntimeSlices: contract.requiredRuntimeSlices.length,
      requiredRuntimeSlicesWithClosedActivation: contract.requiredRuntimeSlices.filter((slice) => !slice.activationApproved).length,
      runtimeSlicesBlocked: contract.requiredRuntimeSlices.filter((slice) => slice.blockedBy.length > 0).length,
      runtimeSlicesMissingPayload: contract.requiredRuntimeSlices.filter((slice) => !slice.payloadShardCreated).length,
      runtimeSlicesWithCacheKeyContract: contract.requiredRuntimeSlices.filter((slice) =>
        REQUIRED_CACHE_KEY_DIMENSIONS.every((dimension) => slice.cacheKeyContract.dimensions.includes(dimension)),
      ).length,
      internalStudyTargetHasFrench: contract.runtimeState.internalStudyTargetHasFrench,
      productionStudyTargetHasFrench: contract.runtimeState.productionStudyTargetHasFrench,
      embeddedIndexHasFrenchEntries: contract.runtimeState.embeddedIndexHasFrenchEntries,
      embeddedIndexDownloadableEntries: contract.runtimeState.embeddedIndexDownloadableEntries,
      coursePackRemoteLoadingEnabled: contract.runtimeState.coursePackRemoteLoadingEnabled,
      startupImportsCoursePackRuntime: contract.runtimeState.startupImportsCoursePackRuntime,
      loaderNetworkOrFsImports: contract.runtimeState.loaderNetworkOrFsImports,
      loaderUsesEmbeddedIndex: contract.runtimeState.loaderUsesEmbeddedIndex,
      loaderBuildsCacheKey: contract.runtimeState.loaderBuildsCacheKey,
      loaderRequiresSelectionConfirmed: contract.runtimeState.loaderRequiresSelectionConfirmed,
      serverUploadAllowed: contract.serverDeliveryContract.serverUploadAllowed,
      firebaseUploadAllowed: contract.serverDeliveryContract.firebaseUploadAllowed,
      downloadablePacksPublished: contract.serverDeliveryContract.downloadablePacksPublished,
      serverManifestCreated: contract.serverDeliveryContract.serverManifestCreated,
      approvedCoursePackUploadPath: contract.serverDeliveryContract.approvedCoursePackUploadPath,
      coursePackSpecificServerUploadCandidates: contract.serverDeliveryContract.coursePackSpecificServerUploadCandidates.length,
      genericFirebaseSurfacesMapped: contract.serverDeliveryContract.genericFirebaseSurfacesMapped,
      activationApprovedFlags,
      serverUploadOpenFlags,
      firebaseUploadOpenFlags,
      runtimeDownloadsOpenFlags,
      readyForApplyOpenFlags,
      productionBlockers: contract.productionBlockerMap.length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      readyForStorageCloudTargetMapV2: blockers === 0,
      readyForRuntimeDownloadActivation: false,
      readyForServerUpload: false,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    artifactHashes: {
      targetPackManifestV2Draft: sha256(targetPackManifestPath),
      targetPackManifestV2Packet: sha256(targetPackManifestPacketPath),
      coursePackManifest: sha256(path.join(repoRoot, SOURCE_FILES.coursePackManifest)),
      coursePackIndex: sha256(path.join(repoRoot, SOURCE_FILES.coursePackIndex)),
      coursePackLoader: sha256(path.join(repoRoot, SOURCE_FILES.coursePackLoader)),
      studyTarget: sha256(path.join(repoRoot, SOURCE_FILES.studyTarget)),
      cloudSync: sha256(path.join(repoRoot, SOURCE_FILES.cloudSync)),
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outContract, contract);
  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV runtime/server delivery contract V2 packet: ${report.status}`);
  console.log(`Runtime slices: ${report.summary.requiredRuntimeSlices}`);
  console.log(`Production blockers mapped: ${report.summary.productionBlockers}`);
  console.log(`Ready for Storage/Cloud Target Map V2: ${report.summary.readyForStorageCloudTargetMapV2 ? 'yes' : 'no'}`);
  console.log(`Ready for runtime downloads: ${report.summary.readyForRuntimeDownloadActivation ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
