// Слово владельца 05.11: «макеты пейволов одобряю! внести точно так же в приложение как на макете! 1 в 1» (макет «Все окна Plus», 37 окон, вариант 3).
// Сторож переноса: тексты по макету дословно (ru), три пункта у каждого контекста, абзац, плитки, кнопка, низ; промокод и пробный — по решениям владельца.
import fs from 'node:fs';
import path from 'node:path';

import { PAYWALL_V3_AUTO_RENEW, PAYWALL_V3_CTA_TRIAL, PAYWALL_V3_NO_TRIAL_CONTEXTS, PAYWALL_V3_NO_TRIAL_LINE, PAYWALL_V3_RESTORE, paywallV3Rows } from '../app/paywall_v3_rows';
import { PAYWALL_V3_CTA, paywallV3Body } from '../app/paywall_language_add_copy';
import { PREMIUM_CONTEXT_VALUES } from '../app/premium_context';
import type { Lang } from '../constants/i18n';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('пейвол по макету «Все окна Plus»: тексты', () => {
  it('каждый контекст — три пункта: свой первый (ru дословно по макету) + «Курс дальше» + «Больше практики»', () => {
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      if (ctx === 'theme' || ctx === 'arena_limit') continue; // снятые входы получают generic
      const rows = paywallV3Rows(ctx, 'ru', '');
      expect(rows).toHaveLength(3);
      expect(rows[0]!.title.length).toBeGreaterThan(2);
      expect(rows[1]).toEqual({ title: 'Курс дальше', detail: 'Продолжение после урока 3' });
      expect(rows[2]).toEqual({ title: 'Больше практики', detail: 'Видео, диалоги и карточки' });
    }
    expect(paywallV3Rows('language_add', 'ru', '')[0]).toEqual({ title: 'Языки на выбор', detail: 'Дополнительные языки с Plus' });
    expect(paywallV3Rows('no_energy', 'ru', '')[0]).toEqual({ title: 'Занятия без ожидания', detail: 'Энергия не тратится' });
    expect(paywallV3Rows('generic', 'ru', '')[0]).toEqual({ title: 'Говоришь вслух с первого дня', detail: 'Весь курс, разговоры и тренировки' });
  });
  it('на остальных языках первый пункт — утверждённая «первая выгода» контекста (без выдуманного пояснения)', () => {
    const rows = paywallV3Rows('no_energy', 'en', 'Lessons without waiting');
    expect(rows[0]).toEqual({ title: 'Lessons without waiting', detail: '' });
    expect(paywallV3Rows('no_energy', 'es', '')[0]!.title.length).toBeGreaterThan(2);
  });
  it('абзац, кнопки, автопродление, «Восстановить покупки» и «без пробного» — на всех 9 языках', () => {
    for (const lang of LANGS) {
      expect(paywallV3Body(lang).paragraph).toContain('1–3');
      for (const dict of [PAYWALL_V3_CTA, PAYWALL_V3_CTA_TRIAL, PAYWALL_V3_AUTO_RENEW, PAYWALL_V3_RESTORE, PAYWALL_V3_NO_TRIAL_LINE]) expect((dict[lang] ?? '').length).toBeGreaterThan(3);
    }
    expect(PAYWALL_V3_CTA.ru).toBe('Подключить Plus');
    expect(PAYWALL_V3_CTA_TRIAL.ru).toBe('Начать бесплатно');
    expect(PAYWALL_V3_RESTORE.ru).toBe('Восстановить покупки');
    expect(PAYWALL_V3_NO_TRIAL_LINE.ru).toBe('без пробного периода');
    expect(paywallV3Body('ru').paragraph).toBe('В первом выбранном языке уроки 1–3 бесплатны. Для продолжения и дополнительных языков нужен Plus.');
  });
  it('семь входов без пробного периода — как в макете', () => {
    expect([...PAYWALL_V3_NO_TRIAL_CONTEXTS].sort()).toEqual(['home_discount_badge', 'intro_ended', 'plus_server_refused', 'premium_expired', 'referral_ended', 'vip_expired', 'winback']);
  });
});

describe('пейвол по макету: экран', () => {
  const screen = read('components/paywall/PaywallPlusScreen.tsx');
  const plus = read('components/paywall/PaywallPlus.tsx');
  const rows = read('components/paywall/PaywallPlanRows.tsx');
  it('первый экран предлагает выбрать план, ниже контекст и сравнение из вкладки Plus', () => {
    expect(screen).toContain('title={paywallChoosePlan(lang)}');
    expect(screen).toContain('testID="paywall-pill"');
    expect(screen).toContain('<PlusTabBenefits lang={lang} g={g} items={benefits} />');
    expect(screen).toContain('selectedTrial ? (PAYWALL_V3_CTA_TRIAL[lang] ?? PAYWALL_V3_CTA_TRIAL.en) : (PAYWALL_V3_CTA[lang] ?? PAYWALL_V3_CTA.en)');
    expect(screen).toContain('labelReady && selectedPromo ? cta.label');
  });
  it('keeps a close action and the context in the scroll content', () => {
    expect(plus).not.toContain('>PhraseMan</Text>');
    expect(plus).toContain('testID="paywall-close"');
    expect(screen).toContain('testID="paywall-subtitle"');
    expect(plus).toContain('fontSize: 30, lineHeight: 35');
  });

  it('puts renewal disclosure after the purchase action with restore, promo and legal links available', () => {
    expect(plus.indexOf('testID="paywall-fine"')).toBeGreaterThan(plus.indexOf("'paywall-cta'"));
    expect(plus).toContain('PAYWALL_V3_RESTORE[lang] ?? PAYWALL_V3_RESTORE.en');
    expect(plus).toContain('testID="paywall-promo-code"');
    expect(plus).toContain('pick(lang, COPY.terms)');
    expect(plus).toContain('pick(lang, COPY.privacy)');
    expect(plus).not.toContain('refresh-outline');
    expect(plus).not.toContain('pricetag-outline');
  });
  it('keeps the billed price, period, and store trial readable in each tile', () => {
    expect(rows).toContain('>{shown}</Text>');
    expect(rows).toContain('>{subPrice}</Text>');
    expect(rows).not.toContain("approx ? '≈ ' : ''");
    expect(rows).toContain('trialFreeLabel(lang, trialDays)');
    expect(rows).toContain('borderWidth: 2');
    expect(rows).not.toMatch(/border(Width|Color)\s*:\s*[^,]*promo/);
  });
  it('цвета — токены темы (g.*), без жёстких цветов в новых строках', () => {
    for (const src of [plus, rows, read('components/paywall/PaywallCBenefits.tsx')]) {
      const block = src.split('\n').filter((l) => /backgroundColor|color:/.test(l) && /#[0-9a-fA-F]{6}/.test(l) && !/theme-exempt|PAYWALL_SAVINGS/.test(l));
      expect(block).toEqual([]);
    }
  });
});
