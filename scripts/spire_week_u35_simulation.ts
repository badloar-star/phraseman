// ═══════════════════════════════════════════════════════════════════════════
// U35 «Итог недели»: симуляция случая с шестым местом (11.11.2026).
//
// зачем (владелец, U35): «разобрать случай с шестым местом, проверить, какие заработанные за неделю монеты дошли
// до расчёта и почему показано это место, симулировать закрытие недели и повторные запросы». Данных самого случая в
// репозитории нет, поэтому прогоняем НАСТОЯЩИЙ серверный код (журнал монет, заморозка комнаты, крон, выплата) и
// настоящую сборку строк экрана на фейковой базе в памяти: в прод ничего не пишется и не читается.
//
// Запуск (лёгкий, без jest и без слота светофора):
//   node_modules/.bin/tsx scripts/spire_week_u35_simulation.ts
//
// Суммы за уроки/подарки — условные (правила начисления практики здесь не проверяются); суммы за ступени — настоящие
// (spireStepCoinOps). Проверяется ДОРОГА монет: какие попадают в «монеты недели» и в какой момент.
// ═══════════════════════════════════════════════════════════════════════════
import { freezeSpireRoom } from '../functions/src/spire_finalization_freeze';
import { runSpireFinalizeCronHandler, spirePreviousWeek } from '../functions/src/spire_finalize_cron';
import { computeSpireRoomResults } from '../functions/src/spire_finalize_core';
import { SPIRE_CONFIG_DEFAULTS, spireConfigStatus, spireEffectiveRankBy } from '../functions/src/spire_config_contract';
import { spireStepCoinOps } from '../functions/src/spire_coins';
import { getWeekKey, isoDateUtc } from '../functions/src/progress_events';
import {
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  starsWeekEarned,
  type StarOpReason,
  type StarOpRequest,
} from '../functions/src/stars_ledger';
import { spireBuildRoomRows, spireDecodeRoomMembers, spireMyPlace } from '../modules/spire/room_rows';

type Doc = Record<string, unknown>;
const clone = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const out: string[] = [];
const say = (line = ''): void => { out.push(line); };

// ── Фейковая база: копия оптимистичной in-memory базы из functions/src/spire_finalize_cron.test.ts ──────────────────
function statefulFirestore(seed: Record<string, Doc>) {
  const docs = new Map(Object.entries(seed).map(([path, value]) => [path, clone(value)]));
  const versions = new Map([...docs.keys()].map((path) => [path, 1]));
  let transactionCalls = 0;
  let failTransactionAt = -1;
  const merge = (before: Doc, patch: Doc): Doc => {
    const next = clone(before);
    const apply = (target: Doc, source: Doc): void => {
      for (const [key, value] of Object.entries(source)) {
        const parts = key.split('.');
        let node = target;
        for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as Doc;
        const leaf = parts[parts.length - 1];
        // зачем: set(merge) в Firestore сливает вложенные карты (spireTiers.{lang}), а не затирает их целиком.
        if (value && typeof value === 'object' && !Array.isArray(value) && node[leaf] && typeof node[leaf] === 'object' && !Array.isArray(node[leaf])) apply(node[leaf] as Doc, value as Doc);
        else node[leaf] = value;
      }
    };
    apply(next, clone(patch));
    return next;
  };
  const write = (path: string, value: Doc, shouldMerge = false): void => {
    docs.set(path, shouldMerge ? merge(docs.get(path) ?? {}, value) : clone(value));
    versions.set(path, (versions.get(path) ?? 0) + 1);
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ref = (path: string): any => ({
    path,
    id: path.split('/').at(-1),
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
    get: async () => snap(path),
    set: async (data: Doc, options?: { merge?: boolean }) => write(path, data, options?.merge === true),
    update: async (data: Doc) => write(path, data, true),
  });
  const snap = (path: string): any => ({
    id: path.split('/').at(-1), ref: ref(path), exists: docs.has(path),
    data: () => clone(docs.get(path)),
    get: (field: string) => clone((docs.get(path) ?? {})[field]),
  });
  const collection = (name: string): any => {
    const filters: Array<[string, unknown]> = [];
    let after = '';
    const query: any = {
      doc: (id: string) => ref(`${name}/${id}`),
      where: (field: string, _op: string, value: unknown) => { filters.push([field, value]); return query; },
      orderBy: () => query,
      limit: () => query,
      startAfter: (last: { id: string }) => { after = last.id; return query; },
      get: async () => {
        const rows = [...docs.entries()]
          .filter(([path]) => path.startsWith(`${name}/`) && path.split('/').length === 2)
          .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
          .filter(([path]) => path.split('/')[1] > after)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path]) => snap(path));
        return { empty: rows.length === 0, docs: rows, size: rows.length };
      },
    };
    return query;
  };
  const db: any = {
    collection,
    collectionGroup: (name: string) => {
      let field = '';
      let value: unknown;
      const query: any = {
        where: (nextField: string, _op: string, nextValue: unknown) => { field = nextField; value = nextValue; return query; },
        limit: () => query,
        get: async () => {
          const rows = [...docs.entries()].filter(([path, data]) => path.includes(`/${name}/`) && data[field] === value).slice(0, 1).map(([path]) => snap(path));
          return { empty: rows.length === 0, docs: rows, size: rows.length };
        },
        __queryGet: async () => query.get(),
      };
      return query;
    },
    getAll: async (...args: unknown[]) => (args.filter((arg) => typeof arg === 'object' && arg && 'path' in (arg as object)) as Array<{ path: string }>).map((r) => snap(r.path)),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      transactionCalls += 1;
      if (transactionCalls === failTransactionAt) throw new Error('injected-failure');
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const reads = new Map<string, number>();
        const writes: Array<() => void> = [];
        const tx = {
          get: async (r: { path?: string; __queryGet?: () => Promise<unknown> }) => {
            if (r.__queryGet) return r.__queryGet();
            const path = String(r.path);
            reads.set(path, versions.get(path) ?? 0);
            return snap(path);
          },
          create: (r: { path: string }, data: Doc) => writes.push(() => { if (docs.has(r.path)) throw new Error('already-exists'); write(r.path, data); }),
          set: (r: { path: string }, data: Doc, options?: { merge?: boolean }) => writes.push(() => write(r.path, data, options?.merge === true)),
          update: (r: { path: string }, data: Doc) => writes.push(() => write(r.path, data, true)),
        };
        const result = await fn(tx);
        if ([...reads].some(([path, version]) => (versions.get(path) ?? 0) !== version)) continue;
        writes.forEach((op) => op());
        return result;
      }
      throw new Error('transaction-contention');
    },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { db, docs, write, failNextTransaction: (offset: number) => { failTransactionAt = transactionCalls + offset; } };
}

