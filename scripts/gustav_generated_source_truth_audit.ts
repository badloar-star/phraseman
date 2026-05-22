import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  files: string[];
};

type ArtifactDecision = {
  file: string;
  role: 'phrase_runtime' | 'support_runtime';
  generator: string;
  generatorExists: boolean;
  sourceCandidates: string[];
  sourceCandidatesExist: string[];
  importsGeneratedRuntime: boolean;
  usedAsPhraseSourceInGraph: boolean;
  generatedPhraseEntries: number;
  decision: 'canonical_source_available' | 'runtime_evidence_only' | 'blocked_missing_canonical_source';
  severity: Severity;
  blockers: string[];
  notes: string[];
};

type Audit = {
  schemaVersion: 'gustav-generated-source-truth-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    artifacts: number;
    phraseRuntimeArtifacts: number;
    supportRuntimeArtifacts: number;
    usedAsPhraseSourceInGraph: number;
    generatedPhraseEntries: number;
    canonicalSourceAvailable: number;
    runtimeEvidenceOnly: number;
    blockedMissingCanonicalSource: number;
    blockers: number;
    highRisks: number;
    canApproveGeneratedRuntimeAsFrenchSourceTruth: boolean;
  };
  artifacts: ArtifactDecision[];
  findings: Finding[];
  policy: {
    defaultDecision: string;
    allowedEvidenceUse: string[];
    forbiddenUse: string[];
    requiredBeforeFrenchGeneration: string[];
  };
  notes: string[];
};

