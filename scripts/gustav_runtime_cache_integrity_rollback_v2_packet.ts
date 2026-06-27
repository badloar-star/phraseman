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

type ServerManifestPreviewEntry = {
  runtimeSliceId: string;
  serverPath: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  schemaVersion: string;
  contentVersion: string;
  sha256: '{sha256}';
  byteSize: '{byteSize}';
  entryIndex: string;
  payloadShard: string;
  checksumReport: string;
  cacheKey: string;
  rollbackFromVersion: string;
  activationApproved: false;
  dependencies: {
    payloadMaterializationContractSha256: string;
    sliceChecksumContractSha256: string;
    targetPackManifestSha256: string;
  };
};

type ServerManifestPreviewPacket = {
  schemaVersion: 'gustav-server-delivery-manifest-preview-v2-packet-v0';
  status: Status;
  summary: {
    blockers: number;
    readyForRuntimeCacheIntegrityGate: boolean;
  };
  contract: {
    schemaVersion: 'gustav-server-delivery-manifest-preview-v2';
    runId: string;
    targetLocale: 'fr';
    studyTarget: 'fr';
    sourceLocales: Array<'ru' | 'uk'>;
    previewMode: 'dry_run_only';
    serverManifestPreviewEntries: ServerManifestPreviewEntry[];
    closedTransitions: {
      serverUploadAllowed: false;
      firebaseUploadAllowed: false;
      downloadablePacksPublished: false;
      serverManifestCreated: false;
      embeddedIndexInsertionAllowed: false;
      runtimeDownloadsEnabled: false;
      activationApproved: false;
      readyForApply: false;
      mayModifyProductionAppFiles: false;
    };
  };
};

type CacheIntegrityContract = {
  runtimeSliceId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  schemaVersion: string;
  contentVersion: string;
  cacheKey: string;
  requiredCacheKeyDimensions: string[];
  expectedCacheKeyTemplate: string;
  serverPath: string;
  sha256Placeholder: '{sha256}';
  byteSizePlaceholder: '{byteSize}';
  readyStateAllowedNow: false;
  cacheWriteAllowedNow: false;
  runtimeDownloadAllowedNow: false;
  activationApproved: false;
  integrityOutcomes: {
    checksumMatch: 'eligible_after_download_gate';
    checksumMismatch: 'corrupt_quarantine';
    byteSizeMismatch: 'corrupt_quarantine';
    sourceLocaleMismatch: 'reject_no_cache_write';
    studyTargetMismatch: 'reject_no_cache_write';
    staleContentVersion: 'stale_no_activation';
    missingNetwork: 'offline_fallback_requires_prior_known_good';
  };
  rollbackSimulation: {
    rollbackFromVersion: string;
    priorKnownGoodContentVersion: null;
    rollbackAvailableNow: false;
    rollbackRequiredBeforeActivation: true;
  };
  sourcePreviewEntrySha256: string;
};

