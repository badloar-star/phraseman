// зачем (Макеты 12.10, spire-gap-001/002/004/005): dev-превью заданий Шпиля рисует тот же красный флажок «пожаловаться», что и боевой экран, но жалоба никуда не уходит.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev-превью Шпиля: флажок «пожаловаться»', () => {
  const preview = read('app/dev_spire_preview.tsx');

  it('слот флажка — ReportErrorButton icon-flag с testID spire-task-report-0 и пустым транспортом, только при answering && task', () => {
    expect(preview).toContain("import ReportErrorButton from '../components/ReportErrorButton';");
    expect(preview).toContain('reportSlot={preview.answering && preview.task ? (');
    expect(preview).toContain('variant="icon-flag" testID="spire-task-report-0" submitOverride={devPreviewReportTransport}');
    expect(preview).toContain("const devPreviewReportTransport = async (): Promise<'sent'> => 'sent';");
    expect(preview).not.toContain('reportSlot={null}');
  });

  it('раскладка строки флажка — как reportRow боевого экрана', () => {
    const live = read('components/spire/SpireStepScreen.tsx');
    const rule = "reportRow: { minHeight: 44, marginTop: 10, alignItems: 'flex-end', justifyContent: 'center' }";
    expect(live).toContain(rule);
    expect(preview).toContain(rule);
  });

  it('боевой флажок остаётся с рабочим транспортом (SpireTaskReportButton) и не скрывается overlays=off', () => {
    const button = read('modules/spire/SpireTaskReportButton.tsx');
    expect(button).toContain('submitOverride={async');
    const gate = read('components/ReportErrorButton.tsx');
    expect(gate).toContain('if (!props.submitOverride && isDevOverlaysOff()) {');
  });
});
