import fs from 'node:fs';

const file = 'admin/v2/scripts/admin-firebase.js';
const source = fs.readFileSync(file, 'utf8');

const blocked = [
  '????',
  'Community v2',
  'Campaigns v2',
  'Team v2',
  'UGC moderation',
  'Marketplace не загружен',
  'League chat не загружен',
  'Arena live',
  'New explain reports',
  'Cache health',
  'Published packs',
  'Daily phrases publish',
  'Card pack publish',
  'Explain cache reset',
  'Source health',
  'review first',
  'guarded',
  'draft/unpublished',
  'no category',
  ' shards',
  ' cards',
  'sales ',
  'Queue, reports',
  'Read-only query',
  'pending submissions',
  'pack reports',
  'custom claim',
  'admin claim',
  'claim admin',
  'approval requests ждут',
  'critical app_errors',
  'reports в inbox',
  'scheduled push jobs',
  'rules/caps/quiet hours',
  'Frequency caps',
  'Quiet hours'
];

const allowLine = [
  /\bgetFirestore\b/,
  /\bpreview[A-Z]/,
  /data-action="preview-/,
  /\bstatus:\s*'approved'/,
  /\bapproved(By|At|AtMs)\b/,
  /\bclaims\b/,
  /result\.claims/,
  /claimKeys/,
  /collectionName === 'league_chat_messages'/,
  /renderCommunityMarketplace/,
  /const cards = \[/,
  /cards\.map/,
  /data\.shards/,
  /const sales = /
];

const findings = [];
source.split(/\r?\n/).forEach((line, index) => {
  if (allowLine.some((re) => re.test(line))) return;
  blocked.forEach((term) => {
    if (line.includes(term)) {
      findings.push({ line: index + 1, term, text: line.trim() });
    }
  });
});

console.log(JSON.stringify({
  file,
  blockedFindings: findings.length,
  findings
}, null, 2));

if (process.argv.includes('--fail') && findings.length) {
  process.exit(1);
}
