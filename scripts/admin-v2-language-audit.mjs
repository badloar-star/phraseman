import fs from 'node:fs';

const files = [
  'admin/v2/index.html', 'admin/v2/scripts/admin-core.js', 'admin/v2/scripts/admin-firebase.js',
  'admin/v2/scripts/admin-router.js', 'admin/v2/scripts/admin-capabilities.js',
  'admin/v2/scripts/admin-analytics-view.js', 'admin/v2/scripts/components/analytics-language.js',
  'admin/v2/scripts/pages/product-analytics.js', 'admin/v2/scripts/pages/product-sessions.js',
  'admin/v2/scripts/pages/learning-diagnostics.js', 'admin/v2/scripts/pages/conversion-diagnostics.js',
  'admin/v2/scripts/pages/retention-diagnostics.js', 'admin/v2/scripts/pages/subscription-analytics.js',
];
const forbiddenVisibleTerms = [
  'Preview одноразовых', 'Preview промокодов', 'Preview обновлён', 'Manual update',
  'Guarded publish', 'Guarded Remote Config', 'Server callable', 'AI jobs', 'config editor',
  'legacy working module', 'Native v2 слой', 'guarded workflow',
  'Product Manager Digest',
  'ANALYTICS_BIGQUERY_DATASET', 'error?.message', 'Где заканчиваются сессии',
];
const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const term of forbiddenVisibleTerms) {
    let index = text.indexOf(term);
    while (index >= 0) {
      findings.push({ file, line: text.slice(0, index).split(/\r?\n/).length, term });
      index = text.indexOf(term, index + term.length);
    }
  }
}

console.log(JSON.stringify({ checkedFiles: files.length, hardTermFindings: findings.length, findings }, null, 2));
if (process.argv.includes('--fail-on-hard-terms') && findings.length) process.exit(1);
