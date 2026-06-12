import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd());
const OUT_ROOT = path.join(ROOT, 'assets', 'images', 'adaptive_backgrounds');
const GENERATED_TS = path.join(ROOT, 'components', 'adaptiveBackgroundAssets.generated.ts');

const VARIANTS = {
  phonePortrait: { width: 1080, height: 1920 },
  phoneLandscape: { width: 1920, height: 1080 },
  tabletPortrait: { width: 1668, height: 2388 },
  tabletLandscape: { width: 2388, height: 1668 },
  ultraPortrait: { width: 1848, height: 2960 },
  ultraLandscape: { width: 2960, height: 1848 },
};

const ROOTS = [
  'assets/images/quizzes/level_cards',
  'assets/images/quizzes/theme_cards',
  'assets/images/statistics/cards',
  'assets/images/statistics/premium_snapshots',
];

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    return /\.(webp|png|jpe?g)$/i.test(entry.name) ? [next] : [];
  });
}

function outputSizeForSource(relativePath, variantName) {
  const variant = VARIANTS[variantName];
  const normalized = toPosix(relativePath);

  if (normalized.includes('/quizzes/level_cards/') || normalized.includes('/quizzes/theme_cards/')) {
    const scale = variantName.startsWith('ultra') ? 2 : variantName.startsWith('tablet') ? 1.5 : 1;
    return { width: Math.round(640 * scale), height: Math.round(236 * scale), position: 'right center' };
  }

  if (normalized.includes('/statistics/cards/') || normalized.includes('/statistics/premium_snapshots/')) {
    const scale = variantName.startsWith('ultra') ? 2 : variantName.startsWith('tablet') ? 1.5 : 1;
    return { width: Math.round(900 * scale), height: Math.round(620 * scale), position: 'center' };
  }

  return { ...variant, position: 'center' };
}

async function renderAdaptiveVariant(sourcePath, outPath, size) {
  if (fs.existsSync(outPath)) return;

  const source = sharp(sourcePath).rotate();
  const metadata = await source.metadata();
  const inputBuffer = await source.toBuffer();
  const hasAlpha = Boolean(metadata.hasAlpha);

  const backplate = await sharp(inputBuffer)
    .resize(size.width, size.height, { fit: 'cover', position: size.position })
    .blur(18)
    .modulate({ saturation: 0.88, brightness: 0.92 })
    .webp({ quality: 86, effort: 5 })
    .toBuffer();

  const foreground = await sharp(inputBuffer)
    .resize(size.width, size.height, {
      fit: hasAlpha ? 'contain' : 'inside',
      withoutEnlargement: false,
      position: size.position,
    })
    .webp({ quality: 90, effort: 5 })
    .toBuffer();

  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(backplate)
    .composite([{ input: foreground, gravity: size.position.includes('right') ? 'east' : 'center' }])
    .webp({ quality: 88, effort: 5 })
    .toFile(outPath);
}

function generatedRequirePath(filePath) {
  const rel = toPosix(path.relative(path.dirname(GENERATED_TS), filePath));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function buildGeneratedFile(records) {
  const lines = [
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    "import type { AdaptiveBackgroundVariant } from './adaptiveBackgroundAssets';",
    '',
    'export const ADAPTIVE_BACKGROUND_ASSETS: Record<number, Partial<Record<AdaptiveBackgroundVariant, ImageSourcePropType>>> = {',
  ];

  for (const record of records) {
    lines.push(`  [require('${generatedRequirePath(record.source)}') as number]: {`);
    for (const variantName of Object.keys(VARIANTS)) {
      lines.push(`    ${variantName}: require('${generatedRequirePath(record.outputs[variantName])}'),`);
    }
    lines.push('  },');
  }

  lines.push('};', '');
  return lines.join('\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const offsetArg = process.argv.find(arg => arg.startsWith('--offset='));
  const limit = limitArg ? Math.max(0, Number(limitArg.split('=')[1]) || 0) : 0;
  const offset = offsetArg ? Math.max(0, Number(offsetArg.split('=')[1]) || 0) : 0;

  const allSources = ROOTS.flatMap(root => walk(path.join(ROOT, root)))
    .filter(file => !toPosix(file).includes('/adaptive_backgrounds/'))
    .sort((a, b) => toPosix(a).localeCompare(toPosix(b)));
  let sources = allSources;

  if (args.has('--missing-only')) {
    sources = sources.filter((source) => {
      const relative = toPosix(path.relative(path.join(ROOT, 'assets', 'images'), source));
      return Object.keys(VARIANTS).some(variantName => {
        const outPath = path.join(OUT_ROOT, variantName, relative);
        return !fs.existsSync(outPath);
      });
    });
  }

  if (offset || limit) {
    sources = sources.slice(offset, limit ? offset + limit : undefined);
  }

  const touched = [];

  for (const source of sources) {
    const relative = toPosix(path.relative(path.join(ROOT, 'assets', 'images'), source));
    const outputs = {};

    let complete = true;
    for (const variantName of Object.keys(VARIANTS)) {
      const size = outputSizeForSource(relative, variantName);
      const outPath = path.join(OUT_ROOT, variantName, relative);
      await renderAdaptiveVariant(source, outPath, size);
      outputs[variantName] = outPath;
      complete = complete && fs.existsSync(outPath);
    }

    if (complete) touched.push({ source, outputs });
  }

  const records = allSources.map((source) => {
    const relative = toPosix(path.relative(path.join(ROOT, 'assets', 'images'), source));
    const outputs = {};
    for (const variantName of Object.keys(VARIANTS)) {
      outputs[variantName] = path.join(OUT_ROOT, variantName, relative);
    }
    const complete = Object.values(outputs).every(outPath => fs.existsSync(outPath));
    return complete ? { source, outputs } : null;
  }).filter(Boolean);

  await fs.promises.writeFile(GENERATED_TS, buildGeneratedFile(records), 'utf8');
  console.log(`Generated ${touched.length} adaptive background batches; mapped ${records.length} sources across ${Object.keys(VARIANTS).length} variants.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
