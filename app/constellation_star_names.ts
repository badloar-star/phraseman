// ════════════════════════════════════════════════════════════════════════════
// constellation_star_names.ts — имена звёзд от координат (этап 2.1).
//
// У каждой звезды карты своё имя (Гександр, Веста, Орн…) — видно в шторке цели
// и подписью на карте. Детерминированно от ключа гекса: одна и та же звезда
// всегда зовётся одинаково во всех матчах (узнаваемость поля). Полярная звезда
// (центр) — всегда «Полярная»/аналог.
//
// Пул имён — космически-мифологический микс, ПРИДУМАННЫЙ (не реальные
// астрономические имена вроде «Веста»), поэтому кириллический пул нечитаем
// для игрока с интерфейсом на tr/id/vi/pl/pt-BR/es (жалоба: «українською чому
// показує кирилицю»). Каждый язык интерфейса получает свой пул того же
// размера — индекс по хешу ключа гекса остаётся детерминированным.
// ════════════════════════════════════════════════════════════════════════════

import type { Lang } from '../constants/i18n';
import { parseHexKey } from './constellations_hex';

const POLAR_KEY = '0,0';

const POLAR_NAMES: Readonly<Record<Lang, string>> = {
  ru: 'Полярная', uk: 'Полярна', es: 'Polar', 'pt-BR': 'Polar',
  vi: 'Sao Cực', id: 'Kutub', tr: 'Kutup', pl: 'Polarna',
};

