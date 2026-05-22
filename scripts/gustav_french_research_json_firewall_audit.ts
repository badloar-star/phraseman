import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
  jsonPath?: string;
};

type Audit = {
  schemaVersion: 'gustav-french-research-json-firewall-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    scannedJsonFiles: number;
    scannedResearchJsonFiles: number;
    rowLedgerFiles: number;
    blockerFindings: number;
    warningFindings: number;
    forbiddenOutputFields: number;
    forbiddenPermissionFlags: number;
    falseApprovalFlags: number;
    runtimeActivationFlags: number;
    rowLedgerNullOutputFields: number;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    noFrenchContentGenerated: boolean;
  };
  firewallPolicy: {
    targetStudyLanguage: 'fr';
    allowedSourceLocales: Array<'ru' | 'uk'>;
    forbiddenOutputKeys: string[];
    permissionFlagsThatMustNotBeTrue: string[];
    approvalFlagsThatMustNotBeTrue: string[];
    activationStatusMustRemainBlocked: true;
    rowLedgerOutputFieldsMustBeNull: true;
  };
  scannedFiles: string[];
  findings: Finding[];
};

const FORBIDDEN_OUTPUT_KEYS = new Set([
  'proposedFrench',
  'wordsFr',
  'french',
  'introExamples',
  'quizPrompts',
  'examRows',
]);

const PERMISSION_FLAGS = new Set([
  'mayWriteAppSeed',
  'mayWriteIntroExamples',
  'mayWriteQuizOrExam',
  'mayDraftTargetText',
  'mayStartTranslationNow',
  'mayStartFrenchGeneration',
  'mayModifyProductionAppFiles',
]);

const APPROVAL_FLAGS = new Set([
  'approvedForApply',
  'approvedByReviewer',
  'approvedForDrafting',
  'appSeedApproved',
  'introApproved',
  'appSeedRuntimeAllowed',
  'introRuntimeAllowed',
]);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEmptyOutputValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function jsonPathJoin(base: string, key: string | number): string {
  return typeof key === 'number' ? `${base}[${key}]` : `${base}.${key}`;
}

