// ═══ Таблица рангов монеты · ЕДИНСТВЕННЫЙ источник чисел (PM-071-A2, PM-073) ═══
// зачем (владелец 2026-09-24, D34/D60/D62/D63): 20 рангов = 20 готовых картинок монет,
// металлы Медь → Серебро → Золото → Платина по 5 чеканок. Цена перехода НА ранг N
// (из N-1) = N × 1000; ранг 0 — бесплатный старт. Все числа, названия и картинки рангов
// живут ТОЛЬКО здесь: кнопка «Повысить уровень», аватар-монета, церемония чеканки и
// любая будущая подпись берут их отсюда, а не держат свои копии (иначе цена на кнопке
// однажды разойдётся с ценой списания).
//
// Источник: docs/phraseman-2.0/docs/COIN_RANKS.md (таблица «Цены»).
// Картинки: assets/images/coins/coin_rank_NN.webp — нарезка листа владельца
// (docs/phraseman-2.0/docs/coin-assets/sliced/), конвертированы в webp (2,4 МБ → ~0,5 МБ)
// и очищены от краешка соседней монеты, попавшего в нарезку сверху.
//
// ОТКРЫТО (COIN_RANKS.md «Открыто»): названий уровней 21 (Стажёр…Оракул), картинок 20.
// Названия сопоставлены по индексу 0..19, «Оракул» (индекс 20) НЕ используется — замену
// не выдумываем, ждём решения владельца. Названия пока только русские (переводы — PM-245).
import type { ImageSourcePropType } from 'react-native';
import { triLang, type Lang } from '../constants/i18n';

export type CoinMetalId = 'copper' | 'silver' | 'gold' | 'platinum';

export type CoinRankRow = Readonly<{
  /** Ранг 0…19. */
  rank: number;
  /** Цена перехода НА этот ранг из предыдущего. У ранга 0 — 0 (старт). */
  priceToReach: number;
  /** Сколько всего монет потрачено, чтобы дойти до этого ранга от старта. */
  totalSpent: number;
  metalId: CoinMetalId;
  /** Название металла (ru) — имя АССЕТА, не уровня. */
  metalName: string;
  /** Чеканка внутри металла 1…5 (гладкий круг → пышный резной узор). */
  chase: number;
  /** Название уровня (ru), короткая подпись под аватаром / в церемонии. */
  levelTitle: string;
  /** Путь картинки в репозитории — для документации и проверок. */
  assetPath: string;
  /** Картинка монеты для <Image source>. */
  source: ImageSourcePropType;
}>;

export const COIN_RANK_MIN = 0;
export const COIN_RANK_MAX = 19;
/** Шаг цены: переход на ранг N стоит N × COIN_RANK_PRICE_STEP. */
export const COIN_RANK_PRICE_STEP = 1000;

const METALS: readonly (readonly [CoinMetalId, string])[] = [
  ['copper', 'Медь'],
  ['silver', 'Серебро'],
  ['gold', 'Золото'],
  ['platinum', 'Платина'],
];

// Индекс = ранг. «Оракул» (21-е название из COIN_RANKS.md) сознательно отсутствует.
const LEVEL_TITLES_RU: readonly string[] = [
  'Стажёр', 'Кадет', 'Скаут', 'Агент', 'Спикер',
  'Лектор', 'Эксперт', 'Профи', 'Мастер', 'Эрудит',
  'Дипломат', 'Консул', 'Стратег', 'Магистр', 'Лидер',
  'Элита', 'Кумир', 'Икона', 'Легенда', 'Титан',
];

