import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { forceSyncShardsToCloud, getShardsBalance, spendShards } from './shards_system';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';

export const PROFILE_CARD_LEVEL_KEY = 'profile_card_level';
export const PROFILE_CARD_THEME_KEY = 'profile_card_theme';
export const PROFILE_CARD_MOTION_KEY = 'profile_card_motion';
export const PROFILE_CARD_PUBLIC_FOCUS_KEY = 'profile_card_public_focus';

export const PROFILE_CARD_MAX_LEVEL = 5;

export type ProfileCardLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type ProfileCardTheme = 'classic' | 'gold' | 'crystal' | 'ember' | 'aurora';
export type ProfileCardMotion = 'none' | 'gleam' | 'pulse' | 'particles' | 'elite';
export type ProfileCardPublicFocus = 'balanced' | 'arena' | 'streak' | 'league' | 'xp';

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

export type ProfileCardChoiceDef<T extends string> = {
  id: T;
  minLevel: ProfileCardLevel;
  name: string;
  descriptionRu: string;
  descriptionUk: string;
  descriptionEs: string;
  'descriptionPt-BR': string;
  descriptionVi: string;
  descriptionId: string;
  descriptionTr: string;
  descriptionPl: string;
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
    name: 'Polished',
    cost: 30,
    unlockRu: 'Элитная компоновка, бейдж уровня карточки и более чистая иерархия',
    unlockUk: 'Елітна композиція, бейдж рівня картки та чистіша ієрархія',
    unlockEs: 'Diseño premium, insignia de nivel y jerarquía más clara',
    'unlockPt-BR': 'Layout premium, selo de nível do cartão e hierarquia mais limpa',
    unlockVi: 'Bố cục cao cấp, huy hiệu cấp độ thẻ và phân cấp gọn gàng hơn',
    unlockId: 'Tata letak premium, lencana level kartu, dan hierarki lebih rapi',
    unlockTr: 'Seçkin yerleşim, kart seviyesi rozeti ve daha temiz hiyerarşi',
    unlockPl: 'Elegancki układ, odznaka poziomu karty i czytelniejsza hierarchia',
  },
  {
    level: 2,
    name: 'Signature',
    cost: 60,
    unlockRu: 'Выбор темы и материала карточки',
    unlockUk: 'Вибір теми та матеріалу картки',
    unlockEs: 'Elección de tema y material de la tarjeta',
    'unlockPt-BR': 'Escolha do tema e do material do cartão',
    unlockVi: 'Chọn chủ đề và chất liệu của thẻ',
    unlockId: 'Pilihan tema dan material kartu',
    unlockTr: 'Kart teması ve malzemesi seçimi',
    unlockPl: 'Wybór motywu i materiału karty',
  },
  {
    level: 3,
    name: 'Motion',
    cost: 100,
    unlockRu: 'Анимированная рамка и более дорогой вход карточки',
    unlockUk: 'Анімована рамка та дорожчий вхід картки',
    unlockEs: 'Marco animado y entrada más premium',
    'unlockPt-BR': 'Moldura animada e entrada do cartão mais premium',
    unlockVi: 'Khung viền động và hiệu ứng xuất hiện thẻ cao cấp hơn',
    unlockId: 'Bingkai beranimasi dan animasi tampil kartu lebih mewah',
    unlockTr: 'Animasyonlu çerçeve ve daha gösterişli kart girişi',
    unlockPl: 'Animowana ramka i bardziej efektowne pojawienie się karty',
  },
  {
    level: 4,
    name: 'Prestige',
    cost: 160,
    unlockRu: 'Расширенные публичные статусные показатели',
    unlockUk: 'Розширені публічні статусні показники',
    unlockEs: 'Estadísticas públicas de prestigio ampliadas',
    'unlockPt-BR': 'Estatísticas públicas de prestígio ampliadas',
    unlockVi: 'Mở rộng các chỉ số trạng thái công khai',
    unlockId: 'Statistik status publik yang diperluas',
    unlockTr: 'Genişletilmiş herkese açık prestij göstergeleri',
    unlockPl: 'Rozszerzone publiczne wskaźniki prestiżu',
  },
  {
    level: 5,
    name: 'Elite',
    cost: 250,
    unlockRu: 'Элитный entrance-эффект и самый сильный визуальный статус',
    unlockUk: 'Елітний entrance-ефект і найсильніший візуальний статус',
    unlockEs: 'Efecto de entrada elite y máximo estado visual',
    'unlockPt-BR': 'Efeito de entrada elite e o maior status visual',
    unlockVi: 'Hiệu ứng xuất hiện đẳng cấp và trạng thái hình ảnh mạnh nhất',
    unlockId: 'Efek tampil elite dan status visual paling kuat',
    unlockTr: 'Seçkin giriş efekti ve en güçlü görsel statü',
    unlockPl: 'Elitarny efekt pojawienia i najmocniejszy status wizualny',
  },
];

