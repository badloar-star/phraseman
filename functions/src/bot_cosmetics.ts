// ═══════════════════════════════════════════════════════════════════════════
// bot_cosmetics.ts — витринная косметика соперников-ботов и жителей лиг.
//
// зачем (владелец, 2026-08-27): «боты которые попадаются на арене или боты в
// лигах в списках должны иметь иногда рандомно или аватар из доступных на
// витрине или ауру любую или и то и другое но рандомно всегда и не все».
//
// До этого бот был опознаваем с первого кадра именно косметикой: у живых
// игроков встречаются купленные аватары и ауры, а у бота стоял голый уровневый
// номер и aura:null жёстко (league_residents.buildResidentMember). Живая
// комната так выглядела списком одинаковых новичков.
//
// Частоты владельца: аватар витрины ~12%, аура ~12% — независимыми бросками,
// поэтому «и то и другое» выпадает примерно у полутора процентов. Это ровно
// то, что просили: «иногда», «не все».
//
// Всё детерминировано по seed: у бота арены косметика не меняется при
// переподключении, у жителя лиги — не мигает при каждом обновлении очков
// (refreshResidents пересобирает запись целиком раз в тик).
//
// Один модуль на оба режима намеренно: разъехавшиеся частоты в двух местах —
// это класс бага, который здесь уже был с именами ботов.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ауры витрины, доступные боту. Обычные (покупаются за жемчуг) — все 37 из каталога.
 *
 * Чего здесь НЕТ и почему:
 * • сезонных/наградных (aura-nimbus, aura-season-*) — они выдаются за реальные
 *   достижения и админкой, бот с такой аурой обесценил бы награду;
 * • aura-pro — Pro носит только пожизненный тариф, это самый громкий сигнал
 *   в игре.
 * Plus-аура вынесена отдельно (PLUS_BOT_AURA_ID) и выпадает много реже.
 */
export const BOT_SHOWCASE_AURA_IDS = [
  'aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-coral',
  'aura-prism', 'aura-lagoon', 'aura-sunset', 'aura-still-halo', 'aura-moonline',
  'aura-pearl-breath', 'aura-frost-petal', 'aura-storm-vine', 'aura-sunflower-pulse',
  'aura-neon-circuit', 'aura-data-ring', 'aura-plasma-gear', 'aura-holo-scan',
  'aura-lunar-sigil', 'aura-solar-eclipse', 'aura-star-choir', 'aura-astral-eyes',
  'aura-magma-rift', 'aura-thunder-fang', 'aura-inferno-crown', 'aura-acid-surge',
  'aura-bubble-pop', 'aura-pixel-party', 'aura-rainbow-loop', 'aura-gilded-laurel',
  'aura-diamond-orbit', 'aura-velvet-gold', 'aura-regal-wings', 'aura-void-thorn',
  'aura-blood-moon', 'aura-obsidian-smoke', 'aura-phantom-chain',
] as const;

/**
 * Аура подписки Plus. Владелец разрешил её ботам («обычные + иногда Plus»):
 * пустая витрина подписчиков читается как «её никто не покупает».
 *
 * ВАЖНО: клиент гасит Plus-ауру у профиля без премиума
 * (getEffectiveAvatarAuraId). Поэтому носитель обязан получить и isPremium —
 * см. botCosmetics().isPremium. Без этого аура просто не нарисуется, и доля
 * аур молча просела бы ниже заказанной.
 */
export const PLUS_BOT_AURA_ID = 'aura-plus';

/** Градиенты подложки кастом-аватара — весь список витрины. */
export const BOT_AVATAR_GRADIENT_IDS = [
  'aurora', 'ember', 'cosmic', 'forest', 'citrine',
  'royal', 'ruby', 'magma', 'noirgold', 'sakura',
] as const;

