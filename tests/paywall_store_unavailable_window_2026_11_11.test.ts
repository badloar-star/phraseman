// paywall_store_unavailable_window_2026_11_11.test.ts — окно Plus «магазин недоступен»: выход вместо тупика.
// зачем (владелец 11.11, макет docs/work/mockups/paywall-store-unavailable-2026-11-11/index.html, «Делать оба варианта»): сторож держит
// главное — Telegram показывается только на Android (у Apple это нарушение 3.1.1), в ссылке на бота нет данных человека,
// кнопка кода слушается переключателя промокодов, а покупки и строки про списание в этой ветке нет.
import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '../constants/i18n';

import { PREMIUM_TELEGRAM_BOT_URL, STORE_OFF_COPY, storeOffRoute } from '../components/paywall/duo/paywall_store_off_copy';
import { pick } from '../components/paywall/PaywallPlusCopy';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно «магазин недоступен» — выход по платформе', () => {
  it('Telegram — только Android; iPhone и всё остальное ведут в поддержку', () => {
    expect(storeOffRoute('android')).toBe('telegram');
    expect(storeOffRoute('ios')).toBe('support');
    expect(storeOffRoute('web')).toBe('support');
    expect(storeOffRoute('')).toBe('support');
  });

  it('ссылка на бота — без данных человека: ни параметров, ни пути после имени', () => {
    expect(PREMIUM_TELEGRAM_BOT_URL).toBe('https://t.me/PhrasemanPremiumBot');
    expect(PREMIUM_TELEGRAM_BOT_URL).not.toMatch(/[?#&=]/u);
  });

  it('русские тексты — как в одобренном макете', () => {
    expect(pick('ru', STORE_OFF_COPY.telegramTitle)).toBe('Оплатить через Telegram');
    expect(pick('ru', STORE_OFF_COPY.telegramSub)).toBe('Способы оплаты и код — в боте');
    expect(pick('ru', STORE_OFF_COPY.supportTitle)).toBe('Написать в поддержку');
    expect(pick('ru', STORE_OFF_COPY.supportSub)).toBe('Подскажем, как оформить Plus');
    expect(pick('ru', STORE_OFF_COPY.codeTitle)).toBe('У меня есть код');
    expect(pick('ru', STORE_OFF_COPY.codeSub)).toBe('Plus включится сразу');
    expect(pick('ru', STORE_OFF_COPY.fine)).toBe('Магазин на этом устройстве недоступен');
  });

  it('каждый текст переведён на 9 языков; цены и слова «бесплатно» в окне нет', () => {
    const all: string[] = [];
    for (const copy of Object.values(STORE_OFF_COPY)) {
      for (const lang of LANGS) {
        const text = pick(lang, copy);
        expect(text.trim().length).toBeGreaterThan(0);
        all.push(text);
      }
    }
    const joined = all.join(' ').toLocaleLowerCase();
    for (const banned of ['€', '$', '₽', 'бесплатн', 'free']) expect(joined).not.toContain(banned);
  });

  it('текст для iPhone не называет Telegram и оплату — только поддержку', () => {
    for (const lang of LANGS) {
      const ios = `${pick(lang, STORE_OFF_COPY.supportTitle)} ${pick(lang, STORE_OFF_COPY.supportSub)}`.toLocaleLowerCase();
      expect(ios).not.toContain('telegram');
    }
  });
});

describe('окно «магазин недоступен» — подключение в экран покупки', () => {
  const screen = read('components/paywall/PaywallPlusScreen.tsx');
  const dock = read('components/paywall/PaywallPlus.tsx');
  const part = read('components/paywall/duo/PaywallDuoStoreOff.tsx');

  it('ветка включается только причиной от магазина и только в окне «Два пути»', () => {
    expect(screen).toContain("const storeOff = duo && p.storeUnavailableReason === 'billing_unavailable';");
    expect(screen).toContain('const storeOffWay = storeOffRoute(Platform.OS);');
  });

  it('в ветке нет покупки: кнопки-тарифы заменены, нижняя кнопка покупки и строка про списание скрыты', () => {
    expect(screen).toContain('{storeOff ? (\n                    <PaywallDuoStoreOff');
    expect(screen).toContain('{duo && !storeOff ? (\n            <PaywallDuoStickyBuy');
    expect(screen).toContain('hideFine={storeOff}');
    expect(dock).toContain('{hideFine ? null : <Text testID="paywall-fine"');
    expect(part).not.toContain('handlePurchase');
    expect(part).not.toContain('onBuy');
  });

  it('кнопка кода слушается переключателя промокодов и ведёт на существующий ввод кода', () => {
    expect(screen).toContain('codeVisible={controlVisibility.promoVisible}');
    expect(screen).toContain('openPromoCodeFromPaywall(router, { context: ctx, source });\n  }, [ctx, router, source]);');
  });

  it('Telegram открывается ссылкой; не открылся — человек попадает в поддержку, а не остаётся ни с чем', () => {
    expect(screen).toContain('Linking.openURL(PREMIUM_TELEGRAM_BOT_URL).catch(');
    expect(screen).toContain("openSupportFromStoreOff('telegram_failed');");
    expect(screen).toContain("router.replace('/support_report' as never);");
    // сторож «нет окна внутри окна»: обращение заменяет пейвол, поверх него ничего не открывается
    expect(screen).not.toMatch(/router\.push/u);
  });

  it('каждое действие и показ пишут в журнал с единой меткой; немых catch нет', () => {
    expect(screen.match(/\[PAYWALL-STOREOFF\]/gu)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(screen).not.toMatch(/catch\s*\{\s*\}/u);
  });

  it('запреты владельца в новом блоке: без обводок и без ужатия шрифта', () => {
    expect(part).not.toContain('borderWidth');
    expect(part).not.toContain('borderColor');
    expect(part).not.toContain('adjustsFontSizeToFit');
  });
});