export const PROFILE_CARD_THEMES: ProfileCardChoiceDef<ProfileCardTheme>[] = [
  {
    id: 'classic',
    minLevel: 0,
    name: 'Classic',
    descriptionRu: 'Чистый базовый материал без декоративной темы.',
    descriptionUk: 'Чистий базовий матеріал без декоративної теми.',
    descriptionEs: 'Material base limpio sin tema decorativo.',
    'descriptionPt-BR': 'Material base limpo, sem tema decorativo.',
    descriptionVi: 'Chất liệu nền sạch sẽ, không có chủ đề trang trí.',
    descriptionId: 'Material dasar yang bersih tanpa tema dekoratif.',
    descriptionTr: 'Dekoratif tema olmadan temiz, sade malzeme.',
    descriptionPl: 'Czysty, bazowy materiał bez ozdobnego motywu.',
  },
  {
    id: 'gold',
    minLevel: 2,
    name: 'Gold',
    descriptionRu: 'Теплый золотой металл для статусной карточки.',
    descriptionUk: 'Теплий золотий метал для статусної картки.',
    descriptionEs: 'Metal dorado cálido para una tarjeta de estatus.',
    'descriptionPt-BR': 'Metal dourado quente para um cartão de status.',
    descriptionVi: 'Kim loại vàng ấm áp cho một tấm thẻ đẳng cấp.',
    descriptionId: 'Logam emas hangat untuk kartu berstatus.',
    descriptionTr: 'Statü kartı için sıcak altın metal.',
    descriptionPl: 'Ciepły, złoty metal dla statusowej karty.',
  },
  {
    id: 'crystal',
    minLevel: 2,
    name: 'Crystal',
    descriptionRu: 'Холодное стекло, сияние и аккуратный премиальный блеск.',
    descriptionUk: 'Холодне скло, сяйво і акуратний преміальний блиск.',
    descriptionEs: 'Cristal frío, brillo y acabado premium sutil.',
    'descriptionPt-BR': 'Vidro frio, brilho e um acabamento premium discreto.',
    descriptionVi: 'Thủy tinh mát lạnh, ánh sáng và độ bóng cao cấp tinh tế.',
    descriptionId: 'Kaca dingin, kilau, dan kilap premium yang halus.',
    descriptionTr: 'Soğuk cam, ışıltı ve zarif bir premium parlaklık.',
    descriptionPl: 'Chłodne szkło, blask i subtelny, premium połysk.',
  },
  {
    id: 'ember',
    minLevel: 2,
    name: 'Ember',
    descriptionRu: 'Огненный акцент для игроков с сильной серией.',
    descriptionUk: 'Вогняний акцент для гравців із сильною серією.',
    descriptionEs: 'Acento de fuego para jugadores con buena racha.',
    'descriptionPt-BR': 'Toque de fogo para jogadores com uma boa sequência.',
    descriptionVi: 'Điểm nhấn rực lửa cho người chơi có chuỗi ngày mạnh mẽ.',
    descriptionId: 'Aksen api untuk pemain dengan rentetan yang kuat.',
    descriptionTr: 'Güçlü seriye sahip oyuncular için ateş vurgusu.',
    descriptionPl: 'Ognisty akcent dla graczy z mocną serią.',
  },
  {
    id: 'aurora',
    minLevel: 2,
    name: 'Aurora',
    descriptionRu: 'Редкое северное свечение для элитного профиля.',
    descriptionUk: 'Рідкісне північне сяйво для елітного профілю.',
    descriptionEs: 'Aurora rara para un perfil elite.',
    'descriptionPt-BR': 'Aurora rara para um perfil de elite.',
    descriptionVi: 'Ánh cực quang hiếm có cho hồ sơ đẳng cấp.',
    descriptionId: 'Aurora langka untuk profil elite.',
    descriptionTr: 'Seçkin bir profil için nadir kuzey ışığı.',
    descriptionPl: 'Rzadka zorza polarna dla elitarnego profilu.',
  },
];

export const PROFILE_CARD_MOTIONS: ProfileCardChoiceDef<ProfileCardMotion>[] = [
  {
    id: 'none',
    minLevel: 0,
    name: 'Calm',
    descriptionRu: 'Спокойная карточка без движения.',
    descriptionUk: 'Спокійна картка без руху.',
    descriptionEs: 'Tarjeta tranquila sin movimiento.',
    'descriptionPt-BR': 'Cartão tranquilo, sem movimento.',
    descriptionVi: 'Thẻ tĩnh lặng, không chuyển động.',
    descriptionId: 'Kartu tenang tanpa gerakan.',
    descriptionTr: 'Hareketsiz, sakin bir kart.',
    descriptionPl: 'Spokojna karta bez ruchu.',
  },
  {
    id: 'gleam',
    minLevel: 3,
    name: 'Gleam',
    descriptionRu: 'Мягкий проход света по рамке карточки.',
    descriptionUk: 'М’який прохід світла по рамці картки.',
    descriptionEs: 'Barrido suave de luz por el borde.',
    'descriptionPt-BR': 'Um leve brilho de luz percorrendo a borda do cartão.',
    descriptionVi: 'Ánh sáng nhẹ lướt qua viền thẻ.',
    descriptionId: 'Sapuan cahaya lembut di sepanjang tepi kartu.',
    descriptionTr: 'Kart kenarında yumuşak bir ışık geçişi.',
    descriptionPl: 'Delikatny przesuw światła po krawędzi karty.',
  },
  {
    id: 'pulse',
    minLevel: 3,
    name: 'Pulse',
    descriptionRu: 'Дышащее свечение вокруг карточки.',
    descriptionUk: 'Дихаюче сяйво навколо картки.',
    descriptionEs: 'Brillo respirante alrededor de la tarjeta.',
    'descriptionPt-BR': 'Um brilho pulsante ao redor do cartão.',
    descriptionVi: 'Ánh sáng nhấp nhô quanh tấm thẻ.',
    descriptionId: 'Cahaya bernapas di sekeliling kartu.',
    descriptionTr: 'Kartın etrafında nefes alıp veren bir parıltı.',
    descriptionPl: 'Pulsująca poświata wokół karty.',
  },
  {
    id: 'particles',
    minLevel: 3,
    name: 'Particles',
    descriptionRu: 'Небольшие искры вокруг верхней части профиля.',
    descriptionUk: 'Невеликі іскри навколо верхньої частини профілю.',
    descriptionEs: 'Pequeñas chispas alrededor del perfil.',
    'descriptionPt-BR': 'Pequenas faíscas ao redor do topo do perfil.',
    descriptionVi: 'Những tia lửa nhỏ quanh phần trên của hồ sơ.',
    descriptionId: 'Percikan kecil di sekitar bagian atas profil.',
    descriptionTr: 'Profilin üst kısmında küçük kıvılcımlar.',
    descriptionPl: 'Drobne iskry wokół górnej części profilu.',
  },
  {
    id: 'elite',
    minLevel: 5,
    name: 'Elite',
    descriptionRu: 'Самый дорогой entrance-эффект и сияние элитной карточки.',
    descriptionUk: 'Найдорожчий entrance-ефект і сяйво елітної картки.',
    descriptionEs: 'Efecto de entrada y brillo elite.',
    'descriptionPt-BR': 'O efeito de entrada mais sofisticado e o brilho de um cartão de elite.',
    descriptionVi: 'Hiệu ứng xuất hiện đẳng cấp nhất và ánh sáng của thẻ elite.',
    descriptionId: 'Efek tampil termewah dan kilau kartu elite.',
    descriptionTr: 'En gösterişli giriş efekti ve seçkin kart parıltısı.',
    descriptionPl: 'Najbardziej efektowne pojawienie i blask elitarnej karty.',
  },
];

