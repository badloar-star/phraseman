/**
 * Шпиль: пакет недели — чистая сборка (PM-272, TOWER.md §4.4/§6,
 * TOWER_CONTRACT.md §4).
 *
 * зачем: владелец (D54, T8, T10) — ступень целиком играется на устройстве:
 * 0 вызовов функций на ступень, 1 скачивание в неделю. Для этого сервер раз в
 * неделю собирает ФАЙЛ «язык × шпиль»: этажи 1..15 → ступени (5,6,7,8,9, дальше
 * по 10) → 3 набора по 10 заданий (первая попытка + 2 повтора без повторения
 * заданий внутри ступени), с отпечатками правильных ответов в формате Арены.
 *
 * Логика плана — та же, что у дуэли Арены (`arena_duel_v3.ts::arenaPlanTask`):
 * `toPublicTournamentTask(task, соль)` + вырезанные объяснения. Отличие одно —
 * соль отпечатков не matchId, а `saltId` пакета (клиент: `SpireStepPlan.saltId`,
 * `modules/arena/answer_check.ts::arenaAnswerFingerprint(saltId, …)`).
 *
 * Модуль чистый: ни сети, ни Firestore, ни Storage, ни времени — пакет
 * детерминирован от (weekId, lang, tier, пул, таймер). Повторная сборка того же
 * пула даёт тот же packHash — ручной пересбор не ломает отчёты игроков.
 */
import { createHash } from 'node:crypto';

import { arenaIsTaskMode } from './arena_stars_v3';
import {
  SPIRE_STEP_TASK_COUNT,
  SPIRE_SUMMIT_FLOOR,
  spireIsGuardianFloor,
  spireStepsForFloor,
  type SpireTimerConfig,
} from './spire_config_contract';
import { toPublicTournamentTask, type TournamentTask } from './tournament_core';

export const SPIRE_PACK_SCHEMA = 'spire-pack-v1' as const;
export const SPIRE_PACK_STORAGE_PREFIX = 'spire_packs' as const;
/** T-контракт §4: первая попытка + 2 повтора; дальше клиент идёт по кругу. */
export const SPIRE_PACK_SETS_PER_STEP = 3;
/** Шпилей 12: Гранит (0) … Алмаз (11), как SPIRE_MAX_TIER в spire_groups.ts. */
export const SPIRE_PACK_MAX_TIER = 11;
/** T21: голос обязателен с этого этажа — в пакете пока НЕТ голосовых заданий (см. pendingKinds). */
export const SPIRE_PACK_VOICE_FROM_FLOOR = 11;

/**
 * зачем: Арена знает пять режимов; §4.4 говорит «выбор, пары, сборка».
 * «Выбор» — три режима с одним видом ответа (choice): угадай фразу, вставь
 * слово, найди лишнее. Семейство нужно, чтобы нехватка одного режима на
 * уровне сложности добиралась соседним, а не роняла сборку.
 */
const CHOICE_FAMILY = ['guess_phrase', 'fill_gap', 'find_oddity'] as const;
type SpirePackMode = typeof CHOICE_FAMILY[number] | 'translate_build' | 'speed_match';

/** Сколько заданий каждого вида в наборе из 10 — по этажу (§4.4). */
type FloorMix = Readonly<{ choice: number; translate_build: number; speed_match: number }>;

/**
 * §4.4 «Сложность вверх», раскладка режимов по этажам:
 *   1–2 выбор + пары; 3–4 + сборка/перевод; 5/10/15 Страж — смешанный набор.
 *   6–9 «+ на слух, диктант» и 11+ «+ голос» — этих заданий в пуле нет
 *   (PM-286: звук не решён; голос из Арены снят), поэтому такие этажи
 *   собираются как 3–4, а трудность растёт за счёт доли сложных (см. hardness).
 */
