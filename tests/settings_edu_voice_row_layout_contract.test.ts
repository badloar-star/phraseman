// зачем (settings-gap-034, кадр 13.10 02:25Z): подпись голоса «Австралия · 2» складывалась в три строки — колонка названия
// не сжималась. Образец settings-gaps-states.html: `.gs-tx { flex:1; min-width:0 }`, `.gs-vv { flex:none; max-width:120px }`.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_edu.tsx'), 'utf8').replace(/\r\n/g, '\n');
const row = src.slice(src.indexOf('testID="fc-voice-picker-row"'), src.indexOf('</PressableHybrid>', src.indexOf('testID="fc-voice-picker-row"')));

describe('settings_edu: строка «Голос озвучки (EN)» раскладывается как в образце', () => {
  it('колонка названия сжимается (подпись уходит на вторую строку)', () => {
    expect(row).toContain('<View style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}><Text style={titleStyle}>');
    expect(row).not.toContain('flexGrow: 1, flexShrink: 0 }}><Text style={titleStyle}>');
  });

  it('значение справа не сжимается, ширина до 120, переносится без обрезки', () => {
    expect(row).toMatch(/fontSize: 16, lineHeight: 21, flexShrink: 0, maxWidth: 120, textAlign: 'right'/);
    expect(row).not.toMatch(/voiceValue[^\n]*numberOfLines/);
    expect(row).not.toContain('adjustsFontSizeToFit');
  });
});
