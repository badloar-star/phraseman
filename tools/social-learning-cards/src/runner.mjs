import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareCardBrief, runQualityGates, packageCard } from './cli.mjs';
import { importAtlas } from './import-atlas.mjs';
import { renderInstallSlide, renderLearningSlide } from './render.mjs';
import { revisionKey } from './paths.mjs';
import { readCatalog } from './catalog.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cardsPath = path.join(projectRoot, 'content/marketing/social-learning-cards/series-20.json');
const manualQaPath = path.join(projectRoot, 'content/marketing/social-learning-cards/pilot-01/manual-qa.json');
const outputRoot = path.join(projectRoot, 'output/social-learning-cards');

function argsMap(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index].startsWith('--')) result[argv[index].slice(2)] = argv[index + 1];
  }
  return result;
}

async function loadCard(contentId) {
  const card = (await readCatalog(cardsPath)).find((candidate) => candidate.contentId === contentId);
  if (!card) throw new Error(`unknown_card:${contentId}`);
  return card;
}

const [command, ...rest] = process.argv.slice(2);
const args = argsMap(rest);
if (!command || !args.card) throw new Error('usage:<command> --card <content-id>');
const card = await loadCard(args.card);
const revisionDir = path.join(outputRoot, revisionKey(card.contentId, card.revision));

if (command === 'prepare') {
  console.log(JSON.stringify(await prepareCardBrief({ card, outputRoot })));
} else if (command === 'import') {
  if (!args.atlas) throw new Error('missing_argument:atlas');
  console.log(JSON.stringify(await importAtlas({ card, atlasPath: path.resolve(args.atlas), revisionDir })));
} else if (command === 'render') {
  const checkpoint = JSON.parse(await fs.readFile(path.join(revisionDir, 'checkpoint.json'), 'utf8'));
  const cellPaths = Object.fromEntries(checkpoint.cells.map((cell) => [cell.itemId, cell.path]));
  const learning = await renderLearningSlide({ card, cellPaths, outputPath: path.join(revisionDir, card.images.learning.fileName) });
  const install = await renderInstallSlide({ card, heroCellPath: cellPaths[card.conversion.heroItemId], outputPath: path.join(revisionDir, card.images.install.fileName) });
  console.log(JSON.stringify({ learning, install }));
} else if (command === 'validate') {
  console.log(JSON.stringify(await runQualityGates({ card, revisionDir, manualQaPath })));
} else if (command === 'package') {
  console.log(JSON.stringify(await packageCard({ card, revisionDir, exportRoot: path.join(outputRoot, 'packages'), manualQaPath })));
} else {
  throw new Error(`unknown_command:${command}`);
}
