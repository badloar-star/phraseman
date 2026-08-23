import fs from 'fs';
import path from 'path';

// зачем: экран «Темы» пережил редизайн «Примерочная» (2026-08-02, решение владельца).
// Контракт сторожит СМЫСЛ, а не вёрстку: Нефрит фри и стоит после Индиго со всеми
// локализациями; плашки красятся НАСТОЯЩИМИ токенами тем (не ручными дублями);
// обводок нет (запрет владельца); примерка не утекает за пределы экрана.
describe('Sage Porcelain picker contract', () => {
  const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8').replace(/\r\n/g, '\n');
  const pickerSource = readSource('app', 'settings_themes.tsx');
  const settingsSource = readSource('app', '(tabs)', 'settings.tsx');

  it('places the free Jade choice directly after Indigo with every localized label', () => {
    expect(pickerSource).toMatch(/mode: 'indigo'[\s\S]*?mode: 'sagePorcelain'[\s\S]*?mode: 'midnight'/);
    expect(pickerSource).toMatch(/\{ mode: 'sagePorcelain'[^}]*labelRU: 'Нефрит'[^}]*labelUK: 'Нефрит'[^}]*labelES: 'Jade'[^}]*labelPtBr: 'Jade'[^}]*labelVi: 'Ngọc bích'[^}]*labelId: 'Giok'[^}]*labelTr: 'Yeşim'[^}]*labelPl: 'Jadeit'[^}]*\}/);
    expect(pickerSource).not.toMatch(/\{ mode: 'sagePorcelain'[^}]*premiumOnly: true/);
  });

  it('paints rows from real theme palettes with no borders and a bundled icon per theme', () => {
    // Единственный источник цветов — палитры из constants/theme (ручные дубли уже разъезжались).
    expect(pickerSource).toContain("} from '../constants/theme'");
    expect(pickerSource).toMatch(/sagePorcelain: SAGE_PORCELAIN/);
    expect(pickerSource).toMatch(/indigo: INDIGO/);
    expect(pickerSource).toContain('palette.cardGradient');
    // Запрет владельца: никаких обводок контейнеров — выделение тоном/тенью/подъёмом.
    expect(pickerSource).not.toMatch(/borderWidth/);
    // Иконки тем — бандл-ассеты, без сети и рантайм-генерации.
    // зачем формат не зафиксирован: контракт сторожит СМЫСЛ («иконка лежит в бандле»),
    // а не расширение файла. 2026-08-23 иконки переведены png→webp lossless (тот же
    // пиксель, вдвое меньше вес) — сжатие ассетов не должно ронять контракт.
    expect(pickerSource).toMatch(/require\('\.\.\/assets\/theme-icons\/sagePorcelain\.(png|webp)'\)/);
    expect(pickerSource).toMatch(/require\('\.\.\/assets\/theme-icons\/indigo\.(png|webp)'\)/);
  });

  it('keeps the try-on preview scoped to the themes screen', () => {
    // Примерка: тап красит экран через previewThemeMode, применение — отдельной кнопкой.
    expect(pickerSource).toContain('setPreviewThemeMode(mode === appliedThemeMode ? null : mode)');
    // Уход с экрана всегда сбрасывает примерку (превью не персистится).
    expect(pickerSource).toMatch(/useEffect\(\(\) => \(\) => setPreviewThemeMode\(null\)/);
    // Замкнутая тема ведёт в пейволл с контекстом темы, а не применяется.
    expect(pickerSource).toContain("params: { context: 'theme' }");
    // Ачивка — только за настоящее применение (не за примерку).
    expect(pickerSource).toMatch(/setThemeMode\(candidate\);[\s\S]*?profile_theme_set/);
  });

  it('shows the exact localized Jade name on the settings summary row', () => {
    expect(settingsSource).toMatch(/sagePorcelain: \{ ru: 'Нефрит', uk: 'Нефрит', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' \}/);
  });
});
