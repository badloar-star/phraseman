import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'scrub_max_voice_safety_flags.mjs');

describe('MAX legacy safety flag scrub migration', () => {
  test('builds a patch that removes identity, conversation, session and retention fields', () => {
    const row = {
      mode: 'voice_tutor', category: 'self_harm', source: 'keywords', handled: false,
      uid: 'stable-private', authUid: 'auth-private', userText: 'private message',
      historyContext: [{ role: 'user', content: 'private context' }], transcript: 'full private transcript',
      sessionId: 'private-session', retainUntilMs: 123, retentionReason: 'legal_safety',
    };
    const stdout = execFileSync(process.execPath, [script, '--transform-json', JSON.stringify(row)], {
      cwd: root,
      encoding: 'utf8',
    });
    const result = JSON.parse(stdout) as { applicable: boolean; deleteFields: string[] };
    expect(result.applicable).toBe(true);
    expect(result.deleteFields).toEqual(expect.arrayContaining([
      'uid', 'authUid', 'userText', 'historyContext', 'transcript',
      'sessionId', 'retainUntilMs', 'retentionReason',
    ]));
    const second = execFileSync(process.execPath, [script, '--transform-json', JSON.stringify({
      mode: row.mode,
      category: row.category,
      source: row.source,
      handled: row.handled,
    })], { cwd: root, encoding: 'utf8' });
    expect(JSON.parse(second)).toEqual({ applicable: true, deleteFields: [] });
  });

  test('is dry-run by default and requires an explicit apply flag', () => {
    const source = fs.readFileSync(script, 'utf8');
    expect(source).toContain("process.argv.includes('--apply')");
    expect(source).toContain('DRY RUN');
    expect(source).not.toMatch(/process\.argv\.includes\('--dry-run'\).*\?\s*false/);
  });

  test.each([
    ['missing confirmation', ['--project=test-project', '--apply']],
    ['mismatched confirmation', ['--project=test-project', '--apply', '--confirm-project=other-project']],
  ])('fails %s before importing Firebase Admin', (_label, args) => {
    const result = require('node:child_process').spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain('--confirm-project=<same-project>');
    expect(`${result.stdout}\n${result.stderr}`).not.toContain('firebase-admin');
    const source = fs.readFileSync(script, 'utf8');
    expect(source.indexOf("confirmedProjectId !== projectId")).toBeLessThan(source.indexOf("import('firebase-admin/app')"));
  });
});
