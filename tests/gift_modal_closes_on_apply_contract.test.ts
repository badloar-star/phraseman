// ════════════════════════════════════════════════════════════════════════════
// gift_modal_closes_on_apply_contract.test.ts — «Применить» закрывает модалку.
//
// зачем 2026-08-03 (владелец): «когда мы нажимаем подарок, открываем его,
// нажимаем применить — то модалка обновляется и показывает то же состояние, а
// должна по моей логике закрыться».
//
// Было: подарок из инвентаря открывался в режиме apply со стартовой фазой box
// (previewingStoredGift). Кнопка вызывала только handleTap(true) — тот применял
// награду и переводил модалку в фазу reveal, ОСТАВЛЯЯ ЕЁ ОТКРЫТОЙ с той же
// кнопкой. Игрок видел почти не изменившийся экран и жал второй раз просто
// чтобы закрыть.
//
// Стало: применение запускается и модалка закрывается сразу. Это безопасно —
// applyGift вызывается ДО первой проверки видимости и продолжается фоном, а
// токен открытия обнуляется только при открытии НОВОЙ модалки, не при закрытии.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const MODAL = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'LevelGiftModal.tsx'),
  'utf8',
);
const DUAL_MODAL = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'LevelGiftDualModal.tsx'),
  'utf8',
);

/** Тело обработчика главной кнопки модалки (testID level-gift-claim). */
function claimButtonHandler(): string {
  const anchor = MODAL.indexOf('testID="level-gift-claim"');
  expect(anchor).toBeGreaterThan(-1);
  const start = MODAL.indexOf('onPress={', anchor);
  const end = MODAL.indexOf('style={', start);
  expect(end).toBeGreaterThan(start);
  return MODAL.slice(start, end);
}

describe('кнопка «Применить» у подарка из инвентаря', () => {
  const handler = claimButtonHandler();

  test('применение по-прежнему запускается', () => {
    // Закрытие не должно было отменить сам эффект подарка.
    expect(handler).toContain('handleTap(true)');
  });

  test('модалка закрывается СРАЗУ, а не показывает то же состояние', () => {
    // Ровно то, чего не хватало: после handleTap стоял голый return.
    expect(handler).toContain('closeForCurrentOpening(true)');
  });

  test('закрытие идёт ПОСЛЕ запуска применения, а не вместо него', () => {
    const applyAt = handler.indexOf('handleTap(true)');
    const closeAt = handler.indexOf('closeForCurrentOpening(true)');
    expect(applyAt).toBeGreaterThan(-1);
    expect(closeAt).toBeGreaterThan(applyAt);
  });

  test('закрытие помечено как «подарок получен»', () => {
    // claimed=true убирает плитку из инвентаря И запускает перезагрузку
    // вкладки «Активные» в closeGiftModal на экране подарков.
    expect(handler).not.toContain('closeForCurrentOpening(false)');
  });
});

describe('применение переживает закрытие модалки', () => {
  test('награда применяется ДО проверок, которые могли бы её оборвать', () => {
    // Если бы applyGift стоял после проверки, закрытие модалки обрывало бы
    // эффект и подарок сгорал бы впустую.
    const applyAt = MODAL.indexOf('const result = await applyGift(');
    expect(applyAt).toBeGreaterThan(-1);
    const guardAt = MODAL.indexOf('isCurrentAccountGeneration(accountToken)', applyAt);
    expect(guardAt).toBeGreaterThan(applyAt);
  });

  test('после применения проверяется АККАУНТ, а не видимость модалки', () => {
    // Важное свойство: закрытие модалки не является сменой аккаунта, поэтому
    // фоновое применение доходит до конца. Оборвать его может только реальная
    // смена пользователя — там обрыв как раз правильный.
    const applyAt = MODAL.indexOf('const result = await applyGift(');
    const tail = MODAL.slice(applyAt, applyAt + 400);
    expect(tail).toContain('isCurrentAccountGeneration');
  });

  test('токен открытия не сбрасывается при закрытии', () => {
    // Он переустанавливается только когда открывают НОВУЮ модалку —
    // иначе фоновое применение отменялось бы на полпути.
    const assignments = MODAL.match(/openingAccountTokenRef\.current = /g) ?? [];
    expect(assignments).toHaveLength(1);
    const at = MODAL.indexOf('openingAccountTokenRef.current = ');
    // Присваивание живёт в ветке «модалка только что открылась».
    expect(MODAL.slice(Math.max(0, at - 400), at)).toContain('if (!justOpened) return;');
  });

  test('после фонового результата пользователь получает явный success или error', () => {
    expect(MODAL).toContain("messageRu: 'Подарок применён.'");
    expect(MODAL).toContain("messageRu: 'Подарок не применился и остался в инвентаре.'");
  });

  test('двойной подарок также подтверждает полный или частичный результат', () => {
    expect(DUAL_MODAL).toContain("messageRu: 'Оба подарка применены.'");
    expect(DUAL_MODAL).toContain("messageRu: 'Один подарок применён, второй остался в инвентаре.'");
  });
});

describe('остальные пути закрытия не сломаны', () => {
  test('обычное открытие сундука закрывается как раньше', () => {
    expect(claimButtonHandler()).toContain('closeForCurrentOpening(!storesOnly)');
  });

  test('косметический подарок по-прежнему умеет вести в выбор аватара', () => {
    expect(MODAL).toContain('closeForCurrentOpening(true, true)');
  });
});
