import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { emitAppEvent } from './events';
import { commitShardCompositeOperation, getShardsBalance } from './shards_system';
import { semanticShardOperationId } from './economy/client_shard_semantic_id';
import { getStableId } from './stable_id';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import { DebugLogger } from './debug-logger';

export const PROFILE_CARD_LEVEL_KEY = 'profile_card_level';
export const PROFILE_CARD_THEME_KEY = 'profile_card_theme';
export const PROFILE_CARD_MOTION_KEY = 'profile_card_motion';
export const PROFILE_CARD_PUBLIC_FOCUS_KEY = 'profile_card_public_focus';
// Порядковый номер «Легенды» (уровень V) — выдаёт сервер при покупке, навсегда.
// Хранится под тем же именем, что и в users/{uid}.progress → восстанавливается
// штатным механизмом cloud_sync без спец-кода.
export const PROFILE_CARD_LEGEND_NO_KEY = 'profile_card_legend_no';

// РЕШЕНИЕ 2026-07-05 (владелец): лестница из 5 уровней вместо одного. Каждый уровень —
// заметно другой визуал + новый публичный блок информации на карточке. Покупка строго
// по порядку, цены растут — высокие уровни редкие и статусные.
export const PROFILE_CARD_MAX_LEVEL = 5;
export const PROFILE_CARD_UPGRADE_COST = 200;

export type ProfileCardLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Фаза 1 бонусов карточки (ТЗ 2026-07-19): постоянный XP-буст +2% для уровня II+.
// Аддитивный вклад (cardM - 1) в общую формулу множителя в xp_manager; бонус
// кумулятивен — любой уровень II…V даёт одни и те же ×1.02, с уровнем не растёт.
// ВНИМАНИЕ: xp_manager НЕ импортирует этот модуль (цикл через shards_system/events)
// — значение там продублировано литералом со ссылкой на эту константу.
export const PROFILE_CARD_XP_BOOST = 1.02;

/** XP-множитель бонуса карточки: уровень II+ → PROFILE_CARD_XP_BOOST, иначе 1. */
export function profileCardXpMultiplier(level: ProfileCardLevel): number {
  return level >= 2 ? PROFILE_CARD_XP_BOOST : 1;
}

// Фаза 2 бонусов карточки (ТЗ 2026-07-19): +5% осколков (×1.05) со всех
// ЗАРАБОТАННЫХ начислений для уровня IV+ (кумулятивно IV…V, с уровнем не растёт).
// Только заработок: траты, покупки за реальные деньги (RevenueCat) и серверные
// компенсации/начисления бонус не получают. shards_system НЕ импортирует этот
// модуль (анти-цикл, как и xp_manager) — значение там продублировано литералом
// со ссылкой на эту константу.
export const PROFILE_CARD_SHARD_BOOST = 1.05;

/** Множитель осколков бонуса карточки: уровень IV+ → PROFILE_CARD_SHARD_BOOST, иначе 1. */
export function profileCardShardMultiplier(level: ProfileCardLevel): number {
  return level >= 4 ? PROFILE_CARD_SHARD_BOOST : 1;
}
// РЕШЕНИЕ 2026-07-05: линейка по luxury-ресёрчу — чистые «электрические» свечения на
// почти чёрном (без золота/фиолета/камней). Рост редкости, вершина уходит в стелс-платину.
// steel → teal → azure → crimson → platinum(holo).
export type ProfileCardTheme = 'classic' | 'steel' | 'teal' | 'azure' | 'crimson' | 'platinum';
export type ProfileCardMotion = 'none';
export type ProfileCardPublicFocus = 'balanced';

/** Стоимость перехода на уровень N. Клиент — источник истины по личной покупке. */
export const PROFILE_CARD_LEVEL_COSTS: Record<Exclude<ProfileCardLevel, 0>, number> = {
  1: PROFILE_CARD_UPGRADE_COST,
  2: 450,
  3: 800,
  4: 1400,
  5: 2400,
};

export function themeForProfileCardLevel(level: ProfileCardLevel): ProfileCardTheme {
  switch (level) {
    case 1: return 'steel';
    case 2: return 'teal';
    case 3: return 'azure';
    case 4: return 'crimson';
    case 5: return 'platinum';
    default: return 'classic';
  }
}

