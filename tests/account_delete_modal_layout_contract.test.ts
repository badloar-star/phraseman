import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('account deletion modal layout contract', () => {
  const modalSource = fs.readFileSync(
    path.join(root, 'components', 'DeleteAccountConfirmModal.tsx'),
    'utf8',
  );
  const shellSource = fs.readFileSync(
    path.join(root, 'components', 'modal_fx', 'HybridAlertShell.tsx'),
    'utf8',
  );

  // зачем: прежний контракт требовал ОБРАТНОГО — растяжки на весь экран
  // (fillAvailableHeight + flex:1). Она была оправдана, пока внутри жил длинный
  // список удаляемых данных; этот блок отключён ({false && …}), и владелец
  // 2026-09-22 увидел пустое окно во весь экран: «должен быть маленький
  // аккуратный». Сторож теперь охраняет компактность, а не растяжку.
  it('keeps the hybrid dialog sized by its own content instead of filling the screen', () => {
    expect(modalSource).not.toContain('fillAvailableHeight');
    // Растяжка панели возвращается ровно двумя способами: flex:1 на вьюпорте
    // панели или flex:1 на её ScrollView. Закрываем оба.
    expect(modalSource).not.toMatch(/hybridPanelViewport:\s*\{[^}]*flex:\s*1/);
    expect(modalSource).not.toMatch(/hybridScrollViewport:\s*\{[^}]*flex:\s*1/);
  });

  it('still keeps the input and both actions reachable on a short screen', () => {
    // Потолок высоты + собственный скролл: контент не обрезается внешним
    // overflow:hidden панели, когда экран мал или поднята клавиатура.
    expect(modalSource).toMatch(/hybridDialog:\s*\{[^}]*maxHeight:\s*'100%'/);
    expect(modalSource).toMatch(/hybridScrollViewport:\s*\{[^}]*flexShrink:\s*1/);
    expect(modalSource).toContain('keyboardShouldPersistTaps="handled"');
    // Модалка владеет своим ScrollView — шелл не должен оборачивать её во второй.
    expect(modalSource).toContain('scrollContent={false}');
  });

  it('leaves the shell opt-in props intact for long hybrid forms', () => {
    expect(shellSource).toContain('fillAvailableHeight?: boolean;');
    expect(shellSource).toContain('fillAvailableHeight = false');
    expect(shellSource).toContain("maxHeight: '100%'");
  });

  // зачем: окно удаления владеет своим ScrollView (scrollContent={false}), и
  // прежнее условие отключало клавиатурный отступ ровно в этом случае — поле
  // ввода уходило под клавиатуру. Отступ теперь зависит только от растяжки.
  it('lifts this panel above the keyboard without its own KeyboardAvoidingView', () => {
    expect(modalSource).toContain('avoidKeyboard');
    expect(shellSource).toContain('avoidKeyboard?: boolean;');
    expect(shellSource).toContain('avoidKeyboard = false');
    expect(shellSource).toContain('avoidKeyboard || scrollContent');
    expect(shellSource).toContain('Math.max(24, insets.bottom, keyboardInset)');
  });
});
