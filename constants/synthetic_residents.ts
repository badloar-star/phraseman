// ═══════════════════════════════════════════════════════════════════════════
// synthetic_residents.ts (клиент) — зеркало серверного реестра персонажей.
//
// зачем (владелец, 2026-08-04): «будет неправильно, если они будут замечены в
// двух разных местах с разным опытом и уровнем и аватаром». Опыт персонажа —
// чистая функция времени, поэтому клиент считает его сам, ровно теми же
// формулами, что и сервер. Ничего не хранится и не запрашивается: карточка
// соперника открывается мгновенно и без единого чтения Firestore.
//
// ИСТОЧНИК ПРАВДЫ — functions/src/synthetic_residents.ts. Этот файл обязан
// повторять его формулы байт в байт. Расхождение = один и тот же персонаж
// показывает разный уровень в лиге и в турнире, то есть ровно тот баг, ради
// которого реестр и заводился. Страж tests/synthetic_residents_mirror.test.ts
// сверяет обе копии и ломает сборку при расхождении.
// ═══════════════════════════════════════════════════════════════════════════

/** Общая эпоха отсчёта. */
export const RESIDENT_EPOCH_MS = Date.UTC(2026, 7, 4);

/**
 * Разброс «дат регистрации» и срок жизни поколения — зеркало сервера.
 * Каждый персонаж начинает с 0 опыта, но в свой день; отжив своё, уступает
 * слот новичку. Без этого комната вырождается: сначала в толпу новичков
 * 1 уровня, потом (через ~2 года) в толпу ветеранов 50-го.
 */
const RESIDENT_SIGNUP_SPREAD_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const RESIDENT_LIFESPAN_MIN_MS = 400 * 24 * 60 * 60 * 1000;
const RESIDENT_LIFESPAN_MAX_MS = 1100 * 24 * 60 * 60 * 1000;

/** Шаг начисления — раз в 6 часов. */
export const RESIDENT_TICK_MS = 60 * 60 * 1000;

// зачем (владелец, 2026-08-26: «боты не должны так много рун набирать, делай
// чтобы было реалистично как реальный человек в день от 15 до 1400 рандомно»):
// прежние границы давали 168..2128 за сутки при медиане 610 — комната из
// синтетических соперников набирала больше живого игрока и обгонять её было
// невозможно. Новые значения дают сутки 14..1431 при медиане ~185: пол и
// потолок владельца выдержаны, а форма кривой человеческая (см. ниже про
// RESIDENT_PACE_EXP).
export const RESIDENT_TICK_MIN_XP = 2;
export const RESIDENT_TICK_MAX_XP = 40;

/** Доля тиков, в которые персонаж «не заходил». */
export const RESIDENT_IDLE_CHANCE = 0.64;

/** Потолок уровня — как у живого игрока. */
export const RESIDENT_MAX_LEVEL = 50;

/** Постоянный «характер» персонажа: без него все сходятся к одному уровню. */
const RESIDENT_PACE_MIN = 0.55;
const RESIDENT_PACE_MAX = 4.2;

/**
 * Перекос популяции: чем больше показатель, тем больше слабых персонажей и тем
 * реже встречается гриндер у потолка. Владелец 2026-08-26 выбрал форму «как у
 * людей: большинство слабые» — 2.9 даёт медиану ~185 рун в сутки при хвосте до
 * 1400 (было 1.7: медиана 610, хвост 2128).
 *
 * Константа именованная, а не число в формуле, специально: зеркало
 * constants/synthetic_residents.ts обязано совпадать, и сторож
 * tests/synthetic_residents_mirror.test.ts это проверяет.
 */
export const RESIDENT_PACE_EXP = 2.9;

/** FNV-1a — зеркало серверного residentHash. */
export function residentHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function residentPace(index: number): number {
  const draw = residentHash(`${index}:pace`) / 4294967296;
  return RESIDENT_PACE_MIN + (RESIDENT_PACE_MAX - RESIDENT_PACE_MIN) * Math.pow(draw, RESIDENT_PACE_EXP);
}

