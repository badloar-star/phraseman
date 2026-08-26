#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--id', '--variant', '--source', '--final', '--backup'].includes(key) || !value) {
      throw new Error('Usage: record-biomythical-completion.mjs --id <id> --variant <black|white> --source <path> --final <path> --backup <path>');
    }
    values.set(key, value);
  }
  const id = Number(values.get('--id'));
  const variant = values.get('--variant');
  if (!Number.isInteger(id) || !['black', 'white'].includes(variant)) throw new Error('Invalid id or variant');
  return {
    id,
    variant,
    sourcePath: path.resolve(ROOT, values.get('--source')),
    finalPath: path.resolve(ROOT, values.get('--final')),
    backupPath: path.resolve(ROOT, values.get('--backup')),
  };
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const values = parseArgs(process.argv.slice(2));
  for (const filePath of [values.sourcePath, values.finalPath, values.backupPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing completion artifact: ${filePath}`);
  }
  const queuePath = path.join(ROOT, '.codex-tmp', 'avatar-regeneration-v3', 'queue.json');
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const item = queue.items.find(({ id, variant }) => id === values.id && variant === values.variant);
  if (!item) throw new Error(`Queue item not found: ${values.id}/${values.variant}`);
  item.status = 'completed';
  item.sourcePath = values.sourcePath;
  item.finalPath = values.finalPath;
  item.backupPath = values.backupPath;
  item.sourceSha256 = sha256(values.sourcePath);
  item.finalSha256 = sha256(values.finalPath);
  item.backupSha256 = sha256(values.backupPath);
  item.completedAt = new Date().toISOString();
  queue.completed = queue.items.filter(({ status }) => status === 'completed').length;
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
  process.stdout.write(`avatar regeneration V3: ${queue.completed}/${queue.total} completed (${values.id}/${values.variant})\n`);
}

main();