export function spireFloorMix(floor: number): FloorMix {
  if (spireIsGuardianFloor(floor)) return { choice: 4, translate_build: 4, speed_match: 2 };
  if (floor <= 2) return { choice: 8, translate_build: 0, speed_match: 2 };
  return { choice: 6, translate_build: 3, speed_match: 1 };
}

/**
 * Трудность 0..1: шпиль задаёт уровень (Гранит — простые, Алмаз — трудные),
 * этаж смещает вверх внутри шпиля (§4.4 последний абзац). 11+ — «выше доля
 * трудных», Страж — чуть труднее соседей.
 */
export function spireHardness(tier: number, floor: number): number {
  const tierPart = Math.max(0, Math.min(SPIRE_PACK_MAX_TIER, tier)) / SPIRE_PACK_MAX_TIER;
  const floorPart = (Math.max(1, Math.min(SPIRE_SUMMIT_FLOOR, floor)) - 1) / (SPIRE_SUMMIT_FLOOR - 1);
  const bonus = (floor >= SPIRE_PACK_VOICE_FROM_FLOOR ? 0.1 : 0) + (spireIsGuardianFloor(floor) ? 0.05 : 0);
  return Math.max(0, Math.min(1, 0.65 * tierPart + 0.3 * floorPart + bonus));
}

/** Сколько заданий сложности 1/2/3 в наборе: средняя сложность = 1 + 2·hardness. */
export function spireDifficultyCounts(hardness: number, total = SPIRE_STEP_TASK_COUNT): [number, number, number] {
  const expected = 1 + 2 * hardness;
  const hard = Math.round(total * Math.max(0, expected - 2));
  const easy = Math.round(total * Math.max(0, 2 - expected));
  return [easy, total - easy - hard, hard];
}

/* ------------------------------ детерминизм ------------------------------ */

function seedFrom(text: string): number {
  return createHash('sha256').update(text, 'utf8').digest().readUInt32LE(0);
}

/** mulberry32 — маленький ГПСЧ; без Math.random, чтобы пересбор давал тот же файл. */
function prng(seedText: string): () => number {
  let a = seedFrom(seedText);
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], seedText: string): T[] {
  const out = items.slice();
  const rnd = prng(seedText);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return 'null';
}

/* -------------------------------- типы ----------------------------------- */

export type SpirePackPublicTask = Readonly<{
  taskId: string;
  mode: string;
  kind: string;
  difficulty: number;
  payload: Readonly<Record<string, unknown>>;
}>;

export type SpirePackSet = Readonly<{
  tasks: readonly SpirePackPublicTask[];
  /** Параллельно tasks[i]: отпечатки ответа (для пар — по одному на пару). Контракт §4: ответы отдельным полем. */
  answerFingerprints: readonly (readonly string[])[];
}>;

export type SpirePackStep = Readonly<{ step: number; sets: readonly SpirePackSet[] }>;

export type SpirePackFloor = Readonly<{
  floor: number;
  guardian: boolean;
  /** T21 требует голос с 11 этажа, но голосовых заданий в пуле нет — честно false (см. pendingKinds). */
  voiceRequired: boolean;
  hardness: number;
  steps: readonly SpirePackStep[];
}>;

export type SpirePackSource = Readonly<{
  poolVersion: string;
  publicationFingerprint: string;
  legacyPool: boolean;
  poolTaskCount: number;
}>;

export type SpirePack = Readonly<{
  schema: typeof SPIRE_PACK_SCHEMA;
  weekId: string;
  lang: string;
  tier: number;
  packHash: string;
  /** Соль отпечатков ответов (вместо matchId Арены). */
  saltId: string;
  timer: Readonly<{ baseMsByKind: SpireTimerConfig['baseMsByKind']; perFloorDecay: number; floorMin: number }>;
  /** Этажи 16+ («над облаками») берут наборы этажей 11..15 по кругу — отдельного контента нет. */
  aboveCloudsCyclesFloors: readonly number[];
  /** Виды §4.4, которых в пакете НЕТ, и почему (PM-286, открытые вопросы владельцу). */
  pendingKinds: Readonly<Record<string, string>>;
  source: SpirePackSource;
  stats: Readonly<{ slots: number; uniqueTasks: number; reusedAcrossSteps: number; fallbacks: number; excludedFlagged: number }>;
  floors: readonly SpirePackFloor[];
}>;

