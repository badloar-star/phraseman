import * as fs from 'node:fs';
import * as path from 'node:path';

type FindingSeverity = 'blocker' | 'warning' | 'info';
type Status = 'PASS' | 'BLOCK';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type DomainId =
  | 'lesson_rows'
  | 'lesson_runtime'
  | 'ai_dialog_scenarios'
  | 'flashcard_marketplace_bundles'
  | 'club_rewards_stats_weekly'
  | 'premium_loyalty_speaking'
  | 'collectible_reward_assets'
  | 'target_storage_and_cloud_sync'
  | 'source_locale_ui_copy'
  | 'gustav_gate_scripts';

type FrenchGenerationMode =
  | 'content-only'
  | 'stateful'
  | 'ui-only'
  | 'asset-only'
  | 'apply-sensitive';

type DomainRegistryEntry = {
  id: DomainId;
  title: string;
  frenchGenerationMode: FrenchGenerationMode;
  sourceLocalePolicy: string;
  studyTargetPolicy: string;
  applySensitivity: 'none' | 'low' | 'medium' | 'high' | 'blocked';
  requiredEvidenceBeforeFrenchActivation: string[];
  activationBlockers: string[];
  p1DirtyFiles: string[];
  p1NewSurfaces: string[];
};

type P1Report = {
  schemaVersion?: string;
  generatedAt?: string;
  status?: string;
  summary?: {
    dirtyFilesFromP0?: number;
    dirtyAppComponentTestFiles?: number;
    unclassifiedDirtyAppComponentTestFiles?: number;
    currentAppTsxNotInOldInventory?: number;
    blockers?: number;
    readyForP2DomainRegistry?: boolean;
    readyForApply?: boolean;
    mayModifyProductionAppFiles?: boolean;
  };
  oldInventoryDelta?: {
    currentAppTsxNotInOldInventory?: Array<{
      path: string;
      primaryDomain: string;
    }>;
  };
  dirtyFileDomainMap?: Array<{
    path: string;
    category: string;
    primaryDomain: string;
    secondaryDomains?: string[];
  }>;
};

type DirtyFileRegistryCoverage = {
  path: string;
  category: string;
  primaryDomain: DomainId | 'unknown';
  secondaryDomains: Array<DomainId | 'unknown'>;
  primaryDomainRegistered: boolean;
  secondaryDomainsRegistered: boolean;
};