function residentTickRandom(index: number, tick: number, stream: string): number {
  let h = residentHash(`${index}:${tick}:${stream}`);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function residentTickGain(index: number, tick: number): number {
  if (residentTickRandom(index, tick, 'idle') < RESIDENT_IDLE_CHANCE) return 0;
  const draw = residentTickRandom(index, tick, 'gain');
  const base = RESIDENT_TICK_MIN_XP + (RESIDENT_TICK_MAX_XP - RESIDENT_TICK_MIN_XP) * draw;
  return Math.max(1, Math.round(base * residentPace(index)));
}

function residentLifespanMs(index: number, generation: number): number {
  const draw = residentHash(`${index}:${generation}:lifespan`) / 4294967296;
  return RESIDENT_LIFESPAN_MIN_MS
    + Math.round((RESIDENT_LIFESPAN_MAX_MS - RESIDENT_LIFESPAN_MIN_MS) * draw);
}

function residentFirstSignupMs(index: number): number {
  const draw = residentHash(`${index}:signup`) / 4294967296;
  return RESIDENT_EPOCH_MS - Math.round(RESIDENT_SIGNUP_SPREAD_MS * Math.pow(draw, 1.6));
}

/** Какое поколение занимает слот сейчас — зеркало сервера. */
export function residentGeneration(
  index: number,
  nowMs = RESIDENT_EPOCH_MS,
): { generation: number; signupMs: number } {
  let signupMs = residentFirstSignupMs(index);
  for (let generation = 0; generation < 64; generation++) {
    const ends = signupMs + residentLifespanMs(index, generation);
    if (ends > nowMs) return { generation, signupMs };
    signupMs = ends;
  }
  return { generation: 63, signupMs };
}

export function residentSignupMs(index: number, nowMs = RESIDENT_EPOCH_MS): number {
  return residentGeneration(index, nowMs).signupMs;
}

export function residentTicksElapsed(nowMs: number, index = 0): number {
  const start = residentSignupMs(index, nowMs);
  if (nowMs <= start) return 0;
  return Math.floor((nowMs - start) / RESIDENT_TICK_MS);
}

export function residentTotalXpAt(index: number, nowMs: number): number {
  const { generation, signupMs } = residentGeneration(index, nowMs);
  if (nowMs <= signupMs) return 0;
  const ticks = Math.floor((nowMs - signupMs) / RESIDENT_TICK_MS);
  let total = 0;
  for (let tick = 0; tick < ticks; tick++) {
    total += residentTickGain(index * 64 + generation, tick);
  }
  return total;
}

// Формула уровня — зеркало constants/theme.ts (XP_BASE/XP_EXP). Дублируется
// намеренно, чтобы реестр не зависел от порядка инициализации темы.
const XP_BASE = 400;
const XP_EXP = 1.82;

function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(level - 1, XP_EXP));
}

