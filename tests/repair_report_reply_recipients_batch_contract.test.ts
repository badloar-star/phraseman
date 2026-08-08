import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.join(__dirname, '..', 'scripts', 'repair_report_reply_recipients_batch.mjs');

describe('batch report reply recipient repair tool', () => {
  test('is audit-file driven, dry-run by default, transactional, and avoids profile overwrite', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).toContain("process.argv.includes('--apply')");
    expect(source).toContain("'--audit-file'");
    expect(source).toContain('candidate.safe !== true');
    expect(source).toContain('runTransaction');
    expect(source).toContain('already_repaired');
    expect(source).toContain('th.exists');
    expect(source).toContain('targetHelperUpdate');
    expect(source).toContain('repair_report_reply_recipient_batch');
    expect(source).toContain('.codex-tmp');
  });
});
