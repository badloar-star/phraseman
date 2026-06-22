import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type SeedCard = {
  id: string;
  en?: string;
  ru?: string;
  literalRu?: string;
  meaningRu?: string;
  exampleEn?: string;
  exampleRu?: string;
  originRu?: string;
  rarity?: string;
  art?: string;
  status?: string;
};

type SeedSet = {
  setId: string;
  order?: number;
  type?: 'A' | 'B';
  titleRu?: string;
  titleEn?: string;
  icon?: string;
  status?: string;
  secret: SeedCard;
  cards: SeedCard[];
};

type SeedCatalog = {
  version?: number;
  rarityDistribution?: Record<string, Record<string, number>>;
  sets?: SeedSet[];
};

type P1SurfaceDelta = {
  status?: string;
  collectibleSets?: Array<{
    setName: string;
    path: string;
    files: number;
    untrackedFiles: number;
    newInDirtyBaseline: boolean;
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
  }>;
};

type ExpectedSetConfig = {
  setId: 'set09_work' | 'set10_home' | 'set11_love';
  prefix: 'work' | 'home' | 'love';
};

type AssetFileRecord = {
  fileName: string;
  path: string;
  bytes: number;
  sha256: string;
  webpHeaderOk: boolean;
  tracked: boolean;
  untracked: boolean;
};

type SetGateRecord = {
  setId: string;
  prefix: string;
  assetDir: string;
  assetDirExists: boolean;
  expectedFiles: string[];
  files: AssetFileRecord[];
  assetFilesExpected: number;
  assetFilesPresent: number;
  missingAssetFiles: string[];
  extraAssetFiles: string[];
  invalidWebpFiles: string[];
  untrackedAssetFiles: number;
  seedSetPresent: boolean;
  seedStatus: string | null;
  seedCards: number;
  seedSecretPresent: boolean;
  seedArtRefsExpected: number;
  seedArtRefsMatchingAssets: number;
  seedRequiredTextFieldsMissing: number;
  rarityCounts: Record<string, number>;
  clientCatalogSetPresent: boolean;
  clientCatalogCardIdsPresent: number;
  clientCatalogSecretPresent: boolean;
  clientInlineSvgEntriesPresent: number;
  serverPoolCardsPresent: number;
  serverSecretMappingPresent: boolean;
  serverSetCardMapPresent: boolean;
  spanishSetSidecarPresent: boolean;
  spanishCardSidecarEntries: number;
  semanticAssetMappingOk: boolean;
};

type ContractGate = {
  id: string;
  status: Status;
  description: string;
  blockers: string[];
};

