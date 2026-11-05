// зачем (150, Сверка 05.11): на 10 кадрах окон оплаты не было плиток, цен, промокода, «Восстановить» и ссылок. Журнал [PAYWALL-LAYOUT] показал: dock h=1827 (= 2 × окно 915) при шторке 856,
// scroll h=0. Причина — flexGrow:1 у плашек «Восстановить»/«Ввести промокод» в колонке: при замере AtMost каждая раздувалась до высоты окна. Пин: у плашки нет flexGrow, у колонки нет flex.
import { readSource } from './helpers/read_source';

describe('нижняя панель окна оплаты: без раздувания', () => {
  it('secondaryAction и secondaryActions не содержат flexGrow / flex:1', () => {
    const src = readSource('components/paywall/PaywallPlus.tsx');
    const action = src.match(/secondaryAction: \{([^}]*)\}/);
    const actions = src.match(/secondaryActions: \{([^}]*)\}/);
    expect(action).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(action![1]).not.toMatch(/flexGrow|\bflex:\s*1\b/);
    expect(actions![1]).not.toMatch(/flexGrow|\bflex:\s*1\b/);
  });
});
