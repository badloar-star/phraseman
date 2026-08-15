import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import type { PlannedInterfaceLang } from '../../constants/i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type { StudyTarget } from '../study_target';
import { CardItem } from './types';
import {
  flashcardsMarketDevActivePackKey,
  flashcardsMarketplaceBuiltCardsCacheKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsOwnedPacksKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import { flashcardsOfficialPacksAvailableForTarget } from '../flashcards_target_gate';
import {
  buildFrenchMarketplaceOwnedCards,
  ensureFrenchRemoteMarketplacePacks,
  getCachedFrenchRemoteMarketplacePacks,
} from '../french_flashcard_remote_runtime';
import bundledManifest from './bundles/bundled_marketplace_manifest.json';
import { derivePackCodeName, victoriaMetaFromPackJson, type VictoriaPackFile } from './bundles/victoriaBundleShared';
import {
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
  OFFICIAL_PREP_IN_EN_ID,
  OFFICIAL_PREP_ON_EN_ID,
  OFFICIAL_PREP_AT_EN_ID,
  OFFICIAL_PREP_TO_EN_ID,
  OFFICIAL_PREP_BY_EN_ID,
  OFFICIAL_PHRASAL_VERBS_EN_ID,
  OFFICIAL_MOVIE_SERIES_EN_ID,
} from './bundles/packIds';
export type FlashcardPackCategory = 'business' | 'travel' | 'daily' | 'exam' | 'slang' | 'verbs';

/**
 * Градиенты обложек паков для полок хаба (макет A1 `.pk-cov` / `.mini-cov`).
 * зачем: в макете у каждого пака своя тёмная обложка с кодовым именем — она
 * и отличает паки друг от друга на полке. Данных об обложке в модели пака нет,
 * поэтому выводим её из категории: один пак = один устойчивый цвет, полка
 * читается как витрина, а не как список одинаковых плиток.
 */
export const PACK_CATEGORY_COVER: Record<FlashcardPackCategory, [string, string]> = {
  business: ['#3D2B16', '#241B0C'],
  travel: ['#123B33', '#0A2620'],
  daily: ['#241D3D', '#141024'],
  exam: ['#1A2C4A', '#0D1727'],
  slang: ['#3D1F16', '#24100A'],
  verbs: ['#17301F', '#0D1F13'],
};

export function packCoverGradient(category: FlashcardPackCategory): [string, string] {
  return PACK_CATEGORY_COVER[category] ?? ['#241D3D', '#141024'];
}

const PACK_CATEGORY_ICONS: Record<FlashcardPackCategory, string> = {
  business: 'briefcase-outline',
  travel: 'airplane-outline',
  daily: 'sunny-outline',
  exam: 'school-outline',
  slang: 'chatbubbles-outline',
  verbs: 'git-branch-outline',
};

/** Ionicons name for hub / shop tiles by pack category */
export function packCategoryIonIcon(category: FlashcardPackCategory): string {
  return PACK_CATEGORY_ICONS[category] ?? 'albums-outline';
}

export type FlashcardMarketPack = {
  id: string;
  /** Короткое кодове ім\'я для сітки хаба (одна-дві «клички», без обрізання довгого заголовка). */
  codeName: string;
  titleRu: string;
  titleUk: string;
  /** ES — для локалі es; порожній рядок, якщо ще не заповнено в даних. */
  titleEs: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  descriptionRu: string;
  descriptionUk: string;
  descriptionEs: string;
  descriptionPtBr?: string;
  descriptionVi?: string;
  descriptionId?: string;
  descriptionTr?: string;
  descriptionPl?: string;
  category: FlashcardPackCategory;
  cardCount: number;
  /**
   * @deprecated Cards 2.1 §1.2: наборы бесплатны. Поле остаётся только для чтения легаси-данных
   * (бандлы / старые документы Firestore) и не участвует ни в каком платёжном пути.
   */
  priceShards: number;
  /** Сколько людей добавило набор себе (Cards 2.1 §2.1). */
  addedCount?: number;
  /** Лайки активности набора (Cards 2.1 §2.2). */
  likesCount?: number;
  salesCount: number;
  authorName: string;
  isOfficial: boolean;
  /** Набор из community_packs (UGC); покупка через Cloud Function. */
  isCommunityUgc?: boolean;
  /** Study target this pack teaches; missing legacy Firestore docs are treated as English. */
  studyTarget?: StudyTarget;
  /** Полный authorStableId для UGC (редагування). */
  authorStableId?: string;
  /** Статус листингу з Firestore (published / update_pending …). */
  listingStatus?: string;
  /** Набір тимчасово знято з продажу — очікується повторна модерація. */
  isPendingUpdateReview?: boolean;
  /** Ключ палитри карточек UGC. */
  ugcCardThemeKey?: string;
  /** Ключ рубашки карточек UGC. */
  ugcCardBackKey?: string;
  updatedAt: string;
};

/** Підняти при зміні бандлів / схеми карт — інвалідує старий кеш на пристроях. */
export const MARKETPLACE_BUILT_CARDS_CACHE_EPOCH = 12;

type BuiltMarketplaceCardsCache = {
  epoch: number;
  /** `marketOwnedIdsCacheKey(ownedIds)` */
  ownedKey: string;
  cards: CardItem[];
};

export function marketOwnedIdsCacheKey(ownedIds: string[]): string {
  return [...ownedIds].sort().join('\0');
}

function marketplaceCardsAllowedForTarget(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): boolean {
  return flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale);
}

export async function loadBuiltMarketplaceCardsCache(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): Promise<BuiltMarketplaceCardsCache | null> {
  const key = flashcardsMarketplaceBuiltCardsCacheKey(studyTarget);
  if (!marketplaceCardsAllowedForTarget(studyTarget, sourceLocale)) {
    await AsyncStorage.removeItem(key).catch(() => {});
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as BuiltMarketplaceCardsCache;
    if (!p || p.epoch !== MARKETPLACE_BUILT_CARDS_CACHE_EPOCH) return null;
    if (typeof p.ownedKey !== 'string' || !Array.isArray(p.cards)) return null;
    return p;
  } catch {
    return null;
  }
}

