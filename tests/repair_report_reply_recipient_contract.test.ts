import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.join(__dirname, '..', 'scripts', 'repair_report_reply_recipient.mjs');

describe('report reply recipient repair tool', () => {
  test('is dry-run by default and requires explicit apply plus exact identity expectations', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).toContain("process.argv.includes('--apply')");
    expect(source).toContain("'--source-uid'");
    expect(source).toContain("'--target-uid'");
    expect(source).toContain("'--message-id'");
    expect(source).toContain("'--notification-id'");
    expect(source).toContain('claimed === true');
    expect(source).toContain('runTransaction');
    expect(source).toContain('repair_report_reply_recipient');
    expect(source).toContain('.codex-tmp');
  });
});
