import type { Lang } from '../../constants/i18n';
import type { IntroI18nText } from '../../app/lesson_data_types';

/**
 * Локализация подсказок интерактива теории.
 * IntroI18nText использует ключи ru/uk/es/ptBr/vi/id/tr/pl.
 * Цепочка отката НИКОГДА не возвращает пусто при наличии ru (защита от I18N-01).
 */
export function introText(txt: IntroI18nText | undefined, lang: Lang): string {
  if (!txt) return '';
  switch (lang) {
    case 'uk':
      return txt.uk ?? txt.ru;
    case 'es':
      return txt.es ?? txt.ru;
    case 'pt-BR':
      return txt.ptBr ?? txt.ru;
    case 'vi':
      return txt.vi ?? txt.ru;
    case 'id':
      return txt.id ?? txt.ru;
    case 'tr':
      return txt.tr ?? txt.ru;
    case 'pl':
      return txt.pl ?? txt.ru;
    default:
      return txt.ru;
  }
}
