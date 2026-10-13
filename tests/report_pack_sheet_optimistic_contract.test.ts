// зачем (решение владельца 13.10 09:20, cards-020; образец cards-states.html `packReport`): жалоба на набор — нижняя шторка с радио-причинами и
// полем комментария; «Отправить» закрывает шторку СРАЗУ и показывает тост, ответ сервера догоняет фоном; двойной тап не шлёт дважды.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/ReportPackModal.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('жалоба на набор: нижняя шторка по макету', () => {
  it('нижняя шторка, а не окно по центру; шесть причин с радио, поле комментария, две кнопки', () => {
    expect(src).toContain('<HybridSheetShell');
    expect(src).not.toContain('<Modal');
    expect(src).not.toContain('HybridAlertShell');
    for (const id of ['offensive', 'sexual', 'spam', 'copyright', 'wrong_translation', 'other']) expect(src).toContain(`id: '${id}'`);
    expect(src).toContain('accessibilityRole="radio"');
    expect(src).toContain('testID="report-pack-comment"');
    expect(src).toContain('testID="report-pack-cancel"');
    expect(src).toContain('testID="report-pack-send"');
    expect(src).toContain('flex: 1.4'); // макет: «Отмена» 1, «Отправить жалобу» 1,4
    expect(src).not.toMatch(/\{comment\.length\}\/500/); // в макете счётчика нет
  });

  it('Optimistic UI: шторка закрывается и тост показывается до ответа сервера; замок от двойного тапа', () => {
    const dismiss = src.indexOf('requestDismiss();');
    const toast = src.indexOf("actionToastTri('success'");
    const submit = src.indexOf('await submitPackReport(payload)');
    expect(toast).toBeGreaterThan(-1);
    expect(dismiss).toBeGreaterThan(toast);
    expect(submit).toBeGreaterThan(dismiss);
    expect(src).toContain('if (sendInFlightRef.current)');
    expect(src).toContain('sendInFlightRef.current = true;');
    expect(src).toContain('sendInFlightRef.current = false;');
  });

  it('сбой и лимит 30 с — тосты, а не немой откат; каждый выход пишет причину в [PACK-REPORT]', () => {
    expect(src).toContain("r === 'throttled'");
    expect(src).toContain("actionToastTri('warning'");
    expect(src).toContain("r === 'failed'");
    expect(src).toContain("actionToastTri('error'");
    expect(src).toContain("const LOG = '[PACK-REPORT]'");
    expect(src).not.toMatch(/catch\s*\{\s*\}/);
    for (const phrase of ['открыта шторка', 'выбрана причина', 'отправка:', 'ответ:', 'тост ошибки', 'отправка нажата без причины']) expect(src).toContain(phrase);
  });

  it('отправка тем же путём: тот же submitPackReport и те же поля, комментарий до 500', () => {
    expect(src).toContain("import { submitPackReport, type PackReportReason } from '../app/user_report';");
    expect(src).toContain('{ packId, packTitle, authorStableId, studyTarget, reason: selected, comment: comment.trim() }');
    expect(src).toContain('maxLength={500}');
  });
});
