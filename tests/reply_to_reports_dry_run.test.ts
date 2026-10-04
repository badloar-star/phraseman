const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'reply_to_reports.mjs'), 'utf8');
const rewards = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'reply_to_reports_rewards.mjs'), 'utf8');

test('report reply script keeps Firebase transport out of dry-run mode', () => {
  expect(script).toContain('let admin;');
  // D109 (04.10): предпросмотр по умолчанию, запись только явным --send (и --dry-run всегда сильнее).
  expect(script).toContain("const dryRun = resolveRunMode(process.argv.slice(3)) === 'dry-run';");
  expect(rewards).toContain("argv.includes('--send') && !argv.includes('--dry-run') ? 'send' : 'dry-run'");
  expect(script).toContain('if (dryRun) {');
  expect(script).toContain("admin = require('firebase-admin');");
  expect(script.indexOf('if (dryRun) {')).toBeLessThan(script.indexOf("admin = require('firebase-admin');"));
  expect(script).toContain('Реальная отправка — только с флагом --send');
  expect(rewards).toContain('export function sanitizePreparedReplyBody');
  expect(rewards).toContain('const body = sanitizePreparedReplyBody(row?.body).slice(0, BODY_MAX)');
  expect(script).not.toContain("const admin = require('firebase-admin');");
});
