import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { forceSyncShardsToCloud, getShardsBalance, spendShards } from './shards_system';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';

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
export type ProfileCardTheme = 'classic' | 'gold' | 'emerald' | 'sapphire' | 'amethyst' | 'legend';
export type ProfileCardMotion = 'none';
export type ProfileCardPublicFocus = 'balanced';

/** Стоимость ПЕРЕХОДА на уровень N. Зеркало серверной PROFILE_CARD_LEVEL_COST
 * (functions/src/profile_card_upgrade.ts) — источник истины по списанию там. */
export const PROFILE_CARD_LEVEL_COSTS: Record<Exclude<ProfileCardLevel, 0>, number> = {
  1: PROFILE_CARD_UPGRADE_COST,
  2: 450,
  3: 800,
  4: 1400,
  5: 2400,
};

export function themeForProfileCardLevel(level: ProfileCardLevel): ProfileCardTheme {
  switch (level) {
    case 1: return 'gold';
    case 2: return 'emerald';
    case 3: return 'sapphire';
    case 4: return 'amethyst';
    case 5: return 'legend';
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
    unlockRu: 'Pro-карточка: золотой кант, световой проход и бейдж в списках',
    unlockUk: 'Pro-картка: золотий кант, світловий прохід і бейдж у списках',
    unlockEs: 'Tarjeta Pro: borde dorado, brillo y insignia en las listas',
    'unlockPt-BR': 'Cartão Pro: borda dourada, brilho e selo nas listas',
    unlockVi: 'Thẻ Pro: viền vàng, ánh sáng lướt và huy hiệu trong danh sách',
    unlockId: 'Kartu Pro: tepi emas, kilau, dan lencana di daftar',
    unlockTr: 'Pro kart: altın kenar, ışık geçişi ve listelerde rozet',
    unlockPl: 'Karta Pro: złota krawędź, błysk i odznaka na listach',
  },
  {
    level: 2,
    name: 'Emerald',
    cost: PROFILE_CARD_LEVEL_COSTS[2],
    unlockRu: 'Изумруд: живое свечение канта и блок «Выучено» на карточке',
    unlockUk: 'Смарагд: живе сяйво канта і блок «Вивчено» на картці',
    unlockEs: 'Esmeralda: borde luminoso vivo y bloque «Aprendido» en la tarjeta',
    'unlockPt-BR': 'Esmeralda: borda com brilho vivo e bloco «Aprendido» no cartão',
    unlockVi: 'Ngọc lục bảo: viền phát sáng sống động và khối «Đã học» trên thẻ',
    unlockId: 'Zamrud: tepi bercahaya hidup dan blok «Dipelajari» di kartu',
    unlockTr: 'Zümrüt: canlı parlayan kenar ve kartta «Öğrenilen» bloğu',
    unlockPl: 'Szmaragd: żywa poświata krawędzi i blok «Nauczone» na karcie',
  },
  {
    level: 3,
    name: 'Sapphire',
    cost: PROFILE_CARD_LEVEL_COSTS[3],
    unlockRu: 'Сапфир: дышащее сияние, падающая звезда и блок «Арена»',
    unlockUk: 'Сапфір: дихаюче сяйво, падаюча зірка і блок «Арена»',
    unlockEs: 'Zafiro: brillo que respira, estrella fugaz y bloque «Arena»',
    'unlockPt-BR': 'Safira: brilho pulsante, estrela cadente e bloco «Arena»',
    unlockVi: 'Lam ngọc: ánh sáng phập phồng, sao băng và khối «Đấu trường»',
    unlockId: 'Safir: cahaya bernafas, bintang jatuh, dan blok «Arena»',
    unlockTr: 'Safir: nefes alan parıltı, kayan yıldız ve «Arena» bloğu',
    unlockPl: 'Szafir: oddychający blask, spadająca gwiazda i blok «Arena»',
  },
  {
    level: 4,
    name: 'Amethyst',
    cost: PROFILE_CARD_LEVEL_COSTS[4],
    unlockRu: 'Аметист: живая туманность, мерцающие звёзды и блок «Путь»',
    unlockUk: 'Аметист: жива туманність, мерехтливі зорі і блок «Шлях»',
    unlockEs: 'Amatista: nebulosa viva, estrellas titilantes y bloque «Camino»',
    'unlockPt-BR': 'Ametista: nebulosa viva, estrelas cintilantes e bloco «Jornada»',
    unlockVi: 'Thạch anh tím: tinh vân sống động, sao lấp lánh và khối «Hành trình»',
    unlockId: 'Kecubung: nebula hidup, bintang berkelip, dan blok «Perjalanan»',
    unlockTr: 'Ametist: canlı bulutsu, parıldayan yıldızlar ve «Yolculuk» bloğu',
    unlockPl: 'Ametyst: żywa mgławica, migoczące gwiazdy i blok «Droga»',
  },
  {
    level: 5,
    name: 'Legend',
    cost: PROFILE_CARD_LEVEL_COSTS[5],
    unlockRu: 'Легенда: звёздное небо, золотой перелив и именной номер легенды',
    unlockUk: 'Легенда: зоряне небо, золотий перелив і іменний номер легенди',
    unlockEs: 'Leyenda: cielo estrellado, destello dorado y número de leyenda propio',
    'unlockPt-BR': 'Lenda: céu estrelado, brilho dourado e número de lenda próprio',
    unlockVi: 'Huyền thoại: bầu trời sao, ánh vàng chuyển sắc và số huyền thoại riêng',
    unlockId: 'Legenda: langit berbintang, kilau emas, dan nomor legenda pribadi',
    unlockTr: 'Efsane: yıldızlı gökyüzü, altın parıltı ve kişisel efsane numarası',
    unlockPl: 'Legenda: gwiaździste niebo, złoty połysk i własny numer legendy',
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

export type ProfileCardFxKind = 'none' | 'sheen' | 'emerald' | 'sapphire' | 'amethyst' | 'legend';

export function fxKindForProfileCard(level: ProfileCardLevel, _motion: ProfileCardMotion): ProfileCardFxKind {
  switch (level) {
    case 1: return 'sheen';
    case 2: return 'emerald';
    case 3: return 'sapphire';
    case 4: return 'amethyst';
    case 5: return 'legend';
    default: return 'none';
  }
}

export const PROFILE_CARD_LEVEL_NAME_RU: Record<ProfileCardLevel, string> = {
  0: 'Стандарт',
  1: 'Phraseman Pro',
  2: 'Изумруд',
  3: 'Сапфир',
  4: 'Аметист',
  5: 'Легенда',
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
      ru: 'Золотая Pro-карточка и мягкий световой проход',
      uk: 'Золота Pro-картка і м’який світловий прохід',
      es: 'Tarjeta Pro dorada y brillo suave',
      'pt-BR': 'Cartão Pro dourado e brilho suave',
      vi: 'Thẻ Pro vàng và ánh sáng lướt nhẹ',
      id: 'Kartu Pro emas dan kilau lembut',
      tr: 'Altın Pro kart ve yumuşak ışık geçişi',
      pl: 'Złota karta Pro i delikatny błysk',
    } },
    { isNew: true, text: {
      ru: 'Бейдж I рядом с именем в друзьях, арене и клубе',
      uk: 'Бейдж I біля імені в друзях, арені та клубі',
      es: 'Insignia I junto a tu nombre en amigos, arena y club',
      'pt-BR': 'Selo I ao lado do nome em amigos, arena e clube',
      vi: 'Huy hiệu I cạnh tên trong bạn bè, đấu trường và câu lạc bộ',
      id: 'Lencana I di samping nama di teman, arena, dan klub',
      tr: 'Arkadaşlar, arena ve kulüpte adının yanında I rozeti',
      pl: 'Odznaka I przy imieniu w znajomych, arenie i klubie',
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
      ru: 'Изумрудная карточка с живым свечением канта',
      uk: 'Смарагдова картка з живим сяйвом канта',
      es: 'Tarjeta esmeralda con borde de brillo vivo',
      'pt-BR': 'Cartão esmeralda com borda de brilho vivo',
      vi: 'Thẻ ngọc lục bảo với viền phát sáng sống động',
      id: 'Kartu zamrud dengan tepi bercahaya hidup',
      tr: 'Canlı parlayan kenarlı zümrüt kart',
      pl: 'Szmaragdowa karta z żywą poświatą krawędzi',
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
      ru: 'Сапфировая карточка: дышащее сияние и падающая звезда',
      uk: 'Сапфірова картка: дихаюче сяйво і падаюча зірка',
      es: 'Tarjeta zafiro: brillo que respira y estrella fugaz',
      'pt-BR': 'Cartão safira: brilho pulsante e estrela cadente',
      vi: 'Thẻ lam ngọc: ánh sáng phập phồng và sao băng',
      id: 'Kartu safir: cahaya bernafas dan bintang jatuh',
      tr: 'Safir kart: nefes alan parıltı ve kayan yıldız',
      pl: 'Szafirowa karta: oddychający blask i spadająca gwiazda',
    } },
    { isNew: true, text: {
      ru: 'Новый блок на карточке: победы на арене и процент побед',
      uk: 'Новий блок на картці: перемоги на арені та відсоток перемог',
      es: 'Nuevo bloque en la tarjeta: victorias en la arena y porcentaje',
      'pt-BR': 'Novo bloco no cartão: vitórias na arena e porcentagem',
      vi: 'Khối mới trên thẻ: số trận thắng đấu trường và tỷ lệ thắng',
      id: 'Blok baru di kartu: kemenangan arena dan persentase menang',
      tr: 'Kartta yeni blok: arena galibiyetleri ve kazanma yüzdesi',
      pl: 'Nowy blok na karcie: zwycięstwa na arenie i procent wygranych',
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
      ru: 'Аметистовая карточка: живая туманность и мерцающие звёзды',
      uk: 'Аметистова картка: жива туманність і мерехтливі зорі',
      es: 'Tarjeta amatista: nebulosa viva y estrellas titilantes',
      'pt-BR': 'Cartão ametista: nebulosa viva e estrelas cintilantes',
      vi: 'Thẻ thạch anh tím: tinh vân sống động và sao lấp lánh',
      id: 'Kartu kecubung: nebula hidup dan bintang berkelip',
      tr: 'Ametist kart: canlı bulutsu ve parıldayan yıldızlar',
      pl: 'Ametystowa karta: żywa mgławica i migoczące gwiazdy',
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
      ru: 'Легендарная карточка: звёздное небо и золотой перелив имени',
      uk: 'Легендарна картка: зоряне небо і золотий перелив імені',
      es: 'Tarjeta legendaria: cielo estrellado y nombre con destello dorado',
      'pt-BR': 'Cartão lendário: céu estrelado e nome com brilho dourado',
      vi: 'Thẻ huyền thoại: bầu trời sao và tên ánh vàng chuyển sắc',
      id: 'Kartu legendaris: langit berbintang dan nama berkilau emas',
      tr: 'Efsanevi kart: yıldızlı gökyüzü ve altın parıltılı isim',
      pl: 'Legendarna karta: gwiaździste niebo i złociście mieniące się imię',
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
  'classic', 'gold', 'emerald', 'sapphire', 'amethyst', 'legend',
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

type ProfileCardUpgradeCloudResult =
  | { ok: true; alreadyApplied: boolean; level: number; balance: number; spent: number; legendNo?: number }
  | { ok: false; reason: 'max' | 'insufficient'; level: number; balance: number; cost?: number };

async function upgradeProfileCardLevelOnCloud(
  expectedLevel: ProfileCardLevel,
): Promise<ProfileCardUpgradeCloudResult | 'cloud_disabled' | 'cloud_error'> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return 'cloud_disabled';
  try {
    const { getCanonicalUserId } = require('./user_id_policy');
    const stableId = await getCanonicalUserId();
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const { getApp } = require('@react-native-firebase/app');
    const callCf = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'profileCardUpgrade',
    ) as (data: { expectedLevel: number; stableId?: string }) => Promise<{ data: ProfileCardUpgradeCloudResult }>;
    const res = await callCf({ expectedLevel, ...(stableId ? { stableId } : {}) });
    if (!res?.data) return 'cloud_error';
    return res.data;
  } catch {
    return 'cloud_error';
  }
}

async function reconcileShardsToCloudBeforeUpgrade(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  try {
    await forceSyncShardsToCloud();
  } catch { /* best-effort; upgrade still validates server-side */ }
}

function emitProfileCardUpgraded(balance: number): void {
  emitAppEvent('shards_balance_updated', { balance, op: 'spend', reason: 'profile_card_upgrade' });
  emitAppEvent('xp_changed');
}

async function persistLegendNoLocally(legendNo: unknown): Promise<void> {
  const n = Math.floor(Number(legendNo));
  if (!Number.isFinite(n) || n <= 0) return;
  try {
    await AsyncStorage.setItem(PROFILE_CARD_LEGEND_NO_KEY, String(n));
  } catch { /* mirror only; cloud (users/{uid}.progress) is authoritative */ }
}

export async function upgradeProfileCardLevel(): Promise<
  | { ok: true; level: ProfileCardLevel; balance: number; legendNo?: number }
  | { ok: false; reason: 'max' | 'insufficient' | 'spend_failed' | 'cloud_error'; need?: number; balance?: number }
> {
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return { ok: false, reason: 'max' };

  const def = getProfileCardLevelDef(next);
  await reconcileShardsToCloudBeforeUpgrade();

  const cloud = await upgradeProfileCardLevelOnCloud(current);

  if (cloud === 'cloud_error') {
    return { ok: false, reason: 'cloud_error' };
  }

  if (cloud !== 'cloud_disabled') {
    if (cloud.ok === true) {
      const grantedLevel = normalizeProfileCardLevel(cloud.level);
      try {
        await applyProfileCardLevelLocally(grantedLevel);
      } catch { /* mirror only; cloud is authoritative */ }
      if (cloud.legendNo !== undefined) {
        await persistLegendNoLocally(cloud.legendNo);
      }
      emitProfileCardUpgraded(cloud.balance);
      return {
        ok: true,
        level: grantedLevel,
        balance: cloud.balance,
        ...(cloud.legendNo !== undefined ? { legendNo: cloud.legendNo } : {}),
      };
    }
    if (cloud.ok === false) {
      if (cloud.reason === 'max') return { ok: false, reason: 'max' };
      const cost = cloud.cost ?? def.cost;
      return { ok: false, reason: 'insufficient', need: Math.max(0, cost - cloud.balance), balance: cloud.balance };
    }
    return { ok: false, reason: 'cloud_error' };
  }

  const balance = await getShardsBalance();
  if (balance < def.cost) {
    return { ok: false, reason: 'insufficient', need: def.cost - balance, balance };
  }

  const ok = await spendShards(def.cost, 'profile_card_upgrade');
  if (!ok) return { ok: false, reason: 'spend_failed', balance };

  await applyProfileCardLevelLocally(next);
  const updatedBalance = await getShardsBalance();
  emitProfileCardUpgraded(updatedBalance);
  return { ok: true, level: next, balance: updatedBalance };
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
  } catch { /* dev-only cleanup */ }
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export type ProfileCardThemeColors = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  secondary: string;
  shadowColor: string;
};

