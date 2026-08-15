import type { Lang } from '../../constants/i18n';
import type { CardItem } from './types';

/**
 * Keeps each authored-card translation in its own locale field. This utility
 * deliberately lives outside route modules so opening the editor never imports
 * the collection screen as an incidental dependency.
 */
export function customCardLocalizationForLang(
  lang: Lang,
  translatedText: string,
  existing?: CardItem,
): { baseRu: string; baseUk: string; baseEs: string; plannedSourceLocales: CardItem['sourceLocales'] } {
  const sourceLocales = { ...(existing?.sourceLocales ?? {}) };
  let ru = existing?.ru ?? '';
  let uk = existing?.uk ?? '';
  let es = existing?.es ?? '';

  switch (lang) {
    case 'uk':
      uk = translatedText;
      break;
    case 'es':
      es = translatedText;
      break;
    case 'pt-BR':
      sourceLocales['pt-BR'] = translatedText;
      break;
    case 'vi':
      sourceLocales.vi = translatedText;
      break;
    case 'id':
      sourceLocales.id = translatedText;
      break;
    case 'tr':
      sourceLocales.tr = translatedText;
      break;
    case 'pl':
      sourceLocales.pl = translatedText;
      break;
    case 'ru':
    default:
      ru = translatedText;
      break;
  }

  return { baseRu: ru, baseUk: uk, baseEs: es, plannedSourceLocales: sourceLocales };
}