/**
 * Аватары, которые бот вправе носить, — ТОЛЬКО те, что сейчас продаются
 * (владелец, 2026-08-27: «должны быть только аватары которые в продаже, а не
 * вообще весь рандом — те которые не подключены»).
 *
 * Правда о продаже живёт на клиенте: `CUSTOM_AVATAR_SHOP` в
 * constants/custom_avatars.ts = `AVATAR100_CATALOG` (constants/avatar100_assets.ts).
 * Это ряд 73…126 без 90 — ровно 53 позиции.
 *
 * Чего здесь НЕТ и почему:
 * • 01–40 — подарочный пул (`CUSTOM_AVATAR_GIFT_POOL`), за жемчуг не продаётся;
 * • 41–72 и 90 — сняты с продажи навсегда (`isRetiredCustomAvatarSale`).
 *   Прежние владельцы их носят, но купить нельзя — бот в таком аватаре
 *   рекламировал бы то, чего в магазине нет.
 *
 * Сервер не может импортировать клиентские константы (они тянут React Native),
 * поэтому диапазон задан здесь и закрыт сторожем в bot_cosmetics.test.ts:
 * тест читает сам каталог и падает, если списки разошлись.
 */
export const BOT_CUSTOM_AVATAR_MIN = 73;
export const BOT_CUSTOM_AVATAR_MAX = 126;
/** Снят с продажи внутри диапазона — пропускается при выборе. */
export const BOT_CUSTOM_AVATAR_EXCLUDED: readonly number[] = [90];

/** Номера продающихся аватаров: диапазон минус исключения. */
export const BOT_SELLABLE_AVATAR_NUMBERS: readonly number[] = Array.from(
  { length: BOT_CUSTOM_AVATAR_MAX - BOT_CUSTOM_AVATAR_MIN + 1 },
  (_, offset) => BOT_CUSTOM_AVATAR_MIN + offset,
).filter((number) => !BOT_CUSTOM_AVATAR_EXCLUDED.includes(number));

/** Доля ботов с купленным аватаром витрины вместо уровневого номера. */
export const BOT_SHOWCASE_AVATAR_CHANCE = 0.12;
/** Доля ботов с аурой. */
export const BOT_AURA_CHANCE = 0.12;
/**
 * Какая часть аур — это Plus. Один бот из восьми носителей, то есть примерно
 * полтора процента всех ботов: подписка видна, но остаётся редкостью.
 */
export const BOT_PLUS_AURA_SHARE = 0.125;

/**
 * FNV-1a по (seed, salt) → [0,1). Тот же приём, что в arena_bot_identity:
 * независимые «броски» из одного seed без общего состояния генератора,
 * поэтому добавление нового броска не сдвигает уже существующие.
 */
