// ═══════════════════════════════════════════════════════════════════════════
// synthetic_residents.ts — ЕДИНЫЙ реестр синтетических персонажей приложения.
//
// зачем (владелец, 2026-08-04): персонажи-наполнители жили в двух местах и
// противоречили друг другу. Бот турнира получал уровень из номера аватара, а
// опыт подгонялся под уровень и НИКОГДА не рос. Житель лиги (снесённая версия,
// league_ghosts.ts) получал случайный опыт до 88 000 сразу с потолка. Имена и
// там и там брались из одного корпуса REDDIT_BOT_NAMES — то есть один и тот же
// ник мог показать РАЗНЫЙ опыт, уровень и аватар в турнире и в лиге. Владелец
// это заметил: «будет неправильно, если они будут замечены в двух разных
// местах с разным опытом и уровнем и аватаром».
//
// Теперь источник правды один. Персонаж определяется ТОЛЬКО своим индексом в
// корпусе имён: имя, темп роста, опыт на момент времени, уровень и аватар —
// всё выводится здесь. И лига, и турнир читают отсюда.
//
// Правила роста (решения владельца 2026-08-04):
//   • все стартуют с 0 опыта и 1 уровня от общей эпохи запуска фичи;
//   • каждые 6 часов прибавка 10..800 XP, но с шансом 50% — ноль (персонаж
//     «не заходил»);
//   • уровень и аватар растут пропорционально опыту по ШТАТНОЙ формуле игры —
//     никаких отдельных шкал, иначе снова разъедется с живыми.
//
// Владелец сначала просил 10..6000 XP за тик. Расчёт показал, что при таком
// темпе ВСЕ персонажи упираются в максимальный 50 уровень за ~2 месяца и
// становятся одинаковыми — комната опять выглядит мёртвой, только наоборот.
// После этого владелец сам выбрал 10..800 с шансом 50% на ноль: 50 уровень
// достигается за ~2 года, разброс уровней в комнате живёт годами.
//
// Детерминизм обязателен: ни одного Math.random. Опыт — чистая функция
// (индекс, время), поэтому все инстансы, все зрители и любые ретраи видят
// одного и того же персонажа одинаково, и его не нужно нигде хранить.
// ═══════════════════════════════════════════════════════════════════════════

import { REDDIT_BOT_NAMES } from './tournament_reddit_bot_names';

/**
 * Общая эпоха отсчёта. Менять нельзя: сдвиг эпохи мгновенно перепишет опыт
 * всех персонажей и владелец увидит, как соседи «похудели».
 */
export const RESIDENT_EPOCH_MS = Date.UTC(2026, 7, 4);

/**
 * Разброс «дат регистрации» персонажей — до 2 лет до эпохи.
 *
 * зачем (замер 2026-08-04): владелец потребовал «все жители должны начать с 0
 * опыта и уровня», и буквальное прочтение — общий старт для всех — даёт в день
 * запуска комнату из 28 ОДИНАКОВЫХ новичков 1 уровня с одинаковым аватаром.
 * Замер: на день 0 уникальных уровней ровно 1. Это выглядит фальшивее, чем
 * пустая комната, и вдобавок роняло страж разнообразия аватаров ботов (28
 * комбинаций вместо требуемых 70).
 *
 * Требование владельца сохранено буквально: КАЖДЫЙ персонаж начинает свою
 * жизнь с 0 опыта и 1 уровня — просто начинает её в свой день, как настоящие
 * люди, которые регистрируются в разное время. Сегодняшняя комната поэтому
 * содержит и новичков, и «старожилов», а не строй клонов.
 */
const RESIDENT_SIGNUP_SPREAD_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/**
 * Через сколько персонаж «уходит» и его место занимает новичок с нуля.
 *
 * зачем (замер 2026-08-04): без обновления состава популяция стареет — через
 * 700 дней замер дал всего 19 уникальных уровней и минимум 32-й, то есть
 * комната снова вырождается, теперь уже в толпу ветеранов. В живом приложении
 * так не бывает: часть людей отваливается, вместо них приходят новые. Срок
 * жизни персонажа детерминирован по индексу, поэтому «поколения» сменяются
 * вразнобой, а не все разом.
 */
