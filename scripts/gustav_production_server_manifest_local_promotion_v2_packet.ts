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

type PromotionInput = {
  repoRoot: string;
  runDir: string;
  draftPath: string;
  productionPath: string;
  force: boolean;
};

type PromotionResult = {
  status: Status;
  productionManifestWritten: boolean;
  productionManifestAlreadyCurrent: boolean;
  findings: Finding[];
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    expectedEntries: 12;
    draftManifestPresent: boolean;
    productionManifestPresentBefore: boolean;
    productionManifestPresentAfter: boolean;
    productionManifestEntries: number;
    closedTopLevelFlags: boolean;
    closedEntryFlags: number;
    readyForRuntimeDownloadActivation: false;
    activationApproved: false;
    readyForApply: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    runtimeDownloadsEnabled: false;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
};

type Report = PromotionResult & {
  schemaVersion: 'gustav-production-server-manifest-local-promotion-v2-packet-v0';
  runId: string;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_ENTRIES = 12;

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
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr(value: JsonObject, key: string): JsonObject[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function inside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function closedTopLevelFlags(manifest: JsonObject): boolean {
  return !b(manifest, 'serverUploadAllowed') &&
    !b(manifest, 'firebaseUploadAllowed') &&
    !b(manifest, 'downloadablePacksPublished') &&
    !b(manifest, 'runtimeDownloadsEnabled') &&
    !b(manifest, 'activationApproved') &&
    !b(manifest, 'readyForApply') &&
    !b(manifest, 'mayModifyProductionAppFiles');
}

function closedEntryFlags(entries: JsonObject[]): number {
  return entries.filter((entry) =>
    !b(entry, 'activationApproved') &&
    !b(entry, 'runtimeDownloadsEnabled') &&
    !b(entry, 'readyForApply')
  ).length;
}

function normalizeProductionManifest(draft: JsonObject): JsonObject {
  return {
    ...draft,
    schemaVersion: 'gustav-server-delivery-manifest-v2',
    manifestMode: 'local_production_manifest_upload_pending',
    localPromotion: {
      promotedFrom: 'server_delivery_manifest_v2_draft.json',
      uploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForRuntimeDownloadActivation: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function promoteProductionServerManifestLocally(input: PromotionInput): PromotionResult {
  const findings: Finding[] = [];
  const packDir = path.dirname(input.productionPath);
  const productionManifestPresentBefore = fs.existsSync(input.productionPath);

  if (!inside(input.draftPath, input.runDir) || !inside(input.productionPath, input.runDir)) {
    addFinding(findings, 'blocker', 'manifest_paths_outside_run_dir', 'Draft and production manifest paths must stay inside the Gustav run directory.');
  }
  if (path.basename(input.draftPath) !== 'server_delivery_manifest_v2_draft.json') {
    addFinding(findings, 'blocker', 'unexpected_draft_manifest_name', 'Draft manifest must be named server_delivery_manifest_v2_draft.json.', input.draftPath);
  }
  if (path.basename(input.productionPath) !== 'server_delivery_manifest_v2.json') {
    addFinding(findings, 'blocker', 'unexpected_production_manifest_name', 'Production manifest must be named server_delivery_manifest_v2.json.', input.productionPath);
  }
  if (!inside(input.productionPath, packDir)) {
    addFinding(findings, 'blocker', 'production_manifest_outside_pack_candidate', 'Production manifest must stay inside pack_candidates/fr.');
  }
  if (!fs.existsSync(input.draftPath)) {
    addFinding(findings, 'blocker', 'draft_manifest_missing', 'Cannot locally promote a missing draft manifest.', input.draftPath);
  }

  const draft = fs.existsSync(input.draftPath) ? readJson<JsonObject>(input.draftPath) : {};
  const entries = arr(draft, 'entries');
  if (s(draft, 'studyTarget') !== 'fr' || s(draft, 'targetLocale') !== 'fr') {
    addFinding(findings, 'blocker', 'draft_manifest_target_drift', 'Draft manifest must be scoped to studyTarget=fr and targetLocale=fr.', input.draftPath);
  }
  if (entries.length !== EXPECTED_ENTRIES) {
    addFinding(findings, 'blocker', 'draft_manifest_entry_count_invalid', `Expected ${EXPECTED_ENTRIES} entries, got ${entries.length}.`, input.draftPath);
  }
  if (!closedTopLevelFlags(draft) || closedEntryFlags(entries) !== EXPECTED_ENTRIES) {
    addFinding(findings, 'blocker', 'draft_manifest_flags_open', 'Draft manifest must keep upload/download/activation/apply flags closed.', input.draftPath);
  }

  const production = normalizeProductionManifest(draft);
  const productionText = canonicalJson(production);
  const currentText = productionManifestPresentBefore ? fs.readFileSync(input.productionPath, 'utf8') : '';
  const productionManifestAlreadyCurrent = currentText === productionText;
  let productionManifestWritten = false;

  if (findings.every((finding) => finding.severity !== 'blocker')) {
    if (productionManifestPresentBefore && !productionManifestAlreadyCurrent && !input.force) {
      addFinding(findings, 'blocker', 'production_manifest_exists_without_force', 'Existing production manifest differs; rerun with --force after reviewing the diff.', input.productionPath);
    } else if (!productionManifestAlreadyCurrent) {
      writeJson(input.productionPath, production);
      productionManifestWritten = true;
    }
  }

  const productionAfter = fs.existsSync(input.productionPath) ? readJson<JsonObject>(input.productionPath) : {};
  const productionEntries = arr(productionAfter, 'entries');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  return {
    status,
    productionManifestWritten,
    productionManifestAlreadyCurrent,
    findings,
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      expectedEntries: EXPECTED_ENTRIES,
      draftManifestPresent: fs.existsSync(input.draftPath),
      productionManifestPresentBefore,
      productionManifestPresentAfter: fs.existsSync(input.productionPath),
      productionManifestEntries: productionEntries.length,
      closedTopLevelFlags: closedTopLevelFlags(productionAfter),
      closedEntryFlags: closedEntryFlags(productionEntries),
      readyForRuntimeDownloadActivation: false,
      activationApproved: false,
      readyForApply: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      blockers,
      warnings,
    },
    artifactHashes: {
      draftManifest: sha256(input.draftPath),
      productionManifest: sha256(input.productionPath),
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Production Server Manifest Local Promotion V2',
    '',
    `- Status: ${report.status}`,
    `- Production manifest written: ${report.productionManifestWritten ? 'yes' : 'no'}`,
    `- Production manifest present after: ${report.summary.productionManifestPresentAfter ? 'yes' : 'no'}`,
    `- Entries: ${report.summary.productionManifestEntries}/${report.summary.expectedEntries}`,
    `- Closed entry flags: ${report.summary.closedEntryFlags}/${report.summary.expectedEntries}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved: ${report.summary.activationApproved ? 'yes' : 'no'}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Safety',
    '- This packet writes only the local `pack_candidates/fr/server_delivery_manifest_v2.json` artifact.',
    '- It does not upload to Firebase/server, enable runtime downloads, approve activation, or modify production app files.',
  ];
  if (report.findings.length > 0) {
    lines.push('', '## Findings');
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packDir = path.join(runDir, 'pack_candidates/fr');
  const draftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const outputJsonPath = path.join(runDir, 'audits/production_server_manifest_local_promotion_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits/production_server_manifest_local_promotion_v2_packet.md');

  const result = promoteProductionServerManifestLocally({
    repoRoot,
    runDir,
    draftPath,
    productionPath,
    force: process.argv.includes('--force'),
  });
  const report: Report = {
    schemaVersion: 'gustav-production-server-manifest-local-promotion-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      serverDeliveryManifestV2Draft: rel(repoRoot, draftPath),
    },
    outputs: {
      productionServerManifestV2: rel(repoRoot, productionPath),
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
    ...result,
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV production server manifest local promotion V2 packet: ${report.status}`);
  console.log(`Production manifest written: ${report.productionManifestWritten ? 'yes' : 'no'}`);
  console.log(`Entries: ${report.summary.productionManifestEntries}/${report.summary.expectedEntries}`);
  console.log(`Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`);
  console.log(`Activation approved: ${report.summary.activationApproved ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
