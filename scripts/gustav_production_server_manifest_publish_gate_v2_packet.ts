import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: PublishGateState;
  state: PublishGateState;
  blockers: number;
  warnings: number;
  passed: boolean;
};

type ManifestEntry = JsonObject;

type PublishGateState =
  | 'production_server_manifest_ready_for_activation_gate'
  | 'waiting_for_published_production_manifest'
  | 'blocked_by_findings';

export type ProductionServerManifestPublishGateInput = {
  repoRoot: string;
  draftPath: string;
  productionPath: string;
  draft: JsonObject;
  production: JsonObject | null;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: string[];
  surfaces: string[];
  publishGateState: PublishGateState;
  draftManifestPresent: boolean;
  productionManifestPresent: boolean;
  expectedEntries: number;
  draftEntries: number;
  productionEntries: number;
  productionEntriesStudyTargetFr: number;
  productionEntriesSourceScoped: number;
  productionEntriesSurfaceScoped: number;
  productionEntriesMatchingDraftIdentity: number;
  productionEntriesMatchingDraftPayload: number;
  productionEntriesMatchingDraftServerPath: number;
  productionEntriesMatchingDraftCacheKey: number;
  productionEntriesClosedActivation: number;
  productionEntriesClosedRuntimeDownloads: number;
  productionEntriesClosedReadyForApply: number;
  topLevelOpenFlags: number;
  forbiddenUiLocaleRefs: number;
  activationApproved: false;
  runtimeDownloadsEnabled: false;
  readyForApply: false;
  readyForRuntimeDownloadActivation: boolean;
  blockers: number;
  warnings: number;
  fixtureProbesPassed: number;
  fixtureProbes: number;
};