type Report = {
  schemaVersion: 'gustav-collectible-reward-asset-gate-v0';
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
    catalogSeed: string;
    clientCatalogData: string;
    serverCatalogData: string;
    catalogApi: string;
    collectibleScreen: string;
    spanishSidecar: string;
    assetRoot: string;
  };
  summary: {
    expectedSets: number;
    assetSetsScanned: number;
    assetFilesExpected: number;
    assetFilesPresent: number;
    missingAssetFiles: number;
    extraAssetFiles: number;
    invalidWebpFiles: number;
    untrackedAssetFiles: number;
    totalAssetBytes: number;
    seedSetsPresent: number;
    seedCards: number;
    seedSecrets: number;
    seedArtRefsExpected: number;
    seedArtRefsMatchingAssets: number;
    clientCatalogSetsPresent: number;
    clientCatalogCardIdsPresent: number;
    clientInlineSvgEntriesPresent: number;
    serverPoolCardsPresent: number;
    serverSecretMappingsPresent: number;
    serverSetCardMapsPresent: number;
    spanishSetSidecarEntries: number;
    spanishCardSidecarEntries: number;
    runtimeUsesCollectibleArt: boolean;
    runtimeKeepsSvgFallback: boolean;
    localeFallbackDocumented: boolean;
    semanticAssetMappedSets: number;
    blockers: number;
    warnings: number;
    readyForP8ReadinessExtension: boolean;
    readyForFrenchAssetActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sets: SetGateRecord[];
  sourceLocalePolicy: string[];
  studyTargetPolicy: string[];
  assetPolicy: string[];
  contractGates: ContractGate[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    imageAssetsModifiedByThisScript: false;
    generatedCatalogsModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_SETS: ExpectedSetConfig[] = [
  { setId: 'set09_work', prefix: 'work' },
  { setId: 'set10_home', prefix: 'home' },
  { setId: 'set11_love', prefix: 'love' },
];
const REQUIRED_TEXT_FIELDS = ['en', 'ru', 'literalRu', 'meaningRu', 'exampleEn', 'exampleRu', 'originRu'];
const REQUIRED_LOCALE_LABELS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

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

function execGit(repoRoot: string, args: string[]): string[] {
  try {
    const out = childProcess.execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.split(/\r?\n/).filter(Boolean).map((item) => item.replace(/\\/g, '/'));
  } catch {
    return [];
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasObjectKey(text: string, key: string): boolean {
  const escaped = escapeRegExp(key);
  return new RegExp(`(?:^|[\\s,{])(?:${escaped}|['"]${escaped}['"])\\s*:`, 'm').test(text);
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hasWebpHeader(filePath: string): boolean {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  return header.length >= 12 && header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
}

function expectedFileNamesFor(config: ExpectedSetConfig, seedSet: SeedSet | undefined): string[] {
  const ids = seedSet
    ? [...seedSet.cards.map((card) => card.id), seedSet.secret?.id].filter(Boolean)
    : [
      ...Array.from({ length: 10 }, (_, index) => `${config.prefix}_${String(index + 1).padStart(2, '0')}`),
      `${config.prefix}_secret`,
    ];
  return ids.map((id) => `${id}.webp`).sort();
}

function rarityCounts(cards: SeedCard[]): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    const rarity = card.rarity ?? 'missing';
    acc[rarity] = (acc[rarity] ?? 0) + 1;
    return acc;
  }, {});
}

function missingTextFields(seedSet: SeedSet | undefined): number {
  if (!seedSet) return REQUIRED_TEXT_FIELDS.length * 11;
  const rows = [...seedSet.cards, seedSet.secret];
  let missing = 0;
  for (const row of rows) {
    for (const field of REQUIRED_TEXT_FIELDS) {
      const value = (row as Record<string, unknown>)[field];
      if (typeof value !== 'string' || value.trim().length === 0) missing += 1;
    }
  }
  return missing;
}

function catalogHasInlineSvg(catalogText: string, id: string): boolean {
  const re = new RegExp(`id: "${escapeRegExp(id)}"[\\s\\S]{0,50000}svg: "<svg`);
  return re.test(catalogText);
}

function buildSetRecord(input: {
  repoRoot: string;
  config: ExpectedSetConfig;
  seedSet: SeedSet | undefined;
  catalogText: string;
  serverText: string;
  esText: string;
  trackedFiles: Set<string>;
  untrackedFiles: Set<string>;
  findings: Finding[];
}): SetGateRecord {
  const assetDir = `assets/images/collectibles/dalli/${input.config.setId}`;
  const assetDirAbs = path.resolve(input.repoRoot, assetDir);
  const assetDirExists = fs.existsSync(assetDirAbs) && fs.statSync(assetDirAbs).isDirectory();
  const expectedFiles = expectedFileNamesFor(input.config, input.seedSet);
  const fileNames = assetDirExists
    ? fs.readdirSync(assetDirAbs, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
    : [];
  const files: AssetFileRecord[] = fileNames.map((fileName) => {
    const filePath = `${assetDir}/${fileName}`;
    const abs = path.resolve(input.repoRoot, filePath);
    return {
      fileName,
      path: filePath,
      bytes: fs.statSync(abs).size,
      sha256: sha256(abs),
      webpHeaderOk: /\.webp$/i.test(fileName) && hasWebpHeader(abs),
      tracked: input.trackedFiles.has(filePath),
      untracked: input.untrackedFiles.has(filePath),
    };
  });
  const presentSet = new Set(fileNames);
  const expectedSet = new Set(expectedFiles);
  const missingAssetFiles = expectedFiles.filter((file) => !presentSet.has(file));
  const extraAssetFiles = fileNames.filter((file) => !expectedSet.has(file));
  const invalidWebpFiles = files.filter((file) => !file.webpHeaderOk).map((file) => file.fileName);
  const seedIds = input.seedSet ? [...input.seedSet.cards.map((card) => card.id), input.seedSet.secret.id] : [];
  const seedArtRefs = input.seedSet
    ? [
      ...input.seedSet.cards.map((card) => ({ id: card.id, art: card.art })),
      { id: input.seedSet.secret.id, art: input.seedSet.secret.art },
    ]
    : [];
  const seedArtRefsExpected = seedArtRefs.length;
  const seedArtRefsMatchingAssets = seedArtRefs.filter((ref) => {
    const expected = `${input.config.setId}/${ref.id}`;
    return ref.art === expected && expectedSet.has(`${ref.id}.webp`);
  }).length;
  const clientCatalogSetPresent = input.catalogText.includes(`setId: "${input.config.setId}"`);
  const clientCatalogCardIdsPresent = seedIds.filter((id) => input.catalogText.includes(`id: "${id}"`)).length;
  const clientCatalogSecretPresent = !!input.seedSet?.secret?.id && input.catalogText.includes(`id: "${input.seedSet.secret.id}"`);
  const clientInlineSvgEntriesPresent = seedIds.filter((id) => catalogHasInlineSvg(input.catalogText, id)).length;
  const serverPoolCardsPresent = input.seedSet
    ? input.seedSet.cards.filter((card) => input.serverText.includes(`{ id: "${card.id}", setId: "${input.config.setId}", rarity: "${card.rarity}" }`)).length
    : 0;
  const serverSecretMappingPresent = !!input.seedSet && input.serverText.includes(`"${input.config.setId}": "${input.seedSet.secret.id}"`);
  const serverSetCardMapPresent = !!input.seedSet && input.seedSet.cards.every((card) => input.serverText.includes(`"${card.id}"`));
  const spanishSetSidecarPresent = input.esText.includes(`${input.config.setId}:`);
  const spanishCardSidecarEntries = seedIds.filter((id) => input.esText.includes(`${id}:`)).length;
  const semanticAssetMappingOk = missingAssetFiles.length === 0
    && extraAssetFiles.length === 0
    && invalidWebpFiles.length === 0
    && seedArtRefsExpected === expectedFiles.length
    && seedArtRefsMatchingAssets === seedArtRefsExpected
    && clientCatalogSetPresent
    && clientCatalogCardIdsPresent === seedIds.length
    && serverPoolCardsPresent === (input.seedSet?.cards.length ?? 0)
    && serverSecretMappingPresent
    && serverSetCardMapPresent;

  if (!assetDirExists) addFinding(input.findings, 'blocker', 'missing_collectible_asset_dir', 'Expected collectible asset directory is missing.', assetDir);
  if (missingAssetFiles.length > 0) addFinding(input.findings, 'blocker', 'missing_collectible_asset_files', `${missingAssetFiles.length} expected asset files are missing.`, assetDir);
  if (extraAssetFiles.length > 0) addFinding(input.findings, 'warning', 'extra_collectible_asset_files', `${extraAssetFiles.length} extra asset files are present.`, assetDir);
  if (invalidWebpFiles.length > 0) addFinding(input.findings, 'blocker', 'invalid_collectible_webp_files', `${invalidWebpFiles.length} files do not have a WEBP header.`, assetDir);
  if (!input.seedSet) addFinding(input.findings, 'blocker', 'missing_collectible_seed_set', 'Expected set is missing from tools/collectibles/catalog_seed.json.', input.config.setId);
  if (input.seedSet && seedArtRefsMatchingAssets !== seedArtRefsExpected) {
    addFinding(input.findings, 'blocker', 'collectible_seed_art_ref_mismatch', 'Seed art refs do not match expected asset ids.', input.config.setId);
  }
  if (input.seedSet && missingTextFields(input.seedSet) > 0) {
    addFinding(input.findings, 'blocker', 'collectible_seed_missing_text_fields', 'Seed set has missing text fields.', input.config.setId);
  }
  if (!clientCatalogSetPresent || clientCatalogCardIdsPresent !== seedIds.length || !clientCatalogSecretPresent) {
    addFinding(input.findings, 'blocker', 'collectible_client_catalog_mapping_missing', 'Client catalog_data.ts does not fully map the expected set/card ids.', input.config.setId);
  }
  if (clientInlineSvgEntriesPresent !== seedIds.length) {
    addFinding(input.findings, 'blocker', 'collectible_client_inline_svg_missing', 'Client catalog_data.ts does not have inline SVG for every expected card/secret.', input.config.setId);
  }
  if (input.seedSet && (serverPoolCardsPresent !== input.seedSet.cards.length || !serverSecretMappingPresent || !serverSetCardMapPresent)) {
    addFinding(input.findings, 'blocker', 'collectible_server_catalog_mapping_missing', 'Server collectible catalog does not fully map the expected set.', input.config.setId);
  }
  if (!spanishSetSidecarPresent || spanishCardSidecarEntries !== seedIds.length) {
    addFinding(input.findings, 'info', 'collectible_spanish_sidecar_fallback_active', 'Spanish sidecar does not cover this new set; existing fallback policy is expected and documented.', input.config.setId);
  }

  return {
    setId: input.config.setId,
    prefix: input.config.prefix,
    assetDir,
    assetDirExists,
    expectedFiles,
    files,
    assetFilesExpected: expectedFiles.length,
    assetFilesPresent: files.length,
    missingAssetFiles,
    extraAssetFiles,
    invalidWebpFiles,
    untrackedAssetFiles: files.filter((file) => file.untracked).length,
    seedSetPresent: !!input.seedSet,
    seedStatus: input.seedSet?.status ?? null,
    seedCards: input.seedSet?.cards.length ?? 0,
    seedSecretPresent: !!input.seedSet?.secret?.id,
    seedArtRefsExpected,
    seedArtRefsMatchingAssets,
    seedRequiredTextFieldsMissing: missingTextFields(input.seedSet),
    rarityCounts: rarityCounts(input.seedSet?.cards ?? []),
    clientCatalogSetPresent,
    clientCatalogCardIdsPresent,
    clientCatalogSecretPresent,
    clientInlineSvgEntriesPresent,
    serverPoolCardsPresent,
    serverSecretMappingPresent,
    serverSetCardMapPresent,
    spanishSetSidecarPresent,
    spanishCardSidecarEntries,
    semanticAssetMappingOk,
  };
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
    '# GUSTAV Collectible Reward Asset Gate',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Expected sets: ${report.summary.expectedSets}`,
    `- Asset sets scanned: ${report.summary.assetSetsScanned}`,
    `- Asset files expected: ${report.summary.assetFilesExpected}`,
    `- Asset files present: ${report.summary.assetFilesPresent}`,
    `- Missing asset files: ${report.summary.missingAssetFiles}`,
    `- Extra asset files: ${report.summary.extraAssetFiles}`,
    `- Invalid WEBP files: ${report.summary.invalidWebpFiles}`,
    `- Untracked asset files: ${report.summary.untrackedAssetFiles}`,
    `- Total asset bytes: ${report.summary.totalAssetBytes}`,
    `- Seed sets present: ${report.summary.seedSetsPresent}`,
    `- Seed cards: ${report.summary.seedCards}`,
    `- Seed secrets: ${report.summary.seedSecrets}`,
    `- Seed art refs matching assets: ${report.summary.seedArtRefsMatchingAssets}/${report.summary.seedArtRefsExpected}`,
    `- Client catalog sets present: ${report.summary.clientCatalogSetsPresent}`,
    `- Client catalog card ids present: ${report.summary.clientCatalogCardIdsPresent}`,
    `- Client inline SVG entries present: ${report.summary.clientInlineSvgEntriesPresent}`,
    `- Server pool cards present: ${report.summary.serverPoolCardsPresent}`,
    `- Server secret mappings present: ${report.summary.serverSecretMappingsPresent}`,
    `- Server set card maps present: ${report.summary.serverSetCardMapsPresent}`,
    `- Spanish set sidecar entries: ${report.summary.spanishSetSidecarEntries}`,
    `- Spanish card sidecar entries: ${report.summary.spanishCardSidecarEntries}`,
    `- Runtime uses CollectibleArt (raster-first): ${report.summary.runtimeUsesCollectibleArt ? 'yes' : 'no'}`,
    `- Runtime keeps inline-SVG fallback: ${report.summary.runtimeKeepsSvgFallback ? 'yes' : 'no'}`,
    `- Locale fallback documented: ${report.summary.localeFallbackDocumented ? 'yes' : 'no'}`,
    `- Semantic asset mapped sets: ${report.summary.semanticAssetMappedSets}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`,
    `- Ready for French asset activation: ${report.summary.readyForFrenchAssetActivation ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Sets',
    '',
  ];

  for (const set of report.sets) {
    lines.push(`### ${set.setId}`);
    lines.push('');
    lines.push(`- Asset dir: \`${set.assetDir}\``);
    lines.push(`- Files: ${set.assetFilesPresent}/${set.assetFilesExpected}`);
    lines.push(`- Untracked files: ${set.untrackedAssetFiles}`);
    lines.push(`- Missing files: ${set.missingAssetFiles.length}`);
    lines.push(`- Extra files: ${set.extraAssetFiles.length}`);
    lines.push(`- Invalid WEBP files: ${set.invalidWebpFiles.length}`);
    lines.push(`- Seed cards: ${set.seedCards}`);
    lines.push(`- Seed secret present: ${set.seedSecretPresent ? 'yes' : 'no'}`);
    lines.push(`- Seed art refs matching assets: ${set.seedArtRefsMatchingAssets}/${set.seedArtRefsExpected}`);
    lines.push(`- Client catalog card ids: ${set.clientCatalogCardIdsPresent}/${set.seedCards + (set.seedSecretPresent ? 1 : 0)}`);
    lines.push(`- Client inline SVG entries: ${set.clientInlineSvgEntriesPresent}/${set.seedCards + (set.seedSecretPresent ? 1 : 0)}`);
    lines.push(`- Server pool cards: ${set.serverPoolCardsPresent}/${set.seedCards}`);
    lines.push(`- Server secret mapping: ${set.serverSecretMappingPresent ? 'yes' : 'no'}`);
    lines.push(`- Server set card map: ${set.serverSetCardMapPresent ? 'yes' : 'no'}`);
    lines.push(`- Spanish sidecar: set=${set.spanishSetSidecarPresent ? 'yes' : 'no'}, cards=${set.spanishCardSidecarEntries}`);
    lines.push(`- Semantic asset mapping: ${set.semanticAssetMappingOk ? 'yes' : 'no'}`);
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
  lines.push('', '## Asset Policy', '');
  for (const item of report.assetPolicy) lines.push(`- ${item}`);

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
    '- This gate is audit-only.',
    '- It does not rewrite image assets.',
    '- It does not modify generated catalogs.',
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
    console.error('Usage: npx tsx scripts/gustav_collectible_reward_asset_gate.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p1Path = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const p2Path = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const seedPath = path.resolve(repoRoot, 'tools/collectibles/catalog_seed.json');
  const catalogPath = path.resolve(repoRoot, 'app/collectibles/catalog_data.ts');
  const serverPath = path.resolve(repoRoot, 'functions/src/collectibles_catalog.ts');
  const catalogApiPath = path.resolve(repoRoot, 'app/collectibles/catalog.ts');
  const collectibleScreenPath = path.resolve(repoRoot, 'app/collectibles_screen.tsx');
  const esPath = path.resolve(repoRoot, 'app/collectibles/collectibles_es_locale.ts');
  const assetRoot = path.resolve(repoRoot, 'assets/images/collectibles/dalli');
  const findings: Finding[] = [];

  for (const [filePath, code, message] of [
    [p1Path, 'missing_p1_surface_delta_inventory', 'P7 requires the P1 current app surface delta inventory.'],
    [p2Path, 'missing_p2_domain_registry', 'P7 requires the P2 algorithm domain registry packet.'],
    [seedPath, 'missing_collectibles_seed', 'P7 requires tools/collectibles/catalog_seed.json.'],
    [catalogPath, 'missing_client_collectibles_catalog', 'P7 requires app/collectibles/catalog_data.ts.'],
    [serverPath, 'missing_server_collectibles_catalog', 'P7 requires functions/src/collectibles_catalog.ts.'],
    [catalogApiPath, 'missing_collectibles_catalog_api', 'P7 requires app/collectibles/catalog.ts.'],
    [collectibleScreenPath, 'missing_collectibles_screen', 'P7 requires app/collectibles_screen.tsx.'],
    [esPath, 'missing_collectibles_spanish_sidecar', 'P7 requires app/collectibles/collectibles_es_locale.ts.'],
  ] as Array<[string, string, string]>) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', code, message, rel(repoRoot, filePath));
  }
  if (!fs.existsSync(assetRoot) || !fs.statSync(assetRoot).isDirectory()) {
    addFinding(findings, 'blocker', 'missing_collectibles_asset_root', 'P7 requires the Dalli collectible asset root.', rel(repoRoot, assetRoot));
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    console.error(findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n'));
    process.exit(1);
  }

  const p1 = readJson<P1SurfaceDelta>(p1Path);
  const p2 = readJson<P2DomainRegistry>(p2Path);
  const seed = readJson<SeedCatalog>(seedPath);
  const catalogText = fs.readFileSync(catalogPath, 'utf8');
  const serverText = fs.readFileSync(serverPath, 'utf8');
  const catalogApiText = fs.readFileSync(catalogApiPath, 'utf8');
  const collectibleScreenText = fs.readFileSync(collectibleScreenPath, 'utf8');
  const esText = fs.readFileSync(esPath, 'utf8');

  if (p1.status !== 'PASS') addFinding(findings, 'blocker', 'p1_not_pass', 'P1 surface delta inventory is not PASS.', rel(repoRoot, p1Path));
  if (p2.status !== 'PASS' || !p2.summary?.readyForP3P7Contracts) {
    addFinding(findings, 'blocker', 'p2_not_ready_for_p7', 'P2 registry is not marked ready for P3-P7 contracts.', rel(repoRoot, p2Path));
  }
  const p2Collectibles = (p2.registry ?? []).find((domain) => domain.id === 'collectible_reward_assets');
  for (const config of EXPECTED_SETS) {
    const p1PathForSet = `assets/images/collectibles/dalli/${config.setId}`;
    const p1PathWithSlash = `${p1PathForSet}/`;
    const inP1 = (p1.collectibleSets ?? []).some((set) => set.path === p1PathForSet || set.path === p1PathWithSlash);
    const inP2 = (p2Collectibles?.p1DirtyFiles ?? []).some((entry) => entry === p1PathForSet || entry === p1PathWithSlash);
    if (!inP1) addFinding(findings, 'blocker', 'collectible_asset_set_missing_from_p1', 'Expected Dalli set is not present in P1 collectible set inventory.', p1PathForSet);
    if (!inP2) addFinding(findings, 'blocker', 'collectible_asset_set_missing_from_p2', 'Expected Dalli set is not registered in P2 collectible reward asset domain.', p1PathForSet);
  }

  const trackedFiles = new Set(execGit(repoRoot, ['ls-files', '--', 'assets/images/collectibles/dalli']));
  const untrackedFiles = new Set(execGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '--', 'assets/images/collectibles/dalli']));
  const seedMap = new Map((seed.sets ?? []).map((set) => [set.setId, set]));
  const sets = EXPECTED_SETS.map((config) => buildSetRecord({
    repoRoot,
    config,
    seedSet: seedMap.get(config.setId),
    catalogText,
    serverText,
    esText,
    trackedFiles,
    untrackedFiles,
    findings,
  }));

  // Политика рендера (с 2026-06-22): арт рисуется через <CollectibleArt> —
  // сначала webp-картинка с сервера (Firebase Storage по URL из
  // collectible_image_url_map.generated, стрим + дисковый кэш), инлайн-SVG
  // (card.svg) остаётся офлайн-фолбэком. webp больше НЕ бандлятся (−71 МБ).
  const runtimeUsesCollectibleArt = collectibleScreenText.includes('CollectibleArt');
  const runtimeKeepsSvgFallback = collectibleScreenText.includes('card.svg') || collectibleScreenText.includes('secret.svg');
  const localeFallbackDocumented = catalogApiText.includes('COLLECTIBLE_SET_ES[set.setId]?.titleEs ?? set.titleEn ?? set.titleRu')
    && catalogApiText.includes('es?.translationEs ?? card.ru')
    && REQUIRED_LOCALE_LABELS.every((lang) => hasObjectKey(catalogApiText, lang));
  if (!runtimeUsesCollectibleArt) addFinding(findings, 'blocker', 'collectible_runtime_art_component_missing', 'Collectibles screen no longer renders art via the CollectibleArt component (raster-first policy).', rel(repoRoot, collectibleScreenPath));
  if (!runtimeKeepsSvgFallback) addFinding(findings, 'warning', 'collectible_runtime_svg_fallback_missing', 'Collectibles screen no longer passes an inline-SVG fallback to CollectibleArt.', rel(repoRoot, collectibleScreenPath));
  if (!localeFallbackDocumented) addFinding(findings, 'blocker', 'collectible_locale_fallback_policy_missing', 'Collectible catalog locale fallback or rarity labels are incomplete.', rel(repoRoot, catalogApiPath));

  const gateBlockers = {
    assetFileIntegrity: sets
      .filter((set) => set.missingAssetFiles.length > 0 || set.invalidWebpFiles.length > 0 || !set.assetDirExists)
      .map((set) => `${set.setId} has missing/invalid asset files.`),
    seedCatalogMapping: sets
      .filter((set) => !set.seedSetPresent || set.seedCards !== 10 || !set.seedSecretPresent || set.seedArtRefsMatchingAssets !== set.seedArtRefsExpected || set.seedRequiredTextFieldsMissing > 0)
      .map((set) => `${set.setId} seed mapping is incomplete.`),
    clientServerCatalogMapping: sets
      .filter((set) => !set.clientCatalogSetPresent || set.clientCatalogCardIdsPresent !== 11 || !set.clientCatalogSecretPresent || set.clientInlineSvgEntriesPresent !== 11 || set.serverPoolCardsPresent !== 10 || !set.serverSecretMappingPresent || !set.serverSetCardMapPresent)
      .map((set) => `${set.setId} generated client/server catalog mapping is incomplete.`),
    fallbackPolicy: localeFallbackDocumented ? [] : ['Collectible locale fallback policy is incomplete.'],
    runtimePolicy: runtimeUsesCollectibleArt ? [] : ['Collectibles runtime CollectibleArt (raster-first) policy is not detected.'],
  };

  const contractGates = [
    gate('asset_file_integrity', 'Each new Dalli set must have 10 card WEBP files plus one secret WEBP file.', gateBlockers.assetFileIntegrity),
    gate('seed_catalog_mapping', 'Seed art refs, ids, text fields, cards, and secret cards must map to the new asset files.', gateBlockers.seedCatalogMapping),
    gate('client_server_catalog_mapping', 'Generated client and server collectible catalogs must contain the same set/card/secret ids.', gateBlockers.clientServerCatalogMapping),
    gate('locale_fallback_policy', 'Source-locale reward copy fallback must be explicit and safe.', gateBlockers.fallbackPolicy),
    gate('runtime_asset_policy', 'Runtime must have a clear inline-SVG/raster policy.', gateBlockers.runtimePolicy),
    gate('apply_safety', 'P7 must keep production app apply blocked and must not rewrite image assets.', []),
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-collectible-reward-asset-gate-v0',
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
      catalogSeed: rel(repoRoot, seedPath),
      clientCatalogData: rel(repoRoot, catalogPath),
      serverCatalogData: rel(repoRoot, serverPath),
      catalogApi: rel(repoRoot, catalogApiPath),
      collectibleScreen: rel(repoRoot, collectibleScreenPath),
      spanishSidecar: rel(repoRoot, esPath),
      assetRoot: rel(repoRoot, assetRoot),
    },
    summary: {
      expectedSets: EXPECTED_SETS.length,
      assetSetsScanned: sets.length,
      assetFilesExpected: sets.reduce((sum, set) => sum + set.assetFilesExpected, 0),
      assetFilesPresent: sets.reduce((sum, set) => sum + set.assetFilesPresent, 0),
      missingAssetFiles: sets.reduce((sum, set) => sum + set.missingAssetFiles.length, 0),
      extraAssetFiles: sets.reduce((sum, set) => sum + set.extraAssetFiles.length, 0),
      invalidWebpFiles: sets.reduce((sum, set) => sum + set.invalidWebpFiles.length, 0),
      untrackedAssetFiles: sets.reduce((sum, set) => sum + set.untrackedAssetFiles, 0),
      totalAssetBytes: sets.reduce((sum, set) => sum + set.files.reduce((inner, file) => inner + file.bytes, 0), 0),
      seedSetsPresent: sets.filter((set) => set.seedSetPresent).length,
      seedCards: sets.reduce((sum, set) => sum + set.seedCards, 0),
      seedSecrets: sets.filter((set) => set.seedSecretPresent).length,
      seedArtRefsExpected: sets.reduce((sum, set) => sum + set.seedArtRefsExpected, 0),
      seedArtRefsMatchingAssets: sets.reduce((sum, set) => sum + set.seedArtRefsMatchingAssets, 0),
      clientCatalogSetsPresent: sets.filter((set) => set.clientCatalogSetPresent).length,
      clientCatalogCardIdsPresent: sets.reduce((sum, set) => sum + set.clientCatalogCardIdsPresent, 0),
      clientInlineSvgEntriesPresent: sets.reduce((sum, set) => sum + set.clientInlineSvgEntriesPresent, 0),
      serverPoolCardsPresent: sets.reduce((sum, set) => sum + set.serverPoolCardsPresent, 0),
      serverSecretMappingsPresent: sets.filter((set) => set.serverSecretMappingPresent).length,
      serverSetCardMapsPresent: sets.filter((set) => set.serverSetCardMapPresent).length,
      spanishSetSidecarEntries: sets.filter((set) => set.spanishSetSidecarPresent).length,
      spanishCardSidecarEntries: sets.reduce((sum, set) => sum + set.spanishCardSidecarEntries, 0),
      runtimeUsesCollectibleArt,
      runtimeKeepsSvgFallback,
      localeFallbackDocumented,
      semanticAssetMappedSets: sets.filter((set) => set.semanticAssetMappingOk).length,
      blockers,
      warnings,
      readyForP8ReadinessExtension: blockers === 0,
      readyForFrenchAssetActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sets,
    sourceLocalePolicy: [
      'Collectible set titles, rarity labels, modal labels, and card detail prose are source-locale UI/reward copy.',
      'Current Spanish sidecar coverage intentionally falls back for untranslated sets; this gate documents the fallback instead of treating it as French target content.',
      'Future French collectible copy must be generated as source-locale UI/reward copy and reviewed separately from lesson-row target translations.',
    ],
    studyTargetPolicy: [
      'Collectible ownership, drops, secrets, and bonus shards are global reward state.',
      'Collectible reward state must not split by studyTarget unless a future explicit target-scoped reward rule is approved.',
      'French study target activation must not rewrite collectible ownership, drop ids, or server pool ids.',
    ],
    assetPolicy: [
      'The runtime collectible screen renders art through the shared <CollectibleArt> component (raster-first): generated WEBP via collectibleCardImage(), with the generated catalog_data.ts inline SVG kept as a fallback.',
      'The new Dalli WEBP assets are semantically mapped through catalog seed art refs and matching asset file names.',
      'This P7 gate verifies the runtime render policy (CollectibleArt + inline-SVG fallback) without rewriting the screen or image assets.',
      'Missing, invalid, or extra raster files are reported without rewriting images.',
    ],
    contractGates,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      imageAssetsModifiedByThisScript: false,
      generatedCatalogsModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'collectible_reward_asset_gate.json');
  const outMd = path.join(auditsDir, 'collectible_reward_asset_gate.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV collectible reward asset gate: ${report.status}`);
  console.log(`Sets: ${report.summary.assetSetsScanned}/${report.summary.expectedSets}`);
  console.log(`Asset files: ${report.summary.assetFilesPresent}/${report.summary.assetFilesExpected}`);
  console.log(`Missing assets: ${report.summary.missingAssetFiles}`);
  console.log(`Invalid WEBP: ${report.summary.invalidWebpFiles}`);
  console.log(`Untracked assets: ${report.summary.untrackedAssetFiles}`);
  console.log(`Seed art refs: ${report.summary.seedArtRefsMatchingAssets}/${report.summary.seedArtRefsExpected}`);
  console.log(`Client catalog ids: ${report.summary.clientCatalogCardIdsPresent}`);
  console.log(`Server pool cards: ${report.summary.serverPoolCardsPresent}`);
  console.log(`Runtime uses CollectibleArt (raster-first): ${report.summary.runtimeUsesCollectibleArt ? 'yes' : 'no'}`);
  console.log(`Runtime keeps inline-SVG fallback: ${report.summary.runtimeKeepsSvgFallback ? 'yes' : 'no'}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`);
  console.log(`Ready for French asset activation: ${report.summary.readyForFrenchAssetActivation ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
