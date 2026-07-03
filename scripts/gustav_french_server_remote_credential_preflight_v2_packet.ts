import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
};

type Report = {
  schemaVersion: 'gustav-french-server-remote-credential-preflight-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    targetLocale: 'fr';
    bucket: string;
    accessTokenEnvPresent: boolean;
    accessTokenLength: number;
    googleApplicationCredentialsEnvPresent: boolean;
    googleApplicationCredentialsFileExists: boolean;
    googleApplicationCredentialsServiceAccountUsable: boolean;
    multipleCredentialSourcesPresent: boolean;
    credentialSource: 'access_token_env' | 'service_account_file' | 'missing';
    firebaseTokenEnvPresent: boolean;
    acceptedForRemoteVerifyNow: boolean;
    readyForRemoteObjectVerifyCommand: boolean;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  findings: Finding[];
  nextCommand: string;
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

const STORAGE_BUCKET = 'phraseman-ea0b3.firebasestorage.app';

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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string): void {
  findings.push({ severity, code, message });
}

export function buildFrenchServerRemoteCredentialPreflight(input: {
  repoRoot: string;
  runDir: string;
  bucket: string;
  accessToken: string;
  googleApplicationCredentials: string;
  firebaseToken: string;
}): Report {
  const findings: Finding[] = [];
  const googleApplicationCredentialsPath = input.googleApplicationCredentials
    ? path.resolve(input.repoRoot, input.googleApplicationCredentials)
    : '';
  const googleApplicationCredentialsFileExists =
    input.googleApplicationCredentials !== '' &&
    fs.existsSync(googleApplicationCredentialsPath);
  const googleApplicationCredentialsServiceAccountUsable =
    googleApplicationCredentialsFileExists && isUsableServiceAccountCredential(googleApplicationCredentialsPath);
  const accessTokenEnvPresent = input.accessToken.length > 0;
  const multipleCredentialSourcesPresent = accessTokenEnvPresent && input.googleApplicationCredentials !== '';
  const credentialSource = accessTokenEnvPresent
    ? 'access_token_env'
    : googleApplicationCredentialsServiceAccountUsable
      ? 'service_account_file'
      : 'missing';
  const acceptedForRemoteVerifyNow = credentialSource !== 'missing' && !multipleCredentialSourcesPresent;

  if (!input.bucket) {
    addFinding(findings, 'blocker', 'remote_verify_bucket_missing', 'PHRASEMAN_FRENCH_SERVER_PACK_BUCKET or default bucket is required.');
  }
  if (credentialSource === 'missing') {
    addFinding(findings, 'blocker', 'remote_verify_credentials_missing', 'Set PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS with a usable service-account JSON before running remote object verification.');
  }
  if (multipleCredentialSourcesPresent) {
    addFinding(findings, 'blocker', 'remote_verify_multiple_credential_sources', 'Provide exactly one remote verify credential source: PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS, not both.');
  }
  if (input.googleApplicationCredentials && !googleApplicationCredentialsFileExists) {
    addFinding(findings, 'warning', 'google_application_credentials_file_missing', 'GOOGLE_APPLICATION_CREDENTIALS is set but the file does not exist from this workspace.');
  }
  if (input.googleApplicationCredentials && googleApplicationCredentialsFileExists && !googleApplicationCredentialsServiceAccountUsable) {
    addFinding(findings, 'warning', 'google_application_credentials_service_account_unusable', 'GOOGLE_APPLICATION_CREDENTIALS exists, but is not a usable service-account JSON for read-only remote verification.');
  }
  if (input.firebaseToken && !acceptedForRemoteVerifyNow) {
    addFinding(findings, 'info', 'firebase_token_not_used_for_remote_verify', 'FIREBASE_TOKEN is present, but remote verify requires PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS service-account JSON.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const nextCommand = `npx tsx scripts\\gustav_french_server_object_remote_verify_v2_packet.ts --run ${rel(input.repoRoot, input.runDir).split('/').join('\\')} --target fr`;

  return {
    schemaVersion: 'gustav-french-server-remote-credential-preflight-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: input.repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      targetLocale: 'fr',
      bucket: input.bucket,
      accessTokenEnvPresent,
      accessTokenLength: input.accessToken.length,
      googleApplicationCredentialsEnvPresent: input.googleApplicationCredentials !== '',
      googleApplicationCredentialsFileExists,
      googleApplicationCredentialsServiceAccountUsable,
      multipleCredentialSourcesPresent,
      credentialSource,
      firebaseTokenEnvPresent: input.firebaseToken !== '',
      acceptedForRemoteVerifyNow,
      readyForRemoteObjectVerifyCommand: status === 'PASS' && acceptedForRemoteVerifyNow,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      blockers,
      warnings,
    },
    inputs: {},
    outputs: {},
    findings,
    nextCommand,
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

function isUsableServiceAccountCredential(filePath: string): boolean {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    return parsed.type === 'service_account' &&
      typeof parsed.client_email === 'string' &&
      (parsed.client_email as string).includes('@') &&
      typeof parsed.private_key === 'string' &&
      (parsed.private_key as string).includes('BEGIN PRIVATE KEY');
  } catch {
    return false;
  }
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Server Remote Credential Preflight V2',
    '',
    `- Status: ${report.status}`,
    `- Bucket: ${report.summary.bucket}`,
    `- Access token env present: ${report.summary.accessTokenEnvPresent ? 'yes' : 'no'}`,
    `- Access token length: ${report.summary.accessTokenLength}`,
    `- GOOGLE_APPLICATION_CREDENTIALS env/file: ${report.summary.googleApplicationCredentialsEnvPresent ? 'yes' : 'no'}/${report.summary.googleApplicationCredentialsFileExists ? 'yes' : 'no'}`,
    `- GOOGLE_APPLICATION_CREDENTIALS service account usable: ${report.summary.googleApplicationCredentialsServiceAccountUsable ? 'yes' : 'no'}`,
    `- Multiple credential sources present: ${report.summary.multipleCredentialSourcesPresent ? 'yes' : 'no'}`,
    `- Credential source: ${report.summary.credentialSource}`,
    `- FIREBASE_TOKEN env present: ${report.summary.firebaseTokenEnvPresent ? 'yes' : 'no'}`,
    `- Ready for remote object verify command: ${report.summary.readyForRemoteObjectVerifyCommand ? 'yes' : 'no'}`,
    `- Next command: \`${report.nextCommand}\``,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- Does not print token contents.', '- Does not upload, modify server objects, enable runtime downloads, approve activation or apply.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_server_remote_credential_preflight_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_server_remote_credential_preflight_v2_packet.md');
  const report = buildFrenchServerRemoteCredentialPreflight({
    repoRoot,
    runDir,
    bucket: process.env.PHRASEMAN_FRENCH_SERVER_PACK_BUCKET || STORAGE_BUCKET,
    accessToken: process.env.PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN || '',
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    firebaseToken: process.env.FIREBASE_TOKEN || '',
  });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French server remote credential preflight V2 packet: ${report.status}`);
  console.log(`Access token env present: ${report.summary.accessTokenEnvPresent ? 'yes' : 'no'}`);
  console.log(`Credential source: ${report.summary.credentialSource}`);
  console.log(`Ready for remote verify command: ${report.summary.readyForRemoteObjectVerifyCommand ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