export type ProfileCardLevelDef = {
  level: ProfileCardLevel;
  name: string;
  cost: number;
  unlockRu: string;
  unlockUk: string;
  unlockEs: string;
  'unlockPt-BR': string;
  unlockVi: string;
  unlockId: string;
  unlockTr: string;
  unlockPl: string;
};

export type ProfileCardSnapshot = {
  level: ProfileCardLevel;
  theme: ProfileCardTheme;
  motion: ProfileCardMotion;
  publicFocus: ProfileCardPublicFocus;
};

export const PROFILE_CARD_LEVELS: ProfileCardLevelDef[] = [
  {
    level: 0,
    name: 'Standard',
    cost: 0,
    unlockRu: 'Базовая карточка профиля',
    unlockUk: 'Базова картка профілю',
    unlockEs: 'Tarjeta de perfil base',
    'unlockPt-BR': 'Cartão de perfil básico',
    unlockVi: 'Thẻ hồ sơ cơ bản',
    unlockId: 'Kartu profil dasar',
    unlockTr: 'Temel profil kartı',
    unlockPl: 'Podstawowa karta profilu',
  },
  {
    level: 1,
    name: 'Phraseman Pro',
    cost: PROFILE_CARD_LEVEL_COSTS[1],
    unlockRu: 'Pro-карточка: серебристо-стальное свечение и бейдж в списках',
    unlockUk: 'Pro-картка: сріблясто-сталеве сяйво і бейдж у списках',
    unlockEs: 'Tarjeta Pro: resplandor acero-plata e insignia en las listas',
    'unlockPt-BR': 'Cartão Pro: brilho aço-prata e selo nas listas',
    unlockVi: 'Thẻ Pro: ánh sáng thép-bạc và huy hiệu trong danh sách',
    unlockId: 'Kartu Pro: cahaya baja-perak dan lencana di daftar',
    unlockTr: 'Pro kart: çelik-gümüş parıltı ve listelerde rozet',
    unlockPl: 'Karta Pro: stalowo-srebrna poświata i odznaka na listach',
  },
  {
    level: 2,
    name: 'Teal',
    cost: PROFILE_CARD_LEVEL_COSTS[2],
    unlockRu: 'Teal: чистое бирюзовое свечение и блок «Выучено» на карточке',
    unlockUk: 'Teal: чисте бірюзове сяйво і блок «Вивчено» на картці',
    unlockEs: 'Teal: resplandor turquesa puro y bloque «Aprendido» en la tarjeta',
    'unlockPt-BR': 'Teal: brilho turquesa puro e bloco «Aprendido» no cartão',
    unlockVi: 'Teal: ánh sáng ngọc lam thuần và khối «Đã học» trên thẻ',
    unlockId: 'Teal: cahaya toska murni dan blok «Dipelajari» di kartu',
    unlockTr: 'Teal: saf turkuaz parıltı ve kartta «Öğrenilen» bloğu',
    unlockPl: 'Teal: czysta turkusowa poświata i blok «Nauczone» na karcie',
  },
  {
    level: 3,
    name: 'Azure',
    cost: PROFILE_CARD_LEVEL_COSTS[3],
    unlockRu: 'Azure: электрик-синее свечение и падающая звезда',
    unlockUk: 'Azure: електрик-синє сяйво і падаюча зірка',
    unlockEs: 'Azure: resplandor azul eléctrico y estrella fugaz',
    'unlockPt-BR': 'Azure: brilho azul elétrico e estrela cadente',
    unlockVi: 'Azure: ánh sáng xanh điện và sao băng',
    unlockId: 'Azure: cahaya biru listrik dan bintang jatuh',
    unlockTr: 'Azure: elektrik mavisi parıltı ve kayan yıldız',
    unlockPl: 'Azure: elektryzujący błękit i spadająca gwiazda',
  },
  {
    level: 4,
    name: 'Crimson',
    cost: PROFILE_CARD_LEVEL_COSTS[4],
    unlockRu: 'Crimson: глубокий малиновый жар, мерцающие звёзды и блок «Путь»',
    unlockUk: 'Crimson: глибокий малиновий жар, мерехтливі зорі і блок «Шлях»',
    unlockEs: 'Crimson: brasa carmesí profunda, estrellas titilantes y bloque «Camino»',
    'unlockPt-BR': 'Crimson: brasa carmesim profunda, estrelas cintilantes e bloco «Jornada»',
    unlockVi: 'Crimson: ánh đỏ thẫm rực, sao lấp lánh và khối «Hành trình»',
    unlockId: 'Crimson: bara merah tua, bintang berkelip, dan blok «Perjalanan»',
    unlockTr: 'Crimson: derin kızıl kor, parıldayan yıldızlar ve «Yolculuk» bloğu',
    unlockPl: 'Crimson: głęboki karmazynowy żar, migoczące gwiazdy i blok «Droga»',
  },
  {
    level: 5,
    name: 'Platinum',
    cost: PROFILE_CARD_LEVEL_COSTS[5],
    unlockRu: 'Platinum: платиново-белое сияние, перелив и именной номер легенды',
    unlockUk: 'Platinum: платиново-біле сяйво, перелив і іменний номер легенди',
    unlockEs: 'Platinum: resplandor blanco platino, tornasol y número de leyenda propio',
    'unlockPt-BR': 'Platinum: brilho branco platina, tornassol e número de lenda próprio',
    unlockVi: 'Platinum: ánh trắng bạch kim, chuyển sắc và số huyền thoại riêng',
    unlockId: 'Platinum: cahaya putih platina, kilau warna, dan nomor legenda pribadi',
    unlockTr: 'Platinum: platin-beyaz parıltı, yanardöner ve kişisel efsane numarası',
    unlockPl: 'Platinum: platynowo-biała poświata, opalizacja i własny numer legendy',
  },
];

