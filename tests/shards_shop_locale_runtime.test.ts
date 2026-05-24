import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'app', 'shards_shop.tsx'), 'utf8');

describe('ShardsShop planned locale runtime copy', () => {
  it('does not route planned locales through legacy RU/UK/ES branches', () => {
    expect(source).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES)\b/u);
    expect(source).not.toContain('fallback');
  });

  it('has explicit planned locale copy for shop labels and cards', () => {
    for (const marker of ["'pt-BR'", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Fragmentos de conhecimento');
    expect(source).toContain('Mảnh kiến thức');
    expect(source).toContain('Shard pengetahuan');
    expect(source).toContain('Bilgi parçaları');
    expect(source).toContain('Odłamki wiedzy');
  });

  it('has planned locale action toast fields for purchase outcomes', () => {
    for (const marker of ['messagePtBr', 'messageVi', 'messageId', 'messageTr', 'messagePl']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Compra confirmada.');
    expect(source).toContain('Đã xác nhận giao dịch mua.');
    expect(source).toContain('Pembelian dikonfirmasi.');
    expect(source).toContain('Satın alma onaylandı.');
    expect(source).toContain('Zakup potwierdzony.');
  });
});