const RESIDENT_LIFESPAN_MIN_MS = 400 * 24 * 60 * 60 * 1000;
const RESIDENT_LIFESPAN_MAX_MS = 1100 * 24 * 60 * 60 * 1000;

function residentLifespanMs(index: number, generation: number): number {
  const draw = residentHash(`${index}:${generation}:lifespan`) / 4294967296;
  return RESIDENT_LIFESPAN_MIN_MS
    + Math.round((RESIDENT_LIFESPAN_MAX_MS - RESIDENT_LIFESPAN_MIN_MS) * draw);
}

/** Первая «регистрация» персонажа — база для отсчёта поколений. */
function residentFirstSignupMs(index: number): number {
  const draw = residentHash(`${index}:signup`) / 4294967296;
  // Квадратичный перекос к недавним датам: новичков в приложении всегда
  // больше, чем ветеранов, — так же выглядит и живая база.
  return RESIDENT_EPOCH_MS - Math.round(RESIDENT_SIGNUP_SPREAD_MS * Math.pow(draw, 1.6));
}

/**
 * Момент «регистрации» ТЕКУЩЕГО поколения персонажа — с него он копит опыт
 * с нуля. Пока поколение живо, значение постоянно; когда срок вышел, слот
 * занимает новичок и отсчёт начинается заново.
 */
export function residentSignupMs(index: number, nowMs = RESIDENT_EPOCH_MS): number {
  return residentGeneration(index, nowMs).signupMs;
}

/**
 * Какое поколение персонажа занимает слот сейчас и когда оно «зарегистрировалось».
 * Номер поколения входит в сид опыта и в выбор имени: сменившийся персонаж —
 * это ДРУГОЙ человек с другим ником, а не тот же самый с обнулённым опытом
 * (обнуление на глазах игрока выдало бы подделку).
 */
export function residentGeneration(
  index: number,
  nowMs = RESIDENT_EPOCH_MS,
): { generation: number; signupMs: number } {
  let signupMs = residentFirstSignupMs(index);
  // Поколений за разумный горизонт единицы — цикл дешёвый и точный.
  for (let generation = 0; generation < 64; generation++) {
    const ends = signupMs + residentLifespanMs(index, generation);
    if (ends > nowMs) return { generation, signupMs };
    signupMs = ends;
  }
  return { generation: 63, signupMs };
}

/** Шаг начисления: раз в 6 часов, как просил владелец. */
export const RESIDENT_TICK_MS = 6 * 60 * 60 * 1000;

/** Границы прибавки за один тик — при условии, что персонаж в этот тик «заходил». */
export const RESIDENT_TICK_MIN_XP = 10;
export const RESIDENT_TICK_MAX_XP = 800;

/**
 * Доля тиков, в которые персонаж не занимался вовсе. Владелец: «рандомно с
 * шансом 50% давать 0» — это же и растягивает кривую роста, и делает темп
 * разных персонажей непохожим.
 */
export const RESIDENT_IDLE_CHANCE = 0.5;

/** Потолок уровня: синтетический персонаж не выглядит выше живого максимума. */
export const RESIDENT_MAX_LEVEL = 50;

/**
 * Постоянный «характер» персонажа — множитель темпа, заданный навсегда его
 * индексом.
 *
 * зачем (проверка 2026-08-04): без него закон больших чисел убивал всю затею.
 * Если у всех одинаковое распределение прибавки, то за 90 дней (360 тиков)
 * случайные отклонения усредняются, и ВСЕ персонажи приходят к одному опыту:
 * замер показал уровни 17,17,18,18,18…19 на 28 персонажах — комната выглядела
 * как строй клонов. Множитель растягивает популяцию: ленивый копит втрое
 * медленнее гриндера и через год они всё ещё на разных уровнях.
 */
const RESIDENT_PACE_MIN = 0.35;
const RESIDENT_PACE_MAX = 1.9;

/** Темп конкретного персонажа: постоянен на всю его жизнь. */
export function residentPace(index: number): number {
  const draw = residentHash(`${index}:pace`) / 4294967296;
  // Квадратичный перекос: медленных персонажей больше, чем гриндеров, — как в
  // реальной базе, где активное меньшинство тянет заметно быстрее большинства.
  return RESIDENT_PACE_MIN + (RESIDENT_PACE_MAX - RESIDENT_PACE_MIN) * Math.pow(draw, 1.7);
}