export async function saveBuiltMarketplaceCardsCache(
  ownedIds: string[],
  cards: CardItem[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): Promise<void> {
  const key = flashcardsMarketplaceBuiltCardsCacheKey(studyTarget);
  if (!marketplaceCardsAllowedForTarget(studyTarget, sourceLocale)) {
    await AsyncStorage.removeItem(key).catch(() => {});
    return;
  }
  if (ownedIds.length === 0) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  const payload: BuiltMarketplaceCardsCache = {
    epoch: MARKETPLACE_BUILT_CARDS_CACHE_EPOCH,
    ownedKey: marketOwnedIdsCacheKey(ownedIds),
    cards,
  };
  // Defer serialization to avoid blocking the JS thread during frame renders.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  try {
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

const parseIdList = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

// зачем: синхронное зеркало last-known owned pack ids в памяти по studyTarget —
// экран магазина сеет ownedPackIds ИЗ него при первом рендере (peekWarmOwnedPackIds),
// чтобы карточки уже открытых наборов не мигали «не куплено → куплено» после AsyncStorage round-trip.
const warmOwnedPackIdsByTarget = new Map<string, string[]>();

function warmOwnedKey(studyTarget?: RuntimeStudyTarget): string {
  return storageStudyTarget(studyTarget);
}

/** Последний известный список owned id для studyTarget — без ожидания AsyncStorage. null если ещё не читали в этой сессии. */
export function peekWarmOwnedPackIds(studyTarget?: RuntimeStudyTarget): string[] | null {
  return warmOwnedPackIdsByTarget.get(warmOwnedKey(studyTarget)) ?? null;
}

/**
 * Последний известный список доступных паков — нужен синхронным путям каталога
 * (`fallbackBundledMarketPacks`), чтобы официальные наборы не «просачивались»
 * в выдачу до окончания async-загрузки owned (Cards 2.1 §1.1).
 */
export function peekAccessiblePackIds(studyTarget?: RuntimeStudyTarget): string[] {
  return warmOwnedPackIdsByTarget.get(warmOwnedKey(studyTarget)) ?? [];
}

/** Только для тестов / логаута: сбросить синхронный снимок доступных паков. */
export function resetAccessiblePackIdsCache(): void {
  warmOwnedPackIdsByTarget.clear();
}

export async function loadOwnedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  try {
    const ownedKey = flashcardsOwnedPacksKey(studyTarget);
    const devOwnedKey = flashcardsMarketDevOwnedPacksKey(studyTarget);
    const fromOwned = parseIdList(await AsyncStorage.getItem(ownedKey));
    const fromLegacy = parseIdList(await AsyncStorage.getItem(devOwnedKey));
    const merged = [...new Set([...fromOwned, ...fromLegacy])];
    if (merged.length > 0 && fromOwned.length === 0 && fromLegacy.length > 0) {
      await AsyncStorage.setItem(ownedKey, JSON.stringify(merged));
    }
    warmOwnedPackIdsByTarget.set(warmOwnedKey(studyTarget), merged);
    return merged;
  } catch {
    return warmOwnedPackIdsByTarget.get(warmOwnedKey(studyTarget)) ?? [];
  }
}

/**
 * Список id паків, до яких юзер має доступ (для відображення в «Мої», кешу карт і т.д.).
 *
 * Раніше додавав «безкоштовний preview» рандомного паку з 48-год trial.
 * Ваучерна модель (див. pack_trial_gift.ts): сам факт активного ваучера
 * не дає доступ до контенту — юзер обирає й активує конкретний пак через
 * paywall-флоу, після чого його id додається до owned. Тому тут — лише owned.
 */
export async function loadAccessiblePackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  return loadOwnedPackIds(studyTarget);
}

