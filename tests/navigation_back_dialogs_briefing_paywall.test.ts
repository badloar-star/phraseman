// зачем (Сверка 14.10 20:05–20:09, evidence/no_energy_plus, 3 из 3): «Получить Plus» на брифинге диалога открыл пейвол, но крестик вёл
// на Главную. Журнал: `[NAV-BACK] candidate:reset reason=leaving_no_section leaving=/premium_modal` → `chosen=/(tabs)/home branch=dismissTo`.
// Брифинг /dialogue_v2_briefing не был приписан ни к одному разделу: история «куда вернуться» обнулялась на нём, пейвол наследовал
// пустой раздел, и выход из пейвола сбрасывал историю на Главную, снимая брифинг. Сторож держит: брифинг — часть раздела «Диалоги»,
// пейвол поверх него закрывается обратно на брифинг одним шагом.
type RouterStub = {
  canGoBack: jest.Mock<boolean, []>;
  canDismiss: jest.Mock<boolean, []>;
  back: jest.Mock<void, []>;
  dismiss: jest.Mock<void, [number?]>;
  dismissTo: jest.Mock<void, [unknown]>;
  replace: jest.Mock<void, [unknown]>;
};

function loadNavigationBack() {
  jest.resetModules();
  return require('../app/navigation_back') as typeof import('../app/navigation_back');
}

function makeDismissableRouter(): RouterStub {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
    replace: jest.fn(),
  };
}

describe('Dialogs briefing → no energy → Plus → close returns to the briefing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('the briefing belongs to the Dialogs section', () => {
    const navigation = loadNavigationBack();
    expect(navigation.navigationRoutePolicyForAudit('/dialogue_v2_briefing')).toMatchObject({ role: 'child', section: 'dialogs' });
  });

  it('closing the paywall opened from the briefing dismisses one step back to the briefing', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();
    navigation.rememberNavigationPath('/ai_dialog_home');
    navigation.rememberNavigationPath('/dialogue_v2_briefing?scenarioId=cafe');
    navigation.rememberNavigationPath('/premium_modal?context=no_energy&source=no_energy_modal');

    navigation.dismissPaywallModal(router, '/(tabs)/home' as never);

    expect(router.dismiss).toHaveBeenCalledWith(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('«Позже» on the briefing still goes back to the dialogs list', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();
    navigation.rememberNavigationPath('/ai_dialog_home');
    navigation.rememberNavigationPath('/dialogue_v2_briefing?scenarioId=cafe');

    navigation.safeRouterBack(router, '/ai_dialog_home' as never);

    expect(router.dismissTo).toHaveBeenCalledWith('/ai_dialog_home');
  });
});
