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

describe('гейт покупки: без пропуска не выдаётся НИЧЕГО', () => {
  test('обе линии закрыты одним признаком владения пропуском', () => {
    // Раньше было `!isPassLane || laneUnlockedForPass` — бесплатная линия
    // раздавалась любому. Теперь пропуск это вход в обе линии.
    expect(SOURCE).toContain('const laneUnlocked = laneUnlockedForPass;');
    expect(SOURCE).not.toContain('const laneUnlocked = !isPassLane || laneUnlockedForPass;');
  });

  test('забрать награду можно только при открытом доступе', () => {
    expect(SOURCE).toContain('const claimable = laneUnlocked && reached && !isClaimed;');
  });

  test('замок висит на обеих линиях, а не только на платной', () => {
    expect(SOURCE).toContain('{!laneUnlockedForPass && (');
    expect(SOURCE).not.toContain('{isPassLane && !laneUnlockedForPass && (');
  });

  test('доступ даёт покупка ИЛИ премиум — других путей нет', () => {
    expect(SOURCE).toContain('const laneUnlockedForPass = isPremium || passOwned;');
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
      SOURCE.indexOf('const onLockedRewardPress') + 900,
    );
    expect(handler).toContain('setBuyConfirmVisible(true)');
  });

  test('закрытая плитка доступна скринридеру с понятной подписью', () => {
    expect(SOURCE).toContain("accessibilityLabel: 'Нужен пропуск сезона, чтобы забрать подарок'");
  });
});

describe('кнопка покупки', () => {
  test('кнопка есть и показывается, пока пропуск не открыт', () => {
    expect(SOURCE).toContain('testID="season-pass-buy"');
    expect(SOURCE).toContain('{!laneUnlockedForPass && (');
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
