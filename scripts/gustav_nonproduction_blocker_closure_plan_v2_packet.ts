import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type WorkMode = 'safe_nonproduction' | 'exact_approval_only' | 'production_locked';

type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type SourceArtifact = {
  id: string;
  path: string;
  exists: boolean;
  status: string;
  blockers: number;
  warnings: number;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  state: string;
};

type ChainArtifact = SourceArtifact & {
  expectedStatus: 'PASS' | 'HOLD';
  ready: boolean;
};

type ClosureItem = {
  id: string;
  priority: number;
  mode: WorkMode;
  title: string;
  canDoNow: boolean;
  requiresExactApproval: boolean;
  mayModifyProductionAppFiles: false;
  blockedProductionActions: string[];
  sourceArtifacts: string[];
  evidence: string[];
  nextAction: string;
  verificationGates: string[];
  doneWhen: string[];
};

type SafetyInput = {
  chainReady: boolean;
  p32SafeHoldReady: boolean;
  languageIsolationPass: boolean;
  runValidatorPass: boolean;
  brainGatePass: boolean;
  masterBlockers: number;
  readinessApplyBlockers: number;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  productionApplyDenied: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  productionWritesAllowed: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  downloadablePacksPublished: boolean;
  activationApproved: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
};

type Probe = {
  id: string;
  expectedSafe: boolean;
  safe: boolean;
  blockers: number;
  passed: boolean;
};

