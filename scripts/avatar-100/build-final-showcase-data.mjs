#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const queuePath = path.join(root, '.codex-tmp', 'avatar-regeneration-v3', 'queue.json');
const outputPath = path.join(
  root,
  '.codex-tmp',
  'avatar-regeneration-v3',
  'final-showcase',
  'showcase-data.js',
);

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const items = queue.items
  .filter((item) => item.status === 'completed' && item.finalPath && item.finalSha256)
  .map(({ id, variant, price, name, labelRu, status, finalPath, finalSha256 }) => ({
    id,
    variant,
    price,
    name,
    labelRu,
    status,
    finalPath,
    finalSha256,
  }));

const payload = {
  version: queue.version,
  total: queue.total,
  completed: items.length,
  items,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `window.AVATAR100_QUEUE = ${JSON.stringify(payload)};\n`,
  'utf8',
);

console.log(JSON.stringify({ outputPath, items: items.length, total: queue.total }));
