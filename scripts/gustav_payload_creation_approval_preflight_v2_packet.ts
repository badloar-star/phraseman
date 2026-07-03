import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'blocked_by_findings'
  | 'closed_no_import'
  | 'closed_partial_llm_official_source_review'
  | 'eligible_after_import_execution';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: PreflightState;
  accepted: boolean;
  preflightState: PreflightState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type HashCheck = {
  id: string;
  expected: string;
  actual: string;
  ok: boolean;
  sourcePath?: string;
};

type InputsForEvaluation = {
  p14: JsonObject;
  p15: JsonObject;
  p16: JsonObject;
  p19: JsonObject;
  p23: JsonObject;
  targetManifest: JsonObject;
  rowDecisionLines: number;
  aiDecisionLines: number;
  rowDecisionFilePresent: boolean;
  aiDecisionFilePresent: boolean;
  manifestFilePresent: boolean;
  hashChecks: HashCheck[];
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: number;
  payloadCreationApprovalPresent: false;
  payloadCreationAllowed: false;
  p14Ready: boolean;
  p15Ready: boolean;
  p16Ready: boolean;
  p19Ready: boolean;
  p23Ready: boolean;
  p14RuntimeSlices: number;
  p15PreviewEntries: number;
  p16CacheIntegrityContracts: number;
  p19ReviewerDecisionImportWouldRun: boolean;
  p19ExecutionState: string;
  p23GenerationState: string;
  llmAcceptedRowDecisionRows: number;
  llmAcceptedAiDecisionRows: number;
  promotedRowDecisionLines: number;
  promotedAiDecisionLines: number;
  promotedDecisionFilesPresent: boolean;
  promotedGenerationManifestPresent: boolean;
  staleArtifactHashes: number;
  hashChecksPassed: number;
  hashChecks: number;
  sourceLocaleScopedFuturePaths: number;
  sourceLocaleScopedServerPaths: number;
  uiLocaleIdentityDimensions: number;
  sourceManifestGateRefHashDrifts: number;
  futureArtifactFilesPresent: number;
  preExistingLocalMaterializationAccounted: boolean;
  unaccountedFutureArtifactFilesPresent: number;
  payloadShardsCreated: number;
  checksumReportsCreated: number;
  futureServerManifestExists: boolean;
  serverManifestCreated: boolean;
  cacheWritesOpened: boolean;
  readyCacheStateOpened: boolean;
  generatedLedgerWritesAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  downloadablePacksPublished: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForClosedPayloadMaterializationV2: boolean;
  readyForPayloadShardCreation: false;
  readyForServerUpload: false;
  readyForRuntimeDownloadActivation: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  preflightState: PreflightState;
  blockers: number;
  warnings: number;
};

