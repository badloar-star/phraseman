import * as fs from 'node:fs';
import * as path from 'node:path';

type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
  sample?: string;
};

type Report = {
  schemaVersion: 'gustav-french-runtime-content-integrity-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    filesScanned: number;
    runtimePayloadFiles: number;
    promotedDecisionFiles: number;
    reviewerTemplateFiles: number;
    textFieldsScanned: number;
    mojibakeFields: number;
    replacementCharFields: number;
    placeholderTextFields: number;
    runtimePayloadMojibakeFields: number;
    promotedDecisionMojibakeFields: number;
    reviewerTemplateMojibakeFields: number;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    blockers: number;
    warnings: number;
  };
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type Scope = 'runtime_payload' | 'promoted_decision' | 'reviewer_template' | 'other_generated';

const MOJIBAKE_RE = /[ÃÂÐÑ]|[\u0080-\u009f]|�/;
const PLACEHOLDER_TEXT_RE = /\b(?:placeholder|stub|dummy|lorem|todo|fixme|tbd)\b|<[^>]+>|\{\{[^}]+\}\}/i;

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

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(filePath));
    else if (/\.(json|jsonl|tsv)$/i.test(entry.name)) files.push(filePath);
  }
  return files;
}

function scopeFor(filePath: string): Scope {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized.includes('/pack_candidates/fr/runtime_slices/') && /payload-[^/]+\.json$/.test(normalized)) return 'runtime_payload';
  if (normalized.includes('/generated/fr/reviewer/llm_official_source_promoted_decisions_v2/')) return 'promoted_decision';
  if (normalized.includes('/generated/fr/reviewer/') && /template_v2\.(jsonl|tsv)$/.test(normalized)) return 'reviewer_template';
  return 'other_generated';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string, sample?: string): void {
  findings.push({ severity, code, message, path: filePath, sample });
}

function shouldScanString(keyPath: string): boolean {
  const lower = keyPath.toLowerCase();
  if (lower.includes('sha256') || lower.includes('hash') || lower.includes('url') || lower.includes('path')) return false;
  if (lower.includes('generatedat') || lower.includes('reviewedat') || lower.includes('materializedat')) return false;
  return true;
}

function scanJsonValue(value: unknown, filePath: string, keyPath: string, scope: Scope, findings: Finding[], counters: Record<string, number>): void {
  if (typeof value === 'string') {
    if (!shouldScanString(keyPath)) return;
    counters.textFieldsScanned += 1;
    if (MOJIBAKE_RE.test(value)) {
      counters.mojibakeFields += 1;
      counters[`${scope}MojibakeFields`] = (counters[`${scope}MojibakeFields`] ?? 0) + 1;
      addFinding(findings, 'blocker', 'mojibake_text_field', `Mojibake marker in ${scope} field ${keyPath}.`, filePath, value.slice(0, 180));
    }
    if (value.includes('�')) {
      counters.replacementCharFields += 1;
      addFinding(findings, 'blocker', 'replacement_character_text_field', `Replacement character in ${scope} field ${keyPath}.`, filePath, value.slice(0, 180));
    }
    if (PLACEHOLDER_TEXT_RE.test(value)) {
      counters.placeholderTextFields += 1;
      addFinding(findings, scope === 'runtime_payload' ? 'blocker' : 'warning', 'placeholder_text_field', `Placeholder-like text in ${scope} field ${keyPath}.`, filePath, value.slice(0, 180));
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanJsonValue(entry, filePath, `${keyPath}[${index}]`, scope, findings, counters));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      scanJsonValue(entry, filePath, keyPath ? `${keyPath}.${key}` : key, scope, findings, counters);
    }
  }
}

