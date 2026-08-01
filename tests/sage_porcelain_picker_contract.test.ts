import fs from 'fs';
import path from 'path';

describe('Sage Porcelain picker contract', () => {
  const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8').replace(/\r\n/g, '\n');
  const pickerSource = readSource('app', 'settings_themes.tsx');
  const settingsSource = readSource('app', '(tabs)', 'settings.tsx');

  it('places the free Jade choice directly after Indigo with every localized label', () => {
    expect(pickerSource).toMatch(/mode: 'indigo'[\s\S]*?mode: 'sagePorcelain'[\s\S]*?mode: 'midnight'/);
    expect(pickerSource).toMatch(/\{ mode: 'sagePorcelain'[^}]*labelRU: 'Нефрит'[^}]*labelUK: 'Нефрит'[^}]*labelES: 'Jade'[^}]*labelPtBr: 'Jade'[^}]*labelVi: 'Ngọc bích'[^}]*labelId: 'Giok'[^}]*labelTr: 'Yeşim'[^}]*labelPl: 'Jadeit'[^}]*\}/);
    expect(pickerSource).not.toMatch(/\{ mode: 'sagePorcelain'[^}]*premiumOnly: true/);
  });

  it('uses the approved light swatches and dedicated porcelain row treatment', () => {
    expect(pickerSource).toMatch(/\{ mode: 'sagePorcelain'[^}]*text: '#17201D'[^}]*colors: \['#FCFDF9', '#315F50', '#D1D9D1'\][^}]*\}/);
    const sageRow = pickerSource.match(/if \(item\.mode === 'sagePorcelain'\) \{([\s\S]*?)\n  \}\n\n  const swatches/);
    expect(sageRow?.[1]).toContain("gradient: ['#FCFDF9', '#F0F1EC', '#E1E5DC']");
    expect(sageRow?.[1]).toContain("shine: ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.18)', 'rgba(49,95,80,0.03)']");
    expect(sageRow?.[1]).toContain("textColor: '#17201D'");
    expect(sageRow?.[1]).toContain("mutedColor: '#52605A'");
    expect(sageRow?.[1]).toContain("activeIconColor: '#315F50'");
    expect(sageRow?.[1]).toContain("shadowColor: '#23322B'");
    expect(sageRow?.[1]).toContain("borderColor: active ? '#315F50' : '#BDC8BD'");
    expect(sageRow?.[1]).toContain('swatches: item.colors');
    expect(pickerSource).toContain("backgroundColor: item.mode === 'sagePorcelain' ? '#F0F1EC' : '#282B31'");
    expect(pickerSource).toContain("borderWidth: item.mode === 'sagePorcelain' ? 1 : 0");
    expect(pickerSource).toContain('borderColor: row.borderColor');
  });

  it('shows the exact localized Jade name on the settings summary row', () => {
    expect(settingsSource).toMatch(/sagePorcelain: \{ ru: 'Нефрит', uk: 'Нефрит', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' \}/);
  });
});
