import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'admin', 'index.html');
const outputPath = path.join(root, 'admin', 'v2', 'data', 'changelog-0608.html');
const EXPECTED_SOURCE_SHA256 = '585bc1c059630a64776ffba9b36dbeb4f96816abe74b019687ee766f8eac3528';
const START_TAG = '<div id="tab-changelog-0608"';
const checkOnly = process.argv.includes('--check');

function normalizeNewlines(text) {
  return text.replace(/\r\n?/g, '\n');
}
function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function extractBalancedDiv(source) {
  const start = source.indexOf(START_TAG);
  if (start < 0) throw new Error('changelog_0608_start_not_found');
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tags.exec(source))) {
    depth += /^<\/div/i.test(match[0]) ? -1 : 1;
    if (depth === 0) return source.slice(start, tags.lastIndex);
  }
  throw new Error('changelog_0608_unbalanced_div');
}

function makeReadOnly(fragment) {
  if (/<script\b/i.test(fragment)) throw new Error('changelog_0608_script_tag_forbidden');
  if (/<(?:form|iframe|object|embed)\b/i.test(fragment)) throw new Error('changelog_0608_active_content_forbidden');
  return fragment
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<button\b(?![^>]*\bdisabled\b)/gi, '<button disabled aria-disabled="true"');
}

function buildOutput(fragment, sourceHash) {
  const readOnlyFragment = makeReadOnly(fragment);
  if (/\s+on[a-z]+\s*=/i.test(readOnlyFragment)) throw new Error('changelog_0608_inline_handler_forbidden');
  const contentHash = sha256(readOnlyFragment);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; connect-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; frame-src 'none'">
  <meta name="phraseman-source-sha256" content="${sourceHash}">
  <meta name="phraseman-content-sha256" content="${contentHash}">
  <title>Архив аудита 8 июня 2026</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080b12;color:#e5e7eb}
    *{box-sizing:border-box}html{min-width:320px}body{margin:0;padding:20px;background:#080b12}#tab-changelog-0608{display:block!important;margin:0 auto}button[disabled]{pointer-events:none;opacity:.65}a{color:#bef264}
    @media(max-width:640px){body{padding:12px}.cl-grid{grid-template-columns:1fr!important}.cl-card{padding:13px!important}}
  </style>
</head>
<body data-static-archive="changelog-0608" data-source-sha256="${sourceHash}">
${readOnlyFragment}
</body>
</html>
`;
}

const source = normalizeNewlines(fs.readFileSync(sourcePath, 'utf8'));
const fragment = extractBalancedDiv(source);
const sourceHash = sha256(fragment);
if (sourceHash !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`changelog_0608_source_hash_mismatch:${sourceHash}`);
}

const expected = buildOutput(fragment, sourceHash);
if (checkOnly) {
  if (!fs.existsSync(outputPath)) throw new Error('changelog_0608_output_missing');
  const actual = normalizeNewlines(fs.readFileSync(outputPath, 'utf8'));
  if (actual !== expected) throw new Error('changelog_0608_output_drift');
  process.stdout.write(`${JSON.stringify({ checked: path.relative(root, outputPath), sourceSha256: sourceHash, state: 'current' })}\n`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, expected, 'utf8');
  process.stdout.write(`${JSON.stringify({ output: path.relative(root, outputPath), sourceSha256: sourceHash, state: 'generated' })}\n`);
}
