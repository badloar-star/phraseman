// ═══════════════════════════════════════════════════════════
// spire_preview_fixtures.ts — моки состояний Шпиля для DEV-превью (/dev_spire_preview).
//
// зачем (координатор 11.10): Эмулятор и Сверка снимают ВСЕ экраны Шпиля рядом со spire.html, не дожидаясь серверного config.enabled.
// Это чистые данные: ни сети, ни записей, ни реальных людей (имена выдуманные). Файл НЕ импортируется боевым кодом —
// только маршрутом app/dev_spire_preview.tsx (охраняет tests/spire_dev_preview_release_guard.test.mjs).
// ═══════════════════════════════════════════════════════════
import { SPIRE_CONFIG_DEFAULTS, type SpireConfigDoc } from '../../modules/spire/config_contract';
import { SPIRE_WEEK_LOCAL_SCHEMA_VERSION, type SpireWeekLocal } from '../../modules/spire/report_queue';
import type { SpireRoomRow } from '../../modules/spire/room_rows';
import type { SpirePackTask } from '../../modules/spire/pack_plan';
import type { SpireStepSession } from '../../app/spire/use_spire_game';
import type { SpireClock, SpireFeedback } from '../../app/spire/use_spire_step_runner';
import type { SpireFriendChip } from './spire_room_types';
import { spireCurrentWeekKey } from './spire_tower_model';
import type { SpirePreviewGame, SpirePreviewModel } from './spire_preview_context';

export const SPIRE_PREVIEW_STATES = [
  'locked', 'lobby', 'room', 'win', 'summit', 'lose', 'save_failed', 'empty', 'offline', 'weekresult', 'tour', 'rules', 'all',
  'step_choice', 'step_build', 'step_items', 'step_wrong', 'step_prep',
] as const;
export type SpirePreviewState = (typeof SPIRE_PREVIEW_STATES)[number];

export function isSpirePreviewState(value: unknown): value is SpirePreviewState {
  return (SPIRE_PREVIEW_STATES as readonly unknown[]).includes(value);
}

const ENABLED_CONFIG: SpireConfigDoc = { ...SPIRE_CONFIG_DEFAULTS, enabled: true };

function week(floor: number, stepInFloor: number, stepsCleared: number, tier = 3): SpireWeekLocal {
  const now = Date.now();
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

const NAMES = ['Алиса', 'Марк', 'Дарья', 'Ян', 'Соня', 'Артём', 'Лиза', 'Глеб', 'Вера', 'Тимур', 'Ника', 'Руслан', 'Мира', 'Лев'];

function rows(mySteps: number, count = 12): readonly SpireRoomRow[] {
  const now = Date.now();
  const list: SpireRoomRow[] = NAMES.slice(0, count - 1).map((name, i) => ({
    uid: `preview-${i}`, name, steps: Math.max(0, 62 - i * 4), reachedAtMs: now - (i + 1) * 900_000, isMe: false,
  }));
  list.push({ uid: 'preview-me', name: 'Ты', steps: mySteps, reachedAtMs: now - 120_000, isMe: true });
  return list.sort((a, b) => b.steps - a.steps || a.reachedAtMs - b.reachedAtMs);
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
    live: true, uid: null, stableId: null, roomLoad: null, rows: null, myPlace: null, tier: 3, friends: [], weekResult: null,
    dismissWeekResult: noop, session: null, starting: false, startBlock: null, startStep: noopAsync, onStepFinish: noop, onStepAbort: noop,
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
export function spirePreviewModel(state: SpirePreviewState): SpirePreviewModel {
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
      return { ...base, week: w, game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS }) };
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
          weekResult: { weekId: w.weekKey, lang: 'en', steps: 58, roomRank: 2, roomTotal: 30, promoted: true, demoted: false, prevTier: 2, newTier: 3, placeCoins: 200, promotionCoins: 100 },
        }),
      };
    }
    case 'tour':
      return { ...base, tourSeen: false, week: week(1, 0, 0), game: game({ rows: rows(0), myPlace: 12 }) };
    case 'rules':
      return { ...base, rulesOpen: true, week: week(7, 2, 31), game: game({ rows: rows(31), myPlace: 5, friends: FRIENDS }) };
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

export function spireStepPreview(state: SpirePreviewState): SpireStepPreview {
  const ctx = { lang: 'en', weekKey: spireCurrentWeekKey(Date.now()), tier: 3, floor: 7, stepInFloor: 2 } as const;
  const common = { ctx, budgetMs: 100_000, elapsedMs: 28_000, hearts: 3, paused: false, preparing: false, answering: true, feedback: null } as const;
  switch (state) {
    case 'step_build': return { ...common, task: BUILD_TASK, taskIndex: 3 };
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
