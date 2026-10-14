// ═══════════════════════════════════════════════════════════
// spire_preview_fixtures.ts — моки состояний Шпиля для DEV-превью (/dev_spire_preview).
//
// зачем (координатор 11.10): Эмулятор и Сверка снимают ВСЕ экраны Шпиля рядом со spire.html, не дожидаясь серверного config.enabled.
// Это чистые данные: ни сети, ни записей, ни реальных людей (имена выдуманные). Файл НЕ импортируется боевым кодом —
// только маршрутом app/dev_spire_preview.tsx (охраняет tests/spire_dev_preview_release_guard.test.mjs).
// ═══════════════════════════════════════════════════════════
import { SPIRE_CONFIG_DEFAULTS, spireBotWeekCoins, type SpireConfigDoc } from '../../modules/spire/config_contract';
import { SPIRE_WEEK_LOCAL_SCHEMA_VERSION, type SpireWeekLocal } from '../../modules/spire/report_queue';
import type { SpireRoomRow } from '../../modules/spire/room_rows';
import type { SpirePackTask } from '../../modules/spire/pack_plan';
import type { SpireStepSession } from '../../app/spire/use_spire_game';
import type { SpireClock, SpireFeedback } from '../../app/spire/use_spire_step_runner';
import type { SpireFriendChip } from './spire_room_types';
import { spireCumulativeSteps, spireCurrentWeekKey, spireFloorOfSteps } from './spire_tower_model';
import type { SpirePreviewGame, SpirePreviewModel } from './spire_preview_context';

export const SPIRE_PREVIEW_STATES = [
  'locked', 'lobby', 'room', 'win', 'summit', 'lose', 'save_failed', 'empty', 'offline', 'weekresult', 'tour', 'all',
  'step_choice', 'step_build', 'step_items', 'step_wrong', 'step_prep',
  // зачем (координатор 14.10, R1_SHOT_LIST «нет пути»): итог недели «остаёшься»/«спускаешься», итог ступени «passed», этаж перед стражем,
  // плашки «задания готовятся»/«нет сети» у кнопки «Подняться» и четыре вида заданий, которых не было в превью.
  'weekresult_stay', 'weekresult_down', 'passed', 'guard', 'block_missing', 'block_offline',
  'step_gap', 'step_odd', 'step_listen_choose', 'step_listen_build',
  // зачем (координатор 12.10, spire-gap-012/013): причины провала «время вышло» и «ступень прервана» (раньше в превью была одна — «сердца»)
  'lose_timeout', 'lose_aborted',
] as const;
export type SpirePreviewState = (typeof SPIRE_PREVIEW_STATES)[number];

export function isSpirePreviewState(value: unknown): value is SpirePreviewState {
  return (SPIRE_PREVIEW_STATES as readonly unknown[]).includes(value);
}

const ENABLED_CONFIG: SpireConfigDoc = { ...SPIRE_CONFIG_DEFAULTS, enabled: true };

// зачем (координатор 15.10, Макеты: кадры spire-007/011/gap-015/018 должны совпасть с образцом «Гранит, этаж 4»): dev-превью принимает `tier=` и `floor=`.
// tier — индекс лиги 0…11 (0 = Гранит; прежнее значение 3 = Нефрит), floor — мой этаж 1…15 (прежнее значение 7). Без параметров всё как раньше.
// steps — число ступеней в карточке итога недели (weekresult*, прежние 58 / 31 / 12); лига итога привязана к tier (см. weekTiers)
// nicks=long — зачем (координатор 13.10): на подиуме три первых места получают длинные ники без пробела («мокрый_асфальт», «Александра», «anna.k-2024») для кадров переноса имени
export type SpirePreviewOverrides = Readonly<{ tier?: number; floor?: number; steps?: number; nicks?: 'long' }>;
export const SPIRE_PREVIEW_LONG_NICKS: readonly string[] = ['мокрый_асфальт', 'Александра', 'anna.k-2024'];
const PREVIEW_BASE_TIER = 3;
const PREVIEW_BASE_FLOOR = 7;
const PREVIEW_SUMMIT_FLOOR = 15;

