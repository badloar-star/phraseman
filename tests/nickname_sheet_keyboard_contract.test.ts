// зачем (координатор 12.10, кадры settings-gap-025/026): шторка «Изменить имя» оставалась под клавиатурой — поле, «Имя свободно/занято»
// и «Сохранить» скрыты. У нижней шторки HybridAlertShell отступ снизу был всегда 0. Сторож: нижняя шторка с avoidKeyboard поднимается
// на перекрытие клавиатуры; нижние шторки без поля ввода (энергия, выбор) не меняются; шторка имени флаг передаёт и пишет [NICKNAME-KB].
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const shell = read('components/modal_fx/HybridAlertShell.tsx');
const nickname = read('components/account/NicknameEditModal.tsx');

describe('nickname bottom sheet rises above the keyboard', () => {
  it('the shell lifts a bottom sheet by the keyboard overlap only when avoidKeyboard is set', () => {
    expect(shell).toContain('const bottomSheetKeyboardLift = bottomSheet && avoidKeyboard ? keyboardInset : null;');
    expect(shell).toContain('paddingBottom: bottomSheetKeyboardLift ?? (bottomSheet ? 0 : Math.max(24, insets.bottom, keyboardInset)),');
    // перекрытие считается, пока шторка видна (avoidKeyboard || scrollContent) — условие не сужено
    expect(shell).toMatch(/useKeyboardBottomInset\(\s*visible && !fillAvailableHeight && \(avoidKeyboard \|\| scrollContent\),\s*\)/);
    expect(shell).toContain('[MODAL-KB] testID=');
  });

  it('the nickname sheet opts in and logs keyboard events', () => {
    const sheet = nickname.slice(nickname.indexOf('<HybridAlertShell'), nickname.indexOf('</HybridAlertShell>'));
    expect(sheet).toContain('placement="bottom"');
    expect(sheet).toMatch(/\n\s*avoidKeyboard\r?\n/);
    expect(nickname).toContain('[NICKNAME-KB] ${showEvent} height=');
  });

  it('other bottom sheets without text input keep their position', () => {
    for (const file of ['components/energy/EnergyNeededSheet.tsx', 'components/ThemedChoiceModal.tsx']) {
      const src = read(file);
      expect(src).toContain('placement="bottom"');
      expect(src).not.toMatch(/\bavoidKeyboard\b/);
    }
  });
});