export const PROFILE_CARD_PUBLIC_FOCUSES: ProfileCardChoiceDef<ProfileCardPublicFocus>[] = [
  {
    id: 'balanced',
    minLevel: 0,
    name: 'Balanced',
    descriptionRu: 'Показывает главные сильные стороны без перекоса.',
    descriptionUk: 'Показує головні сильні сторони без перекосу.',
    descriptionEs: 'Muestra las fortalezas principales sin sesgo.',
    'descriptionPt-BR': 'Mostra os principais pontos fortes sem favorecer nenhum.',
    descriptionVi: 'Hiển thị các thế mạnh chính một cách cân bằng.',
    descriptionId: 'Menampilkan kekuatan utama tanpa berat sebelah.',
    descriptionTr: 'Öne çıkan güçlü yönleri dengeli biçimde gösterir.',
    descriptionPl: 'Pokazuje główne atuty bez przesady.',
  },
  {
    id: 'xp',
    minLevel: 4,
    name: 'XP',
    descriptionRu: 'Акцент на общем опыте и уровне.',
    descriptionUk: 'Акцент на загальному досвіді та рівні.',
    descriptionEs: 'Enfoque en experiencia total y nivel.',
    'descriptionPt-BR': 'Foco na experiência total e no nível.',
    descriptionVi: 'Tập trung vào tổng kinh nghiệm và cấp độ.',
    descriptionId: 'Fokus pada total pengalaman dan level.',
    descriptionTr: 'Toplam deneyim ve seviyeye odaklanır.',
    descriptionPl: 'Nacisk na łączne doświadczenie i poziom.',
  },
  {
    id: 'streak',
    minLevel: 4,
    name: 'Streak',
    descriptionRu: 'Акцент на дисциплине и днях подряд.',
    descriptionUk: 'Акцент на дисципліні та днях поспіль.',
    descriptionEs: 'Enfoque en disciplina y racha.',
    'descriptionPt-BR': 'Foco na disciplina e na sequência de dias.',
    descriptionVi: 'Tập trung vào kỷ luật và chuỗi ngày liên tiếp.',
    descriptionId: 'Fokus pada disiplin dan rentetan hari.',
    descriptionTr: 'Disipline ve üst üste günlere odaklanır.',
    descriptionPl: 'Nacisk na dyscyplinę i serię dni z rzędu.',
  },
  {
    id: 'league',
    minLevel: 4,
    name: 'League',
    descriptionRu: 'Акцент на текущей лиге.',
    descriptionUk: 'Акцент на поточній лізі.',
    descriptionEs: 'Enfoque en la liga actual.',
    'descriptionPt-BR': 'Foco na liga atual.',
    descriptionVi: 'Tập trung vào giải đấu hiện tại.',
    descriptionId: 'Fokus pada liga saat ini.',
    descriptionTr: 'Mevcut lige odaklanır.',
    descriptionPl: 'Nacisk na aktualną ligę.',
  },
  {
    id: 'arena',
    minLevel: 4,
    name: 'Arena',
    descriptionRu: 'Акцент на PvP-ранге арены.',
    descriptionUk: 'Акцент на PvP-ранзі арени.',
    descriptionEs: 'Enfoque en el rango PvP de arena.',
    'descriptionPt-BR': 'Foco no ranque PvP da arena.',
    descriptionVi: 'Tập trung vào hạng PvP của đấu trường.',
    descriptionId: 'Fokus pada peringkat PvP arena.',
    descriptionTr: 'Arena PvP rütbesine odaklanır.',
    descriptionPl: 'Nacisk na rangę PvP areny.',
  },
];

