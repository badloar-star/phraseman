// ═══════════════════════════════════════════════════════════════════════════
// Симуляция недели Шпиля (координатор 11.10, ledger п.58) — без записи в прод: только чистые функции
// с фейковыми данными. Каждый сценарий печатает строку «сценарий | факт» в общий отчёт (SPIRE-SIM),
// утверждения — только на подтверждённые правила. Найденные дефекты помечены it.todo-описанием в отчёте,
// а не красным тестом: правка сервера ждёт выкладки (TS2352 у Codex), отчёт — docs/phraseman-2.0/SPIRE_SIMULATION_2026-10-11.md.
// ═══════════════════════════════════════════════════════════════════════════
import { computeSpireRoomResults, type SpireRoomFinalizeInput } from './spire_finalize_core';
import { spireLiveZoneSize, spireWeekStartMs, spireCohortDay } from './spire_residents';
import { spireWeekId, resolveSpireTier, savedSpireGroupId } from './spire_groups';
import { spirePreviousWeek } from './spire_finalize_cron';
import { getWeekKey, isoDateUtc } from './progress_events';
import { spirePackWeekIdAt, loadMultilingualPool } from './spire_pack_build';
import { buildSpireWeekResultCopy } from './spire_week_result_push';
import { buildSpireZoneWarningCopy } from './spire_zone_warning_push';
import { spireConfigStatus } from './spire_config_contract';

