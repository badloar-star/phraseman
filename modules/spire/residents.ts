/**
 * Клиентская копия формулы ботов Шпиля (PM-277, T25/T26, D56).
 *
 * зачем: боты комнаты считаются НА УСТРОЙСТВЕ из зерна комнаты — 0 чтений и
 * 0 записей Firestore, без часового крона (владелец принял D56). Документ
 * комнаты spire_groups/{groupId} несёт только живых (members) и лица ботов
 * (roster, пишутся один раз при создании); ступени ботов — эта формула.
 *
 * СИНХРОНИЗАЦИЯ: серверный оригинал — functions/src/spire_residents.ts
 * (functions/tsconfig.json ограничен src, общий модуль невозможен — та же
 * граница, что у modules/spire/config_contract.ts). Всё ниже, до блока
 * «Клиентское», ОБЯЗАНО совпадать с сервером символ в символ: итог недели
 * (PM-276) считает тех же ботов той же формулой, расхождение = разные места
 * на экране и в итоге. Сторож: tests/spire_residents_mirror_contract.test.ts.
 *
 * Как пользоваться экраном (PM-279): считать spireRoomResidents один раз на
 * смену часа (результат внутри часа не меняется), в live передавать чужих
 * живых из кэша комнаты + СВОИ локальные ступени — тогда боты уступают зону
 * мгновенно, без сети.
 */

/** T2/§4.5: комната Шпиля — 30 мест. */
export const SPIRE_ROOM_SIZE = 30;

/**
 * Префикс uid бота совместим с уже существующим клиентским фильтром `res_*`:
 * бот Шпиля не раскрывает новых полей профиля (T26).
 */
export const SPIRE_RESIDENT_UID_PREFIX = 'res_';

/** Доля зоны повышения/понижения — правило лиги без изменений (§4.5). */
export const SPIRE_ZONE_RATIO = 0.15;

/**
 * «Средний» бот за ПОЛНУЮ неделю проходит 10..40 ступеней (этажи 2–5).
 * зачем: TOWER.md §4.6 — средняя активная неделя живого 5–6 этажей (35–45
 * ступеней). Бот ниже середины активного живого, но не нулевой — комната
 * выглядит живой, а активный игрок стабильно обгоняет ботов.
 */
export const SPIRE_RESIDENT_WEEK_STEPS_MIN = 10;
export const SPIRE_RESIDENT_WEEK_STEPS_MAX = 40;

/** Бот «спит» с 01:00 до 08:00 своего местного времени — как живые люди. */
const SLEEP_FROM_LOCAL_HOUR = 1;
const SLEEP_TO_LOCAL_HOUR = 8;
const AWAKE_HOURS_PER_DAY = 24 - (SLEEP_TO_LOCAL_HOUR - SLEEP_FROM_LOCAL_HOUR);
/** Смещения часовых поясов ботов: основная аудитория UTC+0..+5. */
const TZ_OFFSET_MIN = 0;
const TZ_OFFSET_SPAN = 6;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/** Среднее время бота на ступень (для ничьих по totalMs), 80..150 с. */
const STEP_MS_MIN = 80_000;
const STEP_MS_SPAN = 70_000;

export type SpireResidentTuning = Readonly<{
  /** config/spire_v1.residents.targetZoneMarginSteps — зазор до зон, ступеней. */
  targetZoneMarginSteps: number;
  /** config/spire_v1.residents.maxStepsPerHour — потолок ступеней бота за час. */
  maxStepsPerHour: number;
}>;

export type SpireRosterEntry = Readonly<{
  uid: string;
  slot: number;
  name: string;
  avatar: string | null;
  aura: string | null;
  isPremium: boolean;
  streak: number;
  /** Ранг монеты 0..19 лица бота (13.10); нет — базовая монета. */
  coinRank?: number | null;
}>;

