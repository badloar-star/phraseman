import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('client report delivery contract', () => {
  it('awaits user and pack report writes so UI cannot show success for a swallowed server failure', () => {
    const source = read('app/user_report.ts');

    expect(source).toContain("Promise<'sent' | 'throttled' | 'failed'>");
    expect(source).toContain("await submitClientReportCallable('user_report'");
    expect(source).toContain("await submitClientReportCallable('community_pack_report'");
    expect(source).not.toContain("void submitClientReportCallable('user_report'");
    expect(source).not.toContain("void submitClientReportCallable('community_pack_report'");
  });

  it('awaits lesson bug report writes before granting success and XP feedback', () => {
    const source = read('app/error_report.ts');

    expect(source).toContain("export type ErrorReportResult = 'sent' | 'throttled' | 'invalid_comment' | 'failed'");
    expect(source).toContain("await submitClientReport('error_report'");
    expect(source.indexOf("await submitClientReport('error_report'")).toBeLessThan(
      source.indexOf("await AsyncStorage.setItem(THROTTLE_KEY"),
    );
    expect(source).not.toContain("void submitClientReport('error_report'");
  });

  it('shows a retry state when lesson bug report delivery fails', () => {
    const source = read('components/ReportErrorButton.tsx');

    expect(source).toContain("if (result === 'failed')");
    expect(source).toContain('setFailed(true)');
    expect(source).toContain('Попробовать снова');
  });
});
