// зачем (координатор 29.10, находка Learning V2 + Сверка: Главная → «Уроки» → «Старый курс» → урок 1 → «Назад» → «Назад»; вторая «Назад» со списка ничего не делала):
// [BACK-GLOBAL] в корневом обработчике держал устаревший путь '/lesson_menu?id=1' → запасной маршрут '/(tabs)/lessons' → dismissTo на самого себя → no-op.
// Теперь safeRouterBack сам видит, что цель = экран, на котором человек уже стоит, и идёт на запасной путь раздела (с корня «Уроков» — на Главную),
// с записью [NAV-BACK] self_target (причина и значения).
function loadNavigationBack() {
  jest.resetModules();
  return require('../app/navigation_back') as typeof import('../app/navigation_back');
}

function makeRouter() {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => false),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
    replace: jest.fn(),
  };
}

describe('safeRouterBack: цель «назад» совпала с текущим экраном', () => {
  let warn: jest.SpyInstance;
  let now: jest.SpyInstance;
  let clock = 1_000_000;
  beforeEach(() => {
    clock = 1_000_000;
    now = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); now.mockRestore(); });

  it('находка 29.10: «назад» с урока на вкладку «Уроки», затем «назад» при устаревшем пути → Главная, а не no-op на самого себя', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/(tabs)/lessons');
    navigation.rememberNavigationPath('/lesson_menu?id=1');

    // первая «назад»: меню урока → вкладка «Уроки» (трекер НЕ получает новый путь — он устарел, как на устройстве)
    navigation.safeRouterBack(router, '/(tabs)/lessons' as never);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/lessons');

    // вторая «назад» через 2 с с тем же устаревшим запасным маршрутом корневого обработчика
    clock += 2_000;
    navigation.safeRouterBack(router, '/(tabs)/lessons' as never);
    expect(router.dismissTo).toHaveBeenCalledTimes(2);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/home');
    const selfTarget = warn.mock.calls.find((call) => call[0] === '[NAV-BACK] self_target');
    expect(JSON.parse(String(selfTarget?.[1]))).toMatchObject({ reason: expect.stringMatching(/^(leaving_is_chosen|already_there)$/), chosen: '/(tabs)/lessons', replacement: '/(tabs)/home', kept: false }); // после первого «назад» трекер уже держит вкладку текущим экраном (leaving_is_chosen); already_there ловит случай, когда он пуст;
  });

  it('трекер пуст после первого «назад» (история сброшена), второе «назад» с тем же запасным путём → already_there → Главная', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/lesson_menu?id=1');
    navigation.safeRouterBack(router, '/(tabs)/lessons' as never);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/lessons');
    clock += 2_000;
    navigation.safeRouterBack(router, '/(tabs)/lessons' as never);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/home');
    const selfTarget = warn.mock.calls.find((call) => call[0] === '[NAV-BACK] self_target');
    expect(JSON.parse(String(selfTarget?.[1]))).toMatchObject({ reason: 'already_there', pendingChosen: '/(tabs)/lessons', replacement: '/(tabs)/home' });
  });

  it('трекер считает текущим ту же цель (вкладка и её псевдоним) → Главная', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/lessons');
    navigation.safeRouterBack(router, '/(tabs)/lessons' as never);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/home');
    const selfTarget = warn.mock.calls.find((call) => call[0] === '[NAV-BACK] self_target');
    expect(JSON.parse(String(selfTarget?.[1]))).toMatchObject({ reason: 'leaving_is_chosen', replacement: '/(tabs)/home' });
  });

  it('обычное «назад» не затронуто: меню урока → вкладка «Уроки» с обновлённым трекером; тот же путь с другой сущностью — прежний откат на один шаг', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/(tabs)/lessons');
    navigation.rememberNavigationPath('/lesson_menu?id=1');
    navigation.safeRouterBack(router, '/(tabs)/lessons' as never);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/lessons');
    expect(warn.mock.calls.find((call) => call[0] === '[NAV-BACK] self_target')).toBeUndefined();
    // новый экран пришёл — признак «уже здесь» сбрасывается, следующее «назад» с вкладки ведёт на Главную штатно
    navigation.rememberNavigationPath('/(tabs)/lessons');
    clock += 2_000;
    navigation.safeRouterBack(router, '/(tabs)/home' as never);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/home');
  });

  it('на Главной «назад» не зацикливается: запасной путь Главной остаётся как есть (заменять нечем), причина в журнале', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.safeRouterBack(router, '/(tabs)/home' as never);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/home');
    const selfTarget = warn.mock.calls.find((call) => call[0] === '[NAV-BACK] self_target');
    expect(JSON.parse(String(selfTarget?.[1]))).toMatchObject({ kept: true });
  });

  it('currentNavigationHref отдаёт текущий экран по трекеру в момент вызова (для обработчиков, которые читали путь из замыкания)', () => {
    const navigation = loadNavigationBack();
    expect(navigation.currentNavigationHref()).toBeNull();
    navigation.rememberNavigationPath('/lesson_menu?id=1');
    expect(navigation.currentNavigationHref()).toBe('/lesson_menu?id=1');
    navigation.rememberNavigationPath('/(tabs)/lessons');
    expect(navigation.currentNavigationHref()).toBe('/(tabs)/lessons');
  });
});
