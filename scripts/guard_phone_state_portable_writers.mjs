import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'config/phone-state-legacy-inventory.v1.json'), 'utf8'));
const args = process.argv.slice(2);
const filters = new Set(args.flatMap((arg, index) => arg === '--domain' ? [args[index + 1]] : []).filter(Boolean));
const ownerForDomain = (domain) => ({
  economy: 'economy', cards: 'cards', theory: 'cards', practice: 'practice', personal: 'practice', prep: 'practice',
  learning_v2: 'learning_v2', preferences: 'preferences', lang: 'preferences', user: 'preferences',
  device: 'preferences', notification: 'preferences', notifications: 'preferences', notif: 'preferences',
}[domain] ?? 'progress');
const exact = new Map(inventory.rows.filter((row) => row.scope === 'portable').map((row) => [row.key, ownerForDomain(row.domain)]));
const prefixes = inventory.prefixRules.filter((row) => row.scope === 'portable').map((row) => [row.prefix, ownerForDomain(row.domain)]);
const ownerForKey = (key) => exact.get(key) ?? (() => {
  const matches = prefixes.filter(([prefix]) => key.startsWith(prefix));
  return matches.length === 1 ? matches[0][1] : null;
})();

const roots = ['app', 'components', 'hooks', 'lib', 'modules'];
const files = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
};
for (const relative of roots) visit(path.join(root, relative));

const ownerFacadeFragments = {
  progress: [
    'modules/phone-state/domains/progress_',
    'app/phone_state_progress_register_bridge.ts',
    'app/phone_state_runtime.ts',
  ],
  preferences: ['modules/phone-state/domains/preferences.ts'],
  cards: ['modules/phone-state/domains/cards.ts'],
  practice: ['modules/phone-state/domains/practice.ts'],
  economy: ['modules/phone-state/domains/economy.ts'],
  learning_v2: ['modules/phone-state/domains/learning_v2.ts'],
};
const sharedAllowed = ['modules/phone-state/legacy_reader.ts', 'modules/phone-state/legacy_mirror.ts'];
const violations = [];
const pattern = /(?:AsyncStorage\.(?:setItem|multiSet)|storageSet(?:String|Number))\(\s*['"]([^'"]+)['"]/g;
for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const owner = ownerForKey(match[1]);
    if (!owner || (filters.size > 0 && !filters.has(owner))) continue;
    if ([...sharedAllowed, ...(ownerFacadeFragments[owner] ?? [])].some((allowed) => relative.includes(allowed))) continue;
    violations.push({ file: relative, line: source.slice(0, match.index).split(/\r?\n/).length, key: match[1], owner });
  }
}
violations.sort((left, right) => left.owner.localeCompare(right.owner) || left.file.localeCompare(right.file) || left.line - right.line);
const counts = Object.fromEntries([...new Set(violations.map((item) => item.owner))].sort().map((owner) => [owner, violations.filter((item) => item.owner === owner).length]));
console.log(JSON.stringify({ violations: violations.length, counts, sample: violations.slice(0, 50) }, null, 2));
if (violations.length > 0) process.exitCode = 1;
