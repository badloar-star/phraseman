// ═════════════════════════════════════════════════════════════════════
// i18n_ru_uk_plus.ts — собрать объект из 9 языков интерфейса: ru/uk из прежнего текста + 7 остальных из таблицы.
//
// зачем (координатор 13.10, проход зоны Ядра по текстам без перевода): окна «французский раздел готовится» были только ru/uk,
// а их русские и украинские тексты закрепляют тесты. Прежние функции остаются источником ru/uk, остальные 7 языков лежат
// таблицей рядом. Явные 9 ключей здесь — чтобы и triLang, и сторож переводов (scripts/scan_i18n_design_zone.mjs) видели полный набор.
// ═════════════════════════════════════════════════════════════════════

export type OtherInterfaceLangs = Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

export function ruUkPlus(ru: string, uk: string, other: OtherInterfaceLangs) {
  return { ru, uk, en: other.en, es: other.es, 'pt-BR': other['pt-BR'], vi: other.vi, id: other.id, tr: other.tr, pl: other.pl };
}
