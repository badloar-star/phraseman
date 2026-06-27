import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PublishPreflightState =
  | 'blocked_by_findings'
  | 'closed_missing_local_payloads'
  | 'local_server_manifest_draft_ready';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: PublishPreflightState;
  accepted: boolean;
  publishPreflightState: PublishPreflightState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;
type SourceLocale = 'ru' | 'uk';
type Surface = 'lesson' | 'lesson_intro' | 'quiz' | 'audio_metadata' | 'flashcard' | 'personal_practice';

type PreviewEntry = {
  previewEntryId: string;
  runtimeSliceId: string;
  serverPath: string;
  packId: string;
  studyTarget: string;
  sourceLocale: SourceLocale;
  surface: Surface;
  schemaVersion: string;
  contentVersion: string;
  sha256: string;
  byteSize: string;
  entryIndex: string;
  payloadShard: string;
  checksumReport: string;
  cacheKey: string;
  rollbackFromVersion: string;
  minAppVersion: string;
  publishedAt: string;
  activationApproved: false;
  dependencies?: JsonObject;
  gateReportRefs?: unknown[];
};

type LocalSlice = {
  runtimeSliceId: string;
  sourceLocale: SourceLocale;
  surface: Surface;
  manifestPath: string;
  entryIndexPath: string;
  payloadPath: string;
  checksumReportPath: string;
  entries: number;
  payloadBytes: number;
  payloadSha256: string;
  indexSha256: string;
  manifestSha256: string;
  cacheKey: string;
  serverPathPreview: string;
};

type ServerManifestEntry = {
  runtimeSliceId: string;
  packId: string;
  studyTarget: 'fr';
  sourceLocale: SourceLocale;
  surface: Surface;
  schemaVersion: string;
  contentVersion: string;
  serverPath: string;
  payloadShard: string;
  payloadSha256: string;
  payloadBytes: number;
  entryIndex: string;
  entryIndexSha256: string;
  sliceManifest: string;
  sliceManifestSha256: string;
  checksumReport: string;
  cacheKey: string;
  rollbackFromVersion: string;
  minAppVersion: 'blocked_until_upload_gate';
  publishedAt: 'blocked_until_upload_gate';
  activationApproved: false;
  runtimeDownloadsEnabled: false;
  readyForApply: false;
  gateReportRefs: unknown[];
};

