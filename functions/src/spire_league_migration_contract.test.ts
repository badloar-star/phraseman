// ═══════════════════════════════════════════════════════════════════════════
// Страж переноса мест лиги в шпили (PM-278; T16, T29, TOWER.md §4.8).
//
// Чистая логика, без Firestore и сети. Фиксирует:
//   • прямое соответствие 12 лиг → 12 шпилей (Медная=0 → Гранит=0 … Высшая=11
//     → Алмаз=11), ни одно место не теряется и не сдвигается;
//   • место уходит только в шпиль ТЕКУЩЕГО языка, остальные — Гранит;
//   • уже записанный шпиль миграция не трогает;
//   • порядок доверия источникам и отказ, пока итог недели лиги не подведён;
//   • откат возвращает «как было» и не стирает то, что поменял итог недели.
// ═══════════════════════════════════════════════════════════════════════════

import {
  LEAGUE_FINALIZATION_GRACE_MS,
  LEAGUE_TIER_COUNT,
  SPIRE_LEAGUE_MIGRATION_SCHEMA,
  SPIRE_TIER_COUNT,
  buildMigrationRecords,
  buildRollbackPlan,
  buildSpireTierPlan,
  hasSpireMigrationMarker,
  leagueIdToSpireTier,
  parseProgressLeagueId,
  readSpireTiers,
  resolveLeagueSource,
  spireMigrationModeFrom,
  spireTierToLeagueId,
} from './spire_league_migration_contract';

// Среда 2026-09-23 12:00 UTC — середина недели W39; прошлая неделя — W38.
const WED = Date.UTC(2026, 8, 23, 12, 0, 0);
// Понедельник 2026-09-28 00:05 UTC — внутри окна подведения итога лиги.
const MON_GRACE = Date.UTC(2026, 8, 28, 0, 5, 0);
const CUR = '2026-W39';
const PREV = '2026-W38';

const LEAGUE_NAMES = [
  'Медная', 'Бронзовая', 'Серебряная', 'Золотая', 'Платиновая', 'Изумрудная',
  'Сапфировая', 'Рубиновая', 'Алмазная', 'Черного Алмаза', 'Эфирная', 'Высшая',
];
const STONES = ['Гранит', 'Базальт', 'Мрамор', 'Нефрит', 'Кварц', 'Агат', 'Оникс', 'Аметист', 'Опал', 'Топаз', 'Обсидиан', 'Алмаз'];

function src(over: Partial<Parameters<typeof resolveLeagueSource>[0]> = {}): Parameters<typeof resolveLeagueSource>[0] {
  return {
    leaderboard: undefined,
    previousWeekResult: undefined,
    progressLeagueStateRaw: undefined,
    currentWeekId: CUR,
    previousWeekId: PREV,
    nowMs: WED,
    ...over,
  };
}

describe('маппинг leagueId → tier', () => {
  it('12 лиг = 12 шпилей', () => {
    expect(LEAGUE_TIER_COUNT).toBe(12);
    expect(SPIRE_TIER_COUNT).toBe(LEAGUE_TIER_COUNT);
    expect(LEAGUE_NAMES).toHaveLength(LEAGUE_TIER_COUNT);
    expect(STONES).toHaveLength(SPIRE_TIER_COUNT);
  });

  it.each(LEAGUE_NAMES.map((name, i) => [name, i, STONES[i]] as const))(
    '%s лига (%i) → %s без сдвига',
    (_league, leagueId, _stone) => {
      expect(leagueIdToSpireTier(leagueId)).toEqual({ tier: leagueId, clamped: false });
      expect(spireTierToLeagueId(leagueId)).toBe(leagueId);
    },
  );

  it('крайние точки: Медная → Гранит, Высшая → Алмаз', () => {
    expect(STONES[leagueIdToSpireTier(0)!.tier]).toBe('Гранит');
    expect(STONES[leagueIdToSpireTier(11)!.tier]).toBe('Алмаз');
  });

  it('строковое число тоже переносится (поле из JSON)', () => {
    expect(leagueIdToSpireTier('7')).toEqual({ tier: 7, clamped: false });
  });

  it('вне диапазона — прижато к краю и помечено', () => {
    expect(leagueIdToSpireTier(12)).toEqual({ tier: 11, clamped: true });
    expect(leagueIdToSpireTier(-1)).toEqual({ tier: 0, clamped: true });
    expect(leagueIdToSpireTier(3.7)).toEqual({ tier: 3, clamped: true });
  });

  it('пусто и мусор — не источник (null), а не молчаливый Гранит', () => {
    for (const v of [undefined, null, '', 'abc', NaN, Infinity]) {
      expect(leagueIdToSpireTier(v)).toBeNull();
    }
  });
});

