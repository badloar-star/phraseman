// зачем (координатор 26.10, правило владельца «назад ведёт туда, откуда пришёл»): три пути закрытия экрана промокода.
//  1) открыт из пейвола → «закрыть» возвращает в пейвол тем же replace с теми же context и source (окна в окне нет);
//  2) промокод применён → как раньше (итог награды, переход в настройки), возврат в пейвол не вмешивается;
//  3) открыт не из пейвола → как раньше (обычное «назад»).
import fs from 'node:fs';
import path from 'node:path';

import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';
import { PREMIUM_CONTEXT_SET } from '../app/premium_context';
import { promoCloseTarget } from '../app/paywall_promo_close_target';
import { openPromoCodeFromPaywall } from '../app/paywall_promo_navigation';

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
    expect(PREMIUM_CONTEXT_SET.has('dialog_limit')).toBe(true);
    expect(PAYWALL_SOURCE_VALUES).toContain('phrase_workshop');
    expect(promoCloseTarget({ source: 'paywall', paywallContext: 'dialog_limit', paywallSource: 'phrase_workshop' }))
      .toEqual({ kind: 'paywall', context: 'dialog_limit', source: 'phrase_workshop' });
    expect(promoCloseTarget({ source: ['paywall'], paywallContext: [' phrase_workshop '], paywallSource: ['phrase_workshop'] }))
      .toEqual({ kind: 'paywall', context: 'phrase_workshop', source: 'phrase_workshop' });
  });

  it('путь 3 — открыт не из пейвола (настройки, ссылка-подарок, без источника): обычное «назад»', () => {
    expect(promoCloseTarget({ source: 'settings' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({ source: 'gift_link', paywallContext: 'phrase_workshop', paywallSource: 'phrase_workshop' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({})).toEqual({ kind: 'back' });
  });

  it('из пейвола, но вход потерялся (нет context или source): не выдумываем вход, обычное «назад»', () => {
    expect(promoCloseTarget({ source: 'paywall' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({ source: 'paywall', paywallContext: 'phrase_workshop' })).toEqual({ kind: 'back' });
    expect(promoCloseTarget({ source: 'paywall', paywallContext: '  ', paywallSource: 'x' })).toEqual({ kind: 'back' });
  });
});

describe('промокод: значения из параметров маршрута проверяются по контракту (диплинк не откроет пейвол с мусором)', () => {
  const run = (input: Parameters<typeof promoCloseTarget>[0]) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      return { target: promoCloseTarget(input), logs: warn.mock.calls.map((call) => call.join(' ')) };
    } finally {
      warn.mockRestore();
    }
  };

  it('валидная пара → пейвол, без записи в журнал', () => {
    const { target, logs } = run({ source: 'paywall', paywallContext: 'phrase_workshop', paywallSource: 'phrase_workshop' });
    expect(target).toEqual({ kind: 'paywall', context: 'phrase_workshop', source: 'phrase_workshop' });
    expect(logs).toEqual([]);
  });

  it('мусорный context → «назад» и строка журнала с причиной и пришедшими значениями', () => {
    const { target, logs } = run({ source: 'paywall', paywallContext: 'мусор<script>', paywallSource: 'phrase_workshop' });
    expect(target).toEqual({ kind: 'back' });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('[PAYWALL-OPEN]');
    expect(logs[0]).toContain('unknown_context');
    expect(logs[0]).toContain('phrase_workshop');
  });

  it('мусорный source → «назад» и строка журнала с причиной', () => {
    const { target, logs } = run({ source: 'paywall', paywallContext: 'phrase_workshop', paywallSource: 'not_in_contract' });
    expect(target).toEqual({ kind: 'back' });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('unknown_source');
    expect(logs[0]).toContain('not_in_contract');
  });

  it('длинное чужое значение в журнал попадает урезанным', () => {
    const { logs } = run({ source: 'paywall', paywallContext: 'x'.repeat(500), paywallSource: 'phrase_workshop' });
    expect(logs[0].length).toBeLessThan(300);
  });

  it('файл проверки чистый: не тянет react-native и навигацию', () => {
    const code = read('app/paywall_promo_close_target.ts');
    expect(code).not.toMatch(/from 'react-native'|from 'expo-router'|navigation_back/);
  });
});

describe('экран промокода: подключение путей', () => {
  const screen = read('app/promo_code_entry.tsx');

  it('«закрыть» и Android-назад идут через один обработчик; пейвол открывается через replace', () => {
    expect(screen).toContain('onClose={closePromo}');
    expect(screen).toContain("openPremiumPaywall(router, { context: closeTarget.context, source: closeTarget.source }, 'replace')");
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