type RuntimeCacheIntegrityContract = {
  schemaVersion: 'gustav-runtime-cache-integrity-rollback-v2';
  runId: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  simulationMode: 'dry_run_only';
  serverManifestPreviewPacketSha256: string;
  cacheStates: Array<'missing' | 'downloading' | 'ready' | 'corrupt' | 'stale' | 'offline_fallback'>;
  cacheIntegrityContracts: CacheIntegrityContract[];
  closedTransitions: {
    runtimeDownloadsEnabled: false;
    cacheWritesOpened: false;
    readyCacheStateOpened: false;
    serverUploadAllowed: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  nextRequiredGate: 'reviewer_decision_import_opening_preflight_v2';
};

type Report = {
  schemaVersion: 'gustav-runtime-cache-integrity-rollback-v2-packet-v0';
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
    targetLocale: 'fr';
    sourceLocales: number;
    simulationMode: 'dry_run_only';
    serverManifestPreviewReady: boolean;
    cacheStates: number;
    previewEntries: number;
    expectedPreviewEntries: number;
    cacheIntegrityContracts: number;
    cacheKeyDimensionContracts: number;
    readyStateBlockedContracts: number;
    cacheWriteBlockedContracts: number;
    runtimeDownloadBlockedContracts: number;
    checksumMismatchQuarantineContracts: number;
    byteSizeMismatchQuarantineContracts: number;
    sourceLocaleMismatchRejectContracts: number;
    studyTargetMismatchRejectContracts: number;
    staleVersionContracts: number;
    offlineFallbackRequiresPriorVersionContracts: number;
    rollbackSimulationContracts: number;
    uiLocaleIdentityDimensions: number;
    runtimeDownloadsEnabled: boolean;
    cacheWritesOpened: boolean;
    readyCacheStateOpened: boolean;
    serverUploadAllowed: boolean;
    activationApprovedFlags: number;
    readyForReviewerDecisionImportOpeningGate: boolean;
    readyForRuntimeDownloadActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  contract: RuntimeCacheIntegrityContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    runtimeCacheFilesWrittenByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_SOURCE_LOCALES = ['ru', 'uk'] as const;
const REQUIRED_SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'] as const;
const REQUIRED_CACHE_KEY_DIMENSIONS = ['studyTarget', 'sourceLocale', 'surface', 'schemaVersion', 'contentVersion', 'sha256'] as const;
const CACHE_STATES: RuntimeCacheIntegrityContract['cacheStates'] = ['missing', 'downloading', 'ready', 'corrupt', 'stale', 'offline_fallback'];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function rel(repoRoot: string, filePath: string): string {
  return normalizePath(path.relative(repoRoot, filePath));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

function hashObject(value: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function expectedSliceIds(): Set<string> {
  return new Set(REQUIRED_SOURCE_LOCALES.flatMap((sourceLocale) =>
    REQUIRED_SURFACES.map((surface) => `fr-${sourceLocale}-${surface}`),
  ));
}

function buildCacheContract(entry: ServerManifestPreviewEntry): CacheIntegrityContract {
  return {
    runtimeSliceId: entry.runtimeSliceId,
    studyTarget: entry.studyTarget,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    schemaVersion: entry.schemaVersion,
    contentVersion: entry.contentVersion,
    cacheKey: entry.cacheKey,
    requiredCacheKeyDimensions: [...REQUIRED_CACHE_KEY_DIMENSIONS],
    expectedCacheKeyTemplate: `fr/${entry.sourceLocale}/${entry.surface}/${entry.schemaVersion}/${entry.contentVersion}/{sha256}`,
    serverPath: entry.serverPath,
    sha256Placeholder: entry.sha256,
    byteSizePlaceholder: entry.byteSize,
    readyStateAllowedNow: false,
    cacheWriteAllowedNow: false,
    runtimeDownloadAllowedNow: false,
    activationApproved: false,
    integrityOutcomes: {
      checksumMatch: 'eligible_after_download_gate',
      checksumMismatch: 'corrupt_quarantine',
      byteSizeMismatch: 'corrupt_quarantine',
      sourceLocaleMismatch: 'reject_no_cache_write',
      studyTargetMismatch: 'reject_no_cache_write',
      staleContentVersion: 'stale_no_activation',
      missingNetwork: 'offline_fallback_requires_prior_known_good',
    },
    rollbackSimulation: {
      rollbackFromVersion: entry.rollbackFromVersion,
      priorKnownGoodContentVersion: null,
      rollbackAvailableNow: false,
      rollbackRequiredBeforeActivation: true,
    },
    sourcePreviewEntrySha256: hashObject(entry),
  };
}

function buildContract(packet: ServerManifestPreviewPacket, packetSha256: string): RuntimeCacheIntegrityContract {
  return {
    schemaVersion: 'gustav-runtime-cache-integrity-rollback-v2',
    runId: packet.contract.runId,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    simulationMode: 'dry_run_only',
    serverManifestPreviewPacketSha256: packetSha256,
    cacheStates: CACHE_STATES,
    cacheIntegrityContracts: packet.contract.serverManifestPreviewEntries.map(buildCacheContract),
    closedTransitions: {
      runtimeDownloadsEnabled: false,
      cacheWritesOpened: false,
      readyCacheStateOpened: false,
      serverUploadAllowed: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    nextRequiredGate: 'reviewer_decision_import_opening_preflight_v2',
  };
}

function cacheKeyHasUiLocale(contract: CacheIntegrityContract): boolean {
  return contract.cacheKey.toLowerCase().includes('uilocale') ||
    contract.cacheKey.toLowerCase().includes('interface_locale') ||
    contract.cacheKey.toLowerCase().includes('interfaceuilocale');
}

function cacheKeyValid(contract: CacheIntegrityContract): boolean {
  return contract.cacheKey === contract.expectedCacheKeyTemplate &&
    REQUIRED_CACHE_KEY_DIMENSIONS.every((dimension) => contract.requiredCacheKeyDimensions.includes(dimension));
}

function validateContract(contract: RuntimeCacheIntegrityContract): Finding[] {
  const findings: Finding[] = [];
  if (contract.targetLocale !== 'fr' || contract.studyTarget !== 'fr') {
    addFinding(findings, 'blocker', 'target_identity_mismatch', 'P16 is scoped to studyTarget=fr only.');
  }
  if (contract.simulationMode !== 'dry_run_only') {
    addFinding(findings, 'blocker', 'simulation_mode_not_dry_run', 'Runtime cache integrity gate must be dry-run only.');
  }
  for (const state of CACHE_STATES) {
    if (!contract.cacheStates.includes(state)) {
      addFinding(findings, 'blocker', 'cache_state_missing', `Cache state is missing from simulation: ${state}.`);
    }
  }
  if (
    contract.closedTransitions.runtimeDownloadsEnabled ||
    contract.closedTransitions.cacheWritesOpened ||
    contract.closedTransitions.readyCacheStateOpened ||
    contract.closedTransitions.serverUploadAllowed ||
    contract.closedTransitions.activationApproved ||
    contract.closedTransitions.readyForApply ||
    contract.closedTransitions.mayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'runtime_or_apply_transition_opened', 'P16 must not open runtime downloads, cache writes, ready cache state, upload, activation or apply.');
  }
  const expectedIds = expectedSliceIds();
  const ids = contract.cacheIntegrityContracts.map((entry) => entry.runtimeSliceId);
  if (ids.length !== expectedIds.size) {
    addFinding(findings, 'blocker', 'cache_contract_count_invalid', `Expected ${expectedIds.size} runtime cache contracts.`);
  }
  for (const expectedId of expectedIds) {
    if (!ids.includes(expectedId)) addFinding(findings, 'blocker', 'cache_contract_missing', `Missing cache integrity contract: ${expectedId}.`);
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) addFinding(findings, 'blocker', 'cache_contract_duplicate', `Duplicate cache integrity contract: ${id}.`);
    seen.add(id);
  }
  for (const entry of contract.cacheIntegrityContracts) {
    const expectedId = `${entry.studyTarget}-${entry.sourceLocale}-${entry.surface}`;
    if (entry.runtimeSliceId !== expectedId) {
      addFinding(findings, 'blocker', 'cache_contract_identity_mismatch', `Cache contract id does not match target/source/surface: ${entry.runtimeSliceId}.`);
    }
    if (entry.studyTarget !== 'fr') {
      addFinding(findings, 'blocker', 'cache_contract_target_mismatch', `Cache contract target must be fr: ${entry.runtimeSliceId}.`);
    }
    if (!REQUIRED_SOURCE_LOCALES.includes(entry.sourceLocale as (typeof REQUIRED_SOURCE_LOCALES)[number])) {
      addFinding(findings, 'blocker', 'cache_contract_source_locale_invalid', `Cache contract sourceLocale must be ru or uk: ${entry.runtimeSliceId}.`);
    }
    if (!REQUIRED_SURFACES.includes(entry.surface as (typeof REQUIRED_SURFACES)[number])) {
      addFinding(findings, 'blocker', 'cache_contract_surface_invalid', `Cache contract surface is invalid: ${entry.runtimeSliceId}.`);
    }
    if (!cacheKeyValid(entry)) {
      addFinding(findings, 'blocker', 'cache_key_contract_invalid', `Cache key is not fully target/source/surface/schema/content/sha scoped: ${entry.runtimeSliceId}.`);
    }
    if (cacheKeyHasUiLocale(entry)) {
      addFinding(findings, 'blocker', 'cache_key_uses_ui_locale', `Cache key must not use UI locale: ${entry.runtimeSliceId}.`);
    }
    if (entry.sha256Placeholder !== '{sha256}' || entry.byteSizePlaceholder !== '{byteSize}') {
      addFinding(findings, 'blocker', 'cache_integrity_placeholders_missing', `Cache integrity placeholders are missing: ${entry.runtimeSliceId}.`);
    }
    if (entry.readyStateAllowedNow || entry.cacheWriteAllowedNow || entry.runtimeDownloadAllowedNow || entry.activationApproved) {
      addFinding(findings, 'blocker', 'cache_contract_opened_too_early', `Cache contract opened runtime/cache/activation too early: ${entry.runtimeSliceId}.`);
    }
    if (
      entry.integrityOutcomes.checksumMismatch !== 'corrupt_quarantine' ||
      entry.integrityOutcomes.byteSizeMismatch !== 'corrupt_quarantine' ||
      entry.integrityOutcomes.sourceLocaleMismatch !== 'reject_no_cache_write' ||
      entry.integrityOutcomes.studyTargetMismatch !== 'reject_no_cache_write' ||
      entry.integrityOutcomes.staleContentVersion !== 'stale_no_activation' ||
      entry.integrityOutcomes.missingNetwork !== 'offline_fallback_requires_prior_known_good'
    ) {
      addFinding(findings, 'blocker', 'cache_integrity_outcome_unsafe', `Cache mismatch outcome is unsafe: ${entry.runtimeSliceId}.`);
    }
    if (!entry.rollbackSimulation.rollbackFromVersion || !entry.rollbackSimulation.rollbackRequiredBeforeActivation) {
      addFinding(findings, 'blocker', 'rollback_simulation_missing', `Rollback simulation is incomplete: ${entry.runtimeSliceId}.`);
    }
    if (entry.rollbackSimulation.rollbackAvailableNow || entry.rollbackSimulation.priorKnownGoodContentVersion !== null) {
      addFinding(findings, 'blocker', 'rollback_opened_without_prior_good', `Rollback must not be available without a prior known-good French version: ${entry.runtimeSliceId}.`);
    }
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbes(contract: RuntimeCacheIntegrityContract): Probe[] {
  const fixtures: Array<{ id: string; expectedAccept: boolean; mutate?: (draft: RuntimeCacheIntegrityContract) => void }> = [
    { id: 'canonical_runtime_cache_integrity_accepts', expectedAccept: true },
    { id: 'missing_cache_contract_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts.pop(); } },
    { id: 'duplicate_cache_contract_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts.push(clone(draft.cacheIntegrityContracts[0])); } },
    { id: 'wrong_target_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].studyTarget = 'en'; } },
    { id: 'wrong_source_locale_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].sourceLocale = 'en'; } },
    { id: 'cache_key_missing_sha256_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].cacheKey = draft.cacheIntegrityContracts[0].cacheKey.replace('/{sha256}', ''); } },
    { id: 'ui_locale_cache_dimension_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].cacheKey += '/{uiLocale}'; } },
    { id: 'checksum_mismatch_ready_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].integrityOutcomes.checksumMismatch = 'eligible_after_download_gate' as 'corrupt_quarantine'; } },
    { id: 'byte_size_mismatch_ready_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].integrityOutcomes.byteSizeMismatch = 'eligible_after_download_gate' as 'corrupt_quarantine'; } },
    { id: 'source_locale_mismatch_cache_write_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].integrityOutcomes.sourceLocaleMismatch = 'corrupt_quarantine' as 'reject_no_cache_write'; } },
    { id: 'ready_state_open_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].readyStateAllowedNow = true as false; } },
    { id: 'cache_write_open_rejected', expectedAccept: false, mutate: (draft) => { draft.closedTransitions.cacheWritesOpened = true as false; } },
    { id: 'runtime_downloads_open_rejected', expectedAccept: false, mutate: (draft) => { draft.closedTransitions.runtimeDownloadsEnabled = true as false; } },
    { id: 'rollback_without_metadata_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].rollbackSimulation.rollbackFromVersion = ''; } },
    { id: 'offline_fallback_without_prior_good_rejected', expectedAccept: false, mutate: (draft) => { draft.cacheIntegrityContracts[0].integrityOutcomes.missingNetwork = 'eligible_after_download_gate' as 'offline_fallback_requires_prior_known_good'; } },
    { id: 'activation_open_rejected', expectedAccept: false, mutate: (draft) => { draft.closedTransitions.activationApproved = true as false; } },
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
    '# Gustav Runtime Cache Integrity/Rollback V2 Packet',
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
    `- Simulation mode: ${report.summary.simulationMode}`,
    `- Preview entries: ${report.summary.previewEntries}/${report.summary.expectedPreviewEntries}`,
    `- Cache integrity contracts: ${report.summary.cacheIntegrityContracts}`,
    `- Cache key dimension contracts: ${report.summary.cacheKeyDimensionContracts}`,
    `- Ready state blocked contracts: ${report.summary.readyStateBlockedContracts}`,
    `- Checksum mismatch quarantine contracts: ${report.summary.checksumMismatchQuarantineContracts}`,
    `- Byte size mismatch quarantine contracts: ${report.summary.byteSizeMismatchQuarantineContracts}`,
    `- Source locale mismatch reject contracts: ${report.summary.sourceLocaleMismatchRejectContracts}`,
    `- Offline fallback requires prior version contracts: ${report.summary.offlineFallbackRequiresPriorVersionContracts}`,
    `- Rollback simulation contracts: ${report.summary.rollbackSimulationContracts}`,
    `- UI-locale identity dimensions: ${report.summary.uiLocaleIdentityDimensions}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Ready cache state opened: ${report.summary.readyCacheStateOpened ? 'yes' : 'no'}`,
    `- Activation approved flags: ${report.summary.activationApprovedFlags}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for reviewer decision import opening gate: ${report.summary.readyForReviewerDecisionImportOpeningGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Cache Contracts',
    '',
  ];
  for (const entry of report.contract.cacheIntegrityContracts) {
    lines.push(`- \`${entry.runtimeSliceId}\`: ${entry.cacheKey} | rollback=${entry.rollbackSimulation.rollbackFromVersion}`);
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
    '- This packet writes only aggregate Gustav audit artifacts.',
    '- It does not write runtime cache files.',
    '- It does not upload to Firebase/server.',
    '- It does not enable runtime downloads.',
    '- It does not approve activation or production apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_runtime_cache_integrity_rollback_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P16 runtime cache integrity/rollback gate is currently scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const serverPreviewPath = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const outJson = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const outMd = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.md');
  if (!fs.existsSync(serverPreviewPath)) {
    throw new Error(`Required P16 input is missing: ${rel(repoRoot, serverPreviewPath)}`);
  }

  const serverPreview = readJson<ServerManifestPreviewPacket>(serverPreviewPath);
  const serverPreviewSha256 = sha256(serverPreviewPath);
  const contract = buildContract(serverPreview, serverPreviewSha256);
  const validationFindings = validateContract(contract);
  const probes = makeProbes(contract);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...validationFindings];
  for (const probe of failedProbes) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  if (serverPreview.summary.blockers !== 0 || !serverPreview.summary.readyForRuntimeCacheIntegrityGate) {
    addFinding(findings, 'blocker', 'server_manifest_preview_prerequisite_not_ready', 'P15 server manifest preview must be ready before P16.', serverPreviewPath);
  }
  addFinding(
    findings,
    'info',
    'runtime_cache_integrity_dry_run_only',
    'P16 simulates cache integrity and rollback behavior only; it does not write cache files or enable downloads.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const entries = contract.cacheIntegrityContracts;
  const runtimeDownloadsEnabled = contract.closedTransitions.runtimeDownloadsEnabled;
  const cacheWritesOpened = contract.closedTransitions.cacheWritesOpened;
  const readyCacheStateOpened = contract.closedTransitions.readyCacheStateOpened;
  const serverUploadAllowed = contract.closedTransitions.serverUploadAllowed;
  const activationApprovedFlags =
    (contract.closedTransitions.activationApproved ? 1 : 0) +
    entries.filter((entry) => entry.activationApproved).length;

  const report: Report = {
    schemaVersion: 'gustav-runtime-cache-integrity-rollback-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, serverPreviewPath),
    },
    outputs: {
      runtimeCacheIntegrityRollbackV2PacketJson: rel(repoRoot, outJson),
      runtimeCacheIntegrityRollbackV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: contract.sourceLocales.length,
      simulationMode: contract.simulationMode,
      serverManifestPreviewReady: serverPreview.summary.blockers === 0 && serverPreview.summary.readyForRuntimeCacheIntegrityGate,
      cacheStates: contract.cacheStates.length,
      previewEntries: serverPreview.contract.serverManifestPreviewEntries.length,
      expectedPreviewEntries: expectedSliceIds().size,
      cacheIntegrityContracts: entries.length,
      cacheKeyDimensionContracts: entries.filter(cacheKeyValid).length,
      readyStateBlockedContracts: entries.filter((entry) => !entry.readyStateAllowedNow).length,
      cacheWriteBlockedContracts: entries.filter((entry) => !entry.cacheWriteAllowedNow).length,
      runtimeDownloadBlockedContracts: entries.filter((entry) => !entry.runtimeDownloadAllowedNow).length,
      checksumMismatchQuarantineContracts: entries.filter((entry) => entry.integrityOutcomes.checksumMismatch === 'corrupt_quarantine').length,
      byteSizeMismatchQuarantineContracts: entries.filter((entry) => entry.integrityOutcomes.byteSizeMismatch === 'corrupt_quarantine').length,
      sourceLocaleMismatchRejectContracts: entries.filter((entry) => entry.integrityOutcomes.sourceLocaleMismatch === 'reject_no_cache_write').length,
      studyTargetMismatchRejectContracts: entries.filter((entry) => entry.integrityOutcomes.studyTargetMismatch === 'reject_no_cache_write').length,
      staleVersionContracts: entries.filter((entry) => entry.integrityOutcomes.staleContentVersion === 'stale_no_activation').length,
      offlineFallbackRequiresPriorVersionContracts: entries.filter((entry) => entry.integrityOutcomes.missingNetwork === 'offline_fallback_requires_prior_known_good').length,
      rollbackSimulationContracts: entries.filter((entry) => Boolean(entry.rollbackSimulation.rollbackFromVersion) && entry.rollbackSimulation.rollbackRequiredBeforeActivation).length,
      uiLocaleIdentityDimensions: entries.filter(cacheKeyHasUiLocale).length,
      runtimeDownloadsEnabled,
      cacheWritesOpened,
      readyCacheStateOpened,
      serverUploadAllowed,
      activationApprovedFlags,
      readyForReviewerDecisionImportOpeningGate: blockers === 0,
      readyForRuntimeDownloadActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    artifactHashes: {
      serverDeliveryManifestPreviewV2Packet: serverPreviewSha256,
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      runtimeCacheFilesWrittenByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV runtime cache integrity/rollback V2 packet: ${report.status}`);
  console.log(`Cache contracts: ${report.summary.cacheIntegrityContracts}/${report.summary.expectedPreviewEntries}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for reviewer decision import opening gate: ${report.summary.readyForReviewerDecisionImportOpeningGate ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
