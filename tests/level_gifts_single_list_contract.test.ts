// ════════════════════════════════════════════════════════════════════════════
// level_gifts_single_list_contract.test.ts — ЕДИНЫЙ список раздела «Подарки».
//
// зачем 2026-08-23 (владелец): «убери в разделе подарки разделение на два
// раздела активные и инвентарь, просто сделай так чтобы когда мы активируем
// подарок чтобы он менял свой статус и вид внутри одного раздела чтобы мы сразу
// видели этот активирует, и таймер уже показывает не когда подарок сгорит, а
// сколько он действует».
//
// История: 2026-08-03 тот же владелец просил РАЗДЕЛИТЬ на вкладки «Инвентарь /
// Активные» — лечили жалобу «подарки после активации просто исчезают». Вкладки
// симптом сняли, но ценой переключения: активированный подарок уезжал на
// соседнюю вкладку, и результат своего действия человек всё равно не видел там,
// где действие совершил. Правило 2026-08-03 ОТМЕНЕНО, этот файл сторожит новое.
// Если тест падает на «вкладок быть не должно» — чинить экран, а не тест.
//
// Экран в jest не поднимается (expo-router, reanimated), поэтому контракт
// проверяется по исходнику — тот же приём, что в остальных контрактах экранов.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'level_gifts_inventory.tsx'),
  'utf8',
);

const ACTIVE_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'level_gift_active_inventory.ts'),
  'utf8',
);

const COUNTDOWN = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'GiftExpiryCountdown.tsx'),
  'utf8',
);

describe('вкладок больше нет', () => {
  test('состояние вкладки удалено полностью', () => {
    expect(SCREEN).not.toContain("useState<'inventory' | 'active'>");
    expect(SCREEN).not.toMatch(/\bsetTab\b/);
  });

  test('переключатель разделов не рендерится', () => {
    expect(SCREEN).not.toContain('level-gifts-tab-');
    expect(SCREEN).not.toContain('isActiveTab');
  });

  test('подписи вкладок «Инвентарь» и «Активные» убраны', () => {
    expect(SCREEN).not.toContain("ru: 'Инвентарь'");
    expect(SCREEN).not.toContain("ru: 'Активные'");
  });

  test('содержимое больше не спрятано за условием вкладки', () => {
    expect(SCREEN).not.toMatch(/tab === 'active'/);
    expect(SCREEN).not.toMatch(/tab === 'inventory'/);
  });
});

describe('один список: активные сверху, неоткрытые снизу', () => {
  test('действующие бонусы показываются без всяких условий вкладки', () => {
    expect(SCREEN).toContain('{activeItems.length > 0 && (');
  });

  test('сетка неоткрытых подарков показывается в том же списке', () => {
    expect(SCREEN).toContain('{items.length > 0 ? (');
  });

  test('активные бонусы стоят в разметке ВЫШЕ сетки неоткрытых', () => {
    // Порядок владельца: «сразу видели, что этот активирован».
    const activeAt = SCREEN.indexOf('{activeItems.length > 0 && (');
    const tilesAt = SCREEN.indexOf('{items.length > 0 ? (');
    expect(activeAt).toBeGreaterThan(-1);
    expect(tilesAt).toBeGreaterThan(-1);
    expect(activeAt).toBeLessThan(tilesAt);
  });

  test('у списка один общий заголовок вместо двух вкладок', () => {
    expect(SCREEN).toContain("ru: 'Твои подарки'");
  });
});

describe('пустые состояния честны для единого списка', () => {
  test('крупное пустое состояние — только когда нет НИЧЕГО', () => {
    // Раньше это была пустая вкладка «Активные», и текст врал про половину
    // экрана: говорил только про применённые бонусы.
    expect(SCREEN).toContain('{activeItems.length === 0 && items.length === 0 ? (');
    expect(SCREEN).toContain("ru: 'Подарков пока нет'");
  });

  test('когда активные есть, а неоткрытых нет — тихая строка, не блок на пол-экрана', () => {
    expect(SCREEN).toContain('{items.length === 0 && activeItems.length > 0 ? (');
    expect(SCREEN).toContain("ru: 'Неоткрытых подарков нет — новые за уровни появятся здесь.'");
  });
});

describe('таймер показывает срок ДЕЙСТВИЯ, а не сгорания', () => {
  test('у компонента есть явный смысл отсчёта', () => {
    expect(COUNTDOWN).toContain("meaning?: 'expiry' | 'remaining'");
  });

  test('активированный бонус считает остаток действия', () => {
    expect(SCREEN).toContain('meaning="remaining"');
  });

  test('скринридер говорит «действует ещё», а не «сгорит через»', () => {
    expect(COUNTDOWN).toContain("meaning === 'remaining'");
    expect(COUNTDOWN).toContain('Действует ещё ');
  });

  test('тревожная подсветка последних часов — только у несгоревшего подарка', () => {
    // У активного бонуса ноль = штатный конец действия, пугать красным нечем.
    expect(COUNTDOWN).toContain("const warn = meaning === 'expiry' && msLeft <= GIFT_EXPIRY_WARN_MS");
    expect(COUNTDOWN).toContain("const nowWarn = meaning === 'expiry' && left <= GIFT_EXPIRY_WARN_MS");
  });

  test('у каждого активного бонуса по-прежнему свой индивидуальный отсчёт', () => {
    expect(SCREEN).toContain('<GiftExpiryCountdown');
    expect(SCREEN).toContain('expiresAtMs={gift.lifetime.expiresAtMs}');
  });

  test('постоянный Второй шанс показывает срок словами и никогда не получает countdown', () => {
    expect(ACTIVE_SOURCE).toContain("lifetime: { kind: 'permanent' }");
    expect(SCREEN).toContain("gift.lifetime.kind === 'expires'");
    expect(SCREEN).toContain("ru: 'Без срока действия'");
    expect(SCREEN).toContain('gift.countBadge');
  });

  test('истёкший бонус убирается и перезагружает список', () => {
    expect(SCREEN).toContain('onExpired={handleGiftExpired}');
  });

  test('в активные попадают все обещанные владельцем источники', () => {
    // «бонус недели, дня, часа, буст лиги, подарки друзей».
    expect(ACTIVE_SOURCE).toContain('GIFT_MULTIPLIER_KEY');
    expect(ACTIVE_SOURCE).toContain('CLUB_GIFT_BOOST_KEY');
    expect(ACTIVE_SOURCE).toContain('loadStoredFriendGiftInventory');
    expect(ACTIVE_SOURCE).toContain('GIFT_XP_BANK_KEY');
    expect(ACTIVE_SOURCE).toContain('BONUS_ENERGY_KEY');
  });

  test('бонусы без своего срока получают честный TTL, а не висят вечно', () => {
    expect(ACTIVE_SOURCE).toContain('resolveFirstSeenLifetime');
    expect(ACTIVE_SOURCE).toContain('GIFT_TTL_MS');
  });
});

describe('жёлтая полоска на карточке бонуса', () => {
  test('декоративная линия сверху карточки удалена', () => {
    // Владелец: «там жёлтая полоска наверху — удали её».
    expect(SCREEN).not.toMatch(/position: 'absolute', top: 0, left: 14, right: 14, height: 1/);
  });

  test('карточка по-прежнему разделяется градиентом, а не обводкой', () => {
    expect(SCREEN).toContain('borderWidth: 0');
  });
});
