// Координатор 26.10 по эталону (kit.css `.rb.l { width: 48px; height: 48px }`, dialogs.html меняет только flex; закон владельца «назад в
// одном месте везде»): экран-гейт диалогов (загрузка, «недоступно», «не найдено») — общая кнопка «назад» 48 на общем месте, а не своя 44.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
// зачем: размер и место общей кнопки — из исходника (импорт компонента тянет иконки, которые jest не разбирает)
const backSrc = read('components/v2/ScreenBackButton.tsx');
const SCREEN_BACK_SIZE = Number(/export const SCREEN_BACK_SIZE = (\d+);/.exec(backSrc)?.[1]);
const SCREEN_BACK_LEFT = Number(/export const SCREEN_BACK_LEFT = (\d+);/.exec(backSrc)?.[1]);

describe('гейт диалогов: «назад» — общий круг 48 на общем месте', () => {
  const kit = read('components/dialogs/glass/DialogueGlassKit.tsx');
  const kitCss = read('docs/design/v2-app/kit.css');

  it('эталон — 48, общий компонент — 48 и слева 20', () => {
    expect(kitCss).toContain('.rb.l { width: 48px; height: 48px; }');
    expect(read('docs/design/v2-app/dialogs.html')).toContain('.dh .rb.l { flex: none; }');
    expect(SCREEN_BACK_SIZE).toBe(48);
    expect(SCREEN_BACK_LEFT).toBe(20);
  });

  it('гейт ставит общую кнопку и держит её место в шапке; своей стеклянной «‹» 44 больше нет', () => {
    expect(kit).toMatch(/<SafeTopBackButton screen=\{`dialogue_gate_\$\{testID\}`\} accessibilityLabel=\{backLabel\} onPress=\{onBack\} \/>\n\s+<View style=\{styles\.gateTop\}>\n\s+<ScreenBackSlot \/>/);
    expect(kit).not.toContain('DialogueGlassBackButton');
    expect(kit).not.toContain('round44');
  });

  it('квадратная кнопка шапки «⋯» не тронута (своя форма по эталону)', () => {
    expect(kit).toContain("square44: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },");
  });
});
