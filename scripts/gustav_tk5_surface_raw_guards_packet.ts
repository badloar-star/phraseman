import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD';

type GuardCoverage = {
  guardId: string;
  blockerText: string;
  coveredSurfaces: number;
  coveredBlockers: number;
  requiredContract: string;
  acceptanceGate: string;
};

type SurfaceSummary = {
  sourcePath: string;
  kind: string;
  domain: string;
  userFacing: boolean;
  targetStorageRecords: number;
  blockers: string[];
  tests: string[];
};

type Packet = {
  schemaVersion: 'gustav-tk5-surface-raw-guards-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    surfaceRouteInventory: string;
    targetKeySlicePacket: string;
    tk3P3StoreContractsPacket: string;
    tk4AchievementStatsCloudPolicyPacket: string;
  };
  summary: {
    surfaceInventoryStatus: string;
    surfaces: number;
    blockerSurfaces: number;
    blockers: number;
    targetSensitiveSurfaces: number;
    userFacingTargetSurfaces: number;
    devStudyTargetSurfaces: number;
    directStorageSurfaces: number;
    routeLikeWithoutStackRegistration: number;
    guardContracts: number;
    coveredBlockers: number;
    uncoveredBlockers: number;
    coveredBlockerSurfaces: number;
    coveredUserFacingTargetSurfaces: number;
    coveredDevStudyTargetSurfaces: number;
    tk3P3StoreContractsClean: boolean;
    tk4AchievementStatsCloudPolicyClean: boolean;
    tk5SurfaceGuardsClean: boolean;
    recommendedNextSafeSlice: string;
    canPassRDY060Now: boolean;
    canContinueArchitectureWork: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  guardCoverage: GuardCoverage[];
  blockerSurfaceSamples: SurfaceSummary[];
  requiredNextActions: string[];
  forbiddenActions: string[];
  notes: string[];
};

const GUARDS = [
  {
    guardId: 'TARGET_AWARE_STORE_API_GUARD',
    blockerText: 'Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.',
    requiredContract: 'Every target-sensitive surface must use approved store APIs from TK3/TK4 before production apply.',
    acceptanceGate: 'en and fr buckets render independently; fr must not hydrate from legacy English flat storage.',
  },
  {
    guardId: 'USER_FACING_STUDY_TARGET_CONTEXT_GUARD',
    blockerText: 'User-facing surface can display target-sensitive state without explicit production studyTarget context.',
    requiredContract: 'Every user-facing target surface must receive explicit production studyTarget and separate sourceLocale from studyTarget.',
    acceptanceGate: 'Switching sourceLocale ru/uk changes copy only and never changes studyTarget progress.',
  },
  {
    guardId: 'PRACTICE_ID_PREFIX_GUARD',
    blockerText: 'Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.',
    requiredContract: 'Practice, diagnosis and trainer ids must be prefixed by studyTarget while localized feedback remains under sourceLocale.',
    acceptanceGate: 'French Mistake Practice never reads English mistake state.',
  },
  {
    guardId: 'DEV_STUDY_TARGET_ISOLATION_GUARD',
    blockerText: 'Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.',
    requiredContract: 'Dev StudyTargetLang and Spanish gates must be isolated from production French activation.',
    acceptanceGate: 'French production activation cannot be enabled through Spanish/dev gates.',
  },
  {
    guardId: 'CLOUD_TARGET_BUCKET_RESTORE_GUARD',
    blockerText: 'Cloud/auth shell must restore and sync selected studyTarget buckets only.',
    requiredContract: 'Cloud restore/merge must use selected studyTarget buckets and keep legacy English compatibility isolated.',
    acceptanceGate: 'Cloud restore does not hydrate fr from legacy English payload.',
  },
  {
    guardId: 'ROUTE_REGISTRATION_GUARD',
    blockerText: 'Route-like file has target-sensitive state but is not registered in the root Stack inventory.',
    requiredContract: 'Route-like target surfaces must be registered or explicitly excluded before French activation.',
    acceptanceGate: 'Route inventory has no unregistered user-facing target route with target-sensitive state.',
  },
] as const;

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