/** Только целые в допустимом диапазоне; всё остальное игнорируется (с предупреждением в журнале). */
export function parseSpirePreviewOverrides(rawTier: unknown, rawFloor: unknown, rawSteps?: unknown, rawNicks?: unknown): SpirePreviewOverrides {
  const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
  const asInt = (v: unknown, min: number, max: number, name: string): number | undefined => {
    const raw = first(v);
    if (raw === undefined || raw === null || raw === '') return undefined;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    console.warn(`[DEV-STATE] spire_preview override ${name}=${String(raw)} игнорирован: нужно целое ${min}…${max}`); // guard-ok: dev-превью, причина отказа параметра
    return undefined;
  };
  const tier = asInt(rawTier, 0, 11, 'tier');
  const floor = asInt(rawFloor, 1, PREVIEW_SUMMIT_FLOOR, 'floor');
  const steps = asInt(rawSteps, 0, 200, 'steps');
  const nicksRaw = first(rawNicks);
  const nicks = nicksRaw === 'long' ? ('long' as const) : undefined;
  if (nicksRaw !== undefined && nicksRaw !== null && nicksRaw !== '' && nicks === undefined) console.warn(`[DEV-STATE] spire_preview override nicks=${String(nicksRaw)} игнорирован: допустимо long`); // guard-ok: dev-превью, причина отказ
  return { ...(tier === undefined ? {} : { tier }), ...(floor === undefined ? {} : { floor }), ...(steps === undefined ? {} : { steps }), ...(nicks === undefined ? {} : { nicks }) };
}

let activeOverrides: SpirePreviewOverrides = {};
const previewTier = (): number => activeOverrides.tier ?? PREVIEW_BASE_TIER;
/** Лиги карточки итога недели: «поднимаешься» — в tier (из tier−1), «остаёшься» — в tier, «опускаешься» — из tier в tier−1; в Граните (0) спуска и входа «в Гранит» не бывает. */
function weekTiers(kind: 'promoted' | 'stay' | 'demoted'): { prevTier: number; newTier: number } {
  const tier = previewTier();
  if (kind === 'stay') return { prevTier: tier, newTier: tier };
  if (kind === 'promoted') { const newTier = Math.max(1, tier); return { prevTier: newTier - 1, newTier }; }
  const prevTier = Math.max(1, tier);
  return { prevTier, newTier: prevTier - 1 };
}
const previewSteps = (base: number): number => activeOverrides.steps ?? base;

/** Этаж относительно базового 7 (состояние `win` — этаж+1); вершина 15 остаётся вершиной; ниже 1 не бывает. */
const previewFloor = (baseFloor: number): number => {
  if (activeOverrides.floor === undefined || baseFloor >= PREVIEW_SUMMIT_FLOOR) return baseFloor;
  return Math.min(PREVIEW_SUMMIT_FLOOR - 1, Math.max(1, baseFloor + (activeOverrides.floor - PREVIEW_BASE_FLOOR)));
};

function week(baseFloor: number, stepInFloor: number, stepsCleared: number, tier = previewTier()): SpireWeekLocal {
  const now = Date.now();
  const floor = previewFloor(baseFloor);
  return {
    schemaVersion: SPIRE_WEEK_LOCAL_SCHEMA_VERSION,
    weekKey: spireCurrentWeekKey(now),
    lang: 'en',
    tier,
    floor,
    stepInFloor,
    stepsCleared,
    reachedAtMs: now - 3_600_000,
    totalMs: stepsCleared * 52_000,
    packHash: 'preview-pack',
    pending: [],
    attempts: 0,
    lastFlushAttemptAtMs: 0,
    nextAttemptAtMs: 0,
    serverAck: null,
    rejectedTotal: 0,
  };
}

const NAMES = ['Алиса', 'Марк', 'Дарья', 'Ян', 'Соня', 'Артём', 'Лиза', 'Глеб', 'Вера', 'Тимур', 'Ника', 'Руслан', 'Мира', 'Лев', 'Полина', 'Егор', 'Ася', 'Богдан', 'Алёна', 'Роман', 'Злата', 'Фёдор', 'Кира', 'Илья', 'Тая', 'Макар', 'Эля', 'Платон', 'Нина'];

// зачем (владелец 13.10, «должно показывать аватары ников — монеты рангов»): у участников превью разные ранги монет (0…19), как у живой комнаты в 30 человек; у части ранга нет (null → базовая монета)
const PREVIEW_COIN_LEVELS = [3, 7, 0, 12, 5, null, 9, 1, 15, 4, 2, 8, null, 6, 11, 0, 3, 18, 5, 2, 7, 10, null, 1, 4, 13, 6, 0, 9] as const;

