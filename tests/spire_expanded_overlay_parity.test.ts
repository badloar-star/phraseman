/**
 * Пик: накладка новых механик поверх пакета недели (владелец 11.11.2026: «давай включай уже» → «Да, делай»).
 *
 * зачем: установленные сборки отбраковывают пакет целиком, если в нём есть незнакомый вид задания. Поэтому новые
 * задания лежат отдельным файлом, а пакет остаётся прежним. Сторож держит три обещания:
 *   1) файл пакета не меняется ни на байт и не содержит вида 'expanded' — старая сборка играет как раньше;
 *   2) накладку, собранную СЕРВЕРНЫМ кодом из НАСТОЯЩЕГО пула (content/spire-expanded), читает КЛИЕНТСКИЙ код,
 *      и каждое подменённое задание превращается в задание для экрана;
 *   3) отпечаток пакета после наложения тот же — отчёты ступеней и учёт на сервере не затронуты.
 * Сработал — чинить functions/src/spire_expanded_overlay.ts или modules/spire/expanded_overlay.ts, а не сторожа.
 */
import fs from 'fs';
import path from 'path';

import { SPIRE_CONFIG_DEFAULTS, SPIRE_STEP_TASK_COUNT } from '../functions/src/spire_config_contract';
import {
  SPIRE_EXPANDED_OVERLAY_FROM_FLOOR,
  SPIRE_EXPANDED_OVERLAY_PER_SET,
  buildSpireExpandedOverlay,
  spireExpandedOverlayPath,
} from '../functions/src/spire_expanded_overlay';
import { spireExpandedPoolTaskFromAuthorRecord, type SpireExpandedPoolTask } from '../functions/src/spire_expanded_task';
import { buildSpirePack, spirePackPath } from '../functions/src/spire_pack_contract';
import type { TournamentTask } from '../functions/src/tournament_core';
import { spireApplyExpandedOverlay } from '../modules/spire/expanded_overlay';
import { spireExpandedTaskFromPack, spireExpandedTaskIsValid } from '../modules/spire/expanded_pack_task';
import { spireDecodeWeekPack, type SpireWeekPack } from '../modules/spire/pack_plan';

const LANGS = ['en', 'es', 'de', 'fr', 'it'] as const;

function explanation(options: readonly string[], correctIndex: number | null) {
  return {
    ruleNote: 'Полный разбор правила задания.',
    example: 'Корректный пример применения правила.',
    wrongOptionReasons: options.map((_option, index) => (index === correctIndex ? '' : 'Этот вариант не соответствует условию задания.')),
  };
}

/** Тот же минимальный пул, что в tests/spire_expanded_server_parity.test.ts: выбор (3 режима) + сборка + пары. */
function makePool(perCell: number): TournamentTask[] {
  const out: TournamentTask[] = [];
  const base: Pick<TournamentTask, 'isVoice' | 'tags' | 'verified'> = { isVoice: false, tags: [] as string[], verified: true };
  for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
    for (let i = 0; i < perCell; i += 1) {
      for (const mode of ['guess_phrase', 'fill_gap', 'find_oddity']) {
        const options = ['a', 'b', 'c', 'd'];
        const correctIndex = i % options.length;
        out.push({ ...base, taskId: `${mode}-${difficulty}-${i}`, mode, difficulty, payload: { phrase: `p${i}`, options, correctIndex }, explanation: explanation(options, correctIndex) });
      }
      out.push({ ...base, taskId: `translate_build-${difficulty}-${i}`, mode: 'translate_build', difficulty,
        payload: { phrase: `фраза ${i}`, wordBank: ['I', 'am', 'here', 'x'], correctTokens: ['I', 'am', 'here'], correctTokenCount: 3 },
        explanation: explanation([], null) });
      const rightOptions = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
      const items = ['one', 'two', 'three', 'four', 'five', 'six'].map((prompt, correctIndex) => ({ prompt, options: rightOptions, correctIndex, explanation: explanation(rightOptions, correctIndex) }));
      out.push({ ...base, taskId: `speed_match-${difficulty}-${i}`, mode: 'speed_match', difficulty, payload: { prompt: 'пары', rightOptions, items }, explanation: explanation([], null) });
    }
  }
  return out;
}

/** Настоящий пул языка — те же строки, что уйдут в бандл функций. */
function realRows(lang: string): unknown[] {
  const file = path.resolve(__dirname, '..', 'content', 'spire-expanded', lang, 'tasks.jsonl');
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
}

