import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Каждая функция, которую зовёт клиент, обязана быть в точке входа деплоя.
 *
 * Это ровно тот отказ, ради которого стоит держать тест: имя вызываемой
 * функции — строка. Опечатка в ней или новая функция, забытая в
 * `functions/src/index.ts`, не ловится ни типами, ни сборкой. Проявляется она
 * только у игрока и выглядит как `not-found` — неотличимо от «сервер лежит».
 *
 * Список НЕ хранится руками: он вычитывается из самого клиента. Список,
 * который надо не забыть дополнить, рано или поздно не дополняют — а тест
 * при этом продолжает зеленеть, и в этом худшая его часть.
 */
function clientCallables(): readonly string[] {
  const client = read('app/arena_client.ts');
  const found = new Set<string>();
  const re = /callArena(?:<[\s\S]*?>)?\(\s*'([A-Za-z0-9_]+)'/g;
  let match = re.exec(client);
  while (match) {
    found.add(match[1] as string);
    match = re.exec(client);
  }
  return [...found].sort();
}

/** Имена, действительно вывезенные наружу из точки входа. */
function deployedExports(): ReadonlySet<string> {
  // Комментарии убираются до разбора: в блоке экспорта они стоят между
  // именами и заканчиваются запятой, поэтому иначе слипаются с соседним
  // именем и прячут его. Именно так этот тест сначала «нашёл» пропажу
  // arenaV2MatchPlan, которой не было.
  const index = read('functions/src/index.ts')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const names = new Set<string>();
  const blocks = index.match(/export\s*\{[^}]*\}/g) ?? [];
  for (const block of blocks) {
    for (const raw of (block.match(/\{([^}]*)\}/)?.[1] ?? '').split(',')) {
      const name = raw.split(/\s+as\s+/).pop()?.trim();
      // Комментарии внутри блока экспорта — обычное дело, они не имена.
      if (name && /^[A-Za-z0-9_]+$/.test(name)) names.add(name);
    }
  }
  for (const match of index.matchAll(/export\s+(?:const|function|async function)\s+([A-Za-z0-9_]+)/g)) {
    names.add(match[1] as string);
  }
  return names;
}

describe('Arena callable surface', () => {
  const called = clientCallables();

  test('клиент действительно зовёт функции Арены', () => {
    // Если разбор клиента сломается, остальные проверки станут пустыми и
    // зелёными — поэтому сначала убеждаемся, что нашли не ноль.
    expect(called.length).toBeGreaterThan(30);
    expect(called).toContain('arenaV2Home');
    expect(called).toContain('arenaV2MatchPlan');
    expect(called).toContain('arenaV2MatchFinish');
  });

  test('каждая вызываемая функция вывезена из точки входа деплоя', () => {
    const deployed = deployedExports();
    const missing = called.filter((name) => !deployed.has(name));
    expect(missing).toEqual([]);
  });

  test('разбор точки входа не пустой', () => {
    const deployed = deployedExports();
    expect(deployed.size).toBeGreaterThan(30);
    expect(deployed.has('adminArenaConfigSet')).toBe(true);
  });
});

/**
 * Единственная запись, которую делает клиент, — живой канал матча. Правила
 * Firestore проверяют её поимённо, и любое расхождение отклоняет запись
 * молча: клиент ловит отказ и возвращает `false`, игрок видит просто
 * замерший индикатор соперника. Ни типы, ни сборка такого не поймают —
 * правила это отдельный язык в отдельном файле.
 */
describe('Arena live channel matches the deployed rules', () => {
  const rules = read('firestore.rules');

  test('правила описывают ровно тот путь, куда пишет клиент', () => {
    expect(read('modules/arena/live_channel.ts')).toContain("ARENA_LIVE_COLLECTION = 'arena_v2_match_live'");
    expect(read('modules/arena/live_channel.ts')).toContain("ARENA_LIVE_SEATS = 'seats'");
    expect(rules).toContain('match /arena_v2_match_live/{matchId}/seats/{seatId}');
  });

  test('версия схемы в правилах совпадает с той, что пишет клиент', () => {
    expect(rules).toContain("request.resource.data.schemaVersion == 'arena-live.v1'");
    expect(read('modules/arena/live_channel.ts')).toContain("ARENA_LIVE_SCHEMA_VERSION = 'arena-live.v1'");
  });

  test('потолок отметок в правилах не ниже, чем заданий в матче', () => {
    // Клиент шлёт по отметке на каждое закрытое задание. Поднять число
    // заданий и забыть про правила — значит выключить живой канал целиком,
    // и узнать об этом только по жалобе игрока.
    const cap = Number(/ticks\.size\(\) <= (\d+)/.exec(rules)?.[1]);
    const maxTasks = Number(/ARENA_PLAN_MAX_TASKS = (\d+)/.exec(read('modules/arena/duel_plan.ts'))?.[1]);
    expect(Number.isFinite(cap)).toBe(true);
    expect(Number.isFinite(maxTasks)).toBe(true);
    expect(cap).toBeGreaterThanOrEqual(maxTasks);
  });

  test('клиент пишет метку времени, которой правила требуют', () => {
    // Без неё почасовая уборка не найдёт протухшие каналы, а правила просто
    // отклонят запись.
    expect(rules).toContain('request.resource.data.updatedAtMs is number');
    expect(read('app/arena_client.ts')).toContain('updatedAtMs: Date.now()');
  });

  test('живой канал не пропускает ответы и произвольные поля', () => {
    expect(rules).toContain("request.resource.data.keys().hasOnly(['schemaVersion', 'ticks', 'finished', 'updatedAtMs'])");
    expect(rules).toContain('request.resource.data.finished is bool');
  });
});

/**
 * Клиент не только пишет — он ЧИТАЕТ по подписке. Отказ в чтении выглядит для
 * игрока не как ошибка, а как пустой экран: подписка просто не приносит
 * данных. Поэтому путь подписки и правило чтения обязаны совпадать.
 */
describe('Arena listeners match the deployed rules', () => {
  const rules = read('firestore.rules');
  const client = read('app/arena_client.ts');

  test('на что подписан клиент, то и разрешено читать', () => {
    for (const collection of ['arena_v2_queue', 'arena_v2_matches', 'arena_v2_profiles']) {
      expect(client).toContain(`'${collection}'`);
      expect(rules).toContain(`match /${collection}/{`);
    }
  });

  test('строка очереди читается по полю authUid, и сервер его пишет', () => {
    // Правило пускает владельца по полю в самом документе, а не по его имени:
    // имя документа — стабильный uid, он не равен uid авторизации.
    expect(rules).toContain("resource.data.get('authUid', '') == request.auth.uid");
    const server = read('functions/src/arena_v2.ts');
    // Создание строки очереди.
    expect(server).toContain('authUid: who.authUid');
    /**
     * И закрытие тоже. Слияние `merge: true` СОЗДАЁТ документ, если его нет,
     * а созданный без `authUid` становится нечитаемым для своего владельца
     * навсегда: строки очереди нигде не удаляются, чинить это некому.
     */
    expect(server).toContain('privateDoc.authByStableUid?.[uid]');
  });

  test('участие в матче проверяется отдельной меткой, а не публичным документом', () => {
    // Иначе один слушатель матча раскрывал бы соперника: его uid лежал бы в
    // том же документе, который читают оба.
    expect(rules).toContain('arena_v2_matches/$(matchId)/arena_v2_members/$(request.auth.uid)');
  });
});
