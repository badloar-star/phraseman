#!/usr/bin/env node

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = resolve(root, 'functions/package.json');
const functionsPackage = JSON.parse(readFileSync(packagePath, 'utf8'));
const main = String(functionsPackage.main ?? '');
const runtimeRoot = resolve(root, 'functions/lib');
const expectedRuntimeRoot = resolve(root, 'functions/lib');

if (main !== 'lib/functions/src/index.js' || runtimeRoot !== expectedRuntimeRoot) {
  throw new Error('[functions-runtime-clean] refused unexpected runtime layout');
}
if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
console.log('[functions-runtime-clean] removed the generated runtime tree before compilation');