function realPool(lang: string): SpireExpandedPoolTask[] {
  return realRows(lang).map(spireExpandedPoolTaskFromAuthorRecord).filter((task): task is SpireExpandedPoolTask => task !== null);
}

const INPUT = {
  weekId: '2026-W46',
  lang: 'en',
  tier: 3,
  pool: makePool(40),
  timer: SPIRE_CONFIG_DEFAULTS.timer,
  source: { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true },
};
const EXPECT = { weekId: INPUT.weekId, lang: INPUT.lang, tier: INPUT.tier };

function builtPack() {
  const built = buildSpirePack(INPUT);
  if (!built.ok) throw new Error(`pack_build_failed:${built.reason}`);
  return built;
}

function clientPack(json: string): SpireWeekPack {
  const decoded = spireDecodeWeekPack(JSON.parse(json), EXPECT);
  if (!decoded.ok) throw new Error(`pack_decode_failed:${decoded.reason}`);
  return decoded.pack;
}

function overlayFor(json: string, packHash: string, extra: Partial<Parameters<typeof buildSpireExpandedOverlay>[0]> = {}) {
  return buildSpireExpandedOverlay({
    pack: JSON.parse(json) as unknown,
    weekId: INPUT.weekId, lang: INPUT.lang, tier: INPUT.tier,
    basePackHash: packHash,
    tasks: realPool('en'),
    ...extra,
  });
}