// зачем (приоритет владельца 13.10, «кто с тобой на этаже, кто выше и кто ниже», spire.html mainScreen): соперники расставлены ВОКРУГ этажа игрока — выше, на нём и ниже, а не все выше.
// Раньше шли от 62 ступеней вниз (этажи 4…8), и при моём этаже 4 никого ниже не было. Смещения — в этажах относительно моего; ниже 1 и выше 15 прижимаются.
const RIVAL_FLOOR_OFFSETS = [4, 3, 3, 2, 2, 1, 1, 0, 0, -1, -2, -3, 6, 5, 4, 3, 2, 1, 0, 0, -1, -1, -2, -3, 7, 5, 2, 0, -2] as const;

function rows(mySteps: number, count = 12, aroundFloor?: number): readonly SpireRoomRow[] {
  const now = Date.now();
  const myFloor = aroundFloor ?? Math.min(spireFloorOfSteps(mySteps), PREVIEW_SUMMIT_FLOOR);
  const list: SpireRoomRow[] = NAMES.slice(0, count - 1).map((name, i) => {
    const floor = Math.min(PREVIEW_SUMMIT_FLOOR, Math.max(1, myFloor + RIVAL_FLOOR_OFFSETS[i % RIVAL_FLOOR_OFFSETS.length]));
    const steps = spireCumulativeSteps(floor - 1) + 1 + (i % 2); // начало этажа + 0…1 ступень
    return { uid: `preview-${i}`, name, steps, reachedAtMs: now - (i + 1) * 900_000, isMe: false, coinRank: PREVIEW_COIN_LEVELS[i % PREVIEW_COIN_LEVELS.length], weekCoins: spireBotWeekCoins(steps) };
  });
  // зачем (координатор 14.10, D162): монеты недели превью — по формуле ботов (30 за ступень), чтобы при rankBy=coins подиум показывал «8 511», а не нули
  list.push({ uid: 'preview-me', name: 'Ты', steps: mySteps, reachedAtMs: now - 120_000, isMe: true, weekCoins: spireBotWeekCoins(mySteps) });
  const sorted = list.sort((a, b) => b.steps - a.steps || a.reachedAtMs - b.reachedAtMs);
  if (activeOverrides.nicks !== 'long') return sorted;
  // nicks=long: длинные ники получают первые три места подиума (себя не переименовываем)
  let k = 0;
  return sorted.map((r, i) => (r.isMe || i >= 3 || k >= SPIRE_PREVIEW_LONG_NICKS.length ? r : { ...r, name: SPIRE_PREVIEW_LONG_NICKS[k++] }));
}

const FRIENDS: readonly SpireFriendChip[] = [
  { uid: 'preview-f1', name: 'Алиса', coinRank: 6, tier: 4 },
  { uid: 'preview-f2', name: 'Марк', coinRank: 3, tier: 2 },
  { uid: 'preview-f3', name: 'Дарья', coinRank: null, tier: null },
];

const noop = (): void => undefined;
const noopAsync = async (): Promise<void> => undefined;

function game(over: Partial<SpirePreviewGame> = {}): SpirePreviewGame {
  return {
    live: true, uid: null, stableId: null, roomLoad: null, rows: null, myPlace: null, tier: previewTier(), friends: [], weekResult: null,
    dismissWeekResult: noop, refreshFriends: noopAsync, session: null,
    // зачем (Сверка spire-005, поручение координатора 15.10): в боевом useSpireGame pending === null, пока шаг не ждёт; без этих полей в превью pending был undefined, и
    // climbReady (…&& pending === null) был ложным во ВСЕХ состояниях — «Подняться» рисовалась неактивной даже при живой комнате.
    pending: null, cancelPendingStep: noop,
    starting: false, startBlock: null, startStep: noopAsync, onStepFinish: noop, onStepAbort: noop,
    outcome: null, dismissOutcome: noop,
    ...over,
  } as SpirePreviewGame;
}

function report(w: SpireWeekLocal, outcome: 'passed' | 'failed', failReason: 'hearts' | 'timeout' | 'backed_out' | null) {
  return {
    reportId: 'preview-report', weekKey: w.weekKey, tier: w.tier, outcome, durationMs: 41_000, completedAtMs: Date.now(), packHash: w.packHash,
    floor: w.floor, stepInFloor: w.stepInFloor, failReason,
  } as const;
}

