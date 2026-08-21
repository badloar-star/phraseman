import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type ResearchTask = {
  id: string;
  title: string;
  requiredInputs: string[];
  requiredOutputs: string[];
  canProduceFrenchOutput: boolean;
};

type ResearchWorkOrder = {
  id: string;
  clusterId: string;
  title: string;
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  requiredSourceIds: string[];
  sourceGraphSlices: string[];
  tasks: ResearchTask[];
  requiredSignoffs: string[];
  mustBlockIf: string[];
  canProduceFrenchOutput: boolean;
};

type Audit = {
  schemaVersion: 'gustav-french-research-work-order-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    frenchResearchPackContractAudit: string;
    frenchResearchPackFirewallAudit: string;
    sourceGraphValidation: string;
    researchPack: string;
  };
  summary: {
    targetStudyLanguage: 'fr';
    sourceLocales: number;
    trustedSources: number;
    grammarClusters: number;
    workOrders: number;
    tasks: number;
    sourceGraphReferenceGroups: number;
    minimumTrustedSourceChecks: number;
    ruUkComparisonsRequired: number;
    requiredSignoffs: number;
    blockers: number;
    warnings: number;
    contractReady: boolean;
    firewallPassed: boolean;
    sourceGraphCountsLoaded: boolean;
    workOrderReady: boolean;
    researchPackPresent: boolean;
    realResearchPackStillMissing: boolean;
    mayStartResearchPackWritingNow: boolean;
    mayStartTranslationNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    noFrenchContentGenerated: boolean;
  };
  sourceGraphReferenceGroups: Array<{
    id: string;
    count: number;
    requiredForEveryWorkOrder: boolean;
  }>;
  workOrders: ResearchWorkOrder[];
  findings: Finding[];
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function n(value: Record<string, unknown>, key: string): number {
  return typeof value[key] === 'number' ? value[key] as number : 0;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function taskSet(clusterId: string): ResearchTask[] {
  return [
    {
      id: `${clusterId}:source_graph_review`,
      title: 'Review approved English source graph slice',
      requiredInputs: ['source_graph/source_graph.json', 'source_graph/validation.json'],
      requiredOutputs: ['sourceGraphRefs', 'englishSourceSummary'],
      canProduceFrenchOutput: false,
    },
    {
      id: `${clusterId}:ru_uk_prompt_comparison`,
      title: 'Compare Russian and Ukrainian learner prompts',
      requiredInputs: ['approved English source meaning', 'RU prompt text', 'UK prompt text'],
      requiredOutputs: ['ruPromptSummary', 'ukPromptSummary', 'source-locale mismatch notes'],
      canProduceFrenchOutput: false,
    },
    {
      id: `${clusterId}:trusted_source_checks`,
      title: 'Check at least two trusted French references',
      requiredInputs: ['requiredSourceIds', 'trusted source notes'],
      requiredOutputs: ['trustedSourceChecks', 'translationRisks', 'falseFriendRisks'],
      canProduceFrenchOutput: false,
    },
    {
      id: `${clusterId}:rule_decision`,
      title: 'Write research-only French rule decision',
      requiredInputs: ['trustedSourceChecks', 'RU/UK comparison', 'English source summary'],
      requiredOutputs: ['frenchRuleDecision', 'articleGenderNotes', 'conjugationNotes'],
      canProduceFrenchOutput: false,
    },
    {
      id: `${clusterId}:lesson_order_decision`,
      title: 'Decide lesson order impact',
      requiredInputs: ['English lesson order', 'French grammar complexity', 'learner-level risk'],
      requiredOutputs: ['lessonOrderDecision', 'unresolvedQuestions'],
      canProduceFrenchOutput: false,
    },
    {
      id: `${clusterId}:practice_and_quiz_policy`,
      title: 'Define quiz and Mistake Practice research policy',
      requiredInputs: ['quiz source graph refs', 'personal practice source graph refs', 'target isolation blockers'],
      requiredOutputs: ['quizDistractorPolicy', 'personalPracticePolicy'],
      canProduceFrenchOutput: false,
    },
    {
      id: `${clusterId}:agent_signoff_packet`,
      title: 'Collect agent signoffs before any output',
      requiredInputs: ['all research-only fields', 'unresolvedQuestions'],
      requiredOutputs: ['agentSignoffs', 'batch may remain blocked decision'],
      canProduceFrenchOutput: false,
    },
  ];
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV French Research Work Order Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target study language: \`${audit.summary.targetStudyLanguage}\``,
    `- Source locales: ${audit.summary.sourceLocales}`,
    `- Trusted sources: ${audit.summary.trustedSources}`,
    `- Grammar clusters: ${audit.summary.grammarClusters}`,
    `- Work orders: ${audit.summary.workOrders}`,
    `- Tasks: ${audit.summary.tasks}`,
    `- Source graph reference groups: ${audit.summary.sourceGraphReferenceGroups}`,
    `- Minimum trusted source checks: ${audit.summary.minimumTrustedSourceChecks}`,
    `- RU/UK comparisons required: ${audit.summary.ruUkComparisonsRequired}`,
    `- Required signoffs: ${audit.summary.requiredSignoffs}`,
    `- Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`,
    `- Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`,
    `- Work order ready: ${audit.summary.workOrderReady ? 'yes' : 'no'}`,
    `- Research pack present: ${audit.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- May start research pack writing now: ${audit.summary.mayStartResearchPackWritingNow ? 'yes' : 'no'}`,
    `- May start translation now: ${audit.summary.mayStartTranslationNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Source Graph Reference Groups',
    '',
  ];

  for (const group of audit.sourceGraphReferenceGroups) {
    lines.push(`- \`${group.id}\`: ${group.count}`);
  }

  lines.push('', '## Work Orders', '');
  for (const order of audit.workOrders) {
    lines.push(`- \`${order.id}\`: ${order.title}`);
    lines.push(`  - cluster: \`${order.clusterId}\``);
    lines.push(`  - sources: ${order.requiredSourceIds.join(', ')}`);
    lines.push(`  - tasks: ${order.tasks.length}`);
    lines.push(`  - signoffs: ${order.requiredSignoffs.join(', ')}`);
    lines.push(`  - can produce French output: ${order.canProduceFrenchOutput ? 'yes' : 'no'}`);
  }

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
    }
  }

  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_research_work_order_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const contractPath = path.join(runDir, 'audits', 'french_research_pack_contract_audit.json');
  const firewallPath = path.join(runDir, 'audits', 'french_research_pack_firewall_audit.json');
  const sourceGraphValidationPath = path.join(runDir, 'source_graph', 'validation.json');
  const researchPackPath = path.join('docs/gustav/runs', runId, 'research', 'fr_research_pack.json');
  const findings: Finding[] = [];

  const contractAudit = readJson<Record<string, unknown>>(contractPath);
  const firewallAudit = readJson<Record<string, unknown>>(firewallPath);
  const sourceGraphValidation = readJson<Record<string, unknown>>(sourceGraphValidationPath);
  const contractSummary = object(contractAudit.summary);
  const firewallSummary = object(firewallAudit.summary);
  const contract = object(contractAudit.researchPackContract);
  const trustedSources = arr<Record<string, unknown>>(contract.trustedSources);
  const grammarClusters = arr<Record<string, unknown>>(contract.grammarClusters);
  const researchPackPresent = fs.existsSync(path.join(repoRoot, researchPackPath));

  if (contractAudit.status !== 'PASS' || contractSummary.researchContractReady !== true) {
    findings.push({
      severity: 'blocker',
      code: 'research_contract_not_ready',
      message: 'French research work order requires a PASS research pack contract.',
      filePath: path.relative(repoRoot, contractPath),
    });
  }
  if (firewallAudit.status !== 'PASS' || firewallSummary.firewallPassed !== true || firewallSummary.researchPackStillMissing !== true) {
    findings.push({
      severity: 'blocker',
      code: 'research_firewall_not_locked',
      message: 'French research work order requires the research pack firewall to pass while the real research pack is still absent.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }
  if (sourceGraphValidation.verdict !== 'PASS' || n(sourceGraphValidation, 'unresolvedBlockers') !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'source_graph_validation_not_pass',
      message: 'French research work order requires PASS source graph validation.',
      filePath: path.relative(repoRoot, sourceGraphValidationPath),
    });
  }
  if (researchPackPresent) {
    findings.push({
      severity: 'blocker',
      code: 'research_pack_exists_too_early',
      message: 'French research work order must not create or accept the real fr_research_pack.json.',
      filePath: researchPackPath,
    });
  }

  const sourceGraphReferenceGroups = [
    { id: 'lessons', count: n(sourceGraphValidation, 'totalLessons'), requiredForEveryWorkOrder: true },
    { id: 'phrases', count: n(sourceGraphValidation, 'totalPhrases'), requiredForEveryWorkOrder: true },
    { id: 'words', count: n(sourceGraphValidation, 'totalWords'), requiredForEveryWorkOrder: true },
    { id: 'introScreens', count: n(sourceGraphValidation, 'totalIntroScreens'), requiredForEveryWorkOrder: true },
    { id: 'quizzes', count: n(sourceGraphValidation, 'totalQuizzes'), requiredForEveryWorkOrder: true },
    { id: 'prepositionPacks', count: n(sourceGraphValidation, 'totalPrepositionPacks'), requiredForEveryWorkOrder: true },
    { id: 'flashcards', count: n(sourceGraphValidation, 'totalFlashcards'), requiredForEveryWorkOrder: true },
    { id: 'dailyPhrases', count: n(sourceGraphValidation, 'totalDailyPhrases'), requiredForEveryWorkOrder: true },
    { id: 'personalPractice', count: n(sourceGraphValidation, 'totalPersonalPracticeNodes'), requiredForEveryWorkOrder: true },
    { id: 'surfaces', count: n(sourceGraphValidation, 'totalSurfaces'), requiredForEveryWorkOrder: true },
  ];
  const requiredSignoffs = [
    'translation_director',
    'french_grammar_researcher',
    'ru_source_locale_reviewer',
    'uk_source_locale_reviewer',
    'quiz_and_practice_reviewer',
    'runtime_shape_auditor',
  ];
  const sourceGraphSlices = sourceGraphReferenceGroups.map((group) => group.id);
  const workOrders: ResearchWorkOrder[] = grammarClusters.map((cluster, index) => {
    const clusterId = typeof cluster.id === 'string' ? cluster.id : `cluster_${index + 1}`;
    const title = typeof cluster.title === 'string' ? cluster.title : clusterId;
    const requiredSourceIds = arr<string>(cluster.requiredSourceIds).filter((entry) => typeof entry === 'string');
    return {
      id: `FR-RESEARCH-${String(index + 1).padStart(2, '0')}`,
      clusterId,
      title,
      targetStudyLanguage: 'fr',
      sourceLocales: ['ru', 'uk'],
      requiredSourceIds,
      sourceGraphSlices,
      tasks: taskSet(clusterId),
      requiredSignoffs,
      mustBlockIf: [
        'less than two trusted sources support the decision',
        'RU and UK prompt comparison is missing',
        'source graph refs are missing',
        'quiz distractor policy is not single-correct-answer safe',
        'Mistake Practice state cannot be target-scoped',
        'French translated output appears during research',
      ],
      canProduceFrenchOutput: false,
    };
  });

  const taskCount = workOrders.reduce((sum, order) => sum + order.tasks.length, 0);
  const minimumTrustedSourceChecks = workOrders.reduce((sum, order) => sum + order.requiredSourceIds.length, 0);
  const signoffCount = workOrders.reduce((sum, order) => sum + order.requiredSignoffs.length, 0);
  const allOrdersResearchOnly =
    workOrders.length === 12 &&
    workOrders.every((order) =>
      order.targetStudyLanguage === 'fr' &&
      order.sourceLocales.length === 2 &&
      order.sourceLocales[0] === 'ru' &&
      order.sourceLocales[1] === 'uk' &&
      order.requiredSourceIds.length >= 2 &&
      order.sourceGraphSlices.length === 10 &&
      order.tasks.length === 7 &&
      order.requiredSignoffs.length === 6 &&
      order.canProduceFrenchOutput === false &&
      order.tasks.every((task) => task.canProduceFrenchOutput === false)
    );
  const sourceGraphCountsLoaded = sourceGraphReferenceGroups.every((group) => group.count > 0);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const workOrderReady =
    blockers === 0 &&
    contractSummary.researchContractReady === true &&
    firewallSummary.firewallPassed === true &&
    trustedSources.length === 8 &&
    grammarClusters.length === 12 &&
    taskCount === 84 &&
    minimumTrustedSourceChecks === 26 &&
    signoffCount === 72 &&
    sourceGraphReferenceGroups.length === 10 &&
    sourceGraphCountsLoaded &&
    allOrdersResearchOnly &&
    !researchPackPresent;

  const audit: Audit = {
    schemaVersion: 'gustav-french-research-work-order-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      frenchResearchPackContractAudit: path.relative(repoRoot, contractPath),
      frenchResearchPackFirewallAudit: path.relative(repoRoot, firewallPath),
      sourceGraphValidation: path.relative(repoRoot, sourceGraphValidationPath),
      researchPack: researchPackPath,
    },
    summary: {
      targetStudyLanguage: 'fr',
      sourceLocales: 2,
      trustedSources: trustedSources.length,
      grammarClusters: grammarClusters.length,
      workOrders: workOrders.length,
      tasks: taskCount,
      sourceGraphReferenceGroups: sourceGraphReferenceGroups.length,
      minimumTrustedSourceChecks,
      ruUkComparisonsRequired: workOrders.length,
      requiredSignoffs: signoffCount,
      blockers,
      warnings,
      contractReady: contractSummary.researchContractReady === true,
      firewallPassed: firewallSummary.firewallPassed === true,
      sourceGraphCountsLoaded,
      workOrderReady,
      researchPackPresent,
      realResearchPackStillMissing: !researchPackPresent,
      mayStartResearchPackWritingNow: false,
      mayStartTranslationNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      noFrenchContentGenerated: true,
    },
    sourceGraphReferenceGroups,
    workOrders,
    findings,
    notes: [
      'This audit creates research work orders only; it does not create fr_research_pack.json.',
      'Every work order is research-only and explicitly forbids French translated output.',
      'The work order binds each French grammar cluster to RU/UK prompt comparison, source graph refs, trusted references, quiz policy and Mistake Practice policy.',
      'French translation remains blocked until readiness generation blockers are removed and a real accepted research pack exists.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'french_research_work_order_audit.json');
  const outMd = path.join(runDir, 'audits', 'french_research_work_order_audit.md');
  const outReadme = path.join(runDir, 'audits', 'french_research_work_order', 'README.md');
  writeJson(outJson, audit);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV French research work order audit: ${audit.status}`);
  console.log(`Work orders: ${audit.summary.workOrders}`);
  console.log(`Tasks: ${audit.summary.tasks}`);
  console.log(`Source graph reference groups: ${audit.summary.sourceGraphReferenceGroups}`);
  console.log(`Minimum trusted source checks: ${audit.summary.minimumTrustedSourceChecks}`);
  console.log(`RU/UK comparisons required: ${audit.summary.ruUkComparisonsRequired}`);
  console.log(`Required signoffs: ${audit.summary.requiredSignoffs}`);
  console.log(`Work order ready: ${audit.summary.workOrderReady ? 'yes' : 'no'}`);
  console.log(`May start research pack writing now: ${audit.summary.mayStartResearchPackWritingNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`No French content generated: ${audit.summary.noFrenchContentGenerated ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (audit.status === 'BLOCK') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