const DEFAULT_PROFILE_CARD_LEVEL_DEF = PROFILE_CARD_LEVELS[0];

export const PROFILE_CARD_SYNC_KEYS = [
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_THEME_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_LEGEND_NO_KEY,
] as const;

export function normalizeProfileCardLevel(value: unknown): ProfileCardLevel {
  const n = Math.max(0, Math.min(PROFILE_CARD_MAX_LEVEL, Math.floor(Number(value) || 0)));
  return n as ProfileCardLevel;
}

export function getProfileCardLevelDef(level: ProfileCardLevel): ProfileCardLevelDef {
  return PROFILE_CARD_LEVELS.find((item) => item.level === level) ?? DEFAULT_PROFILE_CARD_LEVEL_DEF;
}

export function getNextProfileCardLevel(level: ProfileCardLevel): ProfileCardLevel | null {
  return level >= PROFILE_CARD_MAX_LEVEL ? null : ((level + 1) as ProfileCardLevel);
}

// Каждый уровень включает эффекты предыдущих + свой. Имена = уровни glow-линейки.
// steel: только редкий блик; teal: +дышащее нижнее свечение; azure: +падающая звезда;
// crimson: +мерцающие звёзды; platinum: +голо-перелив (стелс-вершина).
export type ProfileCardFxKind = 'none' | 'steel' | 'teal' | 'azure' | 'crimson' | 'platinum';

export function fxKindForProfileCard(level: ProfileCardLevel, _motion: ProfileCardMotion): ProfileCardFxKind {
  switch (level) {
    case 1: return 'steel';
    case 2: return 'teal';
    case 3: return 'azure';
    case 4: return 'crimson';
    case 5: return 'platinum';
    default: return 'none';
  }
}

export const PROFILE_CARD_LEVEL_NAME_RU: Record<ProfileCardLevel, string> = {
  0: 'Стандарт',
  1: 'Phraseman Pro',
  2: 'Teal',
  3: 'Azure',
  4: 'Crimson',
  5: 'Platinum',
};

export type ProfileCardSellingText = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

export type ProfileCardSellingPoint = { text: ProfileCardSellingText; isNew: boolean };

export function sellingPointText(point: ProfileCardSellingPoint, lang: string): string {
  const byLang = (point.text as Record<string, string>)[lang];
  return byLang || point.text.ru;
}