// зачем (PM-128, эмулятор 01.10): на португальском интерфейсе «Настройки» показывали
// «Агент · conta não vinculada» — звания и металлы жили только по-русски. Переводы — прямые
// соответствия русских слов (не новые названия); русская таблица выше остаётся каноном.
const LEVEL_TITLES = Object.freeze({
  ru: LEVEL_TITLES_RU,
  uk: ['Стажер', 'Кадет', 'Скаут', 'Агент', 'Спікер', 'Лектор', 'Експерт', 'Профі', 'Майстер', 'Ерудит',
    'Дипломат', 'Консул', 'Стратег', 'Магістр', 'Лідер', 'Еліта', 'Кумир', 'Ікона', 'Легенда', 'Титан'],
  en: ['Intern', 'Cadet', 'Scout', 'Agent', 'Speaker', 'Lecturer', 'Expert', 'Pro', 'Master', 'Scholar',
    'Diplomat', 'Consul', 'Strategist', 'Magister', 'Leader', 'Elite', 'Idol', 'Icon', 'Legend', 'Titan'],
  es: ['Becario', 'Cadete', 'Explorador', 'Agente', 'Orador', 'Conferenciante', 'Experto', 'Pro', 'Maestro', 'Erudito',
    'Diplomático', 'Cónsul', 'Estratega', 'Magíster', 'Líder', 'Élite', 'Ídolo', 'Icono', 'Leyenda', 'Titán'],
  'pt-BR': ['Estagiário', 'Cadete', 'Escoteiro', 'Agente', 'Orador', 'Palestrante', 'Especialista', 'Pro', 'Mestre', 'Erudito',
    'Diplomata', 'Cônsul', 'Estrategista', 'Magíster', 'Líder', 'Elite', 'Ídolo', 'Ícone', 'Lenda', 'Titã'],
  vi: ['Thực tập sinh', 'Học viên', 'Trinh sát', 'Đặc vụ', 'Diễn giả', 'Giảng viên', 'Chuyên gia', 'Cao thủ', 'Bậc thầy', 'Học giả',
    'Nhà ngoại giao', 'Lãnh sự', 'Chiến lược gia', 'Thạc sĩ', 'Thủ lĩnh', 'Tinh hoa', 'Thần tượng', 'Biểu tượng', 'Huyền thoại', 'Titan'],
  id: ['Magang', 'Kadet', 'Pramuka', 'Agen', 'Pembicara', 'Dosen', 'Ahli', 'Pro', 'Master', 'Cendekia',
    'Diplomat', 'Konsul', 'Ahli strategi', 'Magister', 'Pemimpin', 'Elite', 'Idola', 'Ikon', 'Legenda', 'Titan'],
  tr: ['Stajyer', 'Harbiyeli', 'İzci', 'Ajan', 'Konuşmacı', 'Öğretim görevlisi', 'Uzman', 'Profesyonel', 'Usta', 'Bilge',
    'Diplomat', 'Konsolos', 'Stratejist', 'Magister', 'Lider', 'Elit', 'İdol', 'İkon', 'Efsane', 'Titan'],
  pl: ['Stażysta', 'Kadet', 'Zwiadowca', 'Agent', 'Mówca', 'Wykładowca', 'Ekspert', 'Profesjonalista', 'Mistrz', 'Erudyta',
    'Dyplomata', 'Konsul', 'Strateg', 'Magister', 'Lider', 'Elita', 'Idol', 'Ikona', 'Legenda', 'Tytan'],
} as const);

const METAL_NAMES = Object.freeze({
  ru: ['Медь', 'Серебро', 'Золото', 'Платина'],
  uk: ['Мідь', 'Срібло', 'Золото', 'Платина'],
  en: ['Copper', 'Silver', 'Gold', 'Platinum'],
  es: ['Cobre', 'Plata', 'Oro', 'Platino'],
  'pt-BR': ['Cobre', 'Prata', 'Ouro', 'Platina'],
  vi: ['Đồng', 'Bạc', 'Vàng', 'Bạch kim'],
  id: ['Tembaga', 'Perak', 'Emas', 'Platinum'],
  tr: ['Bakır', 'Gümüş', 'Altın', 'Platin'],
  pl: ['Miedź', 'Srebro', 'Złoto', 'Platyna'],
} as const);

/** Звание ранга на языке интерфейса. Неизвестный ранг → '' (вызывающий показывает свой плейсхолдер). */
export function coinRankTitle(rank: number, lang: Lang): string {
  if (!isValidCoinRank(rank)) return '';
  return (triLang(lang, LEVEL_TITLES) as readonly string[])[rank] ?? LEVEL_TITLES_RU[rank];
}

