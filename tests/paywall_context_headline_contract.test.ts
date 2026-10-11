// зачем (владелец 11.10: «все пейволы должны быть контекстными всегда»): у каждого контекста окна Plus в каждом из
// 9 языков есть заголовок и подзаголовок; пробелы в переводах видны поимённо, а не прячутся за русской подстановкой.
import { PREMIUM_CONTEXT_VALUES } from '../app/premium_context';
import { paywallContextHeadline } from '../app/paywall_context_headline';

const LANGS = ['ru', 'uk', 'es', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;

describe('контракт контекста окна Plus', () => {
  it('у каждого контекста в каждом языке есть заголовок и подзаголовок', () => {
    const gaps: string[] = [];
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      for (const lang of LANGS) {
        const headline = paywallContextHeadline(ctx, lang as never);
        if (!headline.title) gaps.push(`${ctx}/${lang}: title`);
        if (!headline.subtitle) gaps.push(`${ctx}/${lang}: subtitle`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('нерусские языки не получают кириллицу', () => {
    const leaks: string[] = [];
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      for (const lang of LANGS.filter((l) => l !== 'ru' && l !== 'uk')) {
        const h = paywallContextHeadline(ctx, lang as never);
        for (const [field, text] of Object.entries({ title: h.title, subtitle: h.subtitle, firstBenefit: h.firstBenefit })) {
          if (CYRILLIC.test(text)) leaks.push(`${ctx}/${lang}: ${field}`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it('контекст «нет энергии» говорит про энергию, а не общий текст', () => {
    expect(paywallContextHeadline('no_energy', 'ru' as never)).toMatchObject({
      copyContext: 'no_energy',
      title: 'Занимайся без ожидания',
    });
    expect(paywallContextHeadline('no_energy', 'en' as never).title).toBe('Study without waiting');
  });

  it('сводка: у каких контекстов нет своей первой выгоды на языке (для Дизайна и текстов)', () => {
    const missing: string[] = [];
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      for (const lang of LANGS) {
        if (!paywallContextHeadline(ctx, lang as never).firstBenefit) missing.push(`${ctx}/${lang}`);
      }
    }
    // Не падает: это список работы для текстов. Печатаем, чтобы его было видно в журнале прогона.
    // eslint-disable-next-line no-console
    console.log('[PAYWALL-CONTEXT] нет первой выгоды:', missing.length, JSON.stringify(missing));
    expect(Array.isArray(missing)).toBe(true);
  });
});