// ── Неделя и участники ─────────────────────────────────────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const HOUR = 3_600_000;
const CRON_AT = Date.UTC(2026, 10, 9, 0, 1); // понедельник 09.11.2026 00:01 UTC — запуск spireFinalizeCron
const { weekId: WEEK, weekStartMs: WEEK_START } = spirePreviousWeek(CRON_AT); // 2026-W45: 02.11–08.11
const LANG = 'en';
const ME = 'me';
const NEIGHBOURS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
const ALL = [ME, ...NEIGHBOURS];
const weekKeyAt = (ms: number): string => getWeekKey(isoDateUtc(new Date(ms)));
const stamp = (ms: number): string => new Date(ms).toISOString().replace('T', ' ').slice(5, 16);

type Fake = ReturnType<typeof statefulFirestore>;

function seedWorld(configPatch: Doc | null): Fake {
  const members: Doc = {};
  for (const uid of ALL) members[uid] = { name: uid === ME ? 'Я' : uid.toUpperCase(), steps: 0, reachedAtMs: 0, totalMs: 0, joinedAtMs: WEEK_START + HOUR, coinRank: 3, weekCoins: 0 };
  const seed: Record<string, Doc> = {
    'spire_groups/g1': { weekId: WEEK, lang: LANG, tier: 3, weekStartMs: WEEK_START, cohortDay: 0, open: true, liveMemberCount: ALL.length, members },
  };
  if (configPatch) seed['config/spire_v1'] = { ...SPIRE_CONFIG_DEFAULTS, enabled: true, ...configPatch };
  for (const uid of ALL) seed[`users/${uid}`] = { stars: {} };
  return statefulFirestore(seed);
}

/** Одна операция журнала тем же путём, что и боевые начисления (prepare → commit в транзакции). */
async function ledger(fake: Fake, uid: string, serverNowMs: number, op: Readonly<{ id: string; delta: number; reason: StarOpReason; earnedAtMs?: number }>, backdate = false): Promise<void> {
  const request: StarOpRequest = { opId: op.id, delta: op.delta, reason: op.reason, sourceKind: 'u35_sim', sourceId: op.id.split(':')[1], ruleVersion: 1, earnedAtMs: op.earnedAtMs ?? serverNowMs };
  await applyOps(fake, uid, serverNowMs, [request], backdate);
}

