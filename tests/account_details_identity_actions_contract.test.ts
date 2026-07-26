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
    expect(source).toContain('accessibilityLabel={logoutActionLabel}');
    expect(source).not.toContain('account-switch-button');
  });
});