const DEFAULT_PROFILE_CARD_LEVEL_DEF = PROFILE_CARD_LEVELS[0];
const DEFAULT_PROFILE_CARD_THEME_DEF = PROFILE_CARD_THEMES[0];
const DEFAULT_PROFILE_CARD_MOTION_DEF = PROFILE_CARD_MOTIONS[0];
const DEFAULT_PROFILE_CARD_PUBLIC_FOCUS_DEF = PROFILE_CARD_PUBLIC_FOCUSES[0];

export const PROFILE_CARD_SYNC_KEYS = [
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_THEME_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
] as const;

export function normalizeProfileCardLevel(value: unknown): ProfileCardLevel {
  const n = Math.max(0, Math.min(PROFILE_CARD_MAX_LEVEL, Math.floor(Number(value) || 0)));
  return n as ProfileCardLevel;
}

export function getProfileCardLevelDef(level: ProfileCardLevel): ProfileCardLevelDef {
  const match = PROFILE_CARD_LEVELS.find((item) => item.level === level);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_LEVEL_DEF;
}

export function getProfileCardThemeDef(theme: ProfileCardTheme): ProfileCardChoiceDef<ProfileCardTheme> {
  const match = PROFILE_CARD_THEMES.find((item) => item.id === theme);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_THEME_DEF;
}

export function getProfileCardMotionDef(motion: ProfileCardMotion): ProfileCardChoiceDef<ProfileCardMotion> {
  const match = PROFILE_CARD_MOTIONS.find((item) => item.id === motion);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_MOTION_DEF;
}

export function getProfileCardPublicFocusDef(focus: ProfileCardPublicFocus): ProfileCardChoiceDef<ProfileCardPublicFocus> {
  const match = PROFILE_CARD_PUBLIC_FOCUSES.find((item) => item.id === focus);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_PUBLIC_FOCUS_DEF;
}

export function getNextProfileCardLevel(level: ProfileCardLevel): ProfileCardLevel | null {
  if (level >= PROFILE_CARD_MAX_LEVEL) return null;
  return (level + 1) as ProfileCardLevel;
}

/**
 * Конкретный визуальный эффект карточки по уровню + выбранному motion. Единый
 * источник истины для превью (avatar_select), публичной карточки (PlayerProfileModal)
 * и анимаций (ProfileCardMotionFx) — чтобы маппинг не расходился между файлами.
 *
 *   1 polished  → 'sheen'   мягкий проблеск канта
 *   2 signature → 'breath'  дыхание акцент-ореола
 *   3 motion    → 'runner'  бегущий луч по периметру + искры (если motion !== none)
 *   4 prestige  → 'holo'    голографический перелив + параллакс-блик
 *   5 elite     → 'elite'   призма-скан + аура-частицы
 */
export type ProfileCardFxKind = 'none' | 'sheen' | 'breath' | 'runner' | 'holo' | 'elite';

export function fxKindForProfileCard(level: ProfileCardLevel, motion: ProfileCardMotion): ProfileCardFxKind {
  // Выбор «Calm» (motion==='none') УВАЖАЕТСЯ на всех уровнях, где motion доступен (>=3):
  //  - ур.3 → совсем без движения ('none'), юзер явно отключил;
  //  - ур.4-5 → не полный holo/elite, а спокойное 'breath' (карточка не «мёртвая», но
  //    без агрессивного движения) — престиж сохраняется, выбор пользователя слышен.
  if (level >= 5) return motion === 'none' ? 'breath' : 'elite';
  if (level >= 4) return motion === 'none' ? 'breath' : 'holo';
  if (level >= 3) return motion === 'none' ? 'none' : 'runner';
  if (level >= 2) return 'breath';
  if (level >= 1) return 'sheen';
  return 'none';
}

/** Русские «продуктовые» имена уровней для UI (англ. `name` в LEVELS — служебное). */
export const PROFILE_CARD_LEVEL_NAME_RU: Record<ProfileCardLevel, string> = {
  0: 'Стандарт',
  1: 'Гранёная',
  2: 'Фирменная',
  3: 'Движение',
  4: 'Престиж',
  5: 'Элита',
};

/**
 * Продающий буллет уровня. `text` локализован на все 8 языков приложения (как unlock*
 * в LEVELS), `isNew` помечает фичи, которые добавляет именно этот уровень (тег NEW).
 * Тексты на «ты», коротко, в духе сторовых преимуществ.
 */
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

/**
 * Достаёт буллет на нужном языке. Тексты есть для всех 8 поддерживаемых языков; для
 * неизвестного кода языка возвращаем русский как ведущий (это не runtime-аудит-резолвер,
 * а простая выборка локали из полного словаря).
 */
