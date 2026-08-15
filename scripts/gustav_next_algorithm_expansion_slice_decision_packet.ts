import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';
type SliceMode = 'audit-only-translation-generation' | 'requires-app-write-approval';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type FileTouch = {
  path: string;
  action: 'add' | 'write-generated-output';
  zone: 'pipeline-script' | 'gustav-audit-output' | 'gustav-generated-output' | 'algorithm-audit-doc';
  productionAppFile: boolean;
};

type VerificationCommand = {
  label: string;
  command: string;
};

type RecommendedSlice = {
  id: 'P11_FLASHCARD_BUNDLE_FRENCH_GENERATION_PACKET';
  title: string;
  mode: SliceMode;
  requiresExplicitAppWriteApproval: boolean;
  whyThisSlice: string[];
  exactFilesToTouch: FileTouch[];
  acceptanceCriteria: string[];
  blockedActions: string[];
  verificationCommands: VerificationCommand[];
  expectedTranslationRows: number;
  expectedReviewerRows: number;
  readyToStartNow: boolean;
};

type Report = {
  schemaVersion: 'gustav-next-algorithm-expansion-slice-decision-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    expandedAlgorithmMasterManifest: string;
    currentAppReadinessExtensionPacket: string;
    flashcardBundleContractPacket: string;
  };
  summary: {
    recommendedSlices: number;
    selectedSliceId: string;
    selectedSliceMode: SliceMode;
    expectedTranslationRows: number;
    requiresExplicitAppWriteApproval: boolean;
    productionAppFilesToTouch: number;
    exactFilesToTouch: number;
    readyToStartNow: boolean;
    readyForTranslationsToBeginInPipeline: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  selectedSlice: RecommendedSlice;
  rejectedAlternatives: Array<{
    id: string;
    reason: string;
  }>;
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    readinessGateModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

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

function runPath(runDir: string, relativePath: string): string {
  return path.join(runDir, ...relativePath.split('/'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function addFinding(findings: Finding[], severity: FindingSeverity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function fileTouch(pathValue: string, action: FileTouch['action'], zone: FileTouch['zone']): FileTouch {
  return {
    path: pathValue,
    action,
    zone,
    productionAppFile: false,
  };
}

function renderMarkdown(report: Report): string {
  const slice = report.selectedSlice;
  const lines = [
    '# GUSTAV Next Algorithm Expansion Slice Decision Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Decision',
    '',
    `Selected slice: \`${slice.id}\``,
    '',
    `Title: ${slice.title}`,
    '',
    `Mode: \`${slice.mode}\``,
    '',
    `Ready to start now: ${slice.readyToStartNow ? 'yes' : 'no'}`,
    '',
    `Expected translation rows: ${slice.expectedTranslationRows}`,
    '',
    `Requires explicit app-write approval: ${slice.requiresExplicitAppWriteApproval ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    `- Recommended slices: ${report.summary.recommendedSlices}`,
    `- Exact files to touch: ${report.summary.exactFilesToTouch}`,
    `- Production app files to touch: ${report.summary.productionAppFilesToTouch}`,
    `- Ready for translations to begin in pipeline: ${report.summary.readyForTranslationsToBeginInPipeline ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Why This Slice',
    '',
  ];

  for (const reason of slice.whyThisSlice) lines.push(`- ${reason}`);

  lines.push('', '## Exact Files To Touch', '');
  for (const file of slice.exactFilesToTouch) {
    lines.push(`- \`${file.path}\` (${file.action}, ${file.zone}, production app file: ${file.productionAppFile ? 'yes' : 'no'})`);
  }

  lines.push('', '## Acceptance Criteria', '');
  for (const criterion of slice.acceptanceCriteria) lines.push(`- ${criterion}`);

  lines.push('', '## Blocked Actions', '');
  for (const action of slice.blockedActions) lines.push(`- ${action}`);

  lines.push('', '## Verification Commands', '');
  for (const command of slice.verificationCommands) {
    lines.push(`- ${command.label}`);
    lines.push('');
    lines.push('```powershell');
    lines.push(command.command);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Rejected Alternatives', '');
  for (const alternative of report.rejectedAlternatives) {
    lines.push(`- \`${alternative.id}\`: ${alternative.reason}`);
  }

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This decision packet did not modify production app files.',
    '- This decision packet did not generate translations itself.',
    '- This decision packet did not modify generated French ledgers.',
    '- This decision packet did not write reviewer decisions.',
    '- This decision packet does not authorize production app apply.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_next_algorithm_expansion_slice_decision_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = runPath(runDir, 'audits');
  ensureDir(auditsDir);

  const expandedManifestPath = runPath(runDir, 'audits/expanded_algorithm_master_manifest.json');
  const p8Path = runPath(runDir, 'audits/current_app_readiness_extension_packet.json');
  const flashcardContractPath = runPath(runDir, 'audits/flashcard_bundle_contract_packet.json');
  const outJson = runPath(runDir, 'audits/next_algorithm_expansion_slice_decision_packet.json');
  const outMd = runPath(runDir, 'audits/next_algorithm_expansion_slice_decision_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(expandedManifestPath)) {
    addFinding(findings, 'blocker', 'expanded_master_manifest_missing', 'P9 expanded master manifest is missing.', rel(repoRoot, expandedManifestPath));
  }
  if (!fs.existsSync(p8Path)) {
    addFinding(findings, 'blocker', 'readiness_extension_missing', 'P8 readiness extension packet is missing.', rel(repoRoot, p8Path));
  }
  if (!fs.existsSync(flashcardContractPath)) {
    addFinding(findings, 'blocker', 'flashcard_contract_missing', 'P5 flashcard bundle contract packet is missing.', rel(repoRoot, flashcardContractPath));
  }

  const expandedManifest = fs.existsSync(expandedManifestPath) ? readJson<JsonObject>(expandedManifestPath) : {};
  const p8 = fs.existsSync(p8Path) ? readJson<JsonObject>(p8Path) : {};
  const flashcardContract = fs.existsSync(flashcardContractPath) ? readJson<JsonObject>(flashcardContractPath) : {};
  const expandedSummary = object(expandedManifest.summary);
  const p8Summary = object(p8.summary);
  const flashcardSummary = object(flashcardContract.summary);

  if (s(expandedManifest, 'status') !== 'PASS') {
    addFinding(findings, 'blocker', 'expanded_master_manifest_not_pass', 'P9 expanded master manifest is not PASS.', rel(repoRoot, expandedManifestPath));
  }
  if (s(p8, 'status') !== 'PASS') {
    addFinding(findings, 'blocker', 'readiness_extension_not_pass', 'P8 readiness extension packet is not PASS.', rel(repoRoot, p8Path));
  }
  if (s(flashcardContract, 'status') !== 'PASS' || !b(flashcardSummary, 'readyForP8ReadinessExtension')) {
    addFinding(findings, 'blocker', 'flashcard_contract_not_ready', 'P5 flashcard bundle contract is not ready for generation planning.', rel(repoRoot, flashcardContractPath));
  }

  const selectedSlice: RecommendedSlice = {
    id: 'P11_FLASHCARD_BUNDLE_FRENCH_GENERATION_PACKET',
    title: 'Generate an audit-only French translation packet for marketplace flashcard bundles.',
    mode: 'audit-only-translation-generation',
    requiresExplicitAppWriteApproval: false,
    whyThisSlice: [
      'It is the smallest new app-domain translation surface already modeled by P5: 120 card rows instead of a much larger lesson corpus.',
      'It is content-only for this slice and does not require target-aware storage, cloud sync, reward state, or production app activation.',
      'It gives the pipeline real new translations next while preserving the user rule: do not touch production app files.',
      'It creates reviewer-ready artifacts first, matching the existing French lesson-row handoff pattern.',
    ],
    exactFilesToTouch: [
      fileTouch('scripts/gustav_flashcard_bundle_french_generation_packet.ts', 'add', 'pipeline-script'),
      fileTouch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/app_domains/flashcard_bundles/flashcard_bundle_fr_rows.jsonl', 'write-generated-output', 'gustav-generated-output'),
      fileTouch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/app_domains/flashcard_bundles/flashcard_bundle_fr_reviewer_queue.tsv', 'write-generated-output', 'gustav-generated-output'),
      fileTouch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/flashcard_bundle_french_generation_packet.json', 'write-generated-output', 'gustav-audit-output'),
      fileTouch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/flashcard_bundle_french_generation_packet.md', 'write-generated-output', 'gustav-audit-output'),
      fileTouch('docs/gustav/GUSTAV_ALGORITHM_AUDIT_139.md', 'add', 'algorithm-audit-doc'),
    ],
    acceptanceCriteria: [
      'Exactly 120 flashcard bundle rows are emitted: 60 `movie_series` and 60 `phrasal_verbs`.',
      'Every row keeps the English source text and existing sourceLocale content read-only.',
      'Every row receives French translation fields required by the P5 contract for meaning, context/pattern, and examples.',
      'Every generated row is marked reviewer-needed; no row is activation-approved by generation.',
      'The packet reports duplicate English rows, missing French fields, mojibake, Cyrillic leakage outside source RU/UK fields, and reviewer queue shape.',
      'The packet keeps `readyForApply=false` and `mayModifyProductionAppFiles=false`.',
      'The script does not import React Native runtime modules.',
    ],
    blockedActions: [
      'Do not edit `app/flashcards/**` during this slice.',
      'Do not edit `scripts/gustav_readiness_gate.ts` during this slice.',
      'Do not write reviewer decisions.',
      'Do not mark generated flashcard translations activation-approved.',
      'Do not stage or commit unless the user explicitly asks.',
      'Do not touch production app files without separate exact app-write approval.',
    ],
    verificationCommands: [
      {
        label: 'Compile the next-slice generator',
        command: 'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts/gustav_flashcard_bundle_french_generation_packet.ts',
      },
      {
        label: 'Run the next-slice generator',
        command: 'npx tsx scripts/gustav_flashcard_bundle_french_generation_packet.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1',
      },
      {
        label: 'Re-run P8 after generation packet exists',
        command: 'npx tsx scripts/gustav_current_app_readiness_extension_packet.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1',
      },
    ],
    expectedTranslationRows: 120,
    expectedReviewerRows: 120,
    readyToStartNow: findings.filter((finding) => finding.severity === 'blocker').length === 0,
  };

  const productionAppFilesToTouch = selectedSlice.exactFilesToTouch.filter((file) => file.productionAppFile).length;
  if (productionAppFilesToTouch > 0) {
    addFinding(findings, 'blocker', 'selected_slice_touches_production_app_files', 'Selected slice unexpectedly touches production app files.');
  }
  if (selectedSlice.requiresExplicitAppWriteApproval) {
    addFinding(findings, 'blocker', 'selected_slice_requires_app_write_approval', 'Selected slice requires app-write approval but this decision packet must choose an audit-only next step.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  selectedSlice.readyToStartNow = blockers === 0 && b(expandedSummary, 'readyForP10DecisionPacket') && s(flashcardContract, 'status') === 'PASS';

  const report: Report = {
    schemaVersion: 'gustav-next-algorithm-expansion-slice-decision-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      expandedAlgorithmMasterManifest: rel(repoRoot, expandedManifestPath),
      currentAppReadinessExtensionPacket: rel(repoRoot, p8Path),
      flashcardBundleContractPacket: rel(repoRoot, flashcardContractPath),
    },
    summary: {
      recommendedSlices: 1,
      selectedSliceId: selectedSlice.id,
      selectedSliceMode: selectedSlice.mode,
      expectedTranslationRows: selectedSlice.expectedTranslationRows,
      requiresExplicitAppWriteApproval: selectedSlice.requiresExplicitAppWriteApproval,
      productionAppFilesToTouch,
      exactFilesToTouch: selectedSlice.exactFilesToTouch.length,
      readyToStartNow: selectedSlice.readyToStartNow,
      readyForTranslationsToBeginInPipeline: selectedSlice.readyToStartNow && n(flashcardSummary, 'contractCardRows') === selectedSlice.expectedTranslationRows,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    selectedSlice,
    rejectedAlternatives: [
      {
        id: 'P11_AI_DIALOG_FRENCH_GENERATION_PACKET',
        reason: 'Valid but prompt-sensitive. Do it after the simpler content-only flashcard bundle packet.',
      },
      {
        id: 'P11_COLLECTIBLE_TEXT_FRENCH_SIDECAR_PACKET',
        reason: 'Valid but tied to asset/sidecar activation rules and untracked asset policy. Keep it after a pure text-bundle translation slice.',
      },
      {
        id: 'P11_PRODUCTION_APPLY',
        reason: 'Rejected: reviewer decisions, apply blockers, dirty overlap approval, and explicit production app write approval are missing.',
      },
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      readinessGateModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV next algorithm expansion slice decision packet: ${report.status}`);
  console.log(`Selected slice: ${report.summary.selectedSliceId}`);
  console.log(`Mode: ${report.summary.selectedSliceMode}`);
  console.log(`Expected translation rows: ${report.summary.expectedTranslationRows}`);
  console.log(`Ready for translations to begin in pipeline: ${report.summary.readyForTranslationsToBeginInPipeline ? 'yes' : 'no'}`);
  console.log(`Production app files to touch: ${report.summary.productionAppFilesToTouch}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main();