export const PROFILE_CARD_SELLING_POINTS: Record<ProfileCardLevel, ProfileCardSellingPoint[]> = {
  0: [
    { isNew: false, text: {
      ru: 'Базовая карточка профиля',
      uk: 'Базова картка профілю',
      es: 'Tarjeta de perfil base',
      'pt-BR': 'Cartão de perfil básico',
      vi: 'Thẻ hồ sơ cơ bản',
      id: 'Kartu profil dasar',
      tr: 'Temel profil kartı',
      pl: 'Podstawowa karta profilu',
    } },
    { isNew: false, text: {
      ru: 'Видна в профиле и списках',
      uk: 'Видно в профілі та списках',
      es: 'Visible en el perfil y las listas',
      'pt-BR': 'Visível no perfil e nas listas',
      vi: 'Hiển thị trong hồ sơ và danh sách',
      id: 'Terlihat di profil dan daftar',
      tr: 'Profilde ve listelerde görünür',
      pl: 'Widoczna w profilu i listach',
    } },
  ],
  1: [
    { isNew: true, text: {
      ru: 'Стальное свечение карточки снизу и мягкий редкий блик',
      uk: 'Сталеве сяйво картки знизу і м’який рідкісний блиск',
      es: 'Resplandor acero desde abajo y brillo suave ocasional',
      'pt-BR': 'Brilho aço vindo de baixo e reflexo suave ocasional',
      vi: 'Ánh thép hắt từ dưới và tia sáng nhẹ thưa thớt',
      id: 'Cahaya baja dari bawah dan kilau lembut sesekali',
      tr: 'Alttan çelik parıltı ve seyrek yumuşak ışık',
      pl: 'Stalowa poświata od dołu i rzadki miękki błysk',
    } },
    { isNew: true, text: {
      ru: 'Бейдж I рядом с именем в друзьях и клубе',
      uk: 'Бейдж I біля імені в друзях і клубі',
      es: 'Insignia I junto a tu nombre en amigos y club',
      'pt-BR': 'Selo I ao lado do nome em amigos e clube',
      vi: 'Huy hiệu I cạnh tên trong bạn bè và câu lạc bộ',
      id: 'Lencana I di samping nama di teman dan klub',
      tr: 'Arkadaşlar ve kulüpte adının yanında I rozeti',
      pl: 'Odznaka I przy imieniu w znajomych i klubie',
    } },
    { isNew: true, text: {
      ru: 'Пилюля престижа «I · Phraseman Pro» на карточке',
      uk: 'Пілюля престижу «I · Phraseman Pro» на картці',
      es: 'Distintivo de prestigio «I · Phraseman Pro» en la tarjeta',
      'pt-BR': 'Distintivo de prestígio «I · Phraseman Pro» no cartão',
      vi: 'Huy hiệu danh giá «I · Phraseman Pro» trên thẻ',
      id: 'Pil prestise «I · Phraseman Pro» di kartu',
      tr: 'Kartta «I · Phraseman Pro» prestij rozeti',
      pl: 'Prestiżowa plakietka «I · Phraseman Pro» na karcie',
    } },
  ],
  2: [
    { isNew: true, text: {
      ru: 'Чистое бирюзовое свечение снизу и сверху карточки',
      uk: 'Чисте бірюзове сяйво знизу і зверху картки',
      es: 'Resplandor turquesa puro abajo y arriba de la tarjeta',
      'pt-BR': 'Brilho turquesa puro embaixo e no topo do cartão',
      vi: 'Ánh ngọc lam thuần hắt từ dưới và trên thẻ',
      id: 'Cahaya toska murni dari bawah dan atas kartu',
      tr: 'Kartın altında ve üstünde saf turkuaz parıltı',
      pl: 'Czysta turkusowa poświata u dołu i u góry karty',
    } },
    { isNew: true, text: {
      ru: 'Новый блок на карточке: выученные слова и фразы',
      uk: 'Новий блок на картці: вивчені слова та фрази',
      es: 'Nuevo bloque en la tarjeta: palabras y frases aprendidas',
      'pt-BR': 'Novo bloco no cartão: palavras e frases aprendidas',
      vi: 'Khối mới trên thẻ: từ và cụm từ đã học',
      id: 'Blok baru di kartu: kata dan frasa yang dipelajari',
      tr: 'Kartta yeni blok: öğrenilen kelimeler ve kalıplar',
      pl: 'Nowy blok na karcie: nauczone słowa i frazy',
    } },
    { isNew: true, text: {
      ru: 'Бейдж II в списках — все видят твой уровень',
      uk: 'Бейдж II у списках — усі бачать твій рівень',
      es: 'Insignia II en las listas: todos ven tu nivel',
      'pt-BR': 'Selo II nas listas: todos veem seu nível',
      vi: 'Huy hiệu II trong danh sách — mọi người thấy cấp của bạn',
      id: 'Lencana II di daftar — semua melihat levelmu',
      tr: 'Listelerde II rozeti — seviyeni herkes görür',
      pl: 'Odznaka II na listach — wszyscy widzą twój poziom',
    } },
  ],
  3: [
    { isNew: true, text: {
      ru: 'Электрик-синее свечение, дышащий свет и падающая звезда',
      uk: 'Електрик-синє сяйво, дихаюче світло і падаюча зірка',
      es: 'Resplandor azul eléctrico, luz que respira y estrella fugaz',
      'pt-BR': 'Brilho azul elétrico, luz pulsante e estrela cadente',
      vi: 'Ánh xanh điện, ánh sáng phập phồng và sao băng',
      id: 'Cahaya biru listrik, sinar bernafas, dan bintang jatuh',
      tr: 'Elektrik mavisi parıltı, nefes alan ışık ve kayan yıldız',
      pl: 'Elektryzujący błękit, oddychające światło i spadająca gwiazda',
    } },
    { isNew: true, text: {
      ru: 'Бейдж III в списках и усиленная рамка аватара',
      uk: 'Бейдж III у списках і посилена рамка аватара',
      es: 'Insignia III en las listas y marco de avatar reforzado',
      'pt-BR': 'Selo III nas listas e moldura de avatar reforçada',
      vi: 'Huy hiệu III trong danh sách và khung avatar nổi bật hơn',
      id: 'Lencana III di daftar dan bingkai avatar diperkuat',
      tr: 'Listelerde III rozeti ve güçlendirilmiş avatar çerçevesi',
      pl: 'Odznaka III na listach i wzmocniona ramka awatara',
    } },
  ],
  4: [
    { isNew: true, text: {
      ru: 'Глубокий малиновый жар снизу и мерцающие звёзды',
      uk: 'Глибокий малиновий жар знизу і мерехтливі зорі',
      es: 'Brasa carmesí profunda abajo y estrellas titilantes',
      'pt-BR': 'Brasa carmesim profunda embaixo e estrelas cintilantes',
      vi: 'Ánh đỏ thẫm rực từ dưới và sao lấp lánh',
      id: 'Bara merah tua dari bawah dan bintang berkelip',
      tr: 'Alttan derin kızıl kor ve parıldayan yıldızlar',
      pl: 'Głęboki karmazynowy żar u dołu i migoczące gwiazdy',
    } },
    { isNew: true, text: {
      ru: 'Новый блок на карточке: дней в Phraseman и рекордная серия',
      uk: 'Новий блок на картці: днів у Phraseman і рекордна серія',
      es: 'Nuevo bloque en la tarjeta: días en Phraseman y racha récord',
      'pt-BR': 'Novo bloco no cartão: dias no Phraseman e sequência recorde',
      vi: 'Khối mới trên thẻ: số ngày dùng Phraseman và chuỗi kỷ lục',
      id: 'Blok baru di kartu: hari di Phraseman dan rentetan rekor',
      tr: 'Kartta yeni blok: Phraseman’de geçen günler ve rekor seri',
      pl: 'Nowy blok na karcie: dni w Phraseman i rekordowa seria',
    } },
    { isNew: true, text: {
      ru: 'Бейдж IV в списках — уровень, который редко у кого есть',
      uk: 'Бейдж IV у списках — рівень, який мало в кого є',
      es: 'Insignia IV en las listas: un nivel que pocos tienen',
      'pt-BR': 'Selo IV nas listas: um nível que poucos têm',
      vi: 'Huy hiệu IV trong danh sách — cấp độ hiếm ai có',
      id: 'Lencana IV di daftar — level yang jarang dimiliki',
      tr: 'Listelerde IV rozeti — çok az kişide olan seviye',
      pl: 'Odznaka IV na listach — poziom, który ma niewielu',
    } },
  ],
  5: [
    { isNew: true, text: {
      ru: 'Платиново-белое сияние, звёздное небо и перелив имени',
      uk: 'Платиново-біле сяйво, зоряне небо і перелив імені',
      es: 'Resplandor blanco platino, cielo estrellado y nombre tornasolado',
      'pt-BR': 'Brilho branco platina, céu estrelado e nome tornassolado',
      vi: 'Ánh trắng bạch kim, bầu trời sao và tên chuyển sắc',
      id: 'Cahaya putih platina, langit berbintang, dan nama berkilau warna',
      tr: 'Platin-beyaz parıltı, yıldızlı gökyüzü ve yanardöner isim',
      pl: 'Platynowo-biała poświata, gwiaździste niebo i opalizujące imię',
    } },
    { isNew: true, text: {
      ru: 'Именной номер легенды — выдаётся по порядку и навсегда твой',
      uk: 'Іменний номер легенди — видається по порядку і назавжди твій',
      es: 'Número de leyenda propio: se asigna por orden y es tuyo para siempre',
      'pt-BR': 'Número de lenda próprio: atribuído por ordem e seu para sempre',
      vi: 'Số huyền thoại riêng — cấp theo thứ tự và mãi là của bạn',
      id: 'Nomor legenda pribadi — diberikan berurutan dan selamanya milikmu',
      tr: 'Kişisel efsane numarası — sırayla verilir ve sonsuza dek senindir',
      pl: 'Własny numer legendy — nadawany po kolei i twój na zawsze',
    } },
    { isNew: true, text: {
      ru: 'Бейдж V в списках — высший статус Phraseman',
      uk: 'Бейдж V у списках — найвищий статус Phraseman',
      es: 'Insignia V en las listas: el estatus más alto de Phraseman',
      'pt-BR': 'Selo V nas listas: o status mais alto do Phraseman',
      vi: 'Huy hiệu V trong danh sách — địa vị cao nhất Phraseman',
      id: 'Lencana V di daftar — status tertinggi Phraseman',
      tr: 'Listelerde V rozeti — Phraseman’in en yüksek statüsü',
      pl: 'Odznaka V na listach — najwyższy status Phraseman',
    } },
  ],
};

