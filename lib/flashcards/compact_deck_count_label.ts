import { triLang, type Lang } from '../../constants/i18n';
import { cardsCountLabel } from '../../app/flashcards/deck_selection';

/** Localized card count used by the opt-in compact Liquid Glass deck row. */
export function compactDeckCountLabel(lang: Lang, count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (lang === 'ru' || lang === 'uk' || lang === 'es') return cardsCountLabel(lang, n);
  const polishFew = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return triLang(lang, {
    ru: cardsCountLabel('ru', n),
    uk: cardsCountLabel('uk', n),
    en: `${n} ${n === 1 ? 'card' : 'cards'}`,
    es: cardsCountLabel('es', n),
    'pt-BR': `${n} ${n === 1 ? 'cartão' : 'cartões'}`,
    vi: `${n} thẻ`,
    id: `${n} kartu`,
    tr: `${n} kart`,
    pl: `${n} ${n === 1 ? 'karta' : polishFew ? 'karty' : 'kart'}`,
  });
}