/** Металл ранга на языке интерфейса. */
export function coinRankMetal(rank: number, lang: Lang): string {
  if (!isValidCoinRank(rank)) return '';
  return (triLang(lang, METAL_NAMES) as readonly string[])[Math.floor(rank / 5)] ?? METALS[Math.floor(rank / 5)][1];
}

// Metro тянет картинки только по статическим require — поэтому список, а не шаблон пути.
const SOURCES: readonly ImageSourcePropType[] = [
  require('../assets/images/coins/coin_rank_00.webp'),
  require('../assets/images/coins/coin_rank_01.webp'),
  require('../assets/images/coins/coin_rank_02.webp'),
  require('../assets/images/coins/coin_rank_03.webp'),
  require('../assets/images/coins/coin_rank_04.webp'),
  require('../assets/images/coins/coin_rank_05.webp'),
  require('../assets/images/coins/coin_rank_06.webp'),
  require('../assets/images/coins/coin_rank_07.webp'),
  require('../assets/images/coins/coin_rank_08.webp'),
  require('../assets/images/coins/coin_rank_09.webp'),
  require('../assets/images/coins/coin_rank_10.webp'),
  require('../assets/images/coins/coin_rank_11.webp'),
  require('../assets/images/coins/coin_rank_12.webp'),
  require('../assets/images/coins/coin_rank_13.webp'),
  require('../assets/images/coins/coin_rank_14.webp'),
  require('../assets/images/coins/coin_rank_15.webp'),
  require('../assets/images/coins/coin_rank_16.webp'),
  require('../assets/images/coins/coin_rank_17.webp'),
  require('../assets/images/coins/coin_rank_18.webp'),
  require('../assets/images/coins/coin_rank_19.webp'),
];

// зачем (координатор 18.10, Ревизор: на «Пике» монеты пустые до ~9 с): исходник 768² показывается в 18–40 dp — телефон каждый раз
// декодирует ~2,3 МБ пикселей ради кружка 120 px. Уменьшенные копии 96² и 192² (assets/images/coins/s96, s192; исходники не тронуты,
// как иконки v2art b4af17fc1) декодируются в 30–60 раз быстрее. Выбор — по реальному размеру в пикселях (coinRankSourceForSize).
const SOURCES_96: readonly ImageSourcePropType[] = [
  require('../assets/images/coins/s96/coin_rank_00.webp'),
  require('../assets/images/coins/s96/coin_rank_01.webp'),
  require('../assets/images/coins/s96/coin_rank_02.webp'),
  require('../assets/images/coins/s96/coin_rank_03.webp'),
  require('../assets/images/coins/s96/coin_rank_04.webp'),
  require('../assets/images/coins/s96/coin_rank_05.webp'),
  require('../assets/images/coins/s96/coin_rank_06.webp'),
  require('../assets/images/coins/s96/coin_rank_07.webp'),
  require('../assets/images/coins/s96/coin_rank_08.webp'),
  require('../assets/images/coins/s96/coin_rank_09.webp'),
  require('../assets/images/coins/s96/coin_rank_10.webp'),
  require('../assets/images/coins/s96/coin_rank_11.webp'),
  require('../assets/images/coins/s96/coin_rank_12.webp'),
  require('../assets/images/coins/s96/coin_rank_13.webp'),
  require('../assets/images/coins/s96/coin_rank_14.webp'),
  require('../assets/images/coins/s96/coin_rank_15.webp'),
  require('../assets/images/coins/s96/coin_rank_16.webp'),
  require('../assets/images/coins/s96/coin_rank_17.webp'),
  require('../assets/images/coins/s96/coin_rank_18.webp'),
  require('../assets/images/coins/s96/coin_rank_19.webp'),
];
const SOURCES_192: readonly ImageSourcePropType[] = [
  require('../assets/images/coins/s192/coin_rank_00.webp'),
  require('../assets/images/coins/s192/coin_rank_01.webp'),
  require('../assets/images/coins/s192/coin_rank_02.webp'),
  require('../assets/images/coins/s192/coin_rank_03.webp'),
  require('../assets/images/coins/s192/coin_rank_04.webp'),
  require('../assets/images/coins/s192/coin_rank_05.webp'),
  require('../assets/images/coins/s192/coin_rank_06.webp'),
  require('../assets/images/coins/s192/coin_rank_07.webp'),
  require('../assets/images/coins/s192/coin_rank_08.webp'),
  require('../assets/images/coins/s192/coin_rank_09.webp'),
  require('../assets/images/coins/s192/coin_rank_10.webp'),
  require('../assets/images/coins/s192/coin_rank_11.webp'),
  require('../assets/images/coins/s192/coin_rank_12.webp'),
  require('../assets/images/coins/s192/coin_rank_13.webp'),
  require('../assets/images/coins/s192/coin_rank_14.webp'),
  require('../assets/images/coins/s192/coin_rank_15.webp'),
  require('../assets/images/coins/s192/coin_rank_16.webp'),
  require('../assets/images/coins/s192/coin_rank_17.webp'),
  require('../assets/images/coins/s192/coin_rank_18.webp'),
  require('../assets/images/coins/s192/coin_rank_19.webp'),
];

