import fs from 'node:fs';
import path from 'node:path';

type HeisenbergLocale = 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

type CliOptions = {
  outputDir?: string;
  generatedAt?: string;
};

type ReleaseEvidenceTemplate = {
  schemaVersion: 'heisenberg-production-release-evidence-template-v1';
  targetSchemaVersion: 'heisenberg-production-release-evidence-v1';
  templateOnly: true;
  generatedAt: string;
  generatedApprovals: false;
  generatedDecisionsOrEvidence: false;
  runtimeSourceMutation: false;
  requiredLocales: HeisenbergLocale[];
  instructions: string[];
  sourceEvidence: {
    batchManifestPath: string;
    uiAuditPath: string;
    semanticAuditPath: string;
    quizValidationPath: string;
    productionReadinessGatePath: string;
    sourceApplyCandidatePath: string;
    contentRevisionId: string;
  };
  activationApproved: false;
  remoteLoadingEnabled: false;
  runtimeManifestRegistered: false;
  packHashesRebuiltFromCurrentContent: false;
  packArtifacts: Record<HeisenbergLocale, {
    contentHash: string;
    packHash: string;
    serverArtifactId: string;
    deployedAt: string;
  }>;
  approvals: Record<HeisenbergLocale, {
    reviewerEvidenceId: string;
    localeOwnerEvidenceId: string;
    productOwnerEvidenceId: string;
  }>;
  runtimeGates: Record<HeisenbergLocale, {
    offlineCacheEvidenceId: string;
    rollbackEvidenceId: string;
    storageRulesEvidenceId: string;
  }>;
};

type WriteResult = {
  template: ReleaseEvidenceTemplate;
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
};

const HEISENBERG_LOCALES: HeisenbergLocale[] = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