export type SpirePackBuildInput = Readonly<{
  weekId: string;
  lang: string;
  tier: number;
  /** Уже проверенные задания пула Арены (validateTournamentTaskForNewRoom + доказательство Меркла). */
  pool: readonly TournamentTask[];
  timer: SpireTimerConfig;
  source: Omit<SpirePackSource, 'poolTaskCount'>;
  /**
   * PM-287 (T41, D55): задания, снятые оператором по жалобе
   * (`config/spire_task_flags_{lang}`), в пакет не попадают.
   */
  excludedTaskIds?: readonly string[];
}>;

export type SpirePackBuildResult =
  | Readonly<{ ok: true; pack: SpirePack; json: string }>
  | Readonly<{ ok: false; reason: string; detail?: Record<string, unknown> }>;

/* ------------------------------- пути ------------------------------------ */

export function spirePackPath(lang: string, tier: number, weekId: string): string {
  return `${SPIRE_PACK_STORAGE_PREFIX}/${lang}/${tier}/${weekId}.json`;
}

export function spirePackSaltId(lang: string, tier: number, weekId: string): string {
  return `spire:${weekId}:${lang}:${tier}`;
}

/**
 * Отпечаток пакета. Формат проходит PACK_HASH_RE из spire_progress_contract.ts
 * (`[A-Za-z0-9:_-]{8,128}`) — base64url + префикс версии.
 */
export function spirePackHash(packWithoutHash: unknown): string {
  const digest = createHash('sha256').update(canonical(packWithoutHash), 'utf8').digest('base64url');
  return `sp1_${digest.slice(0, 32)}`;
}

/* ---------------------------- подготовка пула ----------------------------- */

type PlayableTask = Readonly<{ task: TournamentTask; mode: SpirePackMode; difficulty: number }>;

/** Задание годится Шпилю: режим Арены из «выбор/пары/сборка», публичная форма собирается. */
function toPlayable(task: TournamentTask): PlayableTask | null {
  if (!arenaIsTaskMode(task.mode) || task.isVoice === true) return null;
  if (!Number.isInteger(task.difficulty) || task.difficulty < 1 || task.difficulty > 3) return null;
  // Проба с пустой солью: задание, которое toPublicTournamentTask не принимает, в пакет не идёт.
  if (!toPublicTournamentTask(task, 'probe')) return null;
  return { task, mode: task.mode as SpirePackMode, difficulty: task.difficulty };
}

function cellKey(mode: string, difficulty: number): string {
  return `${mode}:${difficulty}`;
}

/**
 * Порядок перебора запасных ячеек: сначала тот же режим с ближайшей сложностью,
 * потом соседи по семейству «выбор» с той же сложностью, дальше — что угодно.
 * зачем: в пуле es `find_oddity:3` = 0 (manifest quotas) — без запасного пути
 * трудные этажи не собрались бы вовсе.
 */
function fallbackCells(mode: SpirePackMode, difficulty: number): string[] {
  const byDistance = [difficulty, difficulty + 1, difficulty - 1, difficulty + 2, difficulty - 2]
    .filter((d) => d >= 1 && d <= 3);
  const family: SpirePackMode[] = (CHOICE_FAMILY as readonly string[]).includes(mode)
    ? [mode, ...CHOICE_FAMILY.filter((m) => m !== mode)]
    : [mode];
  const out: string[] = [];
  for (const m of family) for (const d of byDistance) out.push(cellKey(m, d));
  const every: SpirePackMode[] = [...CHOICE_FAMILY, 'translate_build', 'speed_match'];
  for (const m of every) for (const d of byDistance) out.push(cellKey(m, d));
  return Array.from(new Set(out));
}