export type CoinRankSourceVariant = 's96' | 's192' | 'full';

/** Картинка монеты под размер показа: 96² до 96 px, 192² до 192 px, крупнее (момент, церемония, витрина) — исходник 768². */
export function coinRankSourceForSize(rank: number, sizeDp: number, pixelRatio: number): Readonly<{ source: ImageSourcePropType; variant: CoinRankSourceVariant }> {
  const row = coinRankRowForDisplay(rank);
  const px = Math.ceil(Math.max(0, sizeDp) * Math.max(1, pixelRatio || 1));
  if (px <= 96) return { source: SOURCES_96[row.rank], variant: 's96' };
  if (px <= 192) return { source: SOURCES_192[row.rank], variant: 's192' };
  return { source: row.source, variant: 'full' };
}

function buildTable(): readonly CoinRankRow[] {
  const rows: CoinRankRow[] = [];
  let total = 0;
  for (let rank = COIN_RANK_MIN; rank <= COIN_RANK_MAX; rank += 1) {
    const price = rank * COIN_RANK_PRICE_STEP;
    total += price;
    const [metalId, metalName] = METALS[Math.floor(rank / 5)];
    rows.push(Object.freeze({
      rank,
      priceToReach: price,
      totalSpent: total,
      metalId,
      metalName,
      chase: (rank % 5) + 1,
      levelTitle: LEVEL_TITLES_RU[rank],
      assetPath: `assets/images/coins/coin_rank_${String(rank).padStart(2, '0')}.webp`,
      source: SOURCES[rank],
    }));
  }
  return Object.freeze(rows);
}

export const COIN_RANK_TABLE: readonly CoinRankRow[] = buildTable();

/** Ранг — целое 0…19. Всё остальное (NaN, дробь, чужое значение из хранилища) — не ранг. */
export function isValidCoinRank(rank: unknown): rank is number {
  return Number.isSafeInteger(rank) && (rank as number) >= COIN_RANK_MIN && (rank as number) <= COIN_RANK_MAX;
}

/**
 * Строка таблицы для ПОКАЗА (картинка, название). Вне диапазона — ближайший край:
 * показ не должен падать из-за битого значения. Для денег это не годится —
 * списание обязано проверять ранг через isValidCoinRank и отказывать.
 */
export function coinRankRowForDisplay(rank: number): CoinRankRow {
  const safe = Number.isFinite(rank) ? Math.round(rank) : COIN_RANK_MIN;
  const idx = Math.max(COIN_RANK_MIN, Math.min(COIN_RANK_MAX, safe)); // guard-ok: индекс строки показа, не баланс
  return COIN_RANK_TABLE[idx];
}

/** Строка следующего ранга или null, если ранг уже последний / невалидный. */
export function nextCoinRankRow(rank: number): CoinRankRow | null {
  if (!isValidCoinRank(rank) || rank >= COIN_RANK_MAX) return null;
  return COIN_RANK_TABLE[rank + 1];
}