export async function saveOwnedPackIds(ids: string[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  primeOwnedPackIdsCache(ids, studyTarget);
  await AsyncStorage.setItem(flashcardsOwnedPacksKey(studyTarget), JSON.stringify(ids));
}

/** Refresh only the in-memory projection after an atomic economy commit. */
export function primeOwnedPackIdsCache(ids: readonly string[], studyTarget?: RuntimeStudyTarget): void {
  warmOwnedPackIdsByTarget.set(warmOwnedKey(studyTarget), [...new Set(ids)]);
}

export async function addOwnedPackId(id: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  const cur = await loadOwnedPackIds(studyTarget);
  if (cur.includes(id)) return;
  await saveOwnedPackIds([...cur, id], studyTarget);
}

const parseNumber = (value: unknown, backup = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : backup;
};

export { derivePackCodeName };

/** Легасі з Firestore часто в КАПСІ — на екрані хаба показуємо звичайний регістр. */
function normalizePackCodeDisplay(label: string): string {
  const t = label.trim();
  if (!t) return t;
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function packHubCodeName(pack: FlashcardMarketPack): string {
  const raw = (pack.codeName || '').trim();
  const base = raw.length > 0 ? raw : derivePackCodeName(pack.id);
  return normalizePackCodeDisplay(base);
}

type MarketplaceInterfaceLocale = 'ru' | 'uk' | 'es' | PlannedInterfaceLang;
type PlannedMarketCopy = Record<PlannedInterfaceLang, { title: string; description: string }>;
type PackHubLabelCopy = Record<MarketplaceInterfaceLocale, string>;

const PACK_TITLE_FIELD_BY_LANG = {
  ru: 'titleRu',
  uk: 'titleUk',
  es: 'titleEs',
  'pt-BR': 'titlePtBr',
  vi: 'titleVi',
  id: 'titleId',
  tr: 'titleTr',
  pl: 'titlePl',
} as const satisfies Record<MarketplaceInterfaceLocale, keyof FlashcardMarketPack>;

const PACK_DESCRIPTION_FIELD_BY_LANG = {
  ru: 'descriptionRu',
  uk: 'descriptionUk',
  es: 'descriptionEs',
  'pt-BR': 'descriptionPtBr',
  vi: 'descriptionVi',
  id: 'descriptionId',
  tr: 'descriptionTr',
  pl: 'descriptionPl',
} as const satisfies Record<MarketplaceInterfaceLocale, keyof FlashcardMarketPack>;

const OFFICIAL_PACK_HUB_LABELS: Partial<Record<string, PackHubLabelCopy>> = {
  [OFFICIAL_NEGOTIATOR_EN_ID]: {
    ru: 'Переговорщик',
    uk: 'Перемовник',
    es: 'Negociador',
    'pt-BR': 'Negociador',
    vi: 'Dam phan',
    id: 'Negosiator',
    tr: 'Muzakereci',
    pl: 'Negocjator',
  },
  [OFFICIAL_DARK_LOGIC_EN_ID]: {
    ru: 'Темная логика',
    uk: 'Темна логіка',
    es: 'Logica oscura',
    'pt-BR': 'Logica sombria',
    vi: 'Logic den toi',
    id: 'Logika gelap',
    tr: 'Karanlik mantik',
    pl: 'Mroczna logika',
  },
  [OFFICIAL_WILD_WEST_EN_ID]: {
    ru: 'Дикий Запад',
    uk: 'Дикий Захид',
    es: 'Salvaje Oeste',
    'pt-BR': 'Velho Oeste',
    vi: 'Mien Tay',
    id: 'Wild West',
    tr: 'Vahsi Bati',
    pl: 'Dziki Zachod',
  },
  [OFFICIAL_ROYAL_TEA_EN_ID]: {
    ru: 'Королевский чай',
    uk: 'Короливський чай',
    es: 'Te real',
    'pt-BR': 'Cha real',
    vi: 'Tra hoang gia',
    id: 'Teh kerajaan',
    tr: 'Kraliyet cayi',
    pl: 'Krolewska herbata',
  },
  [OFFICIAL_PEAKY_BLINDERS_EN_ID]: {
    ru: 'Острые козырьки',
    uk: 'Гостри козирки',
    es: 'Peaky Blinders',
    'pt-BR': 'Peaky Blinders',
    vi: 'Peaky Blinders',
    id: 'Peaky Blinders',
    tr: 'Peaky Blinders',
    pl: 'Peaky Blinders',
  },
  [OFFICIAL_PREP_IN_EN_ID]: {
    ru: 'Предлог IN',
    uk: 'Прийменник IN',
    es: 'Preposicion IN',
    'pt-BR': 'Preposicao IN',
    vi: 'Gioi tu IN',
    id: 'Preposisi IN',
    tr: 'IN edati',
    pl: 'Przyimek IN',
  },
  [OFFICIAL_PREP_ON_EN_ID]: {
    ru: 'Предлог ON',
    uk: 'Прийменник ON',
    es: 'Preposicion ON',
    'pt-BR': 'Preposicao ON',
    vi: 'Gioi tu ON',
    id: 'Preposisi ON',
    tr: 'ON edati',
    pl: 'Przyimek ON',
  },
  [OFFICIAL_PREP_AT_EN_ID]: {
    ru: 'Предлог AT',
    uk: 'Прийменник AT',
    es: 'Preposicion AT',
    'pt-BR': 'Preposicao AT',
    vi: 'Gioi tu AT',
    id: 'Preposisi AT',
    tr: 'AT edati',
    pl: 'Przyimek AT',
  },
  [OFFICIAL_PREP_TO_EN_ID]: {
    ru: 'Предлог TO',
    uk: 'Прийменник TO',
    es: 'Preposicion TO',
    'pt-BR': 'Preposicao TO',
    vi: 'Gioi tu TO',
    id: 'Preposisi TO',
    tr: 'TO edati',
    pl: 'Przyimek TO',
  },
  [OFFICIAL_PREP_BY_EN_ID]: {
    ru: 'Предлог BY',
    uk: 'Прийменник BY',
    es: 'Preposicion BY',
    'pt-BR': 'Preposicao BY',
    vi: 'Gioi tu BY',
    id: 'Preposisi BY',
    tr: 'BY edati',
    pl: 'Przyimek BY',
  },
  [OFFICIAL_PHRASAL_VERBS_EN_ID]: {
    ru: 'Фразовые глаголы',
    uk: 'Фразові дієслова',
    es: 'Phrasal verbs',
    'pt-BR': 'Phrasal verbs',
    vi: 'Phrasal verbs',
    id: 'Phrasal verbs',
    tr: 'Phrasal verbs',
    pl: 'Phrasal verbs',
  },
  [OFFICIAL_MOVIE_SERIES_EN_ID]: {
    ru: 'Кино и сериалы',
    uk: 'Кіно і серіали',
    es: 'Cine y series',
    'pt-BR': 'Filmes e series',
    vi: 'Phim va series',
    id: 'Film dan serial',
    tr: 'Film ve diziler',
    pl: 'Filmy i seriale',
  },
};

const OFFICIAL_MARKETPLACE_PLANNED_COPY: Partial<Record<string, PlannedMarketCopy>> = {
  [OFFICIAL_NEGOTIATOR_EN_ID]: {
    'pt-BR': {
      title: 'Negociacoes nas sombras: como conseguir melhores condicoes',
      description: 'Nao e so negocios: e vida cotidiana. Descontos, aluguel, autoridade no transito: linguagem para convencer, pressionar e chegar a acordos. Torne-se a pessoa que ouve "sim" com mais frequencia.',
    },
    vi: {
      title: 'Dam phan trong bong toi: cach gianh dieu kien tot hon',
      description: 'Khong chi la kinh doanh: do la doi song hang ngay. Giam gia, chu nha, canh sat giao thong: ngon ngu de thuyet phuc, tao ap luc va dat thoa thuan. Hay tro thanh nguoi duoc nghe "dong y" thuong xuyen hon.',
    },
    id: {
      title: 'Negosiasi bayangan: cara mendapat syarat lebih baik',
      description: 'Ini bukan cuma bisnis, ini kehidupan sehari-hari. Diskon, pemilik rumah, petugas lalu lintas: bahasa untuk meyakinkan, menekan, dan mencapai kesepakatan. Jadilah orang yang lebih sering mendengar "ya".',
    },
    tr: {
      title: 'Golge pazarliklar: daha iyi sartlar nasil alinir',
      description: 'Bu sadece is degil, gunluk hayat. Indirim, ev sahibi, trafik polisi: ikna etmek, baski kurmak ve uzlasmak icin gereken dil. Daha sik "evet" duyan kisi ol.',
    },
    pl: {
      title: 'Zakulisowe negocjacje: jak wywalczyc lepsze warunki',
      description: 'To nie tylko biznes, to codzienne zycie. Rabat, wlasciciel mieszkania, policjant drogowy: jezyk do przekonywania, nacisku i zawierania porozumien. Zostan osoba, ktorej czesciej mowia "tak".',
    },
  },
  [OFFICIAL_DARK_LOGIC_EN_ID]: {
    'pt-BR': {
      title: 'Logica sombria: vencendo discussoes mesmo sem ter razao',
      description: 'Cansou de ser encurralado por termos tecnicos em debates? Este pacote traz armadilhas logicas, frases manipulativas e jeitos elegantes de travar o oponente. Aprenda a conduzir a discussao para ficar com a ultima palavra.',
    },
    vi: {
      title: 'Logic den toi: thang tranh luan ngay ca khi ban sai',
      description: 'Met moi vi bi don ep bang thuat ngu trong tranh luan? Goi nay co bay logic, cau thao tung va cach lich su de day doi phuong vao the bi. Hoc cach dieu khien cuoc thao luan de giu loi cuoi.',
    },
    id: {
      title: 'Logika gelap: menang debat meski kamu tidak benar',
      description: 'Lelah dipojokkan dengan istilah teknis saat debat? Paket ini berisi jebakan logika, frasa manipulatif, dan cara elegan membuat lawan buntu. Pelajari cara mengendalikan diskusi agar kata terakhir tetap milikmu.',
    },
    tr: {
      title: 'Karanlik mantik: hakli olmasan da tartismayi kazan',
      description: 'Tartismalarda teknik terimlerle sikistirilmaktan biktin mi? Bu paket mantik tuzaklari, manipilatif ifadeler ve rakibi zarifce kilitleme yollarini toplar. Son soz sende kalsin diye tartismayi yonetmeyi ogren.',
    },
    pl: {
      title: 'Mroczna logika: wygrywaj spory nawet bez racji',
      description: 'Masz dosc tego, ze w sporach przygniataja cie terminami? Ten pakiet zawiera pulapki logiczne, manipulacyjne frazy i eleganckie sposoby na zablokowanie rozmowcy. Naucz sie prowadzic dyskusje tak, by ostatnie slowo nalezalo do ciebie.',
    },
  },
  [OFFICIAL_WILD_WEST_EN_ID]: {
    'pt-BR': {
      title: 'Velho Oeste: ingles sem regras nem piedade',
      description: 'Aqui nao ha espaco para conversa longa: so decisoes rapidas. Gíria de cowboy, frases de saloon e ditados da corrida do ouro para soar confiante como em um western.',
    },
    vi: {
      title: 'Mien Tay hoang da: tieng Anh khong luat le va khong khoan nhuong',
      description: 'O day khong thich noi dai, chi thich quyet dinh nhanh. Tieng long cowboy, cau noi trong saloon va thanh ngu con sot vang de ban noi chac nhu trong phim mien Tay.',
    },
    id: {
      title: 'Wild West: bahasa Inggris tanpa aturan dan ampun',
      description: 'Di sini orang tidak suka obrolan panjang, mereka suka keputusan cepat. Slang koboi, frasa saloon, dan pepatah demam emas agar kamu terdengar mantap seperti di film western.',
    },
    tr: {
      title: 'Vahsi Bati: kuralsiz ve acimasiz Ingilizce',
      description: 'Burada uzun sohbet sevilmez, hizli karar sevilir. Kovboy argosu, salon ifadeleri ve altina hucum deyisleriyle bir western kadar ozguvenli konus.',
    },
    pl: {
      title: 'Dziki Zachod: angielski bez zasad i litosci',
      description: 'Tu nikt nie lubi dlugich rozmow, licza sie szybkie decyzje. Kowbojski slang, frazy z saloonu i powiedzenia z goraczki zlota, zeby brzmiec pewnie jak w westernie.',
    },
  },
  [OFFICIAL_ROYAL_TEA_EN_ID]: {
    'pt-BR': {
      title: 'Bridgerton: flerte e fofoca da alta sociedade',
      description: 'Aprenda a linguagem dos leques, bailes e insultos velados da Regencia. Insinue escandalos e rejeite pretendentes com elegancia digna de soneto.',
    },
    vi: {
      title: 'Bridgerton: tan tinh va tin don cua gioi thuong luu',
      description: 'Hoc ngon ngu cua quat tay, vu hoi va nhung loi mia mai tinh te thoi Nhiep chinh. Biet cach goi mo be boi va tu choi nguoi theo duoi that thanh lich.',
    },
    id: {
      title: 'Bridgerton: rayuan dan gosip masyarakat kelas atas',
      description: 'Pelajari bahasa kipas, pesta dansa, dan sindiran halus era Regency. Isyaratkan skandal dan tolak pelamar dengan anggun sampai ia ingin menulis soneta.',
    },
    tr: {
      title: 'Bridgerton: yuksek sosyetede flort ve dedikodu',
      description: 'Yelpazelerin, balolarin ve Regency donemi ince hakaretlerinin dilini ogren. Skandali zarifce ima et, talibini sonnet yazdiracak kadar kibarca reddet.',
    },
    pl: {
      title: 'Bridgertonowie: flirt i plotki z wyzszych sfer',
      description: 'Poznaj jezyk wachlarzy, bali i zawoalowanych obelg z epoki regencji. Sugeruj skandal i odrzucaj zalotnika z elegancja godna sonetu.',
    },
  },
  [OFFICIAL_PEAKY_BLINDERS_EN_ID]: {
    'pt-BR': {
      title: 'Peaky Blinders: o ingles do cavalheiro da sorte, Birmingham dos anos 1920',
      description: 'Quer soar como se tivesse uma lamina na boina e as chaves de meia Londres no bolso? Aprenda a fala dura e enfumacada dos Peaky Blinders.',
    },
    vi: {
      title: 'Peaky Blinders: tieng Anh cua quy ong may man, Birmingham thap nien 1920',
      description: 'Muon nghe nhu co luoi dao trong mu va chia khoa nua London trong tui? Hoc cach noi ran roi, am mui khoi cua Peaky Blinders.',
    },
    id: {
      title: 'Peaky Blinders: bahasa Inggris pria beruntung, Birmingham 1920-an',
      description: 'Ingin terdengar seperti punya pisau di topi dan kunci separuh London di saku? Pelajari gaya bicara keras dan berasap ala Peaky Blinders.',
    },
    tr: {
      title: 'Peaky Blinders: 1920ler Birminghamindan talihli beyefendi Ingilizcesi',
      description: 'Sapkasinda jilet, cebinde Londranin yarisinin anahtarlari varmis gibi mi konusmak istiyorsun? Peaky Blindersin sert ve dumanli dilini ogren.',
    },
    pl: {
      title: 'Peaky Blinders: angielski dzentelmena fortuny, Birmingham lat 20.',
      description: 'Chcesz brzmiec, jakby w kaszkiecie byla zyletka, a w kieszeni klucze do polowy Londynu? Naucz sie twardej, zadymionej mowy Peaky Blinders.',
    },
  },
  [OFFICIAL_PREP_IN_EN_ID]: {
    'pt-BR': {
      title: 'Preposicao IN: quando usar "in" em ingles',
      description: 'IN e a preposicao inglesa mais frequente. Comodos, cidades, manhas, estados e estacoes: veja quando usar IN em vez de AT ou ON.',
    },
    vi: {
      title: 'Gioi tu IN: khi nao dung "in" trong tieng Anh',
      description: 'IN la mot trong nhung gioi tu thuong gap nhat trong tieng Anh. Phong, thanh pho, buoi sang, trang thai va mua: phan biet IN voi AT va ON.',
    },
    id: {
      title: 'Preposisi IN: kapan memakai "in" dalam bahasa Inggris',
      description: 'IN adalah salah satu preposisi bahasa Inggris paling sering dipakai. Ruangan, kota, pagi, keadaan, dan musim: bedakan IN dari AT dan ON.',
    },
    tr: {
      title: 'IN edati: Ingilizcede "in" ne zaman kullanilir',
      description: 'IN Ingilizcenin en sik edatlarindan biridir. Odalar, sehirler, sabahlar, durumlar ve mevsimler: IN ile AT ve ON arasindaki farki netlestir.',
    },
    pl: {
      title: 'Przyimek IN: kiedy uzywac "in" po angielsku',
      description: 'IN to jeden z najczestszych angielskich przyimkow. Pokoje, miasta, poranki, stany i pory roku: odroznij IN od AT i ON.',
    },
  },
  [OFFICIAL_PREP_ON_EN_ID]: {
    'pt-BR': {
      title: 'Preposicao ON: superficies, dias e canais',
      description: 'ON cobre superficies, dias especificos e canais de comunicacao. Mesa, onibus, segunda-feira, telefone: pare de adivinhar e fale com precisao.',
    },
    vi: {
      title: 'Gioi tu ON: be mat, ngay va kenh giao tiep',
      description: 'ON dung cho be mat, ngay cu the va kenh giao tiep. Ban, xe buyt, thu Hai, dien thoai: dung doan nua, hay noi chinh xac.',
    },
    id: {
      title: 'Preposisi ON: permukaan, hari, dan saluran',
      description: 'ON dipakai untuk permukaan, hari tertentu, dan saluran komunikasi. Meja, bus, Senin, telepon: berhenti menebak dan bicara tepat.',
    },
    tr: {
      title: 'ON edati: yuzeyler, gunler ve kanallar',
      description: 'ON yuzeyler, belirli gunler ve iletisim kanallari icindir. Masa, otobus, pazartesi, telefon: tahmini birak, dogru konus.',
    },
    pl: {
      title: 'Przyimek ON: powierzchnie, dni i kanaly',
      description: 'ON laczy sie z powierzchniami, konkretnymi dniami i kanalami komunikacji. Stol, autobus, poniedzialek, telefon: przestan zgadywac.',
    },
  },
  [OFFICIAL_PREP_AT_EN_ID]: {
    'pt-BR': {
      title: 'Preposicao AT: pontos no espaco e no tempo',
      description: 'AT marca pontos: endereco exato, hora precisa, momento concreto. Aeroporto, meia-noite, ponto de onibus, festa: onde voce chega.',
    },
    vi: {
      title: 'Gioi tu AT: diem trong khong gian va thoi gian',
      description: 'AT danh dau mot diem: dia chi cu the, gio chinh xac, khoanh khac ro rang. San bay, nua dem, diem dung, bua tiec: noi ban den.',
    },
    id: {
      title: 'Preposisi AT: titik dalam ruang dan waktu',
      description: 'AT menandai titik: alamat tertentu, waktu tepat, momen spesifik. Bandara, tengah malam, halte, pesta: tempat kamu tiba.',
    },
    tr: {
      title: 'AT edati: mekan ve zamanda noktalar',
      description: 'AT bir noktayi gosterir: belirli adres, tam saat, net an. Havaalani, gece yarisi, durak, parti: vardigin yer.',
    },
    pl: {
      title: 'Przyimek AT: punkty w przestrzeni i czasie',
      description: 'AT oznacza punkt: konkretny adres, dokladna godzine, precyzyjny moment. Lotnisko, polnoc, przystanek, impreza: miejsce przybycia.',
    },
  },
  [OFFICIAL_PREP_TO_EN_ID]: {
    'pt-BR': {
      title: 'Preposicao TO: movimento e direcao',
      description: 'TO mostra movimento em direcao a um objetivo. Escola, praia, amigo, porta: TO indica para onde voce esta indo.',
    },
    vi: {
      title: 'Gioi tu TO: chuyen dong va huong',
      description: 'TO luon chi chuyen dong toi muc tieu. Truong, bai bien, ban be, cua: TO cho biet ban dang di ve dau.',
    },
    id: {
      title: 'Preposisi TO: gerak dan arah',
      description: 'TO menunjukkan gerak menuju tujuan. Sekolah, pantai, teman, pintu: TO memperlihatkan ke mana kamu pergi.',
    },
    tr: {
      title: 'TO edati: hareket ve yon',
      description: 'TO hedefe dogru hareketi gosterir. Okul, plaj, arkadas, kapi: TO nereye yoneldigini anlatir.',
    },
    pl: {
      title: 'Przyimek TO: ruch i kierunek',
      description: 'TO pokazuje ruch ku celowi. Szkola, plaza, znajomy, drzwi: TO mowi, dokad zmierzasz.',
    },
  },
  [OFFICIAL_PREP_BY_EN_ID]: {
    'pt-BR': {
      title: 'Preposicao BY: modo e meio',
      description: 'BY explica como algo acontece. Carro, acaso, erro, lei, memoria: BY revela o mecanismo da acao.',
    },
    vi: {
      title: 'Gioi tu BY: cach thuc va phuong tien',
      description: 'BY giai thich cach mot viec xay ra. Xe, tinh co, loi, luat, tri nho: BY cho thay co che cua hanh dong.',
    },
    id: {
      title: 'Preposisi BY: cara dan sarana',
      description: 'BY menjelaskan bagaimana sesuatu terjadi. Mobil, kebetulan, kesalahan, hukum, hafalan: BY membuka mekanisme tindakan.',
    },
    tr: {
      title: 'BY edati: yontem ve arac',
      description: 'BY bir seyin nasil oldugunu aciklar. Araba, tesaduf, hata, yasa, ezber: BY eylemin mekanizmasini gosterir.',
    },
    pl: {
      title: 'Przyimek BY: sposob i srodek',
      description: 'BY wyjasnia, jak cos sie dzieje. Samochod, przypadek, blad, prawo, pamiec: BY ujawnia mechanizm dzialania.',
    },
  },
};

function trimmedMarketString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function plannedCopyForPack(pack: FlashcardMarketPack, lang: MarketplaceInterfaceLocale): { title: string; description: string } | null {
  const copy = OFFICIAL_MARKETPLACE_PLANNED_COPY[pack.id]?.[lang as PlannedInterfaceLang];
  return copy ?? null;
}

function spanishPackDescriptionReserve(pack: FlashcardMarketPack): string {
  return pack.cardCount > 0
    ? `Paquete de ${pack.cardCount} tarjetas en inglés.`
    : 'Paquete de tarjetas en inglés.';
}

/** Заголовок пака в шапке / плитках: planned-локалі не читають RU/UK/ES. */
export function packTitleForInterface(pack: FlashcardMarketPack, lang: 'ru' | 'uk' | 'es' | PlannedInterfaceLang): string {
  const titleField = PACK_TITLE_FIELD_BY_LANG[lang];
  const requestedTitle = trimmedMarketString(pack[titleField]);
  if (requestedTitle) return requestedTitle;
  const plannedTitle = plannedCopyForPack(pack, lang)?.title.trim();
  if (plannedTitle) return plannedTitle;
  const isSpanish = titleField === 'titleEs';
  if (!isSpanish) return packHubCodeName(pack);
  if (pack.isCommunityUgc) {
    return trimmedMarketString(pack.titleRu) || trimmedMarketString(pack.titleUk) || packHubCodeName(pack);
  }
  return packHubCodeName(pack);
}

/** Короткая подпись под плиткой хаба: локализованная, но компактная. */
export function packHubLabelForInterface(pack: FlashcardMarketPack, lang: 'ru' | 'uk' | 'es' | PlannedInterfaceLang): string {
  const localizedHubLabel = trimmedMarketString(OFFICIAL_PACK_HUB_LABELS[pack.id]?.[lang]);
  if (localizedHubLabel) return localizedHubLabel;
  if (pack.isCommunityUgc) {
    const localizedTitle = packTitleForInterface(pack, lang).trim();
    if (localizedTitle) return localizedTitle;
  }
  return packHubCodeName(pack);
}

/** Опис набору для модалки / деталей; planned-локалі не читають RU/UK/ES. */
export function packDescriptionForInterface(pack: FlashcardMarketPack, lang: 'ru' | 'uk' | 'es' | PlannedInterfaceLang): string {
  const descriptionField = PACK_DESCRIPTION_FIELD_BY_LANG[lang];
  const requestedDescription = trimmedMarketString(pack[descriptionField]);
  if (requestedDescription) return requestedDescription;
  const plannedDescription = plannedCopyForPack(pack, lang)?.description.trim();
  if (plannedDescription) return plannedDescription;
  const isSpanish = descriptionField === 'descriptionEs';
  if (!isSpanish) return '';
  if (pack.isCommunityUgc) {
    return trimmedMarketString(pack.descriptionUk) || trimmedMarketString(pack.descriptionRu) || trimmedMarketString(pack.descriptionEs);
  }
  return spanishPackDescriptionReserve(pack);
}

const bundledRaw = (bundledManifest as { packs?: VictoriaPackFile['pack'][] }).packs;
export const BUNDLED_MARKETPLACE_PACKS: FlashcardMarketPack[] = Array.isArray(bundledRaw)
  ? bundledRaw.map((p) => victoriaMetaFromPackJson(p))
  : [];

/** Официальный набор — по флагу или по id-префиксу `official_` (Cards 2.1 §1.1). */
export function isOfficialCatalogPack(pack: Pick<FlashcardMarketPack, 'id' | 'isOfficial'>): boolean {
  return pack.isOfficial === true || String(pack.id).startsWith('official_');
}

/**
 * Cards 2.1 §1.1: официальные наборы выведены из каталога. Официальный пак попадает
 * в выдачу **только если** его id уже есть у пользователя (`loadAccessiblePackIds()`),
 * чтобы у владельцев набор оставался полностью рабочим. Наборы сообщества не фильтруются.
 */
export function filterCatalogPacksByOwnership(
  packs: FlashcardMarketPack[],
  accessiblePackIds: Iterable<string>,
): FlashcardMarketPack[] {
  const accessible = new Set(accessiblePackIds);
  return packs.filter((p) => !isOfficialCatalogPack(p) || accessible.has(p.id));
}

/**
 * Полный бандл-каталог БЕЗ фильтра владения — для DEV-инструментов, сборки карточек
 * и экранов «мои наборы», где метаданные нужны независимо от видимости в каталоге.
 */
export function reserveBundledMarketPacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] {
  if (storageStudyTarget(studyTarget) === 'fr') {
    return sortPacksByUpdatedAt(getCachedFrenchRemoteMarketplacePacks(sourceLocale));
  }
  return sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]);
}