export const PROFILE_CARD_THEME_COLORS: Record<ProfileCardTheme, ProfileCardThemeColors> = {
  classic: {
    accent: '#94A3B8',
    accentSoft: 'rgba(148,163,184,0.14)',
    accentStrong: 'rgba(148,163,184,0.38)',
    secondary: '#CBD5E1',
    shadowColor: '#000000',
  },
  gold: {
    accent: '#FACC15',
    accentSoft: 'rgba(250,204,21,0.16)',
    accentStrong: 'rgba(250,204,21,0.48)',
    secondary: '#FFF2A8',
    shadowColor: '#FACC15',
  },
  emerald: {
    accent: '#34D399',
    accentSoft: 'rgba(52,211,153,0.16)',
    accentStrong: 'rgba(52,211,153,0.48)',
    secondary: '#A7F3D0',
    shadowColor: '#34D399',
  },
  sapphire: {
    accent: '#38BDF8',
    accentSoft: 'rgba(56,189,248,0.16)',
    accentStrong: 'rgba(56,189,248,0.48)',
    secondary: '#BAE6FD',
    shadowColor: '#38BDF8',
  },
  amethyst: {
    accent: '#A78BFA',
    accentSoft: 'rgba(167,139,250,0.16)',
    accentStrong: 'rgba(167,139,250,0.48)',
    secondary: '#DDD6FE',
    shadowColor: '#A78BFA',
  },
  legend: {
    accent: '#F2DFA7',
    accentSoft: 'rgba(242,223,167,0.14)',
    accentStrong: 'rgba(242,223,167,0.5)',
    secondary: '#FFF7DC',
    shadowColor: '#F2DFA7',
  },
};