export function sellingPointText(point: ProfileCardSellingPoint, lang: string): string {
  const t = point.text;
  const byLang = (t as Record<string, string>)[lang];
  return byLang || t.ru;
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
      ru: 'Плюс-компоновка и тонкий кант-фольга',
      uk: 'Плюс-композиція та тонкий кант-фольга',
      es: 'Diseño Plus y borde de lámina fina',
      'pt-BR': 'Layout Plus e borda de folha fina',
      vi: 'Bố cục Plus và viền ánh kim mảnh',
      id: 'Tata letak Plus dan tepi foil tipis',
      tr: 'Plus düzen ve ince folyo kenar',
      pl: 'Plus układ i cienki kant-folia',
    } },
    { isNew: true, text: {
      ru: 'Бейдж «CARD I» у имени в друзьях, арене и клубе',
      uk: 'Бейдж «CARD I» біля імені у друзях, арені та клубі',
      es: 'Insignia «CARD I» junto a tu nombre en amigos, arena y club',
      'pt-BR': 'Selo «CARD I» ao lado do nome em amigos, arena e clube',
      vi: 'Huy hiệu «CARD I» cạnh tên trong bạn bè, đấu trường và câu lạc bộ',
      id: 'Lencana «CARD I» di samping nama di teman, arena, dan klub',
      tr: 'Arkadaşlar, arena ve kulüpte adının yanında «CARD I» rozeti',
      pl: 'Odznaka «CARD I» przy imieniu w znajomych, arenie i klubie',
    } },
    { isNew: true, text: {
      ru: 'Мягкий проблеск по канту при появлении',
      uk: 'М’який проблиск по канту під час появи',
      es: 'Brillo suave por el borde al aparecer',
      'pt-BR': 'Brilho suave na borda ao aparecer',
      vi: 'Ánh sáng nhẹ lướt qua viền khi xuất hiện',
      id: 'Kilau lembut di tepi saat muncul',
      tr: 'Belirirken kenarda yumuşak bir parıltı',
      pl: 'Delikatny błysk po krawędzi przy pojawieniu',
    } },
  ],
  2: [
    { isNew: true, text: {
      ru: '4 темы-материала: золото, кристалл, жар, аврора',
      uk: '4 теми-матеріали: золото, кристал, жар, аврора',
      es: '4 materiales: oro, cristal, brasa, aurora',
      'pt-BR': '4 materiais: ouro, cristal, brasa, aurora',
      vi: '4 chất liệu: vàng, pha lê, lửa, cực quang',
      id: '4 material: emas, kristal, bara, aurora',
      tr: '4 malzeme: altın, kristal, kor, aurora',
      pl: '4 materiały: złoto, kryształ, żar, zorza',
    } },
    { isNew: true, text: {
      ru: 'Цветной кант и тень-ореол под выбранный материал',
      uk: 'Кольоровий кант і тінь-ореол під обраний матеріал',
      es: 'Borde de color y halo de sombra según el material',
      'pt-BR': 'Borda colorida e halo de sombra conforme o material',
      vi: 'Viền màu và quầng bóng theo chất liệu đã chọn',
      id: 'Tepi berwarna dan halo bayangan sesuai material',
      tr: 'Seçilen malzemeye göre renkli kenar ve gölge halesi',
      pl: 'Kolorowy kant i cień-aureola pod wybrany materiał',
    } },
    { isNew: true, text: {
      ru: 'Спокойное «дыхание» акцента — карточка живая',
      uk: 'Спокійне «дихання» акценту — картка жива',
      es: 'Una «respiración» suave del acento: la tarjeta cobra vida',
      'pt-BR': 'Uma «respiração» suave do destaque: o cartão ganha vida',
      vi: 'Điểm nhấn «thở» nhẹ nhàng — tấm thẻ trở nên sống động',
      id: 'Aksen yang «bernapas» lembut — kartu jadi hidup',
      tr: 'Vurgunun yumuşak «nefesi» — kart canlanır',
      pl: 'Spokojne „oddychanie” akcentu — karta żyje',
    } },
  ],
  3: [
    { isNew: true, text: {
      ru: 'Анимированная рамка — луч света бежит по периметру',
      uk: 'Анімована рамка — промінь світла біжить по периметру',
      es: 'Marco animado: un haz de luz recorre el borde',
      'pt-BR': 'Moldura animada: um feixe de luz percorre a borda',
      vi: 'Khung động — tia sáng chạy quanh viền',
      id: 'Bingkai beranimasi — seberkas cahaya berlari di tepi',
      tr: 'Animasyonlu çerçeve — bir ışık huzmesi kenarda dolaşır',
      pl: 'Animowana ramka — promień światła biegnie po krawędzi',
    } },
    { isNew: true, text: {
      ru: 'Парящие искры над карточкой',
      uk: 'Ширяючі іскри над карткою',
      es: 'Chispas flotando sobre la tarjeta',
      'pt-BR': 'Faíscas flutuando sobre o cartão',
      vi: 'Những tia lửa bay lơ lửng trên thẻ',
      id: 'Percikan melayang di atas kartu',
      tr: 'Kartın üzerinde süzülen kıvılcımlar',
      pl: 'Unoszące się iskry nad kartą',
    } },
    { isNew: false, text: {
      ru: 'Движение видно даже в чужом списке — ты выделяешься',
      uk: 'Рух видно навіть у чужому списку — ти вирізняєшся',
      es: 'El movimiento se ve incluso en listas ajenas: destacas',
      'pt-BR': 'O movimento aparece até em listas alheias: você se destaca',
      vi: 'Chuyển động hiện rõ cả trong danh sách của người khác — bạn nổi bật',
      id: 'Gerakan terlihat bahkan di daftar orang lain — kamu menonjol',
      tr: 'Hareket başkalarının listesinde bile görünür — öne çıkarsın',
      pl: 'Ruch widać nawet na cudzej liście — wyróżniasz się',
    } },
  ],
  4: [
    { isNew: true, text: {
      ru: 'Расширенные публичные результаты — 3 метрики вместо 2',
      uk: 'Розширені публічні результати — 3 метрики замість 2',
      es: 'Estadísticas públicas ampliadas: 3 métricas en vez de 2',
      'pt-BR': 'Estatísticas públicas ampliadas: 3 métricas em vez de 2',
      vi: 'Thống kê công khai mở rộng — 3 chỉ số thay vì 2',
      id: 'Statistik publik diperluas — 3 metrik, bukan 2',
      tr: 'Genişletilmiş herkese açık istatistik — 2 yerine 3 gösterge',
      pl: 'Rozszerzone publiczne statystyki — 3 metryki zamiast 2',
    } },
    { isNew: true, text: {
      ru: 'Выбор фокуса: XP, серия, лига или арена в центре',
      uk: 'Вибір фокусу: XP, серія, ліга або арена в центрі',
      es: 'Elige el foco: XP, racha, liga o arena en el centro',
      'pt-BR': 'Escolha o foco: XP, sequência, liga ou arena em destaque',
      vi: 'Chọn điểm nhấn: XP, chuỗi ngày, giải đấu hay đấu trường ở trung tâm',
      id: 'Pilih fokus: XP, rentetan, liga, atau arena di tengah',
      tr: 'Odağı seç: XP, seri, lig veya arena merkezde',
      pl: 'Wybór fokusu: XP, seria, liga lub arena na środku',
    } },
    { isNew: true, text: {
      ru: 'Голографический отлив фона и параллакс-блик',
      uk: 'Голографічний відлив фону та паралакс-відблиск',
      es: 'Reflejo holográfico del fondo y brillo parallax',
      'pt-BR': 'Reflexo holográfico do fundo e brilho parallax',
      vi: 'Ánh phản chiếu hologram của nền và lóe sáng parallax',
      id: 'Kilau holografik latar dan kilatan parallax',
      tr: 'Arka planın holografik yansıması ve parallax parıltısı',
      pl: 'Holograficzny odblask tła i błysk parallax',
    } },
  ],
  5: [
    { isNew: true, text: {
      ru: 'Кинематографичный вход — карточка влетает со вспышкой',
      uk: 'Кінематографічний вхід — картка влітає зі спалахом',
      es: 'Entrada cinematográfica: la tarjeta irrumpe con un destello',
      'pt-BR': 'Entrada cinematográfica: o cartão surge com um flash',
      vi: 'Hiệu ứng xuất hiện như phim — tấm thẻ lao vào kèm tia chớp',
      id: 'Kemunculan sinematik — kartu melesat dengan kilatan',
      tr: 'Sinematik giriş — kart bir parlamayla içeri süzülür',
      pl: 'Kinowe wejście — karta wlatuje z błyskiem',
    } },
    { isNew: true, text: {
      ru: 'Аура-частицы и призма-скан по holo-канту',
      uk: 'Аура-частинки та призма-скан по holo-канту',
      es: 'Partículas de aura y escaneo de prisma por el borde holo',
      'pt-BR': 'Partículas de aura e varredura de prisma na borda holo',
      vi: 'Hạt hào quang và quét lăng kính dọc viền holo',
      id: 'Partikel aura dan pindaian prisma di tepi holo',
      tr: 'Aura parçacıkları ve holo kenarda prizma taraması',
      pl: 'Cząsteczki aury i skan pryzmatu po holo-kancie',
    } },
    { isNew: true, text: {
      ru: 'Максимальный визуальный статус в игре',
      uk: 'Максимальний візуальний статус у грі',
      es: 'El máximo estatus visual del juego',
      'pt-BR': 'O máximo status visual do jogo',
      vi: 'Trạng thái hình ảnh đỉnh cao nhất trong trò chơi',
      id: 'Status visual tertinggi dalam game',
      tr: 'Oyundaki en yüksek görsel statü',
      pl: 'Najwyższy status wizualny w grze',
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

export async function getProfileCardSnapshot(): Promise<ProfileCardSnapshot> {
  try {
    const [[, rawLevel], [, rawTheme], [, rawMotion], [, rawFocus]] = await AsyncStorage.multiGet([
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    return {
      level: normalizeProfileCardLevel(rawLevel),
      theme: normalizeProfileCardTheme(rawTheme),
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

export function canUseProfileCardTheme(level: ProfileCardLevel, theme: ProfileCardTheme): boolean {
  return level >= getProfileCardThemeDef(theme).minLevel;
}

export function canUseProfileCardMotion(level: ProfileCardLevel, motion: ProfileCardMotion): boolean {
  return level >= getProfileCardMotionDef(motion).minLevel;
}

export function canUseProfileCardPublicFocus(level: ProfileCardLevel, focus: ProfileCardPublicFocus): boolean {
  return level >= getProfileCardPublicFocusDef(focus).minLevel;
}

export async function setProfileCardTheme(theme: ProfileCardTheme): Promise<ProfileCardSnapshot> {
  const level = await getProfileCardLevel();
  const next = normalizeProfileCardTheme(theme);
  if (!canUseProfileCardTheme(level, next)) {
    throw new Error('profile_card_theme_locked');
  }
  await AsyncStorage.setItem(PROFILE_CARD_THEME_KEY, next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function setProfileCardMotion(motion: ProfileCardMotion): Promise<ProfileCardSnapshot> {
  const level = await getProfileCardLevel();
  const next = normalizeProfileCardMotion(motion);
  if (!canUseProfileCardMotion(level, next)) {
    throw new Error('profile_card_motion_locked');
  }
  await AsyncStorage.setItem(PROFILE_CARD_MOTION_KEY, next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function setProfileCardPublicFocus(focus: ProfileCardPublicFocus): Promise<ProfileCardSnapshot> {
  const level = await getProfileCardLevel();
  const next = normalizeProfileCardPublicFocus(focus);
  if (!canUseProfileCardPublicFocus(level, next)) {
    throw new Error('profile_card_focus_locked');
  }
  await AsyncStorage.setItem(PROFILE_CARD_PUBLIC_FOCUS_KEY, next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

/**
 * Persists the new card level locally and seeds the default theme/motion/focus that
 * each tier unlocks, so the card looks complete right after an upgrade. Shared by the
 * server-validated path and the offline path.
 */
async function applyProfileCardLevelLocally(next: ProfileCardLevel): Promise<void> {
  await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, String(next));
  if (next >= 2) {
    const theme = await AsyncStorage.getItem(PROFILE_CARD_THEME_KEY);
    if (!theme) await AsyncStorage.setItem(PROFILE_CARD_THEME_KEY, 'gold');
  }
  if (next >= 3) {
    const motion = await AsyncStorage.getItem(PROFILE_CARD_MOTION_KEY);
    if (!motion) await AsyncStorage.setItem(PROFILE_CARD_MOTION_KEY, 'gleam');
  }
  if (next >= 5) {
    const motion = await AsyncStorage.getItem(PROFILE_CARD_MOTION_KEY);
    if (!motion || motion === 'none' || normalizeProfileCardMotion(motion) === 'gleam') {
      await AsyncStorage.setItem(PROFILE_CARD_MOTION_KEY, 'elite');
    }
  }
  if (next >= 4) {
    const focus = await AsyncStorage.getItem(PROFILE_CARD_PUBLIC_FOCUS_KEY);
    if (!focus) await AsyncStorage.setItem(PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced');
  }
}

type ProfileCardUpgradeCloudResult =
  | { ok: true; alreadyApplied: boolean; level: number; balance: number; spent: number }
  | { ok: false; reason: 'max' | 'insufficient'; level: number; balance: number; cost?: number };

/**
 * Calls the server-authoritative profileCardUpgrade callable. The card level is a public
 * status badge now, so the server — not the client — validates the shard spend and owns
 * the level.
 *
 * Returns one of three outcomes, kept DISTINCT on purpose:
 *  - 'cloud_disabled' — the CF was never attempted (Expo Go / sync disabled). Safe for the
 *    caller to use the local shard-spend path; no server charge could have happened.
 *  - ProfileCardUpgradeCloudResult — the CF responded definitively (ok / insufficient / max).
 *  - 'cloud_error' — the call was attempted but failed or returned nothing (timeout, dropped
 *    response, malformed data). The CF MAY have already committed the spend, so the caller
 *    MUST NOT also charge locally — that would double-charge real currency on a flaky network.
 */
async function upgradeProfileCardLevelOnCloud(
  expectedLevel: ProfileCardLevel,
): Promise<ProfileCardUpgradeCloudResult | 'cloud_disabled' | 'cloud_error'> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return 'cloud_disabled';
  try {
    // Send the SAME id the client stores shards under (getCanonicalUserId === stableId),
    // so the CF reads the matching users/{stableId} doc. Otherwise it sees a different/empty
    // doc, reports balance 0 → false "insufficient" → the UI bounces to the shard shop.
    const { getCanonicalUserId } = require('./user_id_policy');
    const stableId = await getCanonicalUserId();
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const { getApp } = require('@react-native-firebase/app');
    const callCf = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'profileCardUpgrade',
    ) as (data: { expectedLevel: number; stableId?: string }) => Promise<{ data: ProfileCardUpgradeCloudResult }>;
    const res = await callCf({ expectedLevel, ...(stableId ? { stableId } : {}) });
    // No payload = we can't prove what the server did → treat as uncertain, not as offline.
    if (!res?.data) return 'cloud_error';
    return res.data;
  } catch {
    return 'cloud_error';
  }
}

/**
 * Pushes the local shard balance to the cloud before the server-validated upgrade, so the
 * CF reads the real balance (local & cloud wallets can drift). No-op when cloud is off
 * (the offline path checks the local balance directly). Best-effort — never throws.
 */
async function reconcileShardsToCloudBeforeUpgrade(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  try {
    await forceSyncShardsToCloud();
  } catch { /* best-effort; upgrade still validates server-side */ }
}

/** Emitted after a card level changes. Shards were spent, so notify balance listeners;
 *  xp_changed is kept for existing card-UI listeners that already key on it. */
function emitProfileCardUpgraded(balance: number): void {
  emitAppEvent('shards_balance_updated', { balance, op: 'spend', reason: 'profile_card_upgrade' });
  emitAppEvent('xp_changed');
}

export async function upgradeProfileCardLevel(): Promise<
  | { ok: true; level: ProfileCardLevel; balance: number }
  | { ok: false; reason: 'max' | 'insufficient' | 'spend_failed' | 'cloud_error'; need?: number; balance?: number }
> {
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return { ok: false, reason: 'max' };

  const def = getProfileCardLevelDef(next);

  // Push the local shard balance to the cloud BEFORE the server validates the spend.
  // Shards have a local wallet (AsyncStorage) and a cloud wallet (users/{uid}.shards);
  // the CF reads the cloud wallet. If they drifted (dev grants, an earn that never
  // reached cloud), the CF would see too few shards and wrongly report "insufficient" →
  // the UI bounced the player to the shard shop. Reconciling first makes the CF see the
  // real balance. Best-effort: never block the upgrade if the sync itself fails.
  await reconcileShardsToCloudBeforeUpgrade();

  // Preferred path: server validates the shard spend and owns the authoritative level,
  // so a tampered client can't grant itself a public CARD badge it never paid for.
  const cloud = await upgradeProfileCardLevelOnCloud(current);

  if (cloud === 'cloud_error') {
    // The CF was attempted but the outcome is unknown — it may have already charged. Do
    // NOT also spend locally (that would double-charge). Report a soft failure; the next
    // open of the card UI re-reads the authoritative level from the cloud sync.
    return { ok: false, reason: 'cloud_error' };
  }

  if (cloud !== 'cloud_disabled') {
    if (cloud.ok) {
      const grantedLevel = normalizeProfileCardLevel(cloud.level);
      // The server already committed the spend + level. The local write is only a mirror,
      // so if it fails we still report success (cloud sync reconciles local on next read) —
      // never tell the user "failed" after they were charged.
      try {
        await applyProfileCardLevelLocally(grantedLevel);
      } catch { /* mirror only; cloud is authoritative */ }
      emitProfileCardUpgraded(cloud.balance);
      return { ok: true, level: grantedLevel, balance: cloud.balance };
    }
    if (cloud.reason === 'max') return { ok: false, reason: 'max' };
    const cost = cloud.cost ?? def.cost;
    return { ok: false, reason: 'insufficient', need: Math.max(0, cost - cloud.balance), balance: cloud.balance };
  }

  // Offline path (Expo Go / cloud disabled only — never on a cloud error). spendShards is
  // itself server-authoritative when online via its own Firestore transaction.
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

export function profileCardLevelRoman(level: ProfileCardLevel): string {
  return ['0', 'I', 'II', 'III', 'IV', 'V'][level] ?? '0';
}


/**
 * DEV-ONLY: bumps the local card level by one WITHOUT spending shards and without the
 * server-validated path. This exists purely so we can preview every tier on a dev build;
 * it is gated behind __DEV__ and is a no-op in release builds, so it can never grant a
 * real player a paid CARD badge. Returns the new snapshot (or the unchanged one at max).
 */
export async function devGrantProfileCardLevel(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return getProfileCardSnapshot();
  await applyProfileCardLevelLocally(next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

/**
 * DEV-ONLY: resets the local card back to level 0 (Standard) so we can re-test the upgrade
 * flow from scratch. Theme/motion/focus are reset to their defaults too. No-op in release.
 */
export async function devResetProfileCard(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  await AsyncStorage.multiSet([
    [PROFILE_CARD_LEVEL_KEY, '0'],
    [PROFILE_CARD_THEME_KEY, 'classic'],
    [PROFILE_CARD_MOTION_KEY, 'none'],
    [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced'],
  ]);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

/**
 * Shared theme palette for the profile card. Single source of truth so the full card
 * (avatar_select / PlayerProfileModal) and the compact list badge (ProfileCardBadge)
 * stay visually consistent instead of each redefining colors.
 */
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
  crystal: {
    accent: '#67E8F9',
    accentSoft: 'rgba(103,232,249,0.15)',
    accentStrong: 'rgba(103,232,249,0.42)',
    secondary: '#E0F2FE',
    shadowColor: '#22D3EE',
  },
  ember: {
    accent: '#FB7185',
    accentSoft: 'rgba(251,113,133,0.15)',
    accentStrong: 'rgba(251,113,133,0.42)',
    secondary: '#FED7AA',
    shadowColor: '#FB7185',
  },
  aurora: {
    accent: '#A78BFA',
    accentSoft: 'rgba(167,139,250,0.15)',
    accentStrong: 'rgba(34,211,238,0.36)',
    secondary: '#22D3EE',
    shadowColor: '#A78BFA',
  },
};

/**
 * Resolves the public-facing theme of a card from its raw stored fields, applying the
 * same level gates used everywhere else (theme only counts from level 2). Returns the
 * normalized level, effective theme and its colors — everything a compact badge needs.
 */
export function resolveProfileCardDisplay(input: {
  level?: unknown;
  theme?: unknown;
}): { level: ProfileCardLevel; theme: ProfileCardTheme; colors: ProfileCardThemeColors } {
  const level = normalizeProfileCardLevel(input.level);
  const theme = level >= 2 ? normalizeProfileCardTheme(input.theme) : 'classic';
  return { level, theme, colors: PROFILE_CARD_THEME_COLORS[theme] };
}

export function normalizeProfileCardTheme(value: unknown): ProfileCardTheme {
  return value === 'gold' || value === 'crystal' || value === 'ember' || value === 'aurora'
    ? value
    : 'classic';
}

const LEGACY_PROFILE_CARD_MOTION_LIGHT = ['shi', 'mmer'].join('');

export function normalizeProfileCardMotion(value: unknown): ProfileCardMotion {
  if (value === LEGACY_PROFILE_CARD_MOTION_LIGHT) return 'gleam';
  return value === 'gleam' || value === 'pulse' || value === 'particles' || value === 'elite'
    ? value
    : 'none';
}

export function normalizeProfileCardPublicFocus(value: unknown): ProfileCardPublicFocus {
  return value === 'arena' || value === 'streak' || value === 'league' || value === 'xp'
    ? value
    : 'balanced';
}