/** @see reserveBundledMarketPacks — то же самое, явное имя для DEV-инструментов. */
export function allBundledMarketPacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] {
  return reserveBundledMarketPacks(studyTarget, sourceLocale);
}

/**
 * Синхронный запасной список для КАТАЛОГА (если async-загрузка вернула пусто или упала):
 * официальные паки в нём остаются только у владельцев (Cards 2.1 §1.1).
 */
export function fallbackBundledMarketPacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] {
  return filterCatalogPacksByOwnership(
    reserveBundledMarketPacks(studyTarget, sourceLocale),
    peekAccessiblePackIds(studyTarget),
  );
}

/**
 * Каталог у додатку = тільки `bundled_marketplace_manifest.json`. Remote з Firestore
 * додає метадані, але **дані з бандла мають пріоритет** (реліз = джерело правди).
 */
function mergeMarketplaceLists(
  remote: FlashcardMarketPack[],
  bundled: FlashcardMarketPack[],
): FlashcardMarketPack[] {
  const byId = new Map<string, FlashcardMarketPack>();
  for (const p of remote) byId.set(p.id, p);
  for (const p of bundled) byId.set(p.id, p);
  return Array.from(byId.values());
}

/** Показуємо в магазині / хабі лише id з поточного маніфесту (не всі `published` з Firestore). */
function filterToBundledCatalog(packs: FlashcardMarketPack[]): FlashcardMarketPack[] {
  const allow = new Set(BUNDLED_MARKETPLACE_PACKS.map((p) => p.id));
  return packs.filter((p) => allow.has(p.id));
}

