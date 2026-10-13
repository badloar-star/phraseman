// зачем (разбор зон 13.10, dialogs-013/036/gap-016): название сцены в шапке диалога — одна строка с «…» (образец dialogs.html `.dh .ti`), а не перенос на две.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/DialogueV2SessionScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('шапка диалога: название сцены', () => {
  it('одна строка с многоточием, без сжатия шрифта; настроение рядом — тоже одна строка', () => {
    const at = src.indexOf('accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail"');
    expect(at).toBeGreaterThan(0);
    const line = src.slice(at, src.indexOf('{title}', at));
    expect(line).toContain("fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2");
    expect(line).not.toContain('adjustsFontSizeToFit');
    expect(src).toContain('<Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={{ flexShrink: 1, color: glass.secondary');
  });
});
