import type { Lang } from '../../../constants/i18n';

/**
 * Подпись бейджа «место в лиге» на плитке Пика (Главная). 9 языков.
 *
 * зачем (координатор 18.10, красный spire_moments_v3_contract; скорость Главной): плитка брала эту одну строку из текстов моментов Пика (папка moments внутри spire),
 * а сторож запрещает импортировать модуль моментов вне Пика — и тянуло в холодный старт Главной весь модуль текстов моментов
 * (падежи лиг, слова монет, склонения). Нужна одна строка с числом, поэтому она живёт здесь. Совпадение с моментом держит
 * tests/home_spire_place_badge_parity.test.mjs (строка и порядок языков те же, что у ключа placeBadge).
 */
const PLACE_BADGE: Readonly<Record<Lang, string>> = {
  ru: '{n} место',
  uk: '{n} місце',
  en: 'Place {n}',
  es: 'Puesto {n}',
  'pt-BR': '{n}º lugar',
  vi: 'Hạng {n}',
  id: 'Ke-{n}',
  tr: '{n}. sıra',
  pl: '{n}. msc.',
};

/** «3 место» / «Place 3»; неизвестный язык — английский. */
export function spirePlaceBadgeText(lang: Lang, place: number): string {
  return (PLACE_BADGE[lang] ?? PLACE_BADGE.en).replace('{n}', String(place));
}