function sortPacksByUpdatedAt(packs: FlashcardMarketPack[]): FlashcardMarketPack[] {
  return [...packs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeMarketplaceResult(
  merged: FlashcardMarketPack[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): FlashcardMarketPack[] {
  if (merged.length > 0 || BUNDLED_MARKETPLACE_PACKS.length === 0) return merged;
  return fallbackBundledMarketPacks(studyTarget, sourceLocale);
}

const mapPack = (id: string, data: any): FlashcardMarketPack | null => {
  if (!data) return null;
  const titleRu = String(data.titleRu ?? '').trim();
  const titleUk = String(data.titleUk ?? '').trim();
  const titleEs = String(data.titleEs ?? '').trim();
  if (!titleRu && !titleUk && !titleEs) return null;
  const codeNameRaw = String(data.codeName ?? '').trim();
  return {
    id,
    codeName: codeNameRaw || derivePackCodeName(id),
    titleRu,
    titleUk,
    titleEs,
    titlePtBr: String(data.titlePtBr ?? ''),
    titleVi: String(data.titleVi ?? ''),
    titleId: String(data.titleId ?? ''),
    titleTr: String(data.titleTr ?? ''),
    titlePl: String(data.titlePl ?? ''),
    descriptionRu: String(data.descriptionRu ?? ''),
    descriptionUk: String(data.descriptionUk ?? ''),
    descriptionEs: String(data.descriptionEs ?? ''),
    descriptionPtBr: String(data.descriptionPtBr ?? ''),
    descriptionVi: String(data.descriptionVi ?? ''),
    descriptionId: String(data.descriptionId ?? ''),
    descriptionTr: String(data.descriptionTr ?? ''),
    descriptionPl: String(data.descriptionPl ?? ''),
    category: (data.category as FlashcardPackCategory) ?? 'daily',
    cardCount: Math.max(0, Math.floor(parseNumber(data.cardCount))),
    priceShards: Math.max(0, Math.floor(parseNumber(data.priceShards))),
    salesCount: Math.max(0, Math.floor(parseNumber(data.salesCount))),
    authorName: String(data.authorName ?? 'Unknown'),
    isOfficial: Boolean(data.isOfficial),
    updatedAt: String(data.updatedAt ?? new Date(0).toISOString()),
  };
};

/**
 * Sessionый warm-cache: после первого успешного `loadMarketplacePacks` экраны
 * читают тот же массив (та же ссылка) — нет ре-маунта тайлов при повторном focus.
 */
let warmMarketplacePacks: FlashcardMarketPack[] | null = null;
let loadMarketplaceInflight: Promise<FlashcardMarketPack[]> | null = null;

export function peekWarmMarketplacePacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] | null {
  if (storageStudyTarget(studyTarget) === 'fr') {
    const packs = getCachedFrenchRemoteMarketplacePacks(sourceLocale);
    return packs.length > 0 ? sortPacksByUpdatedAt(packs) : null;
  }
  return warmMarketplacePacks;
}

export async function loadMarketplacePacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): Promise<FlashcardMarketPack[]> {
  if (storageStudyTarget(studyTarget) === 'fr') {
    await ensureFrenchRemoteMarketplacePacks(sourceLocale).catch(() => {});
    return sortPacksByUpdatedAt(getCachedFrenchRemoteMarketplacePacks(sourceLocale));
  }
  if (loadMarketplaceInflight) return loadMarketplaceInflight;
  const p = (async (): Promise<FlashcardMarketPack[]> => {
    /** Cards 2.1 §1.1: официальные наборы показываем только их владельцам. */
    const accessible = await loadAccessiblePackIds(studyTarget).catch(() => [] as string[]);
    try {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
        const reserve = normalizeMarketplaceResult(
          filterCatalogPacksByOwnership(sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]), accessible),
          studyTarget,
          sourceLocale,
        );
        warmMarketplacePacks = reserve;
        return reserve;
      }
      const db = firestore();
      const snap = await db
        .collection('card_packs')
        .where('status', '==', 'published')
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

      const mapped = snap.docs
        .map((doc: any) => mapPack(doc.id, doc.data()))
        .filter(Boolean) as FlashcardMarketPack[];
      const merged = sortPacksByUpdatedAt(mergeMarketplaceLists(mapped, BUNDLED_MARKETPLACE_PACKS));
      const result = normalizeMarketplaceResult(
        filterCatalogPacksByOwnership(filterToBundledCatalog(merged), accessible),
        studyTarget,
        sourceLocale,
      );
      warmMarketplacePacks = result;
      return result;
    } catch {
      const prev = warmMarketplacePacks;
      const base = prev && prev.length > 0 ? prev : sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]);
      /** Даже тёплый кеш обязан пройти фильтр владения — иначе официальный пак «залипает» в каталоге. */
      const result = filterCatalogPacksByOwnership(base, accessible);
      warmMarketplacePacks = result;
      return result;
    }
  })();
  loadMarketplaceInflight = p;
  try {
    return await p;
  } finally {
    loadMarketplaceInflight = null;
  }
}

