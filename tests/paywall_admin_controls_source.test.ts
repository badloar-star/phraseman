// зачем (координатор 25.10, «Забрать в Дизайн»): видимость «закрыть / восстановить / промокод» в окне Plus. Окно целиком в этом стенде не рисуется
// (react-native здесь заглушён, V2Pressable тянет нативные модули), поэтому правила — по исходнику PaywallPlus.tsx: условия показа, testID, блокировка на время оплаты.
import fs from 'node:fs';
import path from 'node:path';

const dock = fs.readFileSync(path.join(__dirname, '..', 'components/paywall/PaywallPlus.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('окно Plus: три действия под управлением админки', () => {
  it('крестик рисуется только при closeVisible и остаётся нажимаемым (testID, закрытие)', () => {
    expect(dock).toContain('closeVisible: boolean');
    expect(dock).toMatch(/const close = closeVisible \? \(/);
    expect(dock).toContain('testID="paywall-close"');
    expect(dock).toContain('onPress={onClose}');
  });

  it('«Восстановить» и «Промокод» — отдельные условия, ни одно не прячет другое', () => {
    expect(dock).toMatch(/restoreVisible: boolean/);
    expect(dock).toMatch(/promoVisible: boolean/);
    expect(dock).toContain('{restoreVisible ? <V2Pressable testID="paywall-restore"');
    expect(dock).toContain('{promoVisible ? <V2Pressable testID="paywall-promo-code"');
    expect(dock).toContain('{restoreVisible || promoVisible ? <View style={S.secondaryActions}>');
  });

  it('на время оплаты/восстановления обе кнопки заблокированы и сообщают это ассистивным технологиям', () => {
    expect(dock).toContain('disabled={restoreDisabled}');
    expect(dock).toContain('accessibilityState={{ disabled: restoreDisabled, busy: restoring }}');
    expect(dock).toContain('disabled={promoDisabled}');
    expect(dock).toContain('accessibilityState={{ disabled: promoDisabled }}');
  });

  it('юридические ссылки остаются всегда, независимо от трёх переключателей', () => {
    const links = dock.slice(dock.indexOf('<View style={S.links}>'));
    expect(links).toContain('openLegal(TERMS_URL)');
    expect(links).toContain('COPY.privacy');
  });
});