async function applyOps(fake: Fake, uid: string, serverNowMs: number, ops: readonly StarOpRequest[], backdate = false): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await fake.db.runTransaction(async (tx: any) => {
    beginStarLedgerTransactionAttempt(tx);
    const userSnap = await tx.get(fake.db.collection('users').doc(uid));
    const prepared = await prepareStarOperations(tx, fake.db, uid, userSnap, ops, {
      nowMs: serverNowMs,
      activeSeasonId: '',
      weekKeyNow: weekKeyAt(serverNowMs),
      // зачем: только practice_rune_grant.ts датирует операцию задним числом (weekKeyForMs) — остальные кладут в неделю СЕРВЕРА.
      ...(backdate ? { weekKeyForMs: weekKeyAt } : {}),
      authUid: uid,
    });
    const rejected = prepared.outcomes.filter((o) => o.status === 'rejected');
    if (rejected.length > 0) throw new Error(`ledger rejected ${uid}: ${rejected.map((o) => `${o.opId}=${o.errorCode}`).join(',')}`);
    commitStarOperations(tx, prepared);
  });
}

const starsOf = (fake: Fake, uid: string) => normalizeStars((fake.docs.get(`users/${uid}`) as Doc | undefined)?.stars);
const weekCoinsOf = (fake: Fake, uid: string): number => starsWeekEarned(starsOf(fake, uid), WEEK);

/** Заход в Пик / отчёт о ступени: сервер обновляет СНИМОК монет недели в комнате (spire_groups.ts:315, spire_progress.ts:324). */
function refreshRoomSnapshot(fake: Fake, uid: string, steps?: number, atMs?: number): void {
  const room = clone(fake.docs.get('spire_groups/g1') as Doc);
  const member = (room.members as Record<string, Doc>)[uid];
  member.weekCoins = weekCoinsOf(fake, uid);
  if (steps !== undefined) { member.steps = steps; member.reachedAtMs = atMs ?? 0; member.totalMs = steps * 90_000; }
  fake.write('spire_groups/g1', room);
}

/** Ступени Пика: настоящие операции spireStepCoinOps + снимок комнаты, как в spire_progress.ts. */
async function climb(fake: Fake, uid: string, atMs: number, fromSteps: number, toSteps: number): Promise<number> {
  const plan = spireStepCoinOps({ lang: LANG, weekKey: weekKeyAt(atMs), fromSteps, toSteps, coins: SPIRE_CONFIG_DEFAULTS.coins, earnedAtMs: atMs });
  await applyOps(fake, uid, atMs, plan.ops);
  refreshRoomSnapshot(fake, uid, toSteps, atMs);
  return plan.total;
}

/** Место на экране комнаты — настоящая сборка строк клиента; экран всегда сортирует по монетам (spire_rank_by_resolve.ts:16). */
function screenPlace(fake: Fake, opts: Readonly<{ myLocalSteps: number }>): { place: number | null; rows: string } {
  const room = fake.docs.get('spire_groups/g1') as Doc;
  const rows = spireBuildRoomRows({
    room: { schema: 'spire-room-cache.v1', uid: ME, lang: LANG, weekId: WEEK, groupId: 'g1', tier: 3, cohortDay: 0, weekStartMs: WEEK_START, members: spireDecodeRoomMembers(room.members), roster: [], fetchedAtMs: 0 },
    myUid: ME,
    mySteps: opts.myLocalSteps,
    myReachedAtMs: WEEK_START + DAY,
    nowMs: WEEK_START + 6 * DAY,
    tuning: SPIRE_CONFIG_DEFAULTS.residents,
    rankBy: 'coins',
    myAuthoritativeWeekCoins: weekCoinsOf(fake, ME),
  });
  return { place: spireMyPlace(rows), rows: rows.map((r, i) => `${i + 1}.${r.isMe ? 'Я' : r.uid}=${r.weekCoins}`).join('  ') };
}