/** Прогрев списка наборов при старте — к моменту открытия магазина/хаба список уже в памяти. */
export async function prefetchMarketplacePacks(): Promise<void> {
  await loadMarketplacePacks().catch(() => {});
}

/** @deprecated Имя «dev» — фактически все купленные наборы; используйте loadOwnedPackIds. */
export async function loadDevOwnedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  return loadOwnedPackIds(studyTarget);
}

export async function saveDevOwnedPackIds(ids: string[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  await saveOwnedPackIds(ids, studyTarget);
}

export async function setDevActivePack(packId: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.setItem(flashcardsMarketDevActivePackKey(studyTarget), packId);
}

export async function consumeDevActivePack(studyTarget?: RuntimeStudyTarget): Promise<string | null> {
  const key = flashcardsMarketDevActivePackKey(studyTarget);
  try {
    const packId = await AsyncStorage.getItem(key);
    await AsyncStorage.removeItem(key);
    return packId;
  } catch {
    return null;
  }
}

const PACK_CARD_TEMPLATES = [
  {
    en: 'Could you walk me through the key idea?',
    ru: 'Можешь кратко объяснить основную идею?',
    uk: 'Можеш коротко пояснити основну ідею?',
    es: '¿Puedes explicarme brevemente la idea principal?',
    'pt-BR': 'Você pode me explicar brevemente a ideia principal?',
    vi: 'Bạn có thể giải thích ngắn gọn ý chính cho tôi không?',
    id: 'Bisakah kamu menjelaskan ide utamanya secara singkat?',
    tr: 'Ana fikri kısaca anlatabilir misin?',
    pl: 'Czy możesz krótko wyjaśnić główną ideę?',
  },
  {
    en: 'Let us align on the next steps.',
    ru: 'Давайте согласуем следующие шаги.',
    uk: 'Давайте узгодимо наступні кроки.',
    es: 'Pongámonos de acuerdo sobre los próximos pasos.',
    'pt-BR': 'Vamos alinhar os próximos passos.',
    vi: 'Hãy thống nhất các bước tiếp theo.',
    id: 'Mari kita selaraskan langkah berikutnya.',
    tr: 'Sonraki adımlar üzerinde anlaşalım.',
    pl: 'Uzgodnijmy następne kroki.',
  },
  {
    en: 'I need a practical example for this.',
    ru: 'Мне нужен практический пример для этого.',
    uk: 'Мені потрібен практичний приклад для цього.',
    es: 'Necesito un ejemplo práctico de esto.',
    'pt-BR': 'Preciso de um exemplo prático disso.',
    vi: 'Tôi cần một ví dụ thực tế cho điều này.',
    id: 'Saya butuh contoh praktis untuk ini.',
    tr: 'Bunun için pratik bir örneğe ihtiyacım var.',
    pl: 'Potrzebuję praktycznego przykładu do tego.',
  },
];

export function buildDevOwnedPackCards(packs: FlashcardMarketPack[]): CardItem[] {
  return packs.flatMap((pack) =>
    PACK_CARD_TEMPLATES.map((tpl, idx) => ({
      id: `market_${pack.id}_${idx + 1}`,
      en: `${tpl.en} (${packHubCodeName(pack)})`,
      ru: tpl.ru,
      uk: tpl.uk,
      es: tpl.es,
      sourceLocales: {
        'pt-BR': tpl['pt-BR'],
        vi: tpl.vi,
        id: tpl.id,
        tr: tpl.tr,
        pl: tpl.pl,
      },
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${pack.id}`,
    })),
  );
}

/** Карточки для купленных наборов: реальный контент для известных id, иначе шаблоны. */
export function buildMarketplaceOwnedCards(
  ownedPacks: FlashcardMarketPack[],
  sourceLocale?: unknown,
  studyTarget?: RuntimeStudyTarget,
): CardItem[] {
  if (
    storageStudyTarget(studyTarget) === 'fr' ||
    ownedPacks.some((pack) => pack.studyTarget === 'fr')
  ) {
    return buildFrenchMarketplaceOwnedCards(ownedPacks, sourceLocale);
  }
  return ownedPacks.flatMap((pack) => {
    if (pack.id === OFFICIAL_PREP_IN_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/prepInBundle') as typeof import('./bundles/prepInBundle')).getPrepInBundleCards();
    }
    if (pack.id === OFFICIAL_PREP_ON_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/prepOnBundle') as typeof import('./bundles/prepOnBundle')).getPrepOnBundleCards();
    }
    if (pack.id === OFFICIAL_PREP_AT_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/prepAtBundle') as typeof import('./bundles/prepAtBundle')).getPrepAtBundleCards();
    }
    if (pack.id === OFFICIAL_PREP_TO_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/prepToBundle') as typeof import('./bundles/prepToBundle')).getPrepToBundleCards();
    }
    if (pack.id === OFFICIAL_PREP_BY_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/prepByBundle') as typeof import('./bundles/prepByBundle')).getPrepByBundleCards();
    }
    if (pack.id === OFFICIAL_PHRASAL_VERBS_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/phrasalVerbsBundle') as typeof import('./bundles/phrasalVerbsBundle')).getPhrasalVerbsBundleCards();
    }
    if (pack.id === OFFICIAL_MOVIE_SERIES_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/movieSeriesBundle') as typeof import('./bundles/movieSeriesBundle')).getMovieSeriesBundleCards();
    }
    if (pack.id === OFFICIAL_PEAKY_BLINDERS_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/peakyBlindersBundle') as typeof import('./bundles/peakyBlindersBundle')).getPeakyBlindersBundleCards();
    }
    if (pack.id === OFFICIAL_ROYAL_TEA_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/royalTeaBundle') as typeof import('./bundles/royalTeaBundle')).getRoyalTeaBundleCards();
    }
    if (pack.id === OFFICIAL_WILD_WEST_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/wildWestBundle') as typeof import('./bundles/wildWestBundle')).getWildWestBundleCards();
    }
    if (pack.id === OFFICIAL_DARK_LOGIC_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/darkLogicBundle') as typeof import('./bundles/darkLogicBundle')).getDarkLogicBundleCards();
    }
    if (pack.id === OFFICIAL_NEGOTIATOR_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/negotiatorBundle') as typeof import('./bundles/negotiatorBundle')).getNegotiatorBundleCards();
    }
    return buildDevOwnedPackCards([pack]);
  });
}

export function bundledPacksForOwned(
  ownedIds: string[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): FlashcardMarketPack[] {
  const s = new Set(ownedIds);
  if (storageStudyTarget(studyTarget) === 'fr') {
    return getCachedFrenchRemoteMarketplacePacks(sourceLocale).filter((p) => s.has(p.id));
  }
  return BUNDLED_MARKETPLACE_PACKS.filter((p) => s.has(p.id));
}

/**
 * Повторно зібрати картки з бандлів у додатку і зберегти (після покупки, щоб кеш був готовий до відкриття «Картки»).
 */
export async function primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const owned = await loadOwnedPackIds(studyTarget);
  if (owned.length === 0) {
    await saveBuiltMarketplaceCardsCache([], [], studyTarget);
    return;
  }
  const ownedPacks = bundledPacksForOwned(owned, studyTarget);
  const cards = buildMarketplaceOwnedCards(ownedPacks, undefined, studyTarget);
  await saveBuiltMarketplaceCardsCache(owned, cards, studyTarget);
}

/** Після надання пробного набору з подарунка — зібрати кеш з куплених + trial */
export async function primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const ids = await loadAccessiblePackIds(studyTarget);
  if (ids.length === 0) {
    await saveBuiltMarketplaceCardsCache([], [], studyTarget);
    return;
  }
  const ownedPacks = bundledPacksForOwned(ids, studyTarget);
  const cards = buildMarketplaceOwnedCards(ownedPacks, undefined, studyTarget);
  await saveBuiltMarketplaceCardsCache(ids, cards, studyTarget);
}


/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
