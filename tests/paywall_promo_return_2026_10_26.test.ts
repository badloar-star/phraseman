// зачем (координатор 26.10, правило владельца «назад ведёт туда, откуда пришёл»): три пути закрытия экрана промокода.
//  1) открыт из пейвола → «закрыть» возвращает в пейвол тем же replace с теми же context и source (окна в окне нет);
//  2) промокод применён → как раньше (итог награды, переход в настройки), возврат в пейвол не вмешивается;
//  3) открыт не из пейвола → как раньше (обычное «назад»).
import fs from 'node:fs';
import path from 'node:path';

import { openPromoCodeFromPaywall, promoCloseTarget } from '../app/paywall_promo_navigation';

const read = (relativePath: string): string => fs.readFileSync(path.join(path.resolve(__dirname, '..'), relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('промокод из пейвола: открытие', () => {
  it('replace с источником «paywall» и входом пейвола в параметрах', () => {
    const replace = jest.fn();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      openPromoCodeFromPaywall({ replace }, { context: 'dialog_limit', source: 'ai_dialog_home' });
    } finally {
      log.mockRestore();
    }
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith({ pathname: '/promo_code_entry', params: { source: 'paywall', paywall_context: 'dialog_limit', paywall_source: 'ai_dialog_home' } });
  });

  it('вход неизвестен — параметры без выдуманных значений', () => {
    const replace = jest.fn();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      openPromoCodeFromPaywall({ replace });
    } finally {
      log.mockRestore();
    }
    expect(replace).toHaveBeenCalledWith({ pathname: '/promo_code_entry', params: { source: 'paywall' } });
  });
});

describe('промокод: куда ведёт «закрыть»', () => {
  it('путь 1 — из пейвола: обратно в пейвол с теми же context и source', () => {
    expect(promoCloseTarget({ source: 'paywall', paywallContext: 'dialog_limit', paywallSource: 'ai_dialog_home' }))
      .toEqual({ kind: 'paywall', params: { context: 'dialog_limit', source: 'ai_dialog_home' } });
    expect(promoCloseTarget({ source: ['paywall'], paywallContext: ['energy'], paywallSource: [' lesson_energy '] }))
      .toEqual({ kind: 'paywall', params: { context: 'energy', source: 'lesson_energy' } });
  });

  it('путь 3 — открыт не из пейвола (настройки, ссылка-подарок, без источника): обычное «назад»', () => {
    expect(promoCloseTarget({ source: 'settings' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({ source: 'gift_link', paywallContext: 'energy', paywallSource: 'x' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({})).toEqual({ kind: 'back' });
  });

  it('из пейвола, но вход потерялся (нет context или source): не выдумываем вход, обычное «назад»', () => {
    expect(promoCloseTarget({ source: 'paywall' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({ source: 'paywall', paywallContext: 'energy' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({ source: 'paywall', paywallContext: '  ', paywallSource: 'x' })).toEqual({ kind: 'back' });
  });
});

describe('экран промокода: подключение путей', () => {
  const screen = read('app/promo_code_entry.tsx');

  it('«закрыть» и Android-назад идут через один обработчик; пейвол открывается через replace', () => {
    expect(screen).toContain('onClose={closePromo}');
    expect(screen).toContain("openPremiumPaywall(router, closeTarget.params, 'replace')");
    expect(screen).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(screen).toContain("if (closeTarget.kind !== 'paywall'");
  });

  it('путь 2 и путь 3 остаются прежними: награда → настройки, прочие входы → safeRouterBack к прежнему запасному маршруту', () => {
    expect(screen).toContain("safeRouterBack(router, '/(tabs)/settings' as any);");
    expect(screen).toContain('safeRouterBack(router, closeFallback as any);');
    expect(screen).toContain("const closeFallback = source === 'settings' ? '/(tabs)/settings' : '/(tabs)/home';");
  });

  it('пейвол отдаёт свой вход промокоду, а сторож «окно в окне» не ослаблен (router.push в экране пейвола нет)', () => {
    const paywall = read('components/paywall/PaywallPlusScreen.tsx');
    expect(paywall).toContain('openPromoCodeFromPaywall(router, { context: ctx, source })');
    expect(paywall).not.toMatch(/router\.push/);
  });
});