describe('Пик: накладка новых механик поверх пакета недели', () => {
  it('настоящий пул: каждая запись всех пяти языков годится серверу и экрану', () => {
    for (const lang of LANGS) {
      const rows = realRows(lang);
      const pool = realPool(lang);
      expect([lang, pool.length]).toEqual([lang, rows.length]);
      expect(pool.length).toBeGreaterThanOrEqual(300);
      const unreadable = pool.filter((task) => !spireExpandedTaskIsValid({ taskId: task.taskId, mode: task.mode, kind: 'expanded', payload: task.payload }, lang));
      expect([lang, unreadable.map((task) => task.taskId)]).toEqual([lang, []]);
    }
  });

  it('накладка лежит рядом с пакетом, под тем же правилом доступа Storage', () => {
    expect(spirePackPath('es', 7, '2026-W46')).toBe('spire_packs/es/7/2026-W46.json');
    expect(spireExpandedOverlayPath('es', 7, '2026-W46')).toBe('spire_packs/es/7/2026-W46.expanded.json');
  });

  it('файл пакета остаётся прежним: в нём нет вида expanded, старая сборка его читает', () => {
    const built = builtPack();
    expect(built.json).not.toContain('"kind":"expanded"');
    const overlay = overlayFor(built.json, built.pack.packHash);
    expect(overlay.ok).toBe(true);
    // пакет после сборки накладки собирается тем же — накладка его не трогает
    expect(builtPack().json).toBe(built.json);
  });

  it('по умолчанию подменяется КАЖДОЕ задание «выбор» набора (владелец 11.11: «Все подходящие места»)', () => {
    // зачем: при двух на набор владелец не увидел ни одной новой механики; тест падает, если вернуть малое число
    const built = builtPack();
    const overlay = overlayFor(built.json, built.pack.packHash);
    expect(overlay.ok).toBe(true);
    if (!overlay.ok) return;
    const replaced = new Set(overlay.overlay.slots.map(([floor, step, setIndex, taskIndex]) => `${floor}:${step}:${setIndex}:${taskIndex}`));
    const raw = JSON.parse(built.json) as { floors: { floor: number; steps: { step: number; sets: { tasks: { kind: string }[] }[] }[] }[] };
    const leftAsChoice: string[] = [];
    let choiceSlots = 0;
    for (const floor of raw.floors) {
      if (floor.floor < SPIRE_EXPANDED_OVERLAY_FROM_FLOOR) continue;
      for (const step of floor.steps) {
        step.sets.forEach((set, setIndex) => set.tasks.forEach((task, taskIndex) => {
          if (task.kind !== 'choice') return;
          choiceSlots += 1;
          const key = `${floor.floor}:${step.step}:${setIndex}:${taskIndex}`;
          if (!replaced.has(key)) leftAsChoice.push(key);
        }));
      }
    }
    expect(choiceSlots).toBeGreaterThan(0);
    expect(leftAsChoice).toEqual([]);
    expect(overlay.stats.slots).toBe(choiceSlots);
  });

  it('сложность по фразам: первый этаж первой башни — самые лёгкие, дальше по этажам и башням труднее (владелец 11.11)', () => {
    // зачем: владелец на первом этаже первой башни получил фразы уровня B1–B2 — накладка брала задания из трёх грубых корзин
    for (const lang of LANGS) {
      const pool = realPool(lang);
      expect([lang, pool.every((task) => typeof task.rank === 'number')]).toEqual([lang, true]);
      const ranks = pool.map((task) => task.rank as number).sort((a, b) => a - b);
      const easyBound = ranks[Math.floor(ranks.length * 0.2)];
      const meanAt = (tier: number) => {
        const input = { ...INPUT, lang, tier, weekId: '2026-W46' };
        const pack = buildSpirePack(input);
        if (!pack.ok) throw new Error(`pack_build_failed:${pack.reason}`);
        const built = buildSpireExpandedOverlay({ pack: JSON.parse(pack.json) as unknown, weekId: input.weekId, lang, tier, basePackHash: pack.pack.packHash, tasks: pool });
        if (!built.ok) throw new Error(`overlay_failed:${built.reason}`);
        const rankOf = new Map(pool.map((task) => [task.taskId, task.rank as number]));
        const byFloor = new Map<number, number[]>();
        for (const [floor, , , , id] of built.overlay.slots) byFloor.set(floor, [...(byFloor.get(floor) ?? []), rankOf.get(id) as number]);
        const mean = (floor: number) => { const list = byFloor.get(floor) ?? []; return list.reduce((s, r) => s + r, 0) / list.length; };
        return { byFloor, mean, top: Math.max(...byFloor.keys()) };
      };
      const first = meanAt(0);
      // первый этаж первой башни: КАЖДОЕ задание — из самой лёгкой пятой части пула языка
      expect([lang, (first.byFloor.get(1) ?? []).filter((rank) => rank > easyBound)]).toEqual([lang, []]);
      expect(first.mean(first.top)).toBeGreaterThan(first.mean(1));
      const last = meanAt(11);
      expect(last.mean(1)).toBeGreaterThan(first.mean(1));
      expect(last.mean(last.top)).toBeGreaterThan(first.mean(first.top));
    }
  });

  it('сервер собирает накладку детерминированно: по заданному числу в наборе, без повторов в ступени', () => {
    const built = builtPack();
    const first = overlayFor(built.json, built.pack.packHash);
    const second = overlayFor(built.json, built.pack.packHash);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.json).toBe(first.json);
    const perSet = new Map<string, number>();
    const perStep = new Map<string, string[]>();
    for (const [floor, step, setIndex, taskIndex, taskId] of first.overlay.slots) {
      expect(floor).toBeGreaterThanOrEqual(SPIRE_EXPANDED_OVERLAY_FROM_FLOOR);
      expect(taskIndex).toBeLessThan(SPIRE_STEP_TASK_COUNT);
      expect(first.overlay.tasks[taskId]).toBeDefined();
      perSet.set(`${floor}:${step}:${setIndex}`, (perSet.get(`${floor}:${step}:${setIndex}`) ?? 0) + 1);
      perStep.set(`${floor}:${step}`, [...(perStep.get(`${floor}:${step}`) ?? []), taskId]);
    }
    for (const count of perSet.values()) expect(count).toBeLessThanOrEqual(SPIRE_EXPANDED_OVERLAY_PER_SET);
    for (const ids of perStep.values()) expect(new Set(ids).size).toBe(ids.length);
    expect(first.stats.slots).toBe(first.overlay.slots.length);
    expect(first.stats.slots).toBeGreaterThan(0);
  });

  it('клиент накладывает серверный файл: слоты подменены, отпечаток пакета прежний, каждое задание открывается экраном', () => {
    const built = builtPack();
    const overlay = overlayFor(built.json, built.pack.packHash);
    expect(overlay.ok).toBe(true);
    if (!overlay.ok) return;
    const base = clientPack(built.json);
    const applied = spireApplyExpandedOverlay(base, JSON.parse(overlay.json));
    expect([applied.applied, applied.skipped, applied.reason]).toEqual([overlay.stats.slots, 0, 'ok']);
    expect(applied.pack.packHash).toBe(base.packHash);
    expect(applied.pack).not.toBe(base);
    // исходный пакет не изменён — подмена создаёт новый объект
    expect(JSON.stringify(base)).toBe(JSON.stringify(clientPack(built.json)));
    let seen = 0;
    for (const floor of applied.pack.floors) {
      for (const step of floor.steps) {
        for (const set of step.sets) {
          expect(set.tasks).toHaveLength(SPIRE_STEP_TASK_COUNT);
          expect(set.answerFingerprints).toHaveLength(SPIRE_STEP_TASK_COUNT);
          for (const task of set.tasks) {
            if (task.kind !== 'expanded') continue;
            seen += 1;
            for (const uiLang of ['en', 'ru', 'es']) {
              const parsed = spireExpandedTaskFromPack(task, uiLang, 'en');
              expect([task.taskId, uiLang, parsed.ok]).toEqual([task.taskId, uiLang, true]);
            }
          }
        }
      }
    }
    expect(seen).toBe(overlay.stats.slots);
  });

  it('накладка от другого пакета, недели или языка отвергается целиком — играем прежним пакетом', () => {
    const built = builtPack();
    const overlay = overlayFor(built.json, built.pack.packHash);
    expect(overlay.ok).toBe(true);
    if (!overlay.ok) return;
    const base = clientPack(built.json);
    const raw = JSON.parse(overlay.json) as Record<string, unknown>;
    for (const [patch, reason] of [
      [{ basePackHash: 'sp1_other_pack_hash' }, 'overlay_base_pack_hash'],
      [{ weekId: '2026-W45' }, 'overlay_identity'],
      [{ lang: 'es' }, 'overlay_identity'],
      [{ schema: 'something-else' }, 'overlay_schema:something-else'],
    ] as const) {
      const result = spireApplyExpandedOverlay(base, { ...raw, ...patch });
      expect([result.applied, result.reason]).toEqual([0, reason]);
      expect(result.pack).toBe(base);
    }
    expect(spireApplyExpandedOverlay(base, null).pack).toBe(base);
    // сервер тоже не строит накладку по чужому отпечатку
    const wrong = overlayFor(built.json, 'sp1_other_pack_hash');
    expect(wrong.ok ? 'ok' : wrong.reason).toBe('pack_hash_mismatch');
  });

  it('битое задание в накладке пропускается одно, остальные слоты подменяются', () => {
    const built = builtPack();
    const overlay = overlayFor(built.json, built.pack.packHash);
    expect(overlay.ok).toBe(true);
    if (!overlay.ok) return;
    const base = clientPack(built.json);
    const raw = JSON.parse(overlay.json) as { tasks: Record<string, { payload: Record<string, unknown> }>; slots: unknown[][] };
    const brokenId = String(raw.slots[0][4]);
    const affected = raw.slots.filter((slot) => slot[4] === brokenId).length;
    raw.tasks[brokenId] = { ...raw.tasks[brokenId], payload: { ...raw.tasks[brokenId].payload, exercise: {} } };
    const result = spireApplyExpandedOverlay(base, raw);
    expect(result.skipped).toBe(affected);
    expect(result.applied).toBe(overlay.stats.slots - affected);
    expect(result.reason).toBe(`task_invalid:${brokenId}`);
  });

  it('задание, снятое оператором, в накладку не попадает; пустой пул и выключатель дают отказ с причиной', () => {
    const built = builtPack();
    const full = overlayFor(built.json, built.pack.packHash);
    expect(full.ok).toBe(true);
    if (!full.ok) return;
    const banned = Object.keys(full.overlay.tasks).slice(0, 5);
    const filtered = overlayFor(built.json, built.pack.packHash, { excludedTaskIds: banned });
    expect(filtered.ok).toBe(true);
    if (!filtered.ok) return;
    for (const taskId of banned) expect(filtered.overlay.tasks[taskId]).toBeUndefined();
    const empty = overlayFor(built.json, built.pack.packHash, { tasks: [] });
    expect(empty.ok ? 'ok' : empty.reason).toBe('expanded_pool_empty');
    const off = overlayFor(built.json, built.pack.packHash, { perSet: 0 });
    expect(off.ok ? 'ok' : off.reason).toBe('overlay_disabled');
    const foreign = overlayFor(built.json, built.pack.packHash, { tasks: realPool('es').slice(0, 3) });
    expect(foreign.ok ? 'ok' : foreign.reason).toBe('expanded_task_invalid');
  });
});
