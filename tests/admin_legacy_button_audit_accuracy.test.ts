import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');

describe('legacy admin audit accuracy', () => {
  test('resolves assigned, external and browser-native button handlers', () => {
    const run = spawnSync(process.execPath, ['scripts/admin-legacy-button-audit.mjs'], { cwd: root, encoding: 'utf8' });
    expect(run.status).toBe(0);
    const summary = JSON.parse(fs.readFileSync(path.join(root, '.codex-tmp', 'admin-audit', 'legacy-functions-summary.json'), 'utf8'));
    const links = JSON.parse(fs.readFileSync(path.join(root, '.codex-tmp', 'admin-audit', 'legacy-button-function-links.json'), 'utf8'));
    expect(summary.missingFunctions).toBe(0);
    expect(links.filter((link: { found: boolean }) => !link.found)).toEqual([]);
  });
});
