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
  ARENA_STUDY_TARGETS,
  arenaTargetPublicationFingerprint,
} from './arena_target_registry';
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

const readyEnglishBase = {
  studyTarget: 'en' as const,
  enabled: true as const,
  ready: true as const,
  poolVersion: 'arena-en-v1',
  manifestSha256: 'a'.repeat(64),
  merkleRootSha256: 'b'.repeat(64),
  factPackVersion: 'arena-en-facts-v1',
  factPackSha256: 'c'.repeat(64),
};

const good = () => arenaBuildConfigDoc({
  flags: { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true, rewardsEnabled: true, spinEnabled: true },
  minClientVersion: '1.2.3',
  targetPublications: {
    en: {
      ...readyEnglishBase,
      publicationFingerprint: arenaTargetPublicationFingerprint(readyEnglishBase),
    },
  },
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

  it('создаёт четыре явных fail-closed слота без неявной английской публикации', () => {
    const doc = arenaBuildConfigDoc({});
    expect(Object.keys(doc.targetPublications)).toEqual([...ARENA_STUDY_TARGETS]);
    for (const studyTarget of ARENA_STUDY_TARGETS) {
      expect(doc.targetPublications[studyTarget]).toEqual({
        studyTarget,
        enabled: false,
        ready: false,
      });
    }
  });

  it('сохраняет только точные валидные серверные публикации и заполняет отсутствующие слоты', () => {
    const readyBase = {
      studyTarget: 'fr' as const,
      enabled: true as const,
      ready: true as const,
      poolVersion: 'arena-fr-v1',
      manifestSha256: '1'.repeat(64),
      merkleRootSha256: '2'.repeat(64),
      factPackVersion: 'arena-fr-facts-v1',
      factPackSha256: '3'.repeat(64),
    };
    const ready = {
      ...readyBase,
      publicationFingerprint: arenaTargetPublicationFingerprint(readyBase),
    };
    const doc = arenaBuildConfigDoc({
      targetPublications: {
        fr: ready,
        es: { studyTarget: 'es', enabled: true, ready: false },
        de: { studyTarget: 'de', enabled: true, ready: true, browserHash: 'spoofed' },
        it: ready,
      },
    });
    expect(doc.targetPublications.fr).toEqual(ready);
    expect(doc.targetPublications.es).toEqual({ studyTarget: 'es', enabled: false, ready: false });
    expect(doc.targetPublications.de).toEqual({ studyTarget: 'de', enabled: false, ready: false });
    expect(doc.targetPublications.en).toEqual({ studyTarget: 'en', enabled: false, ready: false });
    expect(Object.keys(doc.targetPublications)).toEqual([...ARENA_STUDY_TARGETS]);
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

  it('ловит неизвестные и нестрогие targetPublications', () => {
    /**
     * зачем ОТСУТСТВИЕ поля больше не проблема (инцидент 2026-09-20):
     * на боевом Firestore лежит конфиг, написанный ДО языковых контуров.
     * Жёсткая проверка положила Арену целиком — очередь не создавалась,
     * поиск шёл бесконечно. Нет поля = «контуров ещё нет», работаем как
     * раньше; поле есть и битое = настоящая поломка, отказ остаётся.
     */
    const missing = { ...good() } as Record<string, unknown>;
    delete missing.targetPublications;
    expect(arenaConfigProblems(missing)).not.toContain('target_publications');

    expect(arenaConfigProblems({
      ...good(),
      targetPublications: { ...good().targetPublications, it: { studyTarget: 'it', enabled: false, ready: false } },
    })).toContain('target_publications');

    expect(arenaConfigProblems({
      ...good(),
      targetPublications: {
        ...good().targetPublications,
        en: { studyTarget: 'en', enabled: false, ready: false, implicitLegacyFallback: true },
      },
    })).toContain('target_publications');
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

  it('глобальный флаг не делает Арену живой без готового языкового пула', () => {
    const status = arenaConfigStatus(arenaBuildConfigDoc({ flags: { enabled: true } }));
    expect(status.flags.enabled).toBe(true);
    expect(status.liveForPlayers).toBe(false);
  });

  it('исправный, но выключенный — не работающий', () => {
    expect(arenaConfigStatus(arenaBuildConfigDoc({ flags: { quickEnabled: true } })).liveForPlayers)
      .toBe(false);
  });

  it('ожидаемые версии показываются всегда — есть с чем сверить', () => {
    const status = arenaConfigStatus(null);
    expect(status.expected.poolVersion).toBe(NEW_TOURNAMENT_POOL_VERSION);
    expect(status.expected.manifestSha256).toBe(NEW_TOURNAMENT_POOL_CONTENT_SHA256);
    expect(Object.keys(status.targetPublications)).toEqual([...ARENA_STUDY_TARGETS]);
    expect(status.targetPublications.en).toEqual({ studyTarget: 'en', enabled: false, ready: false });
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
      targetPublications: good().targetPublications,
    });
    const status = arenaConfigStatus(doc);
    expect(status.valid).toBe(true);
    expect(status.liveForPlayers).toBe(true);
    expect(status.minClientVersion).toBe('3.4.5');
    expect(status.expansionFlags.arenaExpansionEnabled).toBe(true);
  });
});