const resultOf = (fake: Fake, uid: string): Doc | undefined => fake.docs.get(`users/${uid}/spire_week_results/${WEEK}_${LANG}`) as Doc | undefined;
function describeResult(r: Doc | undefined): string {
  if (!r) return 'ДОКУМЕНТА ИТОГА НЕТ';
  const ladder = Array.isArray(r.ladder) ? (r.ladder as Doc[]).map((row) => `${row.place}.${row.isMe ? 'Я' : row.name}=${row.coins}м/${row.steps}ст`).join('  ') : '—';
  return `место ${r.roomRank} из ${r.roomTotal} · считали по: ${r.rankBy === 'coins' ? 'монетам' : 'СТУПЕНЯМ'} · монеты недели ${r.weekCoins} · ступени ${r.steps} · ${r.promoted ? 'вверх' : r.demoted ? 'вниз' : 'остаётся'} · награда ${(r.rewardCoins as Doc).total} (${r.rewardStatus})\n      лестница: ${ladder}`;
}

// ── Сценарий недели: что я заработал и что видел ───────────────────────────────────────────────────────────────────
type Trail = { line: string; counted: number; wallet: number };

async function playWeek(fake: Fake): Promise<{ trail: Trail[]; mySteps: number }> {
  const trail: Trail[] = [];
  const note = (when: number, what: string, delta: number, before: number): void => {
    const counted = weekCoinsOf(fake, ME) - before;
    trail.push({ line: `  ${stamp(when)}  ${what.padEnd(58)} кошелёк +${String(delta).padStart(4)}   в «монеты недели» +${String(counted).padStart(4)}${counted === delta ? '' : counted === 0 ? '   ← НЕ ДОШЛО' : '   ← ЧАСТИЧНО'}`, counted, wallet: delta });
  };

  // Соседи: в начале недели заходили в Пик (снимок маленький), потом зарабатывали в уроках и в Пик не возвращались.
  const neighbourPlan: Record<string, { early: number; later: number; steps: number }> = {
    n1: { early: 400, later: 2000, steps: 6 }, n2: { early: 300, later: 1600, steps: 2 }, n3: { early: 250, later: 1250, steps: 1 },
    n4: { early: 200, later: 900, steps: 0 }, n5: { early: 100, later: 700, steps: 0 }, n6: { early: 300, later: 0, steps: 25 }, n7: { early: 0, later: 0, steps: 0 },
  };
  for (const [uid, plan] of Object.entries(neighbourPlan)) {
    if (plan.early > 0) await ledger(fake, uid, WEEK_START + 5 * HOUR, { id: `practice_session:${uid}_early`, delta: plan.early, reason: 'practice_session' });
    refreshRoomSnapshot(fake, uid, plan.steps, WEEK_START + 6 * HOUR); // последний заход в Пик — понедельник
    if (plan.later > 0) await ledger(fake, uid, WEEK_START + 4 * DAY, { id: `practice_session:${uid}_later`, delta: plan.later, reason: 'practice_session' }); // без захода в Пик: снимок НЕ обновился
  }

  // Я.
  let t = WEEK_START + DAY + 10 * HOUR;
  let before = weekCoinsOf(fake, ME);
  const stepCoins = await climb(fake, ME, t, 0, 12);
  note(t, 'Пик: 12 ступеней (ступени + этажи, заработок)', stepCoins, before);

  t = WEEK_START + 2 * DAY + 9 * HOUR; before = weekCoinsOf(fake, ME);
  await ledger(fake, ME, t, { id: 'practice_session:me_lessons', delta: 450, reason: 'practice_session' });
  note(t, 'Уроки и тренировки (заработок)', 450, before);

  t = WEEK_START + 3 * DAY + 20 * HOUR; before = weekCoinsOf(fake, ME);
  await ledger(fake, ME, t, { id: 'video_watch:me_w45', delta: 90, reason: 'video_watch' });
  note(t, 'Просмотр видео (подарок, не заработок)', 90, before);

  t += HOUR; before = weekCoinsOf(fake, ME);
  await ledger(fake, ME, t, { id: 'global_broadcast:me_w45', delta: 300, reason: 'global_broadcast' });
  note(t, 'Награда из рассылки (подарок)', 300, before);

  t += HOUR; before = weekCoinsOf(fake, ME);
  await ledger(fake, ME, t, { id: 'referral_ladder:me_w45', delta: 500, reason: 'referral_ladder' });
  note(t, 'Бонус за приглашённого друга (подарок)', 500, before);

  t += HOUR; before = weekCoinsOf(fake, ME);
  await ledger(fake, ME, t, { id: 'level_spin:me_w45', delta: 200, reason: 'level_spin_grant' });
  note(t, 'Колесо уровня (подарок)', 200, before);

  refreshRoomSnapshot(fake, ME); // я заходил в Пик в воскресенье вечером — свой снимок свежий
  return { trail, mySteps: 12 };
}

