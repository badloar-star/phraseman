import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';
type SurfaceClassification = 'content-only' | 'ui-only' | 'global-reward' | 'target-sensitive' | 'mixed';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type MarkerCounts = {
  asyncStorage: number;
  targetStorageKey: number;
  useStudyTarget: number;
  studyTarget: number;
  sourceLocaleUi: number;
  premiumEntitlement: number;
  globalReward: number;
  cloudSync: number;
  analytics: number;
  targetContent: number;
  router: number;
};

type Evidence = {
  line: number;
  marker: keyof MarkerCounts;
  text: string;
};

type StorageCall = {
  line: number;
  method: string;
  expression: string;
  targetAware: boolean;
};

type SurfaceConfig = {
  path: string;
  title: string;
  declaredClassification: SurfaceClassification;
  primaryDomain: string;
  secondaryDomains: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiredTestsBeforeFrenchActivation: string[];
  guardNotes: string[];
};

type P1SurfaceDelta = {
  status?: string;
  dirtyFileDomainMap?: Array<{
    path: string;
    primaryDomain?: string;
    secondaryDomains?: string[];
    markerCounts?: Record<string, number>;
  }>;
};

type P2DomainRegistry = {
  status?: string;
  summary?: {
    readyForP3P7Contracts?: boolean;
  };
  registry?: Array<{
    id: string;
    p1DirtyFiles?: string[];
    p1NewSurfaces?: string[];
  }>;
};

type SurfaceRecord = {
  path: string;
  title: string;
  fileExists: boolean;
  declaredClassification: SurfaceClassification;
  observedClassification: SurfaceClassification;
  effectiveClassification: SurfaceClassification;
  primaryDomain: string;
  p1PrimaryDomain: string | null;
  p1SecondaryDomains: string[];
  p2DomainHasSurface: boolean;
  secondaryDomains: string[];
  riskLevel: 'low' | 'medium' | 'high';
  markerCounts: MarkerCounts;
  storageCalls: StorageCall[];
  cloudSyncLines: Evidence[];
  evidence: Evidence[];
  stateGuardRisks: string[];
  requiredTestsBeforeFrenchActivation: string[];
  guardNotes: string[];
};

type ContractGate = {
  id: string;
  status: Status;
  description: string;
  blockers: string[];
};

