#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_MAX_AAB_BYTES,
  auditAab,
  printAudit,
} from './android_aab_size_gate.mjs';

function findAabs(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...findAabs(entryPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.aab')) results.push(entryPath);
  }
  return results;
}

export function runEasAabSizeGate({
  env = process.env,
  projectRoot = process.cwd(),
  maxBytes = DEFAULT_MAX_AAB_BYTES,
} = {}) {
  if (env.EAS_BUILD_PLATFORM !== 'android' || env.EAS_BUILD_PROFILE !== 'production') {
    return { skipped: true };
  }

  const outputs = path.join(projectRoot, 'android', 'app', 'build', 'outputs');
  const aabs = findAabs(outputs);
  if (aabs.length !== 1) {
    throw new Error(
      `35 MB release gate FAILED: expected exactly one production AAB, found ${aabs.length} under ${outputs}.`,
    );
  }

  const audit = auditAab(aabs[0]);
  printAudit(audit);
  if (audit.fileBytes > maxBytes) {
    throw new Error(
      `35 MB release gate FAILED: artifact is ${audit.fileBytes} bytes and exceeds ${maxBytes} bytes by ${audit.fileBytes - maxBytes} bytes. Do not submit this AAB.`,
    );
  }
  console.log(`35 MB release gate PASSED: ${audit.fileBytes} <= ${maxBytes} bytes.`);
  return { skipped: false, aabPath: aabs[0], audit };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    const result = runEasAabSizeGate();
    if (result.skipped) {
      console.log('35 MB AAB release gate skipped: build is not Android production.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
