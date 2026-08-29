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
  // зачем 2026-08-04 (владелец: «я говорил разработать модалы для КАЖДОГО
  // подарка, и открыть модал можно даже когда оно ещё недоступно»): прежний
  // контракт сторожил буквальную реализацию `const Wrapper = claimable ||
  // locked ? TouchableOpacity : View` — то есть требовал, чтобы недостигнутая
  // и уже забранная плитки оставались НЕнажимаемым View. Само намерение
  // («закрытая плитка не молчит») не отменено, а расширено: нажимается ЛЮБАЯ
  // карточка в любом статусе, потому что смотреть описание можно всегда.
  // Тест теперь сторожит правило, а не форму кода.
  test('плитка закрытой награды нажимается, а не молчит', () => {
    expect(SOURCE).toContain('const locked = !laneUnlocked && reached && !isClaimed;');
    // Немого View на карточке награды больше нет ни в одном статусе.
    expect(SOURCE).not.toMatch(/const Wrapper\s*=/);
  });

  test('описание подарка открывается в ЛЮБОМ статусе, включая недоступный', () => {
    // Статус вычисляется для всех четырёх случаев и уезжает в модалку —
    // «ещё не заработал» тоже обязан открываться, иначе игрок не увидит,
    // ради чего копить звёзды.
    expect(SOURCE).toMatch(/status: SeasonRewardCardStatus = claimable/);
    expect(SOURCE).toContain("isClaimed ? 'claimed' : locked ? 'locked' : 'upcoming'");
    expect(SOURCE).toContain('setOpenInfoReward({');
    expect(SOURCE).toContain('claimToken: captureAccountGeneration()');
    expect(SOURCE).toContain('claimSeasonId: seasonId');
    expect(SOURCE).toContain('<SeasonRewardInfoModal');
  });

  test('тап объясняет, что нужен пропуск', () => {
    expect(SOURCE).toContain('Нужен пропуск сезона, чтобы забирать подарки');
  });

  test('тап по закрытому подарку сразу ведёт к покупке', () => {
    // Путь «хочу этот подарок» → покупка в один тап, без поиска кнопки внизу.
    // Тап теперь открывает описание, а кнопка «Нужен пропуск» внутри него
    // зовёт тот же onLockedRewardPress — развилка покупки не потерялась.
    const handler = SOURCE.slice(
      SOURCE.indexOf('const onLockedRewardPress'),
      SOURCE.indexOf('const onBuyConfirm'),
    );
    expect(handler).toContain('setBuyConfirmVisible(true)');
    expect(SOURCE).toContain('onNeedPass={');
    expect(SOURCE).toMatch(/onNeedPass=\{[\s\S]{0,220}onLockedRewardPress\(/);
  });

  test('просмотр описания сам по себе НИЧЕГО не выдаёт', () => {
    // Деньги: модалка read-only. Клейм обязан идти только через onClaim,
    // под теми же условиями claimable, а не срабатывать от открытия окна.
    expect(SOURCE).toMatch(/onClaim=\{[\s\S]{0,400}onClaimReward\(\s*intent\.reward/);
    expect(SOURCE).toContain('commitSeasonPassRewardClaim({');
    // Открытие описания — чистый setState без записи в инвентарь.
    expect(SOURCE).not.toMatch(/setOpenInfoReward\([\s\S]{0,120}addSeasonPassGift/);
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

  // зачем (24.08): тест сторожил ОТМЕНЁННУЮ схему — «сначала разблокируй, при
  // отказе откати» — и требовал буквальной строки `setPassOwned(false)`.
  // Покупка давно переехала на commitShardPurchase: он атомарно списывает
  // жемчуг и выдаёт пропуск, поэтому `setPassOwned(true)` стоит ТОЛЬКО в ветке
  // подтверждённого списания, а при отказе пропуск не выдаётся вовсе — откатывать
  // нечего. Требовать откат здесь значит требовать вернуть менее безопасный
  // порядок. Сторожим сам денежный инвариант, а не исчезнувшую строку.
  test('пропуск выдаётся ТОЛЬКО после подтверждённого списания жемчуга', () => {
    // Деньги: дорожка не может открыться, если списание не подтверждено.
    expect(SOURCE).toContain('setPassOwned(true);');
    expect(SOURCE).toContain('commitShardCompositeOperation');
    // Единственная выдача — внутри ветки успешного списания.
    expect(SOURCE.match(/setPassOwned\(true\)/g)).toHaveLength(1);
    const applied = SOURCE.indexOf("purchase.status === 'applied'");
    const granted = SOURCE.indexOf('setPassOwned(true);');
    expect(applied).toBeGreaterThan(-1);
    expect(granted).toBeGreaterThan(applied);
    // Отказ сервера НЕ отбирает уже оплаченный пропуск (баланс решает клиентский
    // леджер, а не callable) — иначе оплативший терял покупку из-за сети.
    expect(SOURCE).toContain('void seasonBuyPassOnServer().catch(() => null);');
  });

  test('прогресс дорожки виден и без пропуска', () => {
    // Владелец: «юзер видит свой потенциальный уже тир и прогресс».
    // Уровень считается всегда, гейт стоит только на выдаче.
    expect(SOURCE).toContain('progress.level');
    expect(SOURCE).not.toMatch(/if \(!laneUnlockedForPass\) return null/);
  });

  // зачем 2026-08-03 (владелец: «при нажатии на купить пропуск написано „купить
  // платную дорожку“ — неактуальный текст, он не отображает суть; пропуск
  // покупают и премиум и фри»): тексты витрины — часть денежного контракта.
  // Игрок решает потратить 250 жемчужин по тому, что здесь написано.
  describe('текст подтверждения покупки говорит правду', () => {
    test('никакой «платной дорожки» — в интерфейсе есть только ПРОПУСК и ПЛЮС ПРОПУСК', () => {
      // «Платная дорожка» — внутренний термин: он противопоставляет платное
      // бесплатному, хотя бесплатной линии больше нет, и не совпадает ни с
      // одним заголовком колонки на экране.
      expect(SOURCE).not.toContain('Открыть платную дорожку?');
      expect(SOURCE).not.toContain('Відкрити платну доріжку?');
      expect(SOURCE).not.toContain('Otworzyć płatną ścieżkę?');
      // зачем (аудит по Библии, 2026-08-26): слово «Купить» запрещено словарём
      // Библии (купить → открыть/разблокировать). Контракт сторожит СУТЬ —
      // отсутствие внутреннего термина «платная дорожка» и слово «пропуск», —
      // поэтому ждём новую формулировку с тем же смыслом.
      expect(SOURCE).toContain('Открыть пропуск сезона?');
    });

    test('обещание наград зависит от тира — фри не обещают золотую линию', () => {
      // Правая линия остаётся за Plus даже после покупки (passLaneAllowed),
      // поэтому единый текст «все золотые награды станут доступны» был ложным
      // обещанием для игрока без подписки.
      expect(SOURCE).not.toContain('Все золотые награды сезона станут доступны');
      // Owner-directed confirmation is intentionally title-only; it must not
      // promise either reward lane before purchase.
      expect(SOURCE).not.toContain('Золотая линия открывается с Plus.');
      expect(SOURCE).toContain('заголовок самодостаточен');
    });

    test('заголовок модалки и кнопка внизу говорят об одном действии', () => {
      // Кнопка «Открыть пропуск» и подтверждение «Открыть пропуск сезона?»
      // используют одно слово — пропуск, а не два разных термина.
      expect(SOURCE).toContain('Открыть пропуск');
      expect(SOURCE).toContain('Открыть пропуск сезона?');
    });
  });
});
