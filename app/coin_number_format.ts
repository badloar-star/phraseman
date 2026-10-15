// coin_number_format.ts — число монет и слово «монета» по языку интерфейса (экраны «Монеты» и «Повысить ранг»).
//
// зачем (координатор 15.10, R54): экраны монет форматировали число по-русски для всех языков («1 180» в английском вместо «1,180»),
// а «Не хватает 1 монет» не склонялось. Правило формы — общее (constants/plural.ts); здесь только локали и слова.
import type { Lang } from '../constants/i18n';
import { pluralWord, type PluralForms } from '../constants/plural';

const NUMBER_LOCALE: Readonly<Record<string, string>> = {
  ru: 'ru-RU', uk: 'uk-UA', en: 'en-US', es: 'es-ES', 'pt-BR': 'pt-BR', vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
};

/** Целое неотрицательное число монет с разделителем тысяч по языку («1,180» en, «1.180» es/pt-BR/tr/id/vi, «1 180» ru/uk/pl). */
export function formatCoinsForLang(value: number, lang: Lang): string {
  const n = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  try {
    // зачем: узкий/неразрывный пробел локали → обычный, как было на экранах (шрифт рисует его ровно).
    return n.toLocaleString(NUMBER_LOCALE[lang] ?? 'en-US').replace(/[  ]/g, ' ');
  } catch (error) {
    console.warn(`[COIN-FORMAT] toLocaleString не сработал lang=${lang} — число без разделителей: ${String(error)}`);
    return String(n);
  }
}

// После «не хватает / brakuje» — родительный падеж: «1 монеты», «2 монет», «21 монеты», pl «1 monety, 5 monet».
const COIN_GEN: Readonly<Record<string, PluralForms>> = {
  ru: { one: 'монеты', few: 'монет', many: 'монет' },
  uk: { one: 'монети', few: 'монет', many: 'монет' },
  pl: { one: 'monety', few: 'monet', many: 'monet' },
  en: { one: 'coin', few: 'coins', many: 'coins' },
  es: { one: 'moneda', few: 'monedas', many: 'monedas' },
  'pt-BR': { one: 'moeda', few: 'moedas', many: 'moedas' },
  vi: { one: 'xu', few: 'xu', many: 'xu' },
  id: { one: 'koin', few: 'koin', many: 'koin' },
  tr: { one: 'jeton', few: 'jeton', many: 'jeton' },
};

/** Слово «монета» после «не хватает N …» в нужной форме. */
export function missingCoinsWord(lang: Lang, n: number): string {
  return pluralWord(lang, n, COIN_GEN[lang] ?? COIN_GEN.en!);
}