describe('источник места лиги', () => {
  it('ничего нет — Гранит, source=none', () => {
    const r = resolveLeagueSource(src());
    expect(r).toEqual({ ok: true, leagueId: 0, source: 'none', clamped: false, conflicts: [] });
  });

  it('комната лиги этой недели — leagueId как есть (прошлый итог уже учтён)', () => {
    const r = resolveLeagueSource(src({ leaderboard: { leagueId: 8, groupWeekId: CUR } }));
    expect(r).toMatchObject({ ok: true, leagueId: 8, source: 'leaderboard_current_week' });
  });

  it('итог прошлой недели подведён и согласован — берём новую лигу (повышение не теряется)', () => {
    const r = resolveLeagueSource(src({
      leaderboard: { leagueId: 4, groupWeekId: PREV, groupId: 'g1' },
      previousWeekResult: { prevLeagueId: 4, newLeagueId: 5, groupId: 'g1' },
    }));
    expect(r).toMatchObject({ ok: true, leagueId: 5, source: 'leaderboard_plus_last_result' });
  });

  it('понижение по итогу тоже учитывается', () => {
    const r = resolveLeagueSource(src({
      leaderboard: { leagueId: 4, groupWeekId: PREV, groupId: 'g1' },
      previousWeekResult: { prevLeagueId: 4, newLeagueId: 3, groupId: 'g1' },
    }));
    expect(r).toMatchObject({ ok: true, leagueId: 3 });
  });

  it('несогласованный итог (скачок на 2, чужая комната) — остаётся leaderboard, пишется conflict', () => {
    const jump = resolveLeagueSource(src({
      leaderboard: { leagueId: 4, groupWeekId: PREV, groupId: 'g1' },
      previousWeekResult: { prevLeagueId: 4, newLeagueId: 6, groupId: 'g1' },
    }));
    expect(jump).toMatchObject({ ok: true, leagueId: 4, source: 'leaderboard' });
    expect(jump.ok && jump.conflicts).toContain('last_result_inconsistent:4->6');

    const foreign = resolveLeagueSource(src({
      leaderboard: { leagueId: 4, groupWeekId: PREV, groupId: 'g1' },
      previousWeekResult: { prevLeagueId: 4, newLeagueId: 5, groupId: 'other' },
    }));
    expect(foreign).toMatchObject({ ok: true, leagueId: 4, source: 'leaderboard' });
  });

  it('понедельник, итог ещё не подведён — отказ, а не перенос устаревшего места', () => {
    const r = resolveLeagueSource(src({
      nowMs: MON_GRACE,
      currentWeekId: '2026-W40',
      previousWeekId: CUR,
      leaderboard: { leagueId: 6, groupWeekId: CUR },
    }));
    expect(r).toEqual({ ok: false, reason: 'league_finalization_pending' });
  });

  it('после окна подведения без итога — переносим leaderboard как есть', () => {
    const r = resolveLeagueSource(src({
      nowMs: Date.UTC(2026, 8, 28, 0, 0, 0) + LEAGUE_FINALIZATION_GRACE_MS + 1,
      currentWeekId: '2026-W40',
      previousWeekId: CUR,
      leaderboard: { leagueId: 6, groupWeekId: CUR },
    }));
    expect(r).toMatchObject({ ok: true, leagueId: 6, source: 'leaderboard' });
  });

  it('leaderboard главнее progress; расхождение записывается', () => {
    const r = resolveLeagueSource(src({
      leaderboard: { leagueId: 2 },
      progressLeagueStateRaw: JSON.stringify({ leagueId: 9 }),
    }));
    expect(r).toMatchObject({ ok: true, leagueId: 2, source: 'leaderboard' });
    expect(r.ok && r.conflicts).toContain('progress_differs:9');
  });

  it('нет leagueId в leaderboard — запасной progress, место не теряется', () => {
    const r = resolveLeagueSource(src({
      leaderboard: { name: 'x' },
      progressLeagueStateRaw: JSON.stringify({ leagueId: 7, weekId: PREV }),
    }));
    expect(r).toMatchObject({ ok: true, leagueId: 7, source: 'progress_fallback' });
    expect(r.ok && r.conflicts).toContain('leaderboard_league_missing');
  });

  it('битый progress не роняет перенос', () => {
    expect(parseProgressLeagueId('{not json')).toBeNull();
    const r = resolveLeagueSource(src({ leaderboard: { leagueId: 3 }, progressLeagueStateRaw: '{not json' }));
    expect(r).toMatchObject({ ok: true, leagueId: 3 });
    expect(r.ok && r.conflicts).toContain('progress_league_state_unreadable');
  });
});

describe('карта шпилей по языкам', () => {
  it('текущий язык получает место лиги, остальные — Гранит', () => {
    const plan = buildSpireTierPlan('es', 9, {});
    expect(plan.tiers).toEqual({ en: 0, es: 9, fr: 0, de: 0 });
    expect(plan.kept).toEqual([]);
  });

  it('для каждой из 12 лиг и каждого языка — ровно одно ненулевое место', () => {
    for (const lang of ['en', 'es', 'fr', 'de'] as const) {
      for (let leagueId = 0; leagueId < 12; leagueId++) {
        const { tiers } = buildSpireTierPlan(lang, leagueId, {});
        expect(tiers[lang]).toBe(leagueId);
        const others = Object.entries(tiers).filter(([l]) => l !== lang).map(([, t]) => t);
        expect(others).toEqual([0, 0, 0]);
      }
    }
  });

  it('уже записанный шпиль не перезаписывается и не понижается', () => {
    const plan = buildSpireTierPlan('en', 2, { en: 6, de: 3 });
    expect(plan.tiers).toEqual({ en: 6, es: 0, fr: 0, de: 3 });
    expect(plan.kept).toEqual(['en', 'de']);
  });

  it('readSpireTiers игнорирует мусор и чужие языки', () => {
    expect(readSpireTiers({ spireTiers: { en: 3, es: 'x', xx: 5, de: 40 } })).toEqual({ en: 3, de: 11 });
    expect(readSpireTiers(undefined)).toEqual({});
  });
});

