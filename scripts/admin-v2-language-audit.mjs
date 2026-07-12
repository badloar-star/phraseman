import fs from 'node:fs';

const files = [
  'admin/v2/index.html',
  'admin/v2/scripts/admin-core.js',
  'admin/v2/scripts/admin-firebase.js',
  'admin/v2/scripts/admin-router.js',
  'admin/v2/scripts/admin-operational-snapshot.js'
];

const hardTerms = [
  'Preview',
  'Query contract',
  'Campaign Wizard',
  'Feature flags',
  'Flag Registry',
  'Launch readiness',
  'Saved views',
  'Rollback Center',
  'Reports Inbox',
  'Audit Log',
  'App Health',
  'Release Health',
  'Team registry',
  'Audit coverage',
  'read-only',
  'guarded mode',
  'fallback',
  'workflow'
];

const allowedTechnicalKeys = [
  'remote_config',
  'admin_log',
  'app_errors',
  'user_reports',
  'error_reports',
  'admin_push_jobs',
  'remote_config_history',
  'campaign_id'
];

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const term of hardTerms) {
    let index = text.indexOf(term);
    while (index !== -1) {
      const line = lineNumber(text, index);
      const lineText = text.split(/\r?\n/)[line - 1] || '';
      if (!isKnownTranslationDictionaryLine(file, lineText) && !isNonVisibleCodeHit(file, text, index, term, lineText)) {
        findings.push({
          file,
          line,
          term,
          type: file.endsWith('.html') ? 'html-visible-hard-term' : 'js-visible-hard-term'
        });
      }
      index = text.indexOf(term, index + term.length);
    }
  }

  for (const term of allowedTechnicalKeys) {
    const matches = [...text.matchAll(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
    if (matches.length > 0) {
      findings.push({
        file,
        line: lineNumber(text, matches[0].index ?? 0),
        term,
        count: matches.length,
        type: 'technical-key-visible-or-contract'
      });
    }
  }
}

const grouped = findings.reduce((acc, item) => {
  const key = `${item.file}:${item.type}`;
  acc[key] ||= [];
  acc[key].push(item);
  return acc;
}, {});

console.log(JSON.stringify({
  checkedFiles: files.length,
  htmlHardTermFindings: findings.filter((item) => item.type === 'html-visible-hard-term').length,
  jsHardTermFindings: findings.filter((item) => item.type === 'js-visible-hard-term').length,
  hardTermFindings: findings.filter((item) => item.type.endsWith('visible-hard-term')).length,
  technicalKeyOccurrences: findings
    .filter((item) => item.type === 'technical-key-visible-or-contract')
    .reduce((sum, item) => sum + (item.count || 1), 0),
  grouped
}, null, 2));

if (process.argv.includes('--fail-on-hard-terms') && findings.some((item) => item.type.endsWith('visible-hard-term'))) {
  process.exit(1);
}

function isKnownTranslationDictionaryLine(file, lineText) {
  return file.endsWith('admin-core.js') && /^\s*\['/.test(lineText) && lineText.includes("', '");
}

function isNonVisibleCodeHit(file, text, index, term, lineText) {
  if (file.endsWith('.html')) return false;
  const localIndex = Math.max(0, lineText.indexOf(term));
  const before = text[index - 1] || '';
  const after = text[index + term.length] || '';
  if (/[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)) return true;
  if (!/<[^>]+>/.test(lineText) && !isInsideQuotedText(lineText, localIndex)) return true;
  return false;
}

function isInsideQuotedText(lineText, index) {
  let quote = '';
  let escaped = false;
  for (let i = 0; i < lineText.length; i += 1) {
    const char = lineText[i];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (quote) {
      if (char === quote) quote = '';
    } else if (char === '\'' || char === '"' || char === '`') {
      quote = char;
    }
    if (i === index) return Boolean(quote);
  }
  return false;
}
