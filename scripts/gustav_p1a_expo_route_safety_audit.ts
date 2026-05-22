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

type ExistingShimEvidence = {
  filePath: string;
  hasDefaultRouteShim: boolean;
  mentionsExpoRouter: boolean;
};

type PlannedModuleContract = {
  filePath: string;
  role: 'study_target_model' | 'target_key_builder';
  routeShimRequired: boolean;
  defaultExportName: string;
  pureModuleRequired: boolean;
  forbiddenImports: string[];
  forbiddenPatterns: string[];
  requiredNamedExports: string[];
};

type Audit = {
  schemaVersion: 'gustav-p1a-expo-route-safety-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aMinimalApplyPacket: string;
    p1aCoreContractSpec: string;
  };
  summary: {
    plannedAppUtilityFiles: number;
    routeShimRequiredFiles: number;
    existingShimEvidenceFiles: number;
    pureModuleContracts: number;
    forbiddenImportRules: number;
    forbiddenPatternRules: number;
    blockers: number;
    warnings: number;
    routeSafeAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  existingShimEvidence: ExistingShimEvidence[];
  plannedModuleContracts: PlannedModuleContract[];
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

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readTextIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Expo Route Safety Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Planned app utility files: ${audit.summary.plannedAppUtilityFiles}`,
    `- Route shim required files: ${audit.summary.routeShimRequiredFiles}`,
    `- Existing shim evidence files: ${audit.summary.existingShimEvidenceFiles}`,
    `- Pure module contracts: ${audit.summary.pureModuleContracts}`,
    `- Forbidden import rules: ${audit.summary.forbiddenImportRules}`,
    `- Forbidden pattern rules: ${audit.summary.forbiddenPatternRules}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Route safe after approval: ${audit.summary.routeSafeAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Existing Shim Evidence',
    '',
  ];

  for (const evidence of audit.existingShimEvidence) {
    lines.push(`- \`${evidence.filePath}\`: route shim ${evidence.hasDefaultRouteShim ? 'yes' : 'no'}, expo-router note ${evidence.mentionsExpoRouter ? 'yes' : 'no'}`);
  }

  lines.push('', '## Planned Module Contracts', '');
  for (const contract of audit.plannedModuleContracts) {
    lines.push(`### ${contract.filePath}`);
    lines.push('');
    lines.push(`- Role: \`${contract.role}\``);
    lines.push(`- Route shim required: ${contract.routeShimRequired ? 'yes' : 'no'}`);
    lines.push(`- Default export name: \`${contract.defaultExportName}\``);
    lines.push(`- Pure module required: ${contract.pureModuleRequired ? 'yes' : 'no'}`);
    lines.push(`- Forbidden imports: ${contract.forbiddenImports.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Forbidden patterns: ${contract.forbiddenPatterns.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Required named exports: ${contract.requiredNamedExports.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push('');
  }

  lines.push('## Findings', '');
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
    console.error('Usage: npx tsx scripts/gustav_p1a_expo_route_safety_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const p1aContractPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const p1aContract = readJson<Record<string, unknown>>(p1aContractPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be PASS and ready before route safety can be trusted.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }

  const files = arr<Record<string, unknown>>(packet.files).map((file) => str(file.path)).filter(Boolean);
  const plannedAppFiles = files.filter((file) => file.startsWith('app/') && file.endsWith('.ts'));
  const keyBuilderApis = object(p1aContract.keyBuilderContract).publicApis;
  const keyBuilderExports = arr<Record<string, unknown>>(keyBuilderApis).map((api) => str(api.name)).filter(Boolean);

  const existingShimFiles = [
    'app/study_target_lang_dev.ts',
    'app/flashcards/storage.ts',
  ];
  const existingShimEvidence = existingShimFiles.map((filePath) => {
    const text = readTextIfExists(path.join(repoRoot, filePath));
    return {
      filePath,
      hasDefaultRouteShim: /export\s+default\s+function\s+__\w*RouteShim\b/.test(text),
      mentionsExpoRouter: /expo-router/i.test(text),
    };
  });

  for (const evidence of existingShimEvidence) {
    if (!evidence.hasDefaultRouteShim) {
      findings.push({
        severity: 'blocker',
        code: 'existing_route_shim_evidence_missing',
        message: 'Expected existing app utility file to demonstrate route shim pattern.',
        filePath: evidence.filePath,
      });
    }
  }

  const plannedModuleContracts: PlannedModuleContract[] = plannedAppFiles.map((filePath) => {
    const isStudyTarget = filePath === 'app/study_target.ts';
    const requiredNamedExports = isStudyTarget
      ? ['StudyTarget', 'STUDY_TARGETS', 'DEFAULT_STUDY_TARGET', 'STUDY_TARGET_STORAGE_KEY', 'isStudyTarget', 'assertStudyTarget', 'defaultStudyTarget']
      : ['TargetKeyDomain', 'SourceTargetKeyDomain', ...keyBuilderExports];
    return {
      filePath,
      role: isStudyTarget ? 'study_target_model' : 'target_key_builder',
      routeShimRequired: true,
      defaultExportName: isStudyTarget ? '__StudyTargetRouteShim' : '__TargetStorageKeysRouteShim',
      pureModuleRequired: true,
      forbiddenImports: [
        '@react-native-async-storage/async-storage',
        'react',
        'react-native',
        'expo-router',
      ],
      forbiddenPatterns: [
        'AsyncStorage.',
        'useRouter(',
        '<View',
        '<Text',
        'DeviceEventEmitter',
        'ENABLE_DEV_STUDY_TARGET_LANG',
        'StudyTargetLang',
      ],
      requiredNamedExports,
    };
  });

  if (plannedAppFiles.length !== 2) {
    findings.push({
      severity: 'blocker',
      code: 'planned_app_utility_count_invalid',
      message: `Expected 2 planned app utility files, found ${plannedAppFiles.length}.`,
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  for (const required of ['app/study_target.ts', 'app/target_storage_keys.ts']) {
    if (!plannedAppFiles.includes(required)) {
      findings.push({
        severity: 'blocker',
        code: 'planned_app_utility_missing',
        message: `Missing planned P1A app utility file ${required}.`,
        filePath: path.relative(repoRoot, packetPath),
      });
    }
  }
  if (plannedModuleContracts.some((contract) => contract.requiredNamedExports.length === 0)) {
    findings.push({
      severity: 'blocker',
      code: 'planned_module_exports_missing',
      message: 'Every planned app module must have required named exports.',
      filePath: path.relative(repoRoot, p1aContractPath),
    });
  }

  const forbiddenImportRules = plannedModuleContracts.reduce((sum, contract) => sum + contract.forbiddenImports.length, 0);
  const forbiddenPatternRules = plannedModuleContracts.reduce((sum, contract) => sum + contract.forbiddenPatterns.length, 0);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const routeSafeAfterApproval =
    blockers === 0 &&
    plannedAppFiles.length === 2 &&
    plannedModuleContracts.length === 2 &&
    plannedModuleContracts.every((contract) => contract.routeShimRequired && contract.pureModuleRequired && contract.defaultExportName && contract.requiredNamedExports.length > 0) &&
    existingShimEvidence.length >= 2 &&
    existingShimEvidence.every((evidence) => evidence.hasDefaultRouteShim);

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-expo-route-safety-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aMinimalApplyPacket: path.relative(repoRoot, packetPath),
      p1aCoreContractSpec: path.relative(repoRoot, p1aContractPath),
    },
    summary: {
      plannedAppUtilityFiles: plannedAppFiles.length,
      routeShimRequiredFiles: plannedModuleContracts.filter((contract) => contract.routeShimRequired).length,
      existingShimEvidenceFiles: existingShimEvidence.length,
      pureModuleContracts: plannedModuleContracts.filter((contract) => contract.pureModuleRequired).length,
      forbiddenImportRules,
      forbiddenPatternRules,
      blockers,
      warnings,
      routeSafeAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    existingShimEvidence,
    plannedModuleContracts,
    findings,
    notes: [
      'P1A app utility files live under app/, so they must include explicit default route shims.',
      'P1A core modules must stay pure: no React, React Native, AsyncStorage or expo-router imports.',
      'StudyTargetContext and dev StudyTargetLang bridging remains deferred to P1B.',
      'This audit does not create app files or French content.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_expo_route_safety_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_expo_route_safety_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A Expo route safety audit: ${audit.status}`);
  console.log(`Planned app utility files: ${audit.summary.plannedAppUtilityFiles}`);
  console.log(`Route shim required files: ${audit.summary.routeShimRequiredFiles}`);
  console.log(`Existing shim evidence files: ${audit.summary.existingShimEvidenceFiles}`);
  console.log(`Forbidden import rules: ${audit.summary.forbiddenImportRules}`);
  console.log(`Route safe after approval: ${audit.summary.routeSafeAfterApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
