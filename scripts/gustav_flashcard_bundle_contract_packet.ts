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

type BundleConfig = {
  id: 'movie_series' | 'phrasal_verbs';
  sourcePath: string;
  seedTypeName: string;
  seedConstName: string;
  exportedCardsConstName: string;
  expectedCards: number;
};

type BundleSummary = {
  id: string;
  sourcePath: string;
  seedTypeName: string;
  exportedCardsConstName: string;
  expectedCards: number;
  seedRows: number;
  contractCardRows: number;
  uniqueEnglish: number;
  duplicateEnglish: number;
  sourceLocaleCellsExpected: number;
  sourceLocaleCellsPresent: number;
  sourceLocaleCellsMissing: number;
  missingCoreFields: number;
  missingMeaningFields: number;
  missingContextOrPatternFields: number;
  missingExampleFields: number;
  blockers: number;
  warnings: number;
};

type SharedSchemaContract = {
  sourcePath: string;
  hasVictoriaRowType: boolean;
  hasVictoriaPackFileType: boolean;
  hasMetaMapper: boolean;
  hasRowMapper: boolean;
  mapsSourceLocales: boolean;
  mapsExplanationFields: boolean;
  mapsExampleFields: boolean;
  requiredRowFields: string[];
  optionalLocaleFields: string[];
};

