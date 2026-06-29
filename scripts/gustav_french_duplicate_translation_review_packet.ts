import * as fs from 'node:fs';
import * as path from 'node:path';

type GeneratedRow = {
  lessonId: number;
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  sourcePath: string;
};

type DuplicateGroup = {
  proposedFrench: string;
  rows: GeneratedRow[];
  distinctEnglish: number;
  sourceMeaningEquivalent: boolean;
  englishCoreEquivalent: boolean;
  disposition: 'expected_present_aspect_collapse' | 'reviewer_attention';
  reviewerNote: string;
};

type Report = {
  schemaVersion: 'gustav-french-duplicate-translation-review-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    duplicateFrenchValues: number;
    duplicateRows: number;
    expectedPresentAspectCollapseValues: number;
    reviewerAttentionValues: number;
    blockerCandidates: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  groups: DuplicateGroup[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function lessonIdFromFile(filePath: string): number {
  const match = /lesson(\d+)_row_ledger\.json$/.exec(path.basename(filePath));
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function frenchDuplicateKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02BC`\u00B4]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr');
}

function sortedMeaningTokens(value: string): string {
  return normalizeText(value)
    .replace(/\u0451/g, '\u0435')
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

function englishCore(value: string): string {
  return normalizeText(value)
    .split(' ')
    .filter((token) => !['do', 'does', 'am', 'is', 'are'].includes(token))
    .map((token) => token.endsWith('ing') && token.length > 4 ? token.slice(0, -3) : token)
    .join(' ');
}

function sourceMeaningEquivalent(rows: GeneratedRow[]): boolean {
  const ru = new Set(rows.map((row) => sortedMeaningTokens(row.russianMeaning)));
  const uk = new Set(rows.map((row) => sortedMeaningTokens(row.ukrainianMeaning)));
  return ru.size === 1 && uk.size === 1;
}

function englishCoreEquivalent(rows: GeneratedRow[]): boolean {
  return new Set(rows.map((row) => englishCore(row.englishBase))).size === 1;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Duplicate Translation Review Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Duplicate French values: ${report.summary.duplicateFrenchValues}`,
    `- Duplicate rows: ${report.summary.duplicateRows}`,
    `- Expected present-aspect collapse values: ${report.summary.expectedPresentAspectCollapseValues}`,
    `- Reviewer attention values: ${report.summary.reviewerAttentionValues}`,
    `- Blocker candidates: ${report.summary.blockerCandidates}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Groups',
    '',
  ];

  for (const group of report.groups) {
    lines.push(`### ${group.proposedFrench}`);
    lines.push('');
    lines.push(`- Disposition: \`${group.disposition}\``);
    lines.push(`- Source meaning equivalent: ${group.sourceMeaningEquivalent ? 'yes' : 'no'}`);
    lines.push(`- English core equivalent: ${group.englishCoreEquivalent ? 'yes' : 'no'}`);
    lines.push(`- Reviewer note: ${group.reviewerNote}`);
    lines.push('');
    for (const row of group.rows) {
      lines.push(`- \`${row.phraseId}\` lesson ${row.lessonId}: ${row.englishBase} | RU: ${row.russianMeaning} | UK: ${row.ukrainianMeaning}`);
    }
    lines.push('');
  }

  lines.push('## Safety', '');
  lines.push('- This packet is reviewer evidence only.');
  lines.push('- It does not accept rows for app apply.');
  lines.push('- It does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_duplicate_translation_review_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const auditsDir = path.join(runDir, 'audits');
  const rows: GeneratedRow[] = [];

  const ledgerFiles = fs.readdirSync(generatedDir)
    .filter((file) => file.endsWith('_row_ledger.json'))
    .map((file) => path.join(generatedDir, file))
    .sort((a, b) => lessonIdFromFile(a) - lessonIdFromFile(b));

  for (const filePath of ledgerFiles) {
    const ledger = readJson<{ lessonId: number; rows: Array<Record<string, unknown>> }>(filePath);
    for (const row of ledger.rows) {
      rows.push({
        lessonId: ledger.lessonId,
        phraseId: String(row.phraseId),
        englishBase: String(row.englishBase),
        russianMeaning: String(row.russianMeaning),
        ukrainianMeaning: String(row.ukrainianMeaning),
        proposedFrench: String(row.proposedFrench),
        sourcePath: artifactPath(repoRoot, filePath),
      });
    }
  }

  const byFrench = new Map<string, GeneratedRow[]>();
  for (const row of rows) {
    const key = frenchDuplicateKey(row.proposedFrench);
    const group = byFrench.get(key) ?? [];
    group.push(row);
    byFrench.set(key, group);
  }

  const groups: DuplicateGroup[] = Array.from(byFrench.values())
    .filter((groupRows) => new Set(groupRows.map((row) => row.englishBase)).size > 1)
    .map((groupRows) => {
      const meaningEquivalent = sourceMeaningEquivalent(groupRows);
      const coreEquivalent = englishCoreEquivalent(groupRows);
      const disposition: DuplicateGroup['disposition'] = meaningEquivalent
        ? 'expected_present_aspect_collapse'
        : 'reviewer_attention';
      const reviewerNote = disposition === 'expected_present_aspect_collapse'
        ? 'French present naturally covers these English simple-present and present-progressive source variants; keep for LLM official-source review, not app apply.'
        : 'Duplicate French value needs reviewer attention before any future apply decision.';
      return {
        proposedFrench: groupRows[0].proposedFrench,
        rows: groupRows.sort((a, b) => a.lessonId - b.lessonId || a.phraseId.localeCompare(b.phraseId)),
        distinctEnglish: new Set(groupRows.map((row) => row.englishBase)).size,
        sourceMeaningEquivalent: meaningEquivalent,
        englishCoreEquivalent: coreEquivalent,
        disposition,
        reviewerNote,
      };
    })
    .sort((a, b) => a.rows[0].lessonId - b.rows[0].lessonId || a.proposedFrench.localeCompare(b.proposedFrench));

  const expectedPresentAspectCollapseValues = groups.filter((group) => group.disposition === 'expected_present_aspect_collapse').length;
  const reviewerAttentionValues = groups.filter((group) => group.disposition === 'reviewer_attention').length;

  const report: Report = {
    schemaVersion: 'gustav-french-duplicate-translation-review-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      duplicateFrenchValues: groups.length,
      duplicateRows: groups.reduce((sum, group) => sum + group.rows.length, 0),
      expectedPresentAspectCollapseValues,
      reviewerAttentionValues,
      blockerCandidates: reviewerAttentionValues,
      readyForReviewer: reviewerAttentionValues === 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    groups,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_duplicate_translation_review_packet.json');
  const outMd = path.join(auditsDir, 'french_duplicate_translation_review_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French duplicate translation review packet: ${report.status}`);
  console.log(`Duplicate French values: ${report.summary.duplicateFrenchValues}`);
  console.log(`Expected present-aspect collapse values: ${report.summary.expectedPresentAspectCollapseValues}`);
  console.log(`Reviewer attention values: ${report.summary.reviewerAttentionValues}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (report.summary.blockerCandidates > 0) {
    process.exit(1);
  }
}

void main();
