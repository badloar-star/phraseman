// ═══════════════════════════════════════════════════════════════════════════
// weekly_review_category_labels.ts — локализованные подписи частей речи.
//
// Вынесено в отдельный НЕ-UI модуль, чтобы сборщик брифинга (data layer) не
// импортировал .tsx-экран ради карты подписей (это потянуло бы React в данные).
// Форма копий совпадает с CATEGORY_LABELS в phrase_analytics.ts / экране —
// единый словарь подписей для всех частей речи.
// ═══════════════════════════════════════════════════════════════════════════

import type { AnalyticsLocaleCopy } from './phrase_analytics';

export const CATEGORY_LABEL_COPY: Record<string, AnalyticsLocaleCopy> = {
  verb: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', ptBR: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
  noun: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', ptBR: 'Substantivos', 'pt-BR': 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
  pronoun: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', ptBR: 'Pronomes', 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
  adjective: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', ptBR: 'Adjetivos', 'pt-BR': 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
  adverb: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', ptBR: 'Advérbios', 'pt-BR': 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
  preposition: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', ptBR: 'Preposições', 'pt-BR': 'Preposições', vi: 'Giới từ', id: 'Preposisi', tr: 'Edatlar', pl: 'Przyimki' },
  syntax: { ru: 'Порядок слов', uk: 'Порядок слів', es: 'Sintaxis', ptBR: 'Sintaxe', 'pt-BR': 'Sintaxe', vi: 'Cú pháp', id: 'Sintaksis', tr: 'Söz dizimi', pl: 'Składnia' },
  article: { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos', ptBR: 'Artigos', 'pt-BR': 'Artigos', vi: 'Mạo từ', id: 'Artikel', tr: 'Artikeller', pl: 'Przedimki' },
  existential: { ru: 'There is / There are', uk: 'There is / There are', es: 'There is / There are', ptBR: 'There is / There are', 'pt-BR': 'There is / There are', vi: 'There is / There are', id: 'There is / There are', tr: 'There is / There are', pl: 'There is / There are' },
  'to-be': { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be', ptBR: 'Verbo to be', 'pt-BR': 'Verbo to be', vi: 'Động từ to be', id: 'Kata kerja to be', tr: 'to be fiili', pl: 'Czasownik to be' },
  conjunction: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', ptBR: 'Conjunções', 'pt-BR': 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
  modal: { ru: 'Модальные глаголы', uk: 'Модальні дієслова', es: 'Verbos modales', ptBR: 'Verbos modais', 'pt-BR': 'Verbos modais', vi: 'Động từ khuyết thiếu', id: 'Kata kerja modal', tr: 'Modal fiiller', pl: 'Czasowniki modalne' },
  phrasal_particle: { ru: 'Частицы (phrasal)', uk: 'Частки (phrasal)', es: 'Partículas', ptBR: 'Partículas de phrasal verbs', 'pt-BR': 'Partículas de phrasal verbs', vi: 'Tiểu từ trong phrasal verb', id: 'Partikel phrasal verb', tr: 'Phrasal verb parçacıkları', pl: 'Partykuły phrasal verbs' },
  modifier: { ru: 'Усилители (modifiers)', uk: 'Підсилювачі (modifiers)', es: 'Modificadores', ptBR: 'Modificadores', 'pt-BR': 'Modificadores', vi: 'Từ bổ nghĩa', id: 'Modifier', tr: 'Niteleyiciler', pl: 'Modyfikatory' },
  determiner: { ru: 'Определители (determiners)', uk: 'Визначники (determiners)', es: 'Determinantes', ptBR: 'Determinantes', 'pt-BR': 'Determinantes', vi: 'Từ hạn định', id: 'Determiner', tr: 'Belirleyiciler', pl: 'Określniki' },
  other: { ru: 'Другое', uk: 'Інше', es: 'Otros', ptBR: 'Outros', 'pt-BR': 'Outros', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
};

/* expo-router route shim */
export default function __RouteShim() { return null; }
