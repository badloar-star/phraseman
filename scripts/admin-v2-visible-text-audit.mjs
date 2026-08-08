import fs from 'node:fs';

const html = fs.readFileSync('admin/v2/index.html', 'utf8');

const blockedTerms = [
  'approval',
  'audit',
  'preview',
  'paywall',
  'refunds',
  'revenue',
  'timeline',
  'UGC',
  'community packs',
  'Marketplace',
  'Marketplace health',
  'tasks',
  'pending review',
  'explain reports',
  'explain cache',
  'content signals',
  'app errors',
  'stale',
  'custom claim',
  'remote config',
  'feature flags',
  'query contract',
  'write-flow',
  'permissions',
  'lifecycle',
  'Ops Log'
];

const visible = [];

for (const attr of ['data-tooltip', 'placeholder', 'aria-label', 'title']) {
  const re = new RegExp(`${attr}="([^"]*)"`, 'g');
  for (const match of html.matchAll(re)) {
    visible.push({ source: attr, text: decode(match[1]) });
  }
}

const textOnly = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .split(/\r?\n/)
  .map((line) => decode(line.trim()))
  .filter(Boolean);

textOnly.forEach((text) => visible.push({ source: 'text', text }));

const findings = [];
for (const item of visible) {
  for (const term of blockedTerms) {
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(item.text)) {
      findings.push({ term, ...item });
    }
  }
}

console.log(JSON.stringify({
  visibleItems: visible.length,
  blockedFindings: findings.length,
  findings
}, null, 2));

if (process.argv.includes('--fail') && findings.length) {
  process.exit(1);
}

function decode(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