type Report = {
  schemaVersion: 'gustav-algorithm-domain-registry-packet-v0';
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
  };
  summary: {
    requiredDomains: number;
    registryDomains: number;
    p1DirtyFiles: number;
    p1DirtyPrimaryDomainsCovered: number;
    p1DirtyFilesWithExactlyOnePrimaryDomain: number;
    p1DirtyFilesWithMissingPrimaryDomain: number;
    p1SecondaryDomainReferences: number;
    p1SecondaryDomainReferencesMissing: number;
    p1NewSurfaces: number;
    p1NewSurfacePrimaryDomainsCovered: number;
    domainsWithDirtyFiles: number;
    domainsWithNewSurfaces: number;
    domainsWithSourceLocalePolicy: number;
    domainsWithStudyTargetPolicy: number;
    domainsWithRequiredEvidence: number;
    blockers: number;
    warnings: number;
    readyForP3P7Contracts: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  requiredDomains: DomainId[];
  registry: DomainRegistryEntry[];
  p1DirtyCoverage: DirtyFileRegistryCoverage[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_DOMAINS: DomainId[] = [
  'lesson_rows',
  'lesson_runtime',
  'ai_dialog_scenarios',
  'flashcard_marketplace_bundles',
  'club_rewards_stats_weekly',
  'premium_loyalty_speaking',
  'collectible_reward_assets',
  'target_storage_and_cloud_sync',
  'source_locale_ui_copy',
];

const REGISTRY_TEMPLATE: Omit<DomainRegistryEntry, 'p1DirtyFiles' | 'p1NewSurfaces'>[] = [
  {
    id: 'lesson_rows',
    title: 'Lesson rows and row metadata',
    frenchGenerationMode: 'content-only',
    sourceLocalePolicy: 'Source UI locale must remain separate from learner target content; row metadata may expose localized support copy only through explicit source-locale fields.',
    studyTargetPolicy: 'Study target selects the lesson target-language content set; legacy English row data must not be reused as French output.',
    applySensitivity: 'medium',
    requiredEvidenceBeforeFrenchActivation: [
      'All lesson row ledgers pass French translation QA.',
      'Reviewer handoff is intact and no row writes are performed without decision import.',
      'Lesson metadata fields are mapped to the selected target language without source-locale leakage.',
    ],
    activationBlockers: [
      'Missing reviewer decision import.',
      'Missing proof that French rows do not overwrite English row data.',
    ],
  },
  {
    id: 'lesson_runtime',
    title: 'Lesson runtime and target-sensitive lesson state',
    frenchGenerationMode: 'stateful',
    sourceLocalePolicy: 'Runtime labels and hints may follow source locale; target phrase, token, distractor, and scoring data must follow study target.',
    studyTargetPolicy: 'Progress, phrase order, intro state, error replay, and score-like state require target-aware storage and no English fallback for French.',
    applySensitivity: 'blocked',
    requiredEvidenceBeforeFrenchActivation: [
      'Lesson runtime surfaces prove en and fr progress render independently.',
      'Dev StudyTargetLang and Spanish gate paths are isolated from production French.',
      'Target-sensitive storage reads/writes are routed through target-aware contracts.',
    ],
    activationBlockers: [
      'Raw target-sensitive storage can leak legacy English progress into French.',
      'Production apply remains blocked until dirty runtime surfaces are approved.',
    ],
  },
  {
    id: 'ai_dialog_scenarios',
    title: 'AI dialog scenarios',
    frenchGenerationMode: 'ui-only',
    sourceLocalePolicy: 'Scenario title, goal, next-step hint, and UI copy need explicit source-locale policy; learner interaction language must be controlled by study target.',
    studyTargetPolicy: 'Prompt behavior must not assume English target content when French study target is selected.',
    applySensitivity: 'high',
    requiredEvidenceBeforeFrenchActivation: [
      'Active scenario count and category coverage are verified.',
      'Scenario prompt safety and target-language behavior are documented.',
      'No Cyrillic leakage exists in non-RU/UK source-locale fields.',
    ],
    activationBlockers: [
      'No AI dialog scenario contract packet yet.',
      'No French prompt/UI review gate yet.',
    ],
  },
  {
    id: 'flashcard_marketplace_bundles',
    title: 'Flashcard marketplace bundles',
    frenchGenerationMode: 'content-only',
    sourceLocalePolicy: 'Marketplace labels and sourceLocales maps must define source copy separately from card target content.',
    studyTargetPolicy: 'Card meaning, examples, and phrase context must be generated for each target language without sharing target answers across languages.',
    applySensitivity: 'high',
    requiredEvidenceBeforeFrenchActivation: [
      'VictoriaRow schema and pack mapping are documented.',
      'Required sourceLocales maps are present for bundle marketplace copy.',
      'French bundle content has reviewer handoff and duplicate checks.',
    ],
    activationBlockers: [
      'No flashcard bundle contract packet yet.',
      'No French bundle reviewer approval yet.',
    ],
  },
  {
    id: 'club_rewards_stats_weekly',
    title: 'Club, rewards, stats, and weekly review surfaces',
    frenchGenerationMode: 'stateful',
    sourceLocalePolicy: 'Visible copy may follow source locale; stats labels, weekly summaries, and club text need source-locale coverage without altering target progress.',
    studyTargetPolicy: 'XP, shards, weekly stats, and progress insights must not merge target-language progress unless a shared-global rule is explicitly declared.',
    applySensitivity: 'blocked',
    requiredEvidenceBeforeFrenchActivation: [
      'Each dirty club/stats/weekly file is classified as global-reward, target-sensitive, UI-only, or mixed.',
      'AsyncStorage and cloud-sync related risks are documented.',
      'Tests required before French activation are listed per surface.',
    ],
    activationBlockers: [
      'No dirty surface state guard packet yet.',
      'Shared reward state could leak across study targets without policy.',
    ],
  },
  {
    id: 'premium_loyalty_speaking',
    title: 'Premium, loyalty, referral, and speaking surfaces',
    frenchGenerationMode: 'ui-only',
    sourceLocalePolicy: 'Paywall, loyalty, referral, and speaking UI copy follows source locale and must preserve contrast/accessibility rules.',
    studyTargetPolicy: 'Speaking prompts and target-language examples must follow study target; premium entitlement state is global unless explicitly target-scoped.',
    applySensitivity: 'high',
    requiredEvidenceBeforeFrenchActivation: [
      'Premium/loyalty/speaking surfaces have copy and analytics policy.',
      'Referral and access modal surfaces are classified.',
      'Speaking target-language behavior is separated from source-locale UI labels.',
    ],
    activationBlockers: [
      'No surface state guard packet yet.',
      'No speaking/referral/premium source-locale contract yet.',
    ],
  },
  {
    id: 'collectible_reward_assets',
    title: 'Collectible and reward assets',
    frenchGenerationMode: 'asset-only',
    sourceLocalePolicy: 'Asset labels and reward descriptions must follow source locale when visible; raster image files are language-neutral unless text is embedded.',
    studyTargetPolicy: 'Collectible unlocks are global unless the reward surface declares target-specific progression.',
    applySensitivity: 'medium',
    requiredEvidenceBeforeFrenchActivation: [
      'All Dalli set directories and files are counted.',
      'Catalog references and fallback policy are checked.',
      'Missing or orphaned assets are reported without rewriting images.',
    ],
    activationBlockers: [
      'No collectible reward asset gate yet.',
      'New Dalli sets are untracked and need catalog/fallback audit.',
    ],
  },
  {
    id: 'target_storage_and_cloud_sync',
    title: 'Target storage and cloud sync',
    frenchGenerationMode: 'stateful',
    sourceLocalePolicy: 'Cloud payloads may store source-locale preferences separately from target-language progress buckets.',
    studyTargetPolicy: 'All target-sensitive keys must be namespaced or migrated so French cannot hydrate from legacy English state.',
    applySensitivity: 'blocked',
    requiredEvidenceBeforeFrenchActivation: [
      'Target storage key inventory is current.',
      'Cloud restore and merge behavior is target-aware.',
      'Dirty surfaces that touch AsyncStorage are mapped to explicit store contracts.',
    ],
    activationBlockers: [
      'French app apply blocked until target storage and cloud sync guards pass.',
      'Legacy English fallback must be proven impossible for French buckets.',
    ],
  },
  {
    id: 'source_locale_ui_copy',
    title: 'Source-locale UI copy',
    frenchGenerationMode: 'ui-only',
    sourceLocalePolicy: 'UI labels, admin/lab screens, legal/settings copy, and non-target instructional chrome follow source locale.',
    studyTargetPolicy: 'Changing source locale must not mutate selected study target or target-language progress.',
    applySensitivity: 'medium',
    requiredEvidenceBeforeFrenchActivation: [
      'Surfaces that only need UI copy are separated from target content domains.',
      'Source-locale switch tests confirm studyTarget state is unchanged.',
      'Admin/lab/dev surfaces are identified so they do not block content generation.',
    ],
    activationBlockers: [
      'No readiness extension packet yet for UI-only source locale surfaces.',
    ],
  },
  {
    id: 'gustav_gate_scripts',
    title: 'GUSTAV gate scripts',
    frenchGenerationMode: 'apply-sensitive',
    sourceLocalePolicy: 'Gate scripts may inspect source-locale fields but must not generate or rewrite UI copy.',
    studyTargetPolicy: 'Gate scripts enforce study-target separation and must report apply readiness separately from generation readiness.',
    applySensitivity: 'blocked',
    requiredEvidenceBeforeFrenchActivation: [
      'Readiness gate changes remain audit-only until explicit implementation approval.',
      'Gate scripts continue to report readyForApply=false while reviewer/apply blockers remain.',
    ],
    activationBlockers: [
      'Existing gate script modifications are treated as read-only P0 dirty work for this expansion.',
    ],
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

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function isDomainId(value: string): value is DomainId {
  return REGISTRY_TEMPLATE.some((entry) => entry.id === value);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Algorithm Domain Registry Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Required domains: ${report.summary.requiredDomains}`,
    `- Registry domains: ${report.summary.registryDomains}`,
    `- P1 dirty files: ${report.summary.p1DirtyFiles}`,
    `- P1 dirty primary domains covered: ${report.summary.p1DirtyPrimaryDomainsCovered}`,
    `- P1 dirty files with exactly one primary domain: ${report.summary.p1DirtyFilesWithExactlyOnePrimaryDomain}`,
    `- P1 dirty files with missing primary domain: ${report.summary.p1DirtyFilesWithMissingPrimaryDomain}`,
    `- P1 secondary domain references: ${report.summary.p1SecondaryDomainReferences}`,
    `- P1 secondary domain references missing: ${report.summary.p1SecondaryDomainReferencesMissing}`,
    `- P1 new surfaces: ${report.summary.p1NewSurfaces}`,
    `- P1 new surface primary domains covered: ${report.summary.p1NewSurfacePrimaryDomainsCovered}`,
    `- Domains with dirty files: ${report.summary.domainsWithDirtyFiles}`,
    `- Domains with new surfaces: ${report.summary.domainsWithNewSurfaces}`,
    `- Domains with source-locale policy: ${report.summary.domainsWithSourceLocalePolicy}`,
    `- Domains with study-target policy: ${report.summary.domainsWithStudyTargetPolicy}`,
    `- Domains with required evidence: ${report.summary.domainsWithRequiredEvidence}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P3-P7 contracts: ${report.summary.readyForP3P7Contracts ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Registry',
    '',
  ];

  for (const domain of report.registry) {
    lines.push(`### ${domain.id}`);
    lines.push('');
    lines.push(`Title: ${domain.title}`);
    lines.push(`Mode: \`${domain.frenchGenerationMode}\``);
    lines.push(`Apply sensitivity: \`${domain.applySensitivity}\``);
    lines.push('');
    lines.push(`Source-locale policy: ${domain.sourceLocalePolicy}`);
    lines.push('');
    lines.push(`Study-target policy: ${domain.studyTargetPolicy}`);
    lines.push('');
    lines.push(`P1 dirty files: ${domain.p1DirtyFiles.length}`);
    for (const file of domain.p1DirtyFiles) lines.push(`- \`${file}\``);
    lines.push(`P1 new surfaces: ${domain.p1NewSurfaces.length}`);
    for (const file of domain.p1NewSurfaces.slice(0, 20)) lines.push(`- \`${file}\``);
    if (domain.p1NewSurfaces.length > 20) lines.push(`- ... ${domain.p1NewSurfaces.length - 20} more`);
    lines.push('');
    lines.push('Required evidence before French activation:');
    for (const item of domain.requiredEvidenceBeforeFrenchActivation) lines.push(`- ${item}`);
    lines.push('');
    lines.push('Activation blockers:');
    for (const item of domain.activationBlockers) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push('## Findings', '');
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
    console.error('Usage: npx tsx scripts/gustav_algorithm_domain_registry_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p1Path = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(p1Path)) {
    findings.push({
      severity: 'blocker',
      code: 'missing_p1_surface_delta_inventory',
      message: 'P2 requires the P1 current app surface delta inventory JSON.',
      path: rel(repoRoot, p1Path),
    });
    console.error(findings[0].message);
    process.exit(1);
  }

  const p1 = readJson<P1Report>(p1Path);
  if (p1.status !== 'PASS' || !p1.summary?.readyForP2DomainRegistry) {
    findings.push({
      severity: 'blocker',
      code: 'p1_not_ready_for_p2',
      message: 'P1 is not marked ready for P2 domain registry.',
      path: rel(repoRoot, p1Path),
    });
  }

  const registryById = new Map<DomainId, DomainRegistryEntry>();
  for (const template of REGISTRY_TEMPLATE) {
    registryById.set(template.id, {
      ...template,
      p1DirtyFiles: [],
      p1NewSurfaces: [],
    });
  }

  for (const required of REQUIRED_DOMAINS) {
    if (!registryById.has(required)) {
      findings.push({
        severity: 'blocker',
        code: 'missing_required_domain',
        message: `Required domain ${required} is absent from the registry.`,
      });
    }
  }

  const dirtyCoverage: DirtyFileRegistryCoverage[] = [];
  for (const dirty of p1.dirtyFileDomainMap ?? []) {
    const primary = isDomainId(dirty.primaryDomain) ? dirty.primaryDomain : 'unknown';
    const secondary = (dirty.secondaryDomains ?? []).map((domain) => (isDomainId(domain) ? domain : 'unknown'));
    const primaryDomainRegistered = primary !== 'unknown' && registryById.has(primary);
    const secondaryDomainsRegistered = secondary.every((domain) => domain !== 'unknown' && registryById.has(domain));
    dirtyCoverage.push({
      path: dirty.path,
      category: dirty.category,
      primaryDomain: primary,
      secondaryDomains: secondary,
      primaryDomainRegistered,
      secondaryDomainsRegistered,
    });
    if (!primaryDomainRegistered) {
      findings.push({
        severity: 'blocker',
        code: 'dirty_file_primary_domain_missing',
        message: `Dirty file primary domain ${dirty.primaryDomain} is not registered.`,
        path: dirty.path,
      });
    } else {
      registryById.get(primary)?.p1DirtyFiles.push(dirty.path);
    }
    for (const domain of secondary) {
      if (domain === 'unknown' || !registryById.has(domain)) {
        findings.push({
          severity: 'blocker',
          code: 'dirty_file_secondary_domain_missing',
          message: 'Dirty file secondary domain is not registered.',
          path: dirty.path,
        });
      }
    }
  }

  for (const surface of p1.oldInventoryDelta?.currentAppTsxNotInOldInventory ?? []) {
    if (!isDomainId(surface.primaryDomain)) {
      findings.push({
        severity: 'warning',
        code: 'new_surface_domain_not_registered',
        message: `New surface primary domain ${surface.primaryDomain} is not registered.`,
        path: surface.path,
      });
      continue;
    }
    registryById.get(surface.primaryDomain)?.p1NewSurfaces.push(surface.path);
  }

  for (const domain of registryById.values()) {
    if (!domain.sourceLocalePolicy.trim()) {
      findings.push({
        severity: 'blocker',
        code: 'domain_missing_source_locale_policy',
        message: `Domain ${domain.id} does not declare a source-locale policy.`,
      });
    }
    if (!domain.studyTargetPolicy.trim()) {
      findings.push({
        severity: 'blocker',
        code: 'domain_missing_study_target_policy',
        message: `Domain ${domain.id} does not declare a study-target policy.`,
      });
    }
    if (domain.requiredEvidenceBeforeFrenchActivation.length === 0) {
      findings.push({
        severity: 'blocker',
        code: 'domain_missing_required_evidence',
        message: `Domain ${domain.id} does not declare required evidence before French activation.`,
      });
    }
  }

  const registry = Array.from(registryById.values());
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const p1SecondaryDomainReferences = dirtyCoverage.reduce((sum, item) => sum + item.secondaryDomains.length, 0);
  const p1SecondaryDomainReferencesMissing = dirtyCoverage.reduce((sum, item) => (
    sum + item.secondaryDomains.filter((domain) => domain === 'unknown' || !registryById.has(domain)).length
  ), 0);
  const report: Report = {
    schemaVersion: 'gustav-algorithm-domain-registry-packet-v0',
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
    },
    summary: {
      requiredDomains: REQUIRED_DOMAINS.length,
      registryDomains: registry.length,
      p1DirtyFiles: p1.dirtyFileDomainMap?.length ?? 0,
      p1DirtyPrimaryDomainsCovered: dirtyCoverage.filter((item) => item.primaryDomainRegistered).length,
      p1DirtyFilesWithExactlyOnePrimaryDomain: dirtyCoverage.filter((item) => item.primaryDomain !== 'unknown').length,
      p1DirtyFilesWithMissingPrimaryDomain: dirtyCoverage.filter((item) => !item.primaryDomainRegistered).length,
      p1SecondaryDomainReferences,
      p1SecondaryDomainReferencesMissing,
      p1NewSurfaces: p1.oldInventoryDelta?.currentAppTsxNotInOldInventory?.length ?? 0,
      p1NewSurfacePrimaryDomainsCovered: registry.reduce((sum, domain) => sum + domain.p1NewSurfaces.length, 0),
      domainsWithDirtyFiles: registry.filter((domain) => domain.p1DirtyFiles.length > 0).length,
      domainsWithNewSurfaces: registry.filter((domain) => domain.p1NewSurfaces.length > 0).length,
      domainsWithSourceLocalePolicy: registry.filter((domain) => domain.sourceLocalePolicy.trim()).length,
      domainsWithStudyTargetPolicy: registry.filter((domain) => domain.studyTargetPolicy.trim()).length,
      domainsWithRequiredEvidence: registry.filter((domain) => domain.requiredEvidenceBeforeFrenchActivation.length > 0).length,
      blockers,
      warnings,
      readyForP3P7Contracts: blockers === 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    requiredDomains: REQUIRED_DOMAINS,
    registry,
    p1DirtyCoverage: dirtyCoverage,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const outMd = path.join(auditsDir, 'algorithm_domain_registry_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV algorithm domain registry packet: ${report.status}`);
  console.log(`Required domains: ${report.summary.requiredDomains}`);
  console.log(`Registry domains: ${report.summary.registryDomains}`);
  console.log(`P1 dirty primary domains covered: ${report.summary.p1DirtyPrimaryDomainsCovered}/${report.summary.p1DirtyFiles}`);
  console.log(`P1 new surface primary domains covered: ${report.summary.p1NewSurfacePrimaryDomainsCovered}/${report.summary.p1NewSurfaces}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P3-P7 contracts: ${report.summary.readyForP3P7Contracts ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