export type SpireResidentState = Readonly<{
  uid: string;
  slot: number;
  steps: number;
  /** Когда бот добрался до текущей ступени — для ничьих (§4.5). 0 = ещё не играл. */
  reachedAtMs: number;
  totalMs: number;
}>;

export type SpireLiveStanding = Readonly<{
  uid: string;
  steps: number;
}>;

// ── Время недели и когорта (T24) ─────────────────────────────────────────────

/** Начало ISO-недели (понедельник 00:00 UTC) — то же правило недели, что у лиги. */
export function spireWeekStartMs(nowMs: number): number {
  const now = new Date(nowMs);
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday);
}

/**
 * T24: день входа в неделю, 0 = понедельник … 6 = воскресенье (UTC — как
 * граница недели лиги). Пришедшие в среду не попадают к понедельничным.
 */
export function spireCohortDay(nowMs: number): number {
  const day = Math.floor((nowMs - spireWeekStartMs(nowMs)) / DAY_MS);
  return Math.max(0, Math.min(6, day));
}

/** Начало дня когорты — от него бот «играет», как и живые этой комнаты. */
export function spireCohortStartMs(weekStartMs: number, cohortDay: number): number {
  const day = Math.max(0, Math.min(6, Math.trunc(cohortDay) || 0));
  return weekStartMs + day * DAY_MS;
}

// ── Детерминированный шум ────────────────────────────────────────────────────

/** FNV-1a — тот же, что residentHash; копия в modules/spire/residents.ts. */
export function spireSeedHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Смешивание двух uint32 в число 0..1 без строк — формула крутится до
 * 168 часов × 29 ботов на каждый пересчёт комнаты на устройстве.
 */