const GENERATED_ARTIFACTS: Array<{
  file: string;
  role: ArtifactDecision['role'];
  generator: string;
  sourceCandidates: string[];
}> = [
  {
    file: 'app/lesson_data_1_8_phrases_es.gen.ts',
    role: 'phrase_runtime',
    generator: 'tools/prompt006_es_phrase_words.ts',
    sourceCandidates: ['app/lesson_data_1_8_phrases_source.ts'],
  },
  {
    file: 'app/lesson_data_9_16_phrases_es.gen.ts',
    role: 'phrase_runtime',
    generator: 'tools/prompt007_es_phrase_words.ts',
    sourceCandidates: ['app/lesson_data_9_16.ts'],
  },
  {
    file: 'app/lesson_intro_screens_es_l2.ts',
    role: 'support_runtime',
    generator: '',
    sourceCandidates: ['app/lesson_intro_screens_9_32.ts'],
  },
  {
    file: 'app/quiz_data_es_l2.ts',
    role: 'support_runtime',
    generator: '',
    sourceCandidates: ['app/quiz_data.ts'],
  },
  {
    file: 'app/lesson_prepositions_es_segment01.ts',
    role: 'support_runtime',
    generator: '',
    sourceCandidates: ['app/lesson_prepositions.ts'],
  },
  {
    file: 'app/lesson_prepositions_es_segment02.ts',
    role: 'support_runtime',
    generator: '',
    sourceCandidates: ['app/lesson_prepositions.ts'],
  },
  {
    file: 'app/lesson_prepositions_es_segment03.ts',
    role: 'support_runtime',
    generator: '',
    sourceCandidates: ['app/lesson_prepositions.ts'],
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readText(repoRoot: string, relativePath: string): string {
  const absolute = path.join(repoRoot, relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sourceGraphPhraseUsage(repoRoot: string, runDir: string): Map<string, number> {
  const graphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  if (!fs.existsSync(graphPath)) return new Map();
  const graph = readJson<Record<string, unknown>>(graphPath);
  const usage = new Map<string, number>();
  for (const phrase of arr<Record<string, unknown>>(graph.phrases)) {
    for (const ref of arr<Record<string, unknown>>(phrase.sourceRefs)) {
      if (str(ref.provenance) !== 'runtime_generated') continue;
      const file = str(ref.file);
      usage.set(file, (usage.get(file) ?? 0) + 1);
    }
  }
  return usage;
}

function importsGeneratedRuntime(repoRoot: string, file: string): boolean {
  const text = readText(repoRoot, file);
  return /\.gen['"]|_es_l2['"]|_es_segment/.test(text) || text.includes('lesson_data_9_16_phrases_es.gen');
}

function inferDecision(input: {
  role: ArtifactDecision['role'];
  sourceCandidatesExist: string[];
  importsGeneratedRuntime: boolean;
  usedAsPhraseSourceInGraph: boolean;
}): Pick<ArtifactDecision, 'decision' | 'severity' | 'blockers' | 'notes'> {
  if (input.role === 'phrase_runtime' && input.usedAsPhraseSourceInGraph && (input.sourceCandidatesExist.length === 0 || input.importsGeneratedRuntime)) {
    return {
      decision: 'blocked_missing_canonical_source',
      severity: 'blocker',
      blockers: ['canonical_source_not_proven_for_phrase_runtime_file'],
      notes: ['This generated phrase file is currently part of the extracted phrase graph and needs a source-truth decision before French generation.'],
    };
  }
  if (input.role === 'phrase_runtime' && input.sourceCandidatesExist.length > 0) {
    return {
      decision: 'canonical_source_available',
      severity: 'medium',
      blockers: [],
      notes: ['A candidate canonical source exists; generated runtime file remains evidence only.'],
    };
  }
  return {
    decision: 'runtime_evidence_only',
    severity: 'medium',
    blockers: [],
    notes: ['Support runtime file must not define French structure unless target architecture maps it explicitly.'],
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Generated Source-Truth Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Artifacts: ${audit.summary.artifacts}`,
    `- Phrase runtime artifacts: ${audit.summary.phraseRuntimeArtifacts}`,
    `- Support runtime artifacts: ${audit.summary.supportRuntimeArtifacts}`,
    `- Used as phrase source in graph: ${audit.summary.usedAsPhraseSourceInGraph}`,
    `- Generated phrase entries: ${audit.summary.generatedPhraseEntries}`,
    `- Canonical source available: ${audit.summary.canonicalSourceAvailable}`,
    `- Runtime evidence only: ${audit.summary.runtimeEvidenceOnly}`,
    `- Blocked missing canonical source: ${audit.summary.blockedMissingCanonicalSource}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Can approve generated runtime as French source truth: ${audit.summary.canApproveGeneratedRuntimeAsFrenchSourceTruth ? 'yes' : 'no'}`,
    '',
    '## Findings',
    '',
  ];
  for (const finding of audit.findings) {
    lines.push(`### ${finding.id}: ${finding.title}`);
    lines.push('');
    lines.push(`Severity: \`${finding.severity}\``);
    lines.push('');
    lines.push(finding.detail);
    lines.push('');
    if (finding.files.length > 0) {
      lines.push('Files:');
      for (const file of finding.files) lines.push(`- \`${file}\``);
      lines.push('');
    }
  }
  lines.push('## Artifact Decisions', '');
  for (const artifact of audit.artifacts) {
    lines.push(`### ${artifact.file}`);
    lines.push('');
    lines.push(`- Role: \`${artifact.role}\``);
    lines.push(`- Generator: ${artifact.generator ? `\`${artifact.generator}\`` : '`unknown`'}`);
    lines.push(`- Generator exists: ${artifact.generatorExists ? 'yes' : 'no'}`);
    lines.push(`- Source candidates: ${artifact.sourceCandidates.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Existing source candidates: ${artifact.sourceCandidatesExist.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Imports generated runtime: ${artifact.importsGeneratedRuntime ? 'yes' : 'no'}`);
    lines.push(`- Used as phrase source in graph: ${artifact.usedAsPhraseSourceInGraph ? 'yes' : 'no'}`);
    lines.push(`- Generated phrase entries: ${artifact.generatedPhraseEntries}`);
    lines.push(`- Decision: \`${artifact.decision}\``);
    lines.push(`- Severity: \`${artifact.severity}\``);
    lines.push('');
  }
  lines.push('## Policy', '');
  lines.push(`Default decision: ${audit.policy.defaultDecision}`);
  lines.push('');
  lines.push('Allowed evidence use:');
  for (const item of audit.policy.allowedEvidenceUse) lines.push(`- ${item}`);
  lines.push('');
  lines.push('Forbidden use:');
  for (const item of audit.policy.forbiddenUse) lines.push(`- ${item}`);
  lines.push('');
  lines.push('Required before French generation:');
  for (const item of audit.policy.requiredBeforeFrenchGeneration) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_generated_source_truth_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const phraseUsage = sourceGraphPhraseUsage(repoRoot, runDir);

  const artifacts: ArtifactDecision[] = GENERATED_ARTIFACTS.map((artifact) => {
    const sourceCandidatesExist = artifact.sourceCandidates.filter((candidate) => fs.existsSync(path.join(repoRoot, candidate)));
    const importsRuntime = artifact.sourceCandidates.some((candidate) => importsGeneratedRuntime(repoRoot, candidate));
    const usedAsPhraseSourceInGraph = (phraseUsage.get(artifact.file) ?? 0) > 0;
    const generatedPhraseEntries = phraseUsage.get(artifact.file) ?? 0;
    const inferred = inferDecision({
      role: artifact.role,
      sourceCandidatesExist,
      importsGeneratedRuntime: importsRuntime,
      usedAsPhraseSourceInGraph,
    });
    return {
      file: artifact.file,
      role: artifact.role,
      generator: artifact.generator,
      generatorExists: artifact.generator ? fs.existsSync(path.join(repoRoot, artifact.generator)) : false,
      sourceCandidates: artifact.sourceCandidates,
      sourceCandidatesExist,
      importsGeneratedRuntime: importsRuntime,
      usedAsPhraseSourceInGraph,
      generatedPhraseEntries,
      ...inferred,
    };
  });

  const findings: Finding[] = [];
  const blocked = artifacts.filter((artifact) => artifact.decision === 'blocked_missing_canonical_source');
  if (blocked.length > 0) {
    findings.push({
      id: 'GST-001',
      severity: 'blocker',
      title: 'Generated phrase source is used without proven canonical source',
      detail: `${blocked.length} generated phrase runtime artifact(s) are used as phrase source in the graph without a proven non-generated canonical source.`,
      files: blocked.flatMap((artifact) => [artifact.file, ...artifact.sourceCandidates]),
    });
  }
  const supportEvidence = artifacts.filter((artifact) => artifact.role === 'support_runtime');
  if (supportEvidence.length > 0) {
    findings.push({
      id: 'GST-002',
      severity: blocked.length > 0 ? 'high' : 'medium',
      title: 'Generated support files must remain evidence only',
      detail: `${supportEvidence.length} generated support file(s) are allowed as runtime evidence but cannot define French curriculum structure.`,
      files: supportEvidence.map((artifact) => artifact.file),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const status: Status = blockers > 0 ? 'HOLD' : highRisks > 0 ? 'HOLD' : 'PASS';
  const audit: Audit = {
    schemaVersion: 'gustav-generated-source-truth-audit-v0',
    runId,
    status,
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      artifacts: artifacts.length,
      phraseRuntimeArtifacts: artifacts.filter((artifact) => artifact.role === 'phrase_runtime').length,
      supportRuntimeArtifacts: artifacts.filter((artifact) => artifact.role === 'support_runtime').length,
      usedAsPhraseSourceInGraph: artifacts.filter((artifact) => artifact.usedAsPhraseSourceInGraph).length,
      generatedPhraseEntries: artifacts.reduce((sum, artifact) => sum + artifact.generatedPhraseEntries, 0),
      canonicalSourceAvailable: artifacts.filter((artifact) => artifact.decision === 'canonical_source_available').length,
      runtimeEvidenceOnly: artifacts.filter((artifact) => artifact.decision === 'runtime_evidence_only').length,
      blockedMissingCanonicalSource: artifacts.filter((artifact) => artifact.decision === 'blocked_missing_canonical_source').length,
      blockers,
      highRisks,
      canApproveGeneratedRuntimeAsFrenchSourceTruth: blockers === 0 && highRisks === 0,
    },
    artifacts,
    findings,
    policy: {
      defaultDecision: 'Generated runtime artifacts are evidence only, never French source truth by default.',
      allowedEvidenceUse: [
        'Read generated runtime files to understand current app behavior.',
        'Compare generated runtime files against canonical source candidates.',
        'Use generated runtime files to locate missing source-truth decisions.',
      ],
      forbiddenUse: [
        'Do not copy Spanish L2 tokenization, examples or lesson structure into French.',
        'Do not treat generated runtime phrase files as canonical unless an explicit approval artifact exists.',
        'Do not let sourceLocale fields become studyTarget output.',
      ],
      requiredBeforeFrenchGeneration: [
        'Provide a canonical non-generated source for lessons 9-16 or an explicit read-only evidence approval.',
        'Exclude ES support files from French target architecture unless mapped by a target-language expert pass.',
        'Rerun source graph and quality audits after source-truth decisions are recorded.',
      ],
    },
    notes: [
      'This audit narrows the generated-file blocker to the files that actually feed source graph phrase nodes.',
      'Lesson 1-8 generated phrase runtime has a canonical extracted source and is not used as phrase source by the current graph.',
      blocked.length > 0
        ? 'Lesson 9-16 generated phrase runtime remains the blocking phrase source-truth gap.'
        : 'No generated phrase runtime file is currently used as source graph phrase source.',
    ],
  };

  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'generated_source_truth_audit.json');
  const outMd = path.join(auditsDir, 'generated_source_truth_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV generated source-truth audit: ${audit.status}`);
  console.log(`Artifacts: ${audit.summary.artifacts}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`High risks: ${audit.summary.highRisks}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