type Report = {
  schemaVersion: 'gustav-production-server-manifest-publish-gate-v2-packet-v0';
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
  summary: Evaluation;
  artifactHashes: Record<string, string>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    productionServerManifestCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
const EXPECTED_ENTRIES = SOURCE_LOCALES.length * SURFACES.length;

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

function readJsonOrNull(filePath: string): JsonObject | null {
  return fs.existsSync(filePath) ? readJson<JsonObject>(filePath) : null;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr(value: JsonObject, key: string): ManifestEntry[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function keyOf(entry: ManifestEntry): string {
  return `${s(entry, 'sourceLocale')}/${s(entry, 'surface')}`;
}

function expectedSourceSurfaceKeys(): Set<string> {
  const keys = new Set<string>();
  for (const sourceLocale of SOURCE_LOCALES) {
    for (const surface of SURFACES) keys.add(`${sourceLocale}/${surface}`);
  }
  return keys;
}

function entriesByKey(entries: ManifestEntry[]): Map<string, ManifestEntry> {
  const map = new Map<string, ManifestEntry>();
  for (const entry of entries) map.set(keyOf(entry), entry);
  return map;
}

function criticalIdentityMatches(productionEntry: ManifestEntry, draftEntry: ManifestEntry): boolean {
  return s(productionEntry, 'runtimeSliceId') === s(draftEntry, 'runtimeSliceId') &&
    s(productionEntry, 'packId') === s(draftEntry, 'packId') &&
    s(productionEntry, 'studyTarget') === 'fr' &&
    s(productionEntry, 'sourceLocale') === s(draftEntry, 'sourceLocale') &&
    s(productionEntry, 'surface') === s(draftEntry, 'surface') &&
    s(productionEntry, 'schemaVersion') === s(draftEntry, 'schemaVersion') &&
    s(productionEntry, 'contentVersion') === s(draftEntry, 'contentVersion');
}

function criticalPayloadMatches(productionEntry: ManifestEntry, draftEntry: ManifestEntry): boolean {
  return s(productionEntry, 'payloadSha256') === s(draftEntry, 'payloadSha256') &&
    productionEntry.payloadBytes === draftEntry.payloadBytes &&
    s(productionEntry, 'entryIndexSha256') === s(draftEntry, 'entryIndexSha256') &&
    s(productionEntry, 'sliceManifestSha256') === s(draftEntry, 'sliceManifestSha256');
}

export function evaluateProductionServerManifestPublishGate(
  input: ProductionServerManifestPublishGateInput,
): { summary: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const draftEntries = arr(input.draft, 'entries');
  const productionEntries = input.production ? arr(input.production, 'entries') : [];
  const draftByKey = entriesByKey(draftEntries);
  const expectedKeys = expectedSourceSurfaceKeys();

  if (draftEntries.length !== EXPECTED_ENTRIES) {
    addFinding(findings, 'blocker', 'draft_manifest_entry_count_invalid', `Expected ${EXPECTED_ENTRIES} draft entries, got ${draftEntries.length}.`, input.draftPath);
  }

  let productionEntriesMatchingDraftIdentity = 0;
  let productionEntriesMatchingDraftPayload = 0;
  let productionEntriesMatchingDraftServerPath = 0;
  let productionEntriesMatchingDraftCacheKey = 0;
  for (const entry of productionEntries) {
    const draftEntry = draftByKey.get(keyOf(entry));
    if (!draftEntry) continue;
    if (criticalIdentityMatches(entry, draftEntry)) productionEntriesMatchingDraftIdentity += 1;
    if (criticalPayloadMatches(entry, draftEntry)) productionEntriesMatchingDraftPayload += 1;
    if (s(entry, 'serverPath') === s(draftEntry, 'serverPath')) productionEntriesMatchingDraftServerPath += 1;
    if (s(entry, 'cacheKey') === s(draftEntry, 'cacheKey')) productionEntriesMatchingDraftCacheKey += 1;
  }

  const manifestText = JSON.stringify(input.production ?? {});
  const topLevelOpenFlags = input.production ? [
    b(input.production, 'serverUploadAllowed'),
    b(input.production, 'firebaseUploadAllowed'),
    b(input.production, 'downloadablePacksPublished'),
    b(input.production, 'runtimeDownloadsEnabled'),
    b(input.production, 'activationApproved'),
    b(input.production, 'readyForApply'),
    b(input.production, 'mayModifyProductionAppFiles'),
  ].filter(Boolean).length : 0;
  const forbiddenUiLocaleRefs = (manifestText.match(/"uiLocale"|"interfaceLocale"|"uiLanguage"|"interfaceLanguage"/g) ?? []).length;
  const productionEntriesStudyTargetFr = productionEntries.filter((entry) => s(entry, 'studyTarget') === 'fr').length;
  const productionEntriesSourceScoped = productionEntries.filter((entry) => SOURCE_LOCALES.includes(s(entry, 'sourceLocale')) && s(entry, 'serverPath').startsWith(`course-packs/fr/${s(entry, 'sourceLocale')}/`)).length;
  const productionEntriesSurfaceScoped = productionEntries.filter((entry) => expectedKeys.has(keyOf(entry))).length;
  const productionEntriesClosedActivation = productionEntries.filter((entry) => !b(entry, 'activationApproved')).length;
  const productionEntriesClosedRuntimeDownloads = productionEntries.filter((entry) => !b(entry, 'runtimeDownloadsEnabled')).length;
  const productionEntriesClosedReadyForApply = productionEntries.filter((entry) => !b(entry, 'readyForApply')).length;

  if (!input.production) {
    addFinding(findings, 'warning', 'production_server_manifest_missing', 'Production server_delivery_manifest_v2.json is not published yet.', input.productionPath);
  } else {
    if (s(input.production, 'studyTarget') !== 'fr' || s(input.production, 'targetLocale') !== 'fr') {
      addFinding(findings, 'blocker', 'production_manifest_target_drift', 'Production server manifest must be scoped to studyTarget=fr and targetLocale=fr.', input.productionPath);
    }
    if (productionEntries.length !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_manifest_entry_count_invalid', `Expected ${EXPECTED_ENTRIES} production entries, got ${productionEntries.length}.`, input.productionPath);
    }
    if (productionEntriesStudyTargetFr !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_entries_target_drift', 'Every production entry must be studyTarget=fr.', input.productionPath);
    }
    if (productionEntriesSourceScoped !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_server_path_scope_drift', 'Every production serverPath must stay under course-packs/fr/<sourceLocale>/.', input.productionPath);
    }
    if (productionEntriesSurfaceScoped !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_source_surface_matrix_incomplete', 'Production manifest must cover each ru/uk x runtime surface exactly once.', input.productionPath);
    }
    if (productionEntriesMatchingDraftIdentity !== EXPECTED_ENTRIES || productionEntriesMatchingDraftPayload !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_manifest_does_not_match_draft_payload', 'Production manifest identity and payload fields must match the audited draft.', input.productionPath);
    }
    if (productionEntriesMatchingDraftServerPath !== EXPECTED_ENTRIES || productionEntriesMatchingDraftCacheKey !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_manifest_path_or_cache_drift', 'Production manifest serverPath/cacheKey must match the audited draft.', input.productionPath);
    }
    if (productionEntriesClosedActivation !== EXPECTED_ENTRIES || productionEntriesClosedRuntimeDownloads !== EXPECTED_ENTRIES || productionEntriesClosedReadyForApply !== EXPECTED_ENTRIES) {
      addFinding(findings, 'blocker', 'production_manifest_entry_flags_open', 'Production manifest entries must keep activation/runtime/apply flags closed before activation gate.', input.productionPath);
    }
    if (topLevelOpenFlags > 0) {
      addFinding(findings, 'blocker', 'production_manifest_top_level_flags_open', 'Production manifest top-level upload/runtime/activation/apply flags must stay closed before activation gate.', input.productionPath);
    }
    if (forbiddenUiLocaleRefs > 0) {
      addFinding(findings, 'blocker', 'production_manifest_contains_ui_locale_identity', 'Production manifest must not contain UI/interface locale identity fields.', input.productionPath);
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const publishGateState: PublishGateState = blockers > 0
    ? 'blocked_by_findings'
    : input.production
      ? 'production_server_manifest_ready_for_activation_gate'
      : 'waiting_for_published_production_manifest';

  return {
    summary: {
      targetLocale: 'fr',
      sourceLocales: SOURCE_LOCALES,
      surfaces: SURFACES,
      publishGateState,
      draftManifestPresent: draftEntries.length > 0,
      productionManifestPresent: Boolean(input.production),
      expectedEntries: EXPECTED_ENTRIES,
      draftEntries: draftEntries.length,
      productionEntries: productionEntries.length,
      productionEntriesStudyTargetFr,
      productionEntriesSourceScoped,
      productionEntriesSurfaceScoped,
      productionEntriesMatchingDraftIdentity,
      productionEntriesMatchingDraftPayload,
      productionEntriesMatchingDraftServerPath,
      productionEntriesMatchingDraftCacheKey,
      productionEntriesClosedActivation,
      productionEntriesClosedRuntimeDownloads,
      productionEntriesClosedReadyForApply,
      topLevelOpenFlags,
      forbiddenUiLocaleRefs,
      activationApproved: false,
      runtimeDownloadsEnabled: false,
      readyForApply: false,
      readyForRuntimeDownloadActivation: publishGateState === 'production_server_manifest_ready_for_activation_gate',
      blockers,
      warnings,
      fixtureProbesPassed: 0,
      fixtureProbes: 0,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: ProductionServerManifestPublishGateInput): Probe[] {
  const draftProduction = clone(base.draft);
  draftProduction.schemaVersion = 'gustav-server-delivery-manifest-v2';
  draftProduction.manifestMode = 'production_published_pre_activation';
  const productionEntries = (manifest: JsonObject): ManifestEntry[] => {
    if (!Array.isArray(manifest.entries)) manifest.entries = [];
    return manifest.entries as ManifestEntry[];
  };
  const cases: { id: string; expectedState: PublishGateState; mutate: (input: ProductionServerManifestPublishGateInput) => void }[] = [
    { id: 'missing_production_manifest_is_hold', expectedState: 'waiting_for_published_production_manifest', mutate: (input) => { input.production = null; } },
    { id: 'matching_closed_production_manifest_is_ready', expectedState: 'production_server_manifest_ready_for_activation_gate', mutate: (input) => { input.production = clone(draftProduction); } },
    { id: 'missing_entry_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); productionEntries(input.production).pop(); } },
    { id: 'wrong_study_target_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); productionEntries(input.production)[0].studyTarget = 'en'; } },
    { id: 'wrong_source_locale_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); productionEntries(input.production)[0].sourceLocale = 'es'; } },
    { id: 'payload_sha_drift_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); productionEntries(input.production)[0].payloadSha256 = '0'.repeat(64); } },
    { id: 'server_path_scope_drift_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); productionEntries(input.production)[0].serverPath = 'course-packs/en/ru/lesson/bad.json'; } },
    { id: 'entry_activation_open_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); productionEntries(input.production)[0].activationApproved = true; } },
    { id: 'top_level_runtime_open_is_blocked', expectedState: 'blocked_by_findings', mutate: (input) => { input.production = clone(draftProduction); input.production.runtimeDownloadsEnabled = true; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluateProductionServerManifestPublishGate(fixture);
    return {
      id: testCase.id,
      expectedState: testCase.expectedState,
      state: result.summary.publishGateState,
      blockers: result.summary.blockers,
      warnings: result.summary.warnings,
      passed: result.summary.publishGateState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Production Server Manifest Publish Gate V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Publish gate state: ${report.summary.publishGateState}`,
    `- Draft entries: ${report.summary.draftEntries}/${report.summary.expectedEntries}`,
    `- Production manifest present: ${report.summary.productionManifestPresent ? 'yes' : 'no'}`,
    `- Production entries: ${report.summary.productionEntries}/${report.summary.expectedEntries}`,
    `- Production target/source/surface scoped: ${report.summary.productionEntriesStudyTargetFr}/${report.summary.productionEntriesSourceScoped}/${report.summary.productionEntriesSurfaceScoped}`,
    `- Production identity/payload/path/cache matches draft: ${report.summary.productionEntriesMatchingDraftIdentity}/${report.summary.productionEntriesMatchingDraftPayload}/${report.summary.productionEntriesMatchingDraftServerPath}/${report.summary.productionEntriesMatchingDraftCacheKey}`,
    `- Production closed activation/runtime/apply entries: ${report.summary.productionEntriesClosedActivation}/${report.summary.productionEntriesClosedRuntimeDownloads}/${report.summary.productionEntriesClosedReadyForApply}`,
    `- Top-level open flags: ${report.summary.topLevelOpenFlags}`,
    `- Ready for runtime download activation gate: ${report.summary.readyForRuntimeDownloadActivation ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push(
    '',
    '## Safety',
    '',
    '- This gate does not create or upload a production server manifest.',
    '- It does not enable runtime downloads, activationApproved or apply.',
    '- Missing production manifest is HOLD; malformed production manifest is BLOCK.',
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
  const draftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'production_server_manifest_publish_gate_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'production_server_manifest_publish_gate_v2_packet.md');

  const input: ProductionServerManifestPublishGateInput = {
    repoRoot,
    draftPath,
    productionPath,
    draft: fs.existsSync(draftPath) ? readJson<JsonObject>(draftPath) : {},
    production: readJsonOrNull(productionPath),
  };
  const result = evaluateProductionServerManifestPublishGate(input);
  const probes = runProbes(input);
  const findings = result.findings.slice();
  for (const probe of probes.filter((candidate) => !candidate.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS';
  const report: Report = {
    schemaVersion: 'gustav-production-server-manifest-publish-gate-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      serverDeliveryManifestV2Draft: rel(repoRoot, draftPath),
      productionServerDeliveryManifestV2: rel(repoRoot, productionPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...result.summary,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      publishGateState: blockers > 0 ? 'blocked_by_findings' : result.summary.publishGateState,
      readyForRuntimeDownloadActivation: blockers === 0 && result.summary.publishGateState === 'production_server_manifest_ready_for_activation_gate',
    },
    artifactHashes: {
      serverDeliveryManifestV2Draft: sha256(draftPath),
      productionServerDeliveryManifestV2: sha256(productionPath),
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      productionServerManifestCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV production server manifest publish gate V2 packet: ${report.status}`);
  console.log(`Publish gate state: ${report.summary.publishGateState}`);
  console.log(`Production manifest present: ${report.summary.productionManifestPresent ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

if (require.main === module) {
  main();
}
