import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const roots = [path.join(__dirname, '..', 'app'), path.join(__dirname, '..', 'components')];
const files: string[] = [];
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
for (const root of roots) walk(root);
const matches = files.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(/\.onSnapshot\s*\(/gu)].map(() => path.relative(path.join(__dirname, '..'), file).replaceAll('\\', '/'));
});
assert.deepEqual(matches.sort(), ['app/remote_account_deletion_monitor.ts', 'components/PremiumContext.tsx'].sort());
console.log('FIRESTORE LISTENER ALLOWLIST: PASS');
