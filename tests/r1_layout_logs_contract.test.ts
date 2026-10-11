// зачем (координатор 12.10, «сперва логи» перед пересъёмкой): журналы раскладки для Сверки должны оставаться на месте —
// [DLG-INPUT-LAYOUT] (поле ввода диалога после отправки), [SETTINGS-LAYOUT] (шапка «Настройки»), [PACK-BAR-LAYOUT] (плашки «⋮»/«+»).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('layout traces for the R1 re-shoot', () => {
  it('[DLG-INPUT-LAYOUT]: keyboard height, gap to the window bottom and the safe-area inset are logged on keyboard, layout and send', () => {
    const hook = read('components/dialogs/glass/useDialogInputLayoutTrace.ts');
    for (const token of ['[DLG-INPUT-LAYOUT]', 'зазор до низа', 'нижний отступ безопасной зоны', 'keyboardDidShow', 'keyboardDidHide', 'measureInWindow', 'sending=']) expect(hook).toContain(token);
    expect(hook).toContain('if (!__DEV__) return'); // в релизе молчит
    const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(screen).toContain('useDialogInputLayoutTrace({ sending, bottomMode: String(bottom), insetBottom: inputInsets.bottom })');
    expect(screen).toMatch(/<View ref=\{inputTrace\.barRef\} collapsable=\{false\} onLayout=\{inputTrace\.onBarLayout\}/);
  });

  it('[SETTINGS-LAYOUT] and [PACK-BAR-LAYOUT] are present and dev-only', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toMatch(/if \(__DEV__\) console\.log\(`\[SETTINGS-LAYOUT\]/);
    const kit = read('components/packs/PackScreenKit.tsx');
    expect(kit).toContain('[PACK-BAR-LAYOUT]');
    expect(kit).toMatch(/function tracePlate[\s\S]*?if \(!__DEV__\) return;/);
  });
});
