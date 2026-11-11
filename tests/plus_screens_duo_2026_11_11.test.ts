// зачем (слово владельца 11.11: «раздел на табе с алмазиком переделать под новый дизайн пейволов», «в точности как на макете»;
// макет docs/work/mockups/plus-screens-duo-2026-11-11/index.html): вкладка Plus и экран подключённой подписки собраны из тех же частей,
// что пейвол «Два пути» — знак и свечение уровня, кнопки-тарифы, блик. Сторож держит новый вид и то, что замки 05.11 (тексты кнопки,
// строки сторов, ряд ссылок) пережили редизайн.
import { readSource } from './helpers/read_source';

describe('вкладка Plus в стиле пейвола «Два пути» (владелец 11.11)', () => {
  const screen = readSource('components/plus-tab/PlusTabScreen.tsx');
  const table = readSource('components/plus-tab/PlusTabCompareTable.tsx');
  const benefits = readSource('components/plus-tab/PlusTabBenefits.tsx');

  it('верх — знак, свечение и кнопки-тарифы пейвола, а не плитки с обводкой', () => {
    expect(screen).toContain('<PaywallDuoGlow mix={tierMix}');
    expect(screen).toContain('<PaywallDuoHero mix={tierMix} />');
    expect(screen).toContain('<PaywallDuoPlans ');
    expect(screen).not.toContain('<PlusTabPlans');
    expect(screen).not.toMatch(/borderWidth|borderColor/);
  });

  it('порядок по макету: знак → заголовок → тарифы → кнопка → строки сторов → таблица → ссылки', () => {
    const order = ['<PaywallDuoHero', 'testID="plus-tab-title"', '<PaywallDuoPlans ', 'testID="plus-tab-cta"', 'STORE_NOTE[lang]', 'plusTabRenewsLine(lang, p.selected)', '<PlusTabBenefits', '<PlusTabLegalRow'];
    const at = order.map((mark) => screen.indexOf(mark));
    for (const index of at) expect(index).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('кнопка покупки — градиент уровня с бликом; подпись и тексты замка 05.11 на месте', () => {
    expect(screen).toContain('colors={[...tierColors]}');
    expect(screen).toContain('<Sheen width={windowWidth} />');
    expect(screen).toContain('const ctaInk = DUO_TIER_INK[tier];');
    expect(screen).toContain("ru: 'Оформить Ultra на год'");
    expect(screen).toContain("ru: 'Цена и пробный период — из магазина. Отмена в любой момент.'");
  });

  it('список «Бесплатно / уровень» — одна таблица: все пункты, колонка уровня его цветом, без карточек и обводок блоков', () => {
    expect(screen).toContain('<PlusTabBenefits lang={lang} g={g} items={items} layout="table" tier={tier} />');
    expect(benefits).toContain("if (layout === 'table') return <PlusTabCompareTable");
    expect(table).toContain('items.map((item, index) =>');
    expect(table).toContain('const tint = `${c2}1F`;');
    expect(table).toContain('SUBSCRIPTION_TIER_NAME[tier]');
    expect(table).not.toMatch(/borderWidth: [1-9]|borderColor/);
    expect(table).not.toContain('adjustsFontSizeToFit');
  });
});

describe('экран подключённой подписки в стиле пейвола «Два пути» (владелец 11.11)', () => {
  const view = readSource('components/manage-subscription/ManageSubscriptionDuoView.tsx');

  it('цвет и знак — от уровня подписки, карточка-пропуск градиентом уровня с бликом', () => {
    expect(view).toContain('const mix = useDuoTierMix(tier);');
    expect(view).toContain('<PaywallDuoGlow mix={mix}');
    expect(view).toContain('<PaywallDuoHero mix={mix} />');
    expect(view).toContain('testID="manage-subscription-status-card"');
    expect(view).toContain('<Sheen width={windowWidth} />');
  });

  it('дата держит высоту, пока её нет; у разовой покупки вместо даты «Навсегда» и нет отмены', () => {
    expect(view).toContain("{passValue || ' '}");
    expect(view).toContain("const passValue = isLifetime ? pick(lang, FOREVER) : nextDate;");
    expect(view).toContain('{cancel ? (');
  });

  it('действия: переход на год, восстановление и отмена — с прежними testID, занятость блокирует повторный тап', () => {
    for (const id of ['manage-subscription-change-plan', 'manage-subscription-restore', 'manage-subscription-cancel']) expect(view).toContain(`testID="${id}"`);
    expect(view).toContain('disabled={upgrade.busy}');
    expect(view).toContain('disabled={restore.busy}');
    expect(view).not.toMatch(/borderWidth: [1-9]|borderColor: (?!g\.line)/);
    expect(view).not.toContain('adjustsFontSizeToFit');
  });
});