/** Диагональный градиент фона карточки по теме (тот же на модалке профиля и превью апгрейда). */
export const PROFILE_CARD_GRADIENTS: Record<ProfileCardTheme, [string, string, string]> = {
  classic: ['#202329', '#252931', '#202329'],
  gold: ['#161106', '#2A210D', '#111827'],
  emerald: ['#0A2416', '#123B22', '#0A1420'],
  sapphire: ['#081C33', '#0D2C4A', '#0A1120'],
  amethyst: ['#1D1038', '#2B1854', '#0F0A20'],
  legend: ['#16121F', '#0A0812', '#131019'],
};

export type ProfileCardSurfaceColors = { surface: string; surfaceBorder: string };

/** Подложка плиток метрик/строк на престижной карточке. */
export const PROFILE_CARD_SURFACES: Record<ProfileCardTheme, ProfileCardSurfaceColors> = {
  classic: { surface: 'rgba(255,255,255,0.055)', surfaceBorder: 'rgba(148,163,184,0.16)' },
  gold: { surface: 'rgba(250,204,21,0.075)', surfaceBorder: 'rgba(250,204,21,0.25)' },
  emerald: { surface: 'rgba(52,211,153,0.075)', surfaceBorder: 'rgba(52,211,153,0.25)' },
  sapphire: { surface: 'rgba(56,189,248,0.075)', surfaceBorder: 'rgba(56,189,248,0.25)' },
  amethyst: { surface: 'rgba(167,139,250,0.075)', surfaceBorder: 'rgba(167,139,250,0.25)' },
  legend: { surface: 'rgba(242,223,167,0.07)', surfaceBorder: 'rgba(242,223,167,0.26)' },
};

export function resolveProfileCardDisplay(input: {
  level?: unknown;
  theme?: unknown;
}): { level: ProfileCardLevel; theme: ProfileCardTheme; colors: ProfileCardThemeColors } {
  const level = normalizeProfileCardLevel(input.level);
  const theme = themeForProfileCardLevel(level);
  return { level, theme, colors: PROFILE_CARD_THEME_COLORS[theme] };
}
