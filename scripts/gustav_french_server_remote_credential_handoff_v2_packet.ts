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

type Report = {
  schemaVersion: 'gustav-french-server-remote-credential-handoff-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    handoffState: 'credential_ready_for_remote_verify' | 'waiting_for_remote_credentials' | 'blocked_by_findings';
    credentialSource: 'access_token_env' | 'service_account_file' | 'missing';
    multipleCredentialSourcesPresent: boolean;
    credentialPreflightStatus: string;
    credentialPreflightReady: boolean;
    remoteVerifyStatus: string;
    remoteVerifyCredentialSource: string;
    remoteVerifyBlockedByCredentials: boolean;
    acceptedCredentialOptions: string[];
    commandSequence: number;
    nextRequiredCommand: string;
    credentialsPrintedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  commands: string[];
  operatorNotes: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    credentialsPrintedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const ACCEPTED_CREDENTIAL_OPTIONS = [
  'PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

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

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  return raw === true || raw === 'true' || raw === 'yes';
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

export function buildFrenchServerRemoteCredentialHandoff(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const credentialPreflightPath = path.join(auditsDir, 'french_server_remote_credential_preflight_v2_packet.json');
  const remoteVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const credentialPreflight = readJsonOrEmpty(credentialPreflightPath);
  const remoteVerify = readJsonOrEmpty(remoteVerifyPath);
  const credentialSummary = summaryOf(credentialPreflight);
  const remoteVerifySummary = summaryOf(remoteVerify);
  const findings: Finding[] = [];

  if (!fs.existsSync(credentialPreflightPath)) {
    addFinding(findings, 'blocker', 'credential_preflight_missing', 'Remote credential handoff requires french_server_remote_credential_preflight_v2_packet.json.', credentialPreflightPath);
  }
  if (!fs.existsSync(remoteVerifyPath)) {
    addFinding(findings, 'blocker', 'remote_verify_packet_missing', 'Remote credential handoff requires french_server_object_remote_verify_v2_packet.json.', remoteVerifyPath);
  }

  const credentialSource = s(credentialSummary, 'credentialSource') as Report['summary']['credentialSource'] || 'missing';
  const multipleCredentialSourcesPresent = b(credentialSummary, 'multipleCredentialSourcesPresent');
  const credentialPreflightReady = s(credentialPreflight, 'status') === 'PASS' &&
    b(credentialSummary, 'readyForRemoteObjectVerifyCommand') &&
    (credentialSource === 'access_token_env' || credentialSource === 'service_account_file');
  const remoteVerifyBlockedByCredentials =
    s(remoteVerify, 'status') === 'BLOCK' &&
    s(remoteVerifySummary, 'credentialSource') === 'missing' &&
    n(remoteVerifySummary, 'hashCheckedCount') === 0;

  if (credentialSource !== 'access_token_env' && credentialSource !== 'service_account_file' && credentialSource !== 'missing') {
    addFinding(findings, 'blocker', 'credential_source_invalid', `Unexpected credential source: ${credentialSource}`);
  }
  if (multipleCredentialSourcesPresent) {
    addFinding(findings, 'blocker', 'credential_handoff_multiple_credential_sources', 'Credential handoff requires exactly one remote verify credential source, not both accepted env sources.');
  }
  if (b(credentialSummary, 'serverUploadAllowed') || b(credentialSummary, 'runtimeDownloadsEnabled') || b(credentialSummary, 'activationApproved') || b(credentialSummary, 'readyForApply')) {
    addFinding(findings, 'blocker', 'credential_preflight_opened_production_flag', 'Credential preflight must not open upload/runtime/activation/apply flags.', credentialPreflightPath);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const handoffState: Report['summary']['handoffState'] =
    blockers > 0
      ? 'blocked_by_findings'
      : credentialPreflightReady
        ? 'credential_ready_for_remote_verify'
        : 'waiting_for_remote_credentials';
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const commands = [
    'npx tsx scripts\\gustav_french_server_remote_credential_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_server_object_remote_verify_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
  ];

  return {
    schemaVersion: 'gustav-french-server-remote-credential-handoff-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    summary: {
      targetLocale: 'fr',
      handoffState,
      credentialSource,
      multipleCredentialSourcesPresent,
      credentialPreflightStatus: s(credentialPreflight, 'status'),
      credentialPreflightReady,
      remoteVerifyStatus: s(remoteVerify, 'status'),
      remoteVerifyCredentialSource: s(remoteVerifySummary, 'credentialSource'),
      remoteVerifyBlockedByCredentials,
      acceptedCredentialOptions: [...ACCEPTED_CREDENTIAL_OPTIONS],
      commandSequence: commands.length,
      nextRequiredCommand: credentialPreflightReady ? commands[1] : commands[0],
      credentialsPrintedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      blockers,
      warnings,
    },
    inputs: {
      frenchServerRemoteCredentialPreflightV2Packet: rel(input.repoRoot, credentialPreflightPath),
      frenchServerObjectRemoteVerifyV2Packet: rel(input.repoRoot, remoteVerifyPath),
    },
    outputs: {},
    commands,
    operatorNotes: [
      'Provide exactly one accepted read-only credential source before remote verify: PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS.',
      'Do not paste token or private-key contents into reports, prompts, commits, logs, or markdown.',
      'After credentials are present, rerun credential preflight, remote object verify, production readiness completion audit, and master manifest.',
      'Keep upload/apply/runtime-download/storage/cloud activation flags closed until remote verify is PASS and later approval gates pass.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      credentialsPrintedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Server Remote Credential Handoff V2',
    '',
    `- Status: ${report.status}`,
    `- Handoff state: ${report.summary.handoffState}`,
    `- Credential source: ${report.summary.credentialSource}`,
    `- Multiple credential sources present: ${report.summary.multipleCredentialSourcesPresent ? 'yes' : 'no'}`,
    `- Credential preflight ready: ${report.summary.credentialPreflightReady ? 'yes' : 'no'}`,
    `- Remote verify blocked by credentials: ${report.summary.remoteVerifyBlockedByCredentials ? 'yes' : 'no'}`,
    `- Next command: \`${report.summary.nextRequiredCommand}\``,
    '',
    '## Accepted Credential Options',
    '',
    ...report.summary.acceptedCredentialOptions.map((option) => `- ${option}`),
    '',
    '## Commands',
    '',
    ...report.commands.map((command) => `- \`${command}\``),
    '',
    '## Operator Notes',
    '',
    ...report.operatorNotes.map((note) => `- ${note}`),
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- Does not print token/private-key contents.', '- Does not upload, modify server objects, enable runtime downloads, approve activation or apply.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_server_remote_credential_handoff_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_server_remote_credential_handoff_v2_packet.md');
  const report = buildFrenchServerRemoteCredentialHandoff({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French server remote credential handoff V2 packet: ${report.status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`Credential source: ${report.summary.credentialSource}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
