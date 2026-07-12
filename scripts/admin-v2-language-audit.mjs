import fs from 'node:fs';
import path from 'node:path';

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(file);
    return /\.(?:html|js)$/.test(entry.name) ? [file.replaceAll('\\', '/')] : [];
  });
}

const files = collectFiles('admin/v2');
const forbiddenVisibleTerms = [
  'Preview одноразовых', 'Preview промокодов', 'Preview обновлён', 'Manual update',
  'Guarded publish', 'Guarded Remote Config', 'Server callable', 'AI jobs', 'config editor',
  'legacy working module', 'Native v2 слой', 'guarded workflow',
  'Product Manager Digest',
  'ANALYTICS_BIGQUERY_DATASET', 'error?.message', 'Где заканчиваются сессии',
  'Target build/version', 'Rollback reference:', 'Draft / выключено', 'stop condition',
  'Asset job', 'asset job', 'target path', 'server-side jobs', 'Storage output',
  'raw:', 'audited preview', 'audit log',
  'Campaign ID', 'Store destination:', 'Native v2', 'Production campaign',
  'force update', 'manual update', 'Maintenance:', 'Stop condition:', 'Rollback:',
  'Promo banner audience:', 'signed preview links', 'Generated asset preview',
  'server-side', 'inbox-сообщение', 'paywall gates', 'publish workflow',
  'production environment', 'Sandbox / Test Store', 'periodType=TRIAL', 'In-app signal',
  'webhook', 'lifecycle', 'DALL-E Asset Studio', 'server job workflow',
  'дефолтный reset', 'v2 Remote Config', 'v2 workflow', 'user command workflow',
  'like + dislike', 'серверный workflow',
  '<strong>Production</strong>', '<title>Phraseman Admin</title>',
];
const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (/[ÐÑ][\u0080-\u00bf]/.test(text)) findings.push({ file, line: 1, term: 'повреждённая UTF-8 кодировка' });
  for (const term of forbiddenVisibleTerms) {
    let index = text.indexOf(term);
    while (index >= 0) {
      findings.push({ file, line: text.slice(0, index).split(/\r?\n/).length, term });
      index = text.indexOf(term, index + term.length);
    }
  }
}


const rawPrimaryPatterns = [
  { file: 'admin/v2/scripts/admin-analytics-view.js', pattern: /<td>\$\{escapeHtml\(key\)\}<\/td>/, term: 'сырой ключ события как основная подпись' },
  { file: 'admin/v2/scripts/admin-analytics-view.js', pattern: /labels\[key\] \|\| key/, term: 'сырой ключ источника как основная подпись' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(item\.mailCategory \|\|/, term: 'сырая категория письма' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(gateState\)/, term: 'сырой статус отправки' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(pending\.state \|\|/, term: 'сырой статус подготовленной отправки' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(source\.state \|\| 'unknown'\)/, term: 'сырой статус источника' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(reports\.state\)/, term: 'сырой статус очереди репортов' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /<b>\$\{escapeHtml\(key\)\}:<\/b>/, term: 'сырое имя поля контекста' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(item\.audience \|\| 'all'\)/, term: 'сырой код аудитории' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /escapeHtml\(job\.kind \|\| 'generic'\)/, term: 'сырой тип задания изображения' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /статус \$\{escapeHtml\(row\.status\)\}/, term: 'сырой статус операции' },
  { file: 'admin/v2/scripts/admin-core.js', pattern: /String\(result\?\.state \|\| 'неизвестное состояние'\)/, term: 'сырой результат отправки' },
  { file: 'admin/v2/migration.html', pattern: /row\.linkedFunctions\.join/, term: 'внутренние функции как основное объяснение' },
];
for (const rule of rawPrimaryPatterns) {
  const text = fs.readFileSync(rule.file, 'utf8');
  if (rule.pattern.test(text)) findings.push({ file: rule.file, line: 1, term: rule.term });
}

console.log(JSON.stringify({ checkedFiles: files.length, hardTermFindings: findings.length, findings }, null, 2));
if (process.argv.includes('--fail-on-hard-terms') && findings.length) process.exit(1);
