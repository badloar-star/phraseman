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

  it('awaits lesson bug report writes before throttle and XP side effects', () => {
    const source = read('app/error_report.ts');

    expect(source).toContain("export type ErrorReportResult = 'sent' | 'throttled' | 'invalid_comment' | 'failed'");
    expect(source).toContain("await submitClientReport('error_report'");
    expect(source.indexOf("await submitClientReport('error_report'")).toBeLessThan(
      source.indexOf("await AsyncStorage.setItem(THROTTLE_KEY"),
    );
    expect(source).not.toContain("void submitClientReport('error_report'");
  });

  it('shows optimistic accepted UI while lesson bug report delivery continues in the background', () => {
    const source = read('components/ReportErrorButton.tsx');

    expect(source.indexOf('setSent(true);')).toBeLessThan(source.indexOf('void (async () =>'));
    expect(source).toContain('Отправляем в фоне');
    expect(source).toContain("onPress={() => setVisible(false)}");
    // зачем (D02/D70, 2.0): осколки убраны — отчёт об ошибке больше не награждается (раньше успешная отправка вызывала onSuccess?.(10) ровно
    // на 10 осколков, строка стояла ПОСЛЕ ветки отказа). Охраняем обратное: награды за отчёт в окне нет совсем.
    expect(source).not.toContain('onSuccess');
  });

  it('shows a retry state when lesson bug report delivery fails', () => {
    const source = read('components/ReportErrorButton.tsx');

    expect(source).toContain("if (result === 'failed')");
    expect(source).toContain('setFailed(true)');
    expect(source).toContain('Попробовать снова');
  });

  it('offers a typed transport override while preserving the standard flag UX for Spire', () => {
    const button = read('components/ReportErrorButton.tsx');
    const wrapper = read('modules/spire/SpireTaskReportButton.tsx');
    const stepScreen = read('components/spire/SpireStepScreen.tsx');
    expect(button).toContain('submitOverride?: ReportErrorSubmitOverride');
    expect(button).toContain('result = await submitOverride({ comment: optimisticComment })');
    expect(wrapper).toContain('variant="icon-flag"');
    expect(wrapper).toContain('buildSpireTaskReportSubmission');
    expect(wrapper).not.toContain('router.');
    expect(stepScreen).toContain('<SpireTaskReportButton');
    expect(stepScreen).toContain('stableUid: uid');
    expect(stepScreen).toContain('studyTarget: reportableTarget');
    expect(stepScreen).toContain("studyTarget === 'it'");
    expect(stepScreen).toContain('removeFromRemainingRun=');
  });
});
