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

/** Тело функции closeGiftModal — там и жил баг. */
function closeGiftModalBody(): string {
  const start = SCREEN.indexOf('const closeGiftModal');
  expect(start).toBeGreaterThan(-1);
  const end = SCREEN.indexOf('\n  };', start);
  expect(end).toBeGreaterThan(start);
  return SCREEN.slice(start, end);
}

describe('перезагрузка после закрытия модалки', () => {
  test('данные перезагружаются ВСЕГДА, а не только при отмене', () => {
    const body = closeGiftModalBody();
    expect(body).toContain('void loadData();');
    // Ровно то условие, из-за которого раздел оставался пустым.
    expect(body).not.toContain('if (!claimed) void loadData()');
  });

  test('перезагрузка не спрятана ни под каким условием claimed', () => {
    const body = closeGiftModalBody();
    const reloadLine = body.split('\n').find((line) => line.includes('void loadData();'));
    expect(reloadLine).toBeDefined();
    // Вызов стоит отдельной строкой, а не под проверкой claimed.
    expect(reloadLine!.includes('claimed')).toBe(false);
    expect(reloadLine!.trim()).toBe('void loadData();');
  });

  test('оптимистичное удаление плитки сохранено — сетка реагирует мгновенно', () => {
    // Перезагрузка не должна была заменить мгновенный отклик: плитка уходит
    // сразу, loadData лишь подтверждает и наполняет вкладку «Активные».
    const body = closeGiftModalBody();
    expect(body).toContain('setItems((current) => current.filter(');
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
