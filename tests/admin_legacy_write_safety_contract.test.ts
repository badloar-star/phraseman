import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = fs.readFileSync(path.join(process.cwd(), 'admin/index.html'), 'utf8');

function functionBody(name: string): string {
  const startToken = `window.${name} =`;
  const start = source.indexOf(startToken);
  expect(start).toBeGreaterThanOrEqual(0);
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const indent = source.slice(lineStart, start).match(/^\s*/)?.[0] ?? '';
  const end = source.indexOf(`\n${indent}};`, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 5);
}

describe('legacy admin write safety while modules remain embedded in Admin v2', () => {
  test.each([
    'saveRemoteConfig',
    'savePromoCode',
    'createPromoCodesBatch',
    'saveWeeklyBoons',
    'saveControlPanelMaintenance',
    'savePaywallAb',
    'saveAlertsConfig',
    'sendAlertTest',
  ])('%s requires an explicit reason or confirmation before writing', (name) => {
    expect(functionBody(name)).toMatch(/showInputModal|showConfirmModal/);
  });

  test.each([
    'savePromoCode',
    'repairAdminGrantPremiumCompat',
    'markAppHealthStatus',
    'arCloseRoom',
    'arDeleteRoom',
  ])('%s records the completed operation in the admin audit log', (name) => {
    expect(functionBody(name)).toContain('logAction(');
  });

  test('the complete linked write inventory has no unconfirmed or unaudited operations', () => {
    const run = spawnSync(process.execPath, ['scripts/admin-legacy-button-audit.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(run.status).toBe(0);
    const summary = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.codex-tmp/admin-audit/legacy-functions-summary.json'), 'utf8'));
    expect(summary.missingFunctions).toBe(0);
    expect(summary.linkedWritesNoConfirm).toBe(0);
    expect(summary.linkedWritesNoAudit).toBe(0);
  });
});