export async function getProfileCardLevel(): Promise<ProfileCardLevel> {
  try {
    return normalizeProfileCardLevel(await AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY));
  } catch {
    return 0;
  }
}

/** Номер «Легенды» (уровень V), выданный сервером. null, если уровень ниже V или номер не выдан. */
export async function getProfileCardLegendNo(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CARD_LEGEND_NO_KEY);
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

const PROFILE_CARD_THEME_SET: ReadonlySet<string> = new Set<ProfileCardTheme>([
  'classic', 'steel', 'teal', 'azure', 'crimson', 'platinum',
]);

export function normalizeProfileCardTheme(value: unknown): ProfileCardTheme {
  return typeof value === 'string' && PROFILE_CARD_THEME_SET.has(value)
    ? (value as ProfileCardTheme)
    : 'classic';
}

export function normalizeProfileCardMotion(_value: unknown): ProfileCardMotion {
  return 'none';
}

export function normalizeProfileCardPublicFocus(_value: unknown): ProfileCardPublicFocus {
  return 'balanced';
}

export async function getProfileCardSnapshot(): Promise<ProfileCardSnapshot> {
  try {
    const [[, rawLevel], , [, rawMotion], [, rawFocus]] = await AsyncStorage.multiGet([
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    const level = normalizeProfileCardLevel(rawLevel);
    return {
      level,
      theme: themeForProfileCardLevel(level),
      motion: normalizeProfileCardMotion(rawMotion),
      publicFocus: normalizeProfileCardPublicFocus(rawFocus),
    };
  } catch {
    return {
      level: 0,
      theme: 'classic',
      motion: 'none',
      publicFocus: 'balanced',
    };
  }
}

async function applyProfileCardLevelLocally(next: ProfileCardLevel): Promise<void> {
  const theme = themeForProfileCardLevel(next);
  await AsyncStorage.multiSet([
    [PROFILE_CARD_LEVEL_KEY, String(next)],
    [PROFILE_CARD_THEME_KEY, theme],
    [PROFILE_CARD_MOTION_KEY, 'none'],
    [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced'],
  ]);
}

function emitProfileCardUpgraded(balance: number): void {
  emitAppEvent('shards_balance_updated', { balance, op: 'spend', reason: 'profile_card_upgrade' });
  emitAppEvent('xp_changed');
}

export async function upgradeProfileCardLevel(): Promise<
  | { ok: true; level: ProfileCardLevel; balance: number; legendNo?: number }
  | { ok: false; reason: 'max' | 'insufficient' | 'spend_failed' | 'cloud_error'; need?: number; balance?: number }
> {
  const operationToken = captureAccountGeneration();
  const operationOwnerStableId = operationToken.stableId;
  const isOperationCurrent = (): boolean => Boolean(
    operationOwnerStableId
    && isCurrentAccountGeneration(operationToken, operationOwnerStableId)
  );
  if (!isOperationCurrent()) return { ok: false, reason: 'spend_failed' };
  const current = await getProfileCardLevel();
  if (!isOperationCurrent()) return { ok: false, reason: 'spend_failed' };
  const next = getNextProfileCardLevel(current);
  if (next === null) return { ok: false, reason: 'max' };

  const def = getProfileCardLevelDef(next);
  const theme = themeForProfileCardLevel(next);
  const purchase = await commitShardCompositeOperation({
    amount: def.cost,
    reason: 'profile_card_upgrade',
    operationId: await semanticShardOperationId('profile_card_level', String(next)),
    grant: {
      kind: 'profile_card_level',
      subjectId: String(next),
      payload: { previousLevel: current, level: next, theme },
    },
    localWrites: [
      [PROFILE_CARD_LEVEL_KEY, String(next)],
      [PROFILE_CARD_THEME_KEY, theme],
      [PROFILE_CARD_MOTION_KEY, 'none'],
      [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced'],
    ],
  });
  return withAccountTransitionLock(async () => {
    if (!isOperationCurrent()) return { ok: false, reason: 'spend_failed' } as const;
    if (purchase.status === 'insufficient') {
      return {
        ok: false,
        reason: 'insufficient',
        need: Math.max(0, def.cost - purchase.balance),
        balance: purchase.balance,
      } as const;
    }
    if (purchase.status === 'failed') {
      return { ok: false, reason: 'spend_failed', balance: await getShardsBalance() } as const;
    }
    emitProfileCardUpgraded(purchase.balanceAfter);
    // Public profile metadata is a projection only. Failure must never revoke
    // the locally durable level or refund/rewrite the personal balance.
    void (async () => {
      try {
        if (!isOperationCurrent()) return;
        const stableId = await getStableId();
        if (stableId !== operationOwnerStableId || !isOperationCurrent()) return;
        const call = httpsCallable<
          { stableId: string; expectedLevel: number },
          { ok: boolean; level?: number; legendNo?: number }
        >(getFunctions(getApp(), 'us-central1'), 'profileCardUpgrade');
        const response = await call({ stableId, expectedLevel: current });
        if (!isOperationCurrent()) return;
        if (response.data.legendNo && next === 5) {
          await AsyncStorage.setItem(PROFILE_CARD_LEGEND_NO_KEY, String(response.data.legendNo));
          emitAppEvent('xp_changed');
        }
      } catch (e) {
      // Best-effort storage projection; a later idempotent call can repair it.
      DebugLogger.error('profile_card_system:response', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    })();
    return { ok: true, level: next, balance: purchase.balanceAfter } as const;
  });
}

const PROFILE_CARD_ROMANS: Record<ProfileCardLevel, string> = {
  0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
};

export function profileCardLevelRoman(level: ProfileCardLevel): string {
  return PROFILE_CARD_ROMANS[level] ?? '0';
}

export async function devGrantProfileCardLevel(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return getProfileCardSnapshot();
  await applyProfileCardLevelLocally(next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function devLowerProfileCardLevel(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  const current = await getProfileCardLevel();
  if (current <= 0) return getProfileCardSnapshot();
  await applyProfileCardLevelLocally((current - 1) as ProfileCardLevel);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function devResetProfileCard(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  await applyProfileCardLevelLocally(0);
  try {
    await AsyncStorage.removeItem(PROFILE_CARD_LEGEND_NO_KEY);
  } catch (e) {
      // dev-only cleanup
      DebugLogger.error('profile_card_system:devResetProfileCard', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export type ProfileCardThemeColors = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  secondary: string;
  shadowColor: string;
  /** Цвет свечения, поднимающегося от нижней кромки карточки. */
  glowBottom: string;
  /** Цвет мягкого ореола у верхней кромки (за аватаром). */
  glowTop: string;
};

// Луксори-линейка по ресёрчу: чистые «электрические» свечения на почти-чёрном.
// steel → teal → azure → crimson → platinum(стелс-вершина). Без золота/фиолета/камней.
export const PROFILE_CARD_THEME_COLORS: Record<ProfileCardTheme, ProfileCardThemeColors> = {
  classic: {
    accent: '#94A3B8',
    accentSoft: 'rgba(148,163,184,0.12)',
    accentStrong: 'rgba(148,163,184,0.34)',
    secondary: '#CBD5E1',
    shadowColor: '#000000',
    glowBottom: '#4D6E9E',
    glowTop: '#33445E',
  },
  steel: {
    accent: '#9FB4CC',
    accentSoft: 'rgba(77,110,158,0.12)',
    accentStrong: 'rgba(159,180,204,0.4)',
    secondary: '#C7D3E2',
    shadowColor: '#4D6E9E',
    glowBottom: '#4D6E9E',
    glowTop: '#33445E',
  },
  teal: {
    accent: '#4FE0C8',
    accentSoft: 'rgba(18,183,158,0.13)',
    accentStrong: 'rgba(79,224,200,0.42)',
    secondary: '#9FF3E4',
    shadowColor: '#12B79E',
    glowBottom: '#12B79E',
    glowTop: '#0C5F55',
  },
  azure: {
    accent: '#5AA6FF',
    accentSoft: 'rgba(46,123,255,0.14)',
    accentStrong: 'rgba(90,166,255,0.44)',
    secondary: '#A9CBFF',
    shadowColor: '#2E7BFF',
    glowBottom: '#2E7BFF',
    glowTop: '#1A3F8C',
  },
  crimson: {
    accent: '#FF6B7E',
    accentSoft: 'rgba(226,51,80,0.13)',
    accentStrong: 'rgba(255,107,126,0.44)',
    secondary: '#FFAAB5',
    shadowColor: '#E23350',
    glowBottom: '#E23350',
    glowTop: '#7A1730',
  },
  platinum: {
    accent: '#EDEFF4',
    accentSoft: 'rgba(199,208,222,0.1)',
    accentStrong: 'rgba(237,239,244,0.42)',
    secondary: '#FFFFFF',
    shadowColor: '#C7D0DE',
    glowBottom: '#C7D0DE',
    glowTop: '#8792A6',
  },
};

/** Базовый тёмный фон карточки: почти чёрный сверху → чуть теплее/холоднее в тон снизу.
 * Цветное свечение рисуется ПОВЕРХ этого фона (glowBottom/glowTop), а не в градиенте —
 * поэтому здесь глубокие near-black тона, слегка подкрашенные в оттенок темы. */
export const PROFILE_CARD_GRADIENTS: Record<ProfileCardTheme, [string, string, string]> = {
  classic: ['#0F1013', '#0A0B0E', '#070709'],
  steel: ['#0C0E12', '#08090C', '#060708'],
  teal: ['#08110F', '#060C0B', '#040807'],
  azure: ['#080B14', '#06080F', '#04050A'],
  crimson: ['#120A0C', '#0C0708', '#070405'],
  platinum: ['#0D0D0F', '#0A0A0C', '#08080A'],
};

export type ProfileCardSurfaceColors = { surface: string; surfaceBorder: string };

/** Подложка плиток метрик/строк на престижной карточке.
 * ПРАВИЛО владельца: НИКАКИХ обводок у контейнеров — только тон, отличный от фона.
 * surfaceBorder оставлен в типе для совместимости, но в UI не рисуется. */
export const PROFILE_CARD_SURFACES: Record<ProfileCardTheme, ProfileCardSurfaceColors> = {
  classic: { surface: 'rgba(255,255,255,0.06)', surfaceBorder: 'transparent' },
  steel: { surface: 'rgba(77,110,158,0.12)', surfaceBorder: 'transparent' },
  teal: { surface: 'rgba(18,183,158,0.12)', surfaceBorder: 'transparent' },
  azure: { surface: 'rgba(46,123,255,0.13)', surfaceBorder: 'transparent' },
  crimson: { surface: 'rgba(226,51,80,0.12)', surfaceBorder: 'transparent' },
  platinum: { surface: 'rgba(199,208,222,0.1)', surfaceBorder: 'transparent' },
};

export function resolveProfileCardDisplay(input: {
  level?: unknown;
  theme?: unknown;
}): { level: ProfileCardLevel; theme: ProfileCardTheme; colors: ProfileCardThemeColors } {
  const level = normalizeProfileCardLevel(input.level);
  const theme = themeForProfileCardLevel(level);
  return { level, theme, colors: PROFILE_CARD_THEME_COLORS[theme] };
}
