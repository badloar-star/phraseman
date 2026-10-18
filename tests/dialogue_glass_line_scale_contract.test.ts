import fs from 'fs';
import path from 'path';

// 18.10 (аудит Диалогов, шрифт 1,3): плашка ошибки с «Повторить» и экран-гейт держали межстрочный жёстким (22/32) —
// при крупном системном шрифте строки слипались и подрезались. Теперь межстрочный растёт с кеглем в пределе maxFontSizeMultiplier.
describe('Dialogue glass error plate and gate scale line height with the system font', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'dialogs', 'glass', 'DialogueGlassKit.tsx'), 'utf8').replace(/\r\n/g, '\n');

  it('error plate text', () => {
    const plate = src.slice(src.indexOf('export function DialogueGlassSysError('), src.indexOf('export function DialogueGlassSysError(') + 1400);
    expect(plate).toContain('const lh = useLineScale();');
    expect(plate).toContain('maxFontSizeMultiplier={1.4} style={[styles.sysErrText, { color: glass.secondary, lineHeight: lh(22, 1.4) }]}');
  });

  it('gate title and text', () => {
    expect(src).toContain('maxFontSizeMultiplier={1.3} style={[styles.gateTitle, { color: glass.text, lineHeight: lh(32, 1.3) }]}');
    expect(src).toContain('maxFontSizeMultiplier={1.4} style={[styles.gateText, { color: glass.secondary, lineHeight: lh(22, 1.4) }]}');
  });
});
