// Ступень Шпиля: «Дальше» перекрывает счётчик «k / 10» (находка Сверки 24.10; координатор: «верстка, не ужатие, лог [SPIRE-STEP-OVERLAP], тест»).
// Кадры Сверки a1/a4/a6/st4: счётчик был последней строкой прокрутки — полоса жестов Android его перечёркивала, а после неверного ответа блок «Правильно + Дальше» стоял поверх него.
// Тест держит раскладку: блок ответа с «Дальше» внутри прокрутки, счётчик — в своей полосе ПОД прокруткой (всегда виден, с отступом на низ экрана), без абсолютного позиционирования; и журнал с числами для устройства.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Ступень Шпиля: «Дальше» и счётчик не накладываются', () => {
  const src = read('components/spire/SpireStepScreen.tsx');
  const body = code(src);

  it('блок ответа с «Дальше» внутри прокрутки, счётчик — в своей полосе под ней', () => {
    const scroll = body.indexOf('<ScrollView');
    const hint = body.indexOf('testID="spire-step-hint"');
    const onward = body.indexOf('testID="spire-step-continue"');
    const counter = body.indexOf('testID="spire-step-counter"');
    const scrollEnd = body.indexOf('</ScrollView>');
    expect(scroll).toBeGreaterThan(0);
    expect(hint).toBeGreaterThan(scroll);
    expect(onward).toBeGreaterThan(hint);
    expect(counter).toBeGreaterThan(onward);
    expect(scrollEnd).toBeGreaterThan(onward);
    expect(scrollEnd).toBeLessThan(counter);
    expect(body).toContain('style={[s.counterBar, { paddingBottom: insets.bottom + 12 }]}');
  });

  it('у блока ответа, кнопки «Дальше» и счётчика нет абсолютного позиционирования и отрицательных отступов', () => {
    const styles = body.slice(body.indexOf('const s = StyleSheet.create'));
    for (const name of ['hint', 'onward', 'footer', 'content', 'counterBar', 'scroll']) {
      const line = new RegExp(`\\n\\s*${name}:\\s*\\{[^\\n]*\\}`, 'u').exec(styles)?.[0] ?? '';
      expect(line).not.toMatch(/position:\s*'absolute'|marginTop:\s*-|marginBottom:\s*-/u);
    }
  });

  it('журнал [SPIRE-STEP-OVERLAP]: окно прокрутки, содержимое, полоса счётчика, низ экрана; шрифт не сжимается', () => {
    expect(src).toContain('[SPIRE-STEP-OVERLAP]');
    expect(src).toContain('viewportH');
    expect(src).toContain('onLayout={onCounterLayout}');
    expect(body).not.toMatch(/adjustsFontSizeToFit/u);
  });
});
