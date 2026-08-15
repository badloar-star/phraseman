#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { personalShardAuthorityViolations } from './personal_shard_authority_guard.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const functionsPackage = JSON.parse(readFileSync(resolve(root, 'functions/package.json'), 'utf8'));
const mainRelative = String(functionsPackage.main ?? '');
const builtIndex = resolve(root, 'functions', mainRelative);
const sourceIndex = resolve(root, 'functions/src/index.ts');
const sourceRoot = resolve(root, 'functions/src');
const builtRoot = resolve(root, 'functions/lib/functions/src');

function fail(message) {
  console.error(`[functions-runtime-parity] ${message}`);
  process.exit(1);
}

if (mainRelative !== 'lib/functions/src/index.js') {
  fail(`unexpected functions main: ${mainRelative || '<missing>'}`);
}
if (!existsSync(builtIndex)) fail(`missing runtime entrypoint: ${builtIndex}`);
if (!existsSync(sourceIndex)) fail(`missing TypeScript entrypoint: ${sourceIndex}`);
if (!existsSync(builtRoot)) fail(`missing compiled runtime directory: ${builtRoot}`);

function filesBelow(directory, extension) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(absolute, extension));
    else if (entry.isFile() && extname(entry.name) === extension) files.push(absolute);
  }
  return files;
}

const sourceFiles = filesBelow(sourceRoot, '.ts')
  .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.d.ts'));
const builtFiles = filesBelow(builtRoot, '.js')
  .filter((file) => !file.endsWith('.test.js'));

const builtMtime = statSync(builtIndex).mtimeMs;
const newestSourceMtime = Math.max(...sourceFiles.map((file) => statSync(file).mtimeMs));
if (builtMtime + 1 < newestSourceMtime) {
  fail('compiled runtime is older than functions/src; run npm --prefix functions run build');
}

for (const sourceFile of sourceFiles) {
  const relativeSource = relative(sourceRoot, sourceFile);
  const compiledFile = resolve(builtRoot, relativeSource.replace(/\.ts$/, '.js'));
  if (!existsSync(compiledFile)) fail(`missing compiled module for ${relativeSource}`);
  if (statSync(compiledFile).mtimeMs + 1 < statSync(sourceFile).mtimeMs) {
    fail(`compiled module is older than source: ${relativeSource}`);
  }
}
for (const builtFile of builtFiles) {
  const relativeBuilt = relative(builtRoot, builtFile);
  const sourceFile = resolve(sourceRoot, relativeBuilt.replace(/\.js$/, '.ts'));
  if (!existsSync(sourceFile)) fail(`orphan compiled module has no source: ${relativeBuilt}`);
}

const builtSources = readFileSync(builtIndex, 'utf8');
if (!builtSources.includes('require("./shards_apply_delta")')) {
  fail('compiled entrypoint does not contain the expected application exports');
}

// Enumerate the whole compiled tree ourselves so a deploy command cannot
// accidentally weaken the gate by omitting shell-expanded file arguments.
for (const file of builtFiles) {
  const normalized = file.replaceAll('\\', '/');
  if (/\/(?:arena_v2|arena_expansion|tournaments|tournament_weekly_payout)\.js$/.test(normalized)) {
    // Competitive code is scanned too: it no longer has a shard-write exception.
  }
  const source = readFileSync(file, 'utf8');
  const violations = personalShardAuthorityViolations(source, normalized);
  if (violations.length) fail(`compiled runtime contains forbidden personal-shard authority:\n${violations.join('\n')}`);
}

console.log('[functions-runtime-parity] compiled runtime matches the personal-economy boundary');