function outcome(kind: 'passed' | 'floor' | 'summit' | 'failed' | 'save_failed', w: SpireWeekLocal, over: { errors?: number; failReason?: 'hearts' | 'timeout' | 'backed_out' | null } = {}) {
  const failed = kind === 'failed' || kind === 'save_failed';
  const failReason = over.failReason ?? (kind === 'failed' ? 'hearts' : null);
  return {
    kind, report: report(w, failed ? 'failed' : 'passed', failReason), errors: over.errors ?? (failed ? 3 : 1),
    usedMs: 71_000, budgetMs: 100_000, floorBefore: Math.max(1, w.floor - (kind === 'floor' || kind === 'summit' ? 1 : 0)), local: w, failReason,
  } as const;
}

/** Готовая модель для Home (SpireHomeScreen). Состояния ступени (step_*) тут тоже дают домашний фон. */
export function spirePreviewModel(state: SpirePreviewState, overrides: SpirePreviewOverrides = {}): SpirePreviewModel {
  activeOverrides = overrides;
  let model: SpirePreviewModel;
  try { model = buildPreviewModel(state); } finally { activeOverrides = {}; }
  // зачем (правило dev-состояний): каждая ветка пишет, что именно показала — Сверка сверяет кадр с логом. Сети и записей нет.
  console.log(`[DEV-STATE] spire_preview model state=${state} floor=${model.week?.floor ?? 'none'} outcome=${model.game.outcome?.kind ?? 'none'} weekResult=${model.game.weekResult ? `promoted:${String(model.game.weekResult.promoted)} demoted:${String(model.game.weekResult.demoted)}` : 'none'} startBlock=${String(model.game.startBlock)} live=${String(model.game.live)}`);
  return model;
}

