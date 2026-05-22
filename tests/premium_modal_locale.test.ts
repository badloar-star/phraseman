import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Premium modal planned locale coverage', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');

  it('formats dates with explicit planned locale tags', () => {
    expect(source).toContain("const PREMIUM_DATE_LOCALE: Record<Lang, string>");
    expect(source).toContain("'pt-BR': 'pt-BR'");
    expect(source).toContain("vi: 'vi-VN'");
    expect(source).toContain("id: 'id-ID'");
    expect(source).toContain("tr: 'tr-TR'");
    expect(source).toContain("pl: 'pl-PL'");
    expect(source).not.toMatch(/lang === 'uk' \? 'uk-UA' : lang === 'es' \? 'es-ES' : 'ru-RU'/);
  });

  it('does not show RU/UK/ES legal footer copy to planned locales', () => {
    expect(source).toContain('const legalPlanned: PremiumPlannedCopy');
    expect(source).toContain("Você assina a ${footerPeriodPlanned['pt-BR']}");
    expect(source).toContain('Bạn đăng ký ${footerPeriodPlanned.vi}');
    expect(source).toContain('Kamu berlangganan ${footerPeriodPlanned.id}');
    expect(source).toContain('${footerPeriodPlanned.tr} otomatik yenilemeyle başlar');
    expect(source).toContain('Aktywujesz ${footerPeriodPlanned.pl}');
    expect(source).toContain('{LP(legalRu, legalUk, legalEs, legalPlanned)}');
    expect(source).not.toContain("{lang === 'uk'");
    expect(source).not.toContain(": lang === 'es'");
  });

  it('keeps store-price placeholder localized', () => {
    expect(source).toContain('Цена магазина появится перед покупкой.');
    expect(source).toContain('O preço da loja aparecerá antes da compra.');
    expect(source).toContain('Giá trong cửa hàng sẽ xuất hiện trước khi mua.');
    expect(source).not.toContain('Store price appears before purchase.');
  });
});
