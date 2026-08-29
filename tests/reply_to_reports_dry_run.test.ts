const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'reply_to_reports.mjs'), 'utf8');

test('report reply script keeps Firebase transport out of dry-run mode', () => {
  expect(script).toContain('let admin;');
  expect(script).toContain("const send = process.argv.includes('--send');");
  expect(script).toContain('if (dryRun) {');
  expect(script).toContain("admin = require('firebase-admin');");
  expect(script.indexOf('if (dryRun) {')).toBeLessThan(script.indexOf("admin = require('firebase-admin');"));
  expect(script).toContain('Live-режим требует явного флага --send');
  expect(script).toContain('function sanitizePreparedReplyBody');
  expect(script).toContain('const body = sanitizePreparedReplyBody(row.body).slice(0, BODY_MAX)');
  expect(script).not.toContain("const admin = require('firebase-admin');");
});