/** Пул имён звёзд на языке интерфейса (индексы соответствуют друг другу). */
const STAR_NAMES: Readonly<Record<Lang, readonly string[]>> = {
  ru: [
    'Гександр', 'Веста', 'Орн', 'Ликсар', 'Мираэль', 'Тавор', 'Ирида', 'Кассий',
    'Нейва', 'Оракс', 'Сильвен', 'Эйтан', 'Виндер', 'Астра', 'Ронак', 'Лумен',
    'Дарель', 'Феникс', 'Зорий', 'Кайрос', 'Немара', 'Ортус', 'Валис', 'Юмира',
    'Церн', 'Абраксас', 'Тесса', 'Илор', 'Скай', 'Нокта', 'Веланд', 'Азур',
    'Гелиос', 'Морвен', 'Тирен', 'Эос', 'Каэль', 'Ниара',
  ],
  uk: [
    'Гександр', 'Веста', 'Орн', 'Ліксар', 'Міраель', 'Тавор', 'Ірида', 'Кассій',
    'Нейва', 'Оракс', 'Сильвен', 'Ейтан', 'Віндер', 'Астра', 'Ронак', 'Лумен',
    'Дарель', 'Фенікс', 'Зорій', 'Кайрос', 'Немара', 'Ортус', 'Валіс', 'Юміра',
    'Церн', 'Абраксас', 'Тесса', 'Ілор', 'Скай', 'Нокта', 'Веланд', 'Азур',
    'Геліос', 'Морвен', 'Тирен', 'Еос', 'Каель', 'Ніара',
  ],
  es: [
    'Hexandro', 'Vesta', 'Orn', 'Lixar', 'Mirael', 'Tavor', 'Irida', 'Casio',
    'Neiva', 'Orax', 'Silven', 'Eitan', 'Vinder', 'Astra', 'Ronak', 'Lumen',
    'Darel', 'Fénix', 'Zorio', 'Kairos', 'Némara', 'Ortus', 'Valis', 'Yumira',
    'Cern', 'Abraxas', 'Tessa', 'Ilor', 'Sky', 'Nocta', 'Veland', 'Azur',
    'Helios', 'Morven', 'Tiren', 'Eos', 'Kael', 'Niara',
  ],
  'pt-BR': [
    'Hexandro', 'Vesta', 'Orn', 'Lixar', 'Mirael', 'Tavor', 'Irida', 'Cássio',
    'Neiva', 'Orax', 'Silven', 'Eitan', 'Vinder', 'Astra', 'Ronak', 'Lumen',
    'Darel', 'Fênix', 'Zório', 'Kairos', 'Nêmara', 'Ortus', 'Valis', 'Yumira',
    'Cern', 'Abraxas', 'Tessa', 'Ilor', 'Sky', 'Nocta', 'Veland', 'Azur',
    'Hélios', 'Morven', 'Tiren', 'Eos', 'Kael', 'Niara',
  ],
  vi: [
    'Hexandor', 'Vesta', 'Orn', 'Lixar', 'Mirael', 'Tavor', 'Irida', 'Kasio',
    'Neiva', 'Orax', 'Silven', 'Eitan', 'Vinder', 'Astra', 'Ronak', 'Lumen',
    'Darel', 'Fenix', 'Zorio', 'Kairos', 'Nemara', 'Ortus', 'Valis', 'Yumira',
    'Cern', 'Abraxas', 'Tessa', 'Ilor', 'Sky', 'Nocta', 'Veland', 'Azur',
    'Helios', 'Morven', 'Tiren', 'Eos', 'Kael', 'Niara',
  ],
  id: [
    'Hexandor', 'Vesta', 'Orn', 'Lixar', 'Mirael', 'Tavor', 'Irida', 'Kasio',
    'Neiva', 'Orax', 'Silven', 'Eitan', 'Vinder', 'Astra', 'Ronak', 'Lumen',
    'Darel', 'Fenix', 'Zorio', 'Kairos', 'Nemara', 'Ortus', 'Valis', 'Yumira',
    'Cern', 'Abraxas', 'Tessa', 'Ilor', 'Sky', 'Nocta', 'Veland', 'Azur',
    'Helios', 'Morven', 'Tiren', 'Eos', 'Kael', 'Niara',
  ],
  tr: [
    'Hexandor', 'Vesta', 'Orn', 'Lixar', 'Mirael', 'Tavor', 'İrida', 'Kasyo',
    'Neyva', 'Oraks', 'Silven', 'Eytan', 'Vinder', 'Astra', 'Ronak', 'Lümen',
    'Darel', 'Feniks', 'Zoryo', 'Kairos', 'Nemara', 'Ortus', 'Valis', 'Yumira',
    'Cern', 'Abraksas', 'Tessa', 'İlor', 'Sky', 'Nokta', 'Veland', 'Azur',
    'Helios', 'Morven', 'Tiren', 'Eos', 'Kael', 'Niara',
  ],
  pl: [
    'Heksander', 'Westa', 'Orn', 'Liksar', 'Mirael', 'Tawor', 'Iryda', 'Kasjusz',
    'Nejwa', 'Oraks', 'Silven', 'Ejtan', 'Winder', 'Astra', 'Ronak', 'Lumen',
    'Darel', 'Feniks', 'Zorij', 'Kairos', 'Nemara', 'Ortus', 'Walis', 'Jumira',
    'Cern', 'Abraksas', 'Tessa', 'Ilor', 'Sky', 'Nokta', 'Weland', 'Azur',
    'Helios', 'Morven', 'Tiren', 'Eos', 'Kael', 'Niara',
  ],
};

function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Имя звезды по ключу гекса на заданном языке интерфейса. Полярная (центр) —
 * локализованный аналог «Полярной». Остальные — из пула языка детерминированно
 * (тот же индекс во всех языках); коллизии соседей практически исключены
 * разбросом хеша. Без lang — фолбэк на ru (обратная совместимость вызовов).
 */
export function starName(key: string, lang: Lang = 'ru'): string {
  if (key === POLAR_KEY) return POLAR_NAMES[lang] ?? POLAR_NAMES.ru;
  const h = parseHexKey(key);
  if (!h) return '★';
  const pool = STAR_NAMES[lang] ?? STAR_NAMES.ru;
  return pool[hashKey(key) % pool.length];
}

/** «Полярная» — для проверок/особого оформления. */
export function isPolarStar(key: string): boolean {
  return key === POLAR_KEY;
}