describe('записи миграции и откат', () => {
  const lb = { leagueId: 5, groupId: 'g1', groupWeekId: PREV, name: 'Аня' };
  const resolution = { ok: true as const, leagueId: 5, source: 'leaderboard' as const, clamped: false, conflicts: [] };

  function records(existing = {}) {
    const plan = buildSpireTierPlan('fr', 5, existing);
    return buildMigrationRecords({
      uid: 'u1', nowMs: WED, currentLang: 'fr', currentLangSource: 'client_current',
      resolution, plan, leaderboard: lb, progressLeagueStateRaw: JSON.stringify({ leagueId: 5 }),
    });
  }

  it('отметка в leaderboard — только цифры, без progress', () => {
    const { marker } = records();
    expect(marker).toEqual({
      schema: SPIRE_LEAGUE_MIGRATION_SCHEMA, migratedAtMs: WED, lang: 'fr', tier: 5, sourceLeagueId: 5, source: 'leaderboard',
    });
    expect(JSON.stringify(marker)).not.toContain('league_state');
    expect(hasSpireMigrationMarker({ spireMigration: marker })).toBe(true);
    expect(hasSpireMigrationMarker({ spireMigration: { schema: 'other' } })).toBe(false);
  });

  it('резервная копия хранит всё «как было»', () => {
    const { backup } = records();
    expect(backup.before).toEqual({
      leaderboardLeagueId: 5,
      leaderboardGroupId: 'g1',
      leaderboardGroupWeekId: PREV,
      spireTiers: {},
      hadSpireTiersField: false,
      progressLeagueStateRaw: JSON.stringify({ leagueId: 5 }),
    });
    expect(backup.tiersAfter).toEqual({ en: 0, es: 0, fr: 5, de: 0 });
    expect(backup.rolledBackAtMs).toBeNull();
  });

  it('откат без изменений после миграции — поле spireTiers удаляется целиком', () => {
    const { backup } = records();
    const plan = buildRollbackPlan(backup as unknown as Record<string, unknown>, { ...lb, spireTiers: backup.tiersAfter });
    expect(plan).toEqual({
      spireTiers: {},
      deleteSpireTiers: true,
      deleteMarker: true,
      reverted: ['en', 'es', 'fr', 'de'],
      changedSinceMigration: [],
      leagueIdBefore: 5,
    });
  });

  it('откат не стирает то, что поменял итог недели Шпиля', () => {
    const { backup } = records();
    // Итог недели поднял fr с 5 до 6 — это честно заработано после переноса.
    const plan = buildRollbackPlan(backup as unknown as Record<string, unknown>, { spireTiers: { en: 0, es: 0, fr: 6, de: 0 } });
    expect(plan?.spireTiers).toEqual({ fr: 6 });
    expect(plan?.deleteSpireTiers).toBe(false);
    expect(plan?.changedSinceMigration).toEqual(['fr']);
    expect(plan?.reverted).toEqual(['en', 'es', 'de']);
  });

  it('откат возвращает прежнюю карту, если она была до миграции', () => {
    const lbWithTiers = { ...lb, spireTiers: { de: 2 } };
    const plan = buildSpireTierPlan('fr', 5, readSpireTiers(lbWithTiers));
    const { backup } = buildMigrationRecords({
      uid: 'u1', nowMs: WED, currentLang: 'fr', currentLangSource: 'room_lang',
      resolution, plan, leaderboard: lbWithTiers, progressLeagueStateRaw: undefined,
    });
    const rollback = buildRollbackPlan(backup as unknown as Record<string, unknown>, { spireTiers: plan.tiers });
    expect(rollback?.spireTiers).toEqual({ de: 2 });
    expect(rollback?.deleteSpireTiers).toBe(false);
  });

  it('чужая/битая копия — отката нет (null), ничего не трогаем', () => {
    expect(buildRollbackPlan(undefined, {})).toBeNull();
    expect(buildRollbackPlan({ schema: 'other' }, {})).toBeNull();
  });
});

describe('выключатель', () => {
  it('нет документа = on; paused только явно', () => {
    expect(spireMigrationModeFrom(undefined)).toBe('on');
    expect(spireMigrationModeFrom({})).toBe('on');
    expect(spireMigrationModeFrom({ mode: 'paused' })).toBe('paused');
    expect(spireMigrationModeFrom({ mode: 'PAUSED' })).toBe('on');
  });
});