async function main(): Promise<void> {
  say(`U35 · симуляция итога недели ${WEEK} (язык ${LANG}, комната 8 живых, этаж 3). Крон: ${stamp(CRON_AT)} UTC.`);
  say('');

  // ════ A. Рубильник сервера rankBy='coins' ════
  say('══ A. Сервер считает по монетам (config/spire_v1.rankBy = "coins") ══');
  const a = seedWorld({ rankBy: 'coins' });
  const week = await playWeek(a);
  say('Что я заработал за неделю и что из этого попало в «монеты недели» (stars.weekEarned):');
  week.trail.forEach((row) => say(row.line));
  const walletTotal = week.trail.reduce((sum, row) => sum + row.wallet, 0);
  say(`  ИТОГО в кошельке за неделю +${walletTotal}, из них в расчёт места идёт ${weekCoinsOf(a, ME)}.`);
  say('');

  const sunday = screenPlace(a, { myLocalSteps: week.mySteps });
  say(`Экран комнаты в воскресенье вечером: я на ${sunday.place} месте.`);
  say(`      ${sunday.rows}`);
  say('      (у соседей — СНИМОК монет на их последний заход в Пик; что они заработали в уроках после, экран не знает)');
  say('Что на самом деле лежит в журнале у каждого (это и возьмёт крон):');
  say(`      ${ALL.map((uid) => `${uid === ME ? 'Я' : uid}=${weekCoinsOf(a, uid)}`).join('  ')}`);
  say('');

  // Урок, пройденный в воскресенье 22:00 без сети — дойдёт до сервера только в понедельник 00:20.
  const lateEarnedAt = WEEK_START + 6 * DAY + 22 * HOUR;
  const lateSyncAt = CRON_AT + 19 * 60_000;

  // Первый запуск крона: вторая выплата падает (сбой сети) → прогон «не завершён», Cloud Scheduler повторит.
  a.failNextTransaction(3); // 1 = заморозка комнаты, 2 = первая выплата, 3 = вторая выплата
  const realNow = Date.now;
  Date.now = () => CRON_AT;
  let firstRun = 'ok';
  try { await runSpireFinalizeCronHandler(a.db, CRON_AT); } catch (error) { firstRun = String((error as Error).message); }
  say(`Крон, запуск 1 (${stamp(CRON_AT)}): ${firstRun === 'ok' ? 'завершён' : `упал с «${firstRun}» (одна выплата не прошла) — комната не отмечена подведённой`}`);
  say(`  мой итог: ${describeResult(resultOf(a, ME))}`);
  const frozenHash = resultOf(a, ME)?.decisionHash;
  const firstRank = resultOf(a, ME)?.roomRank;

  // Поздний урок приходит ПОСЛЕ заморозки.
  let before = weekCoinsOf(a, ME);
  await ledger(a, ME, lateSyncAt, { id: 'practice_session:me_offline_sunday', delta: 400, reason: 'practice_session', earnedAtMs: lateEarnedAt }, true);
  say('');
  say(`${stamp(lateSyncAt)}: дошёл урок, пройденный без сети в воскресенье ${stamp(lateEarnedAt).slice(6)} (+400).`);
  say(`  журнал положил его в прошлую неделю: монеты недели ${before} → ${weekCoinsOf(a, ME)} (у n5 — ${weekCoinsOf(a, 'n5')}). По этим цифрам я был бы уже выше n5.`);

  // Повтор крона — новая (незакоммиченная) версия с заморозкой.
  Date.now = () => CRON_AT + 30 * 60_000;
  let secondRun = 'ok';
  let summary: Record<string, number> = {};
  try { summary = await runSpireFinalizeCronHandler(a.db, CRON_AT + 30 * 60_000); } catch (error) { secondRun = String((error as Error).message); }
  say('');
  say(`Крон, запуск 2 — РАБОЧАЯ КОПИЯ (заморозка, ещё не выложена): ${secondRun === 'ok' ? `завершён, комнат подведено ${summary.rooms}` : secondRun}`);
  say(`  мой итог: ${describeResult(resultOf(a, ME))}`);
  say(`  решение то же самое, что в запуске 1: ${resultOf(a, ME)?.decisionHash === frozenHash ? 'ДА (отпечаток совпал)' : 'НЕТ'}; место ${firstRank} → ${resultOf(a, ME)?.roomRank}. Поздние 400 монет в расчёт НЕ попали.`);
  let thirdRun = 'ok';
  try { summary = await runSpireFinalizeCronHandler(a.db, CRON_AT + 60 * 60_000); } catch (error) { thirdRun = String((error as Error).message); }
  say(`Крон, запуск 3 (лишний повтор): ${thirdRun === 'ok' ? `комнат подведено ${summary.rooms}, пропущено как готовые ${summary.skipped}` : thirdRun}; место ${resultOf(a, ME)?.roomRank}; расписок выплат у победителя: ${[...a.docs.keys()].filter((p) => p.startsWith('users/n1/star_operations/spire_week:')).length}.`);

  // Тот же повтор — логика ВЫЛОЖЕННОЙ версии (HEAD): незавершённая комната пересчитывается заново по свежему журналу.
  const room = a.docs.get('spire_groups/g1') as Doc;
  const config = spireConfigStatus(a.docs.get('config/spire_v1')).config;
  const freshCoins: Record<string, number> = {};
  for (const uid of ALL) freshCoins[uid] = weekCoinsOf(a, uid);
  const recomputed = computeSpireRoomResults({
    groupId: 'g1', tier: 3, weekStartMs: WEEK_START, cohortDay: 0, members: room.members as Record<string, unknown>,
    coins: config.coins, tuning: config.residents, rankBy: spireEffectiveRankBy(config, WEEK), weekCoinsByUid: freshCoins, weekCoinsCap: config.weekCoinsCap,
  });
  say('');
  say('Тот же повтор — ВЫЛОЖЕННАЯ версия крона (functions/lib от 05.11: итог незавершённой комнаты пишется заново):');
  say(`  мой итог после повтора: место ${recomputed.results[ME].roomRank} (было ${firstRank}), монеты недели ${recomputed.results[ME].weekCoins}; n5: место ${recomputed.results.n5.roomRank}.`);
  say('  → человек, открывший приложение между запусками, увидел одно место, а в документе потом лежит другое.');
  say('');

  // ════ B. Рубильник сервера не 'coins' ════
  say('══ B. Та же неделя, но config/spire_v1 без rankBy="coins" (поля нет, "steps" или конфиг не прочитался) ══');
  const b = seedWorld({});
  const weekB = await playWeek(b);
  const sundayB = screenPlace(b, { myLocalSteps: weekB.mySteps });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frozenB = await freezeSpireRoom(b.db, (b.db as any).collection('spire_groups').doc('g1'), WEEK_START);
  say(`Экран в воскресенье (клиент ВСЕГДА сортирует по монетам): я на ${sundayB.place} месте.`);
  say(`Заморозка: ${frozenB.status}; сервер выбрал режим «${frozenB.freeze?.rankBy}».`);
  say(`  мой итог: ${describeResult(resultOf(b, ME))}`);
  say('');

  // ════ C. Один участник удаляет аккаунт ════
  say('══ C. Режим монет, но один сосед в момент крона удаляет аккаунт / сливает профиль ══');
  const c = seedWorld({ rankBy: 'coins' });
  await playWeek(c);
  c.write('users/n7', { ...(c.docs.get('users/n7') as Doc), identityHidden: true });
  Date.now = () => CRON_AT;
  const warn = console.warn; const log = console.log;
  console.warn = () => undefined; console.log = () => undefined;
  const attempts: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    try { await runSpireFinalizeCronHandler(c.db, CRON_AT + i * 60_000); attempts.push('ok'); } catch (error) { attempts.push(String((error as Error).message)); }
  }
  console.warn = warn; console.log = log;
  say(`4 запуска крона (1 + 3 повтора планировщика): ${attempts.join(' | ')}`);
  say(`  мой итог: ${describeResult(resultOf(c, ME))}; итогов в комнате записано: ${[...c.docs.keys()].filter((p) => p.includes('/spire_week_results/')).length} из ${ALL.length}.`);
  say('  → комната остаётся без итога навсегда: следующий понедельник крон смотрит уже другую неделю.');

  Date.now = realNow;
  process.stdout.write(`${out.join('\n')}\n`);
}

const quietLog = console.log; const quietWarn = console.warn; const quietError = console.error;
console.log = () => undefined; console.warn = () => undefined; console.error = () => undefined; // зачем: журналы крона/выплат не должны тонуть в отчёте; сам отчёт идёт через process.stdout
main().then(() => { console.log = quietLog; console.warn = quietWarn; console.error = quietError; }).catch((error) => {
  process.stdout.write(`${out.join('\n')}\n`);
  process.stderr.write(`СИМУЛЯЦИЯ УПАЛА: ${String((error as Error)?.stack ?? error)}\n`);
  process.exitCode = 1;
});