export function residentLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  let level = 1;
  while (level < RESIDENT_MAX_LEVEL && totalXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

/** Прирост опыта за период — зеркало сервера (учитывает смену поколения). */
export function residentXpGainedBetween(index: number, fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  const from = residentGeneration(index, fromMs);
  const to = residentGeneration(index, toMs);
  if (from.generation !== to.generation) return residentTotalXpAt(index, toMs);
  const seed = index * 64 + to.generation;
  const fromTick = Math.max(0, Math.floor((fromMs - to.signupMs) / RESIDENT_TICK_MS));
  const toTick = Math.max(0, Math.floor((toMs - to.signupMs) / RESIDENT_TICK_MS));
  let total = 0;
  for (let tick = fromTick; tick < toTick; tick++) {
    total += residentTickGain(seed, tick);
  }
  return total;
}

export function residentAvatar(level: number): string {
  return String(Math.max(1, Math.min(RESIDENT_MAX_LEVEL, level)));
}

/**
 * Опыт, соответствующий уровню персонажа.
 *
 * зачем (владелец 2026-08-04): в турнире до клиента доезжает только АВАТАР
 * персонажа (он же его уровень) — индекс в реестре не передаётся намеренно,
 * иначе поле, которое есть лишь у ботов, выдавало бы бота с головой. По
 * уровню опыт восстанавливается однозначно: берём начало уровня и добавляем
 * стабильную долю внутри него. Это ровно тот диапазон опыта, который тот же
 * персонаж показывает в лиге — расхождения «разный опыт в двух местах» нет.
 */
export function residentXpForLevel(level: number, seed: string): number {
  const safeLevel = Math.max(1, Math.min(RESIDENT_MAX_LEVEL, Math.trunc(level)));
  const start = totalXpForLevel(safeLevel);
  const next = totalXpForLevel(Math.min(RESIDENT_MAX_LEVEL + 1, safeLevel + 1));
  const span = Math.max(1, next - start);
  // Доля внутри уровня 0..85%: цифра не выглядит «ровной», но и не перескакивает
  // на следующий уровень, из-за чего уровень и опыт разошлись бы.
  const progress = (residentHash(`${seed}:xp`) % 850) / 1000;
  return start + Math.floor(span * progress);
}

// ── Серия дней ──────────────────────────────────────────────────────────────
// Зеркало functions/src/synthetic_residents.ts — держать в синхроне: житель
// лиги (сервер) и бот турнира (клиент) обязаны показывать одну и ту же серию.

/** Сутки в миллисекундах — шаг роста серии. */
const RESIDENT_DAY_MS = 24 * 60 * 60 * 1000;

/** Потолок серии. Дальше персонаж всё равно сбросится — это лишь защита. */
export const RESIDENT_STREAK_MAX = 60;

/** Больше трёх сбросов в календарный месяц персонаж не делает (владелец). */
export const RESIDENT_STREAK_MAX_RESETS_PER_MONTH = 3;

/** Номер календарного месяца от эпохи 1970 — общий счётчик для UTC-даты. */
function monthIndexOf(ms: number): number {
  const d = new Date(ms);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** Первый день (в днях от 1970) указанного календарного месяца. */
function monthStartDay(monthIndex: number): number {
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex - year * 12;
  return Math.floor(Date.UTC(year, month, 1) / RESIDENT_DAY_MS);
}

/** Сколько дней в этом календарном месяце. */
function daysInMonth(monthIndex: number): number {
  return monthStartDay(monthIndex + 1) - monthStartDay(monthIndex);
}

/** Дни этого месяца, в которые персонаж срывает серию (0..3 штуки). */
function residentResetDaysInMonth(index: number, monthIndex: number): number[] {
  const total = daysInMonth(monthIndex);
  const start = monthStartDay(monthIndex);
  const seed = residentHash(`${index}:${monthIndex}:resets`);
  const count = seed % (RESIDENT_STREAK_MAX_RESETS_PER_MONTH + 1);
  // Срывы разносим по полосам месяца — иначе на стыке месяцев они вставали
  // вплотную и серия не успевала отрасти (см. комментарий в серверной копии).
  const bandSize = total / RESIDENT_STREAK_MAX_RESETS_PER_MONTH;
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    const bandStart = Math.floor(i * bandSize);
    const bandEnd = Math.min(total, Math.floor((i + 1) * bandSize));
    const span = Math.max(1, bandEnd - bandStart);
    const dayOfMonth = bandStart + (residentHash(`${index}:${monthIndex}:reset:${i}`) % span);
    const day = start + Math.min(total - 1, dayOfMonth);
    if (!days.includes(day)) days.push(day);
  }
  return days.sort((a, b) => a - b);
}

/**
 * Серия дней персонажа на момент nowMs — ЖИВАЯ величина, а не константа.
 *
 * зачем (владелец 2026-08-04): «у всех ботов цепочка всегда 0 — исправь, чтобы
 * показывалась рандомно, в рандомные дни сбрасывалась на 0 и дальше +1 в день,
 * не более 3 сбросов в месяц». Серия = дни с последнего срыва: растёт сама по
 * времени, ноль виден ровно один день (день срыва). Хранить нечего — это
 * чистая функция, все зрители видят одно и то же.
 */
export function residentStreakAt(index: number, nowMs: number, signupMs: number): number {
  const today = Math.floor(nowMs / RESIDENT_DAY_MS);
  const signupDay = Math.floor(signupMs / RESIDENT_DAY_MS);
  const earliestDay = Math.max(signupDay, today - RESIDENT_STREAK_MAX);
  let lastResetDay = -1;
  const fromMonth = monthIndexOf(earliestDay * RESIDENT_DAY_MS);
  const toMonth = monthIndexOf(today * RESIDENT_DAY_MS);
  for (let month = fromMonth; month <= toMonth; month++) {
    for (const day of residentResetDaysInMonth(index, month)) {
      if (day >= earliestDay && day <= today && day > lastResetDay) lastResetDay = day;
    }
  }
  if (lastResetDay === today) return 0;
  const since = lastResetDay >= 0 ? today - lastResetDay : today - signupDay;
  return Math.max(0, Math.min(RESIDENT_STREAK_MAX, since));
}

/** Базовое число лайков — зеркало серверного residentBaseLikes. */
export function residentBaseLikes(totalXp: number): number {
  return Math.floor(totalXp / 3000);
}

export type ResidentProfile = {
  index: number;
  totalXp: number;
  level: number;
  avatar: string;
  streak: number;
  baseLikes: number;
};

/**
 * Профиль персонажа на момент nowMs — без имени: имя клиент всегда берёт из
 * документа комнаты (там оно уже есть), а корпус имён на клиенте не нужен.
 */
export function residentProfileAt(index: number, nowMs: number): ResidentProfile {
  const { generation, signupMs } = residentGeneration(index, nowMs);
  const totalXp = residentTotalXpAt(index, nowMs);
  const level = residentLevelFromXp(totalXp);
  return {
    index,
    totalXp,
    level,
    avatar: residentAvatar(level),
    streak: residentStreakAt(index * 64 + generation, nowMs, signupMs),
    baseLikes: residentBaseLikes(totalXp),
  };
}