type EvaluationInput = {
  p25Ready: boolean;
  p25State: string;
  p25Blockers: number;
  previewEntries: PreviewEntry[];
  localSlices: LocalSlice[];
  manifestEntries: ServerManifestEntry[];
  manifestDraftCreated: boolean;
  manifestDraftInsidePackCandidate: boolean;
  checksumMismatches: number;
  missingPreviewMatches: number;
  forbiddenUiLocaleRefs: number;
  forbiddenOpenFlags: number;
  productionServerManifestExists: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: number;
  surfaces: number;
  previewEntries: number;
  localSlices: number;
  manifestEntries: number;
  manifestDraftCreated: boolean;
  manifestEntriesWithActualSha256: number;
  manifestEntriesWithActualByteSize: number;
  manifestEntriesWithChecksumReports: number;
  manifestEntriesWithSourceLocaleScopedServerPaths: number;
  manifestEntriesWithCacheKeySha256: number;
  checksumMismatches: number;
  missingPreviewMatches: number;
  forbiddenUiLocaleRefs: number;
  forbiddenOpenFlags: number;
  productionServerManifestExists: boolean;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  downloadablePacksPublished: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForRuntimeDownloadActivation: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  readyForAdminServerDeliveryReviewV2: boolean;
  publishPreflightState: PublishPreflightState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-server-delivery-publish-preflight-v2-packet-v0';
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
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    productionServerManifestCreatedByThisScript: false;
    serverManifestDraftCreatedByThisScript: boolean;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES: SourceLocale[] = ['ru', 'uk'];
const SURFACES: Surface[] = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
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

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Text(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function replaceShaPlaceholder(template: string, shaValue: string): string {
  return template.replace(/\{sha256\}/g, shaValue);
}

function inside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function countPattern(filePath: string, pattern: string): number {
  const text = fs.readFileSync(filePath, 'utf8');
  return (text.match(new RegExp(pattern, 'g')) ?? []).length;
}

function countForbiddenOpenFlags(filePath: string): number {
  const text = fs.readFileSync(filePath, 'utf8');
  return [
    '"serverUploadAllowed": true',
    '"firebaseUploadAllowed": true',
    '"downloadablePacksPublished": true',
    '"runtimeDownloadsEnabled": true',
    '"activationApproved": true',
    '"readyForRuntimeDownloadActivation": true',
    '"readyForApply": true',
    '"mayModifyProductionAppFiles": true',
  ].reduce((sum, pattern) => sum + (text.includes(pattern) ? 1 : 0), 0);
}

function checksumMismatches(repoRoot: string, slices: LocalSlice[]): number {
  let mismatches = 0;
  for (const slice of slices) {
    const payloadPath = path.resolve(repoRoot, slice.payloadPath);
    const indexPath = path.resolve(repoRoot, slice.entryIndexPath);
    const manifestPath = path.resolve(repoRoot, slice.manifestPath);
    if (!fs.existsSync(payloadPath) || sha256(payloadPath) !== slice.payloadSha256) mismatches += 1;
    if (!fs.existsSync(indexPath) || sha256(indexPath) !== slice.indexSha256) mismatches += 1;
    if (!fs.existsSync(manifestPath) || sha256(manifestPath) !== slice.manifestSha256) mismatches += 1;
  }
  return mismatches;
}

function buildManifestEntries(previewEntries: PreviewEntry[], localSlices: LocalSlice[]): { entries: ServerManifestEntry[]; missingPreviewMatches: number } {
  const sliceById = new Map(localSlices.map((slice) => [slice.runtimeSliceId, slice]));
  const entries: ServerManifestEntry[] = [];
  let missingPreviewMatches = 0;
  for (const preview of previewEntries) {
    const slice = sliceById.get(preview.runtimeSliceId);
    if (!slice) {
      missingPreviewMatches += 1;
      continue;
    }
    entries.push({
      runtimeSliceId: preview.runtimeSliceId,
      packId: preview.packId,
      studyTarget: 'fr',
      sourceLocale: preview.sourceLocale,
      surface: preview.surface,
      schemaVersion: preview.schemaVersion,
      contentVersion: preview.contentVersion,
      serverPath: replaceShaPlaceholder(preview.serverPath, slice.payloadSha256),
      payloadShard: slice.payloadPath,
      payloadSha256: slice.payloadSha256,
      payloadBytes: slice.payloadBytes,
      entryIndex: slice.entryIndexPath,
      entryIndexSha256: slice.indexSha256,
      sliceManifest: slice.manifestPath,
      sliceManifestSha256: slice.manifestSha256,
      checksumReport: slice.checksumReportPath,
      cacheKey: replaceShaPlaceholder(preview.cacheKey, slice.payloadSha256),
      rollbackFromVersion: preview.rollbackFromVersion,
      minAppVersion: 'blocked_until_upload_gate',
      publishedAt: 'blocked_until_upload_gate',
      activationApproved: false,
      runtimeDownloadsEnabled: false,
      readyForApply: false,
      gateReportRefs: preview.gateReportRefs ?? [],
    });
  }
  return { entries, missingPreviewMatches };
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p25Ready) {
    addFinding(findings, 'blocker', 'P25_NOT_READY', `P25 must be ready before P26, got state=${input.p25State}.`);
  }
  if (input.p25Blockers > 0) {
    addFinding(findings, 'blocker', 'P25_BLOCKERS', `P25 has ${input.p25Blockers} blocker(s).`);
  }
  if (input.previewEntries.length !== EXPECTED_ENTRIES) {
    addFinding(findings, 'blocker', 'PREVIEW_ENTRY_COUNT_INVALID', `Expected ${EXPECTED_ENTRIES} preview entries, found ${input.previewEntries.length}.`);
  }
  if (input.localSlices.length !== EXPECTED_ENTRIES) {
    addFinding(findings, 'blocker', 'LOCAL_SLICE_COUNT_INVALID', `Expected ${EXPECTED_ENTRIES} local slices, found ${input.localSlices.length}.`);
  }
  if (input.manifestEntries.length !== EXPECTED_ENTRIES) {
    addFinding(findings, 'blocker', 'MANIFEST_ENTRY_COUNT_INVALID', `Expected ${EXPECTED_ENTRIES} manifest entries, found ${input.manifestEntries.length}.`);
  }
  if (!input.manifestDraftCreated || !input.manifestDraftInsidePackCandidate) {
    addFinding(findings, 'blocker', 'MANIFEST_DRAFT_PATH_INVALID', 'Server manifest draft must be created inside pack_candidates/fr.');
  }
  if (input.checksumMismatches > 0) {
    addFinding(findings, 'blocker', 'CHECKSUM_MISMATCHES', `${input.checksumMismatches} local slice checksum mismatch(es).`);
  }
  if (input.missingPreviewMatches > 0) {
    addFinding(findings, 'blocker', 'MISSING_PREVIEW_MATCHES', `${input.missingPreviewMatches} preview entrie(s) had no local slice.`);
  }
  if (input.forbiddenUiLocaleRefs > 0) {
    addFinding(findings, 'blocker', 'UI_LOCALE_REFS_IN_SERVER_MANIFEST_DRAFT', `${input.forbiddenUiLocaleRefs} uiLocale reference(s) found.`);
  }
  if (input.forbiddenOpenFlags > 0) {
    addFinding(findings, 'blocker', 'FORBIDDEN_OPEN_FLAGS', `${input.forbiddenOpenFlags} forbidden open flag(s) found.`);
  }
  if (input.productionServerManifestExists) {
    addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_EXISTS', 'P26 must not create pack_candidates/fr/server_delivery_manifest_v2.json.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;
  const evaluation: Evaluation = {
    targetLocale: 'fr',
    sourceLocales: SOURCE_LOCALES.length,
    surfaces: SURFACES.length,
    previewEntries: input.previewEntries.length,
    localSlices: input.localSlices.length,
    manifestEntries: input.manifestEntries.length,
    manifestDraftCreated: input.manifestDraftCreated,
    manifestEntriesWithActualSha256: input.manifestEntries.filter((entry) => /^[a-f0-9]{64}$/.test(entry.payloadSha256)).length,
    manifestEntriesWithActualByteSize: input.manifestEntries.filter((entry) => entry.payloadBytes > 0).length,
    manifestEntriesWithChecksumReports: input.manifestEntries.filter((entry) => entry.checksumReport.endsWith('.json')).length,
    manifestEntriesWithSourceLocaleScopedServerPaths: input.manifestEntries.filter((entry) => entry.serverPath.includes(`/fr/${entry.sourceLocale}/`)).length,
    manifestEntriesWithCacheKeySha256: input.manifestEntries.filter((entry) => entry.cacheKey.includes(entry.payloadSha256)).length,
    checksumMismatches: input.checksumMismatches,
    missingPreviewMatches: input.missingPreviewMatches,
    forbiddenUiLocaleRefs: input.forbiddenUiLocaleRefs,
    forbiddenOpenFlags: input.forbiddenOpenFlags,
    productionServerManifestExists: input.productionServerManifestExists,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForRuntimeDownloadActivation: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    readyForAdminServerDeliveryReviewV2: accepted,
    publishPreflightState: blockers > 0 ? 'blocked_by_findings' : input.p25Ready ? 'local_server_manifest_draft_ready' : 'closed_missing_local_payloads',
    blockers,
    warnings,
  };
  return { evaluation, findings };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{
    id: string;
    expectedAccept: boolean;
    expectedState: PublishPreflightState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    {
      id: 'canonical_manifest_draft_is_accepted',
      expectedAccept: true,
      expectedState: 'local_server_manifest_draft_ready',
      mutate: () => undefined,
    },
    {
      id: 'missing_p25_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.p25Ready = false;
        input.p25State = 'blocked_by_findings';
      },
    },
    {
      id: 'missing_local_slice_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.localSlices = input.localSlices.slice(1);
      },
    },
    {
      id: 'checksum_mismatch_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.checksumMismatches = 1;
      },
    },
    {
      id: 'production_server_manifest_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.productionServerManifestExists = true;
      },
    },
    {
      id: 'runtime_download_open_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.forbiddenOpenFlags = 1;
      },
    },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForAdminServerDeliveryReviewV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      publishPreflightState: result.publishPreflightState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.publishPreflightState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Server Delivery Publish Preflight V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Publish preflight state: ${report.summary.publishPreflightState}`,
    `- Manifest draft created: ${report.summary.manifestDraftCreated ? 'yes' : 'no'}`,
    `- Manifest entries: ${report.summary.manifestEntries}/${EXPECTED_ENTRIES}`,
    `- Actual sha256/byteSize entries: ${report.summary.manifestEntriesWithActualSha256}/${report.summary.manifestEntriesWithActualByteSize}`,
    `- Source-locale scoped server paths: ${report.summary.manifestEntriesWithSourceLocaleScopedServerPaths}/${EXPECTED_ENTRIES}`,
    `- Cache keys with sha256: ${report.summary.manifestEntriesWithCacheKeySha256}/${EXPECTED_ENTRIES}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for admin/server delivery review V2: ${report.summary.readyForAdminServerDeliveryReviewV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Closed Transitions',
    '',
    `- Server upload allowed: ${report.summary.serverUploadAllowed}`,
    `- Firebase upload allowed: ${report.summary.firebaseUploadAllowed}`,
    `- Downloadable packs published: ${report.summary.downloadablePacksPublished}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled}`,
    `- Activation approved: ${report.summary.activationApproved}`,
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
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const p15Path = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const p25Path = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const draftManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionServerManifestPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.md');

  const p15 = readJson<JsonObject>(p15Path);
  const p25 = readJson<JsonObject>(p25Path);
  const p25Summary = summaryOf(p25);
  const previewEntriesRaw = object(p15.contract).serverManifestPreviewEntries;
  const previewEntries = (Array.isArray(previewEntriesRaw) ? previewEntriesRaw : []) as PreviewEntry[];
  const localSlicesRaw = p25.slices;
  const localSlices = (Array.isArray(localSlicesRaw) ? localSlicesRaw : []) as LocalSlice[];
  const { entries, missingPreviewMatches } = buildManifestEntries(previewEntries, localSlices);

  const manifestDraft = {
    schemaVersion: 'gustav-server-delivery-manifest-v2-draft',
    runId: path.basename(runDir),
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: SOURCE_LOCALES,
    contentVersion: entries[0]?.contentVersion ?? 'unknown',
    manifestMode: 'local_draft_not_published',
    createdAt: s(p25, 'generatedAt') || new Date().toISOString(),
    entries,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForRuntimeDownloadActivation: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    inputHashes: {
      serverDeliveryManifestPreviewV2Packet: sha256(p15Path),
      closedLocalPayloadMaterializationV2Packet: sha256(p25Path),
      targetPackManifestV2Draft: sha256(targetManifestPath),
    },
  };
  writeJson(draftManifestPath, manifestDraft);

  const manifestDraftInsidePackCandidate = inside(draftManifestPath, packDir);
  const evaluationInput: EvaluationInput = {
    p25Ready:
      n(p25Summary, 'blockers') === 0 &&
      b(p25Summary, 'readyForServerDeliveryPublishPreflightV2') &&
      s(p25Summary, 'materializationState') === 'local_payload_artifacts_materialized',
    p25State: s(p25Summary, 'materializationState'),
    p25Blockers: n(p25Summary, 'blockers'),
    previewEntries,
    localSlices,
    manifestEntries: entries,
    manifestDraftCreated: fs.existsSync(draftManifestPath),
    manifestDraftInsidePackCandidate,
    checksumMismatches: checksumMismatches(repoRoot, localSlices),
    missingPreviewMatches,
    forbiddenUiLocaleRefs: countPattern(draftManifestPath, 'uiLocale'),
    forbiddenOpenFlags: countForbiddenOpenFlags(draftManifestPath),
    productionServerManifestExists: fs.existsSync(productionServerManifestPath),
  };
  const { evaluation, findings } = evaluate(evaluationInput);
  const probes = runProbes(evaluationInput);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.publishPreflightState = 'blocked_by_findings';
    evaluation.readyForAdminServerDeliveryReviewV2 = false;
  }
  const status: Status = evaluation.blockers > 0 ? 'BLOCK' : evaluation.readyForAdminServerDeliveryReviewV2 ? 'PASS' : 'HOLD';
  const report: Report = {
    schemaVersion: 'gustav-server-delivery-publish-preflight-v2-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, p15Path),
      closedLocalPayloadMaterializationV2Packet: rel(repoRoot, p25Path),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
    },
    outputs: {
      serverDeliveryManifestV2Draft: rel(repoRoot, draftManifestPath),
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      blockers: findings.filter((finding) => finding.severity === 'blocker').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      serverDeliveryManifestPreviewV2Packet: sha256(p15Path),
      closedLocalPayloadMaterializationV2Packet: sha256(p25Path),
      targetPackManifestV2Draft: sha256(targetManifestPath),
      serverDeliveryManifestV2Draft: sha256(draftManifestPath),
      serverManifestEntriesCombined: sha256Text(entries.map((entry) => `${entry.runtimeSliceId}:${entry.payloadSha256}:${entry.payloadBytes}`).join('\n')),
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      productionServerManifestCreatedByThisScript: false,
      serverManifestDraftCreatedByThisScript: true,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV server delivery publish preflight V2 packet: ${report.status}`);
  console.log(`Publish preflight state: ${report.summary.publishPreflightState}`);
  console.log(`Manifest entries: ${report.summary.manifestEntries}/${EXPECTED_ENTRIES}`);
  console.log(`Ready for admin/server delivery review V2: ${report.summary.readyForAdminServerDeliveryReviewV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
