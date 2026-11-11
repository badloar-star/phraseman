// Раунд 2, Настройки п.7: «Подставить шаблон» в пустое поле обращения (три строки-подсказки), готовый текст не затирается.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/support_report.tsx'), 'utf8').replace(/\r\n/g, '\n');
describe('Поддержка: шаблон обращения', () => {
  it('кнопка видна только при пустом поле и использует централизованный шаблон', () => {
    expect(src).toContain('{description.trim().length === 0 ? (');
    expect(src).toContain('testID="support-report-template"');
    expect(src).toContain("import { getSupportReportTemplate, isSupportReportCommentValid } from './support_report_validation';");
    expect(src).toContain('onPress={() => setDescription(getSupportReportTemplate(lang))}');
  });
  it('без новой подписи мелким шрифтом: кнопка 15 px, без обводки', () => {
    const block = src.slice(src.indexOf('support-report-template'), src.indexOf('support-report-failed')); // 11.11: карточка диагностики убрана, блок шаблона кончается перед плашкой сбоя
    expect(block).toContain('fontSize: scaled(15)');
    expect(block).not.toMatch(/border(Width|Color)\s*:/);
  });
  it('срок ответа «1–2 дня» остаётся на экране «Обращение отправлено»', () => {
    expect(src).toContain('testID="support-sent-eta"');
  });
});
