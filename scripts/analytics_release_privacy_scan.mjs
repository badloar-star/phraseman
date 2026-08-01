#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

const stagedFiles = git(['diff', '--cached', '--name-only', '-z'])
  .split('\0')
  .filter(Boolean);

if (stagedFiles.length === 0) {
  console.error('Analytics staged privacy scan: FAILED (nothing is staged)');
  process.exit(1);
}

const forbiddenPathPatterns = [
  /(^|\/)functions\/\.env\.(?!example$)/iu,
  /(^|\/)docs\/reports\/user_error_reports_audit/iu,
  /(^|\/)(?:replies|reply_drafts?)[^/]*\.json$/iu,
  /(^|\/)(?:test-results|maestro-results|\.codex-tmp|\.firebase)(\/|$)/iu,
];

const forbiddenPaths = stagedFiles.filter((file) =>
  forbiddenPathPatterns.some((pattern) => pattern.test(file.replaceAll('\\', '/'))),
);

if (forbiddenPaths.length > 0) {
  console.error('Analytics staged privacy scan: FAILED (forbidden paths)');
  for (const file of forbiddenPaths) console.error(`- ${file}`);
  process.exit(1);
}

const reportDiff = git([
  'diff',
  '--cached',
  '--unified=0',
  '--',
  'docs/reports',
]);

const addedReportLines = reportDiff
  .split(/\r?\n/u)
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .map((line) => line.slice(1));

const privateContentPatterns = [
  /["']?(?:uid|stableUid|firebaseUid|reportId|draftReply|errorText|stackTrace|comment)["']?\s*[:=]/u,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b(?:\+?\d[\s().-]*){10,}\b/u,
];

const offendingLine = addedReportLines.find((line) =>
  privateContentPatterns.some((pattern) => pattern.test(line)),
);

if (offendingLine) {
  console.error('Analytics staged privacy scan: FAILED (private-looking report content)');
  process.exit(1);
}

console.log(`Analytics staged privacy scan: PASSED (${stagedFiles.length} staged files)`);
console.log('Forbidden exports/env/runtime paths: none');
console.log('Private-looking fields in staged reports: none');
