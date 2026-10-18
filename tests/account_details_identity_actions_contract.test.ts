import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'account_details.tsx'),
  'utf8',
);

describe('account details linked identity action', () => {
  it('names logout as signing into another account in all eight locales', () => {
    for (const label of [
      'Выйти и войти под другим аккаунтом',
      'Вийти й увійти під іншим акаунтом',
      'Salir e iniciar sesión con otra cuenta',
      'Sair e entrar com outra conta',
      'Đăng xuất và đăng nhập bằng tài khoản khác',
      'Keluar dan masuk dengan akun lain',
      'Çıkış yapıp başka bir hesapla giriş yap',
      'Wyloguj się i zaloguj na inne konto',
    ]) {
      expect(source).toContain(label);
    }
    // 723613818 (координатор 18.10): пока идёт выход, подпись строки — «Сохраняем прогресс…»; в покое — та же logoutActionLabel.
    expect(source).toContain('accessibilityLabel={logoutBusy ? logoutSavingLabel : logoutActionLabel}');
    expect(source).not.toContain('account-switch-button');
  });

  // зачем (правила владельца 3–4, координатор 18.10): строка «Выйти и войти под другим аккаунтом» ведёт СРАЗУ к выбору Google/Apple.
  // Прямой маршрут спрятан за переключателем, пока auth_provider не умеет входить из A в B без отказа account_switch_required — иначе человек получил бы отказ.
  it('routes the logout row straight to the sign-in sheet behind the direct-switch flag (off by default)', () => {
    const flagSource = fs.readFileSync(path.join(process.cwd(), 'app', 'account_direct_switch.ts'), 'utf8');
    expect(flagSource).toMatch(/export const ACCOUNT_DIRECT_SWITCH_ENABLED = false;/);
    expect(source).toContain("import { ACCOUNT_DIRECT_SWITCH_ENABLED } from './account_direct_switch';");
    // оба маршрута на месте и пишут журнал [ACC-SWITCH]
    expect(source).toContain('if (ACCOUNT_DIRECT_SWITCH_ENABLED) {');
    expect(source).toContain('[ACC-SWITCH] route=direct');
    expect(source).toContain('[ACC-SWITCH] route=wipe_then_sign_in');
    const direct = source.slice(source.indexOf('if (ACCOUNT_DIRECT_SWITCH_ENABLED) {'));
    expect(direct.indexOf('setAuthPromptVisible(true)')).toBeGreaterThan(-1);
    expect(direct.indexOf('setAuthPromptVisible(true)')).toBeLessThan(direct.indexOf("setLogoutStage('wiping')"));
    // после входа в B прямым маршрутом экран сбрасывает имя и дату прежнего аккаунта; «Позже» маршрут отменяет
    expect(source).toContain('directSwitchRef.current = false; setAuthPromptVisible(false);');
    expect(source).toMatch(/directSwitchRef\.current[\s\S]{0,400}setUserName\(''\);[\s\S]{0,120}setMemberSinceMs\(peekAccountCreatedAtMs\(\)\)/);
  });
});