function buildPreviewModel(state: SpirePreviewState): SpirePreviewModel {
  const base = { config: ENABLED_CONFIG, tourSeen: true, coinRank: 5 } as const;
  switch (state) {
    case 'locked':
      return { ...base, config: { ...SPIRE_CONFIG_DEFAULTS, enabled: false }, week: null, game: game({ live: false }) };
    case 'lobby': {
      const w = week(1, 0, 0);
      return { ...base, week: w, game: game({ rows: rows(0), myPlace: 12, friends: [] }) };
    }
    case 'room': {
      const w = week(7, 2, 31);
      const room = rows(31, 30, w.floor); // комната в 30 человек, как на макете: соседи выше и ниже по этажам
      return { ...base, week: w, game: game({ rows: room, myPlace: room.findIndex((r) => r.isMe) + 1, friends: FRIENDS }) };
    }
    case 'win': {
      const w = week(8, 0, 36);
      return { ...base, week: w, game: game({ rows: rows(36), myPlace: 4, friends: FRIENDS, outcome: outcome('floor', w) }) };
    }
    case 'summit': {
      const w = week(15, 3, 88);
      return { ...base, week: w, game: game({ rows: rows(88), myPlace: 1, friends: FRIENDS, outcome: outcome('summit', w) }) };
    }
    case 'lose': {
      const w = week(7, 2, 31);
      return { ...base, week: w, game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS, outcome: outcome('failed', w) }) };
    }
    case 'lose_timeout': {
      const w = week(7, 2, 31);
      return { ...base, week: w, game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS, outcome: outcome('failed', w, { failReason: 'timeout' }) }) };
    }
    case 'lose_aborted': {
      const w = week(7, 2, 31);
      return { ...base, week: w, game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS, outcome: outcome('failed', w, { failReason: 'backed_out' }) }) };
    }
    case 'save_failed': {
      const w = week(7, 3, 32);
      return { ...base, week: w, game: game({ rows: rows(32), myPlace: 5, friends: FRIENDS, outcome: outcome('save_failed', w) }) };
    }
    case 'empty':
      return { ...base, week: null, game: game({ rows: null, myPlace: null, tier: null, friends: [] }) };
    case 'offline': {
      const w = week(7, 2, 31);
      return { ...base, week: w, game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS, roomLoad: { status: 'offline', room: null, reason: 'preview' } }) };
    }
    case 'weekresult': {
      const w = week(7, 2, 31);
      return {
        ...base, week: w,
        game: game({
          rows: rows(31), myPlace: 5, friends: FRIENDS,
          weekResult: { weekId: w.weekKey, lang: 'en', steps: previewSteps(58), roomRank: 2, roomTotal: 30, promoted: true, demoted: false, ...weekTiers('promoted'), placeCoins: 200, promotionCoins: 100 },
        }),
      };
    }
    case 'weekresult_stay': {
      const w = week(7, 2, 31);
      return {
        ...base, week: w,
        game: game({
          rows: rows(31), myPlace: 5, friends: FRIENDS,
          weekResult: { weekId: w.weekKey, lang: 'en', steps: previewSteps(31), roomRank: 14, roomTotal: 30, promoted: false, demoted: false, ...weekTiers('stay'), placeCoins: 60, promotionCoins: 0 },
        }),
      };
    }
    case 'weekresult_down': {
      const w = week(4, 1, 12);
      return {
        ...base, week: w,
        game: game({
          rows: rows(12), myPlace: 11, friends: FRIENDS,
          weekResult: { weekId: w.weekKey, lang: 'en', steps: previewSteps(12), roomRank: 27, roomTotal: 30, promoted: false, demoted: true, ...weekTiers('demoted'), placeCoins: 0, promotionCoins: 0 },
        }),
      };
    }
    case 'passed': {
      // итог ступени «passed» (`spire-result-passed`): ступень пройдена, этаж не меняется (шаг 3 из 5 этажа 7).
      const w = week(7, 3, 32);
      return { ...base, week: w, game: game({ rows: rows(32), myPlace: 5, friends: FRIENDS, outcome: outcome('passed', w) }) };
    }
    case 'guard': {
      // макет «Этаж 4 → Страж»: этаж 5 (spireIsGuard каждые 5), поднялись с 4-го.
      // зачем (R1 spire-012): previewFloor сдвигает этаж от базового 7, и при floor=4 Страж уезжал на этаж 2 (не Страж).
      // С floor= берём ближайший этаж Стража выше заданного (5 или 10), без параметра — прежний этаж 5.
      const f = activeOverrides.floor;
      const guardFloor = f === undefined ? 5 : Math.min(10, Math.max(5, Math.ceil((f + 1) / 5) * 5));
      const w = week(f === undefined ? 5 : guardFloor - (f - PREVIEW_BASE_FLOOR), 0, 20);
      return { ...base, week: w, game: game({ rows: rows(20), myPlace: 8, friends: FRIENDS, outcome: outcome('floor', w) }) };
    }
    case 'block_missing':
      return { ...base, week: week(7, 2, 31), game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS, startBlock: 'pack_missing' }) };
    case 'block_offline':
      return { ...base, week: week(7, 2, 31), game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS, startBlock: 'pack_offline' }) };
    case 'tour':
      return { ...base, tourSeen: false, week: week(1, 0, 0), game: game({ rows: rows(0), myPlace: 12 }) };
    case 'all':
      return { ...base, showAll: true, week: week(7, 2, 31), game: game({ rows: rows(31, 14), myPlace: 5, friends: FRIENDS }) };
    default:
      return { ...base, week: week(7, 2, 31), game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS }) };
  }
}

// ── ступень: 3 вида заданий + ошибка + подготовка ──────────────────────────────

const CHOICE_TASK: SpirePackTask = {
  taskId: 'preview-choice', mode: 'guess_phrase', kind: 'choice', difficulty: 2,
  payload: { phrase: 'She works every day', options: ['Она работает каждый день', 'Она работала вчера', 'Она будет работать завтра', 'Она не работает'] },
} as SpirePackTask;
const BUILD_TASK: SpirePackTask = {
  taskId: 'preview-build', mode: 'translate_build', kind: 'translate', difficulty: 3,
  payload: { prompt: 'Она работает каждый день', wordBank: ['She', 'works', 'every', 'day', 'work', 'the', 'is'], correctTokenCount: 4 },
} as SpirePackTask;
const ITEMS_TASK: SpirePackTask = {
  taskId: 'preview-items', mode: 'speed_match', kind: 'match', difficulty: 3,
  payload: {
    items: [
      { prompt: 'every day', options: ['каждый день', 'иногда', 'никогда'] },
      { prompt: 'work', options: ['играть', 'работать', 'спать'] },
      { prompt: 'on time', options: ['вовремя', 'поздно', 'рано'] },
    ],
  },
} as SpirePackTask;

