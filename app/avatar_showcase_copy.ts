import type { Lang } from '../constants/i18n';

const TIER_TITLES: Record<number, Record<Lang, string>> = {
  50: { ru: 'Старт', uk: 'Старт', es: 'Inicio', 'pt-BR': 'Início', vi: 'Khởi đầu', id: 'Awal', tr: 'Başlangıç', pl: 'Start' },
  70: { ru: 'Выразительные', uk: 'Виразні', es: 'Expresivos', 'pt-BR': 'Expressivos', vi: 'Biểu cảm', id: 'Ekspresif', tr: 'Etkileyici', pl: 'Wyraziste' },
  90: { ru: 'Классика', uk: 'Класика', es: 'Clásicos', 'pt-BR': 'Clássicos', vi: 'Cổ điển', id: 'Klasik', tr: 'Klasikler', pl: 'Klasyka' },
  100: { ru: 'Премиум', uk: 'Преміум', es: 'Premium', 'pt-BR': 'Premium', vi: 'Cao cấp', id: 'Premium', tr: 'Premium', pl: 'Premium' },
  150: { ru: 'Эпические', uk: 'Епічні', es: 'Épicos', 'pt-BR': 'Épicos', vi: 'Sử thi', id: 'Epik', tr: 'Epik', pl: 'Epickie' },
  300: { ru: 'Легендарные', uk: 'Легендарні', es: 'Legendarios', 'pt-BR': 'Lendários', vi: 'Huyền thoại', id: 'Legendaris', tr: 'Efsanevi', pl: 'Legendarne' },
  500: { ru: 'Мифические', uk: 'Міфічні', es: 'Míticos', 'pt-BR': 'Míticos', vi: 'Thần thoại', id: 'Mitologis', tr: 'Mitik', pl: 'Mityczne' },
  1000: { ru: 'Вершина коллекции', uk: 'Вершина колекції', es: 'Cumbre de la colección', 'pt-BR': 'Ápice da coleção', vi: 'Đỉnh cao bộ sưu tập', id: 'Puncak koleksi', tr: 'Koleksiyonun zirvesi', pl: 'Szczyt kolekcji' },
};

function slavicPlural(count: number, one: string, few: string, many: string): string {
  const normalized = Math.abs(Math.floor(count));
  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function polishPlural(count: number, one: string, few: string, many: string): string {
  const normalized = Math.abs(Math.floor(count));
  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (normalized === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function avatarShowcaseTierTitle(price: number, lang: Lang): string {
  return TIER_TITLES[price]?.[lang] ?? String(price);
}

export function avatarShowcaseCountLabel(count: number, lang: Lang): string {
  if (lang === 'ru') return `${count} ${slavicPlural(count, 'аватар', 'аватара', 'аватаров')}`;
  if (lang === 'uk') return `${count} ${slavicPlural(count, 'аватар', 'аватари', 'аватарів')}`;
  if (lang === 'pl') return `${count} ${polishPlural(count, 'awatar', 'awatary', 'awatarów')}`;
  if (lang === 'es' || lang === 'pt-BR') return `${count} ${count === 1 ? 'avatar' : 'avatares'}`;
  return `${count} avatar`;
}

export function avatarShowcasePriceFilterLabel(price: number, lang: Lang): string {
  const currency = lang === 'ru'
    ? slavicPlural(price, 'жемчужина', 'жемчужины', 'жемчужин')
    : lang === 'uk'
      ? slavicPlural(price, 'перлина', 'перлини', 'перлин')
      : lang === 'pl'
        ? polishPlural(price, 'perła', 'perły', 'pereł')
        : ({ es: 'perlas', 'pt-BR': 'pérolas', vi: 'ngọc trai', id: 'mutiara', tr: 'inci' } as const)[lang];
  return `${price} ${currency} · ${avatarShowcaseTierTitle(price, lang)}`;
}
