import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type SourceRefUse = {
  nodeArray: string;
  nodeId: string;
  file: string;
  line: number;
  provenance: string;
  exportName?: string;
};

type SupportDecision = {
  file: string;
  purpose: string;
  risk: string;
  sourceRefUses: SourceRefUse[];
  listedAsSourceFile: boolean;
  isolatedFromSourceGraph: boolean;
  decision: 'exclude_from_french_source_truth' | 'blocked_source_graph_reference';
  severity: Severity;
  notes: string[];
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  sourceRefs: Array<{
    file: string;
    line: number;
    provenance?: string;
    exportName?: string;
  }>;
};

type Audit = {
  schemaVersion: 'gustav-generated-support-isolation-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceGraphPath: string;
  summary: {
    generatedSupportFiles: number;
    referencedInSourceGraph: number;
    listedAsSourceFiles: number;
    isolatedSupportFiles: number;
    blockers: number;
    highRisks: number;
    canExcludeFromFrenchSourceTruth: boolean;
  };
  decisions: SupportDecision[];
  findings: Finding[];
  policy: {
    allowedUse: string[];
    forbiddenUse: string[];
    requiredBeforeFrenchGeneration: string[];
  };
  notes: string[];
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

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function sourceRefUses(graph: Record<string, unknown>, supportFiles: Set<string>): SourceRefUse[] {
  const nodeArrays = [
    'lessons',
    'introScreens',
    'phrases',
    'words',
    'quizzes',
    'prepositionPacks',
    'flashcards',
    'dailyPhrases',
    'personalPractice',
    'surfaces',
  ];
  const uses: SourceRefUse[] = [];
  for (const nodeArray of nodeArrays) {
    for (const node of arr<Record<string, unknown>>(graph[nodeArray])) {
      const nodeId = str(node.id) || str(node.exportName) || `${nodeArray}:${String(node.lessonId ?? '')}`;
      for (const ref of arr<Record<string, unknown>>(node.sourceRefs)) {
        const file = str(ref.file);
        if (!supportFiles.has(file)) continue;
        uses.push({
          nodeArray,
          nodeId,
          file,
          line: num(ref.line) || 1,
          provenance: str(ref.provenance) || 'unknown',
          exportName: str(ref.exportName) || undefined,
        });
      }
    }
  }
  return uses;
}

function pushFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Generated Support Isolation Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Generated support files: ${audit.summary.generatedSupportFiles}`,
    `- Referenced in source graph: ${audit.summary.referencedInSourceGraph}`,
    `- Listed as source files: ${audit.summary.listedAsSourceFiles}`,
    `- Isolated support files: ${audit.summary.isolatedSupportFiles}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Can exclude from French source truth: ${audit.summary.canExcludeFromFrenchSourceTruth ? 'yes' : 'no'}`,
    '',
    '## Decisions',
    '',
  ];
  for (const decision of audit.decisions) {
    lines.push(`### ${decision.file}`);
    lines.push('');
    lines.push(`- Decision: \`${decision.decision}\``);
    lines.push(`- Severity: \`${decision.severity}\``);
    lines.push(`- Isolated from source graph: ${decision.isolatedFromSourceGraph ? 'yes' : 'no'}`);
    lines.push(`- Source graph refs: ${decision.sourceRefUses.length}`);
    lines.push(`- Listed as source file: ${decision.listedAsSourceFile ? 'yes' : 'no'}`);
    for (const note of decision.notes) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`### ${finding.id}: ${finding.title}`);
      lines.push('');
      lines.push(`Severity: \`${finding.severity}\``);
      lines.push('');
      lines.push(finding.detail);
      lines.push('');
      if (finding.sourceRefs.length > 0) {
        lines.push('Source refs:');
        for (const ref of finding.sourceRefs.slice(0, 20)) {
          lines.push(`- \`${ref.file}:${ref.line}\`${ref.provenance ? ` (${ref.provenance})` : ''}`);
        }
        lines.push('');
      }
    }
  }
  lines.push('## Policy', '');
  lines.push('Allowed use:');
  for (const item of audit.policy.allowedUse) lines.push(`- ${item}`);
  lines.push('', 'Forbidden use:');
  for (const item of audit.policy.forbiddenUse) lines.push(`- ${item}`);
  lines.push('', 'Required before French generation:');
  for (const item of audit.policy.requiredBeforeFrenchGeneration) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_generated_support_isolation_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourceGraphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const graph = readJson<Record<string, unknown>>(sourceGraphPath);
  const generatedSupportFiles = arr<Record<string, unknown>>(graph.generatedFiles)
    .filter((file) => !str(file.file).includes('lesson_data'));
  const supportSet = new Set(generatedSupportFiles.map((file) => str(file.file)).filter(Boolean));
  const uses = sourceRefUses(graph, supportSet);
  const sourceFileSet = new Set(
    arr<Record<string, unknown>>(graph.sourceFiles)
      .map((file) => str(file.file))
      .filter(Boolean),
  );

  const decisions: SupportDecision[] = generatedSupportFiles.map((file) => {
    const fileName = str(file.file);
    const fileUses = uses.filter((use) => use.file === fileName);
    const listedAsSourceFile = sourceFileSet.has(fileName);
    const isolatedFromSourceGraph = fileUses.length === 0 && !listedAsSourceFile;
    return {
      file: fileName,
      purpose: str(file.purpose),
      risk: str(file.risk),
      sourceRefUses: fileUses,
      listedAsSourceFile,
      isolatedFromSourceGraph,
      decision: isolatedFromSourceGraph ? 'exclude_from_french_source_truth' : 'blocked_source_graph_reference',
      severity: isolatedFromSourceGraph ? 'info' : 'blocker',
      notes: isolatedFromSourceGraph
        ? ['Observed as app runtime evidence only; not used by extracted source graph nodes.']
        : ['This support file is still connected to source graph nodes and cannot be excluded.'],
    };
  });

  const findings: Finding[] = [];
  const blocked = decisions.filter((decision) => decision.decision === 'blocked_source_graph_reference');
  if (blocked.length > 0) {
    pushFinding(findings, {
      id: 'GSI-001',
      severity: 'blocker',
      title: 'Generated support files are still connected to the source graph',
      detail: `${blocked.length} generated support file(s) are referenced by source graph nodes or listed as source files.`,
      sourceRefs: blocked.flatMap((decision) => decision.sourceRefUses.map((use) => ({
        file: use.file,
        line: use.line,
        provenance: use.provenance,
        exportName: use.exportName,
      }))),
    });
  } else {
    pushFinding(findings, {
      id: 'GSI-000',
      severity: 'info',
      title: 'Generated support files are isolated',
      detail: `${generatedSupportFiles.length} generated support file(s) are observed only as runtime evidence and are not source graph inputs.`,
      sourceRefs: generatedSupportFiles.map((file) => ({
        file: str(file.file),
        line: 1,
        provenance: 'runtime_generated',
      })),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const canExcludeFromFrenchSourceTruth = blockers === 0 && highRisks === 0;
  const audit: Audit = {
    schemaVersion: 'gustav-generated-support-isolation-audit-v0',
    runId,
    status: canExcludeFromFrenchSourceTruth ? 'PASS' : 'HOLD',
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceGraphPath: path.relative(repoRoot, sourceGraphPath),
    summary: {
      generatedSupportFiles: generatedSupportFiles.length,
      referencedInSourceGraph: uses.length,
      listedAsSourceFiles: decisions.filter((decision) => decision.listedAsSourceFile).length,
      isolatedSupportFiles: decisions.filter((decision) => decision.isolatedFromSourceGraph).length,
      blockers,
      highRisks,
      canExcludeFromFrenchSourceTruth,
    },
    decisions,
    findings,
    policy: {
      allowedUse: [
        'Keep generated ES support files as observed runtime evidence for audits.',
        'Use them only to prove what must not be copied into French target architecture.',
      ],
      forbiddenUse: [
        'Do not derive French lesson order, intro screens, quizzes or preposition packs from generated ES support files.',
        'Do not copy ES support text, tokenization or quiz distractors into French output.',
      ],
      requiredBeforeFrenchGeneration: [
        'Use canonical English source graph nodes for French generation input.',
        'Design French-specific support content through target-language research and generated-content audit later.',
      ],
    },
    notes: [
      'This audit closes the source-graph-specific SG-004 risk only when generated support files are not source graph inputs.',
      'It does not approve French generation by itself.',
    ],
  };

  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  fs.writeFileSync(path.join(auditsDir, 'generated_support_isolation_audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(path.join(auditsDir, 'generated_support_isolation_audit.md'), renderMarkdown(audit));

  console.log(`GUSTAV generated support isolation audit: ${audit.status}`);
  console.log(`Generated support files: ${audit.summary.generatedSupportFiles}`);
  console.log(`Referenced in source graph: ${audit.summary.referencedInSourceGraph}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`High risks: ${audit.summary.highRisks}`);
  console.log(`Report: ${path.relative(repoRoot, path.join(auditsDir, 'generated_support_isolation_audit.json'))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