export function writeHeisenbergProductionReleaseEvidenceTemplate(
  repoRoot: string,
  options: CliOptions = {},
): WriteResult {
  const template = buildHeisenbergProductionReleaseEvidenceTemplate(repoRoot, options);
  const outputDir = resolveAllowedPath(
    repoRoot,
    options.outputDir,
    path.join('docs', 'heisenberg', 'production-release-evidence', timestampSlug(template.generatedAt)),
    'Heisenberg production release evidence template output',
  );
  const jsonPath = path.join(outputDir, 'release_evidence_template.json');
  const markdownPath = path.join(outputDir, 'release_evidence_template.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(template)}\n`, 'utf8');

  return { template, outputDir, jsonPath, markdownPath };
}

export function buildHeisenbergProductionReleaseEvidenceTemplate(
  repoRoot: string,
  options: CliOptions = {},
): ReleaseEvidenceTemplate {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const blankPackArtifacts = Object.fromEntries(HEISENBERG_LOCALES.map((locale) => [
    locale,
    {
      contentHash: '',
      packHash: '',
      serverArtifactId: '',
      deployedAt: '',
    },
  ])) as ReleaseEvidenceTemplate['packArtifacts'];
  const blankApprovals = Object.fromEntries(HEISENBERG_LOCALES.map((locale) => [
    locale,
    {
      reviewerEvidenceId: '',
      localeOwnerEvidenceId: '',
      productOwnerEvidenceId: '',
    },
  ])) as ReleaseEvidenceTemplate['approvals'];
  const blankRuntimeGates = Object.fromEntries(HEISENBERG_LOCALES.map((locale) => [
    locale,
    {
      offlineCacheEvidenceId: '',
      rollbackEvidenceId: '',
      storageRulesEvidenceId: '',
    },
  ])) as ReleaseEvidenceTemplate['runtimeGates'];

  return {
    schemaVersion: 'heisenberg-production-release-evidence-template-v1',
    targetSchemaVersion: 'heisenberg-production-release-evidence-v1',
    templateOnly: true,
    generatedAt,
    generatedApprovals: false,
    generatedDecisionsOrEvidence: false,
    runtimeSourceMutation: false,
    requiredLocales: HEISENBERG_LOCALES,
    instructions: [
      'Copy this template to release_evidence.json only after every referenced gate is clean.',
      'Replace every blank value with real external evidence ids, hashes, artifact ids, and timestamps.',
      'All sourceEvidence path fields must point to existing files under docs/heisenberg or .codex-tmp.',
      'contentHash and packHash must be real sha256:<64 hex> values rebuilt from the current corrected content.',
      'Do not set generatedApprovals or generatedDecisionsOrEvidence to true.',
      'Do not submit this template schema to the validator; it is intentionally rejected as release evidence.',
    ],
    sourceEvidence: {
      batchManifestPath: latestReport(repoRoot, ['docs', 'heisenberg', 'batch'], 'manifest.json') ?? '',
      uiAuditPath: latestReport(repoRoot, ['docs', 'heisenberg', 'ui'], 'ui_locale_audit.json') ?? '',
      semanticAuditPath: latestReport(repoRoot, ['docs', 'heisenberg', 'semantic'], 'semantic_audit.json') ?? '',
      quizValidationPath: latestReport(repoRoot, ['docs', 'heisenberg', 'quiz-payload-ordinal-repair'], 'filled_work_order_validation.json') ?? '',
      productionReadinessGatePath: latestReport(repoRoot, ['docs', 'heisenberg', 'production-readiness'], 'production_readiness_gate.json') ?? '',
      sourceApplyCandidatePath: '',
      contentRevisionId: '',
    },
    activationApproved: false,
    remoteLoadingEnabled: false,
    runtimeManifestRegistered: false,
    packHashesRebuiltFromCurrentContent: false,
    packArtifacts: blankPackArtifacts,
    approvals: blankApprovals,
    runtimeGates: blankRuntimeGates,
  };
}

function renderMarkdown(template: ReleaseEvidenceTemplate): string {
  const rows = HEISENBERG_LOCALES.map((locale) =>
    `| ${locale} | blank | blank | blank | blank | blank | blank | blank | blank | blank |`,
  );
  return [
    '# Heisenberg Production Release Evidence Template',
    '',
    `- Generated at: ${template.generatedAt}`,
    `- Target schema: ${template.targetSchemaVersion}`,
    '- This is not a release approval artifact.',
    '- Copy to `release_evidence.json` only after real pack hashes, approval ids, and runtime gate ids exist.',
    '',
    '## Instructions',
    '',
    ...template.instructions.map((instruction) => `- ${instruction}`),
    '',
    '| Locale | contentHash | packHash | serverArtifactId | reviewer | locale owner | product owner | offline cache | rollback | storage rules |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Required Source Evidence',
    '',
    ...Object.entries(template.sourceEvidence).map(([key, value]) => `- ${key}: ${value || 'blank'}`),
  ].join('\n');
}

function latestReport(repoRoot: string, segments: string[], fileName: string): string | null {
  const root = path.join(repoRoot, ...segments);
  if (!fs.existsSync(root)) return null;
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((entry) => fs.existsSync(path.join(root, entry, fileName)));
  return latest ? normalizePath(path.join(...segments, latest, fileName)) : null;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function timestampSlug(value: string): string {
  return value.replace(/[:.]/g, '-');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function resolveAllowedPath(repoRoot: string, requested: string | undefined, fallback: string, label: string): string {
  const resolved = path.resolve(repoRoot, requested ?? fallback);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error(`${label} must stay under .codex-tmp or docs/heisenberg`);
  }
  return resolved;
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

if (require.main === module) {
  try {
    const result = writeHeisenbergProductionReleaseEvidenceTemplate(process.cwd(), parseCli(process.argv.slice(2)));
    console.log('Heisenberg production release evidence template: READY_FOR_EXTERNAL_EVIDENCE');
    console.log(`Template: ${relativePath(process.cwd(), result.jsonPath)}`);
    console.log(`Markdown: ${relativePath(process.cwd(), result.markdownPath)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
