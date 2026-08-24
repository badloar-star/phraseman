import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import ts from 'typescript';

const root = process.cwd();
const fail = (message) => {
  process.stderr.write(`[achievement-art-v2] FAIL: ${message}\n`);
  process.exit(1);
};

const manifestPath = path.join(root, 'content', 'achievement-art-v2', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
if (manifest.version !== 3) fail('manifest version must be 3');
if (assets.length !== 70) fail(`expected 70 assets, got ${assets.length}`);

const requiredContract = {
  form: 'inanimate award statuette on a complete visible pedestal',
  referenceFamily: 'heraldic sculpture, allegorical human statuette, monumental champion trophy',
  canonicalReference: 'assets/images/achievements/legend_second_wind.webp',
  readOrder: 'award statuette first, individual achievement symbolism second',
  valueHierarchy: 'early compact copper, dark bronze, wood, ceramic, slate; mid silver, brass, colored enamel, polished wood, smoked or matte glass; high gold, platinum, marble, obsidian, titanium, restrained gemstone inserts; legendary rare combinations with expressive asymmetry or monumentality',
  shapeDiversity: 'curve-first collection: rounded, flowing, and slender soft sculptural geometry covers at least two thirds; crystalline, architectural, mechanical, massive, and chased-metal forms are minority accents; vary height, width, pose, and pedestal profile; no boxy template recolor',
  surfaceBias: 'broad convex surfaces, continuous arcs, tapered forms, and softened transitions by default; square torsos, boxy limbs, and repeated coarse polygon armor are forbidden',
  promptAssembly: 'every generation prompt must include valueTier, materialPalette, shapeLanguage, and pedestalProfile, then compare the candidate with all connected assets before acceptance',
};
for (const [field, expected] of Object.entries(requiredContract)) {
  if (manifest.contract?.[field] !== expected) fail(`art contract ${field} must equal ${JSON.stringify(expected)}`);
}

const catalogPath = path.join(root, 'app', 'achievement_catalog_v2.ts');
const copyPath = path.join(root, 'app', 'achievement_copy_ru_v2.ts');
const copyOutput = ts.transpileModule(fs.readFileSync(copyPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: copyPath,
}).outputText;
const copyModule = { exports: {} };
new Function('module', 'exports', 'require', copyOutput)(
  copyModule,
  copyModule.exports,
  () => { throw new Error('achievement copy must not import runtime modules'); },
);
const output = ts.transpileModule(fs.readFileSync(catalogPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: catalogPath,
}).outputText;
const catalogModule = { exports: {} };
new Function('module', 'exports', 'require', output)(
  catalogModule,
  catalogModule.exports,
  (id) => {
    if (id === './achievement_copy_ru_v2') return copyModule.exports;
    throw new Error(`catalog must not import runtime module ${id}`);
  },
);
const activeIds = [...catalogModule.exports.ACTIVE_FOUNDATION_IDS].sort();
const manifestIds = assets.map((row) => row.id).sort();
if (JSON.stringify(activeIds) !== JSON.stringify(manifestIds)) fail('manifest IDs do not match active catalog IDs');

for (const field of ['id', 'objectKey', 'form', 'archetype', 'valueTier', 'sculpture', 'gesture', 'attribute', 'treatment', 'materialPalette', 'pedestalProfile', 'shapeLanguage', 'status', 'output']) {
  if (assets.some((row) => !String(row[field] ?? '').trim())) fail(`one or more rows lack ${field}`);
}
for (const field of ['id', 'objectKey', 'sculpture', 'gesture', 'materialPalette', 'pedestalProfile', 'shapeLanguage', 'output']) {
  const values = assets.map((row) => row[field]);
  if (new Set(values).size !== values.length) fail(`${field} values must be unique`);
}
if (assets.some((row) => row.form !== 'statuette')) fail('every asset must use form "statuette"');
if (assets.some((row) => !['heraldic', 'allegorical', 'champion'].includes(row.archetype))) {
  fail('every asset must use an approved heraldic, allegorical, or champion archetype');
}
if (assets.some((row) => !['early', 'mid', 'high', 'legendary'].includes(row.valueTier))) {
  fail('every asset must use an approved early, mid, high, or legendary value tier');
}
if (assets.some((row) => !row.sculpture.startsWith(`visibly inanimate ${row.archetype} award sculpture:`))) {
  fail('every sculpture must explicitly use its inanimate award archetype');
}
if (assets.some((row) => !/^(?:rigid|calm|flowing) ceremonial composition:/.test(row.gesture))) {
  fail('every gesture must explicitly use a rigid, calm, or flowing ceremonial composition');
}
if (assets.some((row) => !['pending', 'connected'].includes(row.status))) fail('unknown asset status');
if (assets.some((row) => row.output !== `assets/images/achievements/${row.id}.webp`)) {
  fail('output paths must map 1:1 to achievement IDs');
}

const expectedTierIds = {
  early: [
    'streak_3', 'streak_7', 'streak_14', 'streak_30',
    'xp_100', 'xp_250', 'xp_500', 'xp_1000',
    'shards_100', 'shards_250', 'shards_500',
    'league_reached_copper', 'league_reached_bronze', 'time_foreground_10h',
  ],
  mid: [
    'streak_60', 'streak_100', 'streak_150', 'streak_200', 'streak_250',
    'xp_2500', 'xp_5000', 'xp_10000', 'xp_20000', 'xp_50000',
    'shards_1000', 'shards_2500',
    'league_reached_silver', 'league_reached_gold', 'league_reached_platinum', 'league_reached_emerald',
    'time_foreground_50h', 'time_foreground_100h', 'time_foreground_250h', 'access_plus_paid',
  ],
  high: [
    'streak_365', 'streak_500', 'streak_750', 'streak_1000', 'streak_clean_365',
    'xp_75000', 'xp_100000', 'xp_150000', 'xp_250000', 'xp_500000', 'xp_750000', 'xp_1000000',
    'shards_5000', 'shards_10000',
    'league_reached_sapphire', 'league_reached_ruby', 'league_reached_diamond',
    'league_reached_black_diamond', 'league_reached_ether', 'league_reached_supreme',
    'league_champion', 'league_champion_5', 'league_diamond_4_weeks',
    'time_foreground_500h', 'time_foreground_1000h', 'access_pro_paid',
  ],
  legendary: [
    'xp_2000000', 'league_champion_10',
    'legend_second_wind', 'legend_long_game', 'legend_every_league', 'legend_supreme_champion',
    'legend_full_cabinet', 'legend_one_more_zero', 'legend_patient_capital', 'legend_founder_era',
  ],
};
for (const [tier, ids] of Object.entries(expectedTierIds)) {
  const actual = assets.filter((row) => row.valueTier === tier).map((row) => row.id).sort();
  const expected = [...ids].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${tier} value-tier IDs drifted`);
}

const tierMaterialCues = {
  early: /copper|bronze|wood|walnut|ceramic|slate/i,
  mid: /silver|brass|enamel|wood|walnut|glass|quartz/i,
  high: /gold|platinum|marble|obsidian|titanium|sapphire|ruby|emerald|diamond|moonstone|quartz|crystal/i,
};
for (const row of assets) {
  const cue = tierMaterialCues[row.valueTier];
  if (cue && !cue.test(row.materialPalette)) {
    fail(`${row.id} materialPalette does not express its ${row.valueTier} value tier`);
  }
  if (row.valueTier === 'legendary' && row.materialPalette.split(',').length < 3) {
    fail(`${row.id} legendary materialPalette must combine at least three materials`);
  }
}

const expectedShapeFamilyCounts = {
  'rounded sculptural geometry': 21,
  'flowing sculptural geometry': 16,
  'slender vertical geometry': 10,
  'chased-metal geometry': 8,
  'crystalline faceted geometry': 5,
  'architectural geometry': 4,
  'mechanical geometry': 4,
  'massive monumental geometry': 2,
};
for (const [family, expected] of Object.entries(expectedShapeFamilyCounts)) {
  const count = assets.filter((row) => row.shapeLanguage.startsWith(`${family} — `)).length;
  if (count !== expected) fail(`${family} must appear exactly ${expected} times, got ${count}`);
}
const softShapeCount = assets.filter((row) => (
  row.shapeLanguage.startsWith('rounded sculptural geometry — ')
  || row.shapeLanguage.startsWith('flowing sculptural geometry — ')
  || row.shapeLanguage.startsWith('slender vertical geometry — ')
)).length;
if (softShapeCount < 47) fail(`soft curve-first shape families must cover at least 47/70 rows, got ${softShapeCount}`);

const pedestalFamilies = [
  /round|circular|drum|disc/i,
  /oval/i,
  /hexagonal|octagonal|twelve-sided|faceted|triangular|square|rectangular|polygon/i,
  /step|stair|two-level|tier/i,
  /arch|gate|loop|portal/i,
  /stone|slate|basalt|granite|obsidian|marble|quartz|rock/i,
  /gear|bearing|rail|track|mechanical|clock|pressure|piston/i,
  /asymmetric|slanted|diagonal|tilted|split|crescent|offset/i,
];
const representedPedestalFamilies = pedestalFamilies.filter((pattern) => (
  assets.some((row) => pattern.test(row.pedestalProfile))
)).length;
if (representedPedestalFamilies < 7) {
  fail(`pedestal profiles represent only ${representedPedestalFamilies}/8 required families`);
}

const connected = assets.filter((row) => row.status === 'connected');
if (!connected.some((row) => row.id === 'legend_second_wind')) {
  fail('canonical Phoenix reference legend_second_wind must remain connected');
}
const imageMap = fs.readFileSync(path.join(root, 'constants', 'achievementImageAssets.ts'), 'utf8');
for (const row of connected) {
  const absolute = path.join(root, row.output);
  if (!fs.existsSync(absolute)) fail(`${row.id} is connected but its file is missing`);
  if (!imageMap.includes(`${row.id}:`)) fail(`${row.id} is connected but lacks a static require slot`);
}

if (connected.length === assets.length) {
  const requireRows = [...imageMap.matchAll(/^\s*([a-z0-9_]+):\s*require\('\.\.\/assets\/images\/achievements\/([a-z0-9_]+)\.webp'\),/gm)]
    .map((match) => ({ id: match[1], fileId: match[2] }));
  if (requireRows.length !== assets.length) fail(`expected exactly 70 static require slots, got ${requireRows.length}`);
  if (requireRows.some((row) => row.id !== row.fileId)) fail('static require keys must equal their WebP basenames');
  const requireIds = requireRows.map((row) => row.id).sort();
  if (JSON.stringify(requireIds) !== JSON.stringify(manifestIds)) fail('static require IDs do not exactly match manifest IDs');

  const achievementDir = path.join(root, 'assets', 'images', 'achievements');
  const finalFileIds = fs.readdirSync(achievementDir)
    .filter((name) => name.endsWith('.webp'))
    .map((name) => name.slice(0, -5))
    .sort();
  if (JSON.stringify(finalFileIds) !== JSON.stringify(manifestIds)) {
    fail('bundled achievement WebP files do not exactly match manifest IDs');
  }

  const contentHashes = new Map();
  for (const row of assets) {
    const absolute = path.join(root, row.output);
    const metadata = await sharp(absolute).metadata();
    if (metadata.format !== 'webp' || metadata.width !== 1024 || metadata.height !== 1024 || metadata.hasAlpha !== true) {
      fail(`${row.id} must be a 1024x1024 alpha WebP`);
    }
    const hash = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    const duplicateId = contentHashes.get(hash);
    if (duplicateId) fail(`${row.id} duplicates bundled pixels from ${duplicateId}`);
    contentHashes.set(hash, row.id);
  }
  if (contentHashes.size !== assets.length) fail(`expected 70 unique bundled image hashes, got ${contentHashes.size}`);
}

const contractText = Object.values(manifest.contract ?? {}).join(' ').toLowerCase();
for (const forbidden of ['text', 'digits', 'ordinary standalone objects', 'living characters', 'lifelike eyes', 'fur strands', 'skin', 'wildlife realism', 'photorealistic microtexture', 'currency piles', 'triangular beams', 'painted glow', 'watermarks', 'square torsos', 'boxy limbs', 'repeated coarse polygon armor']) {
  if (!contractText.includes(forbidden)) fail(`art contract must explicitly forbid ${forbidden}`);
}

process.stdout.write(`[achievement-art-v2] PASS: ${assets.length} unique statuette concepts, ${connected.length} connected, ${assets.length - connected.length} pending\n`);