/** Сколько разных персонажей существует всего (размер корпуса имён). */
export const RESIDENT_POPULATION = REDDIT_BOT_NAMES.length;

/** FNV-1a: стабильный хэш строки → uint32. Зеркало клиентского fnv1a. */
export function residentHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Псевдослучайное число 0..1 из пары (индекс персонажа, номер тика).
 * Отдельная чистая функция вместо генератора-с-состоянием: опыт на любой
 * момент времени можно посчитать, не проигрывая всю историю по шагам.
 */
function residentTickRandom(index: number, tick: number, stream: string): number {
  let h = residentHash(`${index}:${tick}:${stream}`);
  // Дополнительное перемешивание — сырой FNV даёт заметные полосы на
  // последовательных tick, а тики у нас идут ровно подряд.
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Прибавка опыта персонажа за конкретный тик (0, если «не заходил»).
 * Базовая прибавка 10..800 масштабируется постоянным темпом персонажа —
 * см. residentPace: без него все персонажи сходятся к одному уровню.
 */
export function residentTickGain(index: number, tick: number): number {
  if (residentTickRandom(index, tick, 'idle') < RESIDENT_IDLE_CHANCE) return 0;
  const draw = residentTickRandom(index, tick, 'gain');
  const base = RESIDENT_TICK_MIN_XP + (RESIDENT_TICK_MAX_XP - RESIDENT_TICK_MIN_XP) * draw;
  return Math.max(1, Math.round(base * residentPace(index)));
}

/**
 * Сколько 6-часовых тиков прожил персонаж к моменту nowMs — считая от его
 * СОБСТВЕННОЙ даты регистрации (см. residentSignupMs).
 * Опыт меняется ступеньками: между тиками документ честно статичен, и
 * пересчёт на клиенте и на сервере совпадает без синхронизации часов.
 */
export function residentTicksElapsed(nowMs: number, index = 0): number {
  const start = residentSignupMs(index, nowMs);
  if (nowMs <= start) return 0;
  return Math.floor((nowMs - start) / RESIDENT_TICK_MS);
}

/**
 * Суммарный опыт персонажа на момент nowMs.
 *
 * Считается прямым суммированием тиков. Это O(число тиков) — за год около
 * 1460 сложений на персонажа, за 10 лет ~14 600; для крона раз в 6 часов на
 * ≤28 персонажей в комнате это незаметно, а зато формула остаётся честной
 * (каждый тик реально свой) и совпадает байт-в-байт с клиентской копией.
 */
export function residentTotalXpAt(index: number, nowMs: number): number {
  const { generation, signupMs } = residentGeneration(index, nowMs);
  if (nowMs <= signupMs) return 0;
  const ticks = Math.floor((nowMs - signupMs) / RESIDENT_TICK_MS);
  let total = 0;
  for (let tick = 0; tick < ticks; tick++) {
    // Поколение входит в сид: сменившийся персонаж живёт своей историей,
    // а не повторяет чужую.
    total += residentTickGain(index * 64 + generation, tick);
  }
  return total;
}

/** Прирост опыта персонажа за последние N миллисекунд (вклад в цель недели). */
export function residentXpGainedBetween(index: number, fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  const from = residentGeneration(index, fromMs);
  const to = residentGeneration(index, toMs);
  // Смена поколения внутри окна: слот занял новичок, и «прирост» старого
  // персонажа считать нельзя — иначе недельные очки ушли бы в минус. Берём
  // весь опыт нового персонажа с момента его регистрации.
  if (from.generation !== to.generation) {
    return residentTotalXpAt(index, toMs);
  }
  const seed = index * 64 + to.generation;
  const fromTick = Math.max(0, Math.floor((fromMs - to.signupMs) / RESIDENT_TICK_MS));
  const toTick = Math.max(0, Math.floor((toMs - to.signupMs) / RESIDENT_TICK_MS));
  let total = 0;
  for (let tick = fromTick; tick < toTick; tick++) {
    total += residentTickGain(seed, tick);
  }
  return total;
}

// ── Уровень: точное зеркало constants/theme.ts ────────────────────────────
// зачем: уровень персонажа обязан считаться ТОЙ ЖЕ формулой, что у живого
// игрока. Иначе при одинаковом опыте у соседей окажутся разные уровни, и
// обман станет виден в первой же комнате. Значения продублированы, потому что
// functions/ и app/ не делят код; страж synthetic_residents_contract.test.ts
// ломает сборку, если константы разъедутся.
const XP_BASE = 400;
const XP_EXP = 1.82;

function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(level - 1, XP_EXP));
}