function unit(seed: string, salt: string): number {
  let hash = 2166136261;
  const source = `${seed}|${salt}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function pick<T>(pool: readonly T[], value: number): T {
  return pool[Math.min(pool.length - 1, Math.floor(value * pool.length))] as T;
}

/** Строка кастом-аватара в формате клиента: custom:<id>:<градиент>:<цвет>. */
export function botShowcaseAvatarValue(seed: string): string {
  // Выбор ИЗ СПИСКА продающихся, а не из диапазона: внутри 73…126 есть дыра
  // (90 снят с продажи), и бросок по диапазону иногда попадал бы прямо в неё.
  const number = pick(BOT_SELLABLE_AVATAR_NUMBERS, unit(seed, 'shop-avatar'));
  // Двузначные id дополняются нулём, трёхзначные остаются как есть —
  // ровно так они записаны в constants/custom_avatars.ts.
  const id = `custom-gen-${String(number).padStart(2, '0')}`;
  const gradient = pick(BOT_AVATAR_GRADIENT_IDS, unit(seed, 'shop-gradient'));
  const logoColor = unit(seed, 'shop-logo') < 0.5 ? 'black' : 'white';
  return `custom:${id}:${gradient}:${logoColor}`;
}

/**
 * Косметика для ФИКСИРОВАННОГО корпуса (жители лиг: ровно RESIDENT_SLOT_COUNT
 * персонажей, сегодня — сотня).
 *
 * зачем отдельная функция: свободный бросок хорош на потоке уникальных seed'ов
 * (арена — новый матч каждый раз), но на замкнутой сотне он даёт что выпадет.
 * Замер на боевом корпусе: аур получилось 5 из 100 вместо заказанных двенадцати.
 * Подгонять соль под текущий размер корпуса нельзя — реестр вырастет, и доля
 * молча уедет снова.
 *
 * Поэтому здесь квота: сортируем весь корпус по хэшу и берём ровно верхние
 * ceil(N × доля). Сколько бы персонажей ни стало, носителей всегда ровно
 * заказанная доля, а КТО именно — по-прежнему псевдослучайно и стабильно.
 */
export function botCosmeticsForCorpus(index: number, corpusSize: number): BotCosmetics {
  const seed = `resident:${index}`;
  const size = Math.max(1, Math.trunc(corpusSize));
  const safeIndex = ((Math.trunc(index) % size) + size) % size;
  const result: BotCosmetics = {};
  if (inTopQuota(safeIndex, size, 'has-shop-avatar', BOT_SHOWCASE_AVATAR_CHANCE)) {
    result.avatar = botShowcaseAvatarValue(seed);
  }
  const auraCarriers = quotaMembers(size, 'has-aura', BOT_AURA_CHANCE);
  if (auraCarriers.includes(safeIndex)) {
    // Plus выбирается СРЕДИ носителей аур, а не по всему корпусу: две
    // независимые квоты на сотне персонажей просто не пересекались, и
    // подписчик не появлялся ни разу (замер: plus=0 из 12 аур).
    const plusQuota = Math.max(1, Math.round(auraCarriers.length * BOT_PLUS_AURA_SHARE));
    const plusCarriers = auraCarriers
      .slice()
      .sort((a, b) => unit(`resident:${a}`, 'aura-plus') - unit(`resident:${b}`, 'aura-plus'))
      .slice(0, plusQuota);
    if (plusCarriers.includes(safeIndex)) {
      result.aura = PLUS_BOT_AURA_ID;
      result.isPremium = true;
    } else {
      result.aura = pick(BOT_SHOWCASE_AURA_IDS, unit(seed, 'aura-pick'));
    }
  }
  return result;
}

/**
 * Индексы корпуса, попавшие в верхние `share` по хэшу (salt) — ровно
 * ceil(size × share) штук. Прямая сортировка: корпус измеряется сотнями, а
 * вызов идёт при пересборке записи жителя (раз в тик), не в кадре отрисовки.
 *
 * Результат кэшируется: fillRoomWithResidents строит до 28 записей подряд с
 * одними и теми же (size, salt) — без кэша это была бы 28-кратная сортировка
 * на каждую комнату.
 */
const quotaCache = new Map<string, readonly number[]>();

function quotaMembers(size: number, salt: string, share: number): readonly number[] {
  const key = `${size}|${salt}|${share}`;
  const cached = quotaCache.get(key);
  if (cached) return cached;
  const quota = Math.max(0, Math.min(size, Math.ceil(size * share)));
  const ordered = Array.from({ length: size }, (_, index) => index)
    // Ничьи разрываются по индексу — иначе порядок зависел бы от реализации
    // сортировки и косметика «переезжала» бы между персонажами.
    .sort((a, b) => {
      const diff = unit(`resident:${a}`, salt) - unit(`resident:${b}`, salt);
      return diff !== 0 ? diff : a - b;
    })
    .slice(0, quota);
  quotaCache.set(key, ordered);
  return ordered;
}

function inTopQuota(index: number, size: number, salt: string, share: number): boolean {
  return quotaMembers(size, salt, share).includes(index);
}

export type BotCosmetics = {
  /** Готовая строка аватара витрины; нет — значит остаётся уровневый номер. */
  avatar?: string;
  /** Идентификатор ауры; нет — значит бот без свечения. */
  aura?: string;
  /**
   * Признак подписки. true ТОЛЬКО у носителя Plus-ауры — иначе клиент её
   * погасит. Не влияет ни на награды, ни на подсчёты: жители и боты не
   * получают итогов недели в любом случае.
   */
  isPremium?: boolean;
};

/**
 * Косметика одного бота. Броски независимы, поэтому «и аватар, и аура»
 * выпадает естественным произведением частот, а не отдельной веткой.
 */
export function botCosmetics(seed: string): BotCosmetics {
  const result: BotCosmetics = {};
  if (unit(seed, 'has-shop-avatar') < BOT_SHOWCASE_AVATAR_CHANCE) {
    result.avatar = botShowcaseAvatarValue(seed);
  }
  if (unit(seed, 'has-aura') < BOT_AURA_CHANCE) {
    if (unit(seed, 'aura-plus') < BOT_PLUS_AURA_SHARE) {
      result.aura = PLUS_BOT_AURA_ID;
      result.isPremium = true;
    } else {
      result.aura = pick(BOT_SHOWCASE_AURA_IDS, unit(seed, 'aura-pick'));
    }
  }
  return result;
}