// зачем (координатор 14.10, spire-gap-001/002/004/005): виды заданий, которых не было в превью. Данные выдуманные, как у остальных.
const GAP_TASK: SpirePackTask = {
  taskId: 'preview-gap', mode: 'fill_gap', kind: 'choice', difficulty: 2,
  payload: { phrase: 'She ___ to work every day', options: ['go', 'goes', 'going', 'gone'] },
} as SpirePackTask;
const ODD_TASK: SpirePackTask = {
  taskId: 'preview-odd', mode: 'find_oddity', kind: 'choice', difficulty: 2,
  payload: { phrase: 'Найдите фразу с ошибкой согласования.', options: ['She works here', 'He have a car', 'They live nearby', 'We are friends'] },
} as SpirePackTask;
const LISTEN_CHOOSE_TASK: SpirePackTask = {
  taskId: 'preview-listen-choose', mode: 'listen_choose', kind: 'listen', difficulty: 2,
  payload: { phrase: 'She works every day', audioUri: 'device-tts:en:0a1b2c3d', options: ['Она работает каждый день', 'Она работала вчера', 'Она будет работать завтра', 'Она не работает'] },
} as SpirePackTask;
const LISTEN_BUILD_TASK: SpirePackTask = {
  taskId: 'preview-listen-build', mode: 'listen_build', kind: 'dictate', difficulty: 3,
  payload: { phrase: 'She works every day', audioUri: 'device-tts:en:0a1b2c3d', wordBank: ['She', 'works', 'every', 'day', 'work', 'the', 'is'], correctTokenCount: 4 },
} as SpirePackTask;

export type SpireStepPreview = Readonly<{
  task: SpirePackTask;
  taskIndex: number;
  hearts: number;
  paused: boolean;
  preparing: boolean;
  answering: boolean;
  feedback: SpireFeedback | null;
  ctx: SpireStepSession['ctx'];
  budgetMs: number;
  elapsedMs: number;
}>;

export function isSpireStepPreviewState(state: SpirePreviewState): boolean {
  return state.startsWith('step_');
}

export function spireStepPreview(state: SpirePreviewState, overrides: SpirePreviewOverrides = {}): SpireStepPreview {
  activeOverrides = overrides;
  let preview: SpireStepPreview;
  try { preview = buildStepPreview(state); } finally { activeOverrides = {}; }
  console.log(`[DEV-STATE] spire_preview step state=${state} task=${preview.task.taskId} mode=${preview.task.mode} kind=${preview.task.kind} taskIndex=${preview.taskIndex} hearts=${preview.hearts} paused=${String(preview.paused)} preparing=${String(preview.preparing)} feedback=${preview.feedback ? (preview.feedback.ok ? 'ok' : 'wrong') : 'none'}`);
  return preview;
}

function buildStepPreview(state: SpirePreviewState): SpireStepPreview {
  const ctx = { lang: 'en', weekKey: spireCurrentWeekKey(Date.now()), tier: previewTier(), floor: previewFloor(PREVIEW_BASE_FLOOR), stepInFloor: 2 } as const;
  const common = { ctx, budgetMs: 100_000, elapsedMs: 28_000, hearts: 3, paused: false, preparing: false, answering: true, feedback: null } as const;
  switch (state) {
    case 'step_build': return { ...common, task: BUILD_TASK, taskIndex: 3 };
    case 'step_gap': return { ...common, task: GAP_TASK, taskIndex: 2 };
    case 'step_odd': return { ...common, task: ODD_TASK, taskIndex: 4 };
    case 'step_listen_choose': return { ...common, task: LISTEN_CHOOSE_TASK, taskIndex: 1 };
    case 'step_listen_build': return { ...common, task: LISTEN_BUILD_TASK, taskIndex: 3 };
    case 'step_items': return { ...common, task: ITEMS_TASK, taskIndex: 5, hearts: 2 };
    case 'step_wrong':
      return {
        ...common, task: CHOICE_TASK, taskIndex: 4, hearts: 2, paused: true, answering: false,
        feedback: { taskIndex: 4, ok: false, picked: 1, itemIndex: null, correctIndex: 0, correctText: 'Она работает каждый день', mistakeSaved: true },
      };
    case 'step_prep': return { ...common, task: CHOICE_TASK, taskIndex: 0, preparing: true, answering: false, paused: true, elapsedMs: 0 };
    default: return { ...common, task: CHOICE_TASK, taskIndex: 1 };
  }
}

/** Часы для кольца: стоят на заданном значении, подписчиков нет. */
export function spireStaticClock(elapsedMs: number): SpireClock {
  return { get: () => elapsedMs, subscribe: () => () => undefined };
}
