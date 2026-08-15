import {
  ARENA_CONFIG_EXPANSION_FLAGS,
  ARENA_CONFIG_FLAGS,
  ARENA_CONFIG_SCHEMA_VERSION,
  ARENA_PRODUCT_CONFIG_VERSION,
  arenaBuildConfigDoc,
  arenaConfigIsValid,
  arenaConfigProblems,
  arenaConfigStatus,
} from './arena_config_contract';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
  NEW_TOURNAMENT_POOL_VERSION,
} from './tournament_pool_publication';

/**
 * Договор документа `arena_v2_config/current`.
 *
 * Это корневая причина «Арена не работает»: бэкенд закрыт по умолчанию и без
 * этого документа КАЖДЫЙ вызов падает. Документ до сих пор можно было создать
 * только руками, а опечатка в шестидесятизначном хеше давала отказ,
 * неотличимый от «документа нет».
 */

const good = () => arenaBuildConfigDoc({
  flags: { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true, rewardsEnabled: true, spinEnabled: true },
  minClientVersion: '1.2.3',
});

describe('сборка документа', () => {
  it('собранный документ сходится', () => {
    expect(arenaConfigIsValid(good())).toBe(true);
    expect(arenaConfigProblems(good())).toEqual([]);
  });

  /**
   * Ровно на них конфиг и ломался: администратор не должен переписывать
   * шестидесятизначный хеш руками.
   */
  it('версии и хеши берутся из сборки, а не от человека', () => {
    const doc = arenaBuildConfigDoc({});
    expect(doc.schemaVersion).toBe(ARENA_CONFIG_SCHEMA_VERSION);
    expect(doc.productConfigVersion).toBe(ARENA_PRODUCT_CONFIG_VERSION);
    expect(doc.contentPublication.poolVersion).toBe(NEW_TOURNAMENT_POOL_VERSION);
    expect(doc.contentPublication.manifestSha256).toBe(NEW_TOURNAMENT_POOL_CONTENT_SHA256);
    expect(doc.contentPublication.merkleRootSha256).toBe(NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256);
  });

  it('пустой ввод даёт валидный ВЫКЛЮЧЕННЫЙ конфиг', () => {
    const doc = arenaBuildConfigDoc({});
    expect(arenaConfigIsValid(doc)).toBe(true);
    for (const flag of ARENA_CONFIG_FLAGS) expect(doc[flag]).toBe(false);
  });

  it('все переключатели всегда присутствуют, даже не заданные', () => {
    const doc = arenaBuildConfigDoc({ flags: { enabled: true } });
    for (const flag of ARENA_CONFIG_FLAGS) expect(typeof doc[flag]).toBe('boolean');
    for (const flag of ARENA_CONFIG_EXPANSION_FLAGS) expect(typeof doc[flag]).toBe('boolean');
  });

  /** Выдуманное число отрезало бы часть игроков молча. */
  it('битая версия клиента становится «любой», а не выдуманной', () => {
    for (const value of ['', 'последняя', '1.2.3.4.5', 'v1', undefined]) {
      expect(arenaBuildConfigDoc({ minClientVersion: value as string }).minClientVersion).toBe('0.0.0');
    }
    expect(arenaBuildConfigDoc({ minClientVersion: '2' }).minClientVersion).toBe('2');
    expect(arenaBuildConfigDoc({ minClientVersion: '2.10' }).minClientVersion).toBe('2.10');
  });

  it('нестрогие значения флагов считаются выключением', () => {
    const doc = arenaBuildConfigDoc({
      flags: { enabled: 'да' as unknown as boolean, quickEnabled: 1 as unknown as boolean },
    });
    expect(doc.enabled).toBe(false);
    expect(doc.quickEnabled).toBe(false);
  });
});

