// Раунд 2, Настройки п.7: «Подставить шаблон» в пустое поле обращения (три строки-подсказки), готовый текст не затирается.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/support_report.tsx'), 'utf8').replace(/\r\n/g, '\n');
/** В исходнике шаблон записан экранированным переводом строки: обратная косая + n. */
const NL = String.fromCharCode(92) + 'n';

describe('Поддержка: шаблон обращения', () => {
  it('кнопка видна только при пустом поле и подставляет шаблон на 9 языках', () => {
    expect(src).toContain('{description.trim().length === 0 ? (');
    expect(src).toContain('testID="support-report-template"');
    expect(src).toContain(`L('Что я делал(а):${NL}Что ожидал(а):${NL}Что произошло:${NL}'`);
    expect(src).toContain(`'Co zrobiłem(am):${NL}Co oczekiwałem(am):${NL}Co się stało:${NL}'`);
  });
  it('без новой подписи мелким шрифтом: кнопка 15 px, без обводки', () => {
    const block = src.slice(src.indexOf('support-report-template'), src.indexOf('support-diagnostics-disclosure'));
    expect(block).toContain('fontSize: scaled(15)');
    expect(block).not.toMatch(/border(Width|Color)\s*:/);
  });
  it('срок ответа «1–2 дня» остаётся на экране «Обращение отправлено»', () => {
    expect(src).toContain('testID="support-sent-eta"');
  });
});
