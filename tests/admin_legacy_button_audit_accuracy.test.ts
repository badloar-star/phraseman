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

  test('uses stable button keys for exact one-to-many handler linkage', () => {
    const run = spawnSync(process.execPath, ['scripts/admin-legacy-button-audit.mjs'], { cwd: root, encoding: 'utf8' });
    expect(run.status).toBe(0);
    const buttons = JSON.parse(fs.readFileSync(path.join(root, '.codex-tmp', 'admin-audit', 'legacy-buttons.json'), 'utf8')) as {
      buttonKey: string;
      onclick: string;
    }[];
    const links = JSON.parse(fs.readFileSync(path.join(root, '.codex-tmp', 'admin-audit', 'legacy-button-function-links.json'), 'utf8')) as {
      buttonKey: string;
      function: string;
    }[];

    expect(new Set(buttons.map((button) => button.buttonKey)).size).toBe(buttons.length);
    const knownKeys = new Set(buttons.map((button) => button.buttonKey));
    expect(links.every((link) => knownKeys.has(link.buttonKey))).toBe(true);

    const generationButton = buttons.find((button) => button.onclick === 'generateDailyDigest()');
    const refreshButton = buttons.find((button) => button.onclick === 'loadDailyDigest(true)');
    expect(generationButton?.buttonKey).toBeTruthy();
    expect(refreshButton?.buttonKey).toBeTruthy();
    expect(links.filter((link) => link.buttonKey === generationButton?.buttonKey).map((link) => link.function)).toEqual(['generateDailyDigest']);
    expect(links.filter((link) => link.buttonKey === refreshButton?.buttonKey).map((link) => link.function)).toEqual(['loadDailyDigest']);
  });

  test('does not attribute script-template buttons to the last static tab', () => {
    const run = spawnSync(process.execPath, ['scripts/admin-legacy-button-audit.mjs'], { cwd: root, encoding: 'utf8' });
    expect(run.status).toBe(0);
    const buttons = JSON.parse(fs.readFileSync(path.join(root, '.codex-tmp', 'admin-audit', 'legacy-buttons.json'), 'utf8')) as {
      provenance: 'static-html' | 'script-template';
      tab: string | null;
    }[];
    const templateButtons = buttons.filter((button) => button.provenance === 'script-template');

    expect(templateButtons.length).toBeGreaterThan(0);
    expect(templateButtons.every((button) => button.tab === null)).toBe(true);
    expect(templateButtons.some((button) => button.tab === 'openai-budget')).toBe(false);
  });
});