/** Уровень персонажа по его опыту, с потолком RESIDENT_MAX_LEVEL. */
export function residentLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  let level = 1;
  while (level < RESIDENT_MAX_LEVEL && totalXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

/**
 * Имя персонажа. Индекс — его постоянная личность: имя не меняется никогда,
 * иначе «сосед» будет менять ник между заходами.
 */
/**
 * Сколько имён закреплено за одним слотом. Слот перебирает их по поколениям и
 * никогда не залезает в чужой блок — поэтому двух одинаковых ников в комнате
 * не может быть в принципе.
 *
 * зачем блоки, а не сдвиг (регрессия 2026-08-04): сдвиг всей раскладки на
 * generation × шаг сохраняет уникальность, только если ВСЕ персонажи в одном
 * поколении. Но сроки жизни у них разные, поэтому в один момент времени рядом
 * живут поколения 0..3, раскладки накладываются и появляются двойники — замер
 * дал 184 уникальных имени на 200 слотов. Блоки убирают наложение полностью.
 */
const RESIDENT_NAMES_PER_SLOT = 4;

/** Сколько слотов обслуживает корпус имён при выбранном размере блока. */
export const RESIDENT_SLOT_COUNT = Math.floor(RESIDENT_POPULATION / RESIDENT_NAMES_PER_SLOT);

export function residentName(index: number, nowMs = RESIDENT_EPOCH_MS): string {
  const { generation } = residentGeneration(index, nowMs);
  // Смена поколения = другой человек, значит и другой ник — но строго внутри
  // блока этого слота.
  const slot = ((index % RESIDENT_SLOT_COUNT) + RESIDENT_SLOT_COUNT) % RESIDENT_SLOT_COUNT;
  const withinBlock = generation % RESIDENT_NAMES_PER_SLOT;
  return REDDIT_BOT_NAMES[slot * RESIDENT_NAMES_PER_SLOT + withinBlock];
}

/**
 * Аватар персонажа = номер его уровня. Ровно так это работает у живых игроков
 * (уровневые аватары), поэтому аватар автоматически «растёт» вместе с опытом —
 * требование владельца «их уровень и аватар увеличиваются пропорционально».
 */
export function residentAvatar(level: number): string {
  return String(Math.max(1, Math.min(RESIDENT_MAX_LEVEL, level)));
}

/**
 * Серия дней. Детерминирована по индексу и НЕ растёт бесконечно: у трети
 * персонажей ноль (как у живых), у остальных 1..34 — тот же диапазон, что
 * использовала карточка бота турнира до объединения.
 */
export function residentStreak(index: number): number {
  const hash = residentHash(`${index}:streak`);
  return hash % 100 < 30 ? 0 : 1 + ((hash >>> 7) % 34);
}

export type ResidentProfile = {
  /** Индекс в корпусе — постоянная личность персонажа. */
  index: number;
  name: string;
  totalXp: number;
  level: number;
  avatar: string;
  streak: number;
};

/** Полный профиль персонажа на момент nowMs — единая точка сборки. */
export function residentProfileAt(index: number, nowMs: number): ResidentProfile {
  const { generation } = residentGeneration(index, nowMs);
  const totalXp = residentTotalXpAt(index, nowMs);
  const level = residentLevelFromXp(totalXp);
  return {
    index,
    name: residentName(index, nowMs),
    totalXp,
    level,
    avatar: residentAvatar(level),
    // Серия тоже своя у каждого поколения — иначе новый персонаж унаследовал бы
    // чужой стрик и это не сошлось бы с его нулевым опытом.
    streak: residentStreak(index * 64 + generation),
  };
}
