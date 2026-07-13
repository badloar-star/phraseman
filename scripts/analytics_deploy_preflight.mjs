#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectId = 'phraseman-ea0b3';
const relativeEnvPath = `functions/.env.${projectId}`;
const absoluteEnvPath = resolve(relativeEnvPath);

function fail(message) {
  console.error(`Analytics deploy preflight: FAILED (${message})`);
  process.exit(1);
}

if (!existsSync(absoluteEnvPath)) {
  fail(`${relativeEnvPath} is missing`);
}

try {
  execFileSync('git', ['check-ignore', '--quiet', '--no-index', '--', relativeEnvPath], {
    stdio: 'ignore',
  });
} catch {
  fail(`${relativeEnvPath} is not ignored by Git`);
}

try {
  execFileSync('git', ['ls-files', '--error-unmatch', '--', relativeEnvPath], {
    stdio: 'ignore',
  });
  fail(`${relativeEnvPath} is tracked by Git`);
} catch (error) {
  if (error?.status === 1) {
    // Expected: the deploy environment must remain untracked.
  } else {
    throw error;
  }
}

const values = new Map();
for (const rawLine of readFileSync(absoluteEnvPath, 'utf8').split(/\r?\n/u)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const separator = line.indexOf('=');
  if (separator <= 0) continue;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, '');
  values.set(key, value);
}

if (values.get('ANALYTICS_BIGQUERY_DATASET') !== `${projectId}.analytics_532376954`) {
  fail('ANALYTICS_BIGQUERY_DATASET is missing or does not match the production dataset');
}
if (values.get('ANALYTICS_BIGQUERY_LOCATION') !== 'US') {
  fail('ANALYTICS_BIGQUERY_LOCATION is missing or does not match US');
}

console.log('Analytics deploy preflight: PASSED');
console.log(`Project: ${projectId}`);
console.log('Environment file: present, ignored, untracked');
console.log('BigQuery dataset: configured');
console.log('BigQuery location: configured');