type Report = {
  schemaVersion: 'gustav-nonproduction-blocker-closure-plan-v2-packet-v0';
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
    sourceLocales: ['ru', 'uk'];
    planState: 'nonproduction_closure_plan_ready' | 'blocked_by_findings';
    p18p32ArtifactsExpected: number;
    p18p32ArtifactsPresent: number;
    p18p32ArtifactsReady: number;
    p18p32PassArtifacts: number;
    p18p32HoldArtifacts: number;
    p18p32ChainReady: boolean;
    p32SafeHoldReady: boolean;
    productionApplyDenied: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    canContinueNonProductionAudit: boolean;
    readinessDecision: string;
    readinessFailedChecks: number;
    readinessGenerationBlockers: number;
    readinessApplyBlockers: number;
    canStartFrenchGenerationInClosedRun: boolean;
    masterStatus: string;
    masterBlockers: number;
    masterActionableBlockers: number;
    masterExpectedDownstreamBlockers: number;
    masterWarnings: number;
    languageIsolationPass: boolean;
    languageIsolationBlockers: number;
    languageIsolationWarnings: number;
    runValidatorPass: boolean;
    runValidatorBlockers: number;
    brainGateDecision: string;
    brainGateReadinessPercent: number;
    brainGateGenerationBlocked: boolean;
    brainGateApplyBlocked: boolean;
    brainGateReport: string;
    serverManifestEntries: number;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    downloadablePacksPublished: boolean;
    serverEntriesReadyForApplyOpen: number;
    targetManifestActivationApproved: boolean;
    targetManifestReadyForApply: boolean;
    targetManifestMayModifyProductionAppFiles: boolean;
    targetManifestReadyForStorageCloudMigration: boolean;
    safeNonProductionItems: number;
    exactApprovalOnlyItems: number;
    productionLockedItems: number;
    recommendedNextSafeItem: string;
    readyForNextNonProductionPass: boolean;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    productionWritesAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  chainArtifacts: ChainArtifact[];
  closureItems: ClosureItem[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

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
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
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

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function firstState(summary: JsonObject): string {
  return [
    'state',
    'intakeState',
    'executionState',
    'materializationState',
    'dryRunState',
    'promotionState',
    'generationState',
    'preflightState',
    'publishPreflightState',
    'planState',
    'gateState',
    'requestState',
    'receiptCreationState',
    'denialState',
    'openingState',
  ].map((key) => s(summary, key)).find((value) => value !== '') ?? '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sourceArtifact(repoRoot: string, id: string, filePath: string): SourceArtifact {
  if (!fs.existsSync(filePath)) {
    return {
      id,
      path: rel(repoRoot, filePath),
      exists: false,
      status: 'MISSING',
      blockers: 0,
      warnings: 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      state: '',
    };
  }
  const report = readJson<JsonObject>(filePath);
  const summary = summaryOf(report);
  return {
    id,
    path: rel(repoRoot, filePath),
    exists: true,
    status: s(report, 'status') || s(report, 'decision'),
    blockers: n(summary, 'blockers'),
    warnings: n(summary, 'warnings'),
    readyForApply: b(summary, 'readyForApply'),
    mayModifyProductionAppFiles: b(summary, 'mayModifyProductionAppFiles'),
    state: firstState(summary),
  };
}

function latestBrainGateReport(repoRoot: string): { relativePath: string; report: JsonObject } {
  const docsDir = path.join(repoRoot, 'docs', 'gustav');
  if (!fs.existsSync(docsDir)) return { relativePath: '', report: {} };
  const entries = fs.readdirSync(docsDir)
    .filter((name) => /^GUSTAV_BRAIN_GATE_REPORT_.*\.json$/.test(name))
    .map((name) => {
      const filePath = path.join(docsDir, name);
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, bEntry) => bEntry.mtimeMs - a.mtimeMs);
  if (entries.length === 0) return { relativePath: '', report: {} };
  return {
    relativePath: rel(repoRoot, entries[0].filePath),
    report: readJson<JsonObject>(entries[0].filePath),
  };
}

function evaluateSafety(input: SafetyInput): Finding[] {
  const findings: Finding[] = [];
  if (!input.chainReady) addFinding(findings, 'blocker', 'P18_P32_CHAIN_NOT_READY', 'P18-P32 chain is not fully present and ready.');
  if (!input.p32SafeHoldReady) addFinding(findings, 'blocker', 'P32_NOT_SAFE_HOLD_READY', 'P32 must deny production apply while keeping non-production audit open.');
  if (!input.languageIsolationPass) addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_NOT_PASSING', 'French language isolation must pass before any next closure.');
  if (!input.runValidatorPass) addFinding(findings, 'blocker', 'RUN_VALIDATOR_NOT_PASSING', 'Run validator must pass before any next closure.');
  if (!input.brainGatePass) addFinding(findings, 'blocker', 'BRAIN_GATE_NOT_PASSING', 'Latest Gustav brain gate must pass before any next closure.');
  if (input.masterBlockers > 0) addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  if (!input.productionApplyDenied) addFinding(findings, 'blocker', 'PRODUCTION_APPLY_NOT_DENIED', 'Production apply must remain explicitly denied.');
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_OPEN', 'Active approval receipt/hash-lock is present; P33 must yield to active-approval validation.');
  }
  if (
    input.readyForApply ||
    input.mayModifyProductionAppFiles ||
    input.productionWritesAllowed ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.downloadablePacksPublished ||
    input.activationApproved ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'At least one production write/upload/download/migration/apply flag is open.');
  }
  if (input.readinessApplyBlockers > 0) {
    addFinding(findings, 'info', 'READINESS_APPLY_BLOCKERS_REMAIN', `${input.readinessApplyBlockers} apply blocker(s) remain; production apply stays closed.`);
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: SafetyInput): Probe[] {
  const tests: Array<{ id: string; expectedSafe: boolean; mutate: (input: SafetyInput) => void }> = [
    { id: 'current_safe_hold_passes', expectedSafe: true, mutate: () => undefined },
    { id: 'missing_chain_rejected', expectedSafe: false, mutate: (input) => { input.chainReady = false; } },
    { id: 'p32_not_safe_rejected', expectedSafe: false, mutate: (input) => { input.p32SafeHoldReady = false; } },
    { id: 'active_approval_receipt_rejected', expectedSafe: false, mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'ready_for_apply_rejected', expectedSafe: false, mutate: (input) => { input.readyForApply = true; } },
    { id: 'production_app_writes_rejected', expectedSafe: false, mutate: (input) => { input.mayModifyProductionAppFiles = true; } },
    { id: 'server_upload_rejected', expectedSafe: false, mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_downloads_rejected', expectedSafe: false, mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'activation_approved_rejected', expectedSafe: false, mutate: (input) => { input.activationApproved = true; } },
    { id: 'storage_migration_rejected', expectedSafe: false, mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'brain_gate_block_rejected', expectedSafe: false, mutate: (input) => { input.brainGatePass = false; } },
  ];
  return tests.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const blockers = evaluateSafety(fixture).filter((finding) => finding.severity === 'blocker').length;
    const safe = blockers === 0;
    return {
      id: test.id,
      expectedSafe: test.expectedSafe,
      safe,
      blockers,
      passed: safe === test.expectedSafe,
    };
  });
}

