import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type Lang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

type ScenarioContractSummary = {
  totalScenarios: number;
  activeScenarios: number;
  publicScenarios: number;
  hiddenActiveScenarios: number;
  courseScenarios: number;
  challengeScenarios: number;
  uniqueScenarioIds: number;
  categories: Record<string, number>;
  activeCategories: Record<string, number>;
  cefr: Record<string, number>;
  missingTitle: number;
  missingGoal: number;
  missingNextStepHint: number;
  missingRole: number;
  missingSetting: number;
  missingGoalEn: number;
  promptSafetyFindings: number;
  nonRuUkCyrillicLeaks: number;
  groupLabelsChecked: number;
  localizedUiCellsChecked: number;
};

type ContractGate = {
  id: string;
  status: 'PASS' | 'BLOCK';
  description: string;
  blockers: string[];
};

type Report = {
  schemaVersion: 'gustav-ai-dialog-scenario-contract-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    p2DomainRegistryPacket: string;
    sourceFiles: string[];
  };
  summary: ScenarioContractSummary & {
    expectedActiveScenarios: number;
    blockers: number;
    warnings: number;
    readyForP8ReadinessExtension: boolean;
    readyForFrenchDialogGeneration: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceLocalePolicy: string[];
  studyTargetPolicy: string[];
  contractGates: ContractGate[];
  testsObserved: {
    sourcePath: string;
    checksPublicVisibility: boolean;
    checksCourseChallengeSplit: boolean;
    checksUniqueIds: boolean;
    checksPromptData: boolean;
    checksNextStepHint: boolean;
    checksCategoryNavigation: boolean;
    checksSpanishNoRussianFallback: boolean;
    checksBatchLocalesNoRussianFallback: boolean;
  };
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    promptContentModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_ACTIVE_SCENARIOS = 41;
const SOURCE_FILES = [
  'app/ai_dialog_scenarios.ts',
  'components/DialogsTabContent.tsx',
  'tests/ai_dialog_scenarios.test.ts',
];
const ALL_LANGS: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const NON_RU_UK_LANGS: Lang[] = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const PROMPT_SAFETY_RE = /ignore previous|system prompt|developer message|jailbreak|password|credit card|self-harm|suicide|weapon|explosive/i;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function addFinding(findings: Finding[], severity: FindingSeverity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function inc(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function gate(id: string, description: string, blockers: string[]): ContractGate {
  return {
    id,
    description,
    blockers,
    status: blockers.length > 0 ? 'BLOCK' : 'PASS',
  };
}

function hasText(value: unknown, minLength: number): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

function readSourceFile(repoRoot: string, relativePath: string): ts.SourceFile {
  return ts.createSourceFile(
    relativePath,
    fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function findVariableInitializer(sourceFile: ts.SourceFile, name: string): ts.Expression | undefined {
  let found: ts.Expression | undefined;
  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function evalPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function evalExpression(expr: ts.Expression): any {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) {
    return evalExpression(expr.expression);
  }
  if (ts.isArrayLiteralExpression(expr)) {
    return expr.elements.map((element) => evalExpression(element as ts.Expression));
  }
  if (ts.isObjectLiteralExpression(expr)) {
    const out: Record<string, any> = {};
    for (const prop of expr.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = evalPropertyName(prop.name);
        if (key) out[key] = evalExpression(prop.initializer);
      }
    }
    return out;
  }
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evalExpression(expr.left);
    const right = evalExpression(expr.right);
    return `${left ?? ''}${right ?? ''}`;
  }
  if (ts.isTemplateExpression(expr)) {
    return [expr.head.text, ...expr.templateSpans.map((span) => span.literal.text)].join('');
  }
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
    const fn = expr.expression.text;
    const args = expr.arguments.map((arg) => evalExpression(arg));
    if (fn === 'scenarioCopy') {
      return { title: args[0], goal: args[1], nextStepHint: args[2] };
    }
    if (fn === 'scenarioBatchCopies') {
      return { 'pt-BR': args[0], vi: args[1], id: args[2], tr: args[3], pl: args[4] };
    }
  }
  return undefined;
}

function readConstValue<T>(sourceFile: ts.SourceFile, name: string, fallback: T): T {
  const initializer = findVariableInitializer(sourceFile, name);
  if (!initializer) return fallback;
  const value = evalExpression(initializer);
  return value ?? fallback;
}

function scenarioTitle(
  scenario: any,
  lang: Lang,
  copyUk: Record<string, any>,
  copyEs: Record<string, any>,
  fallbackEs: any,
  copyBatch: Record<string, any>,
  fallbackBatch: any,
): string {
  const batch = copyBatch[String(scenario.id)] ?? fallbackBatch;
  const es = copyEs[String(scenario.id)] ?? fallbackEs;
  const values: Record<Lang, string> = {
    ru: scenario.titleRu,
    uk: copyUk[String(scenario.id)]?.title ?? scenario.titleRu,
    es: scenario.titleEs ?? es?.titleEs,
    'pt-BR': batch?.['pt-BR']?.title,
    vi: batch?.vi?.title,
    id: batch?.id?.title,
    tr: batch?.tr?.title,
    pl: batch?.pl?.title,
  };
  return values[lang] ?? values.ru ?? '';
}

function scenarioGoal(
  scenario: any,
  lang: Lang,
  copyUk: Record<string, any>,
  copyEs: Record<string, any>,
  fallbackEs: any,
  copyBatch: Record<string, any>,
  fallbackBatch: any,
): string {
  const batch = copyBatch[String(scenario.id)] ?? fallbackBatch;
  const es = copyEs[String(scenario.id)] ?? fallbackEs;
  const values: Record<Lang, string> = {
    ru: scenario.goalRu,
    uk: copyUk[String(scenario.id)]?.goal ?? scenario.goalRu,
    es: scenario.goalEs ?? es?.goalEs,
    'pt-BR': batch?.['pt-BR']?.goal,
    vi: batch?.vi?.goal,
    id: batch?.id?.goal,
    tr: batch?.tr?.goal,
    pl: batch?.pl?.goal,
  };
  return values[lang] ?? values.ru ?? '';
}

function scenarioNextStepHint(
  scenario: any,
  lang: Lang,
  copyUk: Record<string, any>,
  copyEs: Record<string, any>,
  fallbackEs: any,
  copyBatch: Record<string, any>,
  fallbackBatch: any,
): string {
  const batch = copyBatch[String(scenario.id)] ?? fallbackBatch;
  const es = copyEs[String(scenario.id)] ?? fallbackEs;
  const values: Record<Lang, string> = {
    ru: scenario.nextStepHintRu,
    uk: copyUk[String(scenario.id)]?.nextStepHint ?? scenario.nextStepHintRu,
    es: scenario.nextStepHintEs ?? es?.nextStepHintEs,
    'pt-BR': batch?.['pt-BR']?.nextStepHint,
    vi: batch?.vi?.nextStepHint,
    id: batch?.id?.nextStepHint,
    tr: batch?.tr?.nextStepHint,
    pl: batch?.pl?.nextStepHint,
  };
  return values[lang] ?? values.ru ?? '';
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV AI Dialog Scenario Contract Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Expected active scenarios: ${report.summary.expectedActiveScenarios}`,
    `- Total scenarios: ${report.summary.totalScenarios}`,
    `- Active scenarios: ${report.summary.activeScenarios}`,
    `- Public scenarios: ${report.summary.publicScenarios}`,
    `- Hidden active scenarios: ${report.summary.hiddenActiveScenarios}`,
    `- Course scenarios: ${report.summary.courseScenarios}`,
    `- Challenge scenarios: ${report.summary.challengeScenarios}`,
    `- Unique scenario IDs: ${report.summary.uniqueScenarioIds}`,
    `- Localized UI cells checked: ${report.summary.localizedUiCellsChecked}`,
    `- Group labels checked: ${report.summary.groupLabelsChecked}`,
    `- Non-RU/UK Cyrillic leaks: ${report.summary.nonRuUkCyrillicLeaks}`,
    `- Prompt safety findings: ${report.summary.promptSafetyFindings}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`,
    `- Ready for French dialog generation: ${report.summary.readyForFrenchDialogGeneration ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Category Coverage',
    '',
  ];

  for (const [category, count] of Object.entries(report.summary.activeCategories).sort()) {
    lines.push(`- \`${category}\`: ${count} active`);
  }
  lines.push('', '## CEFR Coverage', '');
  for (const [cefr, count] of Object.entries(report.summary.cefr).sort()) {
    lines.push(`- \`${cefr}\`: ${count}`);
  }

  lines.push('', '## Contract Gates', '');
  for (const item of report.contractGates) {
    lines.push(`- \`${item.status}\` \`${item.id}\`: ${item.description}`);
    for (const blocker of item.blockers) lines.push(`  - ${blocker}`);
  }

  lines.push('', '## Source-Locale Policy', '');
  for (const item of report.sourceLocalePolicy) lines.push(`- ${item}`);
  lines.push('', '## Study-Target Policy', '');
  for (const item of report.studyTargetPolicy) lines.push(`- ${item}`);

  lines.push('', '## Tests Observed', '');
  for (const [key, value] of Object.entries(report.testsObserved)) {
    if (key === 'sourcePath') continue;
    lines.push(`- \`${key}\`: ${value ? 'yes' : 'no'}`);
  }

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      const where = finding.path ? ` \`${finding.path}\`` : '';
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`${where}: ${finding.message}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is contract-only.',
    '- It does not modify prompt content.',
    '- It does not modify production app files.',
    '- It does not modify generated French ledgers.',
    '- It does not write reviewer decisions.',
    '- It does not approve production app apply.',
    '',
  );

  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_ai_dialog_scenario_contract_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p2Path = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(p2Path)) {
    addFinding(findings, 'blocker', 'missing_p2_domain_registry', 'P4 requires the P2 algorithm domain registry packet.', rel(repoRoot, p2Path));
  } else {
    const p2 = readJson<{ status?: string; summary?: { readyForP3P7Contracts?: boolean } }>(p2Path);
    if (p2.status !== 'PASS' || !p2.summary?.readyForP3P7Contracts) {
      addFinding(findings, 'blocker', 'p2_not_ready_for_p4', 'P2 registry is not marked ready for P3-P7 contracts.', rel(repoRoot, p2Path));
    }
  }

  for (const file of SOURCE_FILES) {
    if (!fs.existsSync(path.resolve(repoRoot, file))) {
      addFinding(findings, 'blocker', 'missing_ai_dialog_source_file', 'Required P4 source file is missing.', file);
    }
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    console.error(findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n'));
    process.exit(1);
  }

  const sourceFile = readSourceFile(repoRoot, 'app/ai_dialog_scenarios.ts');
  const scenarios = readConstValue<any[]>(sourceFile, 'DIALOG_SCENARIOS', []);
  const groups = readConstValue<any[]>(sourceFile, 'DIALOG_SCENARIO_GROUPS', []);
  const copyUk = readConstValue<Record<string, any>>(sourceFile, 'DIALOG_SCENARIO_COPY_UK', {});
  const copyEs = readConstValue<Record<string, any>>(sourceFile, 'DIALOG_SCENARIO_COPY_ES', {});
  const fallbackEs = readConstValue<Record<string, any>>(sourceFile, 'FALLBACK_DIALOG_SCENARIO_COPY_ES', {});
  const copyBatch = readConstValue<Record<string, any>>(sourceFile, 'DIALOG_SCENARIO_COPY_BATCH', {});
  const fallbackBatch = readConstValue<Record<string, any>>(sourceFile, 'FALLBACK_DIALOG_SCENARIO_COPY_BATCH', {});
  const groupCopyEs = readConstValue<Record<string, any>>(sourceFile, 'DIALOG_SCENARIO_GROUP_COPY_ES', {});

  const active = scenarios.filter((scenario) => scenario.active);
  const publicScenarios = scenarios.filter((scenario) => scenario.active && !scenario.hiddenFromHome);
  const courseScenarios = publicScenarios.filter((scenario) => (scenario.collection ?? 'course') === 'course');
  const challengeScenarios = publicScenarios
    .filter((scenario) => scenario.collection === 'challenge')
    .sort((a, b) => (a.requiredAccountLevel ?? 0) - (b.requiredAccountLevel ?? 0));
  const hiddenActive = active.filter((scenario) => scenario.hiddenFromHome);
  const ids = scenarios.map((scenario) => String(scenario.id));
  const uniqueIds = new Set(ids);
  const categories: Record<string, number> = {};
  const activeCategories: Record<string, number> = {};
  const cefr: Record<string, number> = {};
  let missingTitle = 0;
  let missingGoal = 0;
  let missingNextStepHint = 0;
  let missingRole = 0;
  let missingSetting = 0;
  let missingGoalEn = 0;
  let promptSafetyFindings = 0;
  let nonRuUkCyrillicLeaks = 0;
  let localizedUiCellsChecked = 0;
  let groupLabelsChecked = 0;

  if (active.length !== EXPECTED_ACTIVE_SCENARIOS) {
    addFinding(
      findings,
      'blocker',
      'unexpected_active_scenario_count',
      `Expected ${EXPECTED_ACTIVE_SCENARIOS} active scenarios but found ${active.length}.`,
      'app/ai_dialog_scenarios.ts',
    );
  }
  if (uniqueIds.size !== ids.length) {
    addFinding(findings, 'blocker', 'duplicate_scenario_id', 'Scenario IDs are not unique.', 'app/ai_dialog_scenarios.ts');
  }
  if (courseScenarios.length + challengeScenarios.length !== publicScenarios.length) {
    addFinding(findings, 'blocker', 'course_challenge_split_mismatch', 'Course plus challenge scenarios do not equal public scenarios.', 'app/ai_dialog_scenarios.ts');
  }

  for (const scenario of scenarios) {
    inc(categories, String(scenario.category));
    if (scenario.active) inc(activeCategories, String(scenario.category));
    inc(cefr, String(scenario.cefr));

    if (!hasText(scenario.titleRu, 4)) {
      missingTitle += 1;
      addFinding(findings, 'blocker', 'scenario_missing_title_ru', `Scenario ${String(scenario.id)} is missing titleRu.`, 'app/ai_dialog_scenarios.ts');
    }
    if (!hasText(scenario.goalRu, 12)) {
      missingGoal += 1;
      addFinding(findings, 'blocker', 'scenario_missing_goal_ru', `Scenario ${String(scenario.id)} is missing goalRu.`, 'app/ai_dialog_scenarios.ts');
    }
    if (!hasText(scenario.nextStepHintRu, 18)) {
      missingNextStepHint += 1;
      addFinding(findings, 'blocker', 'scenario_missing_next_step_hint_ru', `Scenario ${String(scenario.id)} is missing nextStepHintRu.`, 'app/ai_dialog_scenarios.ts');
    }
    if (!hasText(scenario.role, 4)) {
      missingRole += 1;
      addFinding(findings, 'blocker', 'scenario_missing_role', `Scenario ${String(scenario.id)} is missing role.`, 'app/ai_dialog_scenarios.ts');
    }
    if (!hasText(scenario.setting, 4)) {
      missingSetting += 1;
      addFinding(findings, 'blocker', 'scenario_missing_setting', `Scenario ${String(scenario.id)} is missing setting.`, 'app/ai_dialog_scenarios.ts');
    }
    if (!hasText(scenario.goalEn, 12)) {
      missingGoalEn += 1;
      addFinding(findings, 'blocker', 'scenario_missing_goal_en', `Scenario ${String(scenario.id)} is missing goalEn.`, 'app/ai_dialog_scenarios.ts');
    }

    const promptText = [scenario.role, scenario.setting, scenario.goalEn, scenario.persona].filter(Boolean).join('\n');
    if (PROMPT_SAFETY_RE.test(promptText)) {
      promptSafetyFindings += 1;
      addFinding(findings, 'blocker', 'scenario_prompt_safety_marker', `Scenario ${String(scenario.id)} contains a prompt-safety marker.`, 'app/ai_dialog_scenarios.ts');
    }

    for (const lang of ALL_LANGS) {
      const title = scenarioTitle(scenario, lang, copyUk, copyEs, fallbackEs, copyBatch, fallbackBatch);
      const goal = scenarioGoal(scenario, lang, copyUk, copyEs, fallbackEs, copyBatch, fallbackBatch);
      const nextStepHint = scenarioNextStepHint(scenario, lang, copyUk, copyEs, fallbackEs, copyBatch, fallbackBatch);
      localizedUiCellsChecked += 3;
      if (!hasText(title, 4) || !hasText(goal, 12) || !hasText(nextStepHint, 18)) {
        addFinding(findings, 'blocker', 'scenario_localized_ui_copy_missing', `Scenario ${String(scenario.id)} has incomplete ${lang} UI copy.`, 'app/ai_dialog_scenarios.ts');
      }
      if (NON_RU_UK_LANGS.includes(lang) && (CYRILLIC_RE.test(title) || CYRILLIC_RE.test(goal) || CYRILLIC_RE.test(nextStepHint))) {
        nonRuUkCyrillicLeaks += 1;
        addFinding(findings, 'blocker', 'scenario_non_ru_uk_cyrillic_leak', `Scenario ${String(scenario.id)} leaks Cyrillic into ${lang} UI copy.`, 'app/ai_dialog_scenarios.ts');
      }
    }
  }

  for (const group of groups) {
    if (!['everyday', 'travel', 'social'].includes(String(group.category))) {
      addFinding(findings, 'blocker', 'unknown_scenario_group_category', `Unknown scenario group ${String(group.category)}.`, 'app/ai_dialog_scenarios.ts');
    }
    if (courseScenarios.filter((scenario) => scenario.category === group.category).length < 5) {
      addFinding(findings, 'blocker', 'scenario_group_underfilled', `Scenario group ${String(group.category)} has fewer than 5 course scenarios.`, 'app/ai_dialog_scenarios.ts');
    }
    for (const lang of ['ru', 'uk', 'es'] as Lang[]) {
      const label = lang === 'es'
        ? groupCopyEs[String(group.category)]?.labelEs
        : group.labelRu;
      const shortLabel = lang === 'es'
        ? groupCopyEs[String(group.category)]?.shortLabelEs
        : group.shortLabelRu;
      groupLabelsChecked += 2;
      if (!hasText(label, 3) || !hasText(shortLabel, 2)) {
        addFinding(findings, 'blocker', 'scenario_group_label_missing', `Scenario group ${String(group.category)} has incomplete ${lang} labels.`, 'app/ai_dialog_scenarios.ts');
      }
      if (NON_RU_UK_LANGS.includes(lang) && (CYRILLIC_RE.test(label) || CYRILLIC_RE.test(shortLabel))) {
        nonRuUkCyrillicLeaks += 1;
        addFinding(findings, 'blocker', 'group_non_ru_uk_cyrillic_leak', `Scenario group ${String(group.category)} leaks Cyrillic into ${lang} labels.`, 'app/ai_dialog_scenarios.ts');
      }
    }
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, 'tests/ai_dialog_scenarios.test.ts'), 'utf8');
  const testsObserved = {
    sourcePath: 'tests/ai_dialog_scenarios.test.ts',
    checksPublicVisibility: /exposes only active, non-hidden scenarios publicly/.test(testText),
    checksCourseChallengeSplit: /course \+ situations|course.*challenge/i.test(testText),
    checksUniqueIds: /keeps scenario ids unique/.test(testText),
    checksPromptData: /useful English prompt data/.test(testText),
    checksNextStepHint: /next-step hint/.test(testText),
    checksCategoryNavigation: /category navigation/.test(testText),
    checksSpanishNoRussianFallback: /Spanish without Russian fallbacks/.test(testText),
    checksBatchLocalesNoRussianFallback: /batch locales without Russian fallbacks/.test(testText),
  };

  const contractGates = [
    gate('title_goal_next_step_hint', 'Every scenario must expose title, goal, and nextStepHint UI copy.', findings.filter((finding) => [
      'scenario_missing_title_ru',
      'scenario_missing_goal_ru',
      'scenario_missing_next_step_hint_ru',
      'scenario_localized_ui_copy_missing',
    ].includes(finding.code)).map((finding) => finding.message)),
    gate('role_setting_goal_prompt', 'Every scenario must have role, setting, and goalEn prompt data.', findings.filter((finding) => [
      'scenario_missing_role',
      'scenario_missing_setting',
      'scenario_missing_goal_en',
    ].includes(finding.code)).map((finding) => finding.message)),
    gate('prompt_safety', 'Prompt text must not contain obvious prompt-injection or unsafe instruction markers.', findings.filter((finding) => finding.code === 'scenario_prompt_safety_marker').map((finding) => finding.message)),
    gate('visibility_and_routing', 'Public scenarios must be active, non-hidden, routeable, and split into course/challenge tabs.', findings.filter((finding) => [
      'duplicate_scenario_id',
      'course_challenge_split_mismatch',
      'unexpected_active_scenario_count',
    ].includes(finding.code)).map((finding) => finding.message)),
    gate('category_course_challenge_grouping', 'Scenario categories and course/challenge grouping must stay populated.', findings.filter((finding) => [
      'unknown_scenario_group_category',
      'scenario_group_underfilled',
    ].includes(finding.code)).map((finding) => finding.message)),
    gate('non_ru_uk_cyrillic_firewall', 'Non-RU/UK UI locales must not contain Cyrillic fallback copy.', findings.filter((finding) => [
      'scenario_non_ru_uk_cyrillic_leak',
      'group_non_ru_uk_cyrillic_leak',
    ].includes(finding.code)).map((finding) => finding.message)),
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-ai-dialog-scenario-contract-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      p2DomainRegistryPacket: rel(repoRoot, p2Path),
      sourceFiles: SOURCE_FILES,
    },
    summary: {
      totalScenarios: scenarios.length,
      activeScenarios: active.length,
      expectedActiveScenarios: EXPECTED_ACTIVE_SCENARIOS,
      publicScenarios: publicScenarios.length,
      hiddenActiveScenarios: hiddenActive.length,
      courseScenarios: courseScenarios.length,
      challengeScenarios: challengeScenarios.length,
      uniqueScenarioIds: uniqueIds.size,
      categories,
      activeCategories,
      cefr,
      missingTitle,
      missingGoal,
      missingNextStepHint,
      missingRole,
      missingSetting,
      missingGoalEn,
      promptSafetyFindings,
      nonRuUkCyrillicLeaks,
      groupLabelsChecked,
      localizedUiCellsChecked,
      blockers,
      warnings,
      readyForP8ReadinessExtension: blockers === 0,
      readyForFrenchDialogGeneration: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceLocalePolicy: [
      'Scenario menu title, goal, nextStepHint, group labels, lock text, and CTA labels are source-locale UI copy.',
      'ru and uk may use Cyrillic; es, pt-BR, vi, id, tr, and pl must not fall back to Cyrillic UI copy.',
      'Source-locale UI copy is separate from role, setting, and goalEn prompt behavior.',
    ],
    studyTargetPolicy: [
      'Learner interaction language and target-language behavior must be selected by studyTarget, not by sourceLocale.',
      'role, setting, goalEn, and persona are prompt inputs; changing UI language must not rewrite scenario intent.',
      'French dialog activation requires a future prompt/target-language generation and reviewer packet.',
    ],
    contractGates,
    testsObserved,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      promptContentModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'ai_dialog_scenario_contract_packet.json');
  const outMd = path.join(auditsDir, 'ai_dialog_scenario_contract_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV AI dialog scenario contract packet: ${report.status}`);
  console.log(`Active scenarios: ${report.summary.activeScenarios}/${report.summary.expectedActiveScenarios}`);
  console.log(`Public scenarios: ${report.summary.publicScenarios}`);
  console.log(`Course scenarios: ${report.summary.courseScenarios}`);
  console.log(`Challenge scenarios: ${report.summary.challengeScenarios}`);
  console.log(`Localized UI cells checked: ${report.summary.localizedUiCellsChecked}`);
  console.log(`Non-RU/UK Cyrillic leaks: ${report.summary.nonRuUkCyrillicLeaks}`);
  console.log(`Prompt safety findings: ${report.summary.promptSafetyFindings}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`);
  console.log(`Ready for French dialog generation: ${report.summary.readyForFrenchDialogGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