describe('поиск неисправностей', () => {
  it('отсутствующий документ виден как несходящийся', () => {
    for (const value of [null, undefined, {}, 'строка', []]) {
      expect(arenaConfigIsValid(value)).toBe(false);
    }
  });

  /** Иначе администратор чинит по одной ошибке за деплой. */
  it('возвращаются ВСЕ проблемы сразу, а не первая', () => {
    const problems = arenaConfigProblems({});
    expect(problems.length).toBeGreaterThan(3);
    expect(problems).toContain('schema_version');
    expect(problems).toContain('manifest_sha');
    expect(problems).toContain('flags');
  });

  it('каждая порча называется своим именем', () => {
    expect(arenaConfigProblems({ ...good(), schemaVersion: 'v0' })).toEqual(['schema_version']);
    expect(arenaConfigProblems({ ...good(), productConfigVersion: 'v0' })).toEqual(['product_version']);
    expect(arenaConfigProblems({ ...good(), minClientVersion: 'нет' })).toEqual(['min_client_version']);
    expect(arenaConfigProblems({
      ...good(), contentPublication: { ...good().contentPublication, manifestSha256: 'abc' },
    })).toEqual(['manifest_sha']);
  });

  it('пропавший переключатель ловится', () => {
    const doc = { ...good() } as Record<string, unknown>;
    delete doc.spinEnabled;
    expect(arenaConfigProblems(doc)).toEqual(['flags']);
  });
});

describe('состояние для админки', () => {
  it('различает «документа нет» и «документ не сходится»', () => {
    expect(arenaConfigStatus(null).exists).toBe(false);
    const broken = arenaConfigStatus({ ...good(), schemaVersion: 'v0' });
    expect(broken.exists).toBe(true);
    expect(broken.valid).toBe(false);
    expect(broken.problems).toEqual(['schema_version']);
  });

  /**
   * Проверка договора стоит РАНЬШЕ проверки флага, поэтому включённый флаг при
   * несходящемся документе игрокам ничего не даёт. Показывать «включено» в
   * этом случае — врать администратору.
   */
  it('включённый флаг при битом документе НЕ считается работающей Ареной', () => {
    const status = arenaConfigStatus({ ...good(), contentPublication: { poolVersion: 'старый' } });
    expect(status.flags.enabled).toBe(true);
    expect(status.liveForPlayers).toBe(false);
  });

  it('исправный и включённый конфиг считается работающим', () => {
    expect(arenaConfigStatus(good()).liveForPlayers).toBe(true);
  });

  it('исправный, но выключенный — не работающий', () => {
    expect(arenaConfigStatus(arenaBuildConfigDoc({ flags: { quickEnabled: true } })).liveForPlayers)
      .toBe(false);
  });

  it('ожидаемые версии показываются всегда — есть с чем сверить', () => {
    const status = arenaConfigStatus(null);
    expect(status.expected.poolVersion).toBe(NEW_TOURNAMENT_POOL_VERSION);
    expect(status.expected.manifestSha256).toBe(NEW_TOURNAMENT_POOL_CONTENT_SHA256);
  });

  it('состояние не роняется ни на каком мусоре', () => {
    for (const value of [null, undefined, 0, '', [], { enabled: 'да' }]) {
      const status = arenaConfigStatus(value);
      expect(typeof status.liveForPlayers).toBe('boolean');
      expect(Object.keys(status.flags).length).toBe(ARENA_CONFIG_FLAGS.length);
    }
  });

  it('круг «собрать → проверить» сходится', () => {
    const doc = arenaBuildConfigDoc({
      flags: { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true, rewardsEnabled: true, spinEnabled: true },
      expansionFlags: { arenaExpansionEnabled: true },
      minClientVersion: '3.4.5',
    });
    const status = arenaConfigStatus(doc);
    expect(status.valid).toBe(true);
    expect(status.liveForPlayers).toBe(true);
    expect(status.minClientVersion).toBe('3.4.5');
    expect(status.expansionFlags.arenaExpansionEnabled).toBe(true);
  });
});
