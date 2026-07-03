import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type SurfaceDomain = {
  id: string;
  count: number;
  parityRole: 'server_pack_content' | 'target_state_or_navigation' | 'ui_or_reward_global' | 'app_domain_content';
  requiresServerPackSurface: boolean;
  evidence: string[];
};

type Report = {
  schemaVersion: 'gustav-french-app-surface-parity-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    studyTarget: 'fr';
    currentSurfaceInventoryStatus: string;
    currentAppTsxNotInOldInventory: number;
    unclassifiedDirtyAppComponentTestFiles: number;
    devNavigationGuardStatus: string;
    devNavigationProbesPassed: number;
    devNavigationProbes: number;
    dirtySurfaceStateGuardStatus: string;
    dirtySurfaceRecords: number;
    remotePackSurfaces: number;
    requiredRemotePackSurfaces: number;
    currentAppDomains: number;
    challengeDailyArenaCoveredByNavigationGuard: boolean;
    challengeSurfaceGuardsReady: boolean;
    dailySurfaceGuardsReady: boolean;
    arenaSurfaceGuardsReady: boolean;
    challengeSurfaceProbes: number;
    dailySurfaceProbes: number;
    arenaSurfaceProbes: number;
    challengeDailyArenaRequiresExtraPackSurface: false;
    missingRemotePackSurfaces: string[];
    extraRemotePackSurfaces: string[];
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  remotePackSurfaces: string[];
  domains: SurfaceDomain[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_REMOTE_PACK_SURFACES = [
  'lesson',
  'lesson_intro',
  'quiz',
  'audio_metadata',
  'flashcard',
  'personal_practice',
];

const APP_DOMAIN_PARITY_ROLES: Record<string, SurfaceDomain['parityRole']> = {
  club_rewards_stats_weekly: 'target_state_or_navigation',
  source_locale_ui_copy: 'ui_or_reward_global',
  premium_loyalty_speaking: 'ui_or_reward_global',
  target_storage_and_cloud_sync: 'target_state_or_navigation',
  ai_dialog_scenarios: 'app_domain_content',
  collectible_reward_assets: 'ui_or_reward_global',
  personal_plan_content: 'app_domain_content',
};

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

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function countDomains(inventory: JsonObject): Record<string, number> {
  const rows = arr<JsonObject>(object(inventory.oldInventoryDelta).currentAppTsxNotInOldInventory);
  return rows.reduce<Record<string, number>>((acc, row) => {
    const domain = s(row, 'primaryDomain') || 'unclassified';
    acc[domain] = (acc[domain] ?? 0) + 1;
    return acc;
  }, {});
}

function readRemoteSurfaces(registrationSource: string): string[] {
  const match = registrationSource.match(/FRENCH_TARGET_REMOTE_SURFACES\s*=\s*\[([\s\S]*?)\]/m);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

export function buildFrenchAppSurfaceParity(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const currentSurfaceInventoryPath = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const devNavigationGuardPath = path.join(auditsDir, 'french_dev_surface_navigation_guard_v2_packet.json');
  const dirtySurfaceGuardPath = path.join(auditsDir, 'dirty_surface_state_guard_packet.json');
  const registrationPath = path.join(input.repoRoot, 'app/french_target_remote_registration.ts');

  const currentSurfaceInventory = readJsonOrEmpty(currentSurfaceInventoryPath);
  const devNavigationGuard = readJsonOrEmpty(devNavigationGuardPath);
  const dirtySurfaceGuard = readJsonOrEmpty(dirtySurfaceGuardPath);
  const currentSurfaceSummary = summaryOf(currentSurfaceInventory);
  const devNavigationSummary = summaryOf(devNavigationGuard);
  const dirtySurfaceSummary = summaryOf(dirtySurfaceGuard);
  const registrationSource = fs.existsSync(registrationPath) ? fs.readFileSync(registrationPath, 'utf8') : '';
  const remotePackSurfaces = readRemoteSurfaces(registrationSource);
  const domainCounts = countDomains(currentSurfaceInventory);
  const findings: Finding[] = [];

  for (const requiredPath of [currentSurfaceInventoryPath, devNavigationGuardPath, dirtySurfaceGuardPath, registrationPath]) {
    if (!fs.existsSync(requiredPath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'French app surface parity requires this input artifact.', rel(input.repoRoot, requiredPath));
    }
  }

  const missingRemotePackSurfaces = REQUIRED_REMOTE_PACK_SURFACES.filter((surface) => !remotePackSurfaces.includes(surface));
  const extraRemotePackSurfaces = remotePackSurfaces.filter((surface) => !REQUIRED_REMOTE_PACK_SURFACES.includes(surface));
  const unknownDomains = Object.keys(domainCounts).filter((domain) => !APP_DOMAIN_PARITY_ROLES[domain]);
  const challengeDailyArenaCoveredByNavigationGuard =
    s(devNavigationGuard, 'status') === 'PASS' &&
    b(devNavigationSummary, 'visibleSurfaceParityReady') &&
    b(devNavigationSummary, 'dailyTaskNavigationGuardsReady') &&
    b(devNavigationSummary, 'challengeSurfaceGuardsReady') &&
    b(devNavigationSummary, 'dailySurfaceGuardsReady') &&
    b(devNavigationSummary, 'arenaSurfaceGuardsReady') &&
    b(devNavigationSummary, 'compassNavigationGuardsReady') &&
    b(devNavigationSummary, 'trainerSessionSelfGatesReady') &&
    n(devNavigationSummary, 'probesPassed') === n(devNavigationSummary, 'probes') &&
    n(devNavigationSummary, 'probes') >= 80;

  if (s(currentSurfaceInventory, 'status') !== 'PASS') addFinding(findings, 'blocker', 'current_surface_inventory_not_pass', 'Current app surface inventory must be PASS.', rel(input.repoRoot, currentSurfaceInventoryPath));
  if (n(currentSurfaceSummary, 'unclassifiedDirtyAppComponentTestFiles') !== 0) addFinding(findings, 'blocker', 'unclassified_dirty_surfaces', 'French activation cannot proceed with unclassified dirty app/component/test surfaces.', rel(input.repoRoot, currentSurfaceInventoryPath));
  if (missingRemotePackSurfaces.length > 0) addFinding(findings, 'blocker', 'missing_remote_pack_surfaces', `Missing French remote pack surfaces: ${missingRemotePackSurfaces.join(', ')}.`, rel(input.repoRoot, registrationPath));
  if (extraRemotePackSurfaces.length > 0) addFinding(findings, 'blocker', 'extra_remote_pack_surfaces', `Unexpected French remote pack surfaces: ${extraRemotePackSurfaces.join(', ')}.`, rel(input.repoRoot, registrationPath));
  if (unknownDomains.length > 0) addFinding(findings, 'blocker', 'unknown_app_surface_domains', `Unknown current app surface domains: ${unknownDomains.join(', ')}.`, rel(input.repoRoot, currentSurfaceInventoryPath));
  if (!challengeDailyArenaCoveredByNavigationGuard) addFinding(findings, 'blocker', 'challenge_daily_arena_navigation_not_guarded', 'Challenges/daily/arena-like French dev surfaces must be visible but fail-closed/target-gated by navigation guard.', rel(input.repoRoot, devNavigationGuardPath));
  if (!b(devNavigationSummary, 'challengeSurfaceGuardsReady')) addFinding(findings, 'blocker', 'challenge_surface_guards_not_ready', 'French challenge surfaces must be explicitly visible/source-gated in the navigation guard.', rel(input.repoRoot, devNavigationGuardPath));
  if (!b(devNavigationSummary, 'dailySurfaceGuardsReady')) addFinding(findings, 'blocker', 'daily_surface_guards_not_ready', 'French daily surfaces must be explicitly visible/source-gated in the navigation guard.', rel(input.repoRoot, devNavigationGuardPath));
  if (!b(devNavigationSummary, 'arenaSurfaceGuardsReady')) addFinding(findings, 'blocker', 'arena_surface_guards_not_ready', 'French arena surfaces must be explicitly self-gated in the navigation guard.', rel(input.repoRoot, devNavigationGuardPath));
  if (s(dirtySurfaceGuard, 'status') !== 'PASS' || !b(dirtySurfaceSummary, 'readyForP8ReadinessExtension')) {
    addFinding(findings, 'blocker', 'dirty_surface_state_guard_not_ready', 'Dirty stateful surfaces must be classified and guarded before French activation.', rel(input.repoRoot, dirtySurfaceGuardPath));
  }

  const domains: SurfaceDomain[] = Object.entries(domainCounts).map(([id, count]) => ({
    id,
    count,
    parityRole: APP_DOMAIN_PARITY_ROLES[id] ?? 'target_state_or_navigation',
    requiresServerPackSurface: false,
    evidence: [
      `currentAppTsxNotInOldInventory=${count}`,
      `role=${APP_DOMAIN_PARITY_ROLES[id] ?? 'unknown'}`,
    ],
  }));
  domains.unshift({
    id: 'course_pack_runtime_surfaces',
    count: remotePackSurfaces.length,
    parityRole: 'server_pack_content',
    requiresServerPackSurface: true,
    evidence: remotePackSurfaces,
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  return {
    schemaVersion: 'gustav-french-app-surface-parity-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    summary: {
      targetLocale: 'fr',
      studyTarget: 'fr',
      currentSurfaceInventoryStatus: s(currentSurfaceInventory, 'status'),
      currentAppTsxNotInOldInventory: n(currentSurfaceSummary, 'currentAppTsxNotInOldInventory'),
      unclassifiedDirtyAppComponentTestFiles: n(currentSurfaceSummary, 'unclassifiedDirtyAppComponentTestFiles'),
      devNavigationGuardStatus: s(devNavigationGuard, 'status'),
      devNavigationProbesPassed: n(devNavigationSummary, 'probesPassed'),
      devNavigationProbes: n(devNavigationSummary, 'probes'),
      dirtySurfaceStateGuardStatus: s(dirtySurfaceGuard, 'status'),
      dirtySurfaceRecords: n(dirtySurfaceSummary, 'surfaceRecords'),
      remotePackSurfaces: remotePackSurfaces.length,
      requiredRemotePackSurfaces: REQUIRED_REMOTE_PACK_SURFACES.length,
      currentAppDomains: Object.keys(domainCounts).length,
      challengeDailyArenaCoveredByNavigationGuard,
      challengeSurfaceGuardsReady: b(devNavigationSummary, 'challengeSurfaceGuardsReady'),
      dailySurfaceGuardsReady: b(devNavigationSummary, 'dailySurfaceGuardsReady'),
      arenaSurfaceGuardsReady: b(devNavigationSummary, 'arenaSurfaceGuardsReady'),
      challengeSurfaceProbes: n(devNavigationSummary, 'challengeSurfaceProbes'),
      dailySurfaceProbes: n(devNavigationSummary, 'dailySurfaceProbes'),
      arenaSurfaceProbes: n(devNavigationSummary, 'arenaSurfaceProbes'),
      challengeDailyArenaRequiresExtraPackSurface: false,
      missingRemotePackSurfaces,
      extraRemotePackSurfaces,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    inputs: {
      currentAppSurfaceDeltaInventory: rel(input.repoRoot, currentSurfaceInventoryPath),
      frenchDevSurfaceNavigationGuardV2Packet: rel(input.repoRoot, devNavigationGuardPath),
      dirtySurfaceStateGuardPacket: rel(input.repoRoot, dirtySurfaceGuardPath),
      frenchTargetRemoteRegistration: rel(input.repoRoot, registrationPath),
    },
    outputs: {},
    remotePackSurfaces,
    domains,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French App Surface Parity V2',
    '',
    `- Status: ${report.status}`,
    `- Remote pack surfaces: ${report.summary.remotePackSurfaces}/${report.summary.requiredRemotePackSurfaces}`,
    `- Current app domains: ${report.summary.currentAppDomains}`,
    `- Dev navigation probes: ${report.summary.devNavigationProbesPassed}/${report.summary.devNavigationProbes}`,
    `- Challenges/daily/arena covered by navigation guard: ${report.summary.challengeDailyArenaCoveredByNavigationGuard ? 'yes' : 'no'}`,
    `- Challenge/daily/arena explicit guards: ${report.summary.challengeSurfaceGuardsReady ? 'yes' : 'no'}/${report.summary.dailySurfaceGuardsReady ? 'yes' : 'no'}/${report.summary.arenaSurfaceGuardsReady ? 'yes' : 'no'}`,
    `- Challenge/daily/arena explicit probes: ${report.summary.challengeSurfaceProbes}/${report.summary.dailySurfaceProbes}/${report.summary.arenaSurfaceProbes}`,
    `- Challenges/daily/arena require extra pack surface: ${report.summary.challengeDailyArenaRequiresExtraPackSurface ? 'yes' : 'no'}`,
    '',
    '## Domains',
    '',
  ];
  for (const domain of report.domains) {
    lines.push(`- ${domain.id}: ${domain.count}, role ${domain.parityRole}, requires server pack surface ${domain.requiresServerPackSurface ? 'yes' : 'no'}`);
  }
  lines.push('', '## Remote Pack Surfaces', '', ...report.remotePackSurfaces.map((surface) => `- ${surface}`), '', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- No app writes, no server upload, no runtime enablement, no activation.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_app_surface_parity_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_app_surface_parity_v2_packet.md');
  const report = buildFrenchAppSurfaceParity({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French app surface parity V2 packet: ${report.status}`);
  console.log(`Remote pack surfaces: ${report.summary.remotePackSurfaces}/${report.summary.requiredRemotePackSurfaces}`);
  console.log(`Dev navigation probes: ${report.summary.devNavigationProbesPassed}/${report.summary.devNavigationProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
