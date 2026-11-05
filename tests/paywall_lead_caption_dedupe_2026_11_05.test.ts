// зачем (Сверка 05.11, premium_expired): подзаголовок шапки не повторяется подписью первой выгоды — иначе лишняя строка, overflow 55 и обрезка верха.
import { readSource } from './helpers/read_source';

describe('окно оплаты: подзаголовок не дублируется в первой выгоде', () => {
  it('leadCaption берётся только когда у входа нет заголовка (шапка подзаголовок не показывает)', () => {
    const s = readSource('components/paywall/PaywallPlusScreen.tsx');
    expect(s).toContain('leadCaption={contextual && !headline.title ? headline.subtitle : undefined}');
    expect(s).toContain('contextSubtitle={headline.title ? headline.subtitle : undefined}');
  });
});
