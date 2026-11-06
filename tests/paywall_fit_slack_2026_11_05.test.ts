// зачем (Fable/координатор 06.11, EN-кадры 360 dp: overflow 60/136): автопрокрутка «к концу» прятала верх списка — в generic не было первой выгоды, во второй строка выглядела наложением.
// Теперь окно оплаты ВСЕГДА открывается на offset 0 (без scrollTo), шрифты не ужимаются; не влезает — обычная прокрутка, кнопка оплаты в доке видна всегда. Журнал [PAYWALL-FIT] несёт initialOffset.
import { readSource } from './helpers/read_source';

describe('окно оплаты: список стоит сверху при открытии', () => {
  const src = readSource('components/paywall/PaywallPlus.tsx');
  const block = src.slice(src.indexOf('export function PaywallPlusScroll'), src.indexOf('const S = StyleSheet.create'));
  it('нет автопрокрутки к концу и нет поправки на отступ', () => {
    expect(block).not.toContain('scrollTo(');
    expect(block).not.toContain('FIT_BOTTOM_SLACK');
    expect(block).not.toContain('scroll_to_end');
  });
  it('журнал: initialOffset 0 и действие scrollable_from_top / fits', () => {
    expect(block).toContain('initialOffset: 0');
    expect(block).toContain("action: overflow > 0 ? 'scrollable_from_top' : 'fits'");
  });
  it('шрифты не ужимаются: в блоке нет adjustsFontSizeToFit', () => {
    expect(block).not.toContain('adjustsFontSizeToFit');
  });
});