const facts: string[] = [];
const fact = (scenario: string, text: string): void => { facts.push(`${scenario} | ${text}`); };
afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[SPIRE-SIM]\n${facts.join('\n')}`);
});

const config = spireConfigStatus(null).config;
const WEEK_START = Date.UTC(2026, 9, 5); // понедельник 05.10.2026 00:00 UTC

type M = { steps: number; reachedAtMs?: number; totalMs?: number; joinedAtMs?: number };
function room(tier: number, members: Record<string, M>, cohortDay = 0): ReturnType<typeof computeSpireRoomResults> {
  const input: SpireRoomFinalizeInput = {
    groupId: `sim_t${tier}`,
    tier,
    weekStartMs: WEEK_START,
    cohortDay,
    members: Object.fromEntries(Object.entries(members).map(([uid, m]) => [uid, {
      steps: m.steps,
      reachedAtMs: m.reachedAtMs ?? (m.steps > 0 ? WEEK_START + 1000 * (100 - m.steps) : 0),
      totalMs: m.totalMs ?? m.steps * 90_000,
      joinedAtMs: m.joinedAtMs ?? WEEK_START + cohortDay * 86_400_000,
    }])),
    coins: config.coins,
    tuning: config.residents,
  };
  return computeSpireRoomResults(input);
}
const moves = (out: ReturnType<typeof computeSpireRoomResults>) =>
  Object.entries(out.results).map(([uid, r]) => `${uid}:${r.steps}ст→${r.promoted ? '↑' : r.demoted ? '↓' : '='}`).join(' ');

describe('1) финализация недели', () => {
  it('размер зоны от числа живых (база — комната с ботами)', () => {
    const sizes = [1, 2, 3, 5, 8, 10, 15, 20, 30].map((n) => `${n}→${spireLiveZoneSize(n)}`).join(', ');
    fact('1 зона', `живых→зона: ${sizes}`);
    expect(spireLiveZoneSize(0)).toBe(0);
  });

  it('полная комната 30 живых: верх 15% вверх, низ 15% вниз', () => {
    const members: Record<string, M> = {};
    for (let i = 1; i <= 30; i++) members[`u${String(i).padStart(2, '0')}`] = { steps: 31 - i };
    const out = room(5, members);
    const up = Object.values(out.results).filter((r) => r.promoted).length;
    const down = Object.values(out.results).filter((r) => r.demoted).length;
    fact('1 полная комната', `30 живых, зона ${out.zoneSize}: вверх ${up}, вниз ${down}, остались ${30 - up - down}`);
    expect(up).toBe(out.zoneSize);
    expect(down).toBe(out.zoneSize);
  });

  it('все без ступеней вниз, если кто-то играл; тихая комната никого не понижает', () => {
    const mixed = room(5, { a: { steps: 10 }, b: { steps: 0 }, c: { steps: 0 }, d: { steps: 4 } });
    fact('1 нули', `комната с игравшими: ${moves(mixed)}`);
    expect(mixed.results.b.demoted).toBe(true);
    const quiet = room(5, { a: { steps: 0 }, b: { steps: 0 } });
    fact('1 тихая комната', `никто не играл: ${moves(quiet)}`);
    expect(Object.values(quiet.results).every((r) => !r.demoted && !r.promoted)).toBe(true);
  });

  it('ничья на границе зоны: ничья по ступеням решается временем; полная ничья делит место', () => {
    const members: Record<string, M> = {};
    for (let i = 1; i <= 30; i++) members[`u${String(i).padStart(2, '0')}`] = { steps: 100 - i };
    // 5-е и 6-е места — одинаковые ступени, 6-й добрался раньше → он выше
    // u01..u04 — 99..96 ступеней; u05 и u06 — по 95 (граница зоны 5), остальные ниже.
    members.u05 = { steps: 95, reachedAtMs: WEEK_START + 5000, totalMs: 1000 };
    members.u06 = { steps: 95, reachedAtMs: WEEK_START + 4000, totalMs: 1000 };
    const byTime = room(5, members);
    fact('1 ничья по времени', `u05 (позже) ${byTime.results.u05.promoted ? '↑' : '='} ранг ${byTime.results.u05.liveRank}; u06 (раньше) ${byTime.results.u06.promoted ? '↑' : '='} ранг ${byTime.results.u06.liveRank}`);
    expect(byTime.results.u06.promoted).toBe(true);
    expect(byTime.results.u05.promoted).toBe(false);
    members.u05 = { steps: 95, reachedAtMs: WEEK_START + 4000, totalMs: 1000 };
    const full = room(5, members);
    const promotedCount = Object.values(full.results).filter((r) => r.promoted).length;
    fact('1 полная ничья', `u05 и u06 полностью равны на 5-м месте: повышено ${promotedCount} при зоне ${full.zoneSize} (оба ранг ${full.results.u05.liveRank})`);
  });

  it('маленькие комнаты 1–3 человека и пустая', () => {
    fact('1 один', moves(room(5, { solo: { steps: 3 } })));
    fact('1 один без ступеней', moves(room(5, { solo: { steps: 0 } })));
    fact('1 двое', moves(room(5, { a: { steps: 5 }, b: { steps: 0 } })));
    fact('1 трое', moves(room(5, { a: { steps: 5 }, b: { steps: 3 }, c: { steps: 1 } })));
    fact('1 восемь (все играли)', moves(room(5, Object.fromEntries([8, 7, 6, 5, 4, 3, 2, 1].map((s, i) => [`p${i + 1}`, { steps: s }])))));
    const empty = room(5, {});
    fact('1 пустая', `живых ${empty.liveTotal}, зона ${empty.zoneSize}, итогов ${Object.keys(empty.results).length}`);
    expect(Object.keys(empty.results)).toHaveLength(0);
  });
});

describe('2) крайние этажи и новичок', () => {
  it('верхний этаж: лидер не повышается и не понижается; нижний: не понижается', () => {
    const top = room(11, { a: { steps: 9 }, b: { steps: 0 } });
    fact('2 Алмаз', `${moves(top)}; монеты лидера ${top.results.a.rewardCoins.total} (бонус повышения ${top.results.a.rewardCoins.promotion})`);
    expect(top.results.a.newTier).toBe(11);
    const bottom = room(0, { a: { steps: 9 }, b: { steps: 0 } });
    fact('2 Гранит', `${moves(bottom)}; b остаётся на ${bottom.results.b.newTier}`);
    expect(bottom.results.b.newTier).toBe(0);
  });
  it('новичок без этажа — Гранит', () => {
    fact('2 новичок', `leaderboard без spireTiers → этаж ${resolveSpireTier(undefined, 'en')}; с {es:4} для en → ${resolveSpireTier({ spireTiers: { es: 4 } }, 'en')}`);
    expect(resolveSpireTier(undefined, 'en')).toBe(0);
  });
});

describe('3) вход посреди недели, в последний час; вернулся через 2–3 недели', () => {
  it('когорта по дню входа; сохранённая комната старой недели не подхватывается', () => {
    const wed = WEEK_START + 2 * 86_400_000 + 3600_000;
    const lastHour = WEEK_START + 7 * 86_400_000 - 30 * 60_000;
    fact('3 когорта', `среда → cohortDay ${spireCohortDay(wed)}; вс 23:30 UTC → cohortDay ${spireCohortDay(lastHour)}`);
    const lb = { spireGroups: { en: { groupId: 'old', weekId: spireWeekId(new Date(WEEK_START)), tier: 3, cohortDay: 0 } } };
    const threeWeeksLater = spireWeekId(new Date(WEEK_START + 21 * 86_400_000));
    fact('3 вернулся', `сохранённая комната недели ${lb.spireGroups.en.weekId}, сейчас ${threeWeeksLater} → savedSpireGroupId = ${String(savedSpireGroupId(lb, 'en', threeWeeksLater))} (новый вход в текущую неделю)`);
    expect(savedSpireGroupId(lb, 'en', threeWeeksLater)).toBeNull();
    // D61 (🟡 №2 симуляции, исправлено 12.10): вошедший в последние 10 минут без ступеней не понижается.
    const weekEnd = WEEK_START + 7 * 86_400_000;
    const lateJoiner = room(4, {
      early: { steps: 12 },
      late: { steps: 0, joinedAtMs: weekEnd - 5 * 60_000 },
      idle: { steps: 0, joinedAtMs: weekEnd - 3 * 3_600_000 },
    }, 6);
    fact('3 вход в последние 10 минут', `этаж 4: late (вс 23:55) ${lateJoiner.results.late.demoted ? '↓ БАГ' : '= OK'} protected=${lateJoiner.results.late.lateJoinProtected}; idle (вс 21:00, 0 ступеней) ${lateJoiner.results.idle.demoted ? '↓' : '='}`);
    expect(lateJoiner.results.late.demoted).toBe(false);
    expect(lateJoiner.results.late.lateJoinProtected).toBe(true);
    expect(lateJoiner.results.idle.demoted).toBe(true);
  });
});

describe('4) граница недели по поясам и летнее время', () => {
  it('ключи недели совпадают у комнат, отчётов, пакетов и крона', () => {
    const probes = [
      Date.UTC(2026, 9, 11, 23, 59, 59), Date.UTC(2026, 9, 12, 0, 0, 0),
      Date.UTC(2026, 11, 28, 12), Date.UTC(2027, 0, 1, 12), Date.UTC(2027, 0, 4, 0, 0, 1),
      Date.UTC(2026, 2, 29, 1, 30), Date.UTC(2026, 10, 1, 6, 30),
    ];
    for (const ms of probes) {
      const room = spireWeekId(new Date(ms));
      const report = getWeekKey(isoDateUtc(new Date(ms)));
      const pack = spirePackWeekIdAt(ms);
      expect(report).toBe(room);
      expect(pack).toBe(room);
    }
    fact('4 ключи', `${probes.length} точек (стык недели, стык года 2026→2027, переходы летнего времени ЕС/США): комната = отчёт = пакет`);
    const mon = Date.UTC(2026, 9, 12, 0, 1);
    fact('4 крон', `запуск пн 00:01 UTC подводит ${spirePreviousWeek(mon).weekId} (текущая ${spireWeekId(new Date(mon))})`);
    expect(spirePreviousWeek(mon).weekId).toBe(spireWeekId(new Date(WEEK_START)));
    const local = (tz: string, ms: number) => new Date(ms).toLocaleString('ru-RU', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit' });
    const boundaries = [Date.UTC(2026, 9, 12), Date.UTC(2026, 10, 2)];
    for (const b of boundaries) {
      fact('4 пояса', `граница ${new Date(b).toISOString().slice(0, 10)} UTC: Москва ${local('Europe/Moscow', b)}, Нью-Йорк ${local('America/New_York', b)}, Бали ${local('Asia/Makassar', b)}`);
    }
    expect(spireWeekStartMs(Date.UTC(2026, 9, 11, 23, 59))).toBe(WEEK_START);
  });
});

describe('6) пуши на языке интерфейса', () => {
  it('итог недели и зона вылета по 9 языкам', () => {
    const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    for (const uiLang of langs) {
      const result = buildSpireWeekResultCopy({ uid: 'x', token: 't', uiLang, prevTier: 2, newTier: 3, promoted: true, demoted: false });
      const zone = buildSpireZoneWarningCopy({ uid: 'x', token: 't', uiLang, status: 'demotion_edge' });
      const cyr = /[А-Яа-яЁёІіЇїЄє]/.test(result.body);
      fact('6 пуш', `${uiLang}: итог «${result.body}» ${cyr && uiLang !== 'ru' && uiLang !== 'uk' ? 'БАГ (кириллица)' : 'OK'}; зона «${zone.body}»`);
    }
  });
});

describe('8) пул новой недели', () => {
  it('es/de/fr/it — bundled-пул не пуст', () => {
    for (const lang of ['es', 'de', 'fr', 'it'] as const) {
      const pool = loadMultilingualPool(lang);
      const modes = [...new Set(pool.tasks.map((t) => t.mode))].sort().join(',');
      fact('8 пул', `${lang}: заданий ${pool.tasks.length}, отбраковано ${pool.rejected}, режимы ${modes}${pool.unavailableReason ? `, причина ${pool.unavailableReason}` : ''}`);
      expect(pool.tasks.length).toBeGreaterThan(0);
    }
  });
});

describe('9) язык заданий', () => {
  it('что попадает в видимые поля по режимам (es)', () => {
    const pool = loadMultilingualPool('es');
    const seen = new Set<string>();
    for (const task of pool.tasks) {
      if (seen.has(task.mode)) continue;
      seen.add(task.mode);
      const payload = task.payload as Record<string, unknown>;
      const visible = String(payload.phrase ?? payload.prompt ?? '');
      const explanation = (task.explanation as { ruleNote?: string } | undefined)?.ruleNote ?? '';
      const ruVisible = /[А-Яа-яЁё]/.test(visible);
      fact('9 язык', `${task.mode}: видно «${visible.slice(0, 60)}» ${ruVisible ? '🔴 русский' : 'на изучаемом'}; объяснение «${explanation.slice(0, 50)}» ${/[А-Яа-яЁё]/.test(explanation) ? '🔴 русский' : ''}`);
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});
