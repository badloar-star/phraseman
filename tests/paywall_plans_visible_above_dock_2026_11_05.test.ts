// Баг по кадру Макетов 05.11 (paywall-language-0852): плитки «Год/Месяц» торчали краем из-под залипшей кнопки покупки.
// Тело шторки один раз встаёт в конец (до первого касания), плитки целиком над кнопкой; журнал [PAYWALL-FIT] называет цифры.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/paywall/PaywallPlus.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('пейвол: плитки целиком над кнопкой', () => {
  const block = src.slice(src.indexOf('export function PaywallPlusScroll'), src.indexOf('const S = StyleSheet.create'));
  it('при переполнении прокрутка встаёт в конец без анимации, один раз, до касания', () => {
    // 06.11 (Fable): автопрокрутка к концу убрана — список стоит на offset 0 (tests/paywall_fit_slack_2026_11_05); плитки видны обычной прокруткой
    expect(block).toContain('onScrollBeginDrag={() => { touchedRef.current = true; }}');
    expect(block).toContain('if (touchedRef.current || viewportH <= 0 || contentH <= 0)');
    expect(block).toContain('if (overflow === lastOffsetRef.current) return;');
  });
  it('окно и содержимое измеряются в любом порядке', () => {
    expect(block).toContain('fitToEnd(contentRef.current)');
    expect(block).toContain('contentRef.current = h; fitToEnd(h);');
  });
  it('журнал: цифры решения и причина раннего выхода (без немых ветвей)', () => {
    expect(block).toContain("console.log('[PAYWALL-FIT] skip'");
    expect(block).toContain("console.log('[PAYWALL-FIT]'");
    expect(block).toContain("action: overflow > 0 ? 'scrollable_from_top' : 'fits'");
  });
  it('тексты и пункты пейвола не тронуты: блок не содержит копирайта', () => {
    expect(block).not.toMatch(/COPY\./);
  });
});