function b(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function statusOf(value: Record<string, unknown>): string {
  return String(value.status || value.decision || '');
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV TK5 Surface/Raw Guards Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Surface inventory status: \`${packet.summary.surfaceInventoryStatus}\``,
    `- Surfaces: ${packet.summary.surfaces}`,
    `- Blocker surfaces: ${packet.summary.blockerSurfaces}`,
    `- Blockers: ${packet.summary.blockers}`,
    `- Target-sensitive surfaces: ${packet.summary.targetSensitiveSurfaces}`,
    `- User-facing target surfaces: ${packet.summary.userFacingTargetSurfaces}`,
    `- Dev StudyTarget surfaces: ${packet.summary.devStudyTargetSurfaces}`,
    `- Direct storage surfaces: ${packet.summary.directStorageSurfaces}`,
    `- Route-like without Stack registration: ${packet.summary.routeLikeWithoutStackRegistration}`,
    `- Guard contracts: ${packet.summary.guardContracts}`,
    `- Covered blockers: ${packet.summary.coveredBlockers}`,
    `- Uncovered blockers: ${packet.summary.uncoveredBlockers}`,
    `- Covered blocker surfaces: ${packet.summary.coveredBlockerSurfaces}`,
    `- Covered user-facing target surfaces: ${packet.summary.coveredUserFacingTargetSurfaces}`,
    `- Covered dev StudyTarget surfaces: ${packet.summary.coveredDevStudyTargetSurfaces}`,
    `- TK3 P3 store contracts clean: ${packet.summary.tk3P3StoreContractsClean ? 'yes' : 'no'}`,
    `- TK4 achievement/stats/cloud policy clean: ${packet.summary.tk4AchievementStatsCloudPolicyClean ? 'yes' : 'no'}`,
    `- TK5 surface guards clean: ${packet.summary.tk5SurfaceGuardsClean ? 'yes' : 'no'}`,
    `- Can pass RDY-060 now: ${packet.summary.canPassRDY060Now ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${packet.summary.recommendedNextSafeSlice}\``,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Guard Coverage',
    '',
  ];
  for (const guard of packet.guardCoverage) {
    lines.push(`### ${guard.guardId}`);
    lines.push('');
    lines.push(`- Covered surfaces: ${guard.coveredSurfaces}`);
    lines.push(`- Covered blockers: ${guard.coveredBlockers}`);
    lines.push(`- Required contract: ${guard.requiredContract}`);
    lines.push(`- Acceptance gate: ${guard.acceptanceGate}`);
    lines.push('');
  }
  lines.push('## Required Next Actions', '');
  for (const action of packet.requiredNextActions) lines.push(`- ${action}`);
  lines.push('', '## Forbidden Actions', '');
  for (const action of packet.forbiddenActions) lines.push(`- ${action}`);
  lines.push('', '## Notes', '');
  for (const note of packet.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_tk5_surface_raw_guards_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const surfacePath = path.join(auditDir, 'surface_route_inventory.json');
  const slicePath = path.join(auditDir, 'target_key_slice_packet.json');
  const tk3Path = path.join(auditDir, 'tk3_p3_store_contracts_packet.json');
  const tk4Path = path.join(auditDir, 'tk4_achievement_stats_cloud_policy_packet.json');

  const surface = readJson<Record<string, unknown>>(surfacePath);
  const slice = readJson<Record<string, unknown>>(slicePath);
  const tk3 = readJson<Record<string, unknown>>(tk3Path);
  const tk4 = readJson<Record<string, unknown>>(tk4Path);

  const surfaceSummary = object(surface.summary);
  const sliceSummary = object(slice.summary);
  const tk3Summary = object(tk3.summary);
  const tk4Summary = object(tk4.summary);
  const surfaces = arr<Record<string, unknown>>(surface.surfaces);
  const blockerSurfaces = surfaces.filter((entry) => entry.risk === 'blocker');

  const guardCoverage: GuardCoverage[] = GUARDS.map((guard) => {
    const matching = blockerSurfaces.filter((surfaceEntry) => (
      arr<string>(surfaceEntry.blockers).includes(guard.blockerText)
    ));
    return {
      guardId: guard.guardId,
      blockerText: guard.blockerText,
      coveredSurfaces: matching.length,
      coveredBlockers: matching.reduce((sum, entry) => (
        sum + arr<string>(entry.blockers).filter((blocker) => blocker === guard.blockerText).length
      ), 0),
      requiredContract: guard.requiredContract,
      acceptanceGate: guard.acceptanceGate,
    };
  });

  const coveredBlockers = guardCoverage.reduce((sum, guard) => sum + guard.coveredBlockers, 0);
  const blockerSurfaceSet = new Set<string>();
  for (const guard of GUARDS) {
    for (const surfaceEntry of blockerSurfaces.filter((entry) => arr<string>(entry.blockers).includes(guard.blockerText))) {
      blockerSurfaceSet.add(String(surfaceEntry.sourcePath || surfaceEntry.id || ''));
    }
  }
  const userFacingTargetSurfaceSet = new Set(
    blockerSurfaces
      .filter((entry) => entry.userFacing === true && n(object(entry.targetStorage), 'records') > 0)
      .map((entry) => String(entry.sourcePath || entry.id || '')),
  );
  const devStudyTargetSurfaceSet = new Set(
    blockerSurfaces
      .filter((entry) => object(entry.markers).usesDevStudyTargetLang === true)
      .map((entry) => String(entry.sourcePath || entry.id || '')),
  );
  const uncoveredBlockers = Math.max(0, n(surfaceSummary, 'blockers') - coveredBlockers);
  const tk3P3StoreContractsClean = b(sliceSummary, 'tk3P3StoreContractsClean') && b(tk3Summary, 'tk3ContractsClean');
  const tk4AchievementStatsCloudPolicyClean =
    b(sliceSummary, 'tk4AchievementStatsCloudPolicyClean') &&
    b(tk4Summary, 'tk4PolicyClean') &&
    b(tk4Summary, 'canPassRDY030Now');
  const tk5SurfaceGuardsClean =
    statusOf(surface) === 'HOLD' &&
    coveredBlockers === n(surfaceSummary, 'blockers') &&
    uncoveredBlockers === 0 &&
    blockerSurfaceSet.size === n(surfaceSummary, 'blockerSurfaces') &&
    userFacingTargetSurfaceSet.size === n(surfaceSummary, 'userFacingTargetSurfaces') &&
    devStudyTargetSurfaceSet.size === n(surfaceSummary, 'devStudyTargetSurfaces') &&
    tk3P3StoreContractsClean &&
    tk4AchievementStatsCloudPolicyClean;

  const packet: Packet = {
    schemaVersion: 'gustav-tk5-surface-raw-guards-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: tk5SurfaceGuardsClean ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      surfaceRouteInventory: artifactPath(repoRoot, surfacePath),
      targetKeySlicePacket: artifactPath(repoRoot, slicePath),
      tk3P3StoreContractsPacket: artifactPath(repoRoot, tk3Path),
      tk4AchievementStatsCloudPolicyPacket: artifactPath(repoRoot, tk4Path),
    },
    summary: {
      surfaceInventoryStatus: statusOf(surface),
      surfaces: n(surfaceSummary, 'surfaces'),
      blockerSurfaces: n(surfaceSummary, 'blockerSurfaces'),
      blockers: n(surfaceSummary, 'blockers'),
      targetSensitiveSurfaces: n(surfaceSummary, 'targetSensitiveSurfaces'),
      userFacingTargetSurfaces: n(surfaceSummary, 'userFacingTargetSurfaces'),
      devStudyTargetSurfaces: n(surfaceSummary, 'devStudyTargetSurfaces'),
      directStorageSurfaces: n(surfaceSummary, 'directStorageSurfaces'),
      routeLikeWithoutStackRegistration: n(surfaceSummary, 'routeLikeWithoutStackRegistration'),
      guardContracts: guardCoverage.length,
      coveredBlockers,
      uncoveredBlockers,
      coveredBlockerSurfaces: blockerSurfaceSet.size,
      coveredUserFacingTargetSurfaces: userFacingTargetSurfaceSet.size,
      coveredDevStudyTargetSurfaces: devStudyTargetSurfaceSet.size,
      tk3P3StoreContractsClean,
      tk4AchievementStatsCloudPolicyClean,
      tk5SurfaceGuardsClean,
      recommendedNextSafeSlice: tk5SurfaceGuardsClean ? 'TARGET_KEY_PLAN_FINAL_RECONCILIATION' : 'TK5_SURFACE_AND_RAW_GUARDS',
      canPassRDY060Now: tk5SurfaceGuardsClean,
      canContinueArchitectureWork: b(sliceSummary, 'canContinueArchitectureWork'),
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    guardCoverage,
    blockerSurfaceSamples: blockerSurfaces.slice(0, 20).map((entry) => ({
      sourcePath: String(entry.sourcePath || ''),
      kind: String(entry.kind || ''),
      domain: String(entry.domain || ''),
      userFacing: entry.userFacing === true,
      targetStorageRecords: n(object(entry.targetStorage), 'records'),
      blockers: arr<string>(entry.blockers).filter((item) => typeof item === 'string'),
      tests: arr<string>(entry.tests).filter((item) => typeof item === 'string'),
    })),
    requiredNextActions: tk5SurfaceGuardsClean
      ? [
          'Allow RDY-060 to use this packet as the explicit surface guard contract.',
          'Reconcile target_key_integration_plan against TK1-TK5 contract packets.',
          'Keep all production surface implementation locked behind exact future apply approval.',
        ]
      : [
          'Cover every surface inventory blocker with a guard contract.',
          'Ensure every user-facing target surface has a route/screen acceptance test.',
          'Keep TK5 in audit-only mode.',
        ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not edit routes or UI surfaces from this packet.',
      'Do not edit production app files from this packet.',
      'Do not create migration adapters from this packet.',
      'Do not start French generation.',
    ],
    notes: [
      'This packet is a surface guard contract, not implementation.',
      'It covers existing surface blockers with acceptance gates and future implementation requirements.',
      'French generation remains blocked by run verdict and target-key final reconciliation until readiness says GO.',
    ],
  };

  const outJson = path.join(auditDir, 'tk5_surface_raw_guards_packet.json');
  const outMd = path.join(auditDir, 'tk5_surface_raw_guards_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV TK5 surface/raw guards packet: ${packet.status}`);
  console.log(`Covered blockers: ${packet.summary.coveredBlockers}/${packet.summary.blockers}`);
  console.log(`Covered blocker surfaces: ${packet.summary.coveredBlockerSurfaces}/${packet.summary.blockerSurfaces}`);
  console.log(`Can pass RDY-060 now: ${packet.summary.canPassRDY060Now ? 'yes' : 'no'}`);
  console.log(`Recommended next safe slice: ${packet.summary.recommendedNextSafeSlice}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
