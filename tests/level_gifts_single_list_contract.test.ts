// ════════════════════════════════════════════════════════════════════════════
// level_gifts_tabs_contract.test.ts — вкладки «Инвентарь / Активные».
//
// зачем 2026-08-03 (владелец): «подарки после активации просто исчезают. Я хочу
// видеть в этом же разделе подраздел активные, и там пусть показываются все
// активные, в том числе бонус недели, дня, часа и т.д., буст лиги в том числе
// если активен, и подарки что друзья подарили и ты заюзал — короче там всё, что
// активное, со своим индивидуальным таймером. Раздел активные и просто подарки
// разделены. Когда заходим в раздел подарки, то видим вкладку инвентарь, а
// рядом кнопка переключает на активированные».
//
// Плюс: «карточка горизонтальная (бонус), там жёлтая полоска наверху — удали её».
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

describe('переключатель вкладок', () => {
  test('есть состояние вкладки с двумя разделами', () => {
    expect(SCREEN).toContain("useState<'inventory' | 'active'>('inventory')");
  });

  test('обе вкладки отрисованы и нажимаются', () => {
    expect(SCREEN).toContain('testID={`level-gifts-tab-${entry.key}`}');
    expect(SCREEN).toContain("key: 'inventory' as const");
    expect(SCREEN).toContain("key: 'active' as const");
  });

  test('вкладки подписаны понятными словами', () => {
    expect(SCREEN).toContain("ru: 'Инвентарь'");
    expect(SCREEN).toContain("ru: 'Активные'");
  });

  test('на вкладке видно количество — без лишнего переключения', () => {
    expect(SCREEN).toContain('count: items.length');
    expect(SCREEN).toContain('count: activeItems.length');
  });

  test('активная вкладка выделена тоном, а не обводкой', () => {
    // Правило владельца: контейнеры разделяются тоном, обводки запрещены.
    expect(SCREEN).toContain("backgroundColor: isActiveTab ? giftTone(t.accent, '2E') : t.bgSurface");
  });

  test('состояние вкладки объявлено скринридеру', () => {
    expect(SCREEN).toContain('accessibilityState={{ selected: isActiveTab }}');
  });
});

describe('разделение содержимого по вкладкам', () => {
  test('действующие бонусы показываются ТОЛЬКО на вкладке «Активные»', () => {
    // Корень жалобы: активные и неоткрытые лежали вперемешку в одном списке,
    // поэтому применённый подарок будто пропадал.
    expect(SCREEN).toContain("{tab === 'active' && activeItems.length > 0 && (");
  });

  test('сетка неоткрытых подарков — только на вкладке «Инвентарь»', () => {
    expect(SCREEN).toContain("{tab === 'inventory' && items.length > 0 ? (");
  });

  test('у пустой вкладки «Активные» своё объяснение', () => {
    expect(SCREEN).toContain("{tab === 'active' && activeItems.length === 0 ? (");
    expect(SCREEN).toContain("ru: 'Сейчас ничего не действует'");
  });

  test('у пустого инвентаря своё объяснение', () => {
    expect(SCREEN).toContain("{tab === 'inventory' && items.length === 0 ? (");
    expect(SCREEN).toContain("ru: 'Подарков пока нет'");
  });
});

describe('таймеры активных бонусов', () => {
  test('у каждого активного бонуса свой индивидуальный отсчёт', () => {
    expect(SCREEN).toContain('<GiftExpiryCountdown');
    expect(SCREEN).toContain('expiresAtMs={gift.expiresAtMs}');
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
