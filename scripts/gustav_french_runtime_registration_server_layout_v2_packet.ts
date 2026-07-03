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

type JsonObject = Record<string, unknown>;

type RequiredObject = {
  runtimeSliceId: string;
  sourceLocale: string;
  surface: string;
  role: 'manifest' | 'entry_index' | 'payload';
  localPath: string;
  serverPath: string;
  presentLocally: boolean;
  presentInUploadEvidence: boolean;
};

type Report = {
  schemaVersion: 'gustav-french-runtime-registration-server-layout-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    plannedRuntimeSlices: number;
    runtimeRegistrationPrefixes: number;
    requiredServerObjects: number;
    localObjectsPresent: number;
    uploadEvidenceObjects: number;
    requiredObjectsPresentInUploadEvidence: number;
    missingUploadEvidenceObjects: number;
    runtimeValidManifests: number;
    manifestsWithRelativeEntryIndex: number;
    remoteLoaderCachePathSanitized: boolean;
    activationApproved: boolean;
    runtimeDownloadsEnabled: boolean;
    readyForApply: boolean;
    blockers: number;
    warnings: number;
  };
  requiredObjects: RequiredObject[];
  findings: Finding[];
  artifactHashes: Record<string, string>;
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES = ['ru', 'uk'] as const;
const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'] as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
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

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function isRuntimeValidManifest(manifest: JsonObject): boolean {
  return (
    s(manifest, 'schemaVersion') === 'course-pack-v1' &&
    s(manifest, 'studyTarget') === 'fr' &&
    SOURCE_LOCALES.includes(s(manifest, 'sourceLocale') as (typeof SOURCE_LOCALES)[number]) &&
    SURFACES.includes(s(manifest, 'surface') as (typeof SURFACES)[number]) &&
    /^[a-f0-9]{64}$/i.test(s(manifest, 'sha256')) &&
    n(manifest, 'byteSize') > 0 &&
    s(manifest, 'entryIndex') === 'index.json' &&
    Array.isArray(manifest.dependencies) &&
    typeof manifest.createdAt === 'string' &&
    !Number.isNaN(Date.parse(s(manifest, 'createdAt')))
  );
}

