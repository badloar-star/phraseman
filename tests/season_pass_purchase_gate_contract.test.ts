// ════════════════════════════════════════════════════════════════════════════
// season_pass_purchase_gate_contract.test.ts — пропуск покупается, подарки за него.
//
// зачем 2026-08-03 (владелец): «пропуск я же говорил надо купить, он не даётся
// просто так, ты не можешь получать подарки просто так. Когда заходим в сезон,
// кнопка должна быть, а она пропала. Прогресс идёт, но при нажатии на любой
// подарок написано, что нужен пропуск чтобы получить подарок. Юзер видит свой
// потенциальный уже тир и прогресс, но без пропуска ничего не может получить».
//
// Это ДЕНЬГИ: если гейт протечёт, подарки раздаются бесплатно и покупка теряет
// смысл. Экран в jest не поднимается (react-native-svg), поэтому контракт
// проверяется по исходнику — тот же приём, что в остальных контрактах экранов.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'season_pass.tsx'),
  'utf8',
);

// зачем 2026-08-03 (владелец, дословно: «250 СТОИТ ВХОД ДЛЯ ВСЕХ И ДЛЯ ФРИ И
// ДЛЯ ПРЕМИУМ! просто фри таер будет получать только подарки слева, а плюс
// таер будет получать и слева и справа»): прежний контракт фиксировал модель
// `isPremium || passOwned` — подписка ЗАМЕНЯЛА покупку. Это и прятало кнопку
// «250» у премиума. Теперь осей две и они независимы, тест сторожит обе.
describe('гейт покупки: вход — только за деньги, ширина выдачи — по тиру', () => {
  test('вход в дорожку даёт ТОЛЬКО покупка, подписка его не заменяет', () => {
    expect(SOURCE).toContain('const passBought = passOwned;');
    // Ключевая защита денег: premium не должен вновь стать входным билетом.
    expect(SOURCE).not.toContain('const laneUnlockedForPass = isPremium || passOwned;');
  });

  test('правая линия — привилегия Plus, но работает только после покупки', () => {
    expect(SOURCE).toContain('const passLaneAllowed = isPremium;');
    expect(SOURCE).toContain('const laneUnlocked = passBought && (!isPassLane || passLaneAllowed);');
  });

  test('забрать награду можно только при открытом доступе', () => {
    expect(SOURCE).toContain('const claimable = laneUnlocked && reached && !isClaimed;');
  });

  test('замок висит на каждой недоступной игроку линии', () => {
    expect(SOURCE).toContain('{!laneUnlocked && (');
  });
});

describe('закрытый подарок объясняет причину', () => {
  test('плитка закрытой награды нажимается, а не молчит', () => {
    expect(SOURCE).toContain('const locked = !laneUnlocked && reached && !isClaimed;');
    expect(SOURCE).toContain('const Wrapper = claimable || locked ? TouchableOpacity : View;');
  });

  test('тап объясняет, что нужен пропуск', () => {
    expect(SOURCE).toContain('Нужен пропуск сезона, чтобы забирать подарки');
  });

  test('тап по закрытому подарку сразу ведёт к покупке', () => {
    // Путь «хочу этот подарок» → покупка в один тап, без поиска кнопки внизу.
    const handler = SOURCE.slice(
      SOURCE.indexOf('const onLockedRewardPress'),
      SOURCE.indexOf('const onBuyConfirm'),
    );
    expect(handler).toContain('setBuyConfirmVisible(true)');
  });

  test('купившему фри правая линия предлагает Plus, а не вторую покупку', () => {
    // зачем: пропуск у него уже есть — окно «Купить за 250» читалось бы как
    // поломка. Развилка обязана вести в витрину подписки.
    const handler = SOURCE.slice(
      SOURCE.indexOf('const onLockedRewardPress'),
      SOURCE.indexOf('const onBuyConfirm'),
    );
    expect(handler).toContain('if (passBought && isPassLane && !passLaneAllowed) {');
    expect(handler).toContain("pathname: '/premium_modal'");
  });

  test('закрытая плитка доступна скринридеру с понятной подписью', () => {
    // Подписи две — по той же развилке, что и тост.
    expect(SOURCE).toContain("'Нужен пропуск сезона, чтобы забрать подарок'");
    expect(SOURCE).toContain("'Правая линия подарков доступна с Plus'");
  });
});

describe('кнопка покупки', () => {
  test('кнопка есть и показывается ВСЕМ, пока пропуск не куплен', () => {
    // Владелец: «250 стоит вход для всех». Премиум тоже обязан видеть цену —
    // раньше условие пряталось за laneUnlockedForPass и у подписчика кнопки
    // не было вовсе, хотя дорожка ему тоже не открыта без покупки.
    expect(SOURCE).toContain('testID="season-pass-buy"');
    expect(SOURCE).toContain('{!passBought && (');
  });

  test('цена видна на кнопке', () => {
    expect(SOURCE).toContain('SEASON_PASS_PRICE_PEARLS');
    expect(SOURCE).toMatch(/const SEASON_PASS_PRICE_PEARLS = \d+;/);
  });

  test('двойной тап по покупке отсечён', () => {
    expect(SOURCE).toContain('if (passOwned || buying) return;');
  });

  test('покупка оптимистична, но откатывается при отказе сервера', () => {
    // Деньги: нельзя оставить дорожку открытой, если сервер не списал жемчуг.
    expect(SOURCE).toContain('setPassOwned(true);');
    expect(SOURCE).toContain('setPassOwned(false); // откат optimistic-разблокировки');
  });

  test('прогресс дорожки виден и без пропуска', () => {
    // Владелец: «юзер видит свой потенциальный уже тир и прогресс».
    // Уровень считается всегда, гейт стоит только на выдаче.
    expect(SOURCE).toContain('progress.level');
    expect(SOURCE).not.toMatch(/if \(!laneUnlockedForPass\) return null/);
  });
});