function parseJsonl(text: string): unknown[] {
  return text.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function scanFile(filePath: string, repoRoot: string, findings: Finding[], counters: Record<string, number>): void {
  const scope = scopeFor(filePath);
  const relative = rel(repoRoot, filePath);
  counters.filesScanned += 1;
  if (scope === 'runtime_payload') counters.runtimePayloadFiles += 1;
  if (scope === 'promoted_decision') counters.promotedDecisionFiles += 1;
  if (scope === 'reviewer_template') counters.reviewerTemplateFiles += 1;
  const text = fs.readFileSync(filePath, 'utf8');
  try {
    if (filePath.endsWith('.json')) scanJsonValue(JSON.parse(text), relative, '$', scope, findings, counters);
    else if (filePath.endsWith('.jsonl')) parseJsonl(text).forEach((row, index) => scanJsonValue(row, relative, `$[${index}]`, scope, findings, counters));
    else if (filePath.endsWith('.tsv')) {
      text.split(/\r?\n/).filter(Boolean).forEach((line, index) => {
        line.split('\t').forEach((cell, column) => scanJsonValue(cell, relative, `$[${index}][${column}]`, scope, findings, counters));
      });
    }
  } catch (error) {
    addFinding(findings, 'blocker', 'content_file_parse_failed', `Could not parse content file: ${(error as Error).message}`, relative);
  }
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Runtime Content Integrity Audit',
    '',
    `Status: \`${report.status}\``,
    '',
    `- Files scanned: ${report.summary.filesScanned}`,
    `- Runtime payload files: ${report.summary.runtimePayloadFiles}`,
    `- Promoted decision files: ${report.summary.promotedDecisionFiles}`,
    `- Reviewer template files: ${report.summary.reviewerTemplateFiles}`,
    `- Text fields scanned: ${report.summary.textFieldsScanned}`,
    `- Mojibake fields: ${report.summary.mojibakeFields}`,
    `- Placeholder text fields: ${report.summary.placeholderTextFields}`,
    `- Runtime payload mojibake fields: ${report.summary.runtimePayloadMojibakeFields}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Findings',
    '',
  ];
  for (const finding of report.findings.slice(0, 200)) {
    lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  if (report.findings.length > 200) lines.push(`- ... ${report.findings.length - 200} more findings omitted from markdown.`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg || target !== 'fr') throw new Error('Usage: npx tsx scripts/gustav_french_runtime_content_integrity_audit.ts --run <run-dir> --target fr');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  const findings: Finding[] = [];
  const counters: Record<string, number> = {
    filesScanned: 0,
    runtimePayloadFiles: 0,
    promotedDecisionFiles: 0,
    reviewerTemplateFiles: 0,
    textFieldsScanned: 0,
    mojibakeFields: 0,
    replacementCharFields: 0,
    placeholderTextFields: 0,
    runtime_payloadMojibakeFields: 0,
    promoted_decisionMojibakeFields: 0,
    reviewer_templateMojibakeFields: 0,
  };

  const files = [
    ...walk(path.join(runDir, 'pack_candidates', 'fr', 'runtime_slices')),
    ...walk(path.join(runDir, 'generated', 'fr', 'reviewer')),
  ];
  for (const filePath of files) scanFile(filePath, repoRoot, findings, counters);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-french-runtime-content-integrity-audit-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    summary: {
      filesScanned: counters.filesScanned,
      runtimePayloadFiles: counters.runtimePayloadFiles,
      promotedDecisionFiles: counters.promotedDecisionFiles,
      reviewerTemplateFiles: counters.reviewerTemplateFiles,
      textFieldsScanned: counters.textFieldsScanned,
      mojibakeFields: counters.mojibakeFields,
      replacementCharFields: counters.replacementCharFields,
      placeholderTextFields: counters.placeholderTextFields,
      runtimePayloadMojibakeFields: counters.runtime_payloadMojibakeFields,
      promotedDecisionMojibakeFields: counters.promoted_decisionMojibakeFields,
      reviewerTemplateMojibakeFields: counters.reviewer_templateMojibakeFields,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'french_runtime_content_integrity_audit.json');
  const outMd = path.join(auditsDir, 'french_runtime_content_integrity_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French runtime content integrity audit: ${report.status}`);
  console.log(`Text fields scanned: ${report.summary.textFieldsScanned}`);
  console.log(`Mojibake fields: ${report.summary.mojibakeFields}`);
  console.log(`Placeholder text fields: ${report.summary.placeholderTextFields}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
