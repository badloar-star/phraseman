// ════════════════════════════════════════════════════════════════════════════
// gifts_refresh_after_apply_contract.test.ts — экран обновляется ПОСЛЕ применения.
//
// зачем 2026-08-03 (владелец: «в разделе активные вообще ничего нет»): подарок
// применялся, эффект записывался в хранилище и работал, но вкладка «Активные»
// оставалась пустой.
//
// Корень — вывернутое условие в closeGiftModal:
//     if (!claimed) void loadData();
// Данные перезагружались ТОЛЬКО когда игрок закрыл модалку, ничего не применив.
// После УСПЕШНОГО применения (claimed = true) плитка оптимистично убиралась из
// сетки инвентаря, а loadData не вызывался вовсе — значит activeItems оставался
// тем, каким был на момент ОТКРЫТИЯ экрана. Бонус уже действовал, но вторая
// вкладка о нём не знала.
//
// Почему это не поймали прежние тесты: контракт сверял строки-ключи в
// исходниках (они совпадали), рантайм-тест проверял сборщик напрямую (он
// работал). Ни один не проверял, ВЫЗЫВАЕТСЯ ли сборщик после применения.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'level_gifts_inventory.tsx'),
  'utf8',
);
const MODAL = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'LevelGiftModal.tsx'),
  'utf8',
);

/** Тело функции closeGiftModal — там и жил баг. */
function closeGiftModalBody(): string {
  const start = SCREEN.indexOf('const closeGiftModal');
  expect(start).toBeGreaterThan(-1);
  const end = SCREEN.indexOf('\n  };', start);
  expect(end).toBeGreaterThan(start);
  return SCREEN.slice(start, end);
}

describe('перезагрузка после закрытия модалки', () => {
  test('успешное закрытие не перечитывает старый журнал до завершения применения', () => {
    const body = closeGiftModalBody();
    expect(body).toContain('if (!claimed) void loadData();');
    expect(SCREEN).toContain('onGiftApplySettled={loadData}');
  });

  test('инвентарь перечитывается только в finally после эффекта и записи claimed', () => {
    expect(MODAL).toContain('onGiftApplySettled?: () => void | Promise<void>;');
    const applyStart = MODAL.indexOf('const result = await applyGift(');
    const claimedAt = MODAL.indexOf('await (onGiftClaimed ?', applyStart);
    const settledAt = MODAL.indexOf('await onGiftApplySettled?.()', applyStart);
    expect(applyStart).toBeGreaterThan(-1);
    expect(claimedAt).toBeGreaterThan(applyStart);
    expect(settledAt).toBeGreaterThan(claimedAt);
  });

  test('оптимистичное удаление плитки сохранено — сетка реагирует мгновенно', () => {
    // Перезагрузка не должна была заменить мгновенный отклик: плитка уходит
    // сразу, loadData лишь подтверждает и наполняет вкладку «Активные».
    const body = closeGiftModalBody();
    expect(body).toContain('setItems((current) => current.filter(');
  });

  test('удаляет только точный request/lane, не подарок того же уровня', () => {
    const body = closeGiftModalBody();
    expect(SCREEN).toContain('function pendingGiftItemKey');
    expect(body).toContain('pendingGiftItemKey(selected)');
    expect(body).toContain('pendingGiftItemKey(item)');
  });
});

describe('остальные точки обновления на месте', () => {
  test('экран перезагружает данные при возврате на него', () => {
    expect(SCREEN).toContain('useFocusEffect');
  });

  test('сгоревший по таймеру подарок вызывает перезагрузку', () => {
    expect(SCREEN).toContain('const handleGiftExpired');
    const start = SCREEN.indexOf('const handleGiftExpired');
    expect(SCREEN.slice(start, start + 220)).toContain('void loadData();');
  });

  test('загрузка тянет ОБА списка — инвентарь и активные', () => {
    const start = SCREEN.indexOf('const loadData');
    const body = SCREEN.slice(start, start + 600);
    expect(body).toContain('loadPendingLevelGiftInventory');
    expect(body).toContain('loadActiveLevelGiftInventory');
    expect(body).toContain('setActiveItems');
  });
});