type Report = {
  schemaVersion: 'gustav-dirty-surface-state-guard-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    p1SurfaceDeltaInventory: string;
    p2DomainRegistryPacket: string;
    sourceFiles: string[];
  };
  summary: {
    expectedSurfaces: number;
    surfaceRecords: number;
    missingSurfaceFiles: number;
    p1MappedSurfaces: number;
    p2MappedSurfaces: number;
    classifiedSurfaces: number;
    classificationCounts: Record<SurfaceClassification, number>;
    asyncStorageSurfaces: number;
    cloudSyncSurfaces: number;
    targetSensitiveOrMixedSurfaces: number;
    globalRewardSurfaces: number;
    sourceLocaleUiSurfaces: number;
    storageCalls: number;
    targetAwareStorageCalls: number;
    rawGlobalStorageCalls: number;
    requiredTestsBeforeFrenchActivation: number;
    blockers: number;
    warnings: number;
    readyForP8ReadinessExtension: boolean;
    readyForFrenchSurfaceActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  surfaces: SurfaceRecord[];
  sourceLocalePolicy: string[];
  studyTargetPolicy: string[];
  activationRequirements: string[];
  contractGates: ContractGate[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    dirtySurfaceSourceModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

const SURFACES: SurfaceConfig[] = [
  {
    path: 'app/lesson1.tsx',
    title: 'Lesson runtime screen',
    declaredClassification: 'mixed',
    primaryDomain: 'lesson_runtime',
    secondaryDomains: ['target_storage_and_cloud_sync'],
    riskLevel: 'high',
    requiredTestsBeforeFrenchActivation: [
      'Lesson progress, cell index, phrase order, intro shown, and error replay keys stay isolated by studyTarget.',
      'Switching source UI language does not change the selected studyTarget or hydrate another target bucket.',
      'French lesson runtime blocks playback when French lesson rows/support content are unavailable.',
      'SpeakingPanel host passes targetText and recognition locale from the selected studyTarget.',
    ],
    guardNotes: [
      'This is a mixed runtime surface: lesson target content, UI locale labels, speaking mode, XP, hints, and storage all meet here.',
      'French activation must not reuse legacy English lesson progress or fallback phrase rows.',
    ],
  },
  {
    path: 'app/club_screen.tsx',
    title: 'Club, league, rewards, and chest screen',
    declaredClassification: 'mixed',
    primaryDomain: 'club_rewards_stats_weekly',
    secondaryDomains: ['target_storage_and_cloud_sync', 'premium_loyalty_speaking'],
    riskLevel: 'high',
    requiredTestsBeforeFrenchActivation: [
      'Global XP, shards, chest, group boost, and league reward state stay global unless an explicit target rule says otherwise.',
      'League chest contribution and any studyTarget payload use the selected studyTarget deliberately.',
      'Source locale copy changes do not reset league, shards, gift, or XP state.',
      'Cloud sync and local refresh timestamps remain compatible with target-aware progress policy.',
    ],
    guardNotes: [
      'Reward economics are global, while some contribution payloads mention studyTarget.',
      'French target activation must not split or duplicate global rewards accidentally.',
    ],
  },
  {
    path: 'app/stats_insights_client.ts',
    title: 'Stats insights client',
    declaredClassification: 'mixed',
    primaryDomain: 'club_rewards_stats_weekly',
    secondaryDomains: ['target_storage_and_cloud_sync', 'premium_loyalty_speaking'],
    riskLevel: 'high',
    requiredTestsBeforeFrenchActivation: [
      'statsInsightsStorageKey namespaces cache by studyTarget.',
      'Cached insight language follows source UI lang and is invalidated when lang differs.',
      'Premium/free generation window is independent of sourceLocale and studyTarget content rows.',
      'Local fallback text cannot be mistaken for generated French lesson content.',
    ],
    guardNotes: [
      'Client stores localized microcopy and target-scoped stats insight cache.',
      'The cache is target-sensitive but the visible text language is source-locale UI copy.',
    ],
  },
  {
    path: 'app/weekly_review_client.ts',
    title: 'Weekly review client',
    declaredClassification: 'mixed',
    primaryDomain: 'club_rewards_stats_weekly',
    secondaryDomains: ['target_storage_and_cloud_sync'],
    riskLevel: 'high',
    requiredTestsBeforeFrenchActivation: [
      'weeklyReviewStorageKey namespaces review cache by studyTarget.',
      'Weekly review briefing uses the selected studyTarget for mistakes and recommendation context.',
      'Stored review language follows source UI lang and does not leak across source locale switches.',
      'Premium/free refresh window stays independent from target-language content generation.',
    ],
    guardNotes: [
      'Weekly review mixes target-sensitive mistake data with localized UI prose.',
      'French activation must not hydrate English weekly review data for French study target.',
    ],
  },
  {
    path: 'components/DialogsTabContent.tsx',
    title: 'Dialogs tab content',
    declaredClassification: 'mixed',
    primaryDomain: 'ai_dialog_scenarios',
    secondaryDomains: ['premium_loyalty_speaking'],
    riskLevel: 'high',
    requiredTestsBeforeFrenchActivation: [
      'Lessons-tab dialog unlock state loads by studyTarget.',
      'Dialog completion/global trial policy is explicitly accepted as global or made target-aware.',
      'Paywall routing and analytics do not mutate studyTarget.',
      'Localized dialog labels render from source UI lang without changing learner interaction target.',
    ],
    guardNotes: [
      'Dialog surface combines source-locale labels, premium locks, free-trial state, route params, XP level, and studyTarget-aware lesson tab state.',
      'French dialog behavior requires target-language prompt/session contract before activation.',
    ],
  },
  {
    path: 'components/IntroFullAccessModal.tsx',
    title: 'Intro full-access modal',
    declaredClassification: 'global-reward',
    primaryDomain: 'premium_loyalty_speaking',
    secondaryDomains: ['source_locale_ui_copy'],
    riskLevel: 'medium',
    requiredTestsBeforeFrenchActivation: [
      'Full-access modal copy switches by source UI lang only.',
      'Primary and secondary callbacks do not change studyTarget.',
      'Analytics events are source-locale safe and carry no target content.',
      'CTA contrast follows the green/lime foreground contrast project rule when those surfaces are used.',
    ],
    guardNotes: [
      'This component is a reward/access UI shell; entitlement mutation is owned by the host callback, not by the modal itself.',
      'French translation work here is UI source-locale copy, not study target content.',
    ],
  },
  {
    path: 'components/LoyaltyGiftModal.tsx',
    title: 'Loyalty gift modal',
    declaredClassification: 'global-reward',
    primaryDomain: 'premium_loyalty_speaking',
    secondaryDomains: ['source_locale_ui_copy'],
    riskLevel: 'medium',
    requiredTestsBeforeFrenchActivation: [
      'Gift/announce variants render from source UI lang only.',
      'Gift claim callback is global entitlement logic and does not depend on studyTarget.',
      'Ideas/referral navigation callback does not change target-language progress.',
      'Localized copy additions do not remove existing RU/UK/ES/PT-BR/VI/ID/TR/PL source-locale coverage.',
    ],
    guardNotes: [
      'The modal is global reward UI plus source-locale copy.',
      'It should not become a target-language content generator.',
    ],
  },
  {
    path: 'components/SpeakingPanel.tsx',
    title: 'Speaking panel',
    declaredClassification: 'target-sensitive',
    primaryDomain: 'premium_loyalty_speaking',
    secondaryDomains: [],
    riskLevel: 'high',
    requiredTestsBeforeFrenchActivation: [
      'Host passes targetText from the active studyTarget phrase source.',
      'recognitionLocale follows selected studyTarget and defaults only when English is selected.',
      'Scoring tokenization uses the active targetText and not source UI labels.',
      'Preview mode remains inert and never touches native speech or storage.',
    ],
    guardNotes: [
      'SpeakingPanel owns recognition/scoring UI but not premium gating or storage.',
      'French speaking activation needs host-level targetText and recognition locale proof.',
    ],
  },
];

const MARKER_PATTERNS: Array<[keyof MarkerCounts, RegExp]> = [
  ['asyncStorage', /AsyncStorage\b/g],
  ['targetStorageKey', /lessonProgressKey|lessonSessionKey|statsInsightsStorageKey|weeklyReviewStorageKey|target_storage_keys|RuntimeStudyTarget/g],
  ['useStudyTarget', /useStudyTarget\s*\(/g],
  ['studyTarget', /\bstudyTarget\b|studyTargetRef|StudyTargetLang|study_target/g],
  ['sourceLocaleUi', /\buseLang\s*\(|\btriLang\s*\(|\bsourceLocale\b|\bsourceLocales\b|\bCOPY\b|\blang\b/g],
  ['premiumEntitlement', /premium|paywall|subscription|entitlement|vip|full[-_ ]?access|hasPremiumAccess/gi],
  ['globalReward', /user_total_xp|registerXP|\bXP\b|\bxp\b|shard|gift|loyalty|league|chest|reward|boost|access/gi],
  ['cloudSync', /cloud_sync|syncToCloud|ensureAnonUser|callable|httpsCallable|firebase|functions/gi],
  ['analytics', /\btrackEvent\b|analytics|logMistake|safeProgressEventPart/gi],
  ['targetContent', /phraseAnswerDisplayLine|lessonPhraseMeaningForLang|getPhraseTokens|safeGetDistracts|ttsLocaleForStudyTarget|targetText|recognitionLocale|speakingTargetTokens|scorePlanPronunciationTranscript|buildWeeklyReviewBriefing|buildLocalWeeklyReview|buildLocalStatsInsights|briefing\.studyTarget|scenarioId/gi],
  ['router', /\brouter\.(push|replace|back|dismiss|dismissTo)|safeRouterBack|href=/g],
];

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

function zeroMarkers(): MarkerCounts {
  return {
    asyncStorage: 0,
    targetStorageKey: 0,
    useStudyTarget: 0,
    studyTarget: 0,
    sourceLocaleUi: 0,
    premiumEntitlement: 0,
    globalReward: 0,
    cloudSync: 0,
    analytics: 0,
    targetContent: 0,
    router: 0,
  };
}

function countRegex(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function markerCountsForText(text: string): MarkerCounts {
  const counts = zeroMarkers();
  for (const [name, re] of MARKER_PATTERNS) counts[name] = countRegex(text, re);
  return counts;
}

function evidenceForText(text: string, maxRows = 8): Evidence[] {
  const evidence: Evidence[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    for (const [marker, re] of MARKER_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        evidence.push({ line: i + 1, marker, text: line.trim().slice(0, 220) });
        break;
      }
    }
    if (evidence.length >= maxRows) break;
  }
  return evidence;
}

function linesForMarker(text: string, marker: keyof MarkerCounts, maxRows = 8): Evidence[] {
  const pattern = MARKER_PATTERNS.find(([name]) => name === marker)?.[1];
  if (!pattern) return [];
  const out: Evidence[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    pattern.lastIndex = 0;
    if (pattern.test(line)) out.push({ line: i + 1, marker, text: line.trim().slice(0, 220) });
    if (out.length >= maxRows) break;
  }
  return out;
}

function observeClassification(counts: MarkerCounts): SurfaceClassification {
  const target = counts.useStudyTarget + counts.studyTarget + counts.targetStorageKey + counts.targetContent > 0;
  const global = counts.globalReward + counts.premiumEntitlement > 0;
  const sourceUi = counts.sourceLocaleUi > 0;
  const storageOrCloud = counts.asyncStorage + counts.cloudSync > 0;

  if (target && (global || sourceUi || storageOrCloud)) return 'mixed';
  if (target) return 'target-sensitive';
  if (global) return 'global-reward';
  if (sourceUi) return 'ui-only';
  return 'content-only';
}

function extractStorageCalls(text: string): StorageCall[] {
  const calls: StorageCall[] = [];
  const lines = text.split(/\r?\n/);
  const re = /AsyncStorage\.(getItem|setItem|multiGet|multiSet|removeItem|multiRemove)\s*\((.*)/;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const match = re.exec(line);
    if (!match) continue;
    const expression = (match[2] ?? '').trim().slice(0, 180);
    const targetAware = /lessonProgressKey|lessonSessionKey|statsInsightsStorageKey|weeklyReviewStorageKey|studyTarget|StudyTarget|target/.test(expression);
    calls.push({
      line: i + 1,
      method: match[1] ?? 'unknown',
      expression,
      targetAware,
    });
  }
  return calls;
}

function risksForSurface(config: SurfaceConfig, counts: MarkerCounts, storageCalls: StorageCall[], cloudSyncLines: Evidence[]): string[] {
  const risks: string[] = [];
  const targetLike = config.declaredClassification === 'target-sensitive' || config.declaredClassification === 'mixed';
  const rawStorageCalls = storageCalls.filter((call) => !call.targetAware).length;

  if (targetLike && storageCalls.length > 0) {
    risks.push(`AsyncStorage is present; ${storageCalls.filter((call) => call.targetAware).length}/${storageCalls.length} detected calls are target-aware by local pattern.`);
  }
  if (targetLike && rawStorageCalls > 0) {
    risks.push('Raw/global storage keys appear in a target-sensitive surface and need explicit global-vs-target policy before French activation.');
  }
  if (cloudSyncLines.length > 0) {
    risks.push('Cloud sync or Firebase-like references are present and need target/global payload policy before app apply.');
  }
  if (counts.sourceLocaleUi > 0) {
    risks.push('Visible copy follows source UI language and must stay separate from studyTarget content.');
  }
  if (counts.premiumEntitlement > 0 || counts.globalReward > 0) {
    risks.push('Premium, reward, XP, shard, gift, or access state appears and must remain global unless a target-scoped rule is explicitly added.');
  }
  if (counts.targetContent > 0 || counts.studyTarget > 0 || counts.useStudyTarget > 0) {
    risks.push('Target-sensitive content or state is present and must not fall back from English into French.');
  }
  if (risks.length === 0) risks.push('No target/storage/global reward marker found; keep as source-locale or content-only surface.');
  return risks;
}

function gate(id: string, description: string, blockers: string[]): ContractGate {
  return {
    id,
    description,
    blockers,
    status: blockers.length > 0 ? 'BLOCK' : 'PASS',
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Dirty Surface State Guard Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Expected surfaces: ${report.summary.expectedSurfaces}`,
    `- Surface records: ${report.summary.surfaceRecords}`,
    `- Missing surface files: ${report.summary.missingSurfaceFiles}`,
    `- P1 mapped surfaces: ${report.summary.p1MappedSurfaces}`,
    `- P2 mapped surfaces: ${report.summary.p2MappedSurfaces}`,
    `- Classified surfaces: ${report.summary.classifiedSurfaces}`,
    `- AsyncStorage surfaces: ${report.summary.asyncStorageSurfaces}`,
    `- Cloud-sync surfaces: ${report.summary.cloudSyncSurfaces}`,
    `- Target-sensitive or mixed surfaces: ${report.summary.targetSensitiveOrMixedSurfaces}`,
    `- Global reward surfaces: ${report.summary.globalRewardSurfaces}`,
    `- Source-locale UI surfaces: ${report.summary.sourceLocaleUiSurfaces}`,
    `- Storage calls: ${report.summary.storageCalls}`,
    `- Target-aware storage calls: ${report.summary.targetAwareStorageCalls}`,
    `- Raw/global storage calls: ${report.summary.rawGlobalStorageCalls}`,
    `- Required tests before French activation: ${report.summary.requiredTestsBeforeFrenchActivation}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`,
    `- Ready for French surface activation: ${report.summary.readyForFrenchSurfaceActivation ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Classification Counts',
    '',
  ];

  for (const [classification, count] of Object.entries(report.summary.classificationCounts)) {
    lines.push(`- \`${classification}\`: ${count}`);
  }

  lines.push('', '## Surfaces', '');
  for (const surface of report.surfaces) {
    const secondary = surface.secondaryDomains.length > 0 ? `; secondary=${surface.secondaryDomains.join(',')}` : '';
    lines.push(`### ${surface.path}`);
    lines.push('');
    lines.push(`- Title: ${surface.title}`);
    lines.push(`- Classification: \`${surface.effectiveClassification}\` (observed \`${surface.observedClassification}\`)`);
    lines.push(`- Domain: \`${surface.primaryDomain}\`${secondary}`);
    lines.push(`- P1 domain: \`${surface.p1PrimaryDomain ?? 'missing'}\``);
    lines.push(`- P2 domain has surface: ${surface.p2DomainHasSurface ? 'yes' : 'no'}`);
    lines.push(`- Risk level: ${surface.riskLevel}`);
    lines.push(`- AsyncStorage calls: ${surface.storageCalls.length}`);
    lines.push(`- Cloud-sync evidence lines: ${surface.cloudSyncLines.length}`);
    lines.push('- State guard risks:');
    for (const risk of surface.stateGuardRisks) lines.push(`  - ${risk}`);
    lines.push('- Required tests before French activation:');
    for (const test of surface.requiredTestsBeforeFrenchActivation) lines.push(`  - ${test}`);
    lines.push('');
  }

  lines.push('## Contract Gates', '');
  for (const item of report.contractGates) {
    lines.push(`- \`${item.status}\` \`${item.id}\`: ${item.description}`);
    for (const blocker of item.blockers) lines.push(`  - ${blocker}`);
  }

  lines.push('', '## Source-Locale Policy', '');
  for (const item of report.sourceLocalePolicy) lines.push(`- ${item}`);
  lines.push('', '## Study-Target Policy', '');
  for (const item of report.studyTargetPolicy) lines.push(`- ${item}`);
  lines.push('', '## Activation Requirements', '');
  for (const item of report.activationRequirements) lines.push(`- ${item}`);

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
    '- This packet is audit-only.',
    '- It does not modify production app files.',
    '- It does not modify dirty surface source files.',
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
    console.error('Usage: npx tsx scripts/gustav_dirty_surface_state_guard_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p1Path = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const p2Path = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(p1Path)) {
    addFinding(findings, 'blocker', 'missing_p1_surface_delta_inventory', 'P6 requires the P1 current app surface delta inventory.', rel(repoRoot, p1Path));
  }
  if (!fs.existsSync(p2Path)) {
    addFinding(findings, 'blocker', 'missing_p2_domain_registry', 'P6 requires the P2 algorithm domain registry packet.', rel(repoRoot, p2Path));
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    console.error(findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n'));
    process.exit(1);
  }

  const p1 = readJson<P1SurfaceDelta>(p1Path);
  const p2 = readJson<P2DomainRegistry>(p2Path);
  if (p1.status !== 'PASS') {
    addFinding(findings, 'blocker', 'p1_not_pass', 'P1 surface delta inventory is not PASS.', rel(repoRoot, p1Path));
  }
  if (p2.status !== 'PASS' || !p2.summary?.readyForP3P7Contracts) {
    addFinding(findings, 'blocker', 'p2_not_ready_for_p6', 'P2 registry is not marked ready for P3-P7 contracts.', rel(repoRoot, p2Path));
  }

  const p1Map = new Map((p1.dirtyFileDomainMap ?? []).map((record) => [record.path, record]));
  const p2DomainMap = new Map((p2.registry ?? []).map((record) => [record.id, record]));

  const surfaces: SurfaceRecord[] = SURFACES.map((config) => {
    const fullPath = path.resolve(repoRoot, config.path);
    const fileExists = fs.existsSync(fullPath);
    const text = fileExists ? fs.readFileSync(fullPath, 'utf8') : '';
    const markerCounts = markerCountsForText(text);
    const storageCalls = extractStorageCalls(text);
    const cloudSyncLines = linesForMarker(text, 'cloudSync', 10);
    const p1Record = p1Map.get(config.path);
    const p2Domain = p2DomainMap.get(config.primaryDomain);
    const p2DomainHasSurface = !!p2Domain && (p2Domain.p1DirtyFiles ?? []).includes(config.path);
    const observedClassification = observeClassification(markerCounts);
    const record: SurfaceRecord = {
      path: config.path,
      title: config.title,
      fileExists,
      declaredClassification: config.declaredClassification,
      observedClassification,
      effectiveClassification: config.declaredClassification,
      primaryDomain: config.primaryDomain,
      p1PrimaryDomain: p1Record?.primaryDomain ?? null,
      p1SecondaryDomains: p1Record?.secondaryDomains ?? [],
      p2DomainHasSurface,
      secondaryDomains: config.secondaryDomains,
      riskLevel: config.riskLevel,
      markerCounts,
      storageCalls,
      cloudSyncLines,
      evidence: evidenceForText(text, 10),
      stateGuardRisks: risksForSurface(config, markerCounts, storageCalls, cloudSyncLines),
      requiredTestsBeforeFrenchActivation: config.requiredTestsBeforeFrenchActivation,
      guardNotes: config.guardNotes,
    };

    if (!fileExists) {
      addFinding(findings, 'blocker', 'missing_dirty_surface_file', 'Expected P6 dirty surface file is missing.', config.path);
    }
    if (!p1Record) {
      addFinding(findings, 'blocker', 'dirty_surface_missing_from_p1', 'Expected P6 surface is not present in P1 dirty file domain map.', config.path);
    } else if (p1Record.primaryDomain !== config.primaryDomain) {
      addFinding(findings, 'blocker', 'dirty_surface_p1_domain_mismatch', `Expected P1 primary domain ${config.primaryDomain} but found ${p1Record.primaryDomain}.`, config.path);
    }
    if (!p2DomainHasSurface) {
      addFinding(findings, 'blocker', 'dirty_surface_missing_from_p2_domain', 'Expected P6 surface is not registered in its P2 primary domain.', config.path);
    }
    if (observedClassification !== config.declaredClassification) {
      addFinding(
        findings,
        'info',
        'observed_surface_classification_differs',
        `Declared classification ${config.declaredClassification}; observed marker-based classification ${observedClassification}. Declared value is used for guard policy.`,
        config.path,
      );
    }
    if (storageCalls.length > 0 || cloudSyncLines.length > 0) {
      addFinding(findings, 'info', 'surface_storage_or_cloud_risk_documented', 'Storage/cloud risk is documented in the P6 state guard record.', config.path);
    }
    return record;
  });

  const classificationCounts: Record<SurfaceClassification, number> = {
    'content-only': 0,
    'ui-only': 0,
    'global-reward': 0,
    'target-sensitive': 0,
    mixed: 0,
  };
  for (const surface of surfaces) classificationCounts[surface.effectiveClassification] += 1;

  const exactScopeBlockers = SURFACES
    .filter((config) => !surfaces.find((surface) => surface.path === config.path && surface.fileExists))
    .map((config) => `${config.path} is missing.`);
  const p1p2Blockers = surfaces
    .filter((surface) => !surface.p1PrimaryDomain || !surface.p2DomainHasSurface)
    .map((surface) => `${surface.path} is not fully linked through P1/P2.`);
  const classificationBlockers = surfaces
    .filter((surface) => !surface.effectiveClassification)
    .map((surface) => `${surface.path} has no classification.`);
  const testBlockers = surfaces
    .filter((surface) => surface.requiredTestsBeforeFrenchActivation.length === 0)
    .map((surface) => `${surface.path} has no required activation tests.`);

  const contractGates = [
    gate('exact_scope_covered', 'All eight P6 dirty surfaces must exist and be scanned.', exactScopeBlockers),
    gate('p1_p2_domain_linked', 'Every P6 surface must be mapped by P1 and registered in its P2 primary domain.', p1p2Blockers),
    gate('classification_complete', 'Every P6 surface must have a content/UI/global/target/mixed classification.', classificationBlockers),
    gate('storage_cloud_risks_documented', 'AsyncStorage/cloud-sync risks must be captured without source edits.', surfaces
      .filter((surface) => (surface.markerCounts.asyncStorage > 0 || surface.markerCounts.cloudSync > 0) && surface.stateGuardRisks.length === 0)
      .map((surface) => `${surface.path} has storage/cloud markers but no risk notes.`)),
    gate('required_tests_listed', 'Every P6 surface must declare tests required before French activation.', testBlockers),
    gate('apply_safety', 'P6 must keep production app apply blocked.', []),
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-dirty-surface-state-guard-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      p1SurfaceDeltaInventory: rel(repoRoot, p1Path),
      p2DomainRegistryPacket: rel(repoRoot, p2Path),
      sourceFiles: SURFACES.map((surface) => surface.path),
    },
    summary: {
      expectedSurfaces: SURFACES.length,
      surfaceRecords: surfaces.length,
      missingSurfaceFiles: surfaces.filter((surface) => !surface.fileExists).length,
      p1MappedSurfaces: surfaces.filter((surface) => !!surface.p1PrimaryDomain).length,
      p2MappedSurfaces: surfaces.filter((surface) => surface.p2DomainHasSurface).length,
      classifiedSurfaces: surfaces.filter((surface) => !!surface.effectiveClassification).length,
      classificationCounts,
      asyncStorageSurfaces: surfaces.filter((surface) => surface.markerCounts.asyncStorage > 0).length,
      cloudSyncSurfaces: surfaces.filter((surface) => surface.markerCounts.cloudSync > 0).length,
      targetSensitiveOrMixedSurfaces: surfaces.filter((surface) => (
        surface.effectiveClassification === 'target-sensitive' || surface.effectiveClassification === 'mixed'
      )).length,
      globalRewardSurfaces: surfaces.filter((surface) => surface.effectiveClassification === 'global-reward' || surface.effectiveClassification === 'mixed').length,
      sourceLocaleUiSurfaces: surfaces.filter((surface) => surface.markerCounts.sourceLocaleUi > 0).length,
      storageCalls: surfaces.reduce((sum, surface) => sum + surface.storageCalls.length, 0),
      targetAwareStorageCalls: surfaces.reduce((sum, surface) => sum + surface.storageCalls.filter((call) => call.targetAware).length, 0),
      rawGlobalStorageCalls: surfaces.reduce((sum, surface) => sum + surface.storageCalls.filter((call) => !call.targetAware).length, 0),
      requiredTestsBeforeFrenchActivation: surfaces.reduce((sum, surface) => sum + surface.requiredTestsBeforeFrenchActivation.length, 0),
      blockers,
      warnings,
      readyForP8ReadinessExtension: blockers === 0,
      readyForFrenchSurfaceActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    surfaces,
    sourceLocalePolicy: [
      'Source UI language controls visible labels, modal copy, localized weekly/stats prose, and dialog menu chrome.',
      'Changing source UI language must not change studyTarget, target progress buckets, or target-language phrase content.',
      'Premium, referral, loyalty, and access copy is source-locale UI copy unless a separate target-language exercise contract declares otherwise.',
    ],
    studyTargetPolicy: [
      'Lesson runtime, dialog lesson-tab state, stats insights, weekly review, and speaking targetText are studyTarget-sensitive.',
      'Global XP, shards, gifts, premium entitlement, free-trial counters, and loyalty access remain global unless a target-scoped rule is explicitly approved.',
      'French activation requires target-aware storage/cache proof before any production app apply.',
    ],
    activationRequirements: [
      'P6 PASS only means the dirty surface risks are classified and documented.',
      'French surface activation remains blocked until the listed tests are implemented or mapped to existing passing tests.',
      'Production app apply remains blocked until reviewer decisions, readiness extension, master manifest, and explicit app-write approval exist.',
      'No production app source file may be modified by this packet.',
    ],
    contractGates,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      dirtySurfaceSourceModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'dirty_surface_state_guard_packet.json');
  const outMd = path.join(auditsDir, 'dirty_surface_state_guard_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV dirty surface state guard packet: ${report.status}`);
  console.log(`Surfaces: ${report.summary.surfaceRecords}/${report.summary.expectedSurfaces}`);
  console.log(`Classified: ${report.summary.classifiedSurfaces}/${report.summary.expectedSurfaces}`);
  console.log(`P1 mapped: ${report.summary.p1MappedSurfaces}/${report.summary.expectedSurfaces}`);
  console.log(`P2 mapped: ${report.summary.p2MappedSurfaces}/${report.summary.expectedSurfaces}`);
  console.log(`Target-sensitive or mixed: ${report.summary.targetSensitiveOrMixedSurfaces}`);
  console.log(`AsyncStorage surfaces: ${report.summary.asyncStorageSurfaces}`);
  console.log(`Cloud-sync surfaces: ${report.summary.cloudSyncSurfaces}`);
  console.log(`Required tests before French activation: ${report.summary.requiredTestsBeforeFrenchActivation}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`);
  console.log(`Ready for French surface activation: ${report.summary.readyForFrenchSurfaceActivation ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
