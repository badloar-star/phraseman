// Пейвол «Два пути» (владелец 11.11): первое нажатие на невыбранный тариф перекрашивает окно, нажатие на выбранный — покупка.
import { duoTapAction } from '../components/paywall/duo/paywall_duo_tap';

describe('пейвол «Два пути»: решение по нажатию на кнопку-тариф', () => {
  it('год выбран заранее — нажатие на год сразу открывает оплату', () => {
    expect(duoTapAction({ tapped: 'yearly', selected: 'yearly', busy: false, hasPrice: true })).toBe('buy');
  });

  it('нажатие на невыбранный Plus только выбирает его (цвет и знак меняются), без покупки', () => {
    expect(duoTapAction({ tapped: 'monthly', selected: 'yearly', busy: false, hasPrice: true })).toBe('select');
  });

  it('второе нажатие на уже выбранный Plus открывает оплату', () => {
    expect(duoTapAction({ tapped: 'monthly', selected: 'monthly', busy: false, hasPrice: true })).toBe('buy');
  });

  it('во время оплаты любое нажатие игнорируется — второй покупки и смены тарифа нет', () => {
    expect(duoTapAction({ tapped: 'yearly', selected: 'yearly', busy: true, hasPrice: true })).toBe('ignore_busy');
    expect(duoTapAction({ tapped: 'monthly', selected: 'yearly', busy: true, hasPrice: true })).toBe('ignore_busy');
  });

  it('тариф без цены нельзя выбрать, но выбранный тариф покупается и без цены (тап сам догрузит магазин)', () => {
    expect(duoTapAction({ tapped: 'monthly', selected: 'yearly', busy: false, hasPrice: false })).toBe('ignore_no_price');
    expect(duoTapAction({ tapped: 'yearly', selected: 'yearly', busy: false, hasPrice: false })).toBe('buy');
  });
});