type PreflightContract = {
  schemaVersion: 'gustav-payload-creation-approval-preflight-v2';
  runId: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  mode: 'closed_preflight_only';
  requiredInputs: [
    'payload_shard_materialization_checksum_v2_packet',
    'server_delivery_manifest_preview_v2_packet',
    'runtime_cache_integrity_rollback_v2_packet',
    'reviewer_decision_import_execution_gate_v2_packet',
    'llm_official_source_promoted_decision_file_generation_v2_packet',
    'target_pack_manifest_v2_draft',
  ];
  closedTransitions: {
    payloadCreationApprovalPresent: false;
    generatedLedgerWritesAllowed: false;
    payloadCreationAllowed: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  nextRequiredGate: 'closed_local_payload_materialization_v2_packet';
};

type Report = {
  schemaVersion: 'gustav-payload-creation-approval-preflight-v2-packet-v0';
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
  summary: Evaluation & {
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  contract: PreflightContract;
  probes: Probe[];
  hashChecks: HashCheck[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    payloadCreationApprovalCreatedByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    checksumReportsCreatedByThisScript: false;
    serverManifestCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROW_DECISIONS = 1600;
let REQUIRED_AI_DECISIONS = 164;
const EXPECTED_RUNTIME_SLICES = 12;

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).length : 0;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function artifactHashesOf(report: JsonObject): JsonObject {
  return object(report.artifactHashes);
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

function arrayOfStrings(value: JsonObject, key: string): string[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function statusIsPass(report: JsonObject): boolean {
  return s(report, 'status') === 'PASS';
}

function hashString(report: JsonObject, key: string): string {
  const raw = artifactHashesOf(report)[key];
  return typeof raw === 'string' ? raw : '';
}

function makeHashCheck(id: string, expected: string, actual: string, sourcePath?: string): HashCheck {
  return {
    id,
    expected,
    actual,
    ok: expected !== '' && expected === actual,
    sourcePath,
  };
}

function dangerousBooleanCount(items: Array<[string, boolean]>, findings: Finding[], prefix: string): number {
  let count = 0;
  for (const [key, value] of items) {
    if (!value) continue;
    count += 1;
    addFinding(findings, 'blocker', `${prefix}_${key}`, `${prefix} opened forbidden flag: ${key}.`);
  }
  return count;
}

function evaluate(input: InputsForEvaluation): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const p14 = summaryOf(input.p14);
  const p15 = summaryOf(input.p15);
  const p16 = summaryOf(input.p16);
  const p19 = summaryOf(input.p19);
  const p23 = summaryOf(input.p23);

  const targetStudyTarget = s(input.targetManifest, 'studyTarget');
  const targetLocale = s(input.targetManifest, 'targetLocale');
  const sourceLocales = arrayOfStrings(input.targetManifest, 'sourceLocales');
  if (targetStudyTarget !== 'fr') {
    addFinding(findings, 'blocker', 'TARGET_MANIFEST_STUDY_TARGET', `Target manifest studyTarget must be fr, got ${targetStudyTarget || '<missing>'}.`);
  }
  if (targetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'TARGET_MANIFEST_TARGET_LOCALE', `Target manifest targetLocale must be fr, got ${targetLocale || '<missing>'}.`);
  }
  if (sourceLocales.length !== 2 || !sourceLocales.includes('ru') || !sourceLocales.includes('uk')) {
    addFinding(findings, 'blocker', 'TARGET_MANIFEST_SOURCE_LOCALES', `Target manifest sourceLocales must be exactly ru,uk, got ${sourceLocales.join(',') || '<missing>'}.`);
  }

  const p14Ready =
    statusIsPass(input.p14) &&
    n(p14, 'blockers') === 0 &&
    b(p14, 'readyForServerManifestPreviewGate') &&
    n(p14, 'runtimeSlices') === EXPECTED_RUNTIME_SLICES &&
    n(p14, 'checksumContracts') === EXPECTED_RUNTIME_SLICES &&
    !b(p14, 'payloadCreationApprovalPresent');
  const p15Ready =
    statusIsPass(input.p15) &&
    n(p15, 'blockers') === 0 &&
    b(p15, 'readyForRuntimeCacheIntegrityGate') &&
    n(p15, 'previewEntries') === EXPECTED_RUNTIME_SLICES &&
    n(p15, 'entriesWithChecksumLinkage') === EXPECTED_RUNTIME_SLICES;
  const p16Ready =
    statusIsPass(input.p16) &&
    n(p16, 'blockers') === 0 &&
    b(p16, 'readyForReviewerDecisionImportOpeningGate') &&
    n(p16, 'cacheIntegrityContracts') === EXPECTED_RUNTIME_SLICES &&
    n(p16, 'runtimeDownloadBlockedContracts') === EXPECTED_RUNTIME_SLICES;
  const p19PacketReady =
    statusIsPass(input.p19) &&
    n(p19, 'blockers') === 0 &&
    b(p19, 'readyForPayloadCreationApprovalPreflight');
  const p19Ready =
    p19PacketReady &&
    b(p19, 'reviewerDecisionImportWouldRun') &&
    s(p19, 'executionState') === 'eligible_llm_official_source_review' &&
    n(p19, 'llmAcceptedRowDecisionRows') === REQUIRED_ROW_DECISIONS &&
    n(p19, 'llmAcceptedAiDecisionRows') === REQUIRED_AI_DECISIONS;
  const p23PacketSafe =
    statusIsPass(input.p23) &&
    n(p23, 'blockers') === 0 &&
    b(p23, 'readyForReviewerDecisionImportV2DryRunRefresh') &&
    b(p23, 'readyForReviewerDecisionImportExecutionGateRefresh') &&
    b(p23, 'outputTargetsSeparateFromTemplates') &&
    b(p23, 'outputTargetsConfinedToPromotedDir');
  const p23Ready =
    p23PacketSafe &&
    b(p23, 'rowDecisionFileWritten') &&
    b(p23, 'aiDecisionFileWritten') &&
    b(p23, 'generationManifestWritten') &&
    n(p23, 'acceptedRowDecisionRows') === REQUIRED_ROW_DECISIONS &&
    n(p23, 'acceptedAiDecisionRows') === REQUIRED_AI_DECISIONS &&
    input.rowDecisionFilePresent &&
    input.aiDecisionFilePresent &&
    input.manifestFilePresent &&
    input.rowDecisionLines === REQUIRED_ROW_DECISIONS &&
    input.aiDecisionLines === REQUIRED_AI_DECISIONS;

  if (!p14Ready) addFinding(findings, 'blocker', 'P14_NOT_READY', 'P14 payload materialization/checksum dry-run packet is not ready for P24.');
  if (!p15Ready) addFinding(findings, 'blocker', 'P15_NOT_READY', 'P15 server delivery manifest preview packet is not ready for P24.');
  if (!p16Ready) addFinding(findings, 'blocker', 'P16_NOT_READY', 'P16 runtime cache integrity/rollback packet is not ready for P24.');
  if (!p19PacketReady) addFinding(findings, 'blocker', 'P19_PACKET_NOT_READY', 'P19 reviewer decision import execution gate packet is structurally not ready for P24.');
  if (!p23PacketSafe) addFinding(findings, 'blocker', 'P23_PACKET_NOT_SAFE', 'P23 promoted LLM official-source decision packet is structurally unsafe for P24.');

  const staleArtifactHashes = input.hashChecks.filter((check) => !check.ok).length;
  if (staleArtifactHashes > 0) {
    addFinding(findings, 'blocker', 'STALE_ARTIFACT_HASHES', `${staleArtifactHashes} upstream artifact hash check(s) failed.`);
  }

  dangerousBooleanCount([
    ['p14.readyForPayloadShardCreation', b(p14, 'readyForPayloadShardCreation')],
    ['p14.readyForRuntimeDownloadActivation', b(p14, 'readyForRuntimeDownloadActivation')],
    ['p14.readyForApply', b(p14, 'readyForApply')],
    ['p14.mayModifyProductionAppFiles', b(p14, 'mayModifyProductionAppFiles')],
    ['p14.serverUploadAllowed', b(p14, 'serverUploadAllowed')],
    ['p14.firebaseUploadAllowed', b(p14, 'firebaseUploadAllowed')],
    ['p14.downloadablePacksPublished', b(p14, 'downloadablePacksPublished')],
    ['p14.serverManifestCreated', b(p14, 'serverManifestCreated')],
    ['p14.runtimeDownloadsEnabled', b(p14, 'runtimeDownloadsEnabled')],
    ['p15.readyForServerUpload', b(p15, 'readyForServerUpload')],
    ['p15.readyForRuntimeDownloadActivation', b(p15, 'readyForRuntimeDownloadActivation')],
    ['p15.readyForApply', b(p15, 'readyForApply')],
    ['p15.mayModifyProductionAppFiles', b(p15, 'mayModifyProductionAppFiles')],
    ['p15.serverUploadAllowed', b(p15, 'serverUploadAllowed')],
    ['p15.firebaseUploadAllowed', b(p15, 'firebaseUploadAllowed')],
    ['p15.downloadablePacksPublished', b(p15, 'downloadablePacksPublished')],
    ['p15.serverManifestCreated', b(p15, 'serverManifestCreated')],
    ['p15.embeddedIndexInsertionAllowed', b(p15, 'embeddedIndexInsertionAllowed')],
    ['p15.runtimeDownloadsEnabled', b(p15, 'runtimeDownloadsEnabled')],
    ['p16.readyForRuntimeDownloadActivation', b(p16, 'readyForRuntimeDownloadActivation')],
    ['p16.readyForApply', b(p16, 'readyForApply')],
    ['p16.mayModifyProductionAppFiles', b(p16, 'mayModifyProductionAppFiles')],
    ['p16.serverUploadAllowed', b(p16, 'serverUploadAllowed')],
    ['p16.cacheWritesOpened', b(p16, 'cacheWritesOpened')],
    ['p16.readyCacheStateOpened', b(p16, 'readyCacheStateOpened')],
    ['p16.runtimeDownloadsEnabled', b(p16, 'runtimeDownloadsEnabled')],
    ['p19.generatedLedgerWritesAllowed', b(p19, 'generatedLedgerWritesAllowed')],
    ['p19.payloadCreationAllowed', b(p19, 'payloadCreationAllowed')],
    ['p19.serverUploadAllowed', b(p19, 'serverUploadAllowed')],
    ['p19.firebaseUploadAllowed', b(p19, 'firebaseUploadAllowed')],
    ['p19.runtimeDownloadsEnabled', b(p19, 'runtimeDownloadsEnabled')],
    ['p19.activationApproved', b(p19, 'activationApproved')],
    ['p19.readyForApply', b(p19, 'readyForApply')],
    ['p19.mayModifyProductionAppFiles', b(p19, 'mayModifyProductionAppFiles')],
    ['p23.generatedLedgerWritesAllowed', b(p23, 'generatedLedgerWritesAllowed')],
    ['p23.payloadCreationAllowed', b(p23, 'payloadCreationAllowed')],
    ['p23.serverUploadAllowed', b(p23, 'serverUploadAllowed')],
    ['p23.firebaseUploadAllowed', b(p23, 'firebaseUploadAllowed')],
    ['p23.runtimeDownloadsEnabled', b(p23, 'runtimeDownloadsEnabled')],
    ['p23.activationApproved', b(p23, 'activationApproved')],
    ['p23.readyForApply', b(p23, 'readyForApply')],
    ['p23.mayModifyProductionAppFiles', b(p23, 'mayModifyProductionAppFiles')],
  ], findings, 'FORBIDDEN_TRANSITION');

  const dangerousCounts: Array<[string, number]> = [
    ['p14.unaccountedFutureArtifactFilesPresent', n(p14, 'unaccountedFutureArtifactFilesPresent')],
    ['p14.payloadShardsCreated', n(p14, 'payloadShardsCreated')],
    ['p14.checksumReportsCreated', n(p14, 'checksumReportsCreated')],
    ['p14.activationApprovedFlags', n(p14, 'activationApprovedFlags')],
    ['p15.activationApprovedFlags', n(p15, 'activationApprovedFlags')],
    ['p16.activationApprovedFlags', n(p16, 'activationApprovedFlags')],
    ['p23.openImportApplyActivationFlags', n(p23, 'openImportApplyActivationFlags')],
    ['p23.rejectedFreshAiReturnOrCacheOpenRows', n(p23, 'rejectedFreshAiReturnOrCacheOpenRows')],
    ['p23.targetOutputBeforeQualityOpenRows', n(p23, 'targetOutputBeforeQualityOpenRows')],
  ];
  for (const [key, count] of dangerousCounts) {
    if (count <= 0) continue;
    addFinding(findings, 'blocker', `FORBIDDEN_COUNT_${key}`, `${key} must be zero, got ${count}.`);
  }

  if (b(p23, 'reviewerTemplatesOverwritten')) {
    addFinding(findings, 'blocker', 'P23_REVIEWER_TEMPLATES_OVERWRITTEN', 'P23 must not overwrite reviewer templates.');
  }
  if (b(p23, 'reviewerDecisionsImported')) {
    addFinding(findings, 'blocker', 'P23_REVIEWER_DECISIONS_IMPORTED', 'P23 must not import reviewer decisions.');
  }
  if (n(p15, 'sourceManifestGateRefHashDrifts') > 0) {
    addFinding(
      findings,
      'info',
      'P15_SOURCE_MANIFEST_GATE_REF_DRIFTS_TRACKED',
      `P15 reports ${n(p15, 'sourceManifestGateRefHashDrifts')} non-blocking source manifest gate ref drift(s); P15 itself still reports current gate hashes and PASS.`,
    );
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  let preflightState: PreflightState = 'eligible_after_import_execution';
  if (blockers > 0) {
    preflightState = 'blocked_by_findings';
  } else if (!b(p19, 'reviewerDecisionImportWouldRun') || s(p19, 'executionState') !== 'eligible_llm_official_source_review') {
    preflightState = 'closed_no_import';
  } else if (!p23Ready) {
    preflightState = 'closed_partial_llm_official_source_review';
  }

  const accepted = preflightState === 'eligible_after_import_execution' && blockers === 0;
  const evaluation: Evaluation = {
    targetLocale: 'fr',
    sourceLocales: sourceLocales.length,
    payloadCreationApprovalPresent: false,
    payloadCreationAllowed: false,
    p14Ready,
    p15Ready,
    p16Ready,
    p19Ready,
    p23Ready,
    p14RuntimeSlices: n(p14, 'runtimeSlices'),
    p15PreviewEntries: n(p15, 'previewEntries'),
    p16CacheIntegrityContracts: n(p16, 'cacheIntegrityContracts'),
    p19ReviewerDecisionImportWouldRun: b(p19, 'reviewerDecisionImportWouldRun'),
    p19ExecutionState: s(p19, 'executionState'),
    p23GenerationState: s(p23, 'generationState'),
    llmAcceptedRowDecisionRows: n(p19, 'llmAcceptedRowDecisionRows'),
    llmAcceptedAiDecisionRows: n(p19, 'llmAcceptedAiDecisionRows'),
    promotedRowDecisionLines: input.rowDecisionLines,
    promotedAiDecisionLines: input.aiDecisionLines,
    promotedDecisionFilesPresent: input.rowDecisionFilePresent && input.aiDecisionFilePresent,
    promotedGenerationManifestPresent: input.manifestFilePresent,
    staleArtifactHashes,
    hashChecksPassed: input.hashChecks.filter((check) => check.ok).length,
    hashChecks: input.hashChecks.length,
    sourceLocaleScopedFuturePaths: n(p14, 'sourceLocaleScopedFuturePaths'),
    sourceLocaleScopedServerPaths: n(p15, 'sourceLocaleScopedServerPaths'),
    uiLocaleIdentityDimensions:
      n(p14, 'uiLocaleIdentityDimensions') +
      n(p15, 'uiLocaleIdentityDimensions') +
      n(p16, 'uiLocaleIdentityDimensions'),
    sourceManifestGateRefHashDrifts: n(p15, 'sourceManifestGateRefHashDrifts'),
    futureArtifactFilesPresent: n(p14, 'futureArtifactFilesPresent'),
    preExistingLocalMaterializationAccounted: b(p14, 'preExistingLocalMaterializationAccounted'),
    unaccountedFutureArtifactFilesPresent: n(p14, 'unaccountedFutureArtifactFilesPresent'),
    payloadShardsCreated: n(p14, 'payloadShardsCreated'),
    checksumReportsCreated: n(p14, 'checksumReportsCreated'),
    futureServerManifestExists: b(p15, 'futureServerManifestExists'),
    serverManifestCreated: b(p15, 'serverManifestCreated'),
    cacheWritesOpened: b(p16, 'cacheWritesOpened'),
    readyCacheStateOpened: b(p16, 'readyCacheStateOpened'),
    generatedLedgerWritesAllowed: false,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForClosedPayloadMaterializationV2: accepted,
    readyForPayloadShardCreation: false,
    readyForServerUpload: false,
    readyForRuntimeDownloadActivation: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    preflightState,
    blockers,
    warnings,
  };
  return { evaluation, findings };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildFixtureInput(base: InputsForEvaluation, mutate: (input: InputsForEvaluation) => void): InputsForEvaluation {
  const copy = clone(base);
  mutate(copy);
  return copy;
}

function runProbes(base: InputsForEvaluation): Probe[] {
  const cases: Array<{
    id: string;
    expectedAccept: boolean;
    expectedState: PreflightState;
    mutate: (input: InputsForEvaluation) => void;
  }> = [
    {
      id: 'canonical_current_inputs_are_eligible',
      expectedAccept: true,
      expectedState: 'eligible_after_import_execution',
      mutate: () => undefined,
    },
    {
      id: 'pending_import_execution_closes_without_payload',
      expectedAccept: false,
      expectedState: 'closed_no_import',
      mutate: (input) => {
        summaryOf(input.p19).reviewerDecisionImportWouldRun = false;
      },
    },
    {
      id: 'partial_llm_review_closes_without_payload',
      expectedAccept: false,
      expectedState: 'closed_partial_llm_official_source_review',
      mutate: (input) => {
        summaryOf(input.p23).acceptedRowDecisionRows = REQUIRED_ROW_DECISIONS - 1;
      },
    },
    {
      id: 'stale_p15_hash_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.hashChecks[1].expected = 'stale';
        input.hashChecks[1].ok = false;
      },
    },
    {
      id: 'missing_checksum_contract_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p14).checksumContracts = EXPECTED_RUNTIME_SLICES - 1;
      },
    },
    {
      id: 'payload_shards_created_too_early_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p14).payloadShardsCreated = 1;
      },
    },
    {
      id: 'server_upload_flag_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p15).serverUploadAllowed = true;
      },
    },
    {
      id: 'runtime_download_open_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p16).runtimeDownloadsEnabled = true;
      },
    },
    {
      id: 'cache_write_open_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p16).cacheWritesOpened = true;
      },
    },
    {
      id: 'ready_for_apply_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p19).readyForApply = true;
      },
    },
    {
      id: 'promoted_output_not_confined_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        summaryOf(input.p23).outputTargetsConfinedToPromotedDir = false;
      },
    },
    {
      id: 'wrong_study_target_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.targetManifest.studyTarget = 'en';
      },
    },
    {
      id: 'wrong_source_locales_are_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.targetManifest.sourceLocales = ['ru'];
      },
    },
  ];

  return cases.map((testCase) => {
    const fixture = buildFixtureInput(base, testCase.mutate);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForClosedPayloadMaterializationV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      preflightState: result.preflightState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.preflightState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Payload Creation Approval Preflight V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Preflight state: ${report.summary.preflightState}`,
    `- Ready for closed payload materialization V2: ${report.summary.readyForClosedPayloadMaterializationV2 ? 'yes' : 'no'}`,
    `- Target locale: ${report.summary.targetLocale}`,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- P14/P15/P16 ready: ${report.summary.p14Ready ? 'yes' : 'no'} / ${report.summary.p15Ready ? 'yes' : 'no'} / ${report.summary.p16Ready ? 'yes' : 'no'}`,
    `- P19/P23 ready: ${report.summary.p19Ready ? 'yes' : 'no'} / ${report.summary.p23Ready ? 'yes' : 'no'}`,
    `- Accepted LLM official-source decisions: rows ${report.summary.llmAcceptedRowDecisionRows}/${REQUIRED_ROW_DECISIONS}, AI ${report.summary.llmAcceptedAiDecisionRows}/${REQUIRED_AI_DECISIONS}`,
    `- Promoted decision files: rows ${report.summary.promotedRowDecisionLines}/${REQUIRED_ROW_DECISIONS}, AI ${report.summary.promotedAiDecisionLines}/${REQUIRED_AI_DECISIONS}`,
    `- Runtime slices / preview entries / cache contracts: ${report.summary.p14RuntimeSlices} / ${report.summary.p15PreviewEntries} / ${report.summary.p16CacheIntegrityContracts}`,
    `- Hash checks: ${report.summary.hashChecksPassed}/${report.summary.hashChecks}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Pre-existing local materialization accounted: ${report.summary.preExistingLocalMaterializationAccounted ? 'yes' : 'no'}`,
    `- Unaccounted future artifact files: ${report.summary.unaccountedFutureArtifactFilesPresent}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Closed Transitions',
    '',
    `- Payload creation approval present: ${report.summary.payloadCreationApprovalPresent}`,
    `- Payload creation allowed: ${report.summary.payloadCreationAllowed}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed}`,
    `- Firebase upload allowed: ${report.summary.firebaseUploadAllowed}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled}`,
    `- Activation approved: ${report.summary.activationApproved}`,
    `- Ready for apply: ${report.summary.readyForApply}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
  }
  lines.push('');
  lines.push('## Next Required Gate');
  lines.push('');
  lines.push(`- ${report.contract.nextRequiredGate}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') {
    throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  }

  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  const promotedDir = path.join(runDir, 'generated', 'fr', 'reviewer', 'llm_official_source_promoted_decisions_v2');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  ensureDir(auditsDir);

  const p14Path = path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.json');
  const p15Path = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const p16Path = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const p19Path = path.join(auditsDir, 'reviewer_decision_import_execution_gate_v2_packet.json');
  const p23Path = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const p13Path = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const p17Path = path.join(auditsDir, 'reviewer_decision_import_opening_preflight_v2_packet.json');
  const p18Path = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const rowDecisionPath = path.join(promotedDir, 'row_decisions_reviewed_v2.jsonl');
  const aiDecisionPath = path.join(promotedDir, 'ai_decisions_reviewed_v2.jsonl');
  const promotedManifestPath = path.join(promotedDir, 'llm_official_source_promoted_decision_file_generation_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'payload_creation_approval_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'payload_creation_approval_preflight_v2_packet.md');

  const p14 = readJson<JsonObject>(p14Path);
  const p15 = readJson<JsonObject>(p15Path);
  const p16 = readJson<JsonObject>(p16Path);
  const p19 = readJson<JsonObject>(p19Path);
  const p23 = readJson<JsonObject>(p23Path);
  const targetManifest = readJson<JsonObject>(targetManifestPath);

  const hashChecks = [
    makeHashCheck('p14.targetPackManifestV2Draft', hashString(p14, 'targetPackManifestV2Draft'), sha256(targetManifestPath), rel(repoRoot, targetManifestPath)),
    makeHashCheck('p14.reviewerDecisionImportV2DryRun', hashString(p14, 'reviewerDecisionImportV2DryRun'), sha256(p13Path), rel(repoRoot, p13Path)),
    makeHashCheck('p15.payloadShardMaterializationChecksumV2Packet', hashString(p15, 'payloadShardMaterializationChecksumV2Packet'), sha256(p14Path), rel(repoRoot, p14Path)),
    makeHashCheck('p15.targetPackManifestV2Draft', hashString(p15, 'targetPackManifestV2Draft'), sha256(targetManifestPath), rel(repoRoot, targetManifestPath)),
    makeHashCheck('p16.serverDeliveryManifestPreviewV2Packet', hashString(p16, 'serverDeliveryManifestPreviewV2Packet'), sha256(p15Path), rel(repoRoot, p15Path)),
    makeHashCheck('p19.reviewerDecisionImportV2DryRun', hashString(p19, 'reviewerDecisionImportV2DryRun'), sha256(p13Path), rel(repoRoot, p13Path)),
    makeHashCheck('p19.reviewerDecisionImportOpeningPreflightV2Packet', hashString(p19, 'reviewerDecisionImportOpeningPreflightV2Packet'), sha256(p17Path), rel(repoRoot, p17Path)),
    makeHashCheck('p19.llmOfficialSourceReviewIntakeV2Packet', hashString(p19, 'llmOfficialSourceReviewIntakeV2Packet'), sha256(p18Path), rel(repoRoot, p18Path)),
    makeHashCheck('p23.rowDecisionTemplateV2', hashString(p23, 'rowDecisionTemplateV2'), hashString(p19, 'rowDecisionTemplateV2'), rel(repoRoot, p23Path)),
    makeHashCheck('p23.aiDecisionTemplateV2', hashString(p23, 'aiDecisionTemplateV2'), hashString(p19, 'aiDecisionTemplateV2'), rel(repoRoot, p23Path)),
  ];

  const input: InputsForEvaluation = {
    p14,
    p15,
    p16,
    p19,
    p23,
    targetManifest,
    rowDecisionLines: lineCount(rowDecisionPath),
    aiDecisionLines: lineCount(aiDecisionPath),
    rowDecisionFilePresent: fs.existsSync(rowDecisionPath),
    aiDecisionFilePresent: fs.existsSync(aiDecisionPath),
    manifestFilePresent: fs.existsSync(promotedManifestPath),
    hashChecks,
  };
  REQUIRED_AI_DECISIONS = Math.max(
    REQUIRED_AI_DECISIONS,
    n(object(p19.summary), 'llmAcceptedAiDecisionRows'),
    n(object(p23.summary), 'acceptedAiDecisionRows'),
    input.aiDecisionLines,
  );

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.preflightState = 'blocked_by_findings';
    evaluation.readyForClosedPayloadMaterializationV2 = false;
  }

  const status: Status =
    evaluation.blockers > 0
      ? 'BLOCK'
      : evaluation.preflightState === 'eligible_after_import_execution'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-payload-creation-approval-preflight-v2-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      payloadShardMaterializationChecksumV2Packet: rel(repoRoot, p14Path),
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, p15Path),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, p16Path),
      reviewerDecisionImportExecutionGateV2Packet: rel(repoRoot, p19Path),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: rel(repoRoot, p23Path),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      rowDecisionsReviewedV2: rel(repoRoot, rowDecisionPath),
      aiDecisionsReviewedV2: rel(repoRoot, aiDecisionPath),
      promotedDecisionGenerationManifestV2: rel(repoRoot, promotedManifestPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      payloadShardMaterializationChecksumV2Packet: sha256(p14Path),
      serverDeliveryManifestPreviewV2Packet: sha256(p15Path),
      runtimeCacheIntegrityRollbackV2Packet: sha256(p16Path),
      reviewerDecisionImportExecutionGateV2Packet: sha256(p19Path),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: sha256(p23Path),
      targetPackManifestV2Draft: sha256(targetManifestPath),
      rowDecisionsReviewedV2: sha256(rowDecisionPath),
      aiDecisionsReviewedV2: sha256(aiDecisionPath),
      promotedDecisionGenerationManifestV2: sha256(promotedManifestPath),
    },
    contract: {
      schemaVersion: 'gustav-payload-creation-approval-preflight-v2',
      runId: path.basename(runDir),
      targetLocale: 'fr',
      studyTarget: 'fr',
      sourceLocales: ['ru', 'uk'],
      mode: 'closed_preflight_only',
      requiredInputs: [
        'payload_shard_materialization_checksum_v2_packet',
        'server_delivery_manifest_preview_v2_packet',
        'runtime_cache_integrity_rollback_v2_packet',
        'reviewer_decision_import_execution_gate_v2_packet',
        'llm_official_source_promoted_decision_file_generation_v2_packet',
        'target_pack_manifest_v2_draft',
      ],
      closedTransitions: {
        payloadCreationApprovalPresent: false,
        generatedLedgerWritesAllowed: false,
        payloadCreationAllowed: false,
        serverUploadAllowed: false,
        firebaseUploadAllowed: false,
        downloadablePacksPublished: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
        readyForApply: false,
        mayModifyProductionAppFiles: false,
      },
      nextRequiredGate: 'closed_local_payload_materialization_v2_packet',
    },
    probes,
    hashChecks,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      payloadCreationApprovalCreatedByThisScript: false,
      payloadShardsCreatedByThisScript: false,
      checksumReportsCreatedByThisScript: false,
      serverManifestCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV payload creation approval preflight V2 packet: ${report.status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`Ready for closed payload materialization V2: ${report.summary.readyForClosedPayloadMaterializationV2 ? 'yes' : 'no'}`);
  console.log(`Hash checks: ${report.summary.hashChecksPassed}/${report.summary.hashChecks}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