type Report = {
  schemaVersion: 'gustav-flashcard-bundle-contract-packet-v0';
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
  summary: {
    bundles: number;
    expectedCards: number;
    contractCardRows: number;
    seedRows: number;
    uniqueEnglish: number;
    duplicateEnglish: number;
    sourceLocaleCellsExpected: number;
    sourceLocaleCellsPresent: number;
    sourceLocaleCellsMissing: number;
    missingCoreFields: number;
    missingMeaningFields: number;
    missingContextOrPatternFields: number;
    missingExampleFields: number;
    sharedSchemaBlockers: number;
    blockers: number;
    warnings: number;
    readyForP8ReadinessExtension: boolean;
    readyForFrenchBundleGeneration: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  bundleSummaries: BundleSummary[];
  sharedSchemaContract: SharedSchemaContract;
  sourceLocalePolicy: string[];
  studyTargetPolicy: string[];
  frenchBundleGenerationRequirements: string[];
  blockersByCode: Record<string, number>;
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    flashcardContentModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

const BUNDLES: BundleConfig[] = [
  {
    id: 'movie_series',
    sourcePath: 'app/flashcards/bundles/movie_series/movie_series_cards.ts',
    seedTypeName: 'MovieSeriesSeed',
    seedConstName: 'SEEDS',
    exportedCardsConstName: 'MOVIE_SERIES_CARDS',
    expectedCards: 60,
  },
  {
    id: 'phrasal_verbs',
    sourcePath: 'app/flashcards/bundles/phrasal_verbs/phrasal_verbs_cards.ts',
    seedTypeName: 'PhrasalVerbSeed',
    seedConstName: 'SEEDS',
    exportedCardsConstName: 'PHRASAL_VERBS_CARDS',
    expectedCards: 60,
  },
];

const SOURCE_FILES = [
  'app/flashcards/bundles/movie_series/movie_series_cards.ts',
  'app/flashcards/bundles/phrasal_verbs/phrasal_verbs_cards.ts',
  'app/flashcards/bundles/victoriaBundleShared.ts',
];
const REQUIRED_SOURCE_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'];

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

function readSourceFile(repoRoot: string, relativePath: string): ts.SourceFile {
  return ts.createSourceFile(
    relativePath,
    fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
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
    return `${evalExpression(expr.left) ?? ''}${evalExpression(expr.right) ?? ''}`;
  }
  if (ts.isTemplateExpression(expr)) {
    return [expr.head.text, ...expr.templateSpans.map((span) => span.literal.text)].join('');
  }
  return undefined;
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

function readSeedRows(sourceFile: ts.SourceFile, seedConstName: string): any[] {
  const initializer = findVariableInitializer(sourceFile, seedConstName);
  if (!initializer) return [];
  const value = evalExpression(initializer);
  return Array.isArray(value) ? value : [];
}

function hasText(value: unknown, minLength = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

function validateBundle(repoRoot: string, config: BundleConfig, findings: Finding[]): BundleSummary {
  const sourceFile = readSourceFile(repoRoot, config.sourcePath);
  const text = fs.readFileSync(path.resolve(repoRoot, config.sourcePath), 'utf8');
  const seeds = readSeedRows(sourceFile, config.seedConstName);
  const contractCardRows = Math.min(seeds.length, config.expectedCards);
  const rows = seeds.slice(0, contractCardRows);
  const englishValues = rows.map((row) => String(row.en ?? '').trim()).filter(Boolean);
  const uniqueEnglish = new Set(englishValues).size;
  let sourceLocaleCellsPresent = 0;
  let sourceLocaleCellsMissing = 0;
  let missingCoreFields = 0;
  let missingMeaningFields = 0;
  let missingContextOrPatternFields = 0;
  let missingExampleFields = 0;

  if (contractCardRows !== config.expectedCards) {
    addFinding(
      findings,
      'blocker',
      'unexpected_flashcard_card_count',
      `${config.id} expected ${config.expectedCards} contract card rows but found ${contractCardRows}.`,
      config.sourcePath,
    );
  }
  if (!text.includes(`export const ${config.exportedCardsConstName}`)) {
    addFinding(
      findings,
      'blocker',
      'missing_flashcard_export',
      `${config.id} does not export ${config.exportedCardsConstName}.`,
      config.sourcePath,
    );
  }

  rows.forEach((row, index) => {
    const rowLabel = `${config.id} row ${index + 1}`;
    for (const field of ['en', 'ru', 'uk', 'es']) {
      if (!hasText(row[field])) {
        missingCoreFields += 1;
        addFinding(findings, 'blocker', 'flashcard_seed_missing_core_field', `${rowLabel} is missing ${field}.`, config.sourcePath);
      }
    }
    const sourceLocales = row.sourceLocales ?? {};
    for (const locale of REQUIRED_SOURCE_LOCALES) {
      if (hasText(sourceLocales[locale])) sourceLocaleCellsPresent += 1;
      else {
        sourceLocaleCellsMissing += 1;
        addFinding(findings, 'blocker', 'flashcard_seed_missing_source_locale', `${rowLabel} is missing sourceLocales.${locale}.`, config.sourcePath);
      }
    }
    for (const field of ['meaningRu', 'meaningUk', 'meaningEs']) {
      if (!hasText(row[field], 3)) {
        missingMeaningFields += 1;
        addFinding(findings, 'blocker', 'flashcard_seed_missing_meaning_field', `${rowLabel} is missing ${field}.`, config.sourcePath);
      }
    }
    const hasContext = ['contextRu', 'contextUk', 'contextEs'].every((field) => hasText(row[field], 3));
    const hasPattern = ['patternRu', 'patternUk', 'patternEs'].every((field) => hasText(row[field], 3));
    if (!hasContext && !hasPattern) {
      missingContextOrPatternFields += 1;
      addFinding(findings, 'blocker', 'flashcard_seed_missing_context_or_pattern', `${rowLabel} is missing context/pattern fields.`, config.sourcePath);
    }
    for (const field of ['exampleEn', 'exampleRu', 'exampleUk', 'exampleEs']) {
      if (!hasText(row[field], 3)) {
        missingExampleFields += 1;
        addFinding(findings, 'blocker', 'flashcard_seed_missing_example_field', `${rowLabel} is missing ${field}.`, config.sourcePath);
      }
    }
  });

  if (uniqueEnglish !== englishValues.length) {
    addFinding(
      findings,
      'blocker',
      'duplicate_flashcard_english',
      `${config.id} has duplicate English seed rows.`,
      config.sourcePath,
    );
  }

  const ownFindings = findings.filter((finding) => finding.path === config.sourcePath);
  return {
    id: config.id,
    sourcePath: config.sourcePath,
    seedTypeName: config.seedTypeName,
    exportedCardsConstName: config.exportedCardsConstName,
    expectedCards: config.expectedCards,
    seedRows: seeds.length,
    contractCardRows,
    uniqueEnglish,
    duplicateEnglish: englishValues.length - uniqueEnglish,
    sourceLocaleCellsExpected: contractCardRows * REQUIRED_SOURCE_LOCALES.length,
    sourceLocaleCellsPresent,
    sourceLocaleCellsMissing,
    missingCoreFields,
    missingMeaningFields,
    missingContextOrPatternFields,
    missingExampleFields,
    blockers: ownFindings.filter((finding) => finding.severity === 'blocker').length,
    warnings: ownFindings.filter((finding) => finding.severity === 'warning').length,
  };
}

function buildSharedSchemaContract(repoRoot: string, findings: Finding[]): SharedSchemaContract {
  const sourcePath = 'app/flashcards/bundles/victoriaBundleShared.ts';
  const text = fs.readFileSync(path.resolve(repoRoot, sourcePath), 'utf8');
  const contract: SharedSchemaContract = {
    sourcePath,
    hasVictoriaRowType: /export type VictoriaRow/.test(text),
    hasVictoriaPackFileType: /export type VictoriaPackFile/.test(text),
    hasMetaMapper: /export function victoriaMetaFromPackJson/.test(text),
    hasRowMapper: /export function mapVictoriaRowsToCardItems/.test(text),
    mapsSourceLocales: /sourceLocales:\s*{[\s\S]*'pt-BR'[\s\S]*vi[\s\S]*id[\s\S]*tr[\s\S]*pl/.test(text),
    mapsExplanationFields: /explanationRu[\s\S]*explanationUk[\s\S]*explanationEs/.test(text),
    mapsExampleFields: /exampleEn[\s\S]*exampleRu[\s\S]*exampleUk[\s\S]*exampleEs/.test(text),
    requiredRowFields: ['id', 'en', 'ru', 'uk'],
    optionalLocaleFields: ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'sourceLocales'],
  };

  for (const [key, value] of Object.entries(contract)) {
    if (typeof value === 'boolean' && !value) {
      addFinding(findings, 'blocker', 'flashcard_shared_schema_contract_missing', `Shared schema contract field ${key} is missing.`, sourcePath);
    }
  }
  return contract;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Flashcard Bundle Contract Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Bundles: ${report.summary.bundles}`,
    `- Expected cards: ${report.summary.expectedCards}`,
    `- Contract card rows: ${report.summary.contractCardRows}`,
    `- Seed rows: ${report.summary.seedRows}`,
    `- Unique English rows: ${report.summary.uniqueEnglish}`,
    `- Duplicate English rows: ${report.summary.duplicateEnglish}`,
    `- Source-locale cells expected: ${report.summary.sourceLocaleCellsExpected}`,
    `- Source-locale cells present: ${report.summary.sourceLocaleCellsPresent}`,
    `- Source-locale cells missing: ${report.summary.sourceLocaleCellsMissing}`,
    `- Missing core fields: ${report.summary.missingCoreFields}`,
    `- Missing meaning fields: ${report.summary.missingMeaningFields}`,
    `- Missing context/pattern fields: ${report.summary.missingContextOrPatternFields}`,
    `- Missing example fields: ${report.summary.missingExampleFields}`,
    `- Shared schema blockers: ${report.summary.sharedSchemaBlockers}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`,
    `- Ready for French bundle generation: ${report.summary.readyForFrenchBundleGeneration ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Bundle Coverage',
    '',
  ];
  for (const bundle of report.bundleSummaries) {
    lines.push(`### ${bundle.id}`);
    lines.push('');
    lines.push(`- Seed rows: ${bundle.seedRows}`);
    lines.push(`- Contract card rows: ${bundle.contractCardRows}/${bundle.expectedCards}`);
    lines.push(`- Unique English: ${bundle.uniqueEnglish}`);
    lines.push(`- Source-locale cells: ${bundle.sourceLocaleCellsPresent}/${bundle.sourceLocaleCellsExpected}`);
    lines.push(`- Missing core fields: ${bundle.missingCoreFields}`);
    lines.push(`- Missing meaning fields: ${bundle.missingMeaningFields}`);
    lines.push(`- Missing context/pattern fields: ${bundle.missingContextOrPatternFields}`);
    lines.push(`- Missing example fields: ${bundle.missingExampleFields}`);
    lines.push(`- Blockers: ${bundle.blockers}`);
    lines.push(`- Warnings: ${bundle.warnings}`);
    lines.push('');
  }

  lines.push('## Source-Locale Policy', '');
  for (const item of report.sourceLocalePolicy) lines.push(`- ${item}`);
  lines.push('', '## Study-Target Policy', '');
  for (const item of report.studyTargetPolicy) lines.push(`- ${item}`);
  lines.push('', '## French Bundle Generation Requirements', '');
  for (const item of report.frenchBundleGenerationRequirements) lines.push(`- ${item}`);

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings.slice(0, 120)) {
      const where = finding.path ? ` \`${finding.path}\`` : '';
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`${where}: ${finding.message}`);
    }
    if (report.findings.length > 120) lines.push(`- ... ${report.findings.length - 120} more`);
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is contract-only.',
    '- It does not change card content or assets.',
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
    console.error('Usage: npx tsx scripts/gustav_flashcard_bundle_contract_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p2Path = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(p2Path)) {
    addFinding(findings, 'blocker', 'missing_p2_domain_registry', 'P5 requires the P2 algorithm domain registry packet.', rel(repoRoot, p2Path));
  } else {
    const p2 = readJson<{ status?: string; summary?: { readyForP3P7Contracts?: boolean } }>(p2Path);
    if (p2.status !== 'PASS' || !p2.summary?.readyForP3P7Contracts) {
      addFinding(findings, 'blocker', 'p2_not_ready_for_p5', 'P2 registry is not marked ready for P3-P7 contracts.', rel(repoRoot, p2Path));
    }
  }

  for (const sourceFile of SOURCE_FILES) {
    if (!fs.existsSync(path.resolve(repoRoot, sourceFile))) {
      addFinding(findings, 'blocker', 'missing_flashcard_source_file', 'Required P5 source file is missing.', sourceFile);
    }
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    console.error(findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n'));
    process.exit(1);
  }

  const bundleSummaries = BUNDLES.map((bundle) => validateBundle(repoRoot, bundle, findings));
  const sharedSchemaContract = buildSharedSchemaContract(repoRoot, findings);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const blockersByCode = findings
    .filter((finding) => finding.severity === 'blocker')
    .reduce<Record<string, number>>((acc, finding) => {
      acc[finding.code] = (acc[finding.code] ?? 0) + 1;
      return acc;
    }, {});
  const sharedSchemaBlockers = findings.filter((finding) => (
    finding.path === sharedSchemaContract.sourcePath && finding.severity === 'blocker'
  )).length;

  const report: Report = {
    schemaVersion: 'gustav-flashcard-bundle-contract-packet-v0',
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
      bundles: bundleSummaries.length,
      expectedCards: bundleSummaries.reduce((sum, bundle) => sum + bundle.expectedCards, 0),
      contractCardRows: bundleSummaries.reduce((sum, bundle) => sum + bundle.contractCardRows, 0),
      seedRows: bundleSummaries.reduce((sum, bundle) => sum + bundle.seedRows, 0),
      uniqueEnglish: bundleSummaries.reduce((sum, bundle) => sum + bundle.uniqueEnglish, 0),
      duplicateEnglish: bundleSummaries.reduce((sum, bundle) => sum + bundle.duplicateEnglish, 0),
      sourceLocaleCellsExpected: bundleSummaries.reduce((sum, bundle) => sum + bundle.sourceLocaleCellsExpected, 0),
      sourceLocaleCellsPresent: bundleSummaries.reduce((sum, bundle) => sum + bundle.sourceLocaleCellsPresent, 0),
      sourceLocaleCellsMissing: bundleSummaries.reduce((sum, bundle) => sum + bundle.sourceLocaleCellsMissing, 0),
      missingCoreFields: bundleSummaries.reduce((sum, bundle) => sum + bundle.missingCoreFields, 0),
      missingMeaningFields: bundleSummaries.reduce((sum, bundle) => sum + bundle.missingMeaningFields, 0),
      missingContextOrPatternFields: bundleSummaries.reduce((sum, bundle) => sum + bundle.missingContextOrPatternFields, 0),
      missingExampleFields: bundleSummaries.reduce((sum, bundle) => sum + bundle.missingExampleFields, 0),
      sharedSchemaBlockers,
      blockers,
      warnings,
      readyForP8ReadinessExtension: blockers === 0,
      readyForFrenchBundleGeneration: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    bundleSummaries,
    sharedSchemaContract,
    sourceLocalePolicy: [
      'Flashcard marketplace labels and sourceLocales maps are source-locale UI/meaning copy.',
      'Required existing sourceLocales for these bundles are pt-BR, vi, id, tr, and pl.',
      'ru, uk, and es are current source-locale meaning fields, not French target content.',
      'Missing optional source-locale copy must not be treated as French content.',
    ],
    studyTargetPolicy: [
      'Card en text remains the current English study-target phrase source.',
      'French bundle activation must create target-language card meaning/context/example fields separately from source-locale UI copy.',
      'Study target selection must not reuse English/Spanish marketplace source-locale copy as French card answers.',
    ],
    frenchBundleGenerationRequirements: [
      'French bundle generation requires a separate generator and reviewer handoff packet.',
      'Each French bundle row must preserve id, source pack, English source phrase, context, example, register, and level evidence.',
      'Duplicate French target answers must be checked before activation.',
      'This P5 packet does not generate or apply French flashcard content.',
    ],
    blockersByCode,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      flashcardContentModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'flashcard_bundle_contract_packet.json');
  const outMd = path.join(auditsDir, 'flashcard_bundle_contract_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV flashcard bundle contract packet: ${report.status}`);
  console.log(`Bundles: ${report.summary.bundles}`);
  console.log(`Contract card rows: ${report.summary.contractCardRows}/${report.summary.expectedCards}`);
  console.log(`Source-locale cells: ${report.summary.sourceLocaleCellsPresent}/${report.summary.sourceLocaleCellsExpected}`);
  console.log(`Duplicate English rows: ${report.summary.duplicateEnglish}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`);
  console.log(`Ready for French bundle generation: ${report.summary.readyForFrenchBundleGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