function inspectValue(
  value: unknown,
  filePath: string,
  jsonPath: string,
  isRowLedger: boolean,
  findings: Finding[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectValue(entry, filePath, jsonPathJoin(jsonPath, index), isRowLedger, findings));
    return;
  }
  if (!isPlainObject(value)) return;

  for (const [key, entry] of Object.entries(value)) {
    const currentPath = jsonPathJoin(jsonPath, key);

    if (FORBIDDEN_OUTPUT_KEYS.has(key)) {
      if (!isEmptyOutputValue(entry)) {
        findings.push({
          severity: 'blocker',
          code: 'french_research_output_field_has_value',
          message: `French research JSON must not carry target output in ${key}.`,
          filePath,
          jsonPath: currentPath,
        });
      } else if (!isRowLedger && (key === 'proposedFrench' || key === 'wordsFr')) {
        findings.push({
          severity: 'blocker',
          code: 'french_research_packet_output_field_present',
          message: `French research packets must not include ${key}; only row ledgers may keep null placeholders.`,
          filePath,
          jsonPath: currentPath,
        });
      }
    }

    if (PERMISSION_FLAGS.has(key) && entry === true) {
      findings.push({
        severity: 'blocker',
        code: 'french_research_permission_flag_open',
        message: `French research JSON must not open permission flag ${key}.`,
        filePath,
        jsonPath: currentPath,
      });
    }

    if (APPROVAL_FLAGS.has(key) && entry === true) {
      findings.push({
        severity: 'blocker',
        code: 'french_research_false_approval_flag',
        message: `French research JSON must not set approval flag ${key} before reviewer approval.`,
        filePath,
        jsonPath: currentPath,
      });
    }

    if (
      key === 'activationStatus' &&
      entry !== 'blocked' &&
      !(isRowLedger && jsonPath === '$' && entry === 'blocked_pending_source_review')
    ) {
      findings.push({
        severity: 'blocker',
        code: 'french_research_activation_not_blocked',
        message: 'French research JSON activationStatus must remain blocked.',
        filePath,
        jsonPath: currentPath,
      });
    }

    if (
      (key === 'approvalRecordStatus' && entry === 'approved_by_reviewer') ||
      (key === 'curriculumStatus' && entry === 'approved') ||
      (key === 'meaningReviewStatus' && entry === 'accepted') ||
      (key === 'grammarReviewStatus' && entry === 'accepted')
    ) {
      findings.push({
        severity: 'blocker',
        code: 'french_research_false_status_approval',
        message: `French research JSON status ${key} cannot be approved before reviewer evidence is filled.`,
        filePath,
        jsonPath: currentPath,
      });
    }

    inspectValue(entry, filePath, currentPath, isRowLedger, findings);
  }
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV French Research JSON Firewall Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Scanned JSON files: ${audit.summary.scannedJsonFiles}`,
    `- Research JSON files: ${audit.summary.scannedResearchJsonFiles}`,
    `- Row ledger files: ${audit.summary.rowLedgerFiles}`,
    `- Forbidden output field findings: ${audit.summary.forbiddenOutputFields}`,
    `- Forbidden permission flags: ${audit.summary.forbiddenPermissionFlags}`,
    `- False approval flags: ${audit.summary.falseApprovalFlags}`,
    `- Runtime activation flags: ${audit.summary.runtimeActivationFlags}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockerFindings}`,
    `- Warnings: ${audit.summary.warningFindings}`,
    '',
    '## Findings',
    '',
  ];

  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
      if (finding.jsonPath) lines.push(`  - jsonPath: \`${finding.jsonPath}\``);
    }
  }

  lines.push('', '## Scanned Files', '');
  for (const file of audit.scannedFiles) lines.push(`- \`${file}\``);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_research_json_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const researchDir = path.join(runDir, 'research');
  const findings: Finding[] = [];
  const jsonFiles = walkJsonFiles(researchDir);

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(repoRoot, filePath);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      findings.push({
        severity: 'blocker',
        code: 'french_research_json_parse_error',
        message: 'French research JSON must be parseable.',
        filePath: relativePath,
      });
      continue;
    }
    const isRowLedger = /_row_ledger\.json$/.test(filePath);
    inspectValue(parsed, relativePath, '$', isRowLedger, findings);
  }

  const forbiddenOutputFields = findings.filter((finding) =>
    finding.code === 'french_research_output_field_has_value' ||
    finding.code === 'french_research_packet_output_field_present'
  ).length;
  const forbiddenPermissionFlags = findings.filter((finding) => finding.code === 'french_research_permission_flag_open').length;
  const falseApprovalFlags = findings.filter((finding) =>
    finding.code === 'french_research_false_approval_flag' ||
    finding.code === 'french_research_false_status_approval'
  ).length;
  const runtimeActivationFlags = findings.filter((finding) => finding.code === 'french_research_activation_not_blocked').length;
  const blockerFindings = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningFindings = findings.filter((finding) => finding.severity === 'warning').length;

  const audit: Audit = {
    schemaVersion: 'gustav-french-research-json-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockerFindings > 0 ? 'BLOCK' : warningFindings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      scannedJsonFiles: jsonFiles.length,
      scannedResearchJsonFiles: jsonFiles.length,
      rowLedgerFiles: jsonFiles.filter((filePath) => /_row_ledger\.json$/.test(filePath)).length,
      blockerFindings,
      warningFindings,
      forbiddenOutputFields,
      forbiddenPermissionFlags,
      falseApprovalFlags,
      runtimeActivationFlags,
      rowLedgerNullOutputFields: jsonFiles.filter((filePath) => /_row_ledger\.json$/.test(filePath)).length,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      noFrenchContentGenerated: blockerFindings === 0,
    },
    firewallPolicy: {
      targetStudyLanguage: 'fr',
      allowedSourceLocales: ['ru', 'uk'],
      forbiddenOutputKeys: Array.from(FORBIDDEN_OUTPUT_KEYS),
      permissionFlagsThatMustNotBeTrue: Array.from(PERMISSION_FLAGS),
      approvalFlagsThatMustNotBeTrue: Array.from(APPROVAL_FLAGS),
      activationStatusMustRemainBlocked: true,
      rowLedgerOutputFieldsMustBeNull: true,
    },
    scannedFiles: jsonFiles.map((filePath) => path.relative(repoRoot, filePath)),
    findings,
  };

  const outJson = path.join(runDir, 'audits', 'french_research_json_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'french_research_json_firewall_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV French research JSON firewall audit: ${audit.status}`);
  console.log(`Scanned JSON files: ${audit.summary.scannedJsonFiles}`);
  console.log(`Forbidden output fields: ${audit.summary.forbiddenOutputFields}`);
  console.log(`Forbidden permission flags: ${audit.summary.forbiddenPermissionFlags}`);
  console.log(`False approval flags: ${audit.summary.falseApprovalFlags}`);
  console.log(`Runtime activation flags: ${audit.summary.runtimeActivationFlags}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (audit.status === 'BLOCK') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