function closureItems(runId: string): ClosureItem[] {
  return [
    {
      id: 'NP-01-LLM-OFFICIAL-SOURCE-EVIDENCE-FRESHNESS',
      priority: 1,
      mode: 'safe_nonproduction',
      title: 'Refresh LLM official-source evidence freshness without importing decisions.',
      canDoNow: true,
      requiresExactApproval: false,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['reviewer decision import', 'payload promotion', 'production apply'],
      sourceArtifacts: [
        'audits/llm_official_source_review_intake_v2_packet.json',
        'audits/llm_official_source_promoted_decision_file_generation_v2_packet.json',
      ],
      evidence: [
        'Accepted row/AI decisions already exist as promoted reviewer artifacts.',
        'No import execution or generated ledger write is required for freshness recheck.',
      ],
      nextAction: 'Regenerate an audit-only freshness packet that rechecks coverage, source links, accepted counts and no non-LLM review dependency.',
      verificationGates: [
        'npx tsx scripts\\gustav_llm_official_source_review_intake_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Coverage remains 100% for row and AI decision queues.',
        'No decision import, payload write, upload or activation flag is opened.',
      ],
    },
    {
      id: 'NP-02-RUNTIME-SERVER-MANIFEST-CONSISTENCY-RECHECK',
      priority: 2,
      mode: 'safe_nonproduction',
      title: 'Recheck runtime/server manifest consistency while publication stays closed.',
      canDoNow: true,
      requiresExactApproval: false,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['server upload', 'Firebase upload', 'runtime downloads', 'downloadable pack publication'],
      sourceArtifacts: [
        'pack_candidates/fr/server_delivery_manifest_v2_draft.json',
        'audits/server_delivery_publish_preflight_v2_packet.json',
        'audits/admin_server_delivery_runtime_preflight_v2_packet.json',
      ],
      evidence: [
        `Draft manifest for run ${runId} is local-only.`,
        'All server paths must remain previews with activationApproved=false.',
      ],
      nextAction: 'Regenerate local manifest/preflight evidence and verify sha/byte-size/gate-report refs are still current.',
      verificationGates: [
        'npx tsx scripts\\gustav_server_delivery_publish_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_admin_server_delivery_runtime_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Every manifest entry has actual sha256 and byte size.',
        'Upload/download/published/activation flags remain false.',
      ],
    },
    {
      id: 'NP-03-LANGUAGE-ISOLATION-REGRESSION-RECHECK',
      priority: 3,
      mode: 'safe_nonproduction',
      title: 'Re-run language isolation regression over current generated/reviewer artifacts.',
      canDoNow: true,
      requiresExactApproval: false,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['app apply', 'runtime cache writes', 'admin activation'],
      sourceArtifacts: [
        'audits/french_language_isolation_audit.json',
        'audits/run_validator_report.json',
      ],
      evidence: [
        'French study target must stay separate from sourceLocale, UI locale, prompts, cache and cloud state.',
      ],
      nextAction: 'Run isolation and validator gates after any generated artifact refresh.',
      verificationGates: [
        'npx tsx scripts\\gustav_french_language_isolation_audit.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        'npx tsx scripts\\gustav_validate_run.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Isolation blockers and warnings stay at zero.',
        'Validator stays PASS.',
      ],
    },
    {
      id: 'NP-04-READINESS-APPLY-BLOCKER-MAP-REFRESH',
      priority: 4,
      mode: 'safe_nonproduction',
      title: 'Refresh the exact production-apply blocker map without opening apply.',
      canDoNow: true,
      requiresExactApproval: false,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['approval receipt creation', 'active hash-lock creation', 'production apply'],
      sourceArtifacts: [
        'audits/gustav_readiness_gate.json',
        'audits/readiness_blocker_reduction_packet.json',
        'audits/production_apply_absence_denial_gate_v2_packet.json',
      ],
      evidence: [
        'Readiness can allow closed-run generation while production apply remains blocked.',
      ],
      nextAction: 'Regenerate readiness/reduction/apply-denial packets and diff blocker counts.',
      verificationGates: [
        'npx tsx scripts\\gustav_readiness_gate.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        'npx tsx scripts\\gustav_readiness_blocker_reduction_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        'npx tsx scripts\\gustav_production_apply_absence_denial_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Production apply remains denied.',
        'Next safe work is still ranked with evidence.',
      ],
    },
    {
      id: 'NP-05-MASTER-NEXT-PASS-CONSISTENCY-REFRESH',
      priority: 5,
      mode: 'safe_nonproduction',
      title: 'Refresh master and next-pass state after P33 exists.',
      canDoNow: true,
      requiresExactApproval: false,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['production app writes', 'approval creation', 'server publication'],
      sourceArtifacts: [
        'audits/nonproduction_blocker_closure_plan_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      evidence: [
        'The self-improving brain must prepare the next large pass before the final response.',
      ],
      nextAction: 'Wire P33 into next-pass and master summaries, then regenerate both.',
      verificationGates: [
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Next-pass packet points to a P34 safe work packet.',
        'Master has zero blockers and still says readyForApply=false.',
      ],
    },
    {
      id: 'EA-01-ACTIVE-APPROVAL-RECEIPT-V2',
      priority: 6,
      mode: 'exact_approval_only',
      title: 'Create active approval receipt only after exact approval text.',
      canDoNow: false,
      requiresExactApproval: true,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['approval receipt creation from plain continue'],
      sourceArtifacts: [
        'audits/activation_approval_request_presentation_v2_packet.json',
        'audits/explicit_approval_receipt_creation_gate_v2_packet.json',
      ],
      evidence: [
        'Plain continue is rejected; exact active approval sentence is absent.',
      ],
      nextAction: 'Wait for exact active approval sentence, then run the separate receipt creation gate.',
      verificationGates: [
        'npx tsx scripts\\gustav_explicit_approval_receipt_creation_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Active approval receipt exists and hash-lock validation has not been bypassed.',
      ],
    },
    {
      id: 'EA-02-ACTIVE-HASH-LOCK-VALIDATION',
      priority: 7,
      mode: 'exact_approval_only',
      title: 'Validate active hash-lock only after a real active receipt exists.',
      canDoNow: false,
      requiresExactApproval: true,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['hash-lock promotion without receipt'],
      sourceArtifacts: [
        'audits/explicit_approval_receipt_hash_lock_gate_v2_packet.json',
      ],
      evidence: [
        'Critical hash locks are prepared, but active hash-lock is absent by design.',
      ],
      nextAction: 'Run active-approval validation only after receipt exists; P32 absence-denial must no longer be the active gate then.',
      verificationGates: [
        'npx tsx scripts\\gustav_explicit_approval_receipt_hash_lock_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Receipt and hash-lock appear together and pass a separate active validation gate.',
      ],
    },
    {
      id: 'PL-01-SERVER-FIREBASE-PUBLICATION',
      priority: 8,
      mode: 'production_locked',
      title: 'Publish downloadable packs only after active approval/hash-lock validation.',
      canDoNow: false,
      requiresExactApproval: true,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['server upload', 'Firebase upload', 'runtime downloads', 'pack publication'],
      sourceArtifacts: [
        'pack_candidates/fr/server_delivery_manifest_v2_draft.json',
      ],
      evidence: [
        'Draft server manifest is valid as local evidence only.',
      ],
      nextAction: 'Do nothing until production apply approval is valid and separately checked.',
      verificationGates: [
        'server upload gate not available in HOLD mode',
      ],
      doneWhen: [
        'A future production gate explicitly allows upload/download and logs rollback state.',
      ],
    },
    {
      id: 'PL-02-RUNTIME-DOWNLOAD-ACTIVATION',
      priority: 9,
      mode: 'production_locked',
      title: 'Enable runtime downloads only after server publication and activation approval.',
      canDoNow: false,
      requiresExactApproval: true,
      mayModifyProductionAppFiles: false,
      blockedProductionActions: ['runtime downloads', 'activationApproved=true', 'readyForApply=true'],
      sourceArtifacts: [
        'pack_candidates/fr/target_pack_manifest_v2_draft.json',
        'pack_candidates/fr/server_delivery_manifest_v2_draft.json',
      ],
      evidence: [
        'Runtime download flags are false and must stay false in non-production passes.',
      ],
      nextAction: 'Keep runtime downloads closed until a future production activation gate passes.',
      verificationGates: [
        'runtime activation gate not available in HOLD mode',
      ],
      doneWhen: [
        'Runtime has rollback, cache integrity and target/source-locale identity validation active.',
      ],
    },
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Non-Production Blocker Closure Plan V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Plan state: ${report.summary.planState}`,
    `- P18-P32 chain ready: ${report.summary.p18p32ChainReady ? 'yes' : 'no'} (${report.summary.p18p32ArtifactsReady}/${report.summary.p18p32ArtifactsExpected})`,
    `- P32 safe HOLD ready: ${report.summary.p32SafeHoldReady ? 'yes' : 'no'}`,
    `- Production apply denied: ${report.summary.productionApplyDenied ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Readiness decision: ${report.summary.readinessDecision}`,
    `- Readiness blockers generation/apply: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`,
    `- Closed-run French generation allowed by readiness: ${report.summary.canStartFrenchGenerationInClosedRun ? 'yes' : 'no'}`,
    `- Master status/blockers/warnings: ${report.summary.masterStatus}/${report.summary.masterBlockers}/${report.summary.masterWarnings}`,
    `- Language isolation pass: ${report.summary.languageIsolationPass ? 'yes' : 'no'}`,
    `- Run validator pass: ${report.summary.runValidatorPass ? 'yes' : 'no'}`,
    `- Brain gate: ${report.summary.brainGateDecision} (${report.summary.brainGateReadinessPercent}%)`,
    `- Server manifest entries: ${report.summary.serverManifestEntries}`,
    `- Server/Firebase upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads/downloadable packs: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.downloadablePacksPublished ? 'yes' : 'no'}`,
    `- Target activation/readyForApply/mayModify: ${report.summary.targetManifestActivationApproved ? 'yes' : 'no'}/${report.summary.targetManifestReadyForApply ? 'yes' : 'no'}/${report.summary.targetManifestMayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Safe non-production items: ${report.summary.safeNonProductionItems}`,
    `- Exact-approval-only items: ${report.summary.exactApprovalOnlyItems}`,
    `- Production-locked items: ${report.summary.productionLockedItems}`,
    `- Recommended next safe item: ${report.summary.recommendedNextSafeItem}`,
    `- Ready for next non-production pass: ${report.summary.readyForNextNonProductionPass ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Chain Artifacts',
    '',
  ];

  for (const artifact of report.chainArtifacts) {
    lines.push(`- ${artifact.ready ? 'ready' : 'not-ready'}: \`${artifact.id}\` ${artifact.status} at \`${artifact.path}\``);
  }

  lines.push('', '## Closure Items', '');
  for (const item of report.closureItems) {
    lines.push(`### ${item.id}`);
    lines.push('');
    lines.push(`- Priority: ${item.priority}`);
    lines.push(`- Mode: \`${item.mode}\``);
    lines.push(`- Can do now: ${item.canDoNow ? 'yes' : 'no'}`);
    lines.push(`- Requires exact approval: ${item.requiresExactApproval ? 'yes' : 'no'}`);
    lines.push(`- May modify production app files: ${item.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
    lines.push(`- Title: ${item.title}`);
    lines.push(`- Next action: ${item.nextAction}`);
    lines.push('- Verification gates:');
    for (const gate of item.verificationGates) lines.push(`  - \`${gate}\``);
    lines.push('- Done when:');
    for (const done of item.doneWhen) lines.push(`  - ${done}`);
    lines.push('');
  }

  lines.push('## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);

  lines.push(
    '',
    '## Safety',
    '',
    '- This packet writes only Gustav audit artifacts.',
    '- It does not create approval receipts or active hash-locks.',
    '- It does not import reviewer decisions or generated ledgers.',
    '- It does not publish server/Firebase packs, enable runtime downloads, modify storage/cloud state or approve production apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');

  const chainDefs: Array<{ id: string; file: string; expectedStatus: 'PASS' | 'HOLD' }> = [
    ['P18_REVIEWER_DECISION_IMPORT_DRY_RUN', 'reviewer_decision_import_v2_dry_run.json', 'PASS'],
    ['P19_PAYLOAD_SHARD_MATERIALIZATION_CHECKSUM', 'payload_shard_materialization_checksum_v2_packet.json', 'PASS'],
    ['P20_SERVER_DELIVERY_MANIFEST_PREVIEW', 'server_delivery_manifest_preview_v2_packet.json', 'PASS'],
    ['P21_RUNTIME_CACHE_INTEGRITY_ROLLBACK', 'runtime_cache_integrity_rollback_v2_packet.json', 'PASS'],
    ['P22_REVIEWER_DECISION_IMPORT_OPENING_PREFLIGHT', 'reviewer_decision_import_opening_preflight_v2_packet.json', 'PASS'],
    ['P23_LLM_OFFICIAL_SOURCE_REVIEW_INTAKE', 'llm_official_source_review_intake_v2_packet.json', 'PASS'],
    ['P24_REVIEWER_DECISION_IMPORT_EXECUTION_GATE', 'reviewer_decision_import_execution_gate_v2_packet.json', 'PASS'],
    ['P25_LLM_OFFICIAL_SOURCE_DECISION_MATERIALIZATION', 'llm_official_source_decision_materialization_v2_packet.json', 'PASS'],
    ['P26_LLM_OFFICIAL_SOURCE_DECISION_DRY_RUN', 'llm_official_source_decision_dry_run_v2_packet.json', 'PASS'],
    ['P27_LLM_OFFICIAL_SOURCE_DECISION_PROMOTION_PREFLIGHT', 'llm_official_source_decision_promotion_preflight_v2_packet.json', 'PASS'],
    ['P28_LLM_OFFICIAL_SOURCE_PROMOTED_DECISION_FILE_GENERATION', 'llm_official_source_promoted_decision_file_generation_v2_packet.json', 'PASS'],
    ['P29_PAYLOAD_CREATION_APPROVAL_PREFLIGHT', 'payload_creation_approval_preflight_v2_packet.json', 'PASS'],
    ['P30_CLOSED_LOCAL_PAYLOAD_MATERIALIZATION', 'closed_local_payload_materialization_v2_packet.json', 'PASS'],
    ['P31_SERVER_DELIVERY_PUBLISH_PREFLIGHT', 'server_delivery_publish_preflight_v2_packet.json', 'PASS'],
    ['P32_ADMIN_SERVER_DELIVERY_RUNTIME_PREFLIGHT', 'admin_server_delivery_runtime_preflight_v2_packet.json', 'PASS'],
    ['P32A_RUNTIME_ACTIVATION_BLOCKER_PLAN', 'runtime_activation_blocker_plan_v2_packet.json', 'PASS'],
    ['P32B_EXPLICIT_APPROVAL_RECEIPT_HASH_LOCK_GATE', 'explicit_approval_receipt_hash_lock_gate_v2_packet.json', 'PASS'],
    ['P32C_ACTIVATION_APPROVAL_REQUEST_PRESENTATION', 'activation_approval_request_presentation_v2_packet.json', 'PASS'],
    ['P32D_EXPLICIT_APPROVAL_RECEIPT_CREATION_GATE', 'explicit_approval_receipt_creation_gate_v2_packet.json', 'HOLD'],
    ['P32E_PRODUCTION_APPLY_ABSENCE_DENIAL_GATE', 'production_apply_absence_denial_gate_v2_packet.json', 'HOLD'],
  ].map(([id, file, expectedStatus]) => ({ id, file, expectedStatus: expectedStatus as 'PASS' | 'HOLD' }));

  const chainArtifacts: ChainArtifact[] = chainDefs.map((definition) => {
    const artifact = sourceArtifact(repoRoot, definition.id, path.join(auditsDir, definition.file));
    return {
      ...artifact,
      expectedStatus: definition.expectedStatus,
      ready:
        artifact.exists &&
        artifact.status === definition.expectedStatus &&
        artifact.blockers === 0 &&
        !artifact.readyForApply &&
        !artifact.mayModifyProductionAppFiles,
    };
  });

  const readinessPath = path.join(auditsDir, 'gustav_readiness_gate.json');
  const reductionPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const languagePath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const validatorPath = path.join(auditsDir, 'run_validator_report.json');
  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const outputJsonPath = path.join(auditsDir, 'nonproduction_blocker_closure_plan_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'nonproduction_blocker_closure_plan_v2_packet.md');

  const readiness = fs.existsSync(readinessPath) ? readJson<JsonObject>(readinessPath) : {};
  const reduction = fs.existsSync(reductionPath) ? readJson<JsonObject>(reductionPath) : {};
  const language = fs.existsSync(languagePath) ? readJson<JsonObject>(languagePath) : {};
  const validator = fs.existsSync(validatorPath) ? readJson<JsonObject>(validatorPath) : {};
  const master = fs.existsSync(masterPath) ? readJson<JsonObject>(masterPath) : {};
  const targetManifest = fs.existsSync(targetManifestPath) ? readJson<JsonObject>(targetManifestPath) : {};
  const serverManifest = fs.existsSync(serverManifestPath) ? readJson<JsonObject>(serverManifestPath) : {};
  const latestBrain = latestBrainGateReport(repoRoot);

  const readinessSummary = summaryOf(readiness);
  const readinessState = object(readiness.readiness);
  const reductionSummary = summaryOf(reduction);
  const languageSummary = summaryOf(language);
  const validatorSummary = summaryOf(validator);
  const masterSummary = summaryOf(master);
  const expectedMasterBlockersForP33 = new Set([
    'nonproduction_blocker_closure_plan_v2_not_ready_for_next_pass',
    'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh',
  ]);
  const masterBlockerFindings = arr<JsonObject>(master.findings).filter((finding) => s(finding, 'severity') === 'blocker');
  const masterExpectedDownstreamBlockers = masterBlockerFindings.filter((finding) => expectedMasterBlockersForP33.has(s(finding, 'code'))).length;
  const masterActionableBlockers = masterBlockerFindings.length - masterExpectedDownstreamBlockers;
  const targetActivation = object(targetManifest.activation);
  const p32 = sourceArtifact(repoRoot, 'P32E_PRODUCTION_APPLY_ABSENCE_DENIAL_GATE', path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json'));
  const p32Report = fs.existsSync(path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json'))
    ? readJson<JsonObject>(path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json'))
    : {};
  const p32Summary = summaryOf(p32Report);

  const languageIsolationPass = s(language, 'status') === 'PASS' && n(languageSummary, 'blockers') === 0 && n(languageSummary, 'warnings') === 0;
  const runValidatorPass = s(validator, 'status') === 'PASS' && n(validatorSummary, 'blockers') === 0;
  const brainGateDecision = s(latestBrain.report, 'decision');
  const brainGatePass = brainGateDecision === 'PASS' && !b(latestBrain.report, 'generationBlocked');
  const serverEntries = arr<JsonObject>(serverManifest.entries);
  const serverEntriesReadyForApplyOpen = serverEntries.filter((entry) => b(entry, 'readyForApply') || b(entry, 'activationApproved')).length;

  const p18p32ArtifactsPresent = chainArtifacts.filter((artifact) => artifact.exists).length;
  const p18p32ArtifactsReady = chainArtifacts.filter((artifact) => artifact.ready).length;
  const p18p32ChainReady = p18p32ArtifactsReady === chainArtifacts.length;
  const p32SafeHoldReady =
    p32.exists &&
    p32.status === 'HOLD' &&
    p32.blockers === 0 &&
    b(p32Summary, 'productionApplyDenied') &&
    b(p32Summary, 'canContinueNonProductionAudit') &&
    b(p32Summary, 'readyForNonProductionContinuationAfterApplyDenialV2') &&
    !b(p32Summary, 'activeApprovalReceiptExists') &&
    !b(p32Summary, 'activeHashLockExists') &&
    !b(p32Summary, 'readyForApply') &&
    !b(p32Summary, 'mayModifyProductionAppFiles') &&
    s(p32Summary, 'denialState') === 'production_apply_denied_missing_active_approval_artifacts';

  const safeItems = closureItems(runId);
  const safetyInput: SafetyInput = {
    chainReady: p18p32ChainReady,
    p32SafeHoldReady,
    languageIsolationPass,
    runValidatorPass,
    brainGatePass,
    masterBlockers: masterActionableBlockers,
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers') || n(reductionSummary, 'applyBlockers'),
    activeApprovalReceiptExists: b(p32Summary, 'activeApprovalReceiptExists'),
    activeHashLockExists: b(p32Summary, 'activeHashLockExists'),
    productionApplyDenied: b(p32Summary, 'productionApplyDenied'),
    readyForApply:
      b(p32Summary, 'readyForApply') ||
      b(targetActivation, 'readyForApply') ||
      serverEntriesReadyForApplyOpen > 0,
    mayModifyProductionAppFiles:
      b(p32Summary, 'mayModifyProductionAppFiles') ||
      b(targetActivation, 'mayModifyProductionAppFiles') ||
      b(masterSummary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(p32Summary, 'productionWritesAllowed') || b(targetActivation, 'productionWritesAllowed'),
    serverUploadAllowed: b(serverManifest, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifest, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(serverManifest, 'runtimeDownloadsEnabled'),
    downloadablePacksPublished: b(serverManifest, 'downloadablePacksPublished'),
    activationApproved: b(serverManifest, 'activationApproved') || b(targetActivation, 'activationApproved'),
    storageMigrationAllowed: b(targetActivation, 'readyForStorageCloudMigration'),
    cloudSyncMigrationAllowed: b(targetActivation, 'cloudSyncMigrationAllowed'),
  };

  const findings = evaluateSafety(safetyInput);
  for (const artifact of chainArtifacts.filter((item) => !item.ready)) {
    addFinding(findings, 'blocker', 'CHAIN_ARTIFACT_NOT_READY', `Required chain artifact ${artifact.id} is not ready.`, artifact.path);
  }
  if (serverEntriesReadyForApplyOpen > 0) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_ENTRY_READY_FOR_APPLY_OPEN', `${serverEntriesReadyForApplyOpen} server manifest entrie(s) have readyForApply/activation open.`);
  }

  const probes = runProbes(safetyInput);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const recommendedNextSafeItem = safeItems.find((item) => item.mode === 'safe_nonproduction' && item.canDoNow)?.id ?? '';

  const report: Report = {
    schemaVersion: 'gustav-nonproduction-blocker-closure-plan-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      readinessGate: rel(repoRoot, readinessPath),
      readinessBlockerReductionPacket: rel(repoRoot, reductionPath),
      frenchLanguageIsolationAudit: rel(repoRoot, languagePath),
      runValidatorReport: rel(repoRoot, validatorPath),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      latestBrainGateReport: latestBrain.relativePath,
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestPath),
      productionApplyAbsenceDenialGateV2Packet: p32.path,
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      planState: blockers > 0 ? 'blocked_by_findings' : 'nonproduction_closure_plan_ready',
      p18p32ArtifactsExpected: chainArtifacts.length,
      p18p32ArtifactsPresent,
      p18p32ArtifactsReady,
      p18p32PassArtifacts: chainArtifacts.filter((artifact) => artifact.status === 'PASS').length,
      p18p32HoldArtifacts: chainArtifacts.filter((artifact) => artifact.status === 'HOLD').length,
      p18p32ChainReady,
      p32SafeHoldReady,
      productionApplyDenied: b(p32Summary, 'productionApplyDenied'),
      activeApprovalReceiptExists: b(p32Summary, 'activeApprovalReceiptExists'),
      activeHashLockExists: b(p32Summary, 'activeHashLockExists'),
      canContinueNonProductionAudit: b(p32Summary, 'canContinueNonProductionAudit'),
      readinessDecision: s(readiness, 'decision'),
      readinessFailedChecks: n(readinessSummary, 'failed'),
      readinessGenerationBlockers: n(readinessSummary, 'generationBlockers') || n(reductionSummary, 'generationBlockers'),
      readinessApplyBlockers: n(readinessSummary, 'applyBlockers') || n(reductionSummary, 'applyBlockers'),
      canStartFrenchGenerationInClosedRun: b(readinessState, 'canStartFrenchGeneration'),
      masterStatus: s(master, 'status'),
      masterBlockers: n(masterSummary, 'blockers'),
      masterActionableBlockers,
      masterExpectedDownstreamBlockers,
      masterWarnings: n(masterSummary, 'warnings'),
      languageIsolationPass,
      languageIsolationBlockers: n(languageSummary, 'blockers'),
      languageIsolationWarnings: n(languageSummary, 'warnings'),
      runValidatorPass,
      runValidatorBlockers: n(validatorSummary, 'blockers'),
      brainGateDecision,
      brainGateReadinessPercent: n(latestBrain.report, 'readinessPercent'),
      brainGateGenerationBlocked: b(latestBrain.report, 'generationBlocked'),
      brainGateApplyBlocked: b(latestBrain.report, 'applyBlocked'),
      brainGateReport: latestBrain.relativePath,
      serverManifestEntries: serverEntries.length,
      serverUploadAllowed: b(serverManifest, 'serverUploadAllowed'),
      firebaseUploadAllowed: b(serverManifest, 'firebaseUploadAllowed'),
      runtimeDownloadsEnabled: b(serverManifest, 'runtimeDownloadsEnabled'),
      downloadablePacksPublished: b(serverManifest, 'downloadablePacksPublished'),
      serverEntriesReadyForApplyOpen,
      targetManifestActivationApproved: b(targetActivation, 'activationApproved'),
      targetManifestReadyForApply: b(targetActivation, 'readyForApply'),
      targetManifestMayModifyProductionAppFiles: b(targetActivation, 'mayModifyProductionAppFiles'),
      targetManifestReadyForStorageCloudMigration: b(targetActivation, 'readyForStorageCloudMigration'),
      safeNonProductionItems: safeItems.filter((item) => item.mode === 'safe_nonproduction').length,
      exactApprovalOnlyItems: safeItems.filter((item) => item.mode === 'exact_approval_only').length,
      productionLockedItems: safeItems.filter((item) => item.mode === 'production_locked').length,
      recommendedNextSafeItem,
      readyForNextNonProductionPass: blockers === 0 && recommendedNextSafeItem !== '',
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    chainArtifacts,
    closureItems: safeItems,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV non-production blocker closure plan V2 packet: ${report.status}`);
  console.log(`Plan state: ${report.summary.planState}`);
  console.log(`P18-P32 chain ready: ${report.summary.p18p32ChainReady ? 'yes' : 'no'} (${report.summary.p18p32ArtifactsReady}/${report.summary.p18p32ArtifactsExpected})`);
  console.log(`Recommended next safe item: ${report.summary.recommendedNextSafeItem}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