/* ------------------------------- сборка ---------------------------------- */

type Cursor = { order: PlayableTask[]; pos: number };

/**
 * Собирает пакет. Правила выбора:
 *  - внутри ступени (3 набора × 10) задание не повторяется НИКОГДА;
 *  - по пакету каждая ячейка (режим × сложность) идёт по своей перемешанной
 *    очереди, поэтому повтор между ступенями случается только когда ячейка
 *    исчерпана (пул ~4000 на язык, слотов 135×3×10 = 4050 — повторов мало).
 */
export function buildSpirePack(input: SpirePackBuildInput): SpirePackBuildResult {
  const saltId = spirePackSaltId(input.lang, input.tier, input.weekId);
  const excluded = new Set(input.excludedTaskIds ?? []);
  const playable = input.pool
    .filter((task) => !excluded.has(task.taskId))
    .map(toPlayable)
    .filter((p): p is PlayableTask => p !== null);
  const cells = new Map<string, Cursor>();
  // Сортировка по taskId до перемешивания: порядок чтения из Firestore не влияет на пакет.
  const sorted = playable.slice().sort((a, b) => a.task.taskId.localeCompare(b.task.taskId));
  for (const p of sorted) {
    const key = cellKey(p.mode, p.difficulty);
    const cell = cells.get(key) ?? { order: [], pos: 0 }; // guard-ok: Map.get в памяти, не Firestore
    cell.order.push(p);
    cells.set(key, cell);
  }
  for (const [key, cell] of cells) cell.order = shuffled(cell.order, `${saltId}|cell|${key}`);

  const perStep = SPIRE_STEP_TASK_COUNT * SPIRE_PACK_SETS_PER_STEP;
  if (playable.length < perStep) {
    return { ok: false, reason: 'pool_too_small', detail: { playable: playable.length, needPerStep: perStep } };
  }

  const everUsed = new Set<string>();
  let reusedAcrossSteps = 0;
  let fallbacks = 0;
  let slots = 0;

  const pick = (mode: SpirePackMode, difficulty: number, usedInStep: Set<string>): PlayableTask | null => {
    const chain = fallbackCells(mode, difficulty);
    for (let i = 0; i < chain.length; i += 1) {
      const cell = cells.get(chain[i]); // guard-ok: Map.get в памяти, не Firestore
      if (!cell || cell.order.length === 0) continue;
      for (let tries = 0; tries < cell.order.length; tries += 1) {
        const candidate = cell.order[cell.pos % cell.order.length];
        cell.pos += 1;
        if (usedInStep.has(candidate.task.taskId)) continue;
        if (i > 0) fallbacks += 1;
        return candidate;
      }
    }
    return null;
  };

  const floors: SpirePackFloor[] = [];
  for (let floor = 1; floor <= SPIRE_SUMMIT_FLOOR; floor += 1) {
    const mix = spireFloorMix(floor);
    const hardness = Number(spireHardness(input.tier, floor).toFixed(4));
    const [easy, mid, hard] = spireDifficultyCounts(hardness);
    const steps: SpirePackStep[] = [];
    for (let step = 1; step <= spireStepsForFloor(floor); step += 1) {
      const usedInStep = new Set<string>();
      const sets: SpirePackSet[] = [];
      for (let setIndex = 0; setIndex < SPIRE_PACK_SETS_PER_STEP; setIndex += 1) {
        const seed = `${saltId}|${floor}|${step}|${setIndex}`;
        // Режимы набора: «выбор» раскладывается по трём режимам по кругу со сдвигом набора — разнообразие.
        const modes: SpirePackMode[] = [];
        for (let i = 0; i < mix.choice; i += 1) modes.push(CHOICE_FAMILY[(i + setIndex + step) % CHOICE_FAMILY.length]);
        for (let i = 0; i < mix.translate_build; i += 1) modes.push('translate_build');
        for (let i = 0; i < mix.speed_match; i += 1) modes.push('speed_match');
        const difficulties = [
          ...Array<number>(easy).fill(1), ...Array<number>(mid).fill(2), ...Array<number>(hard).fill(3),
        ];
        const pairedModes = shuffled(modes, `${seed}|modes`);
        const chosen: PlayableTask[] = [];
        for (let i = 0; i < SPIRE_STEP_TASK_COUNT; i += 1) {
          const got = pick(pairedModes[i], difficulties[i], usedInStep);
          if (!got) {
            return {
              ok: false,
              reason: 'pool_cannot_fill_step_without_repeat',
              detail: { floor, step, setIndex, mode: pairedModes[i], difficulty: difficulties[i] },
            };
          }
          usedInStep.add(got.task.taskId);
          if (everUsed.has(got.task.taskId)) reusedAcrossSteps += 1;
          everUsed.add(got.task.taskId);
          chosen.push(got);
          slots += 1;
        }
        // зачем: «сложность вверх» и внутри ступени — от лёгкого к трудному, режимы вперемешку.
        chosen.sort((a, b) => a.difficulty - b.difficulty);
        const tasks: SpirePackPublicTask[] = [];
        const answerFingerprints: string[][] = [];
        for (const p of chosen) {
          const publicTask = toPublicTournamentTask(p.task, saltId);
          if (!publicTask) return { ok: false, reason: 'public_task_rejected', detail: { taskId: p.task.taskId } };
          // Как arenaPlanTask: объяснения во время игры не показываются, а весят больше всего.
          const payload = { ...(publicTask.payload as Record<string, unknown>) };
          delete payload.explanation;
          delete payload.wrongOptionReasons;
          tasks.push({
            taskId: publicTask.taskId,
            mode: publicTask.mode,
            kind: publicTask.kind,
            difficulty: publicTask.difficulty,
            payload,
          });
          answerFingerprints.push(publicTask.answerFingerprints ?? []);
        }
        sets.push({ tasks, answerFingerprints });
      }
      steps.push({ step, sets });
    }
    floors.push({ floor, guardian: spireIsGuardianFloor(floor), voiceRequired: false, hardness, steps });
  }

  const body = {
    schema: SPIRE_PACK_SCHEMA,
    weekId: input.weekId,
    lang: input.lang,
    tier: input.tier,
    saltId,
    timer: {
      baseMsByKind: input.timer.baseMsByKind,
      perFloorDecay: input.timer.perFloorDecay,
      floorMin: input.timer.floorMinRatio,
    },
    aboveCloudsCyclesFloors: [11, 12, 13, 14, 15],
    pendingKinds: {
      listen: 'audio_source_undecided_pm286',
      dictate: 'audio_source_undecided_pm286',
      voice: `voice_tasks_absent_in_arena_pool_required_from_floor_${SPIRE_PACK_VOICE_FROM_FLOOR}`,
    },
    source: { ...input.source, poolTaskCount: playable.length },
    stats: { slots, uniqueTasks: everUsed.size, reusedAcrossSteps, fallbacks, excludedFlagged: input.pool.length - input.pool.filter((t) => !excluded.has(t.taskId)).length },
    floors,
  };
  const packHash = spirePackHash(body);
  const pack: SpirePack = { ...body, packHash };
  return { ok: true, pack, json: JSON.stringify(pack) };
}

/** Ступеней в пакете (1..15): 35 + 100 = 135 — сверка с оценкой контракта §4. */
export function spirePackTotalSteps(): number {
  let total = 0;
  for (let floor = 1; floor <= SPIRE_SUMMIT_FLOOR; floor += 1) total += spireStepsForFloor(floor);
  return total;
}