function mixUnit(a: number, b: number): number {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Зерно бота: комната + слот. groupId уже несёт неделю, язык и шпиль. */
export function spireResidentSeed(groupId: string, slot: number): number {
  return spireSeedHash(`${groupId}:spire-resident:${slot}`);
}

// ── Сырая формула ступеней бота ──────────────────────────────────────────────

function positiveInt(value: number, fallback: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Ступени бота БЕЗ учёта зон — «как он сыграл бы сам по себе».
 *
 * Модель: неделя режется на часы от начала когорты. Бот бодрствует 17 часов
 * в сутки своего пояса; в бодрый час он с небольшой вероятностью «заходит» и
 * проходит 1..maxStepsPerHour ступеней. Вероятность подобрана так, чтобы за
 * полную неделю вышла его личная цель 10..40 (средний, T25).
 *
 * Считаются только ЗАВЕРШЁННЫЕ часы: число не дёргается внутри часа и
 * никогда не убывает со временем (монотонность — иначе бот выдал бы себя).
 */
export function spireResidentRawState(
  seed: number,
  cohortStartMs: number,
  weekStartMs: number,
  nowMs: number,
  maxStepsPerHour: number,
): { steps: number; reachedAtMs: number; totalMs: number } {
  const maxPerHour = positiveInt(maxStepsPerHour, 6);
  const weekEndMs = weekStartMs + WEEK_MS;
  const windowHours = Math.max(0, Math.floor((weekEndMs - cohortStartMs) / HOUR_MS));
  const elapsedHours = Math.max(
    0,
    Math.min(windowHours, Math.floor((Math.min(nowMs, weekEndMs) - cohortStartMs) / HOUR_MS)),
  );
  const stepMs = STEP_MS_MIN + Math.floor(mixUnit(seed, 0x51ed) * STEP_MS_SPAN);
  if (elapsedHours <= 0) return { steps: 0, reachedAtMs: 0, totalMs: 0 };

  const weekTarget = SPIRE_RESIDENT_WEEK_STEPS_MIN
    + Math.floor(mixUnit(seed, 0x7a11) * (SPIRE_RESIDENT_WEEK_STEPS_MAX - SPIRE_RESIDENT_WEEK_STEPS_MIN + 1));
  const tzOffset = TZ_OFFSET_MIN + Math.floor(mixUnit(seed, 0x2c0f) * TZ_OFFSET_SPAN);
  const meanGain = (1 + maxPerHour) / 2;
  // Цель задана на полную неделю; в позднюю когорту бот проходит долю,
  // пропорциональную оставшемуся времени — как и живые поздние игроки.
  const awakeHoursFullWeek = 7 * AWAKE_HOURS_PER_DAY;
  const activeChance = Math.min(0.9, weekTarget / (awakeHoursFullWeek * meanGain));

  let steps = 0;
  let lastActiveHour = -1;
  for (let h = 0; h < elapsedHours; h++) {
    const utcHour = new Date(cohortStartMs + h * HOUR_MS).getUTCHours();
    const localHour = (utcHour + tzOffset) % 24;
    if (localHour >= SLEEP_FROM_LOCAL_HOUR && localHour < SLEEP_TO_LOCAL_HOUR) continue;
    if (mixUnit(seed, h * 2 + 1) >= activeChance) continue;
    const gain = Math.min(maxPerHour, 1 + Math.floor(mixUnit(seed, h * 2 + 2) * maxPerHour));
    steps += gain;
    lastActiveHour = h;
  }
  if (steps === 0) return { steps: 0, reachedAtMs: 0, totalMs: 0 };
  // Минута внутри часа — из зерна, чтобы боты не «добирались» ровно в :00.
  const minute = Math.floor(mixUnit(seed, lastActiveHour * 2 + 3) * 59) + 1;
  return {
    steps,
    reachedAtMs: cohortStartMs + lastActiveHour * HOUR_MS + minute * 60_000,
    totalMs: steps * stepMs,
  };
}

// ── Зоны по живым (T25) ──────────────────────────────────────────────────────

/**
 * Размер зоны повышения/понижения. Аргумент — число ЖИВЫХ в комнате.
 *
 * зачем (владелец 2026-09-24, D59 — ответ на О-277-1): «одинокий живой в
 * комнате из 29 ботов может повышаться, как в лиге: боты считаются в общем
 * числе для определения зоны, но сами не получают повышение/награду».
 * Поэтому база процента — вся видимая комната (живые + добивка ботами до 30),
 * как getLeagueResultZoneSize в league_finalize_cron.ts считал от total с
 * жителями; а заполняют зону только живые — ранги считаются среди живых
 * (spireResidentBounds здесь, итог недели spire_finalize_core.ts). В полной
 * комнате это 15% от 30 = 5 мест. Пока живых нет — зон нет.
 * Итог недели (PM-276) обязан брать ЭТУ функцию, а не свою.
 */
export function spireLiveZoneSize(liveCount: number): number {
  const n = Math.max(0, Math.trunc(liveCount) || 0);
  if (n < 1) return 0;
  return Math.max(1, Math.round(n * SPIRE_ZONE_RATIO));
}

export type SpireResidentBounds = Readonly<{
  /** Бот не ниже этого числа ступеней (выше зоны понижения). */
  lo: number;
  /** Бот не выше этого числа ступеней (ниже зоны повышения); null — зоны нет. */
  hi: number | null;
}>;

/**
 * Коридор, в котором бот не касается ни одной зоны.
 *
 * Зоны — строго по правилам §4.5 (сторож guard_league_demotion), но на живых:
 * повышение — ранг ≤ зоны и ≥1 ступени; понижение — нижняя зона и ВСЕ с нулём,
 * но только если хоть кто-то из живых играл.
 */
export function spireResidentBounds(
  live: readonly SpireLiveStanding[],
  marginSteps: number,
): SpireResidentBounds {
  const margin = positiveInt(marginSteps, 1);
  const steps = live.map((m) => Math.max(0, Math.trunc(Number(m.steps)) || 0));
  const zone = spireLiveZoneSize(steps.length);
  const someoneScored = steps.some((s) => s > 0);

  let promotedMin: number | null = null;
  let demotedMax: number | null = null;
  for (const s of steps) {
    const rank = 1 + steps.filter((o) => o > s).length;
    const bottomRank = 1 + steps.filter((o) => o < s).length;
    const promoted = s > 0 && zone > 0 && rank <= zone;
    if (promoted) {
      promotedMin = promotedMin === null ? s : Math.min(promotedMin, s);
      continue;
    }
    const inZeroZone = s === 0 && someoneScored;
    const demoted = someoneScored && (inZeroZone || (zone > 0 && bottomRank <= zone));
    if (demoted) demotedMax = demotedMax === null ? s : Math.max(demotedMax, s);
  }

  const hi = promotedMin === null ? null : Math.max(0, promotedMin - margin);
  let lo = demotedMax === null ? 0 : demotedMax + margin;
  // зачем: если коридора нет (живые стоят плотно), важнее T25 «бот не может
  // отнять у человека повышение» — поэтому уступает нижняя граница.
  if (hi !== null && lo > hi) lo = hi;
  return { lo, hi };
}

// ── Комната целиком ──────────────────────────────────────────────────────────

/** Жители отключены: во всех комнатах показываются только реальные игроки. */
export function spireVisibleResidentCount(_liveCount: number): number {
  return 0;
}

export type SpireRoomResidentsInput = Readonly<{
  groupId: string;
  weekStartMs: number;
  cohortDay: number;
  nowMs: number;
  /** Живые участники комнаты (без скрытых дублей и без ботов). Свои ступени — локальные. */
  live: readonly SpireLiveStanding[];
  tuning: SpireResidentTuning;
}>;

/**
 * Ступени всех видимых ботов комнаты на момент nowMs. 0 чтений, 0 записей.
 *
 * Если сырая формула залезает выше коридора — все боты СЖИМАЮТСЯ пропорционально
 * (порядок между ними сохраняется), а не срезаются в одно число: 20 ботов с
 * одинаковыми ступенями выдали бы себя мгновенно (T26).
 * ОТКРЫТЫЙ ВОПРОС О-277-2: сжатие может заметно опустить чужие цифры в момент,
 * когда живой впервые входит в зону повышения (см. evidence).
 */
export function spireRoomResidents(input: SpireRoomResidentsInput): SpireResidentState[] {
  void input;
  return [];
}

// ── Клиентское ───────────────────────────────────────────────────────────────

export function spireResidentUid(slot: number): string {
  return `${SPIRE_RESIDENT_UID_PREFIX}${String(slot).padStart(2, '0')}`;
}

/** Бот ли это — по префиксу uid, как у жителей Шпиля (app/spire engine.ts). */
export function isSpireResidentUid(uid: string): boolean {
  return typeof uid === 'string' && uid.startsWith(SPIRE_RESIDENT_UID_PREFIX);
}

/** Строка бота для экрана: лицо из roster + ступени из формулы. */
export type SpireResidentRow = SpireRosterEntry & SpireResidentState;

/**
 * Склеивает лица (roster из документа комнаты) и ступени (формула). Бот без
 * лица в roster не показывается — лучше на одного соседа меньше, чем пустая
 * строка, выдающая бота (T26).
 */
export function spireResidentRows(
  roster: readonly SpireRosterEntry[] | undefined | null,
  states: readonly SpireResidentState[],
): SpireResidentRow[] {
  const bySlot = new Map<number, SpireRosterEntry>();
  for (const entry of roster ?? []) {
    if (entry && Number.isInteger(entry.slot)) bySlot.set(entry.slot, entry);
  }
  const rows: SpireResidentRow[] = [];
  for (const state of states) {
    const face = bySlot.get(state.slot);
    if (!face) continue;
    rows.push({ ...face, ...state, uid: state.uid });
  }
  return rows;
}