export function buildFrenchRuntimeRegistrationServerLayout(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const repoRoot = input.repoRoot;
  const runDir = input.runDir;
  const runId = path.basename(runDir);
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const auditsDir = path.join(runDir, 'audits');
  const registrationPath = path.join(repoRoot, 'app', 'french_target_remote_registration.ts');
  const remoteLoaderPath = path.join(repoRoot, 'app', 'course_pack_remote_loader.ts');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const uploadEvidencePath = path.join(auditsDir, 'french_server_pack_upload_evidence_v2_packet.json');
  const outJson = path.join(auditsDir, 'french_runtime_registration_server_layout_v2_packet.json');
  const outMd = path.join(auditsDir, 'french_runtime_registration_server_layout_v2_packet.md');

  const registrationSource = readText(registrationPath);
  const remoteLoaderSource = readText(remoteLoaderPath);
  const contentVersion = registrationSource.match(/FRENCH_TARGET_CONTENT_VERSION\s*=\s*'([^']+)'/)?.[1] ?? '';
  const serverManifest = object(readJson<unknown>(serverManifestPath));
  const uploadEvidence = object(readJson<unknown>(uploadEvidencePath));
  const uploadServerPaths = new Set(array(uploadEvidence.uploadObjects).map((item) => s(object(item), 'serverPath')));
  const manifestEntries = array(serverManifest.entries).map((entry) => object(entry));
  const entryBySlice = new Map(manifestEntries.map((entry) => [s(entry, 'runtimeSliceId'), entry]));
  const findings: Finding[] = [];
  const requiredObjects: RequiredObject[] = [];
  let runtimeValidManifests = 0;
  let manifestsWithRelativeEntryIndex = 0;

  for (const sourceLocale of SOURCE_LOCALES) {
    for (const surface of SURFACES) {
      const runtimeSliceId = `fr-${sourceLocale}-${surface}`;
      const manifestEntry = entryBySlice.get(runtimeSliceId);
      if (!manifestEntry) {
        addFinding(findings, 'blocker', 'server_manifest_slice_missing', `Server manifest is missing ${runtimeSliceId}.`, rel(repoRoot, serverManifestPath));
        continue;
      }
      const prefix = `course-packs/fr/${sourceLocale}/${surface}/${contentVersion}`;
      const localManifestPath = path.resolve(repoRoot, s(manifestEntry, 'sliceManifest'));
      const localIndexPath = path.resolve(repoRoot, s(manifestEntry, 'entryIndex'));
      const localPayloadPath = path.resolve(repoRoot, s(manifestEntry, 'payloadShard'));
      const localManifest = fs.existsSync(localManifestPath) ? object(readJson<unknown>(localManifestPath)) : {};
      if (isRuntimeValidManifest(localManifest)) runtimeValidManifests += 1;
      if (s(localManifest, 'entryIndex') === 'index.json') manifestsWithRelativeEntryIndex += 1;
      requiredObjects.push(
        {
          runtimeSliceId,
          sourceLocale,
          surface,
          role: 'manifest',
          localPath: rel(repoRoot, localManifestPath),
          serverPath: `${prefix}/manifest.json`,
          presentLocally: fs.existsSync(localManifestPath),
          presentInUploadEvidence: uploadServerPaths.has(`${prefix}/manifest.json`),
        },
        {
          runtimeSliceId,
          sourceLocale,
          surface,
          role: 'entry_index',
          localPath: rel(repoRoot, localIndexPath),
          serverPath: `${prefix}/index.json`,
          presentLocally: fs.existsSync(localIndexPath),
          presentInUploadEvidence: uploadServerPaths.has(`${prefix}/index.json`),
        },
        {
          runtimeSliceId,
          sourceLocale,
          surface,
          role: 'payload',
          localPath: rel(repoRoot, localPayloadPath),
          serverPath: s(manifestEntry, 'serverPath'),
          presentLocally: fs.existsSync(localPayloadPath),
          presentInUploadEvidence: uploadServerPaths.has(s(manifestEntry, 'serverPath')),
        },
      );
    }
  }

  const missingLocal = requiredObjects.filter((item) => !item.presentLocally);
  const missingUpload = requiredObjects.filter((item) => !item.presentInUploadEvidence);
  for (const item of missingLocal) {
    addFinding(findings, 'blocker', 'required_local_object_missing', `Required local ${item.role} object is missing for ${item.runtimeSliceId}.`, item.localPath);
  }
  if (runtimeValidManifests !== manifestEntries.length) {
    addFinding(findings, 'blocker', 'runtime_manifest_shape_invalid', 'One or more local manifest.json files do not satisfy CoursePackManifest runtime shape.');
  }
  if (missingUpload.length > 0) {
    addFinding(findings, 'blocker', 'upload_evidence_missing_runtime_required_objects', `Upload evidence is missing ${missingUpload.length} runtime-required manifest/index/payload objects.`);
  }
  if (b(uploadEvidence.summary as JsonObject, 'activationApproved') || b(uploadEvidence.summary as JsonObject, 'runtimeDownloadsEnabled') || b(uploadEvidence.summary as JsonObject, 'readyForApply')) {
    addFinding(findings, 'blocker', 'production_flag_opened_too_early', 'Upload evidence opened activation/runtime/apply too early.', rel(repoRoot, uploadEvidencePath));
  }
  const remoteLoaderCachePathSanitized =
    remoteLoaderSource.includes('safeRelativeCachePath') &&
    remoteLoaderSource.includes("segment === '..'") &&
    remoteLoaderSource.includes("normalized.startsWith('/')") &&
    remoteLoaderSource.includes("normalized.includes('?')") &&
    remoteLoaderSource.includes('File | null') &&
    remoteLoaderSource.includes("entry index path is unsafe") &&
    remoteLoaderSource.includes('if (!file) return null;');
  if (!remoteLoaderCachePathSanitized) {
    addFinding(findings, 'blocker', 'remote_loader_cache_path_unsanitized', 'Remote loader cache paths must reject traversal/absolute/query/hash row paths before runtime downloads can be activated.', rel(repoRoot, remoteLoaderPath));
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-french-runtime-registration-server-layout-v2-packet-v0',
    runId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    inputs: {
      frenchTargetRemoteRegistration: rel(repoRoot, registrationPath),
      coursePackRemoteLoader: rel(repoRoot, remoteLoaderPath),
      serverDeliveryManifestV2: rel(repoRoot, serverManifestPath),
      frenchServerPackUploadEvidenceV2Packet: rel(repoRoot, uploadEvidencePath),
    },
    outputs: {
      packet: rel(repoRoot, outJson),
      markdown: rel(repoRoot, outMd),
    },
    summary: {
      plannedRuntimeSlices: manifestEntries.length,
      runtimeRegistrationPrefixes: SOURCE_LOCALES.length * SURFACES.length,
      requiredServerObjects: requiredObjects.length,
      localObjectsPresent: requiredObjects.filter((item) => item.presentLocally).length,
      uploadEvidenceObjects: array(uploadEvidence.uploadObjects).length,
      requiredObjectsPresentInUploadEvidence: requiredObjects.filter((item) => item.presentInUploadEvidence).length,
      missingUploadEvidenceObjects: missingUpload.length,
      runtimeValidManifests,
      manifestsWithRelativeEntryIndex,
      remoteLoaderCachePathSanitized,
      activationApproved: b(uploadEvidence.summary as JsonObject, 'activationApproved'),
      runtimeDownloadsEnabled: b(uploadEvidence.summary as JsonObject, 'runtimeDownloadsEnabled'),
      readyForApply: b(uploadEvidence.summary as JsonObject, 'readyForApply'),
      blockers,
      warnings,
    },
    requiredObjects,
    findings,
    artifactHashes: {
      frenchTargetRemoteRegistration: sha256(registrationPath),
      coursePackRemoteLoader: sha256(remoteLoaderPath),
      serverDeliveryManifestV2: sha256(serverManifestPath),
      frenchServerPackUploadEvidenceV2Packet: sha256(uploadEvidencePath),
    },
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  return report;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Runtime Registration Server Layout V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Runtime slices: ${report.summary.plannedRuntimeSlices}`,
    `- Required server objects: ${report.summary.requiredServerObjects}`,
    `- Upload evidence objects: ${report.summary.uploadEvidenceObjects}`,
    `- Missing upload evidence objects: ${report.summary.missingUploadEvidenceObjects}`,
    `- Runtime-valid manifests: ${report.summary.runtimeValidManifests}/${report.summary.plannedRuntimeSlices}`,
    `- Remote loader cache path sanitized: ${report.summary.remoteLoaderCachePathSanitized ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push('', '## Missing Upload Evidence Objects', '');
  for (const item of report.requiredObjects.filter((objectRef) => !objectRef.presentInUploadEvidence)) {
    lines.push(`- \`${item.runtimeSliceId}\` ${item.role}: \`${item.serverPath}\``);
  }
  lines.push('', '## Safety', '', '- No production app files are modified.', '- No Firebase/server upload is started.', '- Runtime downloads and apply remain closed.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_french_runtime_registration_server_layout_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('French runtime registration server layout packet is scoped to --target fr.');
  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(auditsDir, { recursive: true });
  const report = buildFrenchRuntimeRegistrationServerLayout({ repoRoot, runDir });
  const outJson = path.join(auditsDir, 'french_runtime_registration_server_layout_v2_packet.json');
  const outMd = path.join(auditsDir, 'french_runtime_registration_server_layout_v2_packet.md');
  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French runtime registration/server layout V2 packet: ${report.status}`);
  console.log(`Required server objects: ${report.summary.requiredServerObjects}`);
  console.log(`Missing upload evidence objects: ${report.summary.missingUploadEvidenceObjects}`);
  console.log(`Runtime-valid manifests: ${report.summary.runtimeValidManifests}/${report.summary.plannedRuntimeSlices}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (report.summary.blockers > 0) process.exitCode = 1;
}

if (require.main === module) {
  main();
}
